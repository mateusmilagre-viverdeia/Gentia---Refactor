import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Layers } from 'lucide-react';
import type { PillarProgress } from '@/types/consulting-reports.types';

interface PillarProgressChartProps {
  pillarProgress: PillarProgress[] | null;
  loading?: boolean;
}

const PILLAR_COLORS = {
  completed: '#22c55e',
  in_progress: '#eab308',
  not_started: '#d4d4d8',
};

export function PillarProgressChart({ pillarProgress, loading }: PillarProgressChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pillarProgress || pillarProgress.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Sem dados de progresso</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = pillarProgress.map(p => ({
    name: p.label,
    percentage: p.percentage,
    status: p.status,
    stage: `${p.currentStage}/${p.maxStage}`,
  }));

  const getBarColor = (status: string) => {
    return PILLAR_COLORS[status as keyof typeof PILLAR_COLORS] || PILLAR_COLORS.not_started;
  };

  const completedCount = pillarProgress.filter(p => p.status === 'completed').length;
  const inProgressCount = pillarProgress.filter(p => p.status === 'in_progress').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Progresso por Pilar
            </CardTitle>
            <CardDescription>
              Andamento de cada pilar da metodologia
            </CardDescription>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Completo ({completedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Em andamento ({inProgressCount})</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 50, left: 80, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={75}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (${props.payload.stage})`,
                  'Progresso',
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                ))}
                <LabelList 
                  dataKey="percentage" 
                  position="right" 
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
