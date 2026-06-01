import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import type { MonthlyFinancialData } from "@/hooks/useEPPartnerFinancials";

interface FinancialChartProps {
  monthlyData: MonthlyFinancialData[];
}

export function FinancialChart({ monthlyData }: FinancialChartProps) {
  // Reverse to show oldest first (left to right chronologically)
  const chartData = useMemo(() => {
    return [...monthlyData].reverse().slice(-12); // Last 12 months
  }, [monthlyData]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 space-y-2">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponível para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="periodLabel" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="royalties" 
                name="Royalties (Débito)" 
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Bar 
                dataKey="commissions" 
                name="Comissões (Crédito)" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line 
                type="monotone" 
                dataKey="netBalance" 
                name="Saldo Líquido" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
