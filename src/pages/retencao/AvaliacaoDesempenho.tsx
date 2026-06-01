import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireCompany } from '@/components/layout/RequireCompany';
import { usePerformanceAssessment } from '@/hooks/usePerformanceAssessment';
import {
  FourBlocksChart,
  PointsList,
  AssessmentSelector,
  QuadrantLegend,
  VersionHistoryPanel,
} from '@/components/retencao/desempenho';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageGamificationBanner } from '@/components/gamification';

export default function AvaliacaoDesempenho() {
  const navigate = useNavigate();
  const {
    assessments,
    selectedAssessment,
    setSelectedAssessment,
    points,
    versionHistory,
    loading,
    canAccess,
    createAssessment,
    deleteAssessment,
    addPoint,
    updatePoint,
    deletePoint,
    saveVersionSnapshot,
    restoreVersion,
  } = usePerformanceAssessment();

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Redirect if no access - using useEffect to avoid setState during render
  useEffect(() => {
    if (!loading && !canAccess) {
      navigate('/');
    }
  }, [loading, canAccess, navigate]);

  if (loading || !canAccess) {
    return (
      <AppLayout
        title="Av. Desempenho"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Retenção' },
          { label: 'Av. Desempenho' },
        ]}
      >
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid lg:grid-cols-[1fr_280px] gap-6">
            <Skeleton className="aspect-square max-w-[600px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleAddPoint = async (
    firstName: string,
    lastName: string,
    x: number,
    y: number,
    notes?: string
  ) => {
    await addPoint(firstName, lastName, x, y, notes);
  };

  const handleSelectPointFromList = (id: string) => {
    setSelectedPointId(id);
    // Auto-scroll to point or highlight it
  };

  return (
    <AppLayout
      title="Av. Desempenho"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Retenção' },
        { label: 'Av. Desempenho' },
      ]}
    >
      <RequireCompany>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <PageGamificationBanner journeyId="retencao" stepId="desempenho" />
          
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  Avaliação de Desempenho
                </h1>
                <p className="text-sm text-muted-foreground">
                  Matriz 4 Blocos: Fit Cultural × Resultado
                </p>
              </div>
            </div>
          </div>

          {/* Assessment Selector */}
          <AssessmentSelector
            assessments={assessments}
            selectedAssessment={selectedAssessment}
            onSelect={setSelectedAssessment}
            onCreate={createAssessment}
            onDelete={deleteAssessment}
            onSaveVersion={() => saveVersionSnapshot('manual')}
            onOpenHistory={() => setHistoryOpen(true)}
          />

          {/* Main Content */}
          {selectedAssessment ? (
            <div className="grid lg:grid-cols-[1fr_280px] gap-6">
              {/* Chart */}
              <div className="space-y-4">
                <FourBlocksChart
                  points={points}
                  onAddPoint={handleAddPoint}
                  onUpdatePoint={updatePoint}
                  onDeletePoint={deletePoint}
                  selectedPointId={selectedPointId}
                  onSelectPoint={setSelectedPointId}
                />
                <QuadrantLegend />
              </div>

              {/* Sidebar - Points List */}
              <div>
                <PointsList
                  points={points}
                  selectedPointId={selectedPointId}
                  onSelectPoint={handleSelectPointFromList}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma avaliação selecionada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie uma nova avaliação para começar a avaliar seu time
              </p>
            </div>
          )}
        </div>

        {/* Version History Panel */}
        <VersionHistoryPanel
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          versions={versionHistory}
          onRestore={restoreVersion}
        />
      </RequireCompany>
    </AppLayout>
  );
}
