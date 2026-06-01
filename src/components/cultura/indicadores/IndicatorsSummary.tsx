import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Target, TrendingUp, ChevronLeft, Settings } from 'lucide-react';
import { PERSPECTIVES, SEGMENTS, type Perspective, type Segment } from '@/types/indicators.types';
import { cn } from '@/lib/utils';
import { VersionHistoryCard, VersionHistoryItem } from '../shared/VersionHistoryCard';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useAchievementChecker } from '@/hooks/useAchievementChecker';
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

interface IndicatorsSummaryProps {
  finalSelection: string[];
  selectedStep1: Record<Perspective, string[]>;
  segment: Segment;
  onReset: () => void;
  onEditSelection: () => void;
  onEditFinal: () => void;
  versionHistory: VersionHistoryItem[];
  onSaveVersion: () => Promise<void>;
}

export function IndicatorsSummary({
  finalSelection,
  selectedStep1,
  segment,
  onReset,
  onEditSelection,
  onEditFinal,
  versionHistory,
  onSaveVersion
}: IndicatorsSummaryProps) {
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Indicadores');
  const hasSavedInitial = useRef(false);
  const hasCheckedAchievements = useRef(false);

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('indicadores');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  // Auto-save version on first load
  useEffect(() => {
    if (finalSelection.length > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      onSaveVersion();
    }
  }, [finalSelection, versionHistory, onSaveVersion]);

  const segmentConfig = SEGMENTS.find(s => s.key === segment);

  const getPerspectiveForIndicator = (indicator: string): Perspective | null => {
    for (const p of PERSPECTIVES) {
      if (selectedStep1[p.key]?.includes(indicator)) {
        return p.key;
      }
    }
    return null;
  };

  const getPerspectiveConfig = (perspective: Perspective) => {
    return PERSPECTIVES.find(p => p.key === perspective);
  };

  const groupedByPerspective = finalSelection.reduce((acc, indicator) => {
    const perspective = getPerspectiveForIndicator(indicator);
    if (perspective) {
      if (!acc[perspective]) acc[perspective] = [];
      acc[perspective].push(indicator);
    }
    return acc;
  }, {} as Record<Perspective, string[]>);

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 mb-4">
          <Target className="w-5 h-5" />
          <span className="font-medium">Indicadores Definidos</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Seus Indicadores Estratégicos
        </h2>
        <p className="text-muted-foreground mt-2">
          {segmentConfig?.icon} Segmento: {segmentConfig?.label} • {finalSelection.length} KPIs principais
        </p>
      </div>

      <div className="grid gap-4">
        {PERSPECTIVES.map((perspective) => {
          const indicators = groupedByPerspective[perspective.key] || [];
          if (indicators.length === 0) return null;

          return (
            <div
              key={perspective.key}
              className={cn(
                "p-4 rounded-xl border-2",
                perspective.borderColor,
                perspective.bgColor
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{perspective.icon}</span>
                <h3 className={cn("font-semibold", perspective.color)}>
                  {perspective.label}
                </h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {indicators.length} indicador{indicators.length > 1 ? 'es' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {indicators.map((indicator) => (
                  <span
                    key={indicator}
                    className="px-3 py-1.5 rounded-lg bg-background border text-sm font-medium"
                  >
                    <TrendingUp className="w-3 h-3 inline mr-1 text-primary" />
                    {indicator}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Version History */}
      <VersionHistoryCard
        history={versionHistory}
        renderPreview={(snapshot) => {
          const data = snapshot as { segment?: string; finalSelection?: string[] };
          const segmentLabel = SEGMENTS.find(s => s.key === data.segment)?.label || data.segment;
          return <span className="text-xs text-muted-foreground">Segmento: {segmentLabel} • {data.finalSelection?.length || 0} indicadores</span>;
        }}
        renderDetailedPreview={(snapshot) => {
          const data = snapshot as { finalSelection?: string[] };
          if (!data.finalSelection || data.finalSelection.length === 0) return <span className="text-xs text-muted-foreground">Nenhum indicador</span>;
          return (
            <div className="space-y-1">
              {data.finalSelection.map((ind, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-foreground">{ind}</span>
                </div>
              ))}
            </div>
          );
        }}
      />

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEditSelection} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Editar Seleção
          </Button>
          <Button variant="outline" onClick={onEditFinal} className="gap-2">
            <Settings className="w-4 h-4" />
            Editar KPIs Finais
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onReset} className="gap-2 text-destructive hover:text-destructive">
            <RefreshCw className="w-4 h-4" />
            Recomeçar do Zero
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
