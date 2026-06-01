import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartData {
  date: string;
  score: number;
  participation: number;
}

interface CultureTrendLineProps {
  data: ChartData[];
  loading?: boolean;
}

export function CultureTrendLine({ data, loading }: CultureTrendLineProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do Culture Score</CardTitle>
        <CardDescription>Tendência dos últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCultureScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis domain={[0, 10]} className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}${name === 'score' ? '/10' : '%'}`,
                  name === 'score' ? 'Culture Score' : 'Participação'
                ]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorCultureScore)"
                name="score"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
