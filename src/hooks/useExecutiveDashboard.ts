import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { startOfMonth, subMonths, differenceInDays } from "date-fns";
import { formatBRT } from "@/lib/datetime";

export interface MonthlyData {
  month: string;
  monthLabel: string;
  applications: number;
  hired: number;
  rejected: number;
  openJobs: number;
  avgTimeToHire: number | null;
}

export interface Projection {
  metric: string;
  metricLabel: string;
  currentValue: number;
  projectedValue: number;
  projectedRange: { min: number; max: number };
  confidence: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
}

export interface TopJob {
  id: string;
  title: string;
  hired: number;
  applications: number;
  conversionRate: number;
  avgTimeToHire: number | null;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
}

export interface ExecutiveDashboardData {
  kpis: {
    totalHires: number;
    totalHiresPreviousPeriod: number;
    avgTimeToHire: number;
    avgTimeToHirePrevious: number;
    fillRate: number;
    fillRatePrevious: number;
    pipelineHealth: number;
    activeJobs: number;
    candidatesInPipeline: number;
  };
  monthlyComparison: MonthlyData[];
  projections: Projection[];
  jobsByStatus: {
    active: number;
    paused: number;
    closed: number;
    draft: number;
  };
  topJobs: TopJob[];
  alerts: Alert[];
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function calculateProjection(
  metric: string,
  metricLabel: string,
  monthlyData: MonthlyData[],
  valueExtractor: (m: MonthlyData) => number
): Projection {
  const recentMonths = monthlyData.slice(-3);
  if (recentMonths.length < 2) {
    return {
      metric,
      metricLabel,
      currentValue: recentMonths.length > 0 ? valueExtractor(recentMonths[recentMonths.length - 1]) : 0,
      projectedValue: 0,
      projectedRange: { min: 0, max: 0 },
      confidence: 'low',
      trend: 'stable',
    };
  }

  const values = recentMonths.map(valueExtractor);
  const weights = [0.5, 0.3, 0.2].slice(0, values.length);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  const weightedSum = values.reverse().reduce((sum, val, i) => {
    return sum + (val * (weights[i] || 0));
  }, 0) / totalWeight;

  const currentValue = valueExtractor(recentMonths[recentMonths.length - 1]);
  const previousValue = valueExtractor(recentMonths[0]);
  
  const trend = currentValue > previousValue * 1.05 
    ? 'up' 
    : currentValue < previousValue * 0.95 
      ? 'down' 
      : 'stable';

  const variance = calculateVariance(values);
  const confidence = variance < 2 ? 'high' : variance < 5 ? 'medium' : 'low';

  const projectedValue = Math.round(weightedSum * (trend === 'up' ? 1.1 : trend === 'down' ? 0.9 : 1));
  const margin = Math.max(1, Math.round(projectedValue * 0.15));

  return {
    metric,
    metricLabel,
    currentValue,
    projectedValue,
    projectedRange: { 
      min: Math.max(0, projectedValue - margin), 
      max: projectedValue + margin 
    },
    confidence,
    trend,
  };
}

export function useExecutiveDashboard(monthsToShow: number = 6) {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["executive-dashboard", currentAccount?.id, monthsToShow],
    queryFn: async (): Promise<ExecutiveDashboardData> => {
      if (!currentAccount?.id) throw new Error("No account");

      const now = new Date();
      const startDate = startOfMonth(subMonths(now, monthsToShow - 1));

      // Fetch all jobs
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status, created_at")
        .eq("account_id", currentAccount.id);

      const jobIds = jobs?.map(j => j.id) || [];

      // Fetch all applications
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, updated_at, job_id")
        .in("job_id", jobIds.length > 0 ? jobIds : ['no-jobs']);

      // Calculate job status counts
      const jobsByStatus = {
        active: jobs?.filter(j => j.status === 'published').length || 0,
        paused: jobs?.filter(j => j.status === 'paused').length || 0,
        closed: jobs?.filter(j => j.status === 'closed').length || 0,
        draft: jobs?.filter(j => j.status === 'draft').length || 0,
      };

      // Calculate monthly data
      const monthlyData: MonthlyData[] = [];
      for (let i = 0; i < monthsToShow; i++) {
        const monthStart = startOfMonth(subMonths(now, monthsToShow - 1 - i));
        const monthEnd = startOfMonth(subMonths(now, monthsToShow - 2 - i));
        const monthKey = formatBRT(monthStart, "yyyy-MM");
        const monthLabel = formatBRT(monthStart, "MMM");

        const monthApplications = applications?.filter(a => {
          const appliedDate = new Date(a.applied_at);
          return appliedDate >= monthStart && appliedDate < (i === monthsToShow - 1 ? new Date() : monthEnd);
        }) || [];

        const hired = monthApplications.filter(a => a.status === 'hired');
        const rejected = monthApplications.filter(a => a.status === 'rejected');

        // Calculate avg time to hire for this month
        let avgTimeToHire: number | null = null;
        if (hired.length > 0) {
          const times = hired.map(a => {
            const applied = new Date(a.applied_at);
            const updated = new Date(a.updated_at);
            return differenceInDays(updated, applied);
          }).filter(t => t >= 0);
          if (times.length > 0) {
            avgTimeToHire = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          }
        }

        const openJobsInMonth = jobs?.filter(j => {
          const created = new Date(j.created_at);
          return created <= monthEnd && (j.status === 'published' || j.status === 'paused');
        }).length || 0;

        monthlyData.push({
          month: monthKey,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          applications: monthApplications.length,
          hired: hired.length,
          rejected: rejected.length,
          openJobs: openJobsInMonth,
          avgTimeToHire,
        });
      }

      // Calculate KPIs
      const totalHires = applications?.filter(a => a.status === 'hired').length || 0;
      const threeMonthsAgo = subMonths(now, 3);
      const previousHires = applications?.filter(a => {
        const date = new Date(a.applied_at);
        return a.status === 'hired' && date < threeMonthsAgo;
      }).length || 0;

      // Average time to hire
      const hiredApps = applications?.filter(a => a.status === 'hired') || [];
      let avgTimeToHire = 0;
      if (hiredApps.length > 0) {
        const times = hiredApps.map(a => {
          const applied = new Date(a.applied_at);
          const updated = new Date(a.updated_at);
          return differenceInDays(updated, applied);
        }).filter(t => t >= 0 && t < 365);
        if (times.length > 0) {
          avgTimeToHire = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
      }

      // Fill rate
      const totalJobsWithHires = new Set(hiredApps.map(a => a.job_id)).size;
      const totalClosedJobs = jobs?.filter(j => j.status === 'closed').length || 0;
      const fillRate = totalClosedJobs > 0 ? Math.round((totalJobsWithHires / totalClosedJobs) * 100) : 0;

      // Pipeline health (score 0-100)
      const activeApplications = applications?.filter(a => 
        !['hired', 'rejected', 'withdrawn'].includes(a.status)
      ).length || 0;
      const recentApplications = applications?.filter(a => {
        const date = new Date(a.applied_at);
        return date >= subMonths(now, 1);
      }).length || 0;
      const pipelineHealth = Math.min(100, Math.round(
        (recentApplications > 0 ? 40 : 0) + 
        (activeApplications > 5 ? 30 : activeApplications * 6) +
        (jobsByStatus.active > 0 ? 30 : 0)
      ));

      // Candidates in pipeline
      const candidatesInPipeline = activeApplications;

      // Projections
      const projections: Projection[] = [
        calculateProjection('hired', 'Contratações', monthlyData, m => m.hired),
        calculateProjection('timeToHire', 'Tempo de Contratação (dias)', monthlyData, m => m.avgTimeToHire || 0),
        calculateProjection('applications', 'Aplicações', monthlyData, m => m.applications),
      ];

      // Top jobs
      const jobStats = new Map<string, { title: string; hired: number; applications: number; times: number[] }>();
      jobs?.forEach(job => {
        jobStats.set(job.id, { title: job.title, hired: 0, applications: 0, times: [] });
      });
      applications?.forEach(app => {
        const stat = jobStats.get(app.job_id);
        if (stat) {
          stat.applications++;
          if (app.status === 'hired') {
            stat.hired++;
            const days = differenceInDays(new Date(app.updated_at), new Date(app.applied_at));
            if (days >= 0 && days < 365) stat.times.push(days);
          }
        }
      });

      const topJobs: TopJob[] = Array.from(jobStats.entries())
        .map(([id, stat]) => ({
          id,
          title: stat.title,
          hired: stat.hired,
          applications: stat.applications,
          conversionRate: stat.applications > 0 ? Math.round((stat.hired / stat.applications) * 1000) / 10 : 0,
          avgTimeToHire: stat.times.length > 0 
            ? Math.round(stat.times.reduce((a, b) => a + b, 0) / stat.times.length)
            : null,
        }))
        .filter(j => j.applications > 0)
        .sort((a, b) => b.hired - a.hired)
        .slice(0, 5);

      // Alerts
      const alerts: Alert[] = [];
      
      const stagnantJobs = jobs?.filter(j => {
        if (j.status !== 'published') return false;
        const created = new Date(j.created_at);
        return differenceInDays(now, created) > 7;
      }).length || 0;
      
      if (stagnantJobs > 0) {
        alerts.push({
          id: 'stagnant-jobs',
          type: 'warning',
          message: `${stagnantJobs} vaga${stagnantJobs > 1 ? 's' : ''} sem movimentação há mais de 7 dias`,
        });
      }

      const recentMonthHires = monthlyData.slice(-1)[0]?.hired || 0;
      const previousMonthHires = monthlyData.slice(-2, -1)[0]?.hired || 0;
      if (recentMonthHires > previousMonthHires * 1.2) {
        alerts.push({
          id: 'hires-up',
          type: 'success',
          message: `Contratações aumentaram ${Math.round((recentMonthHires / previousMonthHires - 1) * 100)}% este mês`,
        });
      }

      if (avgTimeToHire > 0 && avgTimeToHire < 20) {
        alerts.push({
          id: 'fast-hiring',
          type: 'info',
          message: `Tempo médio de contratação (${avgTimeToHire} dias) está abaixo da média do mercado`,
        });
      }

      if (fillRate >= 80) {
        alerts.push({
          id: 'high-fill-rate',
          type: 'success',
          message: `Taxa de preenchimento de ${fillRate}% - excelente performance!`,
        });
      }

      return {
        kpis: {
          totalHires,
          totalHiresPreviousPeriod: previousHires,
          avgTimeToHire,
          avgTimeToHirePrevious: 0,
          fillRate,
          fillRatePrevious: 0,
          pipelineHealth,
          activeJobs: jobsByStatus.active,
          candidatesInPipeline,
        },
        monthlyComparison: monthlyData,
        projections,
        jobsByStatus,
        topJobs,
        alerts,
      };
    },
    enabled: !!currentAccount?.id,
  });
}
