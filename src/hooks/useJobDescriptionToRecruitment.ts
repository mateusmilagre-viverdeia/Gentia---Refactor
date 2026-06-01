import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

interface CreateJobFromJDParams {
  jobDescriptionId: string;
  title: string;
  description?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  budgetMin?: number;
  budgetMax?: number;
  status?: string;
  workRegime?: string;
  workModality?: string;
  hideSalary?: boolean;
  additionalInfo?: string;
  agentId?: string;
  funnelId?: string;
  minHuntingScore?: number;
  seniorityTarget?: "junior" | "pleno" | "senior";
}

export function useJobDescriptionToRecruitment() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();

  const createJobFromJD = useMutation({
    mutationFn: async (params: CreateJobFromJDParams) => {
      if (!currentAccount?.id) throw new Error("Conta não encontrada");

      const { data, error } = await supabase
        .from("recruitment_jobs")
        .insert({
          account_id: currentAccount.id,
          job_description_id: params.jobDescriptionId,
          title: params.title,
          description: params.description,
          department: params.department,
          location: params.location,
          employment_type: params.employmentType,
          budget_min: params.budgetMin,
          budget_max: params.budgetMax,
          status: params.status || "draft",
          work_regime: params.workRegime,
          work_modality: params.workModality,
          hide_salary: params.hideSalary || false,
          additional_info: params.additionalInfo,
          agent_id: params.agentId,
          funnel_id: params.funnelId || null,
          min_hunting_score: params.minHuntingScore || 0,
          seniority_target: params.seniorityTarget || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast.success("Vaga de recrutamento criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating job from JD:", error);
      toast.error("Erro ao criar vaga de recrutamento");
    },
  });

  return { createJobFromJD };
}
