import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  Zap,
  Target,
  XCircle,
} from "lucide-react";
import { useJobFunnelAnalytics } from "@/hooks/useJobFunnelAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { cn } from "@/lib/utils";

interface FunnelMetricsDashboardProps {
  period: DashboardPeriod;
  jobId?: string;
  showJobInfo?: boolean;
}

export function FunnelMetricsDashboard({
  period,
  jobId,
  showJobInfo = false,
}: FunnelMetricsDashboardProps) {
  const { data: metrics, isLoading } = useJobFunnelAnalytics(period, jobId);

  if (isLoading) {
    return <FunnelDashboardSkeleton />;
  }

  if (!metrics || metrics.totalCandidates === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum candidato encontrado para o período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Info Header */}
      {showJobInfo && metrics.jobInfo && (
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{metrics.jobInfo.title}</h3>
          {metrics.jobInfo.department && (
            <Badge variant="outline">{metrics.jobInfo.department}</Badge>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total de Candidatos"
          value={metrics.totalCandidates}
          icon={Users}
          color="text-blue-500"
        />
        <SummaryCard
          title="Taxa de Conversão"
          value={`${metrics.overallConversionRate}%`}
          icon={Target}
          color="text-green-500"
          subtitle={`${metrics.totalHired} contratados`}
        />
        <SummaryCard
          title="Tempo Médio"
          value={metrics.avgTimeToHire ? `${metrics.avgTimeToHire}d` : "-"}
          icon={Clock}
          color="text-amber-500"
          subtitle={
            metrics.fastestHire && metrics.slowestHire
              ? `${metrics.fastestHire}d - ${metrics.slowestHire}d`
              : undefined
          }
        />
        <SummaryCard
          title="Principal Gargalo"
          value={metrics.mainBottleneck || "Nenhum"}
          icon={metrics.mainBottleneck ? AlertTriangle : CheckCircle2}
          color={metrics.mainBottleneck ? "text-red-500" : "text-green-500"}
        />
      </div>

      {/* Main Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Funil de Conversão
          </CardTitle>
          <CardDescription>
            Taxa de conversão e drop-off entre etapas do processo seletivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.stages.map((stage, index) => (
              <FunnelStageRow
                key={stage.id}
                stage={stage}
                isFirst={index === 0}
                isLast={index === metrics.stages.length - 1}
                maxCount={metrics.totalCandidates}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Conversão &gt;60%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Conversão 40-60%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Conversão &lt;40%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drop-off Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4" />
              Análise de Drop-off
            </CardTitle>
            <CardDescription>
              Candidatos que saíram do processo em cada etapa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.stages.slice(1).map((stage) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <span className="text-sm w-32 truncate">{stage.name}</span>
                  <div className="flex-1">
                    <Progress
                      value={stage.dropOffRate}
                      className={cn(
                        "h-2",
                        stage.dropOffRate > 40
                          ? "[&>div]:bg-red-500"
                          : stage.dropOffRate > 20
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-green-500"
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {stage.dropOffCount} ({stage.dropOffRate}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottleneck Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Insights de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.mainBottleneck && (
              <InsightCard
                type="warning"
                title="Gargalo Identificado"
                message={`A etapa "${metrics.mainBottleneck}" apresenta a menor taxa de conversão. Considere revisar os critérios ou processo desta etapa.`}
              />
            )}
            
            {metrics.overallConversionRate > 10 && (
              <InsightCard
                type="success"
                title="Taxa de Conversão Saudável"
                message={`Sua taxa de conversão de ${metrics.overallConversionRate}% está acima da média do mercado (5-10%).`}
              />
            )}

            {metrics.avgTimeToHire && metrics.avgTimeToHire > 30 && (
              <InsightCard
                type="info"
                title="Tempo de Contratação"
                message={`O tempo médio de ${metrics.avgTimeToHire} dias pode ser otimizado. Verifique etapas com maior tempo de permanência.`}
              />
            )}

            {metrics.totalRejected > 0 && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{metrics.totalRejected}</span> candidatos foram desqualificados neste período.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

function SummaryCard({ title, value, icon: Icon, color, subtitle }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-muted", color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FunnelStageRowProps {
  stage: {
    id: string;
    name: string;
    count: number;
    percentage: number;
    conversionRate: number | null;
    dropOffRate: number;
    isBottleneck: boolean;
    bottleneckSeverity: "critical" | "warning" | "healthy";
    color: string;
  };
  isFirst: boolean;
  isLast: boolean;
  maxCount: number;
}

function FunnelStageRow({ stage, isFirst, isLast, maxCount }: FunnelStageRowProps) {
  const minWidth = 20;
  const barWidth = Math.max(stage.percentage, minWidth);

  return (
    <div className="flex flex-col items-center">
      {/* Conversion rate arrow */}
      {!isFirst && stage.conversionRate !== null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <ArrowDown className="h-3 w-3" />
          <span
            className={cn(
              "font-semibold",
              stage.bottleneckSeverity === "healthy" && "text-green-600",
              stage.bottleneckSeverity === "warning" && "text-amber-600",
              stage.bottleneckSeverity === "critical" && "text-red-600"
            )}
          >
            {stage.conversionRate}%
          </span>
          {stage.isBottleneck && (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
        </div>
      )}

      {/* Stage bar */}
      <div className="w-full flex justify-center">
        <div
          className={cn(
            "relative h-14 rounded-lg flex items-center justify-between px-4 transition-all duration-300",
            "shadow-sm hover:shadow-md cursor-default"
          )}
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(135deg, ${stage.color} 0%, ${stage.color}dd 100%)`,
          }}
        >
          {/* Stage name */}
          <span className="text-white font-medium text-sm truncate">
            {stage.name}
          </span>

          {/* Count badge */}
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-sm font-semibold">
              {stage.count}
            </span>
            <span className="text-white/80 text-xs">{stage.percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InsightCardProps {
  type: "warning" | "success" | "info";
  title: string;
  message: string;
}

function InsightCard({ type, title, message }: InsightCardProps) {
  const config = {
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: CheckCircle2,
      iconColor: "text-green-500",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: Clock,
      iconColor: "text-blue-500",
    },
  };

  const { bg, border, icon: Icon, iconColor } = config[type];

  return (
    <div className={cn("p-3 rounded-lg border", bg, border)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5", iconColor)} />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}

function FunnelDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 mx-auto"
                style={{ width: `${100 - i * 12}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
