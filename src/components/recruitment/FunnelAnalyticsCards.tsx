import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFunnelAnalytics } from "@/hooks/useFunnelAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle,
  UserCheck,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelAnalyticsCardsProps {
  period: DashboardPeriod;
}

export function FunnelAnalyticsCards({ period }: FunnelAnalyticsCardsProps) {
  const { data: analytics, isLoading } = useFunnelAnalytics(period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const cards = [
    {
      title: "Taxa de Conversão",
      value: `${analytics.overallConversionRate}%`,
      subtitle: `${analytics.totalHired} de ${analytics.totalApplicants} candidatos`,
      icon: analytics.overallConversionRate >= 10 ? TrendingUp : TrendingDown,
      iconColor: analytics.overallConversionRate >= 10 ? "text-green-600" : "text-red-600",
      valueColor: analytics.overallConversionRate >= 10 ? "text-green-600" : "text-red-600",
    },
    {
      title: "Taxa de Rejeição",
      value: `${analytics.rejectionRate}%`,
      subtitle: `${analytics.totalRejected} candidatos rejeitados`,
      icon: UserX,
      iconColor: "text-red-500",
      valueColor: analytics.rejectionRate > 50 ? "text-red-600" : "text-muted-foreground",
    },
    {
      title: "Tempo Médio",
      value: analytics.averageTimeToHire !== null 
        ? `${analytics.averageTimeToHire} dias` 
        : "—",
      subtitle: "até contratação",
      icon: Clock,
      iconColor: "text-blue-500",
      valueColor: "text-foreground",
    },
    {
      title: "Gargalo",
      value: analytics.bottleneck || "Nenhum",
      subtitle: analytics.bottleneck ? "menor conversão" : "funil saudável",
      icon: AlertTriangle,
      iconColor: analytics.bottleneck ? "text-amber-500" : "text-green-500",
      valueColor: analytics.bottleneck ? "text-amber-600" : "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {card.title}
              </span>
              <card.icon className={cn("h-4 w-4", card.iconColor)} />
            </div>
            <div className={cn("text-2xl font-bold", card.valueColor)}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
