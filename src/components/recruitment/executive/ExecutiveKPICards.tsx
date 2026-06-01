import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Clock, 
  Target, 
  Activity, 
  Briefcase, 
  UserCheck,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react";
import type { ExecutiveDashboardData } from "@/hooks/useExecutiveDashboard";

interface ExecutiveKPICardsProps {
  data: ExecutiveDashboardData | undefined;
  isLoading: boolean;
  avgCostPerHire?: number | null;
}

export function ExecutiveKPICards({ data, isLoading, avgCostPerHire }: ExecutiveKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      label: "Contratações",
      value: data.kpis.totalHires,
      suffix: "",
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      trend: data.kpis.totalHires > data.kpis.totalHiresPreviousPeriod ? 'up' : 'down',
      change: data.kpis.totalHiresPreviousPeriod > 0 
        ? Math.round(((data.kpis.totalHires - data.kpis.totalHiresPreviousPeriod) / data.kpis.totalHiresPreviousPeriod) * 100)
        : null,
    },
    {
      label: "Tempo Médio",
      value: data.kpis.avgTimeToHire,
      suffix: " dias",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: null,
      change: null,
    },
    {
      label: "Fill Rate",
      value: data.kpis.fillRate,
      suffix: "%",
      icon: Target,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      trend: null,
      change: null,
    },
    {
      label: "Saúde Pipeline",
      value: data.kpis.pipelineHealth,
      suffix: "",
      icon: Activity,
      color: data.kpis.pipelineHealth >= 70 ? "text-emerald-600" : data.kpis.pipelineHealth >= 40 ? "text-amber-600" : "text-red-600",
      bgColor: data.kpis.pipelineHealth >= 70 ? "bg-emerald-50" : data.kpis.pipelineHealth >= 40 ? "bg-amber-50" : "bg-red-50",
      trend: null,
      change: null,
    },
    {
      label: "Vagas Ativas",
      value: data.kpis.activeJobs,
      suffix: "",
      icon: Briefcase,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: null,
      change: null,
    },
    {
      label: "No Pipeline",
      value: data.kpis.candidatesInPipeline,
      suffix: "",
      icon: Users,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      trend: null,
      change: null,
    },
    ...(avgCostPerHire != null ? [{
      label: "Custo/Contratação",
      value: `R$ ${avgCostPerHire.toFixed(2).replace('.', ',')}`,
      suffix: "",
      icon: DollarSign,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      trend: null as 'up' | 'down' | null,
      change: null as number | null,
    }] : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </span>
                <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{kpi.value}</span>
                <span className="text-sm text-muted-foreground">{kpi.suffix}</span>
              </div>
              {kpi.change !== null && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${kpi.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{kpi.change > 0 ? '+' : ''}{kpi.change}% vs período anterior</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
