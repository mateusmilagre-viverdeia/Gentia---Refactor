import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useJobAnalytics, type JobAnalytics } from "@/hooks/useJobAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { Briefcase, Users, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobAnalyticsGridProps {
  period: DashboardPeriod;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  closed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  draft: "Rascunho",
  paused: "Pausada",
  closed: "Fechada",
};

function JobCard({ job }: { job: JobAnalytics }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{job.jobTitle}</h3>
            <Badge variant="secondary" className={cn("text-xs mt-1", STATUS_COLORS[job.status])}>
              {STATUS_LABELS[job.status] || job.status}
            </Badge>
          </div>
          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Candidatos</span>
            </div>
            <p className="text-lg font-semibold">{job.totalCandidates}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Conversão</span>
            </div>
            <p className={cn("text-lg font-semibold", job.conversionRate > 0 ? "text-green-600" : "text-muted-foreground")}>
              {job.conversionRate}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="text-green-600">{job.hired} contratados</span>
            <span className="text-red-600">{job.rejected} rejeitados</span>
          </div>
          {job.averageScore !== null && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="font-medium">{job.averageScore}</span>
            </div>
          )}
        </div>

        {job.topSources.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Principais fontes:</p>
            <div className="flex flex-wrap gap-1">
              {job.topSources.map((source) => (
                <Badge key={source.source} variant="outline" className="text-xs">
                  {source.source === "careers_page" ? "Carreiras" : source.source} ({source.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function JobAnalyticsGrid({ period }: JobAnalyticsGridProps) {
  const { data: jobs, isLoading } = useJobAnalytics(period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-16 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Briefcase className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-sm">Nenhuma vaga encontrada neste período</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.jobId} job={job} />
      ))}
    </div>
  );
}
