import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeAnalytics } from "@/hooks/useTimeAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Clock, AlertTriangle, Zap, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeInStageChartProps {
  period: DashboardPeriod;
}

export function TimeInStageChart({ period }: TimeInStageChartProps) {
  const { data: timeData, isLoading } = useTimeAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Tempo por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!timeData || timeData.stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Tempo por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = timeData.stages.map((stage) => ({
    name: stage.stageName,
    days: stage.averageDays,
    isBottleneck: stage.isBottleneck,
    candidateCount: stage.candidateCount,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium flex items-center gap-2">
            {data.name}
            {data.isBottleneck && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                Gargalo
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Média: <span className="font-medium text-foreground">{data.days} dias</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Candidatos: <span className="font-medium text-foreground">{data.candidateCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Tempo por Etapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Média</span>
            </div>
            <p className="text-lg font-semibold">{timeData.overallAverageTime} dias</p>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs">Mais Rápido</span>
            </div>
            <p className="text-lg font-semibold text-green-600">
              {timeData.fastestHire ?? "—"} {timeData.fastestHire !== null && "dias"}
            </p>
          </div>
          <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <Hourglass className="h-3 w-3" />
              <span className="text-xs">Mais Lento</span>
            </div>
            <p className="text-lg font-semibold text-amber-600">
              {timeData.slowestHire ?? "—"} {timeData.slowestHire !== null && "dias"}
            </p>
          </div>
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `${v}d`} fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="days" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isBottleneck ? "hsl(38, 92%, 50%)" : "hsl(var(--primary))"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Bottleneck warning */}
        {chartData.some((d) => d.isBottleneck) && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Gargalo identificado em{" "}
              <strong>{chartData.find((d) => d.isBottleneck)?.name}</strong>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
