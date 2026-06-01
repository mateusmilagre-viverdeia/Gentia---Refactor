import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTouchComparisonAnalytics } from "@/hooks/useTouchComparisonAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from "recharts";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TouchComparisonChartProps {
  period: DashboardPeriod;
}

export function TouchComparisonChart({ period }: TouchComparisonChartProps) {
  const { data, isLoading } = useTouchComparisonAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4" />
            First Touch vs Last Touch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4" />
            First Touch vs Last Touch
          </CardTitle>
          <CardDescription>
            Comparação entre canal de aquisição e canal de conversão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <GitCompare className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhuma contratação no período</p>
            <p className="text-xs mt-1">Dados aparecerão conforme candidatos forem contratados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for insights
  const totalHires = data.reduce((sum, d) => sum + d.firstTouch, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4" />
          First Touch vs Last Touch
        </CardTitle>
        <CardDescription>
          <strong>First Touch:</strong> Canal onde o candidato foi adquirido •{" "}
          <strong>Last Touch:</strong> Último canal antes da contratação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="sourceLabel" 
                tick={{ fontSize: 12 }}
                width={75}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = data.find((d) => d.sourceLabel === label);
                  if (!item) return null;

                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold mb-2">{item.sourceLabel}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">First Touch (Aquisição):</span>
                          <span className="font-medium">{item.firstTouch}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Last Touch (Conversão):</span>
                          <span className="font-medium">{item.lastTouch}</span>
                        </div>
                        <div className="border-t pt-1 mt-1 flex justify-between gap-4">
                          <span className="text-muted-foreground">Diferença:</span>
                          <span className={`font-medium ${item.difference > 0 ? "text-emerald-600 dark:text-emerald-400" : item.difference < 0 ? "text-destructive" : ""}`}>
                            {item.difference > 0 ? "+" : ""}{item.difference}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend 
                formatter={(value) => value === "firstTouch" ? "First Touch (Aquisição)" : "Last Touch (Conversão)"}
              />
              <Bar 
                dataKey="firstTouch" 
                fill="hsl(var(--primary))" 
                name="firstTouch"
                radius={[0, 4, 4, 0]}
              />
              <Bar 
                dataKey="lastTouch" 
                fill="hsl(var(--chart-2))" 
                name="lastTouch"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Insights de Atribuição</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.slice(0, 4).map((item) => (
              <div 
                key={item.source}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
              >
                <span className="truncate">{item.sourceLabel}</span>
                <div className="flex items-center gap-1">
                  {item.difference > 0 ? (
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      +{item.difference}
                    </Badge>
                  ) : item.difference < 0 ? (
                    <Badge variant="outline" className="text-destructive border-destructive/30 gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {item.difference}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Minus className="h-3 w-3" />
                      0
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Diferença positiva = canal ajuda mais na conversão do que na aquisição
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
