import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, eachDayOfInterval, startOfDay } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { formatBRT } from "@/lib/datetime";

export interface CandidateTimePoint {
  date: string;
  dateLabel: string;
  candidates: number;
  cumulative: number;
}

export function useCandidatesOverTime(period: DashboardPeriod = "7d") {
  const { currentAccount } = useOrganization();

  const periodDays: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };

  const days = periodDays[period];

  return useQuery({
    queryKey: ["candidates-over-time", currentAccount?.id, period],
    queryFn: async (): Promise<CandidateTimePoint[]> => {
      if (!currentAccount?.id) {
        return [];
      }

      const endDate = new Date();
      const startDate = startOfDay(subDays(endDate, days));

      // Fetch all jobs for this account
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        throw jobsError;
      }

      const jobIds = jobs?.map(j => j.id) || [];

      // Fetch culture interview sessions with creation dates
      let interviewDates: Date[] = [];
      if (jobIds.length > 0) {
        const { data: interviews, error: interviewsError } = await supabase
          .from("culture_interview_sessions")
          .select("created_at")
          .in("job_id", jobIds)
          .gte("created_at", startDate.toISOString());

        if (interviewsError) {
          console.error("Error fetching interviews:", interviewsError);
        } else {
          interviewDates = (interviews || []).map(i => new Date(i.created_at));
        }
      }

      // Fetch direct candidates
      const { data: directCandidates, error: candidatesError } = await supabase
        .from("recruitment_candidates")
        .select("created_at")
        .eq("account_id", currentAccount.id)
        .gte("created_at", startDate.toISOString());

      if (candidatesError) {
        console.error("Error fetching candidates:", candidatesError);
      }

      const directDates = (directCandidates || []).map(c => new Date(c.created_at));

      // Combine all candidate dates
      const allDates = [...interviewDates, ...directDates];

      // Generate all days in the interval
      const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

      // Count candidates per day
      const dailyCounts = new Map<string, number>();
      dateInterval.forEach(date => {
        dailyCounts.set(formatBRT(date, "yyyy-MM-dd"), 0);
      });

      allDates.forEach(date => {
        const dateKey = formatBRT(date, "yyyy-MM-dd");
        if (dailyCounts.has(dateKey)) {
          dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
        }
      });

      // Build time series with cumulative count
      let cumulative = 0;
      const timePoints: CandidateTimePoint[] = dateInterval.map(date => {
        const dateKey = formatBRT(date, "yyyy-MM-dd");
        const count = dailyCounts.get(dateKey) || 0;
        cumulative += count;

        return {
          date: dateKey,
          dateLabel: formatBRT(date, days <= 7 ? "EEE" : "dd/MM"),
          candidates: count,
          cumulative,
        };
      });

      return timePoints;
    },
    enabled: !!currentAccount?.id,
  });
}
