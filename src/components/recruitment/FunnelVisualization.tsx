import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FunnelStageBar } from "./FunnelStageBar";
import { useFunnelAnalytics } from "@/hooks/useFunnelAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { Filter } from "lucide-react";

interface FunnelVisualizationProps {
  period: DashboardPeriod;
}

export function FunnelVisualization({ period }: FunnelVisualizationProps) {
  const { data: analytics, isLoading } = useFunnelAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Funil de Recrutamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[100, 80, 60, 45, 30, 20].map((width, i) => (
              <div key={i} className="flex justify-center">
                <Skeleton className="h-12 rounded-lg" style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = analytics && analytics.totalApplicants > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Funil de Recrutamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground">Nenhuma aplicação neste período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Funil de Recrutamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {analytics.stages.map((stage, index) => (
            <FunnelStageBar
              key={stage.id}
              name={stage.name}
              count={stage.count}
              percentage={stage.percentage}
              conversionRate={stage.conversionRate}
              color={stage.color}
              isFirst={index === 0}
              isLast={index === analytics.stages.length - 1}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="text-green-600 font-medium">●</span>
              <span>Conversão ≥70%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-600 font-medium">●</span>
              <span>Conversão 40-69%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600 font-medium">●</span>
              <span>Conversão &lt;40%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
