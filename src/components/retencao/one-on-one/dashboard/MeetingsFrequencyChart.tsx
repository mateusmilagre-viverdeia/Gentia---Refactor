import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Users2 } from 'lucide-react';
import type { OneOnOneAnalytics } from '@/hooks/useOneOnOneMeetings';

interface MeetingsFrequencyChartProps {
  data: OneOnOneAnalytics['meetingsByCollaborator'];
}

export function MeetingsFrequencyChart({ data }: MeetingsFrequencyChartProps) {
  const chartData = data
    .map((item) => ({
      name: item.collaborator 
        ? `${item.collaborator.first_name || ''} ${item.collaborator.last_name || ''}`.trim() || 'Sem nome'
        : 'Colaborador',
      count: item.meetingCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const getBarColor = (count: number) => {
    if (count >= 4) return '#22c55e'; // green
    if (count >= 2) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Frequência por Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Nenhuma reunião registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Frequência por Colaborador
        </CardTitle>
        <CardDescription>
          Número de reuniões realizadas com cada pessoa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} reuniões`, 'Total']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
