import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, parseISO } from "date-fns";
import type { OffboardingCaseWithTasks, OffboardingTerminationType } from "@/types/offboarding.types";
import { formatBRT } from "@/lib/datetime";

const DASHBOARD_KEY = "offboarding-dashboard";
const MINIMUM_SAMPLE_SIZE = 5; // Privacy rule

interface DashboardMetrics {
  // General metrics
  totalCases: number;
  activeCases: number;
  completedCases: number;
  cancelledCases: number;
  
  // Task metrics
  overdueTasksCount: number;
  checklistCompletionRate: number;
  
  // Survey metrics (only shown if sample >= 5)
  hasEnoughSamples: boolean;
  avgAvoidability: number | null;
  avgEnps: number | null;
  enpsScore: number | null; // Calculated NPS
  avgLeadership: number | null;
  avgGrowth: number | null;
  avgWorkload: number | null;
  avgCompensation: number | null;
  surveyResponseRate: number;
  
  // Top reasons
  topExitReasons: Array<{ reason: string; count: number; percentage: number }>;
  
  // Trend data
  monthlyTrend: Array<{ month: string; count: number }>;
  
  // Distribution data
  terminationDistribution: Array<{ name: string; value: number; color: string }>;
  
  // Department data
  departments: string[];
  departmentBreakdown: Array<{ department: string; count: number; percentage: number }>;
  
  // Percentages
  voluntaryPercentage: number;
  involuntaryPercentage: number;
}

export const useOffboardingDashboard = (accountId?: string, dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: [DASHBOARD_KEY, accountId, dateRange],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Fetch cases with tasks
      let casesQuery = supabase
        .from("offboarding_cases")
        .select(`
          *,
          offboarding_tasks (id, status, due_date)
        `);

      if (dateRange) {
        casesQuery = casesQuery
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end);
      }

      const { data: cases, error: casesError } = await casesQuery;
      if (casesError) throw casesError;

      const typedCases = (cases || []) as unknown as OffboardingCaseWithTasks[];

      // Calculate general metrics
      const totalCases = typedCases.length;
      const activeCases = typedCases.filter(c => c.status === "active").length;
      const completedCases = typedCases.filter(c => c.status === "completed").length;
      const cancelledCases = typedCases.filter(c => c.status === "cancelled").length;

      // Calculate overdue tasks
      const today = new Date().toISOString().split('T')[0];
      let overdueTasksCount = 0;
      let totalTasks = 0;
      let completedTasks = 0;

      typedCases.forEach(c => {
        c.offboarding_tasks?.forEach(t => {
          totalTasks++;
          if (t.status === "completed" || t.status === "skipped" || t.status === "waived") {
            completedTasks++;
          }
          if (t.status === "pending" && t.due_date && t.due_date < today) {
            overdueTasksCount++;
          }
        });
      });

      const checklistCompletionRate = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

      // Calculate termination type distribution
      const voluntaryCount = typedCases.filter(c => c.termination_type === "voluntary").length;
      const involuntaryCount = typedCases.filter(c => c.termination_type === "involuntary").length;
      const contractEndCount = typedCases.filter(c => c.termination_type === "contract_end").length;
      
      const voluntaryPercentage = totalCases > 0 ? Math.round((voluntaryCount / totalCases) * 100) : 0;
      const involuntaryPercentage = totalCases > 0 ? Math.round((involuntaryCount / totalCases) * 100) : 0;

      const terminationDistribution = [
        { name: "Voluntário", value: voluntaryCount, color: "hsl(217, 91%, 60%)" },
        { name: "Involuntário", value: involuntaryCount, color: "hsl(0, 84%, 60%)" },
        { name: "Término de Contrato", value: contractEndCount, color: "hsl(0, 0%, 45%)" },
      ].filter(item => item.value > 0);

      // Calculate monthly trend (last 6 months)
      const monthlyTrend: Array<{ month: string; count: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStr = formatBRT(monthDate, "MMM");
        const monthStart = formatBRT(monthDate, "yyyy-MM-01");
        const monthEnd = formatBRT(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), "yyyy-MM-dd");
        
        const count = typedCases.filter(c => {
          const createdAt = c.created_at?.split('T')[0];
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length;
        
        monthlyTrend.push({ month: monthStr, count });
      }

      // Calculate department breakdown
      const deptCounts = new Map<string, number>();
      typedCases.forEach(c => {
        const dept = c.department || "Não informado";
        deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
      });
      
      const departmentBreakdown = Array.from(deptCounts.entries())
        .map(([department, count]) => ({
          department,
          count,
          percentage: totalCases > 0 ? Math.round((count / totalCases) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const departments = departmentBreakdown.map(d => d.department);

      // Fetch survey responses
      let responsesQuery = supabase
        .from("offboarding_survey_responses")
        .select("*");

      if (dateRange) {
        responsesQuery = responsesQuery
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end);
      }

      const { data: responses, error: responsesError } = await responsesQuery;
      if (responsesError) throw responsesError;

      const surveyResponses = responses || [];
      const hasEnoughSamples = surveyResponses.length >= MINIMUM_SAMPLE_SIZE;
      
      // Survey response rate
      const casesWithSurvey = typedCases.filter(c => c.survey_status === "responded").length;
      const surveyResponseRate = totalCases > 0 ? Math.round((casesWithSurvey / totalCases) * 100) : 0;

      // Calculate averages only if we have enough samples
      let avgAvoidability: number | null = null;
      let avgEnps: number | null = null;
      let enpsScore: number | null = null;
      let avgLeadership: number | null = null;
      let avgGrowth: number | null = null;
      let avgWorkload: number | null = null;
      let avgCompensation: number | null = null;
      let topExitReasons: Array<{ reason: string; count: number; percentage: number }> = [];

      if (hasEnoughSamples) {
        // Calculate averages
        const avoidabilityScores = surveyResponses
          .map(r => r.avoidability_score)
          .filter((s): s is number => s !== null);
        avgAvoidability = avoidabilityScores.length > 0
          ? Math.round((avoidabilityScores.reduce((a, b) => a + b, 0) / avoidabilityScores.length) * 10) / 10
          : null;

        const enpsScores = surveyResponses
          .map(r => r.enps_score)
          .filter((s): s is number => s !== null);
        avgEnps = enpsScores.length > 0
          ? Math.round((enpsScores.reduce((a, b) => a + b, 0) / enpsScores.length) * 10) / 10
          : null;

        // Calculate NPS score (-100 to 100)
        if (enpsScores.length > 0) {
          const promoters = enpsScores.filter(s => s >= 9).length;
          const detractors = enpsScores.filter(s => s <= 6).length;
          enpsScore = Math.round(((promoters - detractors) / enpsScores.length) * 100);
        }

        const leadershipRatings = surveyResponses
          .map(r => r.leadership_rating)
          .filter((s): s is number => s !== null);
        avgLeadership = leadershipRatings.length > 0
          ? Math.round((leadershipRatings.reduce((a, b) => a + b, 0) / leadershipRatings.length) * 10) / 10
          : null;

        const growthRatings = surveyResponses
          .map(r => r.growth_rating)
          .filter((s): s is number => s !== null);
        avgGrowth = growthRatings.length > 0
          ? Math.round((growthRatings.reduce((a, b) => a + b, 0) / growthRatings.length) * 10) / 10
          : null;

        const workloadRatings = surveyResponses
          .map(r => r.workload_rating)
          .filter((s): s is number => s !== null);
        avgWorkload = workloadRatings.length > 0
          ? Math.round((workloadRatings.reduce((a, b) => a + b, 0) / workloadRatings.length) * 10) / 10
          : null;

        const compensationRatings = surveyResponses
          .map(r => r.compensation_rating)
          .filter((s): s is number => s !== null);
        avgCompensation = compensationRatings.length > 0
          ? Math.round((compensationRatings.reduce((a, b) => a + b, 0) / compensationRatings.length) * 10) / 10
          : null;

        // Calculate top exit reasons
        const reasonCounts = new Map<string, number>();
        surveyResponses.forEach(r => {
          if (r.primary_reason) {
            reasonCounts.set(r.primary_reason, (reasonCounts.get(r.primary_reason) || 0) + 1);
          }
        });

        topExitReasons = Array.from(reasonCounts.entries())
          .map(([reason, count]) => ({
            reason,
            count,
            percentage: Math.round((count / surveyResponses.length) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }

      return {
        totalCases,
        activeCases,
        completedCases,
        cancelledCases,
        overdueTasksCount,
        checklistCompletionRate,
        hasEnoughSamples,
        avgAvoidability,
        avgEnps,
        enpsScore,
        avgLeadership,
        avgGrowth,
        avgWorkload,
        avgCompensation,
        surveyResponseRate,
        topExitReasons,
        monthlyTrend,
        terminationDistribution,
        departments,
        departmentBreakdown,
        voluntaryPercentage,
        involuntaryPercentage,
      };
    },
    enabled: true,
  });
};
