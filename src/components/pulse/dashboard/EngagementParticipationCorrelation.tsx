import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface CorrelationProps {
  engagementChartData: Array<{ date: string; engagement: number | null; participation: number | null }>;
  loading: boolean;
}

export function EngagementParticipationCorrelation({ engagementChartData, loading }: CorrelationProps) {
  const scatterData = useMemo(() => {
    return engagementChartData
      .filter(d => d.participation != null && d.engagement != null)
      .map(d => ({
        x: d.participation!,
        y: d.engagement!,
        date: d.date,
      }));
  }, [engagementChartData]);

  if (loading) return <Skeleton className="h-[300px]" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Correlação</CardTitle>
        <CardDescription>Participação × Engajamento</CardDescription>
      </CardHeader>
      <CardContent>
        {scatterData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 100]}
                name="Participação"
                unit="%"
                className="text-xs"
                label={{ value: 'Participação %', position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 100]}
                name="Engajamento"
                unit="%"
                className="text-xs"
                label={{ value: 'Engajamento %', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                      <p className="text-xs text-muted-foreground mb-1">{d.date}</p>
                      <p className="text-sm">Participação: <span className="font-medium">{d.x}%</span></p>
                      <p className="text-sm">Engajamento: <span className="font-medium">{d.y}%</span></p>
                    </div>
                  );
                }}
              />
              <Scatter
                data={scatterData}
                fill="hsl(var(--primary))"
                fillOpacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Dados insuficientes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
