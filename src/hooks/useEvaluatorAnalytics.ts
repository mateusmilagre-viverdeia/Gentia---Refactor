import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { subDays, startOfDay, differenceInHours } from "date-fns";

export interface EvaluatorStats {
  evaluatorId: string;
  evaluatorName: string;
  evaluatorAvatar: string | null;
  totalEvaluations: number;
  averageScore: number;
  recommendations: {
    approve: number;
    reject: number;
    maybe: number;
  };
  averageTimeToEvaluateHours: number | null;
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

export function useEvaluatorAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["evaluator-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<EvaluatorStats[]> => {
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

      // Get applications for these jobs
      const { data: applications, error: appsError } = await supabase
        .from("recruitment_applications")
        .select("id, applied_at")
        .in("job_id", jobIds)
        .neq("source", "test-e2e");

      if (appsError) throw appsError;
      if (!applications || applications.length === 0) return [];

      const appIds = applications.map((a) => a.id);
      const appMap = new Map(applications.map((a) => [a.id, a.applied_at]));

      // Fetch evaluations
      const { data: evaluations, error: evalsError } = await supabase
        .from("recruitment_evaluations")
        .select("id, evaluator_id, overall_score, recommendation, created_at, application_id")
        .in("application_id", appIds)
        .gte("created_at", startDate.toISOString());

      if (evalsError) throw evalsError;
      if (!evaluations || evaluations.length === 0) return [];

      // Get unique evaluator IDs
      const evaluatorIds = [...new Set(evaluations.map((e) => e.evaluator_id))];

      // Fetch evaluator profiles (using first_name and last_name)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", evaluatorIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((p) => [
          p.id, 
          { name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Avaliador" }
        ])
      );

      // Aggregate by evaluator
      const evaluatorMap: Record<
        string,
        {
          scores: number[];
          recommendations: { approve: number; reject: number; maybe: number };
          evaluationTimes: number[];
        }
      > = {};

      evaluations.forEach((evalItem) => {
        if (!evaluatorMap[evalItem.evaluator_id]) {
          evaluatorMap[evalItem.evaluator_id] = {
            scores: [],
            recommendations: { approve: 0, reject: 0, maybe: 0 },
            evaluationTimes: [],
          };
        }

        const entry = evaluatorMap[evalItem.evaluator_id];

        if (evalItem.overall_score !== null) {
          entry.scores.push(evalItem.overall_score);
        }

        const rec = evalItem.recommendation?.toLowerCase() || "";
        if (rec.includes("sim") || rec.includes("aprovar") || rec.includes("yes") || rec.includes("approve")) {
          entry.recommendations.approve++;
        } else if (rec.includes("não") || rec.includes("rejeitar") || rec.includes("no") || rec.includes("reject")) {
          entry.recommendations.reject++;
        } else if (rec.includes("talvez") || rec.includes("maybe")) {
          entry.recommendations.maybe++;
        }

        // Calculate time to evaluate
        const appliedAt = appMap.get(evalItem.application_id);
        if (appliedAt && evalItem.created_at) {
          const hours = differenceInHours(
            new Date(evalItem.created_at),
            new Date(appliedAt)
          );
          if (hours >= 0) {
            entry.evaluationTimes.push(hours);
          }
        }
      });

      // Convert to result array
      const result: EvaluatorStats[] = Object.entries(evaluatorMap)
        .map(([evaluatorId, data]) => {
          const profile = profileMap.get(evaluatorId);
          const avgScore =
            data.scores.length > 0
              ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
              : 0;
          const avgTime =
            data.evaluationTimes.length > 0
              ? Math.round(
                  data.evaluationTimes.reduce((a, b) => a + b, 0) / data.evaluationTimes.length
                )
              : null;

          return {
            evaluatorId,
            evaluatorName: profile?.name || "Avaliador",
            evaluatorAvatar: null,
            totalEvaluations: data.scores.length || Object.values(data.recommendations).reduce((a, b) => a + b, 0),
            averageScore: avgScore,
            recommendations: data.recommendations,
            averageTimeToEvaluateHours: avgTime,
          };
        })
        .sort((a, b) => b.totalEvaluations - a.totalEvaluations);

      return result;
    },
    enabled: !!currentAccount?.id,
  });
}
