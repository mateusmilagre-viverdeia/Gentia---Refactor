import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Users, Target } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useFunnelTrendAnalytics } from "@/hooks/useFunnelTrendAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface FunnelTrendChartProps {
  period: DashboardPeriod;
  jobId?: string;
}

const STAGE_COLORS = {
  fit_cultural: "hsl(var(--chart-1))",
  disc: "hsl(var(--chart-2))",
  fit_tecnico: "hsl(var(--chart-3))",
  avaliacao_final: "hsl(var(--chart-4))",
  proposta: "hsl(var(--chart-5))",
  hired: "hsl(142.1 76.2% 36.3%)", // green-600
};

function GrowthBadge({ value, label }: { value: number; label: string }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <Badge
        variant={isPositive ? "default" : isNeutral ? "secondary" : "destructive"}
        className="gap-1"
      >
        <Icon className="h-3 w-3" />
        {isPositive && "+"}
        {value}%
      </Badge>
    </div>
  );
}

export function FunnelTrendChart({ period, jobId }: FunnelTrendChartProps) {
  const { data: analytics, isLoading } = useFunnelTrendAnalytics(period, jobId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p>Dados insuficientes para gerar tendências</p>
            <p className="text-sm">Selecione um período maior</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = analytics.data.map((point) => ({
    name: point.weekLabel,
    "Taxa Geral": Math.round(point.conversionRate * 10) / 10,
    "Fit Cultural": Math.round(point.stageConversions.fit_cultural * 10) / 10,
    DISC: Math.round(point.stageConversions.disc * 10) / 10,
    "Fit Técnico": Math.round(point.stageConversions.fit_tecnico * 10) / 10,
    Candidatos: point.applicants,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução do Funil
          </CardTitle>
          <div className="flex flex-wrap gap-4">
            <GrowthBadge
              value={analytics.weekOverWeekGrowth.conversionRate}
              label="Conversão"
            />
            <GrowthBadge
              value={analytics.weekOverWeekGrowth.applicants}
              label="Candidatos"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="h-4 w-4" />
              Taxa Média
            </div>
            <div className="text-2xl font-bold">
              {analytics.averageConversionRate}%
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Total Semanas
            </div>
            <div className="text-2xl font-bold">{analytics.data.length}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Última Semana
            </div>
            <div className="text-2xl font-bold">
              {analytics.data[analytics.data.length - 1]?.conversionRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Candidatos (última)
            </div>
            <div className="text-2xl font-bold">
              {analytics.data[analytics.data.length - 1]?.applicants || 0}
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "Candidatos") return [value, name];
                return [`${value}%`, name];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Taxa Geral"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Fit Cultural"
              stroke={STAGE_COLORS.fit_cultural}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="DISC"
              stroke={STAGE_COLORS.disc}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Fit Técnico"
              stroke={STAGE_COLORS.fit_tecnico}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
