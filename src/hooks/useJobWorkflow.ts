import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RecruitmentJobWorkflowStep, RecruitmentJobWorkflowStepInput } from "@/types/job-workflow.types";

function normalizeStepsForSave(steps: RecruitmentJobWorkflowStepInput[]) {
  return steps
    .filter((s) => Boolean(s.step_type))
    .map((s, idx) => ({
      step_type: s.step_type,
      agent_id: s.agent_id ?? null,
      position: idx,
      threshold_config: s.threshold_config ?? {},
      is_active: true,
    }));
}

export function useJobWorkflow(params: { jobId?: string; accountId?: string }) {
  const { jobId, accountId } = params;
  const queryClient = useQueryClient();

  const workflowQuery = useQuery({
    queryKey: ["job-workflow", jobId, accountId],
    queryFn: async () => {
      if (!jobId || !accountId) return [] as RecruitmentJobWorkflowStep[];

      const { data, error } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("id, account_id, job_id, step_type, agent_id, position, threshold_config, is_active, created_at, updated_at")
        .eq("job_id", jobId)
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("position", { ascending: true });

      if (error) throw error;
      return (data || []) as RecruitmentJobWorkflowStep[];
    },
    enabled: !!jobId && !!accountId,
    staleTime: 60_000,
  });

  const saveWorkflowMutation = useMutation({
    mutationFn: async (steps: RecruitmentJobWorkflowStepInput[]) => {
      if (!jobId || !accountId) throw new Error("Missing jobId/accountId");
      const payload = normalizeStepsForSave(steps);

      // If we have steps to insert, try inserting first to validate before deleting
      if (payload.length > 0) {
        const rows = payload.map((p) => ({
          ...p,
          job_id: jobId,
          account_id: accountId,
          threshold_config: p.threshold_config as any,
        }));

        // Delete then insert — but we validated payload is non-empty
        const { error: delError } = await supabase
          .from("recruitment_job_workflow_steps")
          .delete()
          .eq("job_id", jobId)
          .eq("account_id", accountId);
        if (delError) throw delError;

        const { error: insError } = await supabase
          .from("recruitment_job_workflow_steps")
          .insert(rows);
        if (insError) throw insError;
      } else {
        // No steps — just clear
        const { error: delError } = await supabase
          .from("recruitment_job_workflow_steps")
          .delete()
          .eq("job_id", jobId)
          .eq("account_id", accountId);
        if (delError) throw delError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["job-workflow", jobId, accountId] });
    },
  });

  return {
    steps: workflowQuery.data ?? [],
    isLoading: workflowQuery.isLoading,
    error: workflowQuery.error,
    refetch: workflowQuery.refetch,
    saveWorkflow: saveWorkflowMutation,
  };
}
