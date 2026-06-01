import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireCompany } from '@/components/layout/RequireCompany';
import { usePeoplePerformance } from '@/hooks/usePeoplePerformance';
import {
  PeoplePerformanceTable,
  WeightConfigModal,
  ScoreBreakdownPanel,
  AssessmentSelectors,
  PerformanceDistributionChart,
} from '@/components/retencao/people-performance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { PeoplePerformanceScore, getPerformanceLevel } from '@/types/people-performance.types';
import { cn } from '@/lib/utils';

export default function PeoplePerformance() {
  const navigate = useNavigate();
  const {
    loading,
    canAccess,
    scores,
    stats,
    weights,
    updateWeights,
    peopleAnalyses,
    performanceAssessments,
    maturityAssessments,
    selectedPeopleAnalysisId,
    selectedPerformanceAssessmentId,
    selectedMaturityAssessmentId,
    setSelectedPeopleAnalysisId,
    setSelectedPerformanceAssessmentId,
    setSelectedMaturityAssessmentId,
    reload,
  } = usePeoplePerformance();

  const [selectedPerson, setSelectedPerson] = useState<PeoplePerformanceScore | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [weightsModalOpen, setWeightsModalOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  // Filter scores based on selected level
  const filteredScores = filterLevel
    ? scores.filter(s => getPerformanceLevel(s.peoplePerformanceIndex).label === filterLevel)
    : scores;

  // Redirect if no access
  useEffect(() => {
    if (!loading && !canAccess) {
      navigate('/');
    }
  }, [loading, canAccess, navigate]);

  if (loading || !canAccess) {
    return (
      <AppLayout
        title="People Performance"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Retenção', href: '/retencao' },
          { label: 'People Performance' },
        ]}
      >
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AppLayout>
    );
  }

  const handleSelectPerson = (person: PeoplePerformanceScore) => {
    setSelectedPerson(person);
    setBreakdownOpen(true);
  };

  const averageLevel = getPerformanceLevel(stats.average);

  return (
    <AppLayout
      title="People Performance"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Retenção', href: '/retencao' },
        { label: 'People Performance' },
      ]}
    >
      <RequireCompany>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/retencao')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  People Performance
                </h1>
                <p className="text-sm text-muted-foreground">
                  Índice consolidado de avaliações de pessoas
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reload}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeightsModalOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1" />
                Configurar Pesos
              </Button>
            </div>
          </div>

          {/* Assessment Selectors */}
          <AssessmentSelectors
            peopleAnalyses={peopleAnalyses}
            performanceAssessments={performanceAssessments}
            maturityAssessments={maturityAssessments}
            selectedPeopleAnalysisId={selectedPeopleAnalysisId}
            selectedPerformanceAssessmentId={selectedPerformanceAssessmentId}
            selectedMaturityAssessmentId={selectedMaturityAssessmentId}
            onPeopleAnalysisChange={setSelectedPeopleAnalysisId}
            onPerformanceAssessmentChange={setSelectedPerformanceAssessmentId}
            onMaturityAssessmentChange={setSelectedMaturityAssessmentId}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Média Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={cn('text-2xl font-bold', averageLevel.color)}>
                    {stats.average.toFixed(1)}%
                  </span>
                  <Badge variant="outline" className={cn('text-xs', averageLevel.color, averageLevel.bgClass)}>
                    {averageLevel.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-green-600">
                  {stats.highest.toFixed(1)}%
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  Menor Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-amber-600">
                  {stats.lowest.toFixed(1)}%
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Abaixo de 50%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-destructive">
                    {stats.belowThreshold}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    de {stats.totalPeople}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weights Info */}
          <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Pesos atuais:</span>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                Cultural: {weights.cultural}%
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                Desempenho: {weights.performance}%
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                Maturidade: {weights.maturity}%
              </Badge>
            </div>
            <span className="text-muted-foreground">
              {stats.withAllAssessments} pessoas com todas as 3 avaliações
            </span>
          </div>

          {/* Distribution Chart */}
          <PerformanceDistributionChart
            scores={scores}
            onFilterChange={setFilterLevel}
            activeFilter={filterLevel}
          />

          {/* Rankings Table */}
          <PeoplePerformanceTable
            scores={filteredScores}
            onSelectPerson={handleSelectPerson}
          />

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">C</Badge>
              <span>Cultural (Analisador)</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">D</Badge>
              <span>Desempenho</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">M</Badge>
              <span>Maturidade</span>
            </div>
          </div>
        </div>

        {/* Modals */}
        <WeightConfigModal
          open={weightsModalOpen}
          onOpenChange={setWeightsModalOpen}
          weights={weights}
          onSave={updateWeights}
        />

        <ScoreBreakdownPanel
          person={selectedPerson}
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          weights={weights}
        />
      </RequireCompany>
    </AppLayout>
  );
}
