import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfWeek, eachWeekOfInterval } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { formatBRT } from "@/lib/datetime";

// Mapping stages to track progression
const PROGRESSION_STAGES = [
  "applied",
  "fit_cultural",
  "disc",
  "fit_tecnico",
  "avaliacao_final",
  "referencias",
  "proposta",
  "hired",
] as const;

export interface StageConversion {
  fit_cultural: number;
  disc: number;
  fit_tecnico: number;
  avaliacao_final: number;
  proposta: number;
  hired: number;
}

export interface FunnelTrendDataPoint {
  weekLabel: string;
  weekStart: string;
  applicants: number;
  hired: number;
  conversionRate: number;
  stageConversions: StageConversion;
}

export interface FunnelTrendAnalytics {
  data: FunnelTrendDataPoint[];
  weekOverWeekGrowth: {
    conversionRate: number;
    applicants: number;
  };
  averageConversionRate: number;
}

const periodDays: Record<DashboardPeriod, number> = {
  "1d": 7,  // Minimum 1 week for trends
  "3d": 14,
  "7d": 28,
  "30d": 90,
};

export function useFunnelTrendAnalytics(
  period: DashboardPeriod = "30d",
  jobId?: string
) {
  const { currentAccount } = useOrganization();

  const days = periodDays[period];
  const startDate = startOfWeek(subDays(new Date(), days), { weekStartsOn: 1 });
  const endDate = new Date();

  return useQuery({
    queryKey: ["funnel-trend-analytics", currentAccount?.id, period, jobId],
    queryFn: async (): Promise<FunnelTrendAnalytics> => {
      if (!currentAccount?.id) {
        return getEmptyTrend();
      }

      // Get job IDs
      let jobIds: string[] = [];
      if (jobId) {
        jobIds = [jobId];
      } else {
        const { data: jobs } = await supabase
          .from("recruitment_jobs")
          .select("id")
          .eq("account_id", currentAccount.id);
        jobIds = jobs?.map((j) => j.id) || [];
      }

      if (jobIds.length === 0) {
        return getEmptyTrend();
      }

      // Fetch applications with stage history
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at")
        .in("job_id", jobIds)
        .gte("applied_at", startDate.toISOString());

      const appsList = applications || [];

      // Generate weekly intervals
      const weeks = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 }
      );

      // Build data points for each week
      const data: FunnelTrendDataPoint[] = weeks.map((weekStart, index) => {
        const weekEnd = weeks[index + 1] || endDate;

        // Applications that existed by end of this week
        const weekApps = appsList.filter((app) => {
          const appDate = new Date(app.applied_at);
          return appDate <= weekEnd;
        });

        // Count by status
        const statusCounts: Record<string, number> = {};
        weekApps.forEach((app) => {
          const status = app.status || "applied";
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const applicants = weekApps.length;
        const hired = statusCounts["hired"] || 0;

        // Calculate stage conversions (cumulative up to this week)
        const getStageCount = (stage: string) => {
          const stageIndex = PROGRESSION_STAGES.indexOf(stage as any);
          if (stageIndex === -1) return 0;

          return weekApps.filter((app) => {
            const appStageIndex = PROGRESSION_STAGES.indexOf(app.status as any);
            return appStageIndex >= stageIndex;
          }).length;
        };

        const stageConversions: StageConversion = {
          fit_cultural: applicants > 0 ? (getStageCount("fit_cultural") / applicants) * 100 : 0,
          disc: applicants > 0 ? (getStageCount("disc") / applicants) * 100 : 0,
          fit_tecnico: applicants > 0 ? (getStageCount("fit_tecnico") / applicants) * 100 : 0,
          avaliacao_final: applicants > 0 ? (getStageCount("avaliacao_final") / applicants) * 100 : 0,
          proposta: applicants > 0 ? (getStageCount("proposta") / applicants) * 100 : 0,
          hired: applicants > 0 ? (hired / applicants) * 100 : 0,
        };

        return {
          weekLabel: formatBRT(weekStart, "'Sem' w"),
          weekStart: formatBRT(weekStart, "yyyy-MM-dd"),
          applicants,
          hired,
          conversionRate: applicants > 0 ? (hired / applicants) * 100 : 0,
          stageConversions,
        };
      });

      // Calculate week-over-week growth
      const lastWeek = data[data.length - 1];
      const prevWeek = data[data.length - 2];

      let conversionGrowth = 0;
      let applicantsGrowth = 0;

      if (prevWeek && lastWeek) {
        if (prevWeek.conversionRate > 0) {
          conversionGrowth = ((lastWeek.conversionRate - prevWeek.conversionRate) / prevWeek.conversionRate) * 100;
        } else if (lastWeek.conversionRate > 0) {
          conversionGrowth = 100;
        }

        if (prevWeek.applicants > 0) {
          applicantsGrowth = ((lastWeek.applicants - prevWeek.applicants) / prevWeek.applicants) * 100;
        } else if (lastWeek.applicants > 0) {
          applicantsGrowth = 100;
        }
      }

      // Calculate average conversion rate
      const avgConversion = data.length > 0
        ? data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length
        : 0;

      return {
        data,
        weekOverWeekGrowth: {
          conversionRate: Math.round(conversionGrowth),
          applicants: Math.round(applicantsGrowth),
        },
        averageConversionRate: Math.round(avgConversion * 10) / 10,
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyTrend(): FunnelTrendAnalytics {
  return {
    data: [],
    weekOverWeekGrowth: { conversionRate: 0, applicants: 0 },
    averageConversionRate: 0,
  };
}
