import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { AIUsageDataPoint } from "@/hooks/useAIPerformanceMetrics";

interface AIUsageChartProps {
  data: AIUsageDataPoint[] | undefined;
  isLoading: boolean;
}

export function AIUsageChart({ data, isLoading }: AIUsageChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sem dados disponíveis para o período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Uso da IA ao Longo do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              unit="s"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "avgTime") return [`${value.toFixed(1)}s`, "Tempo Médio"];
                if (name === "calls") return [value, "Chamadas"];
                if (name === "errors") return [value, "Erros"];
                return [value, name];
              }}
            />
            <Legend 
              formatter={(value) => {
                if (value === "calls") return "Chamadas";
                if (value === "avgTime") return "Tempo Médio";
                if (value === "errors") return "Erros";
                return value;
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="calls" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            <Bar 
              yAxisId="left"
              dataKey="errors" 
              fill="hsl(var(--destructive))" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgTime"
              stroke="hsl(var(--accent-foreground))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
