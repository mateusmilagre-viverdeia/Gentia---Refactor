import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay, differenceInDays } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";

export interface StageEfficiency {
  stage: string;
  stageName: string;
  candidates: number;
  dropoffRate: number;
}

export interface EfficiencyMetrics {
  timeToHire: number | null;
  avgTimeToHire: number | null;
  stageEfficiency: StageEfficiency[];
  overallEfficiencyScore: number;
  bottlenecks: string[];
  recommendations: string[];
  conversionRate: number;
  totalCandidates: number;
  totalHired: number;
  applicationsPerJob: number | null;
  fillRate: number | null;
  totalJobs: number;
  filledJobs: number;
}

const STAGE_ORDER = ["applied", "screening", "interview", "evaluation", "offer", "hired"];

const STAGE_NAMES: Record<string, string> = {
  applied: "Aplicado",
  screening: "Triagem",
  interview: "Entrevista",
  evaluation: "Avaliação",
  offer: "Proposta",
  hired: "Contratado",
};

export function useEfficiencyMetrics(period: DashboardPeriod = "30d") {
  const { currentAccount } = useOrganization();

  const periodDays: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };

  const days = periodDays[period];
  const startDate = startOfDay(subDays(new Date(), days));

  return useQuery({
    queryKey: ["efficiency-metrics", currentAccount?.id, period],
    queryFn: async (): Promise<EfficiencyMetrics> => {
      if (!currentAccount?.id) {
        return getEmptyMetrics();
      }

      // Fetch jobs with status
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id, status")
        .eq("account_id", currentAccount.id);

      const jobsList = jobs || [];
      const jobIds = jobsList.map(j => j.id);
      const totalJobs = jobsList.length;
      const filledJobs = jobsList.filter(j => j.status === "filled" || j.status === "closed").length;

      if (jobIds.length === 0) {
        return getEmptyMetrics();
      }

      // Fetch applications
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at, job_id")
        .in("job_id", jobIds)
        .gte("applied_at", startDate.toISOString());

      const appsList = applications || [];

      // Count by status
      const statusCounts: Record<string, number> = {};
      for (const stage of STAGE_ORDER) {
        statusCounts[stage] = 0;
      }
      statusCounts["rejected"] = 0;

      for (const app of appsList) {
        const status = app.status || "applied";
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        } else {
          // Map unknown statuses
          if (status === "new") statusCounts["applied"]++;
          else if (status === "review") statusCounts["screening"]++;
          else if (status === "interviewed") statusCounts["interview"]++;
          else statusCounts["applied"]++;
        }
      }

      const totalCandidates = appsList.length;
      const totalHired = statusCounts["hired"];

      // Calculate time to hire
      let timeToHire: number | null = null;
      const hiredApps = appsList.filter(a => a.status === "hired");
      
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          const appliedDate = new Date(app.applied_at);
          const hiredDate = new Date(app.updated_at);
          return sum + differenceInDays(hiredDate, appliedDate);
        }, 0);
        timeToHire = Math.round(totalDays / hiredApps.length);
      }

      // Build stage efficiency
      const stageEfficiency: StageEfficiency[] = [];
      let previousCount = totalCandidates;

      for (let i = 0; i < STAGE_ORDER.length; i++) {
        const stage = STAGE_ORDER[i];
        
        // Count candidates at this stage or beyond
        const countAtOrBeyond = STAGE_ORDER.slice(i).reduce(
          (sum, s) => sum + (statusCounts[s] || 0),
          0
        );

        const dropoffRate = i > 0 && previousCount > 0
          ? Math.round(((previousCount - countAtOrBeyond) / previousCount) * 100)
          : 0;

        stageEfficiency.push({
          stage,
          stageName: STAGE_NAMES[stage] || stage,
          candidates: countAtOrBeyond,
          dropoffRate,
        });

        previousCount = countAtOrBeyond;
      }

      // Calculate conversion rate
      const conversionRate = totalCandidates > 0 
        ? Math.round((totalHired / totalCandidates) * 1000) / 10 
        : 0;

      // Calculate efficiency score
      const avgTimeToHire = timeToHire || 30;
      const timeScore = Math.max(0, 100 - (avgTimeToHire * 2));
      const conversionScore = Math.min(100, conversionRate * 10);
      const overallEfficiencyScore = Math.min(100, Math.round((timeScore + conversionScore) / 2));

      // Identify bottlenecks
      const bottlenecks: string[] = [];
      const recommendations: string[] = [];

      for (const efficiency of stageEfficiency) {
        if (efficiency.dropoffRate > 50) {
          bottlenecks.push(efficiency.stageName);
          recommendations.push(`Alta taxa de desistência em ${efficiency.stageName}. Revise os critérios desta etapa.`);
        }
      }

      if (timeToHire && timeToHire > 30) {
        recommendations.push("O tempo médio de contratação está acima de 30 dias. Otimize o processo.");
      }

      if (conversionRate < 5) {
        recommendations.push("Taxa de conversão baixa. Revise a qualificação de candidatos nas primeiras etapas.");
      }

      // Calculate additional metrics
      const applicationsPerJob = totalJobs > 0 ? Math.round(totalCandidates / totalJobs) : null;
      const fillRate = totalJobs > 0 ? Math.round((filledJobs / totalJobs) * 100) : null;

      return {
        timeToHire,
        avgTimeToHire: timeToHire,
        stageEfficiency,
        overallEfficiencyScore,
        bottlenecks,
        recommendations,
        conversionRate,
        totalCandidates,
        totalHired,
        applicationsPerJob,
        fillRate,
        totalJobs,
        filledJobs,
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyMetrics(): EfficiencyMetrics {
  return {
    timeToHire: null,
    avgTimeToHire: null,
    stageEfficiency: [],
    overallEfficiencyScore: 0,
    bottlenecks: [],
    recommendations: [],
    conversionRate: 0,
    totalCandidates: 0,
    totalHired: 0,
    applicationsPerJob: null,
    fillRate: null,
    totalJobs: 0,
    filledJobs: 0,
  };
}
