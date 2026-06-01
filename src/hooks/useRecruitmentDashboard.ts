import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay } from "date-fns";

export type DashboardPeriod = "1d" | "3d" | "7d" | "30d";

export interface RecruitmentDashboardStats {
  candidates: {
    total: number;
    new: number;
    trend: string;
    previousPeriodTotal: number;
  };
  jobs: {
    active: number;
    total: number;
    draft: number;
    paused: number;
    closed: number;
  };
  interviews: {
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  applications: {
    new: number;
    screening: number;
    interview: number;
    total: number;
  };
}

export function useRecruitmentDashboard(period: DashboardPeriod = "7d") {
  const { currentAccount } = useOrganization();

  const periodDays: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };

  const days = periodDays[period];
  const startDate = startOfDay(subDays(new Date(), days));
  const previousStartDate = startOfDay(subDays(startDate, days));

  return useQuery({
    queryKey: ["recruitment-dashboard", currentAccount?.id, period],
    queryFn: async (): Promise<RecruitmentDashboardStats> => {
      if (!currentAccount?.id) {
        return getEmptyStats();
      }

      // Fetch all jobs for this account
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id, status, created_at")
        .eq("account_id", currentAccount.id);

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        throw jobsError;
      }

      const jobIds = jobs?.map(j => j.id) || [];

      // If no jobs, return empty stats
      if (jobIds.length === 0) {
        return getEmptyStats();
      }

      // Fetch culture interview sessions for these jobs
      const { data: interviews, error: interviewsError } = await supabase
        .from("culture_interview_sessions")
        .select("id, status, created_at, candidate_profile_id")
        .in("job_id", jobIds);

      if (interviewsError) {
        console.error("Error fetching interviews:", interviewsError);
      }

      // Fetch applications
      const { data: applications, error: applicationsError } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at")
        .in("job_id", jobIds);

      if (applicationsError) {
        console.error("Error fetching applications:", applicationsError);
      }

      // Fetch direct candidates from recruitment_candidates
      const { data: directCandidates, error: candidatesError } = await supabase
        .from("recruitment_candidates")
        .select("id, created_at")
        .eq("account_id", currentAccount.id);

      if (candidatesError) {
        console.error("Error fetching candidates:", candidatesError);
      }

      // Calculate job stats
      const jobStats = {
        total: jobs?.length || 0,
        active: jobs?.filter(j => j.status === "active").length || 0,
        draft: jobs?.filter(j => j.status === "draft").length || 0,
        paused: jobs?.filter(j => j.status === "paused").length || 0,
        closed: jobs?.filter(j => j.status === "closed").length || 0,
      };

      // Calculate interview stats
      const interviewsList = interviews || [];
      const interviewStats = {
        total: interviewsList.length,
        pending: interviewsList.filter(i => i.status === "pending" || i.status === "invited").length,
        inProgress: interviewsList.filter(i => i.status === "in_progress").length,
        completed: interviewsList.filter(i => i.status === "completed").length,
      };

      // Calculate application stats
      const applicationsList = applications || [];
      const applicationStats = {
        total: applicationsList.length,
        new: applicationsList.filter(a => a.status === "applied" || a.status === "new").length,
        screening: applicationsList.filter(a => a.status === "screening" || a.status === "review").length,
        interview: applicationsList.filter(a => a.status === "interview" || a.status === "interviewed").length,
      };

      // Calculate candidate stats
      // Combine unique candidates from interviews, applications, and direct candidates
      const interviewCandidateIds = new Set(interviewsList.map(i => i.candidate_profile_id).filter(Boolean));
      const directCandidatesList = directCandidates || [];
      
      // Total unique candidates
      const totalCandidates = interviewCandidateIds.size + directCandidatesList.length;

      // New candidates in period
      const newFromInterviews = interviewsList.filter(
        i => new Date(i.created_at) >= startDate
      ).length;
      const newFromDirect = directCandidatesList.filter(
        c => new Date(c.created_at) >= startDate
      ).length;
      const newCandidates = newFromInterviews + newFromDirect;

      // Previous period candidates (for trend calculation)
      const previousFromInterviews = interviewsList.filter(
        i => new Date(i.created_at) >= previousStartDate && new Date(i.created_at) < startDate
      ).length;
      const previousFromDirect = directCandidatesList.filter(
        c => new Date(c.created_at) >= previousStartDate && new Date(c.created_at) < startDate
      ).length;
      const previousPeriodTotal = previousFromInterviews + previousFromDirect;

      // Calculate trend
      let trend = "+0%";
      if (previousPeriodTotal > 0) {
        const changePercent = Math.round(((newCandidates - previousPeriodTotal) / previousPeriodTotal) * 100);
        trend = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
      } else if (newCandidates > 0) {
        trend = "+100%";
      }

      return {
        candidates: {
          total: totalCandidates,
          new: newCandidates,
          trend,
          previousPeriodTotal,
        },
        jobs: jobStats,
        interviews: interviewStats,
        applications: applicationStats,
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyStats(): RecruitmentDashboardStats {
  return {
    candidates: {
      total: 0,
      new: 0,
      trend: "+0%",
      previousPeriodTotal: 0,
    },
    jobs: {
      active: 0,
      total: 0,
      draft: 0,
      paused: 0,
      closed: 0,
    },
    interviews: {
      pending: 0,
      inProgress: 0,
      completed: 0,
      total: 0,
    },
    applications: {
      new: 0,
      screening: 0,
      interview: 0,
      total: 0,
    },
  };
}
