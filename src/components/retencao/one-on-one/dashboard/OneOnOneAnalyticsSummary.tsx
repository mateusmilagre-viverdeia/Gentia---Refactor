import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck2, TrendingUp, ListChecks, Users } from 'lucide-react';
import type { OneOnOneAnalytics } from '@/hooks/useOneOnOneMeetings';

interface OneOnOneAnalyticsSummaryProps {
  analytics: OneOnOneAnalytics;
}

export function OneOnOneAnalyticsSummary({ analytics }: OneOnOneAnalyticsSummaryProps) {
  const cards = [
    {
      title: 'Reuniões este Mês',
      value: analytics.thisMonth.completed,
      subtitle: `${analytics.thisMonth.scheduled} agendadas`,
      icon: CalendarCheck2,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Taxa de Conclusão',
      value: `${analytics.thisMonth.completionRate}%`,
      subtitle: 'reuniões realizadas',
      icon: TrendingUp,
      iconColor: analytics.thisMonth.completionRate >= 70 
        ? 'text-emerald-600' 
        : analytics.thisMonth.completionRate >= 40 
        ? 'text-amber-600' 
        : 'text-red-600',
      bgColor: analytics.thisMonth.completionRate >= 70 
        ? 'bg-emerald-50 dark:bg-emerald-950/30' 
        : analytics.thisMonth.completionRate >= 40 
        ? 'bg-amber-50 dark:bg-amber-950/30' 
        : 'bg-red-50 dark:bg-red-950/30',
    },
    {
      title: 'Ações Pendentes',
      value: analytics.actions.pending,
      subtitle: `${analytics.actions.overdue} atrasadas`,
      icon: ListChecks,
      iconColor: analytics.actions.overdue > 0 ? 'text-red-600' : 'text-amber-600',
      bgColor: analytics.actions.overdue > 0 
        ? 'bg-red-50 dark:bg-red-950/30' 
        : 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Colaboradores Ativos',
      value: analytics.collaborators.total,
      subtitle: `${analytics.collaborators.inactive.length} sem 1:1 recente`,
      icon: Users,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className={`text-2xl font-bold ${card.iconColor}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
