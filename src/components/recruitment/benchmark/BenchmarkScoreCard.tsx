import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecruitmentBenchmark } from "@/hooks/useRecruitmentBenchmark";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface BenchmarkScoreCardProps {
  period: DashboardPeriod;
  selectedSegment?: string;
}

export function BenchmarkScoreCard({ period, selectedSegment }: BenchmarkScoreCardProps) {
  const { overallScore, segmentName, isLoading } = useRecruitmentBenchmark(period, selectedSegment);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
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
    if (overallScore >= 80) return "Excelente";
    if (overallScore >= 70) return "Muito Bom";
    if (overallScore >= 60) return "Bom";
    if (overallScore >= 50) return "Na Média";
    if (overallScore >= 40) return "Abaixo da Média";
    return "Precisa Melhorar";
  };

  const getScoreBg = () => {
    if (overallScore >= 70) return "bg-emerald-50 dark:bg-emerald-950/20";
    if (overallScore >= 50) return "bg-amber-50 dark:bg-amber-950/20";
    return "bg-red-50 dark:bg-red-950/20";
  };

  // Calculate the circumference for the progress ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <Card className={cn("transition-colors", getScoreBg())}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-center">Score Geral</CardTitle>
        <p className="text-sm text-muted-foreground text-center">vs. {segmentName}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-2">
        {/* Circular Progress */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
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
          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold", getScoreColor())}>
              {overallScore}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        
        {/* Label */}
        <p className={cn("text-sm font-medium mt-2", getScoreColor())}>
          {getScoreLabel()}
        </p>
      </CardContent>
    </Card>
  );
}
