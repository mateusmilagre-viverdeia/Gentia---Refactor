import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Activity, CheckSquare, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import type { PortfolioSummary } from '@/types/consulting-reports.types';

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary | null;
  loading?: boolean;
}

export function PortfolioSummaryCards({ summary, loading }: PortfolioSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const cards = [
    {
      title: 'Total de Projetos',
      value: summary.totalProjects,
      icon: Building2,
      description: `${summary.projectsByStatus.healthy} saudáveis`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Health Score Médio',
      value: `${summary.avgHealthScore}%`,
      icon: Activity,
      description: `${summary.avgProgress}% progresso médio`,
      color: summary.avgHealthScore >= 70 ? 'text-green-600' : summary.avgHealthScore >= 40 ? 'text-yellow-600' : 'text-red-600',
      bgColor: summary.avgHealthScore >= 70 ? 'bg-green-50 dark:bg-green-950/30' : summary.avgHealthScore >= 40 ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-red-50 dark:bg-red-950/30',
    },
    {
      title: 'Ações Pendentes',
      value: summary.pendingActions,
      icon: CheckSquare,
      description: `${summary.overdueActions} atrasadas`,
      color: summary.overdueActions > 0 ? 'text-red-600' : 'text-yellow-600',
      bgColor: summary.overdueActions > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    {
      title: 'Projetos em Risco',
      value: summary.projectsByStatus.at_risk + summary.projectsByStatus.critical,
      icon: AlertTriangle,
      description: `${summary.projectsByStatus.critical} críticos`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
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
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
