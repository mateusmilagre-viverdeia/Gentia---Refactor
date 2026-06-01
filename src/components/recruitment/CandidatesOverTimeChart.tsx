import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandidatesOverTime, type CandidateTimePoint } from "@/hooks/useCandidatesOverTime";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface CandidatesOverTimeChartProps {
  period: DashboardPeriod;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="mt-1 space-y-1">
          <p className="text-xs text-muted-foreground">
            Novos: <span className="font-medium text-primary">{payload[0]?.value}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Acumulado: <span className="font-medium text-foreground">{payload[1]?.value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function CandidatesOverTimeChart({ period }: CandidatesOverTimeChartProps) {
  const { data: timePoints, isLoading } = useCandidatesOverTime(period);

  const hasData = useMemo(() => {
    if (!timePoints) return false;
    return timePoints.some(point => point.candidates > 0);
  }, [timePoints]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Candidatos ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Candidatos ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground">Nenhum candidato neste período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Candidatos ao Longo do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timePoints}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="candidatesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="candidates"
                name="Novos Candidatos"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#candidatesGradient)"
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#cumulativeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span>Novos candidatos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: "hsl(var(--chart-2))" }} />
            <span>Acumulado no período</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
