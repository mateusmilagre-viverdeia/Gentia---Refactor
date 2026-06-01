import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Briefcase, DollarSign } from "lucide-react";
import type { TimeEntrySummary } from "@/types/time-tracking.types";
import { formatDuration } from "@/types/time-tracking.types";

interface TimeSummaryCardProps {
  summary: TimeEntrySummary;
  title?: string;
  period?: string;
}

export function TimeSummaryCard({ summary, title = "Resumo", period }: TimeSummaryCardProps) {
  const billablePercentage = summary.totalMinutes > 0
    ? Math.round((summary.billableMinutes / summary.totalMinutes) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{title}</span>
          {period && (
            <span className="text-sm font-normal text-muted-foreground">{period}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Hours */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuration(summary.totalMinutes)}</p>
              <p className="text-xs text-muted-foreground">Total registrado</p>
            </div>
          </div>

          {/* Projects */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Briefcase className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.byProject.length}</p>
              <p className="text-xs text-muted-foreground">Projetos</p>
            </div>
          </div>

          {/* Billable Hours */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuration(summary.billableMinutes)}</p>
              <p className="text-xs text-muted-foreground">Faturável</p>
            </div>
          </div>

          {/* Billable % */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{billablePercentage}%</p>
              <p className="text-xs text-muted-foreground">Taxa faturável</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
