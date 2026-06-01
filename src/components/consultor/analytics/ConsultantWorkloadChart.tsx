import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';
import type { ConsultantPerformance } from '@/types/consulting-reports.types';

interface ConsultantWorkloadChartProps {
  consultants: ConsultantPerformance[];
  loading?: boolean;
}

export function ConsultantWorkloadChart({ consultants, loading }: ConsultantWorkloadChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (consultants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance por Consultor
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Nenhum consultor com projetos atribuídos</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = consultants
    .sort((a, b) => b.projectCount - a.projectCount)
    .slice(0, 8)
    .map(c => ({
      name: c.consultantName.split(' ')[0], // First name only for chart
      fullName: c.consultantName,
      projects: c.projectCount,
      avgHealth: c.avgHealthScore,
      pending: c.pendingActions,
      overdue: c.overdueActions,
    }));

  const getBarColor = (avgHealth: number) => {
    if (avgHealth >= 70) return '#22c55e';
    if (avgHealth >= 40) return '#eab308';
    return '#ef4444';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Performance por Consultor
        </CardTitle>
        <CardDescription>
          Projetos e health score médio por consultor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'projects') return [value, 'Projetos'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="projects" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.avgHealth)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-muted-foreground">Score ≥70</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-muted-foreground">Score 40-69</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-muted-foreground">Score &lt;40</span>
          </div>
        </div>

        {/* Summary table */}
        <div className="mt-4 space-y-2">
          {consultants.slice(0, 4).map((c) => (
            <div 
              key={c.consultantId} 
              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.consultantName}</span>
                <Badge variant="outline" className="text-xs">
                  {c.projectCount} projetos
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>Score: <span className="font-medium text-foreground">{c.avgHealthScore}</span></span>
                {c.overdueActions > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {c.overdueActions} atrasadas
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
