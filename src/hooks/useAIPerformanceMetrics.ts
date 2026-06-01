import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays, startOfDay, eachDayOfInterval } from "date-fns";
import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { formatBRT } from "@/lib/datetime";

export interface AIModelMetrics {
  model: string;
  totalCalls: number;
  avgResponseTime: number;
  successRate: number;
  errorCount: number;
  estimatedCost: number;
}

export interface AIUsageDataPoint {
  date: string;
  dateLabel: string;
  calls: number;
  avgTime: number;
  errors: number;
}

export interface AIOperationBreakdown {
  operation: string;
  count: number;
  avgTime: number;
  successRate: number;
  icon: string;
}

export interface AIPerformanceData {
  totalCalls: number;
  avgResponseTime: number;
  successRate: number;
  totalErrors: number;
  estimatedMonthlyCost: number;
  usageOverTime: AIUsageDataPoint[];
  modelBreakdown: AIModelMetrics[];
  operationBreakdown: AIOperationBreakdown[];
  recentErrors: AIErrorLog[];
  trends: {
    callsChange: number;
    responseTimeChange: number;
    successRateChange: number;
  };
}

export interface AIErrorLog {
  id: string;
  timestamp: string;
  operation: string;
  model: string;
  errorType: string;
  errorMessage: string;
  resolved: boolean;
}

function getPeriodDays(period: DashboardPeriod): number {
  const mapping: Record<DashboardPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
  };
  return mapping[period];
}

const OPERATION_ICONS: Record<string, string> = {
  scoring: "Target",
  discovery: "Search",
  "icp-generation": "Brain",
  screening: "FileSearch",
};

const OPERATION_LABELS: Record<string, string> = {
  scoring: "Scoring de Candidatos",
  discovery: "Busca/Discovery",
  "icp-generation": "Geração de ICP",
  screening: "Triagem de CV",
};

export function useAIPerformanceMetrics(period: DashboardPeriod = "7d") {
  const { currentAccount } = useOrganization();
  const days = getPeriodDays(period);

  return useQuery({
    queryKey: ["ai-performance-metrics", currentAccount?.id, period],
    queryFn: async (): Promise<AIPerformanceData> => {
      if (!currentAccount?.id) {
        return getEmptyMetrics();
      }

      const endDate = new Date();
      const startDate = startOfDay(subDays(endDate, days));
      const prevStartDate = startOfDay(subDays(startDate, days));

      // Fetch current period logs
      const { data: logs } = await supabase
        .from("ai_execution_logs")
        .select("*")
        .eq("account_id", currentAccount.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      // Fetch previous period for trends
      const { data: prevLogs } = await supabase
        .from("ai_execution_logs")
        .select("id, status, duration_ms, created_at")
        .eq("account_id", currentAccount.id)
        .gte("created_at", prevStartDate.toISOString())
        .lt("created_at", startDate.toISOString());

      const allLogs = logs || [];
      const prevAllLogs = prevLogs || [];

      // If no logs at all, return empty
      if (allLogs.length === 0 && prevAllLogs.length === 0) {
        return getEmptyMetrics();
      }

      // === KPIs ===
      const totalCalls = allLogs.length;
      const successLogs = allLogs.filter((l: any) => l.status === "success");
      const errorLogs = allLogs.filter((l: any) => l.status === "error" || l.status === "timeout");
      const successRate = totalCalls > 0 ? (successLogs.length / totalCalls) * 100 : 100;
      const totalErrors = errorLogs.length;

      const durations = allLogs
        .filter((l: any) => l.duration_ms != null)
        .map((l: any) => l.duration_ms / 1000);
      const avgResponseTime = durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        : 0;

      // Estimated cost
      const totalCost = allLogs
        .filter((l: any) => l.estimated_cost != null)
        .reduce((sum: number, l: any) => sum + Number(l.estimated_cost), 0);
      const estimatedMonthlyCost = totalCost * (30 / Math.max(days, 1));

      // === Usage over time ===
      const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
      const usageOverTime: AIUsageDataPoint[] = dateInterval.map((date) => {
        const dateKey = formatBRT(date, "yyyy-MM-dd");
        const dayLogs = allLogs.filter(
          (l: any) => formatBRT(new Date(l.created_at), "yyyy-MM-dd") === dateKey
        );
        const dayDurations = dayLogs
          .filter((l: any) => l.duration_ms != null)
          .map((l: any) => l.duration_ms / 1000);

        return {
          date: dateKey,
          dateLabel: formatBRT(date, days <= 7 ? "EEE" : "dd/MM"),
          calls: dayLogs.length,
          avgTime: dayDurations.length > 0
            ? dayDurations.reduce((a: number, b: number) => a + b, 0) / dayDurations.length
            : 0,
          errors: dayLogs.filter((l: any) => l.status === "error" || l.status === "timeout").length,
        };
      });

      // === Model breakdown ===
      const modelMap = new Map<string, any[]>();
      for (const log of allLogs) {
        const model = (log as any).model || "unknown";
        if (!modelMap.has(model)) modelMap.set(model, []);
        modelMap.get(model)!.push(log);
      }

      const modelBreakdown: AIModelMetrics[] = Array.from(modelMap.entries()).map(
        ([model, modelLogs]) => {
          const mDurations = modelLogs
            .filter((l: any) => l.duration_ms != null)
            .map((l: any) => l.duration_ms / 1000);
          const mSuccess = modelLogs.filter((l: any) => l.status === "success").length;
          const mErrors = modelLogs.filter((l: any) => l.status === "error" || l.status === "timeout").length;
          const mCost = modelLogs
            .filter((l: any) => l.estimated_cost != null)
            .reduce((sum: number, l: any) => sum + Number(l.estimated_cost), 0);

          return {
            model: model.replace("google/", "").replace("openai/", ""),
            totalCalls: modelLogs.length,
            avgResponseTime: mDurations.length > 0
              ? mDurations.reduce((a: number, b: number) => a + b, 0) / mDurations.length
              : 0,
            successRate: modelLogs.length > 0 ? (mSuccess / modelLogs.length) * 100 : 100,
            errorCount: mErrors,
            estimatedCost: Math.round(mCost * 100) / 100,
          };
        }
      );

      // === Operation breakdown ===
      const opMap = new Map<string, any[]>();
      for (const log of allLogs) {
        const op = (log as any).operation || "unknown";
        if (!opMap.has(op)) opMap.set(op, []);
        opMap.get(op)!.push(log);
      }

      const operationBreakdown: AIOperationBreakdown[] = Array.from(opMap.entries()).map(
        ([op, opLogs]) => {
          const oDurations = opLogs
            .filter((l: any) => l.duration_ms != null)
            .map((l: any) => l.duration_ms / 1000);
          const oSuccess = opLogs.filter((l: any) => l.status === "success").length;

          return {
            operation: OPERATION_LABELS[op] || op,
            count: opLogs.length,
            avgTime: oDurations.length > 0
              ? oDurations.reduce((a: number, b: number) => a + b, 0) / oDurations.length
              : 0,
            successRate: opLogs.length > 0 ? (oSuccess / opLogs.length) * 100 : 100,
            icon: OPERATION_ICONS[op] || "Activity",
          };
        }
      );

      // === Recent errors ===
      const recentErrors: AIErrorLog[] = allLogs
        .filter((l: any) => l.status === "error" || l.status === "timeout" || l.status === "fallback")
        .slice(0, 10)
        .map((l: any) => ({
          id: l.id,
          timestamp: l.created_at,
          operation: OPERATION_LABELS[l.operation] || l.operation,
          model: (l.model || "unknown").replace("google/", "").replace("openai/", ""),
          errorType: l.status === "timeout" ? "timeout" : "processing_error",
          errorMessage: l.error_message || "Erro durante processamento",
          resolved: l.status === "fallback",
        }));

      // === Trends ===
      const prevTotalCalls = prevAllLogs.length;
      const prevSuccessCount = prevAllLogs.filter((l: any) => l.status === "success").length;
      const prevSuccessRate = prevTotalCalls > 0 ? (prevSuccessCount / prevTotalCalls) * 100 : 100;
      const prevDurations = prevAllLogs
        .filter((l: any) => l.duration_ms != null)
        .map((l: any) => (l as any).duration_ms / 1000);
      const prevAvgResponseTime = prevDurations.length > 0
        ? prevDurations.reduce((a: number, b: number) => a + b, 0) / prevDurations.length
        : 0;

      const callsChange = prevTotalCalls > 0
        ? ((totalCalls - prevTotalCalls) / prevTotalCalls) * 100
        : 0;
      const responseTimeChange = prevAvgResponseTime > 0
        ? ((avgResponseTime - prevAvgResponseTime) / prevAvgResponseTime) * 100
        : 0;
      const successRateChange = prevSuccessRate > 0 ? successRate - prevSuccessRate : 0;

      return {
        totalCalls,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        successRate: Math.round(successRate * 10) / 10,
        totalErrors,
        estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
        usageOverTime,
        modelBreakdown,
        operationBreakdown,
        recentErrors,
        trends: {
          callsChange: Math.round(callsChange * 10) / 10,
          responseTimeChange: Math.round(responseTimeChange * 10) / 10,
          successRateChange: Math.round(successRateChange * 10) / 10,
        },
      };
    },
    enabled: !!currentAccount?.id,
  });
}

function getEmptyMetrics(): AIPerformanceData {
  return {
    totalCalls: 0,
    avgResponseTime: 0,
    successRate: 100,
    totalErrors: 0,
    estimatedMonthlyCost: 0,
    usageOverTime: [],
    modelBreakdown: [],
    operationBreakdown: [],
    recentErrors: [],
    trends: {
      callsChange: 0,
      responseTimeChange: 0,
      successRateChange: 0,
    },
  };
}
