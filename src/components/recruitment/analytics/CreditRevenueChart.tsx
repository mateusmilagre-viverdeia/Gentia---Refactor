import { TalentPoolRevenue } from "@/hooks/useTalentPoolAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Coins, TrendingUp, Target } from "lucide-react";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface CreditRevenueChartProps {
  revenue: TalentPoolRevenue;
}

export function CreditRevenueChart({ revenue }: CreditRevenueChartProps) {
  const chartData = revenue.creditsByWeek
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(item => ({
      ...item,
      weekLabel: formatBRT(parseISO(item.week), "dd/MM"),
    }));

  // Calculate trend
  const recentWeeks = chartData.slice(-4);
  const olderWeeks = chartData.slice(-8, -4);
  const recentAvg = recentWeeks.reduce((sum, w) => sum + w.credits, 0) / Math.max(recentWeeks.length, 1);
  const olderAvg = olderWeeks.reduce((sum, w) => sum + w.credits, 0) / Math.max(olderWeeks.length, 1);
  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          Consumo de Créditos
        </CardTitle>
        <CardDescription>
          Créditos utilizados para desbloquear candidatos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {revenue.totalCreditsSpent}
            </div>
            <div className="text-xs text-muted-foreground">Total Gasto</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {revenue.costPerHire || "—"}
            </div>
            <div className="text-xs text-muted-foreground">Custo/Contratação</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              trend >= 0 ? "text-red-500" : "text-green-500"
            }`}>
              <TrendingUp className={`h-4 w-4 ${trend < 0 ? "rotate-180" : ""}`} />
              {Math.abs(trend).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Tendência</div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="weekLabel" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value} créditos`, "Consumo"]}
                  labelFormatter={(label) => `Semana de ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="credits"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#creditGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum dado de consumo no período</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
