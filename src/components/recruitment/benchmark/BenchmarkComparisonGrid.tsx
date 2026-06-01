import { useRecruitmentBenchmark } from "@/hooks/useRecruitmentBenchmark";
import { BenchmarkComparisonCard } from "./BenchmarkComparisonCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface BenchmarkComparisonGridProps {
  period: DashboardPeriod;
  selectedSegment?: string;
}

export function BenchmarkComparisonGrid({ period, selectedSegment }: BenchmarkComparisonGridProps) {
  const { comparisons, isLoading } = useRecruitmentBenchmark(period, selectedSegment);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Não há dados suficientes para comparação com o mercado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {comparisons.map((comparison) => (
        <BenchmarkComparisonCard key={comparison.metric} comparison={comparison} />
      ))}
    </div>
  );
}
