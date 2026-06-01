import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureBenchmark, CultureBenchmarkComparison } from "@/hooks/useCultureBenchmark";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CultureBenchmarkComparisonGridProps {
  accountId: string | null;
  segment?: string;
}

function ComparisonCard({ comparison }: { comparison: CultureBenchmarkComparison }) {
  const getStatusIcon = () => {
    switch (comparison.status) {
      case 'above':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'below':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    switch (comparison.status) {
      case 'above':
        return "text-green-600";
      case 'below':
        return "text-red-600";
      default:
        return "text-amber-600";
    }
  };

  const getStatusBg = () => {
    switch (comparison.status) {
      case 'above':
        return "bg-green-50";
      case 'below':
        return "bg-red-50";
      default:
        return "bg-amber-50";
    }
  };

  const getStatusText = () => {
    switch (comparison.status) {
      case 'above':
        return "Acima do mercado";
      case 'below':
        return "Abaixo do mercado";
      default:
        return "Na média do mercado";
    }
  };

  // Calculate progress percentages (0-10 scale to 0-100)
  const companyProgress = (comparison.companyScore / 10) * 100;
  const marketProgress = (comparison.marketAverage / 10) * 100;

  return (
    <Card className={cn("relative overflow-hidden", getStatusBg())}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">{comparison.pillarLabel}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {comparison.companyScore.toFixed(1)} vs {comparison.marketAverage.toFixed(1)}
            </p>
          </div>
          {getStatusIcon()}
        </div>

        {/* Progress bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Sua empresa</span>
              <span className="font-medium">{comparison.companyScore.toFixed(1)}</span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${companyProgress}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Mercado</span>
              <span className="text-muted-foreground">{comparison.marketAverage.toFixed(1)}</span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/50 rounded-full transition-all duration-300"
                style={{ width: `${marketProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn("text-xs font-medium", getStatusColor())}>
            {comparison.percentageDiff > 0 ? "+" : ""}{comparison.percentageDiff.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground">
            {getStatusText()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function CultureBenchmarkComparisonGrid({ 
  accountId, 
  segment 
}: CultureBenchmarkComparisonGridProps) {
  const { comparisons, isLoading } = useCultureBenchmark(accountId, segment);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo por Pilar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Sem dados suficientes para comparação
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalhamento por Pilar</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparação detalhada de cada pilar cultural
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {comparisons.map((comparison) => (
            <ComparisonCard key={comparison.pillar} comparison={comparison} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
