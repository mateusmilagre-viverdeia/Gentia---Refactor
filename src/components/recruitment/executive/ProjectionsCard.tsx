import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import type { Projection } from "@/hooks/useExecutiveDashboard";

interface ProjectionsCardProps {
  projections: Projection[] | undefined;
  isLoading: boolean;
}

function ConfidenceIndicator({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const dots = confidence === 'high' ? 5 : confidence === 'medium' ? 3 : 1;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < dots 
              ? confidence === 'high' 
                ? 'bg-emerald-500' 
                : confidence === 'medium' 
                  ? 'bg-amber-500' 
                  : 'bg-red-500'
              : 'bg-muted'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground capitalize">{confidence === 'high' ? 'Alta' : confidence === 'medium' ? 'Média' : 'Baixa'}</span>
    </div>
  );
}

export function ProjectionsCard({ projections, isLoading }: ProjectionsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!projections || projections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projeções (Próximo Mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Dados insuficientes para projeções
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Projeções (Próximo Mês)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {projections.map((projection) => {
          const TrendIcon = projection.trend === 'up' 
            ? TrendingUp 
            : projection.trend === 'down' 
              ? TrendingDown 
              : Minus;
          const trendColor = projection.trend === 'up' 
            ? 'text-emerald-600' 
            : projection.trend === 'down' 
              ? 'text-red-600' 
              : 'text-muted-foreground';

          return (
            <div key={projection.metric} className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                <span className="font-medium text-sm">{projection.metricLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-muted-foreground">Atual:</span>
                <span className="font-semibold">{projection.currentValue}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Projeção:</span>
                <span className="font-bold text-primary">
                  {projection.projectedRange.min}-{projection.projectedRange.max}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confiança:</span>
                <ConfidenceIndicator confidence={projection.confidence} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
