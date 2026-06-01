import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AutomatedStepsTrendChartProps {
  trendData: { week: string; cultural: number; disc: number; technical: number }[];
  isLoading?: boolean;
}

export function AutomatedStepsTrendChart({ trendData, isLoading }: AutomatedStepsTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!trendData || trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendência de Conversão Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p>Dados insuficientes para exibir tendência</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{entry.value.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendência de Conversão Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="cultural"
              name="Fit Cultural"
              stroke="hsl(330, 80%, 60%)"
              strokeWidth={2}
              dot={{ fill: "hsl(330, 80%, 60%)", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="disc"
              name="DISC"
              stroke="hsl(210, 80%, 55%)"
              strokeWidth={2}
              dot={{ fill: "hsl(210, 80%, 55%)", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="technical"
              name="Fit Técnico"
              stroke="hsl(40, 90%, 50%)"
              strokeWidth={2}
              dot={{ fill: "hsl(40, 90%, 50%)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Trend Insights */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          {["cultural", "disc", "technical"].map((key) => {
            const data = trendData.map((d) => d[key as keyof typeof d] as number);
            const lastTwo = data.slice(-2);
            const change = lastTwo.length === 2 ? lastTwo[1] - lastTwo[0] : 0;
            const isPositive = change > 0;
            const isNeutral = Math.abs(change) < 5;

            const labels: Record<string, string> = {
              cultural: "Cultural",
              disc: "DISC",
              technical: "Técnico",
            };

            return (
              <div
                key={key}
                className={`p-2 rounded ${
                  isNeutral ? "bg-muted" : isPositive ? "bg-green-500/10" : "bg-red-500/10"
                }`}
              >
                <p className="text-muted-foreground text-xs">{labels[key]}</p>
                <p
                  className={`font-semibold ${
                    isNeutral ? "text-muted-foreground" : isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {change.toFixed(0)}%
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
