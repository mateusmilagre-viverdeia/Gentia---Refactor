import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckSquare } from 'lucide-react';
import type { ActionsSummary } from '@/types/consulting-reports.types';

interface ActionsCompletionChartProps {
  actionsSummary: ActionsSummary | null;
  loading?: boolean;
}

const COLORS = {
  completed: '#22c55e',
  inProgress: '#3b82f6',
  pending: '#eab308',
  overdue: '#ef4444',
};

export function ActionsCompletionChart({ actionsSummary, loading }: ActionsCompletionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!actionsSummary || actionsSummary.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Conclusão de Ações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Nenhuma ação registrada</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Concluídas', value: actionsSummary.completed, color: COLORS.completed },
    { name: 'Em Andamento', value: actionsSummary.inProgress, color: COLORS.inProgress },
    { name: 'Pendentes', value: actionsSummary.pending - actionsSummary.overdue, color: COLORS.pending },
    { name: 'Atrasadas', value: actionsSummary.overdue, color: COLORS.overdue },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Conclusão de Ações
            </CardTitle>
            <CardDescription>
              Distribuição do status das ações
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{actionsSummary.completionRate}%</p>
            <p className="text-xs text-muted-foreground">taxa de conclusão</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
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

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div>
            <p className="text-lg font-semibold text-green-600">{actionsSummary.completed}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-blue-600">{actionsSummary.inProgress}</p>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-yellow-600">{actionsSummary.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600">{actionsSummary.overdue}</p>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
