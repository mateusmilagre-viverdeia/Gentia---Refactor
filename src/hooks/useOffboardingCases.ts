import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OffboardingCase,
  OffboardingCaseWithTasks,
  OffboardingCaseWithDetails,
  CreateOffboardingCaseInput,
  UpdateOffboardingCaseInput,
  OffboardingTask,
  OffboardingSurveyResponse,
  OffboardingSurveyToken,
} from "@/types/offboarding.types";

const CASES_KEY = "offboarding-cases";

export const useOffboardingCases = (accountId?: string) => {
  const queryClient = useQueryClient();

  // Fetch all cases with task counts
  const casesQuery = useQuery({
    queryKey: [CASES_KEY, accountId],
    queryFn: async (): Promise<OffboardingCaseWithTasks[]> => {
      const { data, error } = await supabase
        .from("offboarding_cases")
        .select(`
          *,
          offboarding_tasks (id, status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as OffboardingCaseWithTasks[];
    },
    enabled: true,
  });

  // Fetch single case with all details
  const useCaseWithDetails = (caseId: string | undefined) => {
    return useQuery({
      queryKey: [CASES_KEY, caseId],
      queryFn: async (): Promise<OffboardingCaseWithDetails | null> => {
        if (!caseId) return null;

        const { data: caseData, error: caseError } = await supabase
          .from("offboarding_cases")
          .select("*")
          .eq("id", caseId)
          .single();

        if (caseError) throw caseError;

        const { data: tasks, error: tasksError } = await supabase
          .from("offboarding_tasks")
          .select("*")
          .eq("case_id", caseId)
          .order("order_index");

        if (tasksError) throw tasksError;

        const { data: surveyResponse, error: surveyError } = await supabase
          .from("offboarding_survey_responses")
          .select("*")
          .eq("case_id", caseId)
          .maybeSingle();

        if (surveyError) throw surveyError;

        const { data: surveyToken, error: tokenError } = await supabase
          .from("offboarding_survey_tokens")
          .select("*")
          .eq("case_id", caseId)
          .maybeSingle();

        if (tokenError) throw tokenError;

        return {
          ...caseData,
          tasks: tasks as OffboardingTask[],
          survey_response: surveyResponse as OffboardingSurveyResponse | null,
          survey_token: surveyToken as OffboardingSurveyToken | null,
        } as OffboardingCaseWithDetails;
      },
      enabled: !!caseId,
    });
  };

  // Create case
  const createCase = useMutation({
    mutationFn: async (input: CreateOffboardingCaseInput) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("offboarding_cases")
        .insert({
          ...input,
          created_by: userData.user?.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OffboardingCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      toast.success("Caso de offboarding criado");
    },
    onError: (error) => {
      console.error("Error creating offboarding case:", error);
      toast.error("Erro ao criar caso de offboarding");
    },
  });

  // Update case
  const updateCase = useMutation({
    mutationFn: async ({ id, ...input }: UpdateOffboardingCaseInput & { id: string }) => {
      const { data, error } = await supabase
        .from("offboarding_cases")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OffboardingCase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, variables.id] });
      toast.success("Caso atualizado");
    },
    onError: (error) => {
      console.error("Error updating offboarding case:", error);
      toast.error("Erro ao atualizar caso");
    },
  });

  // Activate case (change status from draft to active and create tasks)
  const activateCase = useMutation({
    mutationFn: async (id: string) => {
      // Get case details
      const { data: caseData, error: caseError } = await supabase
        .from("offboarding_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (caseError) throw caseError;

      // Get default template
      const { data: template, error: templateError } = await supabase
        .from("offboarding_templates")
        .select("id")
        .eq("is_default", true)
        .eq("is_active", true)
        .single();

      if (templateError) throw templateError;

      // Get template tasks
      const { data: templateTasks, error: tasksError } = await supabase
        .from("offboarding_template_tasks")
        .select("*")
        .eq("template_id", template.id)
        .order("order_index");

      if (tasksError) throw tasksError;

      // Calculate due dates based on last_day
      const lastDay = new Date(caseData.last_day);
      const tasksToInsert = templateTasks.map((tt: any) => {
        const dueDate = new Date(lastDay);
        dueDate.setDate(dueDate.getDate() + tt.due_offset_days);
        
        return {
          case_id: id,
          title: tt.title,
          description: tt.description,
          responsible_type: tt.responsible_type,
          responsible_profile: tt.responsible_profile,
          due_date: dueDate.toISOString().split('T')[0],
          is_required: tt.is_required,
          order_index: tt.order_index,
          task_type: tt.task_type,
          status: "pending",
        };
      });

      // Insert tasks
      if (tasksToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("offboarding_tasks")
          .insert(tasksToInsert);

        if (insertError) throw insertError;
      }

      // Create survey token (expires on last day + 7 days)
      const expiresAt = new Date(lastDay);
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: tokenError } = await supabase
        .from("offboarding_survey_tokens")
        .insert({
          case_id: id,
          expires_at: expiresAt.toISOString(),
        });

      if (tokenError) throw tokenError;

      // Update case status to active
      const { data, error } = await supabase
        .from("offboarding_cases")
        .update({ status: "active" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Send survey email if employee has email
      if (caseData.employee_email) {
        try {
          await supabase.functions.invoke("send-offboarding-survey", {
            body: { case_id: id },
          });
        } catch (emailError) {
          console.error("Error sending survey email:", emailError);
          // Don't fail the activation if email fails
        }
      }

      return data as unknown as OffboardingCase;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, id] });
      toast.success("Offboarding ativado! Checklist criado e pesquisa enviada.");
    },
    onError: (error) => {
      console.error("Error activating offboarding:", error);
      toast.error("Erro ao ativar offboarding");
    },
  });

  // Complete case
  const completeCase = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("offboarding_cases")
        .update({ status: "completed" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OffboardingCase;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, id] });
      toast.success("Offboarding concluído!");
    },
    onError: (error) => {
      console.error("Error completing offboarding:", error);
      toast.error("Erro ao concluir offboarding");
    },
  });

  // Cancel case
  const cancelCase = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("offboarding_cases")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OffboardingCase;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, id] });
      toast.success("Offboarding cancelado");
    },
    onError: (error) => {
      console.error("Error cancelling offboarding:", error);
      toast.error("Erro ao cancelar offboarding");
    },
  });

  // Resend survey email
  const resendSurvey = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("send-offboarding-survey", {
        body: { case_id: id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, id] });
      toast.success("Pesquisa reenviada por e-mail");
    },
    onError: (error) => {
      console.error("Error resending survey:", error);
      toast.error("Erro ao reenviar pesquisa");
    },
  });

  return {
    cases: casesQuery.data ?? [],
    isLoading: casesQuery.isLoading,
    error: casesQuery.error,
    refetch: casesQuery.refetch,
    useCaseWithDetails,
    createCase,
    updateCase,
    activateCase,
    completeCase,
    cancelCase,
    resendSurvey,
  };
};
