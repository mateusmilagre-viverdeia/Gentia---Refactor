import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CalculadoraMonthlyData } from '@/hooks/useCalculadoraEvolution';
import { BarChart3 } from 'lucide-react';

interface CostBreakdownChartProps {
  data: CalculadoraMonthlyData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export const CostBreakdownChart = ({ data }: CostBreakdownChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Composição dos Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma simulação encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Composição dos Custos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="custoRotatividade" 
              name="Rotatividade" 
              stackId="a"
              fill="hsl(var(--destructive))" 
            />
            <Bar 
              dataKey="custoDesengajamento" 
              name="Desengajamento" 
              stackId="a"
              fill="hsl(var(--chart-2))" 
            />
            <Bar 
              dataKey="custoImprodutividade" 
              name="Improdutividade" 
              stackId="a"
              fill="hsl(var(--chart-3))" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
