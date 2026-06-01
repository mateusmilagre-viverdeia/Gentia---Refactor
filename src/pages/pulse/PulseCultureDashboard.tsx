import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePulseCultureMetrics } from '@/hooks/usePulseCultureMetrics';
import { usePulseCultureQuestions } from '@/hooks/usePulseCultureQuestions';
import { usePulseTeams } from '@/hooks/usePulseTeams';
import { usePulseActions } from '@/hooks/usePulseActions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CultureRadarChart,
  CultureTrendLine,
  CulturePillarBars,
  CultureValuesHeatmap,
  CultureHealthScore,
  CultureAlertsPanel,
  CultureTeamFilter,
  CultureQuestionRanking,
  CultureActionPlan,
} from '@/components/pulse/culture';
import { CultureTrendComparison } from '@/components/pulse/culture/CultureTrendComparison';
import { PulsePeriodFilter } from '@/components/pulse/dashboard/PulsePeriodFilter';
import { CultureValueEvolution } from '@/components/pulse/culture/CultureValueEvolution';
import { CulturePillarTrends } from '@/components/pulse/culture/CulturePillarTrends';
import {
  CultureBenchmarkScoreCard,
  CultureBenchmarkRadarChart,
  CultureBenchmarkComparisonGrid,
  CultureBenchmarkInsightsCard,
  CultureSegmentSelector,
} from '@/components/pulse/culture/benchmark';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Target,
  Users,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Settings,
  BarChart3,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mapSectorToCultureSegment } from '@/data/cultureBenchmarks';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function PulseCultureDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [selectedBenchmarkSegment, setSelectedBenchmarkSegment] = useState<string>('geral');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'custom'>(30);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();

  const metrics = usePulseCultureMetrics(accountId);
  const questions = usePulseCultureQuestions(accountId);
  const teamsHook = usePulseTeams(accountId);
  const actionsHook = usePulseActions(accountId);

  // Unified sync: metrics + questions
  const syncAll = async () => {
    if (!accountId) return;
    setIsSyncing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await Promise.all([
        supabase.functions.invoke('aggregate-culture-metrics', { body: { date: today } }),
        questions.syncQuestions(),
      ]);
      await metrics.fetchMetrics();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Set benchmark segment based on organization sector
  useEffect(() => {
    if (currentOrganization?.sector) {
      setSelectedBenchmarkSegment(mapSectorToCultureSegment(currentOrganization.sector));
    }
  }, [currentOrganization?.sector]);

  // Check access
  useEffect(() => {
    async function checkAccess() {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('id', user.id)
          .single();

        if (profile?.account_id) {
          setAccountId(profile.account_id);
          const { data: pulseProfile } = await supabase
            .from('pulse_user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .eq('account_id', profile.account_id)
            .eq('is_active', true)
            .single();

          const { data: accountMember } = await supabase
            .from('account_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('account_id', profile.account_id)
            .single();

          const isPulseAdmin = pulseProfile?.role === 'admin_rh';
          const isPulseLeader = pulseProfile?.role === 'leader';
          const isAccountAdmin = accountMember?.role === 'owner' || accountMember?.role === 'admin' || accountMember?.role === 'admin_rh';
          setIsAdmin(isPulseAdmin || isPulseLeader || isAccountAdmin);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setIsAdmin(false);
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAccess();
  }, [user?.id]);

  // Fetch data
  useEffect(() => {
    if (accountId && isAdmin) {
      metrics.fetchMetrics();
      questions.fetchQuestions();
      teamsHook.fetchTeams();
    }
  }, [accountId, isAdmin]);

  // Tab indicator calculations
  const hasLowValue = useMemo(() => metrics.valueScores.some(v => v.score < 5.0), [metrics.valueScores]);
  const hasLowPillar = useMemo(() => metrics.pillarScores.some(p => p.score < 6.0), [metrics.pillarScores]);
  const hasNegativeTrend = metrics.summary.trendValue < -0.5;

  const alertsCount = useMemo(() => {
    let count = 0;
    metrics.pillarScores.forEach(p => { if (p.score < 5.0) count++; else if (p.score < 6.0) count++; });
    metrics.valueScores.forEach(v => { if (v.score < 5.0) count++; });
    if (hasNegativeTrend) count++;
    if (metrics.summary.participationRate > 0 && metrics.summary.participationRate < 50) count++;
    return count;
  }, [metrics.pillarScores, metrics.valueScores, hasNegativeTrend, metrics.summary.participationRate]);

  const pillarCoverage = useMemo(() => {
    return Math.round((metrics.pillarScores.length / 8) * 100);
  }, [metrics.pillarScores]);

  // Real trend data for CultureTrendComparison
  const realCurrentPillarScores = useMemo(() => {
    return metrics.pillarScores.reduce((acc, p) => {
      acc[p.pillar] = p.score;
      return acc;
    }, {} as Record<string, number>);
  }, [metrics.pillarScores]);

  const realPreviousPillarScores = useMemo(() => {
    return metrics.previousPillarScores.reduce((acc, p) => {
      acc[p.pillar] = p.score;
      return acc;
    }, {} as Record<string, number>);
  }, [metrics.previousPillarScores]);

  // Real pillar trends for CulturePillarTrends
  const realPillarTrends = useMemo(() => {
    return metrics.pillarScores.map(p => {
      const prev = metrics.previousPillarScores.find(pp => pp.pillar === p.pillar);
      const previousScore = prev?.score ?? p.score;
      const diff = p.score - previousScore;
      return {
        pillar: p.pillar,
        name: p.pillar_name,
        currentScore: p.score,
        previousScore,
        trend: diff > 0.3 ? 'up' as const : diff < -0.3 ? 'down' as const : 'stable' as const,
        trendValue: Math.round(diff * 10) / 10,
      };
    });
  }, [metrics.pillarScores, metrics.previousPillarScores]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loadingAuth) {
    return (
      <AppLayout title="Gestor de Cultura">
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="Acesso Restrito">
        <div className="container mx-auto py-6">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>
                O Gestor de Cultura está disponível apenas para administradores e líderes.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => navigate('/retencao/pulse')}>
                Voltar para o Pulse
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Gestor de Cultura"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Retenção', href: '/retencao' },
        { label: 'Pulse', href: '/retencao/pulse/hub' },
        { label: 'Cultura' }
      ]}
    >
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary" />
              Gestor de Cultura
            </h1>
            <p className="text-muted-foreground">
              Acompanhe se a cultura organizacional está sendo vivida no dia a dia.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CultureTeamFilter
              teams={teamsHook.teams}
              selectedTeamId={selectedTeamId}
              onTeamChange={setSelectedTeamId}
              loading={teamsHook.loading}
            />
            <PulsePeriodFilter
              selectedPeriod={selectedPeriod}
              onPeriodChange={(days) => {
                setSelectedPeriod(days);
                if (accountId && isAdmin) metrics.fetchByPeriod(days);
              }}
              onCustomRangeChange={(startDate, endDate) => {
                setSelectedPeriod('custom');
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                if (accountId && isAdmin) metrics.fetchMetrics(diffDays);
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                metrics.fetchMetrics();
                questions.fetchQuestions();
              }}
              disabled={metrics.loading}
            >
              <RefreshCw className={cn("h-4 w-4", metrics.loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              onClick={syncAll}
              disabled={isSyncing || questions.syncing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Button onClick={() => navigate('/retencao/pulse/admin')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>

        {/* KPI Cards — 3 cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CultureHealthScore
            summary={metrics.summary}
            pillarCoverage={pillarCoverage}
            alertsCount={alertsCount}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Culture Score</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  {metrics.summary.overallScore.toFixed(1)}/10
                </div>
                <div className="flex items-center text-sm">
                  <TrendIcon trend={metrics.summary.trend} />
                  <span className={cn(
                    metrics.summary.trend === 'up' ? 'text-green-500' : 
                    metrics.summary.trend === 'down' ? 'text-red-500' : 
                    'text-muted-foreground'
                  )}>
                    {metrics.summary.trendValue > 0 ? '+' : ''}{metrics.summary.trendValue}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs. período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participação</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">{metrics.summary.participationRate}%</div>
                <div className="text-xs text-muted-foreground">meta: 80%</div>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    metrics.summary.participationRate >= 80 ? "bg-green-500" :
                    metrics.summary.participationRate >= 50 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, metrics.summary.participationRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Heart className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="values" className="gap-2 relative">
              <Target className="h-4 w-4" />
              Valores
              {hasLowValue && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="pillars" className="gap-2 relative">
              <Sparkles className="h-4 w-4" />
              Pilares
              {hasLowPillar && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2 relative">
              <TrendingUp className="h-4 w-4" />
              Tendências
              {hasNegativeTrend && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2 relative">
              <Bell className="h-4 w-4" />
              Alertas
              {alertsCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                  {alertsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Benchmark
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <CultureRadarChart data={metrics.pillarScores} loading={metrics.loading} />
              <CultureTrendLine data={metrics.chartData} loading={metrics.loading} />
            </div>

            {/* Top & Low Values */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Valores Mais Fortes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.summary.topValues.length > 0 ? (
                    <div className="space-y-3">
                      {metrics.summary.topValues.map((v) => (
                        <div key={v.name} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{v.name}</span>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {v.score.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Valores que Precisam Atenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.summary.lowValues.length > 0 ? (
                    <div className="space-y-3">
                      {metrics.summary.lowValues.map((v) => (
                        <div key={v.name} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{v.name}</span>
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            {v.score.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Question Ranking */}
            <CultureQuestionRanking accountId={accountId} days={selectedPeriod === 'custom' ? 30 : selectedPeriod} />
          </TabsContent>

          <TabsContent value="values" className="space-y-4">
            <CultureValuesHeatmap data={metrics.valueScores} loading={metrics.loading} />
          </TabsContent>

          <TabsContent value="pillars" className="space-y-4">
            {/* Only bars, no duplicate radar */}
            <CulturePillarBars data={metrics.pillarScores} loading={metrics.loading} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Análise de Tendências</h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe a evolução dos pilares e valores culturais ao longo do tempo
                </p>
              </div>
            </div>

            {metrics.chartData.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Dados de tendência em construção</p>
                    <p className="text-sm mt-1">
                      As métricas serão agregadas automaticamente após as respostas do Pulse.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Real Trend Comparison */}
                <CultureTrendComparison
                  current={{
                    overallScore: metrics.summary.overallScore,
                    pillarScores: realCurrentPillarScores,
                  }}
                  previous={{
                    overallScore: metrics.previousOverallScore,
                    pillarScores: realPreviousPillarScores,
                  }}
                  loading={metrics.loading}
                />

                {/* Real Pillar Trends */}
                <CulturePillarTrends
                  chartData={metrics.pillarChartData as Array<{ date: string; [key: string]: string | number }>}
                  pillarTrends={realPillarTrends}
                  selectedPillar={selectedPillar ?? undefined}
                  onSelectPillar={setSelectedPillar}
                  loading={metrics.loading}
                />

                {/* Real Value Evolution */}
                <CultureValueEvolution
                  data={metrics.valueChartData as Array<{ date: string; [key: string]: string | number }>}
                  values={metrics.valueScores.slice(0, 6).map(v => v.value)}
                  loading={metrics.loading}
                />
              </div>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <CultureAlertsPanel
              summary={metrics.summary}
              pillarScores={metrics.pillarScores}
              valueScores={metrics.valueScores}
              onCreateAction={actionsHook.createAction}
            />
            <CultureActionPlan
              actions={actionsHook.actions}
              loading={actionsHook.loading}
              onFetch={actionsHook.fetchActions}
              onUpdateStatus={actionsHook.updateStatus}
              onDelete={actionsHook.deleteAction}
            />
          </TabsContent>

          <TabsContent value="benchmark" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Benchmark de Cultura</h3>
                <p className="text-sm text-muted-foreground">
                  Compare sua cultura organizacional com empresas do mesmo setor
                </p>
              </div>
              <CultureSegmentSelector
                value={selectedBenchmarkSegment}
                onChange={setSelectedBenchmarkSegment}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <CultureBenchmarkScoreCard accountId={accountId} segment={selectedBenchmarkSegment} />
              <CultureBenchmarkRadarChart accountId={accountId} segment={selectedBenchmarkSegment} />
            </div>
            <CultureBenchmarkComparisonGrid accountId={accountId} segment={selectedBenchmarkSegment} />
            <CultureBenchmarkInsightsCard accountId={accountId} segment={selectedBenchmarkSegment} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
