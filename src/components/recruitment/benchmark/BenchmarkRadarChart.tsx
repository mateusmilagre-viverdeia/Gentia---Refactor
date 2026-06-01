import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecruitmentBenchmark } from "@/hooks/useRecruitmentBenchmark";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";

interface BenchmarkRadarChartProps {
  period: DashboardPeriod;
  selectedSegment?: string;
}

export function BenchmarkRadarChart({ period, selectedSegment }: BenchmarkRadarChartProps) {
  const { comparisons, segmentName, isLoading } = useRecruitmentBenchmark(period, selectedSegment);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  // Normalize values for radar chart (0-100 scale)
  const radarData = comparisons.map((comp) => {
    const maxValue = Math.max(comp.companyValue, comp.marketValue) * 1.2;
    
    // For metrics where lower is better, invert the normalization
    let companyNormalized: number;
    let marketNormalized: number;
    
    if (comp.isPositiveBetter) {
      companyNormalized = (comp.companyValue / maxValue) * 100;
      marketNormalized = (comp.marketValue / maxValue) * 100;
    } else {
      // Invert for "lower is better" metrics
      companyNormalized = 100 - (comp.companyValue / maxValue) * 100;
      marketNormalized = 100 - (comp.marketValue / maxValue) * 100;
    }

    return {
      metric: comp.metricLabel.replace("Tempo Médio de Contratação", "Velocidade")
        .replace("Taxa de Rejeição", "Seletividade")
        .replace("Taxa de Conversão", "Conversão")
        .replace("Candidatos por Vaga", "Atração")
        .replace("Taxa de Preenchimento", "Preenchimento"),
      empresa: Math.round(companyNormalized),
      mercado: Math.round(marketNormalized),
      fullLabel: comp.metricLabel,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparativo Multidimensional</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sua empresa vs. {segmentName}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
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
              strokeDasharray="5 5"
              strokeWidth={2}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
