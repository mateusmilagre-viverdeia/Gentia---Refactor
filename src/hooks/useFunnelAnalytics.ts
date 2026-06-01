import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay, differenceInDays } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";

export interface FunnelStageData {
  id: string;
  name: string;
  count: number;
  percentage: number;
  conversionRate: number | null;
  color: string;
}

export interface FunnelAnalytics {
  stages: FunnelStageData[];
  overallConversionRate: number;
  rejectionRate: number;
  totalApplicants: number;
  totalHired: number;
  totalRejected: number;
  averageTimeToHire: number | null;
  bottleneck: string | null;
}

// Pipeline padronizado do recrutamento
const STAGE_CONFIG = [
  { id: "applied", name: "Aplicado", color: "hsl(217, 91%, 60%)" },
  { id: "fit_cultural", name: "Fit Cultural", color: "hsl(271, 91%, 65%)" },
  { id: "disc", name: "DISC", color: "hsl(260, 80%, 55%)" },
  { id: "fit_tecnico", name: "Fit Técnico", color: "hsl(200, 85%, 50%)" },
  { id: "avaliacao_final", name: "Avaliação Final", color: "hsl(38, 92%, 50%)" },
  { id: "referencias", name: "Referências", color: "hsl(170, 75%, 45%)" },
  { id: "proposta", name: "Proposta", color: "hsl(160, 84%, 39%)" },
  { id: "hired", name: "Contratado", color: "hsl(142, 76%, 36%)" },
];

// Mapeamento de status legados para o novo pipeline
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
};

export function useFunnelAnalytics(period: DashboardPeriod = "30d") {
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
    queryKey: ["funnel-analytics", currentAccount?.id, period],
    queryFn: async (): Promise<FunnelAnalytics> => {
      if (!currentAccount?.id) {
        return getEmptyAnalytics();
      }

      // Fetch all jobs for this account
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", currentAccount.id);

      if (jobsError) throw jobsError;

      const jobIds = jobs?.map(j => j.id) || [];

      if (jobIds.length === 0) {
        return getEmptyAnalytics();
      }

      // Fetch applications with status
      const { data: applications, error: applicationsError } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at")
        .in("job_id", jobIds);

      if (applicationsError) throw applicationsError;

      const allApplications = applications || [];
      
      // Filter by period if needed
      const filteredApplications = allApplications.filter(app => 
        new Date(app.applied_at) >= startDate
      );

      // Count by status
      const statusCounts: Record<string, number> = {};
      for (const stage of STAGE_CONFIG) {
        statusCounts[stage.id] = 0;
      }
      statusCounts["rejected"] = 0;

      for (const app of filteredApplications) {
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

      const totalApplicants = filteredApplications.length;
      const totalHired = statusCounts["hired"];
      const totalRejected = statusCounts["rejected"];

      // Calculate funnel stages with conversion rates
      const stages: FunnelStageData[] = [];
      let previousCount = totalApplicants;

      for (let i = 0; i < STAGE_CONFIG.length; i++) {
        const stage = STAGE_CONFIG[i];
        
        // Count all candidates that reached this stage or beyond
        const countAtOrBeyond = STAGE_CONFIG.slice(i).reduce(
          (sum, s) => sum + (statusCounts[s.id] || 0),
          0
        );
        
        const percentage = totalApplicants > 0 
          ? Math.round((countAtOrBeyond / totalApplicants) * 100) 
          : 0;
        
        const conversionRate = i === 0 
          ? null 
          : previousCount > 0 
            ? Math.round((countAtOrBeyond / previousCount) * 100) 
            : 0;

        stages.push({
          id: stage.id,
          name: stage.name,
          count: countAtOrBeyond,
          percentage,
          conversionRate,
          color: stage.color,
        });

        previousCount = countAtOrBeyond;
      }

      // Calculate overall metrics
      const overallConversionRate = totalApplicants > 0 
        ? Math.round((totalHired / totalApplicants) * 100) 
        : 0;

      const rejectionRate = totalApplicants > 0 
        ? Math.round((totalRejected / totalApplicants) * 100) 
        : 0;

      // Find bottleneck (stage with lowest conversion rate)
      let bottleneck: string | null = null;
      let lowestRate = 100;
      
      for (const stage of stages) {
        if (stage.conversionRate !== null && stage.conversionRate < lowestRate && stage.conversionRate > 0) {
          lowestRate = stage.conversionRate;
          bottleneck = stage.name;
        }
      }

      // Calculate average time to hire (from hired applications)
      let averageTimeToHire: number | null = null;
      const hiredApps = filteredApplications.filter(app => app.status === "hired");
      
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          const appliedDate = new Date(app.applied_at);
          const hiredDate = new Date(app.updated_at);
          return sum + differenceInDays(hiredDate, appliedDate);
        }, 0);
        averageTimeToHire = Math.round(totalDays / hiredApps.length);
      }

      return {
        stages,
        overallConversionRate,
        rejectionRate,
        totalApplicants,
        totalHired,
        totalRejected,
        averageTimeToHire,
        bottleneck,
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyAnalytics(): FunnelAnalytics {
  return {
    stages: STAGE_CONFIG.map((stage, i) => ({
      id: stage.id,
      name: stage.name,
      count: 0,
      percentage: 0,
      conversionRate: i === 0 ? null : 0,
      color: stage.color,
    })),
    overallConversionRate: 0,
    rejectionRate: 0,
    totalApplicants: 0,
    totalHired: 0,
    totalRejected: 0,
    averageTimeToHire: null,
    bottleneck: null,
  };
}
