import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { subDays, startOfDay, differenceInDays } from "date-fns";

export interface TimeInStage {
  stageId: string;
  stageName: string;
  averageDays: number;
  minDays: number;
  maxDays: number;
  candidateCount: number;
  isBottleneck: boolean;
}

export interface TimeAnalyticsData {
  stages: TimeInStage[];
  overallAverageTime: number;
  fastestHire: number | null;
  slowestHire: number | null;
}

const STATUS_ORDER = ["applied", "screening", "interview", "evaluation", "offer", "hired"];
const STATUS_LABELS: Record<string, string> = {
  applied: "Aplicado",
  screening: "Triagem",
  interview: "Entrevista",
  evaluation: "Avaliação",
  offer: "Proposta",
  hired: "Contratado",
};

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

export function useTimeAnalytics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["time-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<TimeAnalyticsData> => {
      if (!currentAccount?.id) {
        return {
          stages: [],
          overallAverageTime: 0,
          fastestHire: null,
          slowestHire: null,
        };
      }

      const startDate = getPeriodStartDate(period);

      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) {
        return {
          stages: [],
          overallAverageTime: 0,
          fastestHire: null,
          slowestHire: null,
        };
      }

      const jobIds = jobs.map((j) => j.id);

      const { data: applications, error: appsError } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at")
        .in("job_id", jobIds)
        .neq("source", "test-e2e")
        .gte("applied_at", startDate.toISOString());

      if (appsError) throw appsError;
      if (!applications || applications.length === 0) {
        return {
          stages: [],
          overallAverageTime: 0,
          fastestHire: null,
          slowestHire: null,
        };
      }

      const statusTimes: Record<string, number[]> = {};
      STATUS_ORDER.forEach((status) => {
        statusTimes[status] = [];
      });

      const hireTimes: number[] = [];

      applications.forEach((app) => {
        const appliedAt = new Date(app.applied_at);
        const updatedAt = new Date(app.updated_at);
        const daysInProcess = differenceInDays(updatedAt, appliedAt);

        const statusIndex = STATUS_ORDER.indexOf(app.status);
        if (statusIndex >= 0 && daysInProcess > 0) {
          const avgDaysPerStage = daysInProcess / (statusIndex + 1);
          for (let i = 0; i <= statusIndex; i++) {
            statusTimes[STATUS_ORDER[i]].push(avgDaysPerStage);
          }
        }

        if (app.status === "hired" && daysInProcess > 0) {
          hireTimes.push(daysInProcess);
        }
      });

      const stageStats: TimeInStage[] = STATUS_ORDER.map((status) => {
        const times = statusTimes[status];
        if (times.length === 0) {
          return {
            stageId: status,
            stageName: STATUS_LABELS[status] || status,
            averageDays: 0,
            minDays: 0,
            maxDays: 0,
            candidateCount: 0,
            isBottleneck: false,
          };
        }

        const avg = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
        const min = Math.round(Math.min(...times) * 10) / 10;
        const max = Math.round(Math.max(...times) * 10) / 10;

        return {
          stageId: status,
          stageName: STATUS_LABELS[status] || status,
          averageDays: avg,
          minDays: min,
          maxDays: max,
          candidateCount: times.length,
          isBottleneck: false,
        };
      });

      const activeStages = stageStats.filter((s) => s.stageId !== "hired" && s.averageDays > 0);
      if (activeStages.length > 0) {
        const maxAvg = Math.max(...activeStages.map((s) => s.averageDays));
        stageStats.forEach((s) => {
          if (s.averageDays === maxAvg && s.stageId !== "hired") {
            s.isBottleneck = true;
          }
        });
      }

      const overallAverageTime =
        hireTimes.length > 0
          ? Math.round((hireTimes.reduce((a, b) => a + b, 0) / hireTimes.length) * 10) / 10
          : 0;

      return {
        stages: stageStats.filter((s) => s.candidateCount > 0),
        overallAverageTime,
        fastestHire: hireTimes.length > 0 ? Math.min(...hireTimes) : null,
        slowestHire: hireTimes.length > 0 ? Math.max(...hireTimes) : null,
      };
    },
    enabled: !!currentAccount?.id,
  });
}
