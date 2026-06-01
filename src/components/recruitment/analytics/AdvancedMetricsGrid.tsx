import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFunnelAnalytics } from "@/hooks/useFunnelAnalytics";
import { useJobAnalytics } from "@/hooks/useJobAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Briefcase, 
  UserCheck, 
  UserX,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedMetricsGridProps {
  period: DashboardPeriod;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

function MetricCard({ title, value, subtitle, icon, trend, color }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className={cn("p-1.5 rounded-lg", color || "bg-muted")}>
            {icon}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium mb-1",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AdvancedMetricsGrid({ period }: AdvancedMetricsGridProps) {
  const { data: funnel, isLoading: funnelLoading } = useFunnelAnalytics(period);
  const { data: jobs, isLoading: jobsLoading } = useJobAnalytics(period);

  const isLoading = funnelLoading || jobsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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

  // Calculate metrics
  const totalCandidates = funnel?.totalApplicants || 0;
  const totalHired = funnel?.totalHired || 0;
  const totalRejected = funnel?.totalRejected || 0;
  const conversionRate = funnel?.overallConversionRate || 0;
  const rejectionRate = funnel?.rejectionRate || 0;
  const avgTimeToHire = funnel?.averageTimeToHire;
  const bottleneck = funnel?.bottleneck;

  const activeJobs = jobs?.filter((j) => j.status === "active").length || 0;
  const totalJobs = jobs?.length || 0;

  // Calculate average score across all jobs
  const jobsWithScores = jobs?.filter((j) => j.averageScore !== null) || [];
  const avgScore = jobsWithScores.length > 0
    ? Math.round(
        (jobsWithScores.reduce((acc, j) => acc + (j.averageScore || 0), 0) / jobsWithScores.length) * 10
      ) / 10
    : null;

  const metrics: MetricCardProps[] = [
    {
      title: "Total de Candidatos",
      value: totalCandidates,
      subtitle: "no período selecionado",
      icon: <Users className="h-4 w-4 text-blue-600" />,
      color: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Taxa de Conversão",
      value: `${conversionRate}%`,
      subtitle: `${totalHired} contratados`,
      icon: <TrendingUp className="h-4 w-4 text-green-600" />,
      color: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Taxa de Rejeição",
      value: `${rejectionRate}%`,
      subtitle: `${totalRejected} rejeitados`,
      icon: <UserX className="h-4 w-4 text-red-600" />,
      color: "bg-red-100 dark:bg-red-900/30",
    },
    {
      title: "Tempo Médio",
      value: avgTimeToHire !== null ? `${avgTimeToHire}d` : "—",
      subtitle: "até contratação",
      icon: <Clock className="h-4 w-4 text-amber-600" />,
      color: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      title: "Vagas Ativas",
      value: activeJobs,
      subtitle: `de ${totalJobs} total`,
      icon: <Briefcase className="h-4 w-4 text-purple-600" />,
      color: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Contratados",
      value: totalHired,
      subtitle: "neste período",
      icon: <UserCheck className="h-4 w-4 text-emerald-600" />,
      color: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Score Médio",
      value: avgScore !== null ? avgScore.toString() : "—",
      subtitle: "das avaliações",
      icon: <Target className="h-4 w-4 text-indigo-600" />,
      color: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      title: "Gargalo",
      value: bottleneck || "Nenhum",
      subtitle: bottleneck ? "menor conversão" : "funil saudável",
      icon: <Zap className="h-4 w-4 text-orange-600" />,
      color: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
