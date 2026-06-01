import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CheckpointByPeriod } from "@/types/checkpoint-analytics.types";

interface CheckpointsByPeriodChartProps {
  data: CheckpointByPeriod[];
}

export function CheckpointsByPeriodChart({ data }: CheckpointsByPeriodChartProps) {
  const chartData = data.map(d => ({
    name: d.label.charAt(0).toUpperCase() + d.label.slice(1),
    Realizados: d.completed,
    Agendados: d.scheduled,
    Cancelados: d.cancelled,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Checkpoints por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="Realizados" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Agendados" 
                fill="hsl(220 70% 60%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Cancelados" 
                fill="hsl(var(--muted))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
