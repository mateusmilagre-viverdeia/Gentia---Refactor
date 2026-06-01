import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CheckpointByConsultant } from "@/types/checkpoint-analytics.types";

interface CheckpointsByConsultantChartProps {
  data: CheckpointByConsultant[];
}

export function CheckpointsByConsultantChart({ data }: CheckpointsByConsultantChartProps) {
  const maxCount = Math.max(...data.map(d => d.totalCount), 1);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carga por Consultor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum consultor com checkpoints no período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Carga por Consultor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.slice(0, 6).map((consultant) => {
          const percentage = (consultant.totalCount / maxCount) * 100;
          return (
            <div key={consultant.consultantId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[150px]">
                  {consultant.consultantName}
                </span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">
                    ✅ {consultant.completedCount}
                  </span>
                  <span className="text-xs">
                    📅 {consultant.upcomingCount}
                  </span>
                  <span className="font-medium text-foreground">
                    {consultant.totalCount}
                  </span>
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
