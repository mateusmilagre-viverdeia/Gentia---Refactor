import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, Clock, AlertTriangle, TrendingUp, Users } from "lucide-react";
import type { CheckpointAnalytics } from "@/types/checkpoint-analytics.types";

interface CheckpointMetricCardsProps {
  analytics: CheckpointAnalytics;
}

export function CheckpointMetricCards({ analytics }: CheckpointMetricCardsProps) {
  const { historical, actions, upcoming, alerts } = analytics;

  const cards = [
    {
      title: "Realizados",
      value: historical.totalCompleted,
      subtitle: `${historical.completionRate}% taxa de conclusão`,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Agendados",
      value: upcoming.next7Days,
      subtitle: `${upcoming.next14Days} em 14 dias`,
      icon: Calendar,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Ações Pendentes",
      value: actions.pending + actions.inProgress,
      subtitle: `${actions.completionRate}% concluídas`,
      icon: Clock,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Ações Atrasadas",
      value: actions.overdue,
      subtitle: actions.overdue > 0 ? "Requer atenção" : "Tudo em dia",
      icon: AlertTriangle,
      iconColor: actions.overdue > 0 ? "text-red-600" : "text-muted-foreground",
      bgColor: actions.overdue > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50",
    },
    {
      title: "Média Entre CPs",
      value: `${historical.avgDaysBetweenCheckpoints}d`,
      subtitle: "dias entre checkpoints",
      icon: TrendingUp,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Clientes sem CP",
      value: upcoming.clientsWithoutFutureCheckpoint.length,
      subtitle: `${alerts.clientsInactive.length} inativos há 30+ dias`,
      icon: Users,
      iconColor: upcoming.clientsWithoutFutureCheckpoint.length > 0 ? "text-amber-600" : "text-muted-foreground",
      bgColor: upcoming.clientsWithoutFutureCheckpoint.length > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
