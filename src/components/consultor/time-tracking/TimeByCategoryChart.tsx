import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { TimeEntrySummary, TimeEntryCategory } from "@/types/time-tracking.types";
import { TIME_CATEGORY_LABELS, TIME_CATEGORY_COLORS, formatDuration } from "@/types/time-tracking.types";

interface TimeByCategoryChartProps {
  summary: TimeEntrySummary;
}

export function TimeByCategoryChart({ summary }: TimeByCategoryChartProps) {
  const data = Object.entries(summary.byCategory)
    .filter(([_, minutes]) => minutes > 0)
    .map(([category, minutes]) => ({
      name: TIME_CATEGORY_LABELS[category as TimeEntryCategory],
      value: minutes,
      color: TIME_CATEGORY_COLORS[category as TimeEntryCategory],
    }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Categoria</CardTitle>
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
        <CardTitle className="text-lg">Por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatDuration(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend
                formatter={(value, entry) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
