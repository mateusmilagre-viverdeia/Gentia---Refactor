import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  [value: string]: string | number;
}

interface CultureValueEvolutionProps {
  data: ChartDataPoint[];
  values: string[];
  loading?: boolean;
}

// Color palette for values
const VALUE_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(280, 65%, 60%)', // purple
  'hsl(199, 89%, 48%)', // blue
  'hsl(350, 89%, 60%)', // rose
  'hsl(172, 66%, 50%)', // teal
  'hsl(24, 94%, 50%)', // orange
];

export function CultureValueEvolution({ data, values, loading }: CultureValueEvolutionProps) {
  const displayedValues = useMemo(() => values.slice(0, 6), [values]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução dos Valores</CardTitle>
          <CardDescription>Tendência de cada valor ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível ainda
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução dos Valores</CardTitle>
        <CardDescription>
          Tendência dos {displayedValues.length} principais valores ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis 
              domain={[0, 10]} 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value.toFixed(1), '']}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
            {displayedValues.map((value, index) => (
              <Line
                key={value}
                type="monotone"
                dataKey={value}
                name={value}
                stroke={VALUE_COLORS[index % VALUE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
