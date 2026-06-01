import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MemberParticipation } from '@/hooks/usePulseParticipationRanking';

const PARTICIPATION_GOAL = 80;

interface ParticipationByTeamChartProps {
  members: MemberParticipation[];
}

export function ParticipationByTeamChart({ members }: ParticipationByTeamChartProps) {
  const teamData = useMemo(() => {
    const teamMap = new Map<string, { name: string; rates: number[] }>();

    members.forEach((m) => {
      const teamName = m.teamName || 'Sem time';
      const teamId = m.teamId || '__none__';
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, { name: teamName, rates: [] });
      }
      teamMap.get(teamId)!.rates.push(m.participationRate);
    });

    return Array.from(teamMap.values())
      .map((t) => ({
        name: t.name,
        rate: Math.round(t.rates.reduce((a, b) => a + b, 0) / t.rates.length),
        members: t.rates.length,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [members]);

  if (teamData.length === 0) {
    return null;
  }

  const chartHeight = Math.max(200, teamData.length * 44);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Participação por Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={teamData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} className="text-xs" unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value}% (${props.payload.members} membros)`,
                'Participação',
              ]}
            />
            <ReferenceLine
              x={PARTICIPATION_GOAL}
              stroke="hsl(var(--destructive))"
              strokeDasharray="3 3"
              label={{ value: `Meta ${PARTICIPATION_GOAL}%`, position: 'top', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Bar
              dataKey="rate"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              name="Participação"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
