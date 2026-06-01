import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import type { MonthlyData } from "@/hooks/useExecutiveDashboard";

interface MonthlyComparisonChartProps {
  data: MonthlyData[] | undefined;
  isLoading: boolean;
}

export function MonthlyComparisonChart({ data, isLoading }: MonthlyComparisonChartProps) {
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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Comparativo Mês a Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
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
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  applications: 'Aplicações',
                  hired: 'Contratações',
                  rejected: 'Rejeitados',
                };
                return [value, labels[name] || name];
              }}
            />
            <Legend 
              formatter={(value) => {
                const labels: Record<string, string> = {
                  applications: 'Aplicações',
                  hired: 'Contratações',
                  rejected: 'Rejeitados',
                };
                return labels[value] || value;
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="applications" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            <Bar 
              yAxisId="left"
              dataKey="hired" 
              fill="hsl(142.1 76.2% 36.3%)" 
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avgTimeToHire" 
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
              name="Tempo Médio (dias)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
