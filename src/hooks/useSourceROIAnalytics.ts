import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { getSourceLabel } from "./useSourceAttribution";

export interface SourceROIData {
  source: string;
  sourceLabel: string;
  spend: number;
  candidates: number;
  qualified: number;
  hired: number;
  costPerCandidate: number | null;
  costPerQualified: number | null;
  costPerHire: number | null;
  conversionRate: number;
  qualificationRate: number;
  roi: number | null; // ROI = (hired / spend) * valuePerHire - simplified
  color: string;
}

const SOURCE_COLORS: Record<string, string> = {
  linkedin: "hsl(201, 89%, 48%)",
  indeed: "hsl(212, 68%, 44%)",
  google: "hsl(4, 90%, 58%)",
  hunting: "hsl(280, 68%, 52%)",
  careers_page: "hsl(142, 76%, 36%)",
  direct: "hsl(215, 16%, 47%)",
  whatsapp: "hsl(142, 69%, 58%)",
  referral: "hsl(38, 92%, 50%)",
  other: "hsl(215, 14%, 34%)",
};

export function useSourceROIAnalytics(period: DashboardPeriod = "30d", year?: number, month?: number) {
  const { currentAccount } = useOrganization();

  const periodDays: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };

  const days = periodDays[period];
  const startDate = startOfDay(subDays(new Date(), days));

  // Default to current year/month if not provided
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  return useQuery({
    queryKey: ["source-roi-analytics", currentAccount?.id, period, targetYear, targetMonth],
    queryFn: async (): Promise<SourceROIData[]> => {
      if (!currentAccount?.id) {
        return [];
      }

      // 1. Fetch spending data for the period
      const { data: spendData } = await supabase
        .from("recruitment_source_spend")
        .select("source, amount")
        .eq("account_id", currentAccount.id)
        .eq("year", targetYear)
        .eq("month", targetMonth);

      const spendBySource: Record<string, number> = {};
      for (const spend of spendData || []) {
        spendBySource[spend.source] = (spendBySource[spend.source] || 0) + spend.amount;
      }

      // 2. Fetch jobs for this account
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      const jobIds = jobs?.map(j => j.id) || [];
      if (jobIds.length === 0) {
        return buildEmptyROIData(spendBySource);
      }

      // 3. Fetch applications with source data
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id, status, source, applied_at")
        .in("job_id", jobIds)
        .gte("applied_at", startDate.toISOString());

      if (!applications || applications.length === 0) {
        return buildEmptyROIData(spendBySource);
      }

      // 4. Aggregate by source
      const sourceStats: Record<string, {
        candidates: Set<string>;
        qualified: number;
        hired: number;
      }> = {};

      const qualifiedStatuses = ["fit_cultural", "disc", "fit_tecnico", "avaliacao_final", "referencias", "proposta", "hired"];

      for (const app of applications) {
        const source = app.source || "other";

        if (!sourceStats[source]) {
          sourceStats[source] = {
            candidates: new Set(),
            qualified: 0,
            hired: 0,
          };
        }

        sourceStats[source].candidates.add(app.candidate_id);

        if (qualifiedStatuses.includes(app.status)) {
          sourceStats[source].qualified++;
        }
        if (app.status === "hired") {
          sourceStats[source].hired++;
        }
      }

      // 5. Build ROI data
      const roiData: SourceROIData[] = [];
      const allSources = new Set([...Object.keys(sourceStats), ...Object.keys(spendBySource)]);

      for (const source of allSources) {
        const stats = sourceStats[source] || { candidates: new Set(), qualified: 0, hired: 0 };
        const spend = spendBySource[source] || 0;
        const candidateCount = stats.candidates.size;

        const costPerCandidate = candidateCount > 0 && spend > 0
          ? Math.round(spend / candidateCount)
          : null;

        const costPerQualified = stats.qualified > 0 && spend > 0
          ? Math.round(spend / stats.qualified)
          : null;

        const costPerHire = stats.hired > 0 && spend > 0
          ? Math.round(spend / stats.hired)
          : null;

        const conversionRate = candidateCount > 0
          ? Math.round((stats.hired / candidateCount) * 100 * 10) / 10
          : 0;

        const qualificationRate = candidateCount > 0
          ? Math.round((stats.qualified / candidateCount) * 100 * 10) / 10
          : 0;

        roiData.push({
          source,
          sourceLabel: getSourceLabel(source),
          spend,
          candidates: candidateCount,
          qualified: stats.qualified,
          hired: stats.hired,
          costPerCandidate,
          costPerQualified,
          costPerHire,
          conversionRate,
          qualificationRate,
          roi: null, // Would need value per hire to calculate
          color: SOURCE_COLORS[source] || SOURCE_COLORS.other,
        });
      }

      // Sort by candidates descending, then by hired
      return roiData.sort((a, b) => {
        if (b.hired !== a.hired) return b.hired - a.hired;
        return b.candidates - a.candidates;
      });
    },
    enabled: !!currentAccount?.id,
  });
}

function buildEmptyROIData(spendBySource: Record<string, number>): SourceROIData[] {
  return Object.entries(spendBySource).map(([source, spend]) => ({
    source,
    sourceLabel: getSourceLabel(source),
    spend,
    candidates: 0,
    qualified: 0,
    hired: 0,
    costPerCandidate: null,
    costPerQualified: null,
    costPerHire: null,
    conversionRate: 0,
    qualificationRate: 0,
    roi: null,
    color: SOURCE_COLORS[source] || SOURCE_COLORS.other,
  }));
}
