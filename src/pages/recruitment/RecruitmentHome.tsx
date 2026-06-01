import { useState } from "react";
import { Link } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, Video, FileText, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, BarChart3, Settings, LayoutDashboard } from "lucide-react";
import { useRecruitmentDashboard, type DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { CandidatesOverTimeChart } from "@/components/recruitment/CandidatesOverTimeChart";
import { SlaOverviewCard } from "@/components/recruitment/SlaOverviewCard";
import { FunnelVisualization } from "@/components/recruitment/FunnelVisualization";
import { FunnelAnalyticsCards } from "@/components/recruitment/FunnelAnalyticsCards";
import { ConversionTrendChart } from "@/components/recruitment/ConversionTrendChart";
import { GlobalFunnelKanban } from "@/components/recruitment/GlobalFunnelKanban";
import { RecruitmentSetupChecklistCard } from "@/components/recruitment/RecruitmentSetupChecklistCard";

const periodOptions: DashboardPeriod[] = ["1d", "3d", "7d", "30d"];

const RecruitmentHome = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("7d");
  const { data: stats, isLoading } = useRecruitmentDashboard(selectedPeriod);

  const defaultStats = {
    candidates: { total: 0, new: 0, trend: "+0%", previousPeriodTotal: 0 },
    jobs: { active: 0, total: 0, draft: 0, paused: 0, closed: 0 },
    interviews: { pending: 0, inProgress: 0, completed: 0, total: 0 },
    applications: { new: 0, screening: 0, interview: 0, total: 0 },
  };

  const displayStats = stats || defaultStats;
  const trendIsPositive = displayStats.candidates.trend.startsWith("+") && displayStats.candidates.trend !== "+0%";

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        {/* Setup checklist (gamification) */}
        <RecruitmentSetupChecklistCard />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu funil de recrutamento</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="default" size="sm" asChild>
              <Link to="/atracao-contratacao/recrutamento/executivo">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard Executivo
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/atracao-contratacao/recrutamento/configuracoes">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/atracao-contratacao/recrutamento/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            {periodOptions.map((period) => (
              <Button
                key={period}
                variant={period === selectedPeriod ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div data-demo-anchor="dashboard-metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Candidates Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Candidatos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{displayStats.candidates.new}</div>
                  <p className="text-xs text-muted-foreground">
                    novos neste período
                  </p>
                  <div className={`mt-3 flex items-center gap-1 text-xs ${trendIsPositive ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {trendIsPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{displayStats.candidates.trend} em relação ao período anterior</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Interviews Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entrevistas
              </CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{displayStats.interviews.total}</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>Pendentes</span>
                      </div>
                      <span className="font-medium">{displayStats.interviews.pending}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-blue-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Em Progresso</span>
                      </div>
                      <span className="font-medium">{displayStats.interviews.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Concluídas</span>
                      </div>
                      <span className="font-medium">{displayStats.interviews.completed}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Applications Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aplicações
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{displayStats.applications.total}</div>
                  <p className="text-xs text-muted-foreground">
                    total de aplicações
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-blue-600">{displayStats.applications.new} novas</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-purple-600">{displayStats.applications.screening} triagem</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Jobs Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vagas
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{displayStats.jobs.active}</div>
                  <p className="text-xs text-muted-foreground">
                    posições ativas
                  </p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {displayStats.jobs.total} vagas no total
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SLA Overview */}
        <SlaOverviewCard />

        {/* Global Funnel Kanban */}
        <GlobalFunnelKanban period={selectedPeriod} />

        {/* Funnel Analytics Cards */}
        <FunnelAnalyticsCards period={selectedPeriod} />

        {/* Conversion Trend Chart - Week over Week Comparison */}
        <ConversionTrendChart period={selectedPeriod} />

        {/* Funnel Visualization */}
        <FunnelVisualization period={selectedPeriod} />

        {/* Candidates Over Time Chart */}
        <CandidatesOverTimeChart period={selectedPeriod} />
      </div>
    </RecruitmentLayout>
  );
};

export default RecruitmentHome;
