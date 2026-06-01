import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { subDays, startOfDay } from "date-fns";

export interface JobAnalytics {
  jobId: string;
  jobTitle: string;
  status: string;
  totalCandidates: number;
  hired: number;
  rejected: number;
  inProgress: number;
  conversionRate: number;
  averageScore: number | null;
  topSources: { source: string; count: number }[];
  createdAt: string;
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

export function useJobAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["job-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<JobAnalytics[]> => {
      if (!currentAccount?.id) return [];

      const startDate = getPeriodStartDate(period);

      // Fetch all jobs
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status, created_at")
        .eq("account_id", currentAccount.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) return [];

      const jobIds = jobs.map((j) => j.id);

      // Fetch applications for all jobs
      const { data: applications, error: appsError } = await supabase
        .from("recruitment_applications")
        .select("id, job_id, status, source")
        .in("job_id", jobIds);

      if (appsError) throw appsError;

      // Fetch evaluations for scoring
      const { data: evaluations, error: evalsError } = await supabase
        .from("recruitment_evaluations")
        .select("application_id, overall_score")
        .in(
          "application_id",
          (applications || []).map((a) => a.id)
        );

      if (evalsError) throw evalsError;

      // Build analytics per job
      const analytics: JobAnalytics[] = jobs.map((job) => {
        const jobApps = (applications || []).filter((a) => a.job_id === job.id);
        const hired = jobApps.filter((a) => a.status === "hired").length;
        const rejected = jobApps.filter((a) => a.status === "rejected").length;
        const inProgress = jobApps.length - hired - rejected;

        // Calculate average score
        const appIds = jobApps.map((a) => a.id);
        const jobEvals = (evaluations || []).filter((e) =>
          appIds.includes(e.application_id)
        );
        const scores = jobEvals
          .map((e) => e.overall_score)
          .filter((s): s is number => s !== null);
        const averageScore =
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null;

        // Count sources
        const sourceCounts: Record<string, number> = {};
        jobApps.forEach((app) => {
          const source = app.source || "careers_page";
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        const topSources = Object.entries(sourceCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        return {
          jobId: job.id,
          jobTitle: job.title,
          status: job.status,
          totalCandidates: jobApps.length,
          hired,
          rejected,
          inProgress,
          conversionRate:
            jobApps.length > 0
              ? Math.round((hired / jobApps.length) * 100 * 10) / 10
              : 0,
          averageScore,
          topSources,
          createdAt: job.created_at,
        };
      });

      return analytics;
    },
    enabled: !!currentAccount?.id,
  });
}
