import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Copy, FileImage, Undo2, Redo2, Save } from 'lucide-react';
import { SlideList } from './SlideList';
import { SlidePreview } from './SlidePreview';
import { SlideEditor } from './SlideEditor';
import { PDFPreview } from './PDFPreview';
import { VersionHistoryCard, type VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CultureCodeSlide, CultureCodeStructure, CultureCodeInput } from '@/types/culture-code.types';
import type { CultureCodeVersionSnapshot } from '@/hooks/useCultureCode';

interface SlidesViewProps {
  slides: CultureCodeSlide[];
  structure: CultureCodeStructure | null;
  cultureData: CultureCodeInput | null;
  generating: boolean;
  onBack: () => void;
  onUpdateSlide: (slideId: string, updates: Partial<CultureCodeSlide>) => void;
  onDeleteSlide: (slideId: string) => void;
  onAddSlide: (afterSlideId: string, slide: Omit<CultureCodeSlide, 'id' | 'slideNumber'>) => void;
  onMoveSlide: (slideId: string, direction: 'up' | 'down') => void;
  onReorderSlides: (newOrder: string[]) => void;
  onRegenerateSlide: (slideId: string, cultureData: CultureCodeInput, instruction?: string) => Promise<any>;
  onExportTxt: () => void;
  onCopyAll: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Version history
  versionHistory?: VersionHistoryItem[];
  onSaveVersion?: () => void;
  onRestoreVersion?: (versionId: string) => void;
}

export function SlidesView({
  slides,
  structure,
  cultureData,
  generating,
  onBack,
  onUpdateSlide,
  onDeleteSlide,
  onAddSlide,
  onMoveSlide,
  onReorderSlides,
  onRegenerateSlide,
  onExportTxt,
  onCopyAll,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  versionHistory = [],
  onSaveVersion,
  onRestoreVersion,
}: SlidesViewProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    slides[0]?.id || null
  );
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    if (slides.length > 0 && !selectedSlideId) {
      setSelectedSlideId(slides[0].id);
    }
  }, [slides, selectedSlideId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo && onUndo) onUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo && onRedo) onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  const selectedSlide = slides.find(s => s.id === selectedSlideId);
  const selectedIndex = slides.findIndex(s => s.id === selectedSlideId);

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      setSelectedSlideId(slides[selectedIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (selectedIndex < slides.length - 1) {
      setSelectedSlideId(slides[selectedIndex + 1].id);
    }
  };

  const handleAddSlide = (afterSlideId: string) => {
    const afterSlide = slides.find(s => s.id === afterSlideId);
    if (!afterSlide) return;

    onAddSlide(afterSlideId, {
      sectionId: afterSlide.sectionId,
      title: 'Novo Slide',
      body: ['Seu texto aqui'],
      type: 'regular',
    });
  };

  const handleRegenerate = async (instruction?: string) => {
    if (selectedSlide && cultureData) {
      await onRegenerateSlide(selectedSlide.id, cultureData, instruction);
    }
  };

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">Nenhum slide gerado ainda.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Actions Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Estrutura
          </Button>
          
          {/* Undo/Redo */}
          {(onUndo || onRedo) && (
            <TooltipProvider>
              <div className="flex items-center gap-1 ml-2 border-l pl-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={onUndo}
                      disabled={!canUndo}
                      className="h-8 w-8"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={onRedo}
                      disabled={!canRedo}
                      className="h-8 w-8"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSaveVersion && (
            <Button variant="outline" onClick={onSaveVersion}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Versão
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowPdfPreview(true)}>
            <FileImage className="h-4 w-4 mr-2" />
            Preview PDF
          </Button>
          <Button variant="outline" onClick={onExportTxt}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar TXT
          </Button>
          <Button variant="outline" onClick={onCopyAll}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Todos
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">
        {/* Slide List */}
        <div className="col-span-3 border-r overflow-hidden">
          <SlideList
            slides={slides}
            structure={structure}
            selectedSlideId={selectedSlideId}
            onSelectSlide={setSelectedSlideId}
            onAddSlide={handleAddSlide}
            onReorderSlides={onReorderSlides}
          />
        </div>

        {/* Preview */}
        <div className="col-span-6 border-r overflow-hidden">
          {selectedSlide && (
            <SlidePreview
              slide={selectedSlide}
              totalSlides={slides.length}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          )}
        </div>

        {/* Editor + Version History */}
        <div className="col-span-3 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {selectedSlide && (
                <SlideEditor
                  slide={selectedSlide}
                  onUpdate={(updates) => onUpdateSlide(selectedSlide.id, updates)}
                  onDelete={() => {
                    onDeleteSlide(selectedSlide.id);
                    // Select previous or next slide
                    if (selectedIndex > 0) {
                      setSelectedSlideId(slides[selectedIndex - 1].id);
                    } else if (slides.length > 1) {
                      setSelectedSlideId(slides[1].id);
                    } else {
                      setSelectedSlideId(null);
                    }
                  }}
                  onMove={(direction) => onMoveSlide(selectedSlide.id, direction)}
                  onRegenerate={cultureData ? handleRegenerate : undefined}
                  isRegenerating={generating}
                />
              )}
              
              {/* Version History */}
              {(versionHistory.length > 0 || onSaveVersion) && (
                <VersionHistoryCard
                  history={versionHistory}
                  title="Histórico de Versões"
                  emptyMessage="Nenhuma versão salva. Clique em 'Salvar Versão' para criar um ponto de restauração."
                  renderPreview={(snapshot) => {
                    const s = snapshot as CultureCodeVersionSnapshot;
                    return (
                      <span className="text-xs text-muted-foreground">
                        {s.slideCount} slides
                      </span>
                    );
                  }}
                  onRestore={onRestoreVersion}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreview
        slides={slides}
        open={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
      />
    </div>
  );
}
