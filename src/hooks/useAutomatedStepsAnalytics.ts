import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { subDays } from "date-fns";

export interface AutomatedStepMetrics {
  stepType: "cultural" | "disc" | "technical";
  label: string;
  totalSessions: number;
  completed: number;
  approved: number;
  rejected: number;
  pending: number;
  avgScore: number;
  avgThreshold: number;
  conversionRate: number;
  passRate: number;
  scoreDistribution: { range: string; count: number }[];
}

export interface AutomatedFunnelAnalytics {
  steps: AutomatedStepMetrics[];
  overallConversion: number;
  totalCandidates: number;
  bottleneck: string | null;
  trendData: { week: string; cultural: number; disc: number; technical: number }[];
}

function getDateRange(period: DashboardPeriod) {
  const now = new Date();
  const days = period === "7d" ? 7 : 30;
  return {
    start: subDays(now, days).toISOString(),
    end: now.toISOString(),
  };
}

function calculateScoreDistribution(scores: number[]): { range: string; count: number }[] {
  const ranges = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ];

  scores.forEach((score) => {
    const range = ranges.find((r) => score >= r.min && score <= r.max);
    if (range) range.count++;
  });

  return ranges.map(({ range, count }) => ({ range, count }));
}

export function useAutomatedStepsAnalytics(period: DashboardPeriod) {
  const { account } = useAccount();
  const accountId = account?.id;
  const { start, end } = getDateRange(period);

  return useQuery({
    queryKey: ["automated-steps-analytics", accountId, period],
    queryFn: async (): Promise<AutomatedFunnelAnalytics> => {
      if (!accountId) {
        return { steps: [], overallConversion: 0, totalCandidates: 0, bottleneck: null, trendData: [] };
      }

      // Fetch Cultural sessions
      const { data: culturalSessions } = await supabase
        .from("culture_interview_sessions")
        .select("id, status, matching_score, created_at")
        .eq("account_id", accountId)
        .gte("created_at", start)
        .lte("created_at", end);

      // Fetch Technical sessions
      const { data: technicalSessions } = await supabase
        .from("technical_interview_sessions")
        .select("id, status, overall_score, created_at")
        .eq("account_id", accountId)
        .gte("created_at", start)
        .lte("created_at", end);

      // Fetch DISC results via culture sessions
      const { data: discResults } = await supabase
        .from("candidate_disc_results")
        .select("id, match_score, created_at, session_id")
        .gte("created_at", start)
        .lte("created_at", end);

      // Fetch average thresholds from workflow steps
      const { data: workflowSteps } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("step_type, threshold_config")
        .eq("account_id", accountId)
        .eq("is_active", true);

      // Calculate average thresholds per step type
      const thresholds: Record<string, number[]> = { cultural: [], disc: [], technical: [] };
      workflowSteps?.forEach((step) => {
        const config = step.threshold_config as { min_score?: number; min_match?: number } | null;
        if (step.step_type === "disc" && config?.min_match) {
          thresholds.disc.push(config.min_match);
        } else if (config?.min_score) {
          thresholds[step.step_type]?.push(config.min_score);
        }
      });

      const avgThreshold = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 70);

      // Process Cultural
      const culturalScores = (culturalSessions || [])
        .filter((s) => s.status === "completed" && s.matching_score != null)
        .map((s) => s.matching_score as number);
      
      const culturalThreshold = avgThreshold(thresholds.cultural);
      const culturalApproved = culturalScores.filter((s) => s >= culturalThreshold).length;
      const culturalCompleted = culturalScores.length;
      const culturalPending = (culturalSessions || []).filter((s) => s.status !== "completed").length;

      const culturalMetrics: AutomatedStepMetrics = {
        stepType: "cultural",
        label: "Fit Cultural",
        totalSessions: culturalSessions?.length || 0,
        completed: culturalCompleted,
        approved: culturalApproved,
        rejected: culturalCompleted - culturalApproved,
        pending: culturalPending,
        avgScore: culturalScores.length > 0 ? culturalScores.reduce((a, b) => a + b, 0) / culturalScores.length : 0,
        avgThreshold: culturalThreshold,
        conversionRate: culturalCompleted > 0 ? (culturalApproved / culturalCompleted) * 100 : 0,
        passRate: culturalCompleted > 0 ? (culturalApproved / culturalCompleted) * 100 : 0,
        scoreDistribution: calculateScoreDistribution(culturalScores),
      };

      // Process DISC
      const discScores = (discResults || [])
        .filter((d) => d.match_score != null)
        .map((d) => d.match_score as number);
      
      const discThreshold = avgThreshold(thresholds.disc);
      const discApproved = discScores.filter((s) => s >= discThreshold).length;
      const discCompleted = discScores.length;

      const discMetrics: AutomatedStepMetrics = {
        stepType: "disc",
        label: "DISC",
        totalSessions: discResults?.length || 0,
        completed: discCompleted,
        approved: discApproved,
        rejected: discCompleted - discApproved,
        pending: 0,
        avgScore: discScores.length > 0 ? discScores.reduce((a, b) => a + b, 0) / discScores.length : 0,
        avgThreshold: discThreshold,
        conversionRate: discCompleted > 0 ? (discApproved / discCompleted) * 100 : 0,
        passRate: discCompleted > 0 ? (discApproved / discCompleted) * 100 : 0,
        scoreDistribution: calculateScoreDistribution(discScores),
      };

      // Process Technical
      const technicalScores = (technicalSessions || [])
        .filter((s) => s.status === "completed" && s.overall_score != null)
        .map((s) => s.overall_score as number);
      
      const technicalThreshold = avgThreshold(thresholds.technical);
      const technicalApproved = technicalScores.filter((s) => s >= technicalThreshold).length;
      const technicalCompleted = technicalScores.length;
      const technicalPending = (technicalSessions || []).filter((s) => s.status !== "completed").length;

      const technicalMetrics: AutomatedStepMetrics = {
        stepType: "technical",
        label: "Fit Técnico",
        totalSessions: technicalSessions?.length || 0,
        completed: technicalCompleted,
        approved: technicalApproved,
        rejected: technicalCompleted - technicalApproved,
        pending: technicalPending,
        avgScore: technicalScores.length > 0 ? technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length : 0,
        avgThreshold: technicalThreshold,
        conversionRate: technicalCompleted > 0 ? (technicalApproved / technicalCompleted) * 100 : 0,
        passRate: technicalCompleted > 0 ? (technicalApproved / technicalCompleted) * 100 : 0,
        scoreDistribution: calculateScoreDistribution(technicalScores),
      };

      const steps = [culturalMetrics, discMetrics, technicalMetrics];

      // Find bottleneck (lowest conversion rate)
      const completedSteps = steps.filter((s) => s.completed > 0);
      const bottleneck = completedSteps.length > 0
        ? completedSteps.reduce((a, b) => (a.conversionRate < b.conversionRate ? a : b)).label
        : null;

      // Calculate overall conversion
      const totalCandidates = culturalMetrics.totalSessions;
      const finalApproved = technicalMetrics.approved;
      const overallConversion = totalCandidates > 0 ? (finalApproved / totalCandidates) * 100 : 0;

      // Generate trend data (weekly)
      const weeks = period === "7d" ? 1 : 4;
      const trendData: { week: string; cultural: number; disc: number; technical: number }[] = [];
      
      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = subDays(new Date(), (i + 1) * 7);
        const weekEnd = subDays(new Date(), i * 7);
        const weekLabel = `Sem ${weeks - i}`;

        const weekCultural = (culturalSessions || []).filter((s) => {
          const date = new Date(s.created_at);
          return date >= weekStart && date < weekEnd && s.status === "completed";
        });
        const weekDisc = (discResults || []).filter((d) => {
          const date = new Date(d.created_at);
          return date >= weekStart && date < weekEnd;
        });
        const weekTechnical = (technicalSessions || []).filter((s) => {
          const date = new Date(s.created_at);
          return date >= weekStart && date < weekEnd && s.status === "completed";
        });

        const culturalApprovedWeek = weekCultural.filter((s) => (s.matching_score || 0) >= culturalThreshold).length;
        const discApprovedWeek = weekDisc.filter((d) => (d.match_score || 0) >= discThreshold).length;
        const technicalApprovedWeek = weekTechnical.filter((s) => (s.overall_score || 0) >= technicalThreshold).length;

        trendData.push({
          week: weekLabel,
          cultural: weekCultural.length > 0 ? (culturalApprovedWeek / weekCultural.length) * 100 : 0,
          disc: weekDisc.length > 0 ? (discApprovedWeek / weekDisc.length) * 100 : 0,
          technical: weekTechnical.length > 0 ? (technicalApprovedWeek / weekTechnical.length) * 100 : 0,
        });
      }

      return {
        steps,
        overallConversion,
        totalCandidates,
        bottleneck,
        trendData,
      };
    },
    enabled: !!accountId,
  });
}
