import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyScore } from '@/hooks/useROIPEvolution';

interface EvolutionLineChartProps {
  data: MonthlyScore[];
}

export const EvolutionLineChart = ({ data }: EvolutionLineChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução do Score Geral</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">
            Nenhum dado de evolução disponível ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução do Score Geral</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={[0, 100]} 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--primary))' }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
            />
            <ReferenceLine 
              y={70} 
              stroke="hsl(var(--warning))" 
              strokeDasharray="5 5"
              label={{ 
                value: 'Meta 70%', 
                position: 'right',
                fill: 'hsl(var(--warning))',
                fontSize: 12
              }} 
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
