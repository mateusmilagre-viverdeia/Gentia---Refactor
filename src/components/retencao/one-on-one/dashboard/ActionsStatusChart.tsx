import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckSquare } from 'lucide-react';
import type { OneOnOneAnalytics } from '@/hooks/useOneOnOneMeetings';

interface ActionsStatusChartProps {
  actions: OneOnOneAnalytics['actions'];
}

const COLORS = {
  completed: '#22c55e',
  pending: '#eab308',
  overdue: '#ef4444',
};

export function ActionsStatusChart({ actions }: ActionsStatusChartProps) {
  const pendingNotOverdue = actions.pending - actions.overdue;
  
  const chartData = [
    { name: 'Concluídas', value: actions.completed, color: COLORS.completed },
    { name: 'Pendentes', value: pendingNotOverdue > 0 ? pendingNotOverdue : 0, color: COLORS.pending },
    { name: 'Atrasadas', value: actions.overdue, color: COLORS.overdue },
  ].filter(d => d.value > 0);

  if (actions.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Status das Ações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Nenhuma ação registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Status das Ações
            </CardTitle>
            <CardDescription>
              Distribuição das ações criadas nas reuniões
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{actions.completionRate}%</p>
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

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <p className="text-lg font-semibold text-emerald-600">{actions.completed}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-600">{pendingNotOverdue > 0 ? pendingNotOverdue : 0}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600">{actions.overdue}</p>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
