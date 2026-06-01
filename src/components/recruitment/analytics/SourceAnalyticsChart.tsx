import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSourceAnalytics, type SourceData } from "@/hooks/useSourceAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Users } from "lucide-react";

interface SourceAnalyticsChartProps {
  period: DashboardPeriod;
}

export function SourceAnalyticsChart({ period }: SourceAnalyticsChartProps) {
  const { data: sourceData, isLoading } = useSourceAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Fonte dos Candidatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!sourceData || sourceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Fonte dos Candidatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = sourceData.map((item) => ({
    name: item.sourceLabel,
    value: item.candidates,
    color: item.color,
    conversionRate: item.conversionRate,
    qualificationRate: item.qualificationRate,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Candidatos: <span className="font-medium text-foreground">{data.value}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Taxa de Conversão: <span className="font-medium text-foreground">{data.conversionRate}%</span>
          </p>
          {data.qualificationRate > 0 && (
            <p className="text-sm text-muted-foreground">
              Taxa de Qualificação: <span className="font-medium text-foreground">{data.qualificationRate}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Fonte dos Candidatos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Source stats table */}
        <div className="mt-4 space-y-2">
          {sourceData.slice(0, 5).map((source) => (
            <div key={source.source} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: source.color }}
                />
                <span className="text-muted-foreground">{source.sourceLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">{source.candidates}</span>
                <span className={`text-xs min-w-[50px] text-right ${source.conversionRate > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {source.conversionRate}% conv.
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
