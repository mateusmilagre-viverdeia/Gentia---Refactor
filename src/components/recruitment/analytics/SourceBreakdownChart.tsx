import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSourceAnalytics, useMediumAnalytics, type SourceData } from "@/hooks/useSourceAnalytics";
import { useSourceROIAnalytics } from "@/hooks/useSourceROIAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, UserCheck, Target, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROIBySourceTable } from "./ROIBySourceTable";

interface SourceBreakdownChartProps {
  period: DashboardPeriod;
}

export function SourceBreakdownChart({ period }: SourceBreakdownChartProps) {
  const { data: sourceData, isLoading: sourceLoading } = useSourceAnalytics(period);
  const { data: mediumData, isLoading: mediumLoading } = useMediumAnalytics(period);

  const isLoading = sourceLoading || mediumLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Análise de Origem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!sourceData || sourceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Análise de Origem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum dado disponível</p>
            <p className="text-xs mt-1">Candidatos começarão a aparecer conforme se aplicam às vagas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totals = sourceData.reduce(
    (acc, item) => ({
      candidates: acc.candidates + item.candidates,
      hired: acc.hired + item.hired,
      qualified: acc.qualified + item.qualified,
    }),
    { candidates: 0, hired: 0, qualified: 0 }
  );

  const overallConversion = totals.candidates > 0 
    ? Math.round((totals.hired / totals.candidates) * 100 * 10) / 10 
    : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.sourceLabel || data.mediumLabel}</p>
          <p className="text-sm text-muted-foreground">
            Candidatos: <span className="font-medium text-foreground">{data.candidates}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Contratados: <span className="font-medium text-foreground">{data.hired}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Taxa de Conversão: <span className="font-medium text-foreground">{data.conversionRate}%</span>
          </p>
          {data.qualificationRate !== undefined && (
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
          <TrendingUp className="h-4 w-4" />
          Análise de Origem
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-bold">{totals.candidates}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs">Contratados</span>
            </div>
            <p className="text-2xl font-bold">{totals.hired}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">Conversão</span>
            </div>
            <p className="text-2xl font-bold">{overallConversion}%</p>
          </div>
        </div>

        <Tabs defaultValue="source" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="source">Por Origem</TabsTrigger>
            <TabsTrigger value="medium">Por Canal</TabsTrigger>
            <TabsTrigger value="roi" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ROI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="source">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis 
                  dataKey="sourceLabel" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="candidates" radius={[0, 4, 4, 0]}>
                  {sourceData.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Source details table */}
            <div className="mt-4 space-y-2">
              {sourceData.slice(0, 6).map((source) => (
                <div key={source.source} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: source.color }}
                    />
                    <span>{source.sourceLabel}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="font-medium">{source.candidates}</span>
                      <span className="text-muted-foreground ml-1">cand.</span>
                    </div>
                    <div>
                      <span className="font-medium">{source.hired}</span>
                      <span className="text-muted-foreground ml-1">cont.</span>
                    </div>
                    <div className={`min-w-[60px] ${source.conversionRate > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {source.conversionRate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="medium">
            {mediumData && mediumData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mediumData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="mediumLabel" 
                      type="category" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="candidates" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Medium details table */}
                <div className="mt-4 space-y-2">
                  {mediumData.slice(0, 6).map((medium) => (
                    <div key={medium.medium} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <span>{medium.mediumLabel}</span>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="font-medium">{medium.candidates}</span>
                          <span className="text-muted-foreground ml-1">cand.</span>
                        </div>
                        <div>
                          <span className="font-medium">{medium.hired}</span>
                          <span className="text-muted-foreground ml-1">cont.</span>
                        </div>
                        <div className={`min-w-[60px] ${medium.conversionRate > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                          {medium.conversionRate}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <p className="text-sm">Nenhum dado de canal disponível</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="roi">
            <ROIBySourceTable period={period} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
