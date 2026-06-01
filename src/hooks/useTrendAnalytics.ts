import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, startOfWeek } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { formatBRT } from "@/lib/datetime";

export interface TrendDataPoint {
  date: string;
  label: string;
  applications: number;
  hired: number;
  rejected: number;
  interviews: number;
}

export interface TrendAnalytics {
  data: TrendDataPoint[];
  totals: {
    applications: number;
    hired: number;
    rejected: number;
    interviews: number;
  };
  growth: {
    applications: number;
    hired: number;
  };
}

export function useTrendAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  const periodDays: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };

  const days = periodDays[period];
  const startDate = startOfDay(subDays(new Date(), days));
  const endDate = new Date();

  return useQuery({
    queryKey: ["trend-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<TrendAnalytics> => {
      if (!currentAccount?.id) {
        return getEmptyTrend();
      }

      // Fetch jobs
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      const jobIds = jobs?.map(j => j.id) || [];

      if (jobIds.length === 0) {
        return getEmptyTrend();
      }

      // Fetch applications
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at")
        .in("job_id", jobIds)
        .neq("source", "test-e2e")
        .gte("applied_at", startDate.toISOString());

      // Fetch interviews
      const { data: interviews } = await supabase
        .from("culture_interview_sessions")
        .select("id, status, created_at")
        .in("job_id", jobIds)
        .gte("created_at", startDate.toISOString());

      const appsList = applications || [];
      const interviewsList = interviews || [];

      // Generate date intervals
      const useWeekly = days > 14;
      const intervals = useWeekly
        ? eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 })
        : eachDayOfInterval({ start: startDate, end: endDate });

      // Build data points
      const data: TrendDataPoint[] = intervals.map((date, index) => {
        const nextDate = intervals[index + 1] || endDate;
        
        const dateApps = appsList.filter(app => {
          const appDate = new Date(app.applied_at);
          return appDate >= date && appDate < nextDate;
        });

        const dateInterviews = interviewsList.filter(i => {
          const iDate = new Date(i.created_at);
          return iDate >= date && iDate < nextDate;
        });

        return {
          date: formatBRT(date, "yyyy-MM-dd"),
          label: useWeekly 
            ? formatBRT(date, "'Sem' w")
            : formatBRT(date, "dd/MM"),
          applications: dateApps.length,
          hired: dateApps.filter(a => a.status === "hired").length,
          rejected: dateApps.filter(a => a.status === "rejected").length,
          interviews: dateInterviews.length,
        };
      });

      // Calculate totals
      const totals = {
        applications: appsList.length,
        hired: appsList.filter(a => a.status === "hired").length,
        rejected: appsList.filter(a => a.status === "rejected").length,
        interviews: interviewsList.length,
      };

      // Calculate growth (compare first half to second half)
      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint);
      const secondHalf = data.slice(midpoint);

      const firstHalfApps = firstHalf.reduce((sum, d) => sum + d.applications, 0);
      const secondHalfApps = secondHalf.reduce((sum, d) => sum + d.applications, 0);
      const firstHalfHired = firstHalf.reduce((sum, d) => sum + d.hired, 0);
      const secondHalfHired = secondHalf.reduce((sum, d) => sum + d.hired, 0);

      const growth = {
        applications: firstHalfApps > 0 
          ? Math.round(((secondHalfApps - firstHalfApps) / firstHalfApps) * 100) 
          : secondHalfApps > 0 ? 100 : 0,
        hired: firstHalfHired > 0 
          ? Math.round(((secondHalfHired - firstHalfHired) / firstHalfHired) * 100) 
          : secondHalfHired > 0 ? 100 : 0,
      };

      return { data, totals, growth };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyTrend(): TrendAnalytics {
  return {
    data: [],
    totals: { applications: 0, hired: 0, rejected: 0, interviews: 0 },
    growth: { applications: 0, hired: 0 },
  };
}
