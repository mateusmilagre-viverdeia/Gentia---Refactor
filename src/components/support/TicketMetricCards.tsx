import { Card, CardContent } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import type { TicketMetrics } from '@/types/support.types';
import { cn } from '@/lib/utils';

interface TicketMetricCardsProps {
  metrics: TicketMetrics;
}

export function TicketMetricCards({ metrics }: TicketMetricCardsProps) {
  const formatTime = (minutes: number | null): string => {
    if (minutes === null) return '-';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const cards = [
    {
      label: 'Abertos',
      value: metrics.byStatus.open,
      icon: Ticket,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Em Atendimento',
      value: metrics.byStatus.in_progress,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Resolvidos',
      value: metrics.byStatus.resolved + metrics.byStatus.closed,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Tempo Médio',
      value: formatTime(metrics.avgResolutionTime),
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      isText: true,
    },
    {
      label: 'SLA',
      value: `${metrics.slaComplianceRate}%`,
      icon: AlertTriangle,
      color: metrics.slaComplianceRate >= 90 ? 'text-green-500' : metrics.slaComplianceRate >= 70 ? 'text-amber-500' : 'text-red-500',
      bgColor: metrics.slaComplianceRate >= 90 ? 'bg-green-500/10' : metrics.slaComplianceRate >= 70 ? 'bg-amber-500/10' : 'bg-red-500/10',
      isText: true,
    },
    {
      label: 'Satisfação',
      value: metrics.avgSatisfactionRating ? `${metrics.avgSatisfactionRating}/5` : '-',
      subValue: metrics.satisfactionCount > 0 ? `(${metrics.satisfactionCount} avaliações)` : undefined,
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', card.bgColor)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={cn('text-xl font-semibold', card.isText && 'text-lg')}>
                  {card.value}
                </p>
                {card.subValue && (
                  <p className="text-xs text-muted-foreground">{card.subValue}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
