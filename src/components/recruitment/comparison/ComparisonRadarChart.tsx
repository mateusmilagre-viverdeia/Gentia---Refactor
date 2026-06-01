import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CandidateComparisonData } from "@/types/candidate-comparison.types";

interface ComparisonRadarChartProps {
  candidates: CandidateComparisonData[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const DIMENSION_LABELS: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

export function ComparisonRadarChart({ candidates }: ComparisonRadarChartProps) {
  const chartData = useMemo(() => {
    const dimensions = ["D", "I", "S", "C"];

    return dimensions.map((dim) => {
      const dataPoint: Record<string, any> = {
        dimension: DIMENSION_LABELS[dim],
        fullMark: 100,
      };

      candidates.forEach((candidate, idx) => {
        const discData = candidate.scores.disc;
        if (discData) {
          const key = dim.toLowerCase() as "d" | "i" | "s" | "c";
          dataPoint[`candidate_${idx}`] = discData[key];
        } else {
          dataPoint[`candidate_${idx}`] = 0;
        }
      });

      return dataPoint;
    });
  }, [candidates]);

  const hasDiscData = candidates.some((c) => c.scores.disc !== null);

  if (!hasDiscData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação DISC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum candidato possui avaliação DISC
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparação de Perfis DISC</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickCount={5}
            />
            {candidates.map((candidate, idx) => (
              <Radar
                key={candidate.id}
                name={candidate.name}
                dataKey={`candidate_${idx}`}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => (
                <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
              )}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
