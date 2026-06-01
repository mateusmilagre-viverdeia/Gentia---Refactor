import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { useAIPerformanceMetrics } from "@/hooks/useAIPerformanceMetrics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { AIMetricCard } from "./AIMetricCard";
import { AIUsageChart } from "./AIUsageChart";
import { AIModelComparison } from "./AIModelComparison";
import { AIOperationsBreakdown } from "./AIOperationsBreakdown";
import { AIErrorsLog } from "./AIErrorsLog";

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "1d", label: "Últimas 24 horas" },
  { value: "3d", label: "Últimos 3 dias" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

export function AIPerformanceDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const { data, isLoading, refetch } = useAIPerformanceMetrics(period);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Observabilidade da IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitore o desempenho e uso dos modelos de IA
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as DashboardPeriod)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AIMetricCard
          title="Total de Chamadas"
          value={data?.totalCalls ?? 0}
          icon={<Activity className="h-5 w-5" />}
          trend={data?.trends.callsChange}
          trendLabel="vs período anterior"
        />
        <AIMetricCard
          title="Tempo Médio"
          value={`${data?.avgResponseTime ?? 0}s`}
          icon={<Clock className="h-5 w-5" />}
          trend={data?.trends.responseTimeChange}
          trendLabel="vs período anterior"
          invertTrend
        />
        <AIMetricCard
          title="Taxa de Sucesso"
          value={`${data?.successRate ?? 100}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={data?.trends.successRateChange}
          trendLabel="pontos"
          color={
            (data?.successRate ?? 100) >= 95
              ? "success"
              : (data?.successRate ?? 100) >= 85
              ? "warning"
              : "error"
          }
        />
        <AIMetricCard
          title="Erros"
          value={data?.totalErrors ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={
            (data?.totalErrors ?? 0) === 0
              ? "success"
              : (data?.totalErrors ?? 0) <= 5
              ? "warning"
              : "error"
          }
        />
        <AIMetricCard
          title="Custo Estimado/Mês"
          value={`$${data?.estimatedMonthlyCost.toFixed(2) ?? "0.00"}`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="Baseado no uso atual"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIUsageChart data={data?.usageOverTime} isLoading={isLoading} />
        <AIModelComparison models={data?.modelBreakdown} isLoading={isLoading} />
      </div>

      {/* Operations and Errors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIOperationsBreakdown
          operations={data?.operationBreakdown}
          isLoading={isLoading}
        />
        <AIErrorsLog errors={data?.recentErrors} isLoading={isLoading} />
      </div>
    </div>
  );
}
