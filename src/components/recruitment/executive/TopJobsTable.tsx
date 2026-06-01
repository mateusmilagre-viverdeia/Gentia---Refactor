import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, TrendingUp } from "lucide-react";
import type { TopJob } from "@/hooks/useExecutiveDashboard";

interface TopJobsTableProps {
  jobs: TopJob[] | undefined;
  isLoading: boolean;
}

export function TopJobsTable({ jobs, isLoading }: TopJobsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Vagas por Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nenhuma vaga com contratações ainda
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Top Vagas por Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Vaga</th>
                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Contrat.</th>
                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Conversão</th>
                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Tempo Médio</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-medium text-sm truncate max-w-[200px]" title={job.title}>
                      {job.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.applications} aplicações
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                      {job.hired}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                      <span className="text-sm font-medium">{job.conversionRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {job.avgTimeToHire !== null ? (
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{job.avgTimeToHire} dias</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
