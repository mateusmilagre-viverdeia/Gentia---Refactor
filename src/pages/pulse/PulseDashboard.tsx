import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePulseMetrics } from '@/hooks/usePulseMetrics';
import { usePulseActions } from '@/hooks/usePulseActions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PulseParticipationRanking } from '@/components/pulse/dashboard/PulseParticipationRanking';
import { PulsePeriodFilter } from '@/components/pulse/dashboard/PulsePeriodFilter';
import { ParticipationAlertsPanel } from '@/components/pulse/dashboard/ParticipationAlertsPanel';
import { ParticipationByTeamChart } from '@/components/pulse/dashboard/ParticipationByTeamChart';
import { ParticipationWeeklyHeatmap } from '@/components/pulse/dashboard/ParticipationWeeklyHeatmap';
import { ParticipationInsights } from '@/components/pulse/dashboard/ParticipationInsights';
import { OrganizationalHealthScore } from '@/components/pulse/dashboard/OrganizationalHealthScore';
import { DriverTrendChart } from '@/components/pulse/dashboard/DriverTrendChart';
import { TeamEngagementFilter } from '@/components/pulse/dashboard/TeamEngagementFilter';
import { EngagementParticipationCorrelation } from '@/components/pulse/dashboard/EngagementParticipationCorrelation';
import { CreateActionFromAlertDialog } from '@/components/pulse/dashboard/CreateActionFromAlertDialog';
import { usePulseParticipationRanking } from '@/hooks/usePulseParticipationRanking';
import { getEngagementColor, getEngagementBgColor, getEngagementLabel } from '@/utils/pulseEngagementColors';
import { cn } from '@/lib/utils';
import type { PulseAlert } from '@/hooks/usePulseMetrics';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Activity,
  Bell,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

export default function PulseDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const initialTab = searchParams.get('tab') || 'engagement';

  const [selectedPeriod, setSelectedPeriod] = useState<number | 'custom'>(30);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [actionAlert, setActionAlert] = useState<PulseAlert | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const dashboard = usePulseMetrics(accountId);
  const pulseActions = usePulseActions(accountId);
  const participationRanking = usePulseParticipationRanking(accountId);
  const effectivePeriodDays = typeof selectedPeriod === 'number' ? selectedPeriod : 30;

  const handlePeriodChange = useCallback((days: number) => {
    setSelectedPeriod(days);
    if (accountId && isAdmin) {
      dashboard.fetchByPeriod(days);
    }
  }, [accountId, isAdmin, dashboard.fetchByPeriod]);

  const handleCustomRangeChange = useCallback((startDate: string, endDate: string) => {
    setSelectedPeriod('custom');
    if (accountId && isAdmin) {
      dashboard.fetchMetrics(startDate, endDate);
    }
  }, [accountId, isAdmin, dashboard.fetchMetrics]);

  // Toggle benchmark
  useEffect(() => {
    if (showBenchmark && typeof selectedPeriod === 'number') {
      dashboard.fetchPreviousPeriod(selectedPeriod);
    }
  }, [showBenchmark, selectedPeriod]);

  const periodLabel = selectedPeriod === 'custom'
    ? 'Período personalizado'
    : selectedPeriod === 365
    ? 'Último ano'
    : `Últimos ${selectedPeriod} dias`;

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
      dashboard.fetchAll();
      participationRanking.fetchParticipation(effectivePeriodDays);
    }
  }, [accountId, isAdmin]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loadingAuth) {
    return (
      <AppLayout title="Dashboard do Pulse">
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
                O dashboard está disponível apenas para administradores e líderes.
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

  const unreadAlerts = dashboard.alerts.filter(a => !a.is_read && !a.is_resolved);

  // Tab badge helpers
  const engagementDotColor = dashboard.summary.overallEngagement >= 70
    ? 'bg-green-500'
    : dashboard.summary.overallEngagement >= 40
    ? 'bg-amber-500'
    : 'bg-red-500';

  const participationBelowGoal = dashboard.summary.participationRate < 80;

  // Get chart data (filtered by team if selected)
  const activeChartData = selectedTeamId
    ? dashboard.getTeamEngagementChartData(selectedTeamId)
    : dashboard.engagementChartData;

  // Merge benchmark data
  const chartDataWithBenchmark = showBenchmark && dashboard.previousPeriodChartData.length > 0
    ? activeChartData.map((d, i) => ({
        ...d,
        prevEngagement: dashboard.previousPeriodChartData[i]?.engagement ?? null,
      }))
    : activeChartData;

  // Drivers as horizontal bars (sorted desc)
  const sortedDrivers = [...dashboard.driverScores].sort((a, b) => b.score - a.score);

  return (
    <AppLayout title="Dashboard do Pulse">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard do Pulse</h1>
            <p className="text-muted-foreground">
              Acompanhe o engajamento e bem-estar da sua equipe em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PulsePeriodFilter
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
              onCustomRangeChange={handleCustomRangeChange}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => dashboard.fetchAll()}
              disabled={dashboard.loading}
            >
              <RefreshCw className={`h-4 w-4 ${dashboard.loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/retencao/pulse/admin')}>
              Administrar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* KPI Cards — 3 cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Health Score */}
          <OrganizationalHealthScore
            summary={dashboard.summary}
            alertsCount={unreadAlerts.length}
          />

          {/* Engagement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engajamento Geral</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", getEngagementBgColor(dashboard.summary.overallEngagement))} />
                <div className={cn("text-2xl font-bold", getEngagementColor(dashboard.summary.overallEngagement))}>
                  {dashboard.summary.overallEngagement}%
                </div>
                <div className="flex items-center text-sm">
                  <TrendIcon trend={dashboard.summary.trend} />
                  <span className={dashboard.summary.trend === 'up' ? 'text-green-500' : dashboard.summary.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
                    {dashboard.summary.trendValue > 0 ? '+' : ''}{dashboard.summary.trendValue}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getEngagementLabel(dashboard.summary.overallEngagement)} • vs. período anterior
              </p>
            </CardContent>
          </Card>

          {/* Participation with goal */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Participação</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={cn("text-2xl font-bold", participationBelowGoal ? 'text-amber-600' : 'text-green-600')}>
                  {dashboard.summary.participationRate}%
                </div>
                {participationBelowGoal && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    Abaixo da meta
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboard.summary.activeUsers} de {dashboard.summary.totalUsers} responderam • Meta: 80%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs with badges */}
        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="engagement" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Engajamento
              <span className={cn("w-2 h-2 rounded-full", engagementDotColor)} />
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2">
              <Activity className="h-4 w-4" />
              Drivers
            </TabsTrigger>
            <TabsTrigger value="participation" className="gap-2">
              <Users className="h-4 w-4" />
              Participação
              {participationBelowGoal && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alertas
              {unreadAlerts.length > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">
                  {unreadAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            {/* Controls row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TeamEngagementFilter
                accountId={accountId}
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="benchmark-toggle"
                  checked={showBenchmark}
                  onCheckedChange={setShowBenchmark}
                  disabled={selectedPeriod === 'custom'}
                />
                <Label htmlFor="benchmark-toggle" className="text-sm">Comparar período anterior</Label>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução do Engajamento</CardTitle>
                  <CardDescription>
                    {periodLabel}
                    {selectedTeamId && ' • Filtrado por time'}
                    {showBenchmark && ' • Com benchmark'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.loading ? (
                    <Skeleton className="h-[300px]" />
                  ) : chartDataWithBenchmark.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartDataWithBenchmark}>
                        <defs>
                          <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="engagement"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorEngagement)"
                          name="Engajamento"
                        />
                        {showBenchmark && (
                          <Area
                            type="monotone"
                            dataKey="prevEngagement"
                            stroke="hsl(var(--muted-foreground))"
                            fill="none"
                            strokeDasharray="5 5"
                            name="Período anterior"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível ainda
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Correlation scatter replaces old participation bar chart */}
              <EngagementParticipationCorrelation
                engagementChartData={dashboard.engagementChartData}
                loading={dashboard.loading}
              />
            </div>
          </TabsContent>

          {/* Drivers Tab — horizontal bars + trend chart */}
          <TabsContent value="drivers" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Horizontal bars */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score por Driver</CardTitle>
                  <CardDescription>Visão geral por driver</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.loading ? (
                    <Skeleton className="h-[350px]" />
                  ) : sortedDrivers.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={sortedDrivers}>
                        <PolarGrid className="stroke-muted" />
                        <PolarAngleAxis
                          dataKey="driver_name"
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value}%`, 'Score']}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado de drivers disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trends list */}
              <Card>
                <CardHeader>
                  <CardDescription>Tendência do período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboard.loading ? (
                      <>
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
                      </>
                    ) : dashboard.driverScores.length > 0 ? (
                      dashboard.driverScores.map(driver => (
                        <div
                          key={driver.driver_key}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full", getEngagementBgColor(driver.score))} />
                            <div>
                              <div className="font-medium">{driver.driver_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {driver.response_count} respostas
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={cn("font-bold text-lg", getEngagementColor(driver.score))}>
                                {driver.score}%
                              </div>
                            </div>
                            <TrendIcon trend={driver.trend} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum dado de drivers disponível
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* Participation Tab — compact layout */}
          <TabsContent value="participation" className="space-y-4">
            {/* Insights */}
            <ParticipationInsights
              members={participationRanking.allMembers}
              engagementChartData={dashboard.engagementChartData}
              avgParticipationRate={participationRanking.stats.avgParticipationRate}
            />

            {/* Evolution chart + Heatmap */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Evolução da Participação</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.loading ? (
                    <Skeleton className="h-[250px]" />
                  ) : dashboard.engagementChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={dashboard.engagementChartData}>
                        <defs>
                          <linearGradient id="colorParticipation" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <ReferenceLine
                          y={80}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="3 3"
                          label={{ value: 'Meta 80%', position: 'right', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="participation"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorParticipation)"
                          name="Participação %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              <ParticipationWeeklyHeatmap engagementChartData={dashboard.engagementChartData} />
            </div>

            {/* Team comparison */}
            <ParticipationByTeamChart members={participationRanking.allMembers} />

            {/* Ranking full width */}
            <PulseParticipationRanking accountId={accountId} periodDays={effectivePeriodDays} />
          </TabsContent>

          {/* Alerts Tab — consolidated with participation alerts */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertas e Notificações</CardTitle>
                <CardDescription>
                  Itens que requerem atenção do RH
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : dashboard.alerts.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.alerts.slice(0, 10).map(alert => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          alert.is_resolved
                            ? 'bg-muted/30 opacity-60'
                            : alert.is_read
                            ? 'bg-card'
                            : 'bg-accent/50 border-primary/20'
                        }`}
                      >
                        <div className={`p-2 rounded-full ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 text-red-600'
                            : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              {alert.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {alert.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!alert.is_resolved && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setActionAlert(alert);
                                      setActionDialogOpen(true);
                                    }}
                                  >
                                    <ClipboardList className="h-4 w-4 mr-1" />
                                    Criar Ação
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => dashboard.resolveAlert(alert.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Resolver
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{alert.alert_type}</Badge>
                            {alert.pulse_drivers && (
                              <span>{alert.pulse_drivers.name}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(alert.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum alerta pendente</p>
                    <p className="text-sm mt-1">Sua equipe está em dia!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participation alerts consolidated here */}
            <ParticipationAlertsPanel accountId={accountId} />
          </TabsContent>
        </Tabs>

        {/* Action from alert dialog */}
        <CreateActionFromAlertDialog
          alert={actionAlert}
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          onCreateAction={pulseActions.createAction}
        />
      </div>
    </AppLayout>
  );
}
