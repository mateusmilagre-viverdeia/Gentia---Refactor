import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConsultantTimeTracking } from "@/hooks/useConsultantTimeTracking";
import { formatDuration } from "@/types/time-tracking.types";
import { startOfWeek, endOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRT } from "@/lib/datetime";

export function DashboardTimeCard() {
  const navigate = useNavigate();
  const now = new Date();
  
  const filters = {
    startDate: formatBRT(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    endDate: formatBRT(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
  
  const { entries, isLoading, getSummary } = useConsultantTimeTracking(filters);
  const summary = getSummary(entries);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/consultor/time-tracking")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Horas Esta Semana
          </CardDescription>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl">{formatDuration(summary.totalMinutes)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {summary.byProject.length} projeto{summary.byProject.length !== 1 ? "s" : ""} • {Math.round((summary.billableMinutes / Math.max(summary.totalMinutes, 1)) * 100)}% faturável
        </p>
      </CardContent>
    </Card>
  );
}
