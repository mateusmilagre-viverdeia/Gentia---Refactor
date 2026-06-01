import { Building2, Users, Activity, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardsProps {
  totalCompanies: number;
  totalMembers: number;
  activeToday: number;
  averageProgress: number;
}

export function MetricCards({ totalCompanies, totalMembers, activeToday, averageProgress }: MetricCardsProps) {
  const cards = [
    {
      label: "Empresas",
      value: totalCompanies,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Usuários",
      value: totalMembers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Ativos Hoje",
      value: activeToday,
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Média Progresso",
      value: `${averageProgress}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
