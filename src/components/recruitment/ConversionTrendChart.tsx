import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Target, Users, ArrowRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { useFunnelTrendAnalytics } from "@/hooks/useFunnelTrendAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface ConversionTrendChartProps {
  period: DashboardPeriod;
  showComparison?: boolean;
  compact?: boolean;
}

function GrowthIndicator({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <Badge
      variant={isPositive ? "default" : isNeutral ? "secondary" : "destructive"}
      className="gap-1"
    >
      <Icon className="h-3 w-3" />
      {isPositive && "+"}
      {value}%
    </Badge>
  );
}

function ComparisonCard({
  label,
  rate,
  applicants,
  hired,
  growth,
  isCurrentWeek,
}: {
  label: string;
  rate: number;
  applicants: number;
  hired: number;
  growth?: number;
  isCurrentWeek?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        isCurrentWeek
          ? "bg-primary/5 border border-primary/20"
          : "bg-muted/50"
      }`}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={`text-3xl font-bold ${
          isCurrentWeek ? "text-primary" : "text-foreground"
        }`}
      >
        {rate.toFixed(1)}%
      </div>
      {growth !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground">vs anterior</span>
          <GrowthIndicator value={growth} />
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2">
        {hired} contratado{hired !== 1 ? "s" : ""} de {applicants} candidato
        {applicants !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <div className="font-medium text-sm mb-2">{label}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Taxa de Conversão:</span>
          <span className="font-medium text-primary">{data.rate?.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Candidatos:</span>
          <span className="font-medium">{data.applicants}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Contratados:</span>
          <span className="font-medium text-green-600">{data.hired}</span>
        </div>
      </div>
    </div>
  );
}

export function ConversionTrendChart({
  period,
  showComparison = true,
  compact = false,
}: ConversionTrendChartProps) {
  const { data: analytics, isLoading } = useFunnelTrendAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          {showComparison && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          )}
          <Skeleton className="h-[250px] w-full" />
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
            Tendência de Conversão
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
  const chartData = analytics.data.map((point, index) => ({
    name: point.weekLabel,
    rate: Math.round(point.conversionRate * 10) / 10,
    applicants: point.applicants,
    hired: point.hired,
    isLast: index === analytics.data.length - 1,
  }));

  // Get current and previous week data
  const currentWeek = analytics.data[analytics.data.length - 1];
  const previousWeek = analytics.data[analytics.data.length - 2];

  const chartHeight = compact ? 200 : 250;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendência de Conversão
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            Média: {analytics.averageConversionRate}%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Comparison Cards */}
        {showComparison && currentWeek && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ComparisonCard
              label="Semana Atual"
              rate={currentWeek.conversionRate}
              applicants={currentWeek.applicants}
              hired={currentWeek.hired}
              growth={analytics.weekOverWeekGrowth.conversionRate}
              isCurrentWeek
            />
            {previousWeek ? (
              <ComparisonCard
                label="Semana Anterior"
                rate={previousWeek.conversionRate}
                applicants={previousWeek.applicants}
                hired={previousWeek.hired}
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  Sem dados da semana anterior
                </span>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={analytics.averageConversionRate}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="none"
              fill="url(#colorRate)"
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isLast) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary rounded" />
            <span>Taxa de Conversão</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-muted-foreground/50 rounded" style={{ borderStyle: "dashed" }} />
            <span>Média do Período</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
