import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Users,
  Brain,
  Target,
  Award,
} from "lucide-react";
import { usePipelineQualityMetrics } from "@/hooks/usePipelineQualityMetrics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { cn } from "@/lib/utils";

interface PipelineQualityCardProps {
  period: DashboardPeriod;
  jobId?: string;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  comparison,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  suffix?: string;
  comparison?: number | null;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">
          {value !== null ? `${value}${suffix}` : "—"}
        </span>
        {comparison !== null && comparison !== undefined && (
          <Badge
            variant={comparison > 0 ? "default" : comparison < 0 ? "destructive" : "secondary"}
            className="gap-1 mb-1"
          >
            {comparison > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : comparison < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {comparison > 0 && "+"}
            {comparison}%
          </Badge>
        )}
      </div>
    </div>
  );
}

function ComparisonBar({
  label,
  hiredValue,
  overallValue,
  diffPercent,
}: {
  label: string;
  hiredValue: number | null;
  overallValue: number | null;
  diffPercent: number | null;
}) {
  const isPositive = diffPercent !== null && diffPercent > 0;
  const isNegative = diffPercent !== null && diffPercent < 0;

  return (
    <div className="flex items-center gap-4 py-2">
      <span className="w-24 text-sm text-muted-foreground">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm font-medium w-12">
          {hiredValue !== null ? hiredValue : "—"}
        </span>
        <span className="text-xs text-muted-foreground">vs</span>
        <span className="text-sm w-12">
          {overallValue !== null ? overallValue : "—"}
        </span>
        {diffPercent !== null && (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isPositive && "bg-primary",
                  isNegative && "bg-destructive",
                  !isPositive && !isNegative && "bg-muted-foreground"
                )}
                style={{
                  width: `${Math.min(Math.abs(diffPercent), 100)}%`,
                }}
              />
            </div>
            <Badge
              variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"}
              className="gap-1"
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : isNegative ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {isPositive && "+"}
              {diffPercent}%
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export function PipelineQualityCard({ period, jobId }: PipelineQualityCardProps) {
  const { data: metrics, isLoading } = usePipelineQualityMetrics(period, jobId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Qualidade do Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Award className="h-12 w-12 mb-4 opacity-50" />
            <p>Sem dados de qualidade disponíveis</p>
            <p className="text-sm">Os scores serão exibidos após avaliações</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter stages that have at least some data
  const stagesWithData = metrics.stages.filter(
    (s) =>
      s.candidatesCount > 0 ||
      s.avgCulturalScore !== null ||
      s.avgDiscMatch !== null ||
      s.avgEvaluationScore !== null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Qualidade do Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={Brain}
            label="Score Cultural Médio"
            value={metrics.overallQuality.avgCulturalScore}
            suffix=""
          />
          <MetricCard
            icon={Target}
            label="Match DISC Médio"
            value={metrics.overallQuality.avgDiscMatch}
            suffix="%"
          />
          <MetricCard
            icon={Star}
            label="Avaliação Média"
            value={metrics.overallQuality.avgEvaluationScore}
            suffix=""
          />
        </div>

        {/* Hired vs Overall comparison */}
        {(metrics.hiredCandidatesQuality.avgCulturalScore !== null ||
          metrics.hiredCandidatesQuality.avgDiscMatch !== null ||
          metrics.hiredCandidatesQuality.avgEvaluationScore !== null) && (
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Contratados vs Média Geral
            </h4>
            <div className="space-y-1">
              <ComparisonBar
                label="Cultural"
                hiredValue={metrics.hiredCandidatesQuality.avgCulturalScore}
                overallValue={metrics.overallQuality.avgCulturalScore}
                diffPercent={metrics.qualityComparison.culturalDiff}
              />
              <ComparisonBar
                label="DISC"
                hiredValue={metrics.hiredCandidatesQuality.avgDiscMatch}
                overallValue={metrics.overallQuality.avgDiscMatch}
                diffPercent={metrics.qualityComparison.discDiff}
              />
              <ComparisonBar
                label="Avaliação"
                hiredValue={metrics.hiredCandidatesQuality.avgEvaluationScore}
                overallValue={metrics.overallQuality.avgEvaluationScore}
                diffPercent={metrics.qualityComparison.evaluationDiff}
              />
            </div>
          </div>
        )}

        {/* Insights */}
        {metrics.insights.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Insights
            </h4>
            <ul className="space-y-1">
              {metrics.insights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quality by stage table */}
        {stagesWithData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Qualidade por Etapa
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-center">Candidatos</TableHead>
                    <TableHead className="text-center">Score Cultural</TableHead>
                    <TableHead className="text-center">Match DISC</TableHead>
                    <TableHead className="text-center">Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stagesWithData.map((stage) => (
                    <TableRow key={stage.stageId}>
                      <TableCell className="font-medium">{stage.stageName}</TableCell>
                      <TableCell className="text-center">
                        {stage.candidatesCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {stage.avgCulturalScore !== null ? (
                          <Badge variant="outline">{stage.avgCulturalScore}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {stage.avgDiscMatch !== null ? (
                          <Badge variant="outline">{stage.avgDiscMatch}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {stage.avgEvaluationScore !== null ? (
                          <Badge variant="outline">{stage.avgEvaluationScore}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
