import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CulturePillar, PILLAR_LABELS } from '@/types/pulseCulture.types';

interface PillarScore {
  pillar: CulturePillar;
  pillar_name: string;
  score: number;
  response_count: number;
}

interface CultureRadarChartProps {
  data: PillarScore[];
  loading?: boolean;
}

export function CultureRadarChart({ data, loading }: CultureRadarChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px]" />
        </CardContent>
      </Card>
    );
  }

  // Ensure all pillars are represented
  const allPillars: CulturePillar[] = ['mission', 'vision', 'value', 'decision', 'indicator', 'project', 'energy', 'development'];
  const chartData = allPillars.map(pillar => {
    const found = data.find(d => d.pillar === pillar);
    return {
      pillar,
      pillar_name: PILLAR_LABELS[pillar],
      score: found?.score ?? 0,
      response_count: found?.response_count ?? 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de Cultura</CardTitle>
        <CardDescription>Score por pilar organizacional</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={chartData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis
                dataKey="pillar_name"
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}/10`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
