import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEfficiencyMetrics } from "@/hooks/useEfficiencyMetrics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { 
  Gauge, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  ArrowRight,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EfficiencyDashboardProps {
  period: DashboardPeriod;
}

function MetricCard({ 
  label, 
  value, 
  unit, 
  icon: Icon,
  status 
}: { 
  label: string; 
  value: number | null; 
  unit: string;
  icon: React.ElementType;
  status?: "good" | "warning" | "bad";
}) {
  const statusColors = {
    good: "text-green-600 bg-green-50 dark:bg-green-950/30",
    warning: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
    bad: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };

  return (
    <div className={cn(
      "rounded-lg p-4 border",
      status ? statusColors[status] : "bg-muted/30"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value !== null ? value : "-"}
        <span className="text-sm font-normal ml-1 text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export function EfficiencyDashboard({ period }: EfficiencyDashboardProps) {
  const { data: metrics, isLoading } = useEfficiencyMetrics(period);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const getScoreStatus = (score: number): "good" | "warning" | "bad" => {
    if (score >= 70) return "good";
    if (score >= 40) return "warning";
    return "bad";
  };

  const getTimeStatus = (hours: number | null, threshold: number): "good" | "warning" | "bad" | undefined => {
    if (hours === null) return undefined;
    if (hours <= threshold) return "good";
    if (hours <= threshold * 2) return "warning";
    return "bad";
  };

  return (
    <div className="space-y-6">
      {/* Efficiency Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Score de Eficiência
          </CardTitle>
          <CardDescription>
            Avaliação geral do processo de recrutamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${metrics.overallEfficiencyScore * 3.52} 352`}
                  className={cn(
                    getScoreStatus(metrics.overallEfficiencyScore) === "good" && "text-green-500",
                    getScoreStatus(metrics.overallEfficiencyScore) === "warning" && "text-yellow-500",
                    getScoreStatus(metrics.overallEfficiencyScore) === "bad" && "text-red-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{metrics.overallEfficiencyScore}</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Velocidade do Processo</span>
                  <span className="text-sm font-medium">
                    {metrics.timeToHire ? `${metrics.timeToHire} dias` : "N/A"}
                  </span>
                </div>
                <Progress 
                  value={metrics.timeToHire ? Math.max(0, 100 - metrics.timeToHire * 2) : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                  <span className="text-sm font-medium">
                    {metrics.stageEfficiency.length > 0 
                      ? `${100 - metrics.stageEfficiency.reduce((sum, s) => sum + s.dropoffRate, 0) / metrics.stageEfficiency.length}%`
                      : "N/A"
                    }
                  </span>
                </div>
                <Progress 
                  value={100 - (metrics.stageEfficiency.reduce((sum, s) => sum + s.dropoffRate, 0) / Math.max(1, metrics.stageEfficiency.length))} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Até Contratação"
          value={metrics.timeToHire}
          unit="dias"
          icon={CheckCircle2}
          status={getTimeStatus(metrics.timeToHire, 30)}
        />
        <MetricCard
          label="Total Candidatos"
          value={metrics.totalCandidates}
          unit=""
          icon={Timer}
        />
        <MetricCard
          label="Contratados"
          value={metrics.totalHired}
          unit=""
          icon={CheckCircle2}
          status={metrics.totalHired > 0 ? "good" : undefined}
        />
        <MetricCard
          label="Taxa Conversão"
          value={metrics.conversionRate}
          unit="%"
          icon={Clock}
          status={metrics.conversionRate >= 10 ? "good" : metrics.conversionRate >= 5 ? "warning" : "bad"}
        />
      </div>

      {/* Stage Flow */}
      {metrics.stageEfficiency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Fluxo por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {metrics.stageEfficiency.map((stage, index) => (
                <div key={stage.stage} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className="text-sm font-medium mb-1">{getStageDisplayName(stage.stage)}</div>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold">{stage.candidates}</span>
                    </div>
                    {stage.dropoffRate > 0 && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        -{stage.dropoffRate}%
                      </Badge>
                    )}
                  </div>
                  {index < metrics.stageEfficiency.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottlenecks & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.bottlenecks.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Gargalos Identificados</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {metrics.bottlenecks.map((bottleneck, i) => (
                  <li key={i}>{bottleneck}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {metrics.recommendations.length > 0 && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Recomendações</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {metrics.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

function getStageDisplayName(stage: string): string {
  const names: Record<string, string> = {
    applied: "Aplicado",
    screening: "Triagem",
    interview: "Entrevista",
    evaluation: "Avaliação",
    offer: "Proposta",
    hired: "Contratado",
  };
  return names[stage] || stage;
}
