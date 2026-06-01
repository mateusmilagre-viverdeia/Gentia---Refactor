import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import {
  useRecruitmentSourceSpend,
  type RecruitmentSourceSpendRow,
} from "@/hooks/useRecruitmentSourceSpend";

export type SourceROIResult = {
  source: string;
  spend: number;
  jobsFilled: number;
  cpa: number | null;
};

function isoMonthStart(year: number, month: number) {
  const d = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  return d.toISOString();
}

function isoNextMonthStart(year: number, month: number) {
  const d = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return d.toISOString();
}

export function useSourceROI(params: { year: number; month: number }) {
  const { account } = useAccount();
  const accountId = account?.id;

  const spendQuery = useRecruitmentSourceSpend({ year: params.year, month: params.month });

  const key = useMemo(
    () => ["source_roi", { accountId, year: params.year, month: params.month }],
    [accountId, params.year, params.month]
  );

  const roiQuery = useQuery({
    queryKey: key,
    enabled: Boolean(accountId),
    queryFn: async (): Promise<SourceROIResult[]> => {
      if (!accountId) return [];

      const spendRows = (spendQuery.data ?? []) as RecruitmentSourceSpendRow[];
      const spendBySource = new Map<string, number>();
      spendRows.forEach((r) => {
        spendBySource.set(r.source, (spendBySource.get(r.source) ?? 0) + Number(r.amount));
      });

      // 1 vaga preenchida por job_id, atribuída ao primeiro "hired" do mês
      const start = isoMonthStart(params.year, params.month);
      const end = isoNextMonthStart(params.year, params.month);

      const { data: hiredApps, error } = await supabase
        .from("recruitment_applications")
        .select("job_id, source, updated_at")
        .eq("account_id", accountId)
        .eq("status", "hired")
        .gte("updated_at", start)
        .lt("updated_at", end)
        .not("job_id", "is", null)
        .not("source", "is", null)
        .order("updated_at", { ascending: true });

      if (error) throw error;

      const earliestHireByJob = new Map<string, { source: string }>();
      (hiredApps ?? []).forEach((row) => {
        const jobId = row.job_id as string | null;
        const source = row.source as string | null;
        if (!jobId || !source) return;
        if (!earliestHireByJob.has(jobId)) earliestHireByJob.set(jobId, { source });
      });

      const jobsFilledBySource = new Map<string, number>();
      earliestHireByJob.forEach((v) => {
        jobsFilledBySource.set(v.source, (jobsFilledBySource.get(v.source) ?? 0) + 1);
      });

      const allSources = new Set<string>([
        ...Array.from(spendBySource.keys()),
        ...Array.from(jobsFilledBySource.keys()),
      ]);

      const results: SourceROIResult[] = Array.from(allSources).map((source) => {
        const spend = spendBySource.get(source) ?? 0;
        const jobsFilled = jobsFilledBySource.get(source) ?? 0;
        const cpa = jobsFilled > 0 ? spend / jobsFilled : null;
        return { source, spend, jobsFilled, cpa };
      });

      results.sort((a, b) => b.spend - a.spend);
      return results;
    },
  });

  return { spendQuery, roiQuery };
}
