import { TalentPoolTrends } from "@/hooks/useTalentPoolAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Activity } from "lucide-react";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface TalentPoolTrendChartProps {
  trends: TalentPoolTrends;
}

export function TalentPoolTrendChart({ trends }: TalentPoolTrendChartProps) {
  // Merge unlocks and hires by week
  const allWeeks = new Set([
    ...trends.unlocksByWeek.map(u => u.week),
    ...trends.hiresByWeek.map(h => h.week),
  ]);

  const chartData = Array.from(allWeeks)
    .sort()
    .map(week => {
      const unlock = trends.unlocksByWeek.find(u => u.week === week);
      const hire = trends.hiresByWeek.find(h => h.week === week);
      return {
        week,
        weekLabel: formatBRT(parseISO(week), "dd/MM"),
        unlocks: unlock?.count || 0,
        hires: hire?.count || 0,
      };
    });

  // Calculate week-over-week growth
  const lastWeek = chartData[chartData.length - 1];
  const prevWeek = chartData[chartData.length - 2];
  
  const unlockGrowth = prevWeek && prevWeek.unlocks > 0
    ? ((lastWeek?.unlocks || 0) - prevWeek.unlocks) / prevWeek.unlocks * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Tendência Semanal
            </CardTitle>
            <CardDescription>
              Evolução de desbloqueios e contratações
            </CardDescription>
          </div>
          {lastWeek && prevWeek && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              unlockGrowth >= 0 ? "text-green-600" : "text-red-500"
            }`}>
              <TrendingUp className={`h-4 w-4 ${unlockGrowth < 0 ? "rotate-180" : ""}`} />
              {unlockGrowth >= 0 ? "+" : ""}{unlockGrowth.toFixed(0)}% unlocks
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label) => `Semana de ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="unlocks"
                  name="Desbloqueios"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="hires"
                  name="Contratações"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade no período</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
