import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingDown, TrendingUp, Users, Calendar, AlertTriangle } from 'lucide-react';
import type { MemberParticipation } from '@/hooks/usePulseParticipationRanking';

interface InsightsProps {
  members: MemberParticipation[];
  engagementChartData: Array<{ date: string; participation: number }>;
  avgParticipationRate: number;
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function ParticipationInsights({ members, engagementChartData, avgParticipationRate }: InsightsProps) {
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];
    if (members.length === 0) return result;

    // 1. Trend comparison (split in half)
    if (engagementChartData.length >= 4) {
      const half = Math.floor(engagementChartData.length / 2);
      const recentAvg = engagementChartData.slice(half).reduce((s, d) => s + d.participation, 0) / (engagementChartData.length - half);
      const previousAvg = engagementChartData.slice(0, half).reduce((s, d) => s + d.participation, 0) / half;
      const diff = Math.round(recentAvg - previousAvg);
      if (diff > 0) {
        result.push({
          icon: <TrendingUp className="h-4 w-4 text-green-500" />,
          text: `A participação subiu ${diff}% em relação ao período anterior.`,
          type: 'positive',
        });
      } else if (diff < 0) {
        result.push({
          icon: <TrendingDown className="h-4 w-4 text-red-500" />,
          text: `A participação caiu ${Math.abs(diff)}% em relação ao período anterior.`,
          type: 'negative',
        });
      }
    }

    // 2. Team with lowest rate
    const teamMap = new Map<string, { name: string; rates: number[] }>();
    members.forEach((m) => {
      if (!m.teamName) return;
      if (!teamMap.has(m.teamId!)) teamMap.set(m.teamId!, { name: m.teamName, rates: [] });
      teamMap.get(m.teamId!)!.rates.push(m.participationRate);
    });
    const teamAvgs = Array.from(teamMap.values()).map((t) => ({
      name: t.name,
      avg: Math.round(t.rates.reduce((a, b) => a + b, 0) / t.rates.length),
    }));
    if (teamAvgs.length > 1) {
      const lowest = teamAvgs.sort((a, b) => a.avg - b.avg)[0];
      result.push({
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        text: `O time "${lowest.name}" tem a menor taxa de participação (${lowest.avg}%).`,
        type: 'negative',
      });
    }

    // 3. Never responded count
    const neverResponded = members.filter((m) => !m.lastResponseDate).length;
    if (neverResponded > 0) {
      result.push({
        icon: <Users className="h-4 w-4 text-red-500" />,
        text: `${neverResponded} membro${neverResponded > 1 ? 's' : ''} nunca respondeu o Pulse.`,
        type: 'negative',
      });
    }

    // 4. Best day of week
    if (engagementChartData.length >= 7) {
      const dayBuckets: Record<number, number[]> = {};
      for (let i = 0; i < 7; i++) dayBuckets[i] = [];
      engagementChartData.forEach((d) => {
        const parts = d.date.split('/');
        let dateObj: Date | null = null;
        if (parts.length === 2) {
          const now = new Date();
          dateObj = new Date(now.getFullYear(), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          dateObj = new Date(d.date);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          dayBuckets[dateObj.getDay()].push(d.participation);
        }
      });
      let bestDay = 0;
      let bestAvg = 0;
      Object.entries(dayBuckets).forEach(([day, vals]) => {
        if (vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          if (avg > bestAvg) {
            bestAvg = avg;
            bestDay = Number(day);
          }
        }
      });
      if (bestAvg > 0) {
        result.push({
          icon: <Calendar className="h-4 w-4 text-primary" />,
          text: `Melhor dia da semana: ${DAY_LABELS[bestDay]} (${Math.round(bestAvg)}% de participação).`,
          type: 'positive',
        });
      }
    }

    // 5. Goal achievement
    if (avgParticipationRate >= 80) {
      result.push({
        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
        text: `A meta de 80% está sendo atingida! Média atual: ${avgParticipationRate}%.`,
        type: 'positive',
      });
    } else {
      result.push({
        icon: <TrendingDown className="h-4 w-4 text-amber-500" />,
        text: `A participação (${avgParticipationRate}%) está abaixo da meta de 80%.`,
        type: 'negative',
      });
    }

    return result.slice(0, 5);
  }, [members, engagementChartData, avgParticipationRate]);

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Insights de Participação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">{insight.icon}</span>
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
