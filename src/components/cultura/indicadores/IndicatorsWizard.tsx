import { useIndicatorsSession } from '@/hooks/useIndicatorsSession';
import { Step1Selection } from './Step1Selection';
import { Step2FinalSelection } from './Step2FinalSelection';
import { IndicatorsSummary } from './IndicatorsSummary';
import { Loader2 } from 'lucide-react';

export function IndicatorsWizard() {
  const {
    session,
    loading,
    createSession,
    updateSegment,
    updatePerspectiveSelection,
    updateStage,
    updateFinalSelection,
    resetSession,
    getAllSelectedIndicators,
    isStep1Complete,
    versionHistory,
    saveVersionSnapshot
  } = useIndicatorsSession();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Stage 3 = completed
  if (session?.stage === 3) {
    return (
      <IndicatorsSummary
        finalSelection={session.final_selection}
        selectedStep1={session.selected_step1}
        segment={session.segment}
        onReset={resetSession}
        onEditSelection={() => updateStage(1)}
        onEditFinal={() => updateStage(2)}
        versionHistory={versionHistory}
        onSaveVersion={saveVersionSnapshot}
      />
    );
  }

  // Stage 2 = final selection
  if (session?.stage === 2) {
    return (
      <Step2FinalSelection
        allIndicators={getAllSelectedIndicators()}
        selectedStep1={session.selected_step1}
        onBack={() => updateStage(1)}
        onComplete={updateFinalSelection}
      />
    );
  }

  // Stage 1 = perspective selection (default)
  return (
    <Step1Selection
      session={session}
      onCreateSession={createSession}
      onUpdateSegment={updateSegment}
      onUpdatePerspective={updatePerspectiveSelection}
      onAdvance={() => updateStage(2)}
      isComplete={isStep1Complete()}
    />
  );
}
