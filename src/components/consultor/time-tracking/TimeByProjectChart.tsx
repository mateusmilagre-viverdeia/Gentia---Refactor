import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { TimeEntrySummary } from "@/types/time-tracking.types";
import { formatDuration, minutesToHours } from "@/types/time-tracking.types";

interface TimeByProjectChartProps {
  summary: TimeEntrySummary;
}

const COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
  "#F97316",
];

export function TimeByProjectChart({ summary }: TimeByProjectChartProps) {
  const data = summary.byProject
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8)
    .map((project) => ({
      name: project.name.length > 15 ? project.name.slice(0, 15) + "..." : project.name,
      fullName: project.name,
      hours: minutesToHours(project.minutes),
      minutes: project.minutes,
    }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Projeto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Por Projeto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(value) => `${value}h`}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                fontSize={12}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name, props) => [
                  formatDuration(props.payload.minutes),
                  props.payload.fullName,
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
