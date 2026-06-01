import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { subDays, startOfDay } from "date-fns";
import { getSourceLabel, getSourceColor, getMediumLabel } from "@/hooks/useSourceAttribution";

export interface SourceData {
  source: string;
  sourceLabel: string;
  candidates: number;
  hired: number;
  rejected: number;
  qualified: number;
  conversionRate: number;
  qualificationRate: number;
  color: string;
}

export interface MediumData {
  medium: string;
  mediumLabel: string;
  candidates: number;
  hired: number;
  conversionRate: number;
}

export interface CampaignData {
  campaign: string;
  source: string;
  candidates: number;
  hired: number;
  conversionRate: number;
}

function getPeriodStartDate(period: DashboardPeriod): Date {
  const now = new Date();
  switch (period) {
    case "1d":
      return startOfDay(subDays(now, 1));
    case "3d":
      return startOfDay(subDays(now, 3));
    case "7d":
      return startOfDay(subDays(now, 7));
    case "30d":
      return startOfDay(subDays(now, 30));
    default:
      return startOfDay(subDays(now, 30));
  }
}

export function useSourceAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["source-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<SourceData[]> => {
      if (!currentAccount?.id) return [];

      const startDate = getPeriodStartDate(period);

      // Get job IDs for this account
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) return [];

      const jobIds = jobs.map((j) => j.id);

      // Fetch applications with source
      const { data: applications, error: appsError } = await supabase
        .from("recruitment_applications")
        .select("id, status, source, medium, campaign, applied_at")
        .in("job_id", jobIds)
        .neq("source", "test-e2e")
        .gte("applied_at", startDate.toISOString());

      if (appsError) throw appsError;
      if (!applications || applications.length === 0) return [];

      // Aggregate by source
      const sourceMap: Record<string, { 
        candidates: number; 
        hired: number; 
        rejected: number;
        qualified: number;
      }> = {};

      applications.forEach((app) => {
        const source = app.source || "careers_page";
        if (!sourceMap[source]) {
          sourceMap[source] = { candidates: 0, hired: 0, rejected: 0, qualified: 0 };
        }
        sourceMap[source].candidates++;
        if (app.status === "hired") sourceMap[source].hired++;
        if (app.status === "rejected") sourceMap[source].rejected++;
        // Consider qualified if not rejected and not just applied
        if (app.status !== "rejected" && app.status !== "applied") {
          sourceMap[source].qualified++;
        }
      });

      // Convert to array
      const result: SourceData[] = Object.entries(sourceMap)
        .map(([source, data]) => ({
          source,
          sourceLabel: getSourceLabel(source),
          candidates: data.candidates,
          hired: data.hired,
          rejected: data.rejected,
          qualified: data.qualified,
          conversionRate:
            data.candidates > 0
              ? Math.round((data.hired / data.candidates) * 100 * 10) / 10
              : 0,
          qualificationRate:
            data.candidates > 0
              ? Math.round((data.qualified / data.candidates) * 100 * 10) / 10
              : 0,
          color: getSourceColor(source),
        }))
        .sort((a, b) => b.candidates - a.candidates);

      return result;
    },
    enabled: !!currentAccount?.id,
  });
}

export function useMediumAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["medium-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<MediumData[]> => {
      if (!currentAccount?.id) return [];

      const startDate = getPeriodStartDate(period);

      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      if (!jobs || jobs.length === 0) return [];

      const jobIds = jobs.map((j) => j.id);

      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, medium, applied_at")
        .in("job_id", jobIds)
        .neq("source", "test-e2e")
        .gte("applied_at", startDate.toISOString());

      if (!applications || applications.length === 0) return [];

      const mediumMap: Record<string, { candidates: number; hired: number }> = {};

      applications.forEach((app) => {
        const medium = app.medium || "direct";
        if (!mediumMap[medium]) {
          mediumMap[medium] = { candidates: 0, hired: 0 };
        }
        mediumMap[medium].candidates++;
        if (app.status === "hired") mediumMap[medium].hired++;
      });

      return Object.entries(mediumMap)
        .map(([medium, data]) => ({
          medium,
          mediumLabel: getMediumLabel(medium),
          candidates: data.candidates,
          hired: data.hired,
          conversionRate:
            data.candidates > 0
              ? Math.round((data.hired / data.candidates) * 100 * 10) / 10
              : 0,
        }))
        .sort((a, b) => b.candidates - a.candidates);
    },
    enabled: !!currentAccount?.id,
  });
}

export function useCampaignAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["campaign-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<CampaignData[]> => {
      if (!currentAccount?.id) return [];

      const startDate = getPeriodStartDate(period);

      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      if (!jobs || jobs.length === 0) return [];

      const jobIds = jobs.map((j) => j.id);

      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, source, campaign, applied_at")
        .in("job_id", jobIds)
        .neq("source", "test-e2e")
        .gte("applied_at", startDate.toISOString())
        .not("campaign", "is", null);

      if (!applications || applications.length === 0) return [];

      const campaignMap: Record<string, { source: string; candidates: number; hired: number }> = {};

      applications.forEach((app) => {
        const campaign = app.campaign || "unknown";
        if (!campaignMap[campaign]) {
          campaignMap[campaign] = { source: app.source || "unknown", candidates: 0, hired: 0 };
        }
        campaignMap[campaign].candidates++;
        if (app.status === "hired") campaignMap[campaign].hired++;
      });

      return Object.entries(campaignMap)
        .map(([campaign, data]) => ({
          campaign,
          source: data.source,
          candidates: data.candidates,
          hired: data.hired,
          conversionRate:
            data.candidates > 0
              ? Math.round((data.hired / data.candidates) * 100 * 10) / 10
              : 0,
        }))
        .sort((a, b) => b.candidates - a.candidates);
    },
    enabled: !!currentAccount?.id,
  });
}
