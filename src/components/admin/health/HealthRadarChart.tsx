import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface HealthRadarChartProps {
  scores: {
    usage_score: number;
    adoption_score: number;
    engagement_score: number;
    ai_consumption_score: number;
    billing_score: number;
    nps_score: number;
  };
}

export function HealthRadarChart({ scores }: HealthRadarChartProps) {
  const data = [
    { indicator: "Uso", value: scores.usage_score, fullMark: 100 },
    { indicator: "Adoção", value: scores.adoption_score, fullMark: 100 },
    { indicator: "Engajamento", value: scores.engagement_score, fullMark: 100 },
    { indicator: "Consumo IA", value: scores.ai_consumption_score, fullMark: 100 },
    { indicator: "Pagamento", value: scores.billing_score, fullMark: 100 },
    { indicator: "NPS", value: scores.nps_score, fullMark: 100 },
  ];

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="indicator"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="hsl(var(--border))"
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              color: "hsl(var(--popover-foreground))",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
