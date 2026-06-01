import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireCompany } from '@/components/layout/RequireCompany';
import { useTeamMaturity } from '@/hooks/useTeamMaturity';
import {
  MaturityChart,
  MaturityPointsList,
  MaturityAssessmentSelector,
  MaturityQuadrantLegend,
  MaturityVersionHistoryPanel,
  TeamMaturityAIAnalysis,
  PersonMaturityAnalysisModal,
} from '@/components/retencao/maturidade';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TeamMaturityPoint, SavedAIAnalysis, PersonMaturityAIAnalysis } from '@/types/team-maturity.types';
import { PageGamificationBanner } from '@/components/gamification';

export default function MaturidadeTime() {
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
    // AI Analysis
    teamAnalysis,
    personAnalysis,
    isAnalyzingTeam,
    isAnalyzingPerson,
    analyzeTeam,
    analyzePerson,
    clearTeamAnalysis,
    clearPersonAnalysis,
    // Saved analyses
    savedTeamAnalyses,
    savedPersonAnalyses,
    saveTeamAnalysis,
    savePersonAnalysis,
    getPersonAnalysisHistory,
  } = useTeamMaturity();

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [currentAnalyzedPoint, setCurrentAnalyzedPoint] = useState<TeamMaturityPoint | null>(null);

  useEffect(() => {
    if (!loading && !canAccess) {
      navigate('/');
    }
  }, [loading, canAccess, navigate]);

  if (loading || !canAccess) {
    return (
      <AppLayout
        title="Maturidade do Time"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Retenção' },
          { label: 'Maturidade do Time' },
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
  };

  const handleAnalyzePerson = (point: TeamMaturityPoint) => {
    setCurrentAnalyzedPoint(point);
    analyzePerson(point);
    setPersonModalOpen(true);
  };

  const handleSavePersonAnalysis = () => {
    if (personAnalysis && currentAnalyzedPoint) {
      savePersonAnalysis(personAnalysis, currentAnalyzedPoint);
    }
  };

  const handleSaveTeamAnalysis = () => {
    if (teamAnalysis) {
      saveTeamAnalysis(teamAnalysis);
    }
  };

  const handleViewSavedPersonAnalysis = (saved: SavedAIAnalysis) => {
    // For now, just show a toast - could expand to show in modal
    const analysis = saved.analysis as PersonMaturityAIAnalysis;
    console.log('View saved analysis:', analysis);
  };

  // Show team analysis view
  if (teamAnalysis) {
    return (
      <AppLayout
        title="Maturidade do Time"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Retenção' },
          { label: 'Maturidade do Time' },
        ]}
      >
        <RequireCompany>
          <div className="p-6 max-w-4xl mx-auto">
            <TeamMaturityAIAnalysis 
              analysis={teamAnalysis} 
              onBack={clearTeamAnalysis}
              onSave={handleSaveTeamAnalysis}
              savedAnalyses={savedTeamAnalyses}
            />
          </div>
        </RequireCompany>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Maturidade do Time"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Retenção' },
        { label: 'Maturidade do Time' },
      ]}
    >
      <RequireCompany>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <PageGamificationBanner journeyId="retencao" stepId="maturidade" />
          
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
                  <TrendingUp className="h-6 w-6" />
                  Maturidade do Time
                </h1>
                <p className="text-sm text-muted-foreground">
                  Liderança Situacional: Habilidades × Comprometimento
                </p>
              </div>
            </div>
          </div>

          {/* Assessment Selector */}
          <MaturityAssessmentSelector
            assessments={assessments}
            selectedAssessment={selectedAssessment}
            onSelect={setSelectedAssessment}
            onCreate={createAssessment}
            onDelete={deleteAssessment}
            onSaveVersion={() => saveVersionSnapshot('manual')}
            onOpenHistory={() => setHistoryOpen(true)}
            onAnalyzeTeam={analyzeTeam}
            isAnalyzingTeam={isAnalyzingTeam}
            hasPoints={points.length > 0}
          />

          {/* Main Content */}
          {selectedAssessment ? (
            <div className="grid lg:grid-cols-[1fr_280px] gap-6">
              {/* Chart */}
              <div className="space-y-4">
                <MaturityChart
                  points={points}
                  onAddPoint={handleAddPoint}
                  onUpdatePoint={updatePoint}
                  onDeletePoint={deletePoint}
                  selectedPointId={selectedPointId}
                  onSelectPoint={setSelectedPointId}
                />
                <MaturityQuadrantLegend />
              </div>

              {/* Sidebar - Points List */}
              <div>
                <MaturityPointsList
                  points={points}
                  selectedPointId={selectedPointId}
                  onSelectPoint={handleSelectPointFromList}
                  onAnalyzePerson={handleAnalyzePerson}
                  isAnalyzing={isAnalyzingPerson}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma avaliação selecionada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie uma nova avaliação para começar a mapear a maturidade do time
              </p>
            </div>
          )}
        </div>

        {/* Version History Panel */}
        <MaturityVersionHistoryPanel
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          versions={versionHistory}
          onRestore={restoreVersion}
        />

        {/* Person Analysis Modal */}
        <PersonMaturityAnalysisModal
          open={personModalOpen}
          onOpenChange={(open) => {
            setPersonModalOpen(open);
            if (!open) setCurrentAnalyzedPoint(null);
          }}
          analysis={personAnalysis}
          isLoading={isAnalyzingPerson}
          onSave={handleSavePersonAnalysis}
          savedHistory={currentAnalyzedPoint ? getPersonAnalysisHistory(currentAnalyzedPoint.id) : []}
          onViewSaved={handleViewSavedPersonAnalysis}
        />
      </RequireCompany>
    </AppLayout>
  );
}
