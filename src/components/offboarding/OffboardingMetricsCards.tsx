import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

interface OffboardingMetricsCardsProps {
  activeCount: number;
  completedCount: number;
  overdueTasksCount: number;
  totalProcesses: number;
  isLoading: boolean;
}

export const OffboardingMetricsCards = ({
  activeCount,
  completedCount,
  overdueTasksCount,
  totalProcesses,
  isLoading,
}: OffboardingMetricsCardsProps) => {
  const completionRate = totalProcesses > 0 
    ? Math.round((completedCount / totalProcesses) * 100) 
    : 0;

  const metrics = [
    {
      title: "Processos Ativos",
      value: activeCount,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Concluídos",
      value: completedCount,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Tarefas Atrasadas",
      value: overdueTasksCount,
      icon: AlertTriangle,
      color: overdueTasksCount > 0 ? "text-red-500" : "text-amber-500",
      bgColor: overdueTasksCount > 0 ? "bg-red-500/10" : "bg-amber-500/10",
    },
    {
      title: "Taxa de Conclusão",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-6">
            <div className={`p-3 rounded-lg ${metric.bgColor} w-fit mb-4`}>
              <metric.icon className={`h-6 w-6 ${metric.color}`} />
            </div>
            <p className="text-sm text-muted-foreground mb-1">{metric.title}</p>
            <p className="text-2xl font-semibold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
