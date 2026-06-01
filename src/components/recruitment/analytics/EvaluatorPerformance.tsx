import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useEvaluatorAnalytics } from "@/hooks/useEvaluatorAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { UserCheck, ThumbsUp, ThumbsDown, HelpCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvaluatorPerformanceProps {
  period: DashboardPeriod;
}

export function EvaluatorPerformance({ period }: EvaluatorPerformanceProps) {
  const { data: evaluators, isLoading } = useEvaluatorAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" />
            Performance dos Avaliadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!evaluators || evaluators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" />
            Performance dos Avaliadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <UserCheck className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhuma avaliação neste período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxEvaluations = Math.max(...evaluators.map((e) => e.totalEvaluations));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4" />
          Performance dos Avaliadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {evaluators.slice(0, 5).map((evaluator, index) => {
            const initials = evaluator.evaluatorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const totalRecs =
              evaluator.recommendations.approve +
              evaluator.recommendations.reject +
              evaluator.recommendations.maybe;

            return (
              <div key={evaluator.evaluatorId} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground w-4">
                    #{index + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={evaluator.evaluatorAvatar || undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{evaluator.evaluatorName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{evaluator.totalEvaluations} avaliações</span>
                      {evaluator.averageScore > 0 && (
                        <>
                          <span>•</span>
                          <span>Score médio: {evaluator.averageScore}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <Progress
                  value={(evaluator.totalEvaluations / maxEvaluations) * 100}
                  className="h-1.5"
                />

                {/* Recommendations breakdown */}
                {totalRecs > 0 && (
                  <div className="flex items-center gap-3 text-xs pl-8">
                    <div className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{evaluator.recommendations.approve}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <ThumbsDown className="h-3 w-3" />
                      <span>{evaluator.recommendations.reject}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-600">
                      <HelpCircle className="h-3 w-3" />
                      <span>{evaluator.recommendations.maybe}</span>
                    </div>
                    {evaluator.averageTimeToEvaluateHours !== null && (
                      <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                        <Clock className="h-3 w-3" />
                        <span>{evaluator.averageTimeToEvaluateHours}h média</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
