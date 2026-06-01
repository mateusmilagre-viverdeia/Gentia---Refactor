import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyScore } from '@/hooks/useROIPEvolution';

interface PillarComparisonChartProps {
  current: MonthlyScore | undefined;
  previous: MonthlyScore | undefined;
}

const PILLAR_LABELS: Record<string, string> = {
  retencao: 'Retenção',
  cultura: 'Cultura',
  atracao: 'Atração',
  resultados: 'Resultados',
};

export const PillarComparisonChart = ({ current, previous }: PillarComparisonChartProps) => {
  if (!current?.pillarScores) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo por Pilar</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">
            Dados de pilares não disponíveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = Object.keys(PILLAR_LABELS).map(key => ({
    pillar: PILLAR_LABELS[key],
    current: current.pillarScores?.[key as keyof typeof current.pillarScores] || 0,
    previous: previous?.pillarScores?.[key as keyof typeof previous.pillarScores] || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparativo por Pilar</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis 
              dataKey="pillar" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            {previous?.pillarScores && (
              <Radar
                name="Mês Anterior"
                dataKey="previous"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted))"
                fillOpacity={0.3}
              />
            )}
            <Radar
              name="Mês Atual"
              dataKey="current"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.5}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
