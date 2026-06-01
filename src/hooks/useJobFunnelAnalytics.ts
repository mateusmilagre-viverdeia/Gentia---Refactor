import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay, differenceInDays } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";

export interface FunnelStageMetrics {
  id: string;
  name: string;
  count: number;
  percentage: number;
  conversionRate: number | null;
  dropOffRate: number;
  dropOffCount: number;
  avgTimeInStage: number | null;
  isBottleneck: boolean;
  bottleneckSeverity: "critical" | "warning" | "healthy";
  color: string;
}

export interface JobFunnelMetrics {
  stages: FunnelStageMetrics[];
  totalCandidates: number;
  totalHired: number;
  totalRejected: number;
  overallConversionRate: number;
  avgTimeToHire: number | null;
  fastestHire: number | null;
  slowestHire: number | null;
  mainBottleneck: string | null;
  jobInfo?: {
    id: string;
    title: string;
    department: string | null;
  };
}

// Pipeline padrão do recrutamento
const DEFAULT_STAGES = [
  { id: "applied", name: "Aplicado", color: "hsl(217, 91%, 60%)" },
  { id: "fit_cultural", name: "Fit Cultural", color: "hsl(271, 91%, 65%)" },
  { id: "disc", name: "DISC", color: "hsl(260, 80%, 55%)" },
  { id: "fit_tecnico", name: "Fit Técnico", color: "hsl(200, 85%, 50%)" },
  { id: "avaliacao_final", name: "Avaliação Final", color: "hsl(38, 92%, 50%)" },
  { id: "referencias", name: "Referências", color: "hsl(170, 75%, 45%)" },
  { id: "proposta", name: "Proposta", color: "hsl(160, 84%, 39%)" },
  { id: "hired", name: "Contratado", color: "hsl(142, 76%, 36%)" },
];

// Mapeamento de status legados
const STATUS_MAPPING: Record<string, string> = {
  new: "applied",
  review: "fit_cultural",
  screening: "fit_cultural",
  interview: "avaliacao_final",
  interviewed: "avaliacao_final",
  evaluation: "avaliacao_final",
  offer: "proposta",
  cultural_fit: "fit_cultural",
  disc_assessment: "disc",
  technical_fit: "fit_tecnico",
  rejected: "rejected",
  desqualificado: "rejected",
};

function normalizeStatus(status: string): string {
  return STATUS_MAPPING[status] || status;
}

function getBottleneckSeverity(conversionRate: number): "critical" | "warning" | "healthy" {
  if (conversionRate < 40) return "critical";
  if (conversionRate < 60) return "warning";
  return "healthy";
}

const STAGE_COLORS: Record<string, string> = {
  applied: "hsl(217, 91%, 60%)",
  fit_cultural: "hsl(271, 91%, 65%)",
  disc: "hsl(260, 80%, 55%)",
  fit_tecnico: "hsl(200, 85%, 50%)",
  avaliacao_final: "hsl(38, 92%, 50%)",
  referencias: "hsl(170, 75%, 45%)",
  proposta: "hsl(160, 84%, 39%)",
  hired: "hsl(142, 76%, 36%)",
};

export function useJobFunnelAnalytics(
  period: DashboardPeriod = "30d",
  jobId?: string
) {
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
    queryKey: ["job-funnel-analytics", currentAccount?.id, period, jobId],
    queryFn: async (): Promise<JobFunnelMetrics> => {
      if (!currentAccount?.id) {
        return getEmptyMetrics();
      }

      // Buscar vagas
      let jobsQuery = supabase
        .from("recruitment_jobs")
        .select("id, title, department, funnel_id")
        .eq("account_id", currentAccount.id);

      if (jobId) {
        jobsQuery = jobsQuery.eq("id", jobId);
      }

      const { data: jobs, error: jobsError } = await jobsQuery;
      if (jobsError) throw jobsError;

      const jobIds = jobs?.map((j) => j.id) || [];
      if (jobIds.length === 0) {
        return getEmptyMetrics();
      }

      // Buscar stages customizados se houver funnel_id
      let stagesConfig = DEFAULT_STAGES;
      if (jobId && jobs?.[0]?.funnel_id) {
        const { data: customStages } = await supabase
          .from("hiring_funnel_stages")
          .select("id, name, position, color, step_type")
          .eq("funnel_id", jobs[0].funnel_id)
          .order("position", { ascending: true });

        if (customStages && customStages.length > 0) {
          stagesConfig = [
            { id: "applied", name: "Aplicado", color: "hsl(217, 91%, 60%)" },
            ...customStages.map((s, i) => ({
              id: s.step_type || s.id,
              name: s.name,
              color: s.color || STAGE_COLORS[s.step_type || ""] || `hsl(${180 + i * 30}, 70%, 50%)`,
            })),
            { id: "hired", name: "Contratado", color: "hsl(142, 76%, 36%)" },
          ];
        }
      }

      // Buscar candidaturas e sessões em paralelo
      const [appsResult, cultureResult, discResult, technicalResult] = await Promise.all([
        supabase
          .from("recruitment_applications")
          .select("id, status, applied_at, updated_at, job_id, candidate_id")
          .in("job_id", jobIds),
        supabase
          .from("culture_interview_sessions")
          .select("id, candidate_id, status, completed_at, job_id")
          .in("job_id", jobIds),
        supabase
          .from("candidate_disc_sessions")
          .select("id, candidate_id, status, completed_at, job_id")
          .in("job_id", jobIds),
        supabase
          .from("technical_interview_sessions")
          .select("id, candidate_id, status, completed_at, job_id")
          .in("job_id", jobIds),
      ]);

      if (appsResult.error) throw appsResult.error;

      const applications = appsResult.data || [];
      const cultureSessions = cultureResult.data || [];
      const discSessions = discResult.data || [];
      const technicalSessions = technicalResult.data || [];

      // Filtrar por período
      const filteredApps = applications.filter(
        (app) => new Date(app.applied_at) >= startDate
      );

      const totalCandidates = filteredApps.length;
      if (totalCandidates === 0) {
        return getEmptyMetrics(jobId && jobs?.[0] ? {
          id: jobs[0].id,
          title: jobs[0].title,
          department: jobs[0].department,
        } : undefined);
      }

      // Build lookup sets for completed sessions by candidate_id
      const cultureCompleted = new Set(
        cultureSessions
          .filter(s => s.status === "completed")
          .map(s => s.candidate_id)
      );
      const discCompleted = new Set(
        discSessions
          .filter(s => s.status === "completed")
          .map(s => s.candidate_id)
      );
      const technicalCompleted = new Set(
        technicalSessions
          .filter(s => s.status === "completed")
          .map(s => s.candidate_id)
      );

      // Also track in-progress sessions (candidate at least started)
      const cultureStarted = new Set(
        cultureSessions.map(s => s.candidate_id)
      );
      const discStarted = new Set(
        discSessions.map(s => s.candidate_id)
      );
      const technicalStarted = new Set(
        technicalSessions.map(s => s.candidate_id)
      );

      // Stage order for comparison
      const stageOrder: Record<string, number> = {};
      stagesConfig.forEach((s, i) => { stageOrder[s.id] = i; });

      // Determine max stage reached per candidate
      const statusCounts: Record<string, number> = {};
      const rejectedCount = { count: 0 };

      for (const app of filteredApps) {
        const normalizedStatus = normalizeStatus(app.status || "applied");
        
        if (normalizedStatus === "rejected") {
          rejectedCount.count++;
          continue;
        }

        // Start with status-based stage
        let maxStage = normalizedStatus;
        if (!(maxStage in stageOrder)) {
          maxStage = "applied";
        }
        let maxOrder = stageOrder[maxStage] ?? 0;

        const candidateId = app.candidate_id;

        // Elevate based on completed sessions
        if (candidateId) {
          if (cultureCompleted.has(candidateId) && (stageOrder["fit_cultural"] ?? -1) > maxOrder) {
            maxStage = "fit_cultural";
            maxOrder = stageOrder["fit_cultural"] ?? maxOrder;
          }
          if (discCompleted.has(candidateId) && (stageOrder["disc"] ?? -1) > maxOrder) {
            maxStage = "disc";
            maxOrder = stageOrder["disc"] ?? maxOrder;
          }
          if (technicalCompleted.has(candidateId) && (stageOrder["fit_tecnico"] ?? -1) > maxOrder) {
            maxStage = "fit_tecnico";
            maxOrder = stageOrder["fit_tecnico"] ?? maxOrder;
          }
        }

        statusCounts[maxStage] = (statusCounts[maxStage] || 0) + 1;
      }

      // Calcular métricas por estágio
      const stages: FunnelStageMetrics[] = [];
      let previousCount = totalCandidates;

      for (let i = 0; i < stagesConfig.length; i++) {
        const stage = stagesConfig[i];
        
        // Contar candidatos que chegaram a esta etapa ou além
        const stagesAtOrBeyond = stagesConfig.slice(i);
        const countAtOrBeyond = stagesAtOrBeyond.reduce(
          (sum, s) => sum + (statusCounts[s.id] || 0),
          0
        );

        const percentage = totalCandidates > 0
          ? Math.round((countAtOrBeyond / totalCandidates) * 100)
          : 0;

        const conversionRate = i === 0
          ? null
          : previousCount > 0
            ? Math.round((countAtOrBeyond / previousCount) * 100)
            : 0;

        const dropOffCount = previousCount - countAtOrBeyond;
        const dropOffRate = previousCount > 0
          ? Math.round((dropOffCount / previousCount) * 100)
          : 0;

        const isBottleneck = conversionRate !== null && conversionRate < 60;
        const bottleneckSeverity = conversionRate !== null
          ? getBottleneckSeverity(conversionRate)
          : "healthy";

        stages.push({
          id: stage.id,
          name: stage.name,
          count: countAtOrBeyond,
          percentage,
          conversionRate,
          dropOffRate: i === 0 ? 0 : dropOffRate,
          dropOffCount: i === 0 ? 0 : dropOffCount,
          avgTimeInStage: null, // Será calculado abaixo se tivermos histórico
          isBottleneck,
          bottleneckSeverity,
          color: stage.color,
        });

        previousCount = countAtOrBeyond;
      }

      // Encontrar o principal gargalo
      let mainBottleneck: string | null = null;
      let lowestRate = 100;
      for (const stage of stages) {
        if (
          stage.conversionRate !== null &&
          stage.conversionRate < lowestRate &&
          stage.bottleneckSeverity !== "healthy"
        ) {
          lowestRate = stage.conversionRate;
          mainBottleneck = stage.name;
        }
      }

      // Calcular tempo até contratação
      const hiredApps = filteredApps.filter((app) => 
        normalizeStatus(app.status || "") === "hired"
      );

      let avgTimeToHire: number | null = null;
      let fastestHire: number | null = null;
      let slowestHire: number | null = null;

      if (hiredApps.length > 0) {
        const times = hiredApps.map((app) => {
          const applied = new Date(app.applied_at);
          const hired = new Date(app.updated_at);
          return differenceInDays(hired, applied);
        });

        avgTimeToHire = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        fastestHire = Math.min(...times);
        slowestHire = Math.max(...times);
      }

      const totalHired = statusCounts["hired"] || 0;
      const overallConversionRate = totalCandidates > 0
        ? Math.round((totalHired / totalCandidates) * 100)
        : 0;

      return {
        stages,
        totalCandidates,
        totalHired,
        totalRejected: rejectedCount.count,
        overallConversionRate,
        avgTimeToHire,
        fastestHire,
        slowestHire,
        mainBottleneck,
        jobInfo: jobId && jobs?.[0] ? {
          id: jobs[0].id,
          title: jobs[0].title,
          department: jobs[0].department,
        } : undefined,
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyMetrics(jobInfo?: JobFunnelMetrics["jobInfo"]): JobFunnelMetrics {
  return {
    stages: DEFAULT_STAGES.map((stage, i) => ({
      id: stage.id,
      name: stage.name,
      count: 0,
      percentage: 0,
      conversionRate: i === 0 ? null : 0,
      dropOffRate: 0,
      dropOffCount: 0,
      avgTimeInStage: null,
      isBottleneck: false,
      bottleneckSeverity: "healthy" as const,
      color: stage.color,
    })),
    totalCandidates: 0,
    totalHired: 0,
    totalRejected: 0,
    overallConversionRate: 0,
    avgTimeToHire: null,
    fastestHire: null,
    slowestHire: null,
    mainBottleneck: null,
    jobInfo,
  };
}
