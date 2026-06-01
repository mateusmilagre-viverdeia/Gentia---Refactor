import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRecruitmentBenchmark } from "@/hooks/useRecruitmentBenchmark";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface BenchmarkSummaryCardProps {
  period?: DashboardPeriod;
}

export function BenchmarkSummaryCard({ period = "30d" }: BenchmarkSummaryCardProps) {
  const { overallScore, comparisons, segmentName, isLoading } = useRecruitmentBenchmark(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = () => {
    if (overallScore >= 70) return "text-emerald-500";
    if (overallScore >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreLabel = () => {
    if (overallScore >= 70) return "Acima da média";
    if (overallScore >= 50) return "Na média";
    return "Abaixo da média";
  };

  // Get status indicators for key metrics
  const getMetricIndicator = (metricKey: string) => {
    const comp = comparisons.find(c => c.metric === metricKey);
    if (!comp) return null;

    const isGood = comp.isPositiveBetter
      ? comp.status === "above"
      : comp.status === "below";
    
    const isBad = comp.isPositiveBetter
      ? comp.status === "below"
      : comp.status === "above";

    return (
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          isGood && "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50",
          isBad && "bg-red-100 text-red-600 dark:bg-red-950/50",
          comp.status === "at" && "bg-muted text-muted-foreground"
        )}
      >
        {comp.status === "at" && <Minus className="h-4 w-4" />}
        {comp.status === "above" && <TrendingUp className="h-4 w-4" />}
        {comp.status === "below" && <TrendingDown className="h-4 w-4" />}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5" />
            Benchmark vs Mercado
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/atracao-contratacao/recrutamento/benchmark" className="flex items-center gap-1">
              Ver Detalhes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold", getScoreColor())}>
                {overallScore}/100
              </span>
              <span className={cn("text-sm", getScoreColor())}>
                {getScoreLabel()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Segmento: {segmentName}
            </p>
          </div>
        </div>

        {/* Quick indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {getMetricIndicator("tempo_medio_contratacao")}
            <span className="text-xs text-muted-foreground">Tempo</span>
          </div>
          <div className="flex items-center gap-1">
            {getMetricIndicator("taxa_conversao")}
            <span className="text-xs text-muted-foreground">Conv.</span>
          </div>
          <div className="flex items-center gap-1">
            {getMetricIndicator("fill_rate")}
            <span className="text-xs text-muted-foreground">Fill</span>
          </div>
          <div className="flex items-center gap-1">
            {getMetricIndicator("candidatos_por_vaga")}
            <span className="text-xs text-muted-foreground">Cand.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
