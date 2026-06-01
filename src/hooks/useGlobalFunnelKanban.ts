import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRecruitmentSessions, RECRUITMENT_SESSIONS_KEY } from "@/hooks/useRecruitmentSessions";
import { useRecruitmentCandidateMap, type FunnelStage, type UnifiedCandidate } from "@/hooks/useRecruitmentCandidateMap";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { subDays } from "date-fns";

export type { FunnelStage };

export type GlobalFunnelCandidate = UnifiedCandidate;

export interface FunnelColumn {
  key: FunnelStage;
  label: string;
  candidates: GlobalFunnelCandidate[];
}

function getPeriodDate(period: DashboardPeriod): string {
  const days = { "1d": 1, "3d": 3, "7d": 7, "30d": 30 }[period] ?? 7;
  return subDays(new Date(), days).toISOString();
}

export function useGlobalFunnelKanban(period: DashboardPeriod) {
  const { currentAccount } = useOrganization();
  const accountId = currentAccount?.id;
  const since = getPeriodDate(period);

  const { data: sessions, isLoading: sessionsLoading } = useRecruitmentSessions(
    accountId ? { accountId, since } : null
  );

  // Fetch workflow steps and screening results (lightweight queries not in the unified hook)
  const { data: supportData, isLoading: supportLoading } = useQuery({
    queryKey: [RECRUITMENT_SESSIONS_KEY, "support", accountId, since],
    queryFn: async () => {
      const [workflowSteps, screening] = await Promise.all([
        supabase
          .from("recruitment_job_workflow_steps")
          .select("job_id, step_type")
          .eq("account_id", accountId!)
          .eq("is_active", true),
        supabase
          .from("recruitment_screening_results")
          .select("id, candidate_id, job_id, passed, created_at")
          .eq("account_id", accountId!)
          .gte("created_at", since),
      ]);
      return {
        workflowSteps: workflowSteps.data || [],
        screeningResults: screening.data || [],
      };
    },
    enabled: !!accountId,
    staleTime: 30_000,
  });

  const candidateMap = useRecruitmentCandidateMap(
    sessions,
    supportData?.workflowSteps,
    supportData?.screeningResults as any,
  );

  const columns = useMemo<FunnelColumn[]>(() => {
    const steps = supportData?.workflowSteps || [];
    const jobStepsMap = new Map<string, Set<string>>();
    for (const ws of steps) {
      if (!jobStepsMap.has(ws.job_id)) jobStepsMap.set(ws.job_id, new Set());
      jobStepsMap.get(ws.job_id)!.add(ws.step_type);
    }

    const anyJobHasScreening = Array.from(jobStepsMap.values()).some(s => s.has("screening"));

    const cols: FunnelColumn[] = [
      ...(anyJobHasScreening ? [{ key: "screening" as FunnelStage, label: "Triagem", candidates: [] }] : []),
      { key: "cultural", label: "Fit Cultural", candidates: [] },
      { key: "disc", label: "Comportamental (DISC)", candidates: [] },
      { key: "technical", label: "Fit Técnico", candidates: [] },
      { key: "approved", label: "Aprovados", candidates: [] },
    ];

    for (const candidate of candidateMap.values()) {
      const col = cols.find(c => c.key === candidate.currentStage);
      if (col) {
        col.candidates.push(candidate);
      } else {
        cols[0].candidates.push(candidate);
      }
    }

    return cols;
  }, [candidateMap, supportData]);

  const totalCandidates = columns.reduce((sum, col) => sum + col.candidates.length, 0);
  const isLoading = sessionsLoading || supportLoading;

  return { columns, totalCandidates, isLoading };
}
