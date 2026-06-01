import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureBenchmark } from "@/hooks/useCultureBenchmark";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CultureBenchmarkRadarChartProps {
  accountId: string | null;
  segment?: string;
}

export function CultureBenchmarkRadarChart({ 
  accountId, 
  segment 
}: CultureBenchmarkRadarChartProps) {
  const { comparisons, segmentName, isLoading } = useCultureBenchmark(
    accountId,
    segment
  );

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

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo por Pilar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">
            Sem dados suficientes para exibir o gráfico
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for radar chart
  const chartData = comparisons.map(comp => ({
    pillar: comp.pillarLabel,
    empresa: comp.companyScore,
    mercado: comp.marketAverage,
    fullMark: 10,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparativo por Pilar</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sua empresa vs {segmentName}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis 
              dataKey="pillar" 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 10]} 
              tick={{ fontSize: 10 }}
            />
            <Radar
              name="Sua Empresa"
              dataKey="empresa"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              name="Mercado"
              dataKey="mercado"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
