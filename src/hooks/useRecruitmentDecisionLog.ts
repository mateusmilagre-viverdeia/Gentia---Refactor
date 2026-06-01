import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DecisionLogEntry {
  id: string;
  account_id: string;
  candidate_id: string | null;
  job_id: string | null;
  application_id: string | null;
  decision_type: string;
  step_type: string | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  decision: string;
  score: number | null;
  threshold: number | null;
  justification: string | null;
  processing_time_ms: number | null;
  triggered_by: string;
  created_at: string;
}

interface UseDecisionLogOptions {
  candidateId?: string;
  applicationId?: string;
  jobId?: string;
  decisionType?: string;
  limit?: number;
}

/**
 * Hook para buscar logs de decisões automatizadas
 */
export function useRecruitmentDecisionLog(
  accountId: string | undefined,
  options: UseDecisionLogOptions = {}
) {
  const { candidateId, applicationId, jobId, decisionType, limit = 50 } = options;

  return useQuery({
    queryKey: [
      "recruitment-decision-log",
      accountId,
      candidateId,
      applicationId,
      jobId,
      decisionType,
      limit,
    ],
    queryFn: async (): Promise<DecisionLogEntry[]> => {
      if (!accountId) return [];

      let query = supabase
        .from("recruitment_decision_log")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (candidateId) {
        query = query.eq("candidate_id", candidateId);
      }

      if (applicationId) {
        query = query.eq("application_id", applicationId);
      }

      if (jobId) {
        query = query.eq("job_id", jobId);
      }

      if (decisionType) {
        query = query.eq("decision_type", decisionType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as DecisionLogEntry[]) || [];
    },
    enabled: !!accountId,
  });
}

/**
 * Hook para buscar resumo de decisões por tipo
 */
export function useDecisionLogSummary(accountId: string | undefined) {
  return useQuery({
    queryKey: ["recruitment-decision-log-summary", accountId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase
        .from("recruitment_decision_log")
        .select("decision_type, decision")
        .eq("account_id", accountId);

      if (error) throw error;

      // Agrupar por tipo e resultado
      const summary = (data || []).reduce(
        (acc, entry) => {
          const key = `${entry.decision_type}_${entry.decision}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return summary;
    },
    enabled: !!accountId,
  });
}
