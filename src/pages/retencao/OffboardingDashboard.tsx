import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Users, BarChart3, Percent, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useOffboardingDashboard } from '@/hooks/useOffboardingDashboard';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  OffboardingFilters, 
  OffboardingFiltersState, 
  OffboardingCharts, 
  OffboardingInsights,
  generateInsights 
} from '@/components/offboarding';
import { startOfMonth, endOfMonth } from "date-fns";

export default function OffboardingDashboard() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<OffboardingFiltersState>({
    period: 'last_quarter',
    dateRange: null,
    department: null,
    terminationType: null,
  });

  const { data: metrics, isLoading, error } = useOffboardingDashboard(undefined, filters.dateRange || undefined);

  if (isLoading) {
    return (
      <AppLayout
        title="Dashboard de Offboarding"
        breadcrumb={[
          { label: 'Retenção', href: '/retencao' },
          { label: 'Offboarding', href: '/retencao/offboarding' },
          { label: 'Dashboard' },
        ]}
      >
        <div className="container py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-20 mb-4" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !metrics) {
    return (
      <AppLayout title="Erro - Dashboard de Offboarding">
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Erro ao carregar dashboard</h1>
          <p className="text-muted-foreground mt-2">{error?.message || 'Erro desconhecido'}</p>
        </div>
      </AppLayout>
    );
  }

  const getNPSColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-amber-600';
    return 'text-red-600';
  };

  // Prepare chart data
  const surveyRatings = [
    { subject: 'Liderança', value: metrics.avgLeadership || 0, fullMark: 5 },
    { subject: 'Crescimento', value: metrics.avgGrowth || 0, fullMark: 5 },
    { subject: 'Carga', value: metrics.avgWorkload || 0, fullMark: 5 },
    { subject: 'Compensação', value: metrics.avgCompensation || 0, fullMark: 5 },
  ];

  const insights = generateInsights({
    ...metrics,
    surveyResponseRate: metrics.surveyResponseRate,
  });

  return (
    <AppLayout
      title="Dashboard de Offboarding"
      breadcrumb={[
        { label: 'Retenção', href: '/retencao' },
        { label: 'Offboarding', href: '/retencao/offboarding' },
        { label: 'Dashboard' },
      ]}
    >
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/retencao/offboarding')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Dashboard de Offboarding</h1>
            <p className="text-muted-foreground">
              Métricas, tendências e insights das pesquisas de desligamento
            </p>
          </div>
        </div>

        {/* Filters */}
        <OffboardingFilters
          filters={filters}
          onFiltersChange={setFilters}
          departments={metrics.departments}
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total de Casos</span>
              </div>
              <p className="text-3xl font-bold">{metrics.totalCases}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.activeCases} ativos • {metrics.completedCases} concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Checklists</span>
              </div>
              <p className="text-3xl font-bold">{metrics.checklistCompletionRate}%</p>
              <Progress value={metrics.checklistCompletionRate} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                {metrics.overdueTasksCount > 0 ? (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">Tarefas Atrasadas</span>
              </div>
              <p className={`text-3xl font-bold ${metrics.overdueTasksCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.overdueTasksCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Percent className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Voluntários</span>
              </div>
              <p className="text-3xl font-bold">{metrics.voluntaryPercentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                dos desligamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">eNPS de Saída</span>
              </div>
              <p className={`text-3xl font-bold ${getNPSColor(metrics.enpsScore)}`}>
                {metrics.enpsScore !== null ? metrics.enpsScore : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.surveyResponseRate}% responderam
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <OffboardingCharts
          monthlyTrend={metrics.monthlyTrend}
          terminationDistribution={metrics.terminationDistribution}
          surveyRatings={surveyRatings}
          exitReasons={metrics.topExitReasons}
          hasEnoughData={metrics.hasEnoughSamples}
        />

        {/* Insights */}
        <OffboardingInsights insights={insights} />

        {/* Privacy Notice */}
        {!metrics.hasEnoughSamples && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="p-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Privacidade:</strong> Os resultados detalhados da pesquisa serão exibidos quando houver pelo menos 5 respostas, 
                garantindo a confidencialidade dos colaboradores.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
