import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useQueryClient } from "@tanstack/react-query";

export interface JobWorkflowConfig {
  id: string;
  account_id: string;
  job_id: string;
  created_at: string;
  updated_at: string;
}

export type JobWorkflowConfigInput = Omit<JobWorkflowConfig, "id" | "created_at" | "updated_at">;

export function useJobWorkflowConfig(jobId: string, accountId?: string) {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["job-workflow-config", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_job_workflow_config" as any)
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as JobWorkflowConfig | null;
    },
    enabled: !!jobId,
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
  };
}
