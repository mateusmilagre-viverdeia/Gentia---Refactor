import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";

interface CandidateData {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
}

interface JobData {
  id: string;
  title: string;
  department: string | null;
}

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface CreateOnboardingFromHireParams {
  candidateId: string;
  applicationId?: string;
  templateId?: string;
  employeeRole: string;
  employeeDepartment?: string;
  leaderName: string;
  startDate: Date;
  endDate: Date;
}

export function useRecruitmentOnboardingIntegration() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch candidate data
  const fetchCandidateData = async (candidateId: string): Promise<CandidateData | null> => {
    const { data, error } = await supabase
      .from("recruitment_candidates")
      .select("id, first_name, last_name, email")
      .eq("id", candidateId)
      .single();

    if (error) {
      console.error("Error fetching candidate:", error);
      return null;
    }
    return data;
  };

  // Fetch job data from application
  const fetchJobFromApplication = async (applicationId: string): Promise<JobData | null> => {
    const { data, error } = await supabase
      .from("recruitment_applications")
      .select("job:recruitment_jobs(id, title, department)")
      .eq("id", applicationId)
      .single();

    if (error || !data?.job) {
      console.error("Error fetching job from application:", error);
      return null;
    }
    
    const job = data.job as unknown as JobData;
    return job;
  };

  // Fetch onboarding templates - using separate async function to avoid type issues
  const fetchTemplates = async (): Promise<OnboardingTemplate[]> => {
    if (!currentAccount?.id) return [];
    
    // Using type assertion to avoid deep type instantiation error
    const result = await (supabase
      .from("onboarding_templates") as any)
      .select("id, name, description")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (result.error) {
      console.error("Error fetching templates:", result.error);
      return [];
    }
    return (result.data as OnboardingTemplate[]) || [];
  };

  const templatesQuery = useQuery({
    queryKey: ["onboarding-templates", currentAccount?.id],
    queryFn: fetchTemplates,
    enabled: !!currentAccount?.id,
  });

  const templates = templatesQuery.data || [];

  // Fetch template phases and tasks
  const fetchTemplateData = async (templateId: string) => {
    const { data: phases, error: phasesError } = await supabase
      .from("onboarding_template_phases")
      .select(`
        id,
        name,
        description,
        order_index,
        tasks:onboarding_template_tasks(
          id,
          title,
          description,
          order_index,
          responsible_type,
          is_required
        )
      `)
      .eq("template_id", templateId)
      .order("order_index");

    if (phasesError) {
      console.error("Error fetching template phases:", phasesError);
      return null;
    }

    return phases;
  };

  // Create onboarding from hire
  const createOnboardingFromHire = useMutation({
    mutationFn: async (params: CreateOnboardingFromHireParams) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) {
        throw new Error("Usuário autenticado não encontrado");
      }

      // Fetch candidate data
      const candidate = await fetchCandidateData(params.candidateId);
      if (!candidate) throw new Error("Candidate not found");

      // Fetch job data if application provided
      let job: JobData | null = null;
      if (params.applicationId) {
        job = await fetchJobFromApplication(params.applicationId);
      }

      const employeeName = `${candidate.first_name} ${candidate.last_name || ""}`.trim();
      const employeeRole = params.employeeRole || job?.title || "Colaborador";
      const employeeDepartment = params.employeeDepartment || job?.department || undefined;

      // Create onboarding process
      const { data: process, error: processError } = await supabase
        .from("onboarding_processes")
        .insert([{
          employee_name: employeeName,
          employee_email: candidate.email,
          employee_role: employeeRole,
          employee_department: employeeDepartment,
          leader_name: params.leaderName,
          start_date: params.startDate.toISOString().split("T")[0],
          end_date: params.endDate.toISOString().split("T")[0],
          status: "draft" as const,
          recruitment_candidate_id: params.candidateId,
          created_by: userData.user.id,
          template_id: params.templateId ?? null,
        }])
        .select()
        .single();

      if (processError) throw processError;

      // If template selected, create phases and tasks
      if (params.templateId) {
        const templateData = await fetchTemplateData(params.templateId);
        
        if (templateData && templateData.length > 0) {
          for (const phase of templateData) {
            // Create phase
            const { data: createdPhase, error: phaseError } = await supabase
              .from("onboarding_phases")
              .insert({
                process_id: process.id,
                name: phase.name,
                description: phase.description,
                order_index: phase.order_index,
                status: "pending",
              })
              .select()
              .single();

            if (phaseError) {
              console.error("Error creating phase:", phaseError);
              continue;
            }

            // Create tasks for this phase
            const tasks = phase.tasks as any[];
            if (tasks && tasks.length > 0) {
              for (const task of tasks) {
                const { error: taskError } = await supabase
                  .from("onboarding_tasks")
                  .insert({
                    phase_id: createdPhase.id,
                    process_id: process.id,
                    title: task.title,
                    description: task.description,
                    order_index: task.order_index || 0,
                    is_required: task.is_required ?? true,
                    responsible_type: task.responsible_type ?? "leader",
                    due_date: null,
                  });

                if (taskError) {
                  console.error("Error creating task:", taskError);
                }
              }
            }
          }
        }
      }

      return process;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-processes"] });
      toast.success("Processo de onboarding criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating onboarding from hire:", error);
      toast.error("Erro ao criar processo de onboarding");
    },
  });

  return {
    templates,
    createOnboardingFromHire,
    fetchCandidateData,
    fetchJobFromApplication,
  };
}
