import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import type { PortfolioSummary } from '@/types/consulting-reports.types';

interface ProjectsStatusDistributionProps {
  summary: PortfolioSummary | null;
  loading?: boolean;
}

const STATUS_COLORS = {
  healthy: '#22c55e',
  at_risk: '#eab308',
  critical: '#ef4444',
  unknown: '#a3a3a3',
};

const STATUS_LABELS = {
  healthy: 'Saudável',
  at_risk: 'Atenção',
  critical: 'Crítico',
  unknown: 'Desconhecido',
};

export function ProjectsStatusDistribution({ summary, loading }: ProjectsStatusDistributionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalProjects === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Nenhum projeto registrado</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = Object.entries(summary.projectsByStatus)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
      value,
      color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Distribuição por Status
        </CardTitle>
        <CardDescription>
          Status de saúde dos projetos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${value}`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          {Object.entries(summary.projectsByStatus).map(([key, value]) => (
            <div key={key}>
              <p 
                className="text-lg font-semibold"
                style={{ color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] }}
              >
                {value}
              </p>
              <p className="text-xs text-muted-foreground">
                {STATUS_LABELS[key as keyof typeof STATUS_LABELS]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
