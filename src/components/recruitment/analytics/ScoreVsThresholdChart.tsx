import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import type { AutomatedStepMetrics } from "@/hooks/useAutomatedStepsAnalytics";

interface ScoreVsThresholdChartProps {
  steps: AutomatedStepMetrics[];
  isLoading?: boolean;
}

const stepColors: Record<string, string> = {
  cultural: "hsl(330, 80%, 60%)",
  disc: "hsl(210, 80%, 55%)",
  technical: "hsl(40, 90%, 50%)",
};

export function ScoreVsThresholdChart({ steps, isLoading }: ScoreVsThresholdChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = steps.map((step) => ({
    name: step.label,
    score: Math.round(step.avgScore),
    threshold: Math.round(step.avgThreshold),
    stepType: step.stepType,
    difference: Math.round(step.avgScore - step.avgThreshold),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const isAbove = data.score >= data.threshold;

    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold">{data.name}</p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Score médio:</span>
            <span className="font-medium">{data.score}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Threshold:</span>
            <span className="font-medium">{data.threshold}</span>
          </div>
          <div className={`flex justify-between gap-4 pt-1 border-t ${isAbove ? "text-green-600" : "text-red-600"}`}>
            <span>Diferença:</span>
            <span className="font-semibold">
              {isAbove ? "+" : ""}
              {data.difference}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Score Médio vs Threshold
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry) => (
                <Cell key={entry.stepType} fill={stepColors[entry.stepType] || "hsl(var(--primary))"} />
              ))}
            </Bar>

            {/* Threshold lines */}
            {chartData.map((entry, index) => (
              <ReferenceLine
                key={`threshold-${index}`}
                x={entry.threshold}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="4 4"
                isFront
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Score Médio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-destructive" style={{ borderStyle: "dashed", borderWidth: 1 }} />
            <span className="text-muted-foreground">Threshold</span>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-4 space-y-2">
          {chartData.map((item) => {
            const isAbove = item.score >= item.threshold;
            const diff = Math.abs(item.difference);

            if (diff < 5) return null;

            return (
              <div
                key={item.stepType}
                className={`text-xs p-2 rounded ${
                  isAbove ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"
                }`}
              >
                {isAbove ? (
                  <>
                    <strong>{item.name}</strong>: Score {diff} pontos acima do threshold - candidatos bem qualificados
                  </>
                ) : (
                  <>
                    <strong>{item.name}</strong>: Score {diff} pontos abaixo do threshold - considere ajustar critérios
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
