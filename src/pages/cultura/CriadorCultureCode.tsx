import { AppLayout } from '@/components/layout/AppLayout';
import { RequireCompany } from '@/components/layout/RequireCompany';
import { useCultureCode } from '@/hooks/useCultureCode';
import { useCultureData } from '@/hooks/useCultureData';
import { HistoryInput, StructurePreview, SlidesView } from '@/components/cultura/culture-code';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette } from 'lucide-react';

export default function CriadorCultureCode() {
  const { 
    session, 
    loading: sessionLoading, 
    generating,
    updateHistory,
    updateSection,
    generateStructure,
    generateSlides,
    regenerateSlide,
    updateSlide,
    deleteSlide,
    addSlide,
    moveSlide,
    reorderSlides,
    goToStage,
    exportToTxt,
    copyAll,
    undo,
    redo,
    canUndo,
    canRedo,
    // Version history
    versionHistory,
    saveVersionSnapshot,
    restoreVersion,
  } = useCultureCode();

  const { 
    cultureData, 
    loading: dataLoading, 
    completionStatus,
    isReady,
  } = useCultureData();

  const loading = sessionLoading || dataLoading;
  const stage = session?.stage || 'history';

  const handleGenerateStructure = async (history: string) => {
    if (!cultureData) return;
    await generateStructure(history, cultureData);
  };

  const handleGenerateSlides = async () => {
    if (!cultureData || !session?.structure) return;
    await generateSlides(
      session.company_history || '',
      cultureData,
      session.structure
    );
  };

  return (
    <AppLayout title="Criador de Slides">
      <RequireCompany>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6" />
              Criador de Slides
            </h1>
            <p className="text-muted-foreground mt-1">
              Transforme seu código de cultura em uma apresentação impactante
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-60 w-full" />
            </div>
          )}

          {/* Content */}
          {!loading && (
            <>
              {stage === 'history' && (
                <HistoryInput
                  cultureData={cultureData}
                  completionStatus={completionStatus}
                  initialHistory={session?.company_history || ''}
                  generating={generating}
                  onGenerateStructure={handleGenerateStructure}
                />
              )}

              {stage === 'structure' && session?.structure && (
                <StructurePreview
                  structure={session.structure}
                  generating={generating}
                  onBack={() => goToStage('history')}
                  onGenerateSlides={handleGenerateSlides}
                  onUpdateSection={updateSection}
                />
              )}

              {stage === 'slides' && session?.slides && (
                <SlidesView
                  slides={session.slides}
                  structure={session.structure}
                  cultureData={cultureData}
                  generating={generating}
                  onBack={() => goToStage('structure')}
                  onUpdateSlide={updateSlide}
                  onDeleteSlide={deleteSlide}
                  onAddSlide={addSlide}
                  onMoveSlide={moveSlide}
                  onReorderSlides={reorderSlides}
                  onRegenerateSlide={regenerateSlide}
                  onExportTxt={exportToTxt}
                  onCopyAll={copyAll}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  versionHistory={versionHistory}
                  onSaveVersion={() => saveVersionSnapshot('manual')}
                  onRestoreVersion={restoreVersion}
                />
              )}
            </>
          )}
        </div>
      </RequireCompany>
    </AppLayout>
  );
}
