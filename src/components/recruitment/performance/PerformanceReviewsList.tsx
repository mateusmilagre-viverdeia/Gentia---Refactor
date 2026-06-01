import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, UserCheck, UserX } from "lucide-react";
import { formatBRT } from "@/lib/datetime";


interface PerformanceReviewsListProps {
  candidateId: string;
  jobId: string;
}

const PERIOD_LABELS: Record<string, string> = {
  "30_days": "30 dias",
  "90_days": "90 dias",
  "6_months": "6 meses",
  "12_months": "12 meses",
};

const RETENTION_ICONS: Record<string, typeof UserCheck> = {
  active: UserCheck,
  voluntary_exit: UserX,
  involuntary_exit: UserX,
};

export function PerformanceReviewsList({ candidateId, jobId }: PerformanceReviewsListProps) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["performance-reviews", candidateId, jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hire_performance_reviews")
        .select("*")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("reviewed_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!reviews || reviews.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Performance Pós-Contratação
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex gap-3 overflow-x-auto">
          {reviews.map((review: any) => {
            const RetentionIcon = RETENTION_ICONS[review.retention_status] || UserCheck;
            const scoreColor = review.performance_score >= 8
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
              : review.performance_score >= 5
              ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
              : "text-red-500 bg-red-50 dark:bg-red-950/30";

            return (
              <div
                key={review.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-card min-w-[100px]"
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  {PERIOD_LABELS[review.review_period] || review.review_period}
                </span>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${scoreColor}`}>
                  <Star className="h-3.5 w-3.5" />
                  <span className="text-lg font-bold">{review.performance_score}</span>
                </div>
                <Badge
                  variant={review.retention_status === "active" ? "success" : "destructive"}
                  className="text-[9px] px-1.5 py-0"
                >
                  <RetentionIcon className="h-2.5 w-2.5 mr-0.5" />
                  {review.retention_status === "active" ? "Ativo" :
                   review.retention_status === "voluntary_exit" ? "Saiu" : "Desligado"}
                </Badge>
                <span className="text-[9px] text-muted-foreground">
                  {formatBRT(new Date(review.reviewed_at), "dd/MM/yy")}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
