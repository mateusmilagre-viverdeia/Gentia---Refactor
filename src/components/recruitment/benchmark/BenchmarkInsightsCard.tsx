import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecruitmentBenchmark } from "@/hooks/useRecruitmentBenchmark";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface BenchmarkInsightsCardProps {
  period: DashboardPeriod;
  selectedSegment?: string;
}

export function BenchmarkInsightsCard({ period, selectedSegment }: BenchmarkInsightsCardProps) {
  const { strengths, opportunities, recommendations, isLoading } = useRecruitmentBenchmark(
    period,
    selectedSegment
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasContent = strengths.length > 0 || opportunities.length > 0 || recommendations.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Insights e Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasContent && (
          <p className="text-muted-foreground text-sm">
            Não há dados suficientes para gerar insights
          </p>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Pontos Fortes
            </h4>
            <ul className="space-y-1">
              {strengths.map((strength, index) => (
                <li key={index} className="text-sm text-muted-foreground pl-6">
                  • {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Oportunidades de Melhoria
            </h4>
            <ul className="space-y-1">
              {opportunities.map((opportunity, index) => (
                <li key={index} className="text-sm text-muted-foreground pl-6">
                  • {opportunity}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
              <Lightbulb className="h-4 w-4" />
              Recomendações
            </h4>
            <ul className="space-y-1">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-muted-foreground pl-6">
                  • {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
