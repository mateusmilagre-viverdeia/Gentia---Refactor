import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureBenchmark } from "@/hooks/useCultureBenchmark";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CultureBenchmarkScoreCardProps {
  accountId: string | null;
  segment?: string;
}

export function CultureBenchmarkScoreCard({ 
  accountId, 
  segment 
}: CultureBenchmarkScoreCardProps) {
  const { overallScore, segmentName, comparisons, isLoading } = useCultureBenchmark(
    accountId,
    segment
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Skeleton className="h-32 w-32 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const aboveCount = comparisons.filter(c => c.status === 'above').length;
  const belowCount = comparisons.filter(c => c.status === 'below').length;
  const atCount = comparisons.filter(c => c.status === 'at').length;

  // Determine color and label based on score
  const getScoreColor = () => {
    if (overallScore >= 70) return "text-green-600";
    if (overallScore >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = () => {
    if (overallScore >= 70) return "bg-green-100";
    if (overallScore >= 50) return "bg-amber-100";
    return "bg-red-100";
  };

  const getScoreLabel = () => {
    if (overallScore >= 80) return "Excelente";
    if (overallScore >= 70) return "Muito Bom";
    if (overallScore >= 60) return "Bom";
    if (overallScore >= 50) return "Na Média";
    if (overallScore >= 40) return "Abaixo da Média";
    return "Precisa Atenção";
  };

  // Calculate stroke for circular progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Score de Cultura</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparado com: {segmentName}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {/* Circular Score */}
        <div className="relative">
          <svg className="w-36 h-36 -rotate-90">
            {/* Background circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              className={getScoreColor()}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: "stroke-dashoffset 0.5s ease-in-out",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreColor()}`}>
              {overallScore}
            </span>
            <span className="text-xs text-muted-foreground">de 100</span>
          </div>
        </div>

        {/* Label */}
        <div className={`px-4 py-2 rounded-full ${getScoreBg()}`}>
          <span className={`text-sm font-medium ${getScoreColor()}`}>
            {getScoreLabel()}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 w-full pt-4 border-t">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-semibold">{aboveCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Acima</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-amber-600">
              <Minus className="h-4 w-4" />
              <span className="text-lg font-semibold">{atCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Na média</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-lg font-semibold">{belowCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Abaixo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
