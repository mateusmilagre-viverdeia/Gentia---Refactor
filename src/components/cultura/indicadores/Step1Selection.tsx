import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { SegmentSelector } from './SegmentSelector';
import { PerspectiveCard } from './PerspectiveCard';
import { IndicatorsProgress } from './IndicatorsProgress';
import { PERSPECTIVES, type Segment, type Perspective } from '@/types/indicators.types';
import indicadoresData from '@/data/indicadores-bsc.json';
import { toast } from 'sonner';

interface Step1SelectionProps {
  session: {
    segment: Segment;
    selected_step1: Record<Perspective, string[]>;
  } | null;
  onCreateSession: (segment: Segment) => Promise<any>;
  onUpdateSegment: (segment: Segment) => Promise<void>;
  onUpdatePerspective: (perspective: Perspective, indicators: string[]) => Promise<void>;
  onAdvance: () => void;
  isComplete: boolean;
}

export function Step1Selection({
  session,
  onCreateSession,
  onUpdateSegment,
  onUpdatePerspective,
  onAdvance,
  isComplete
}: Step1SelectionProps) {
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(session?.segment || null);
  const [localSelections, setLocalSelections] = useState<Record<Perspective, string[]>>(
    session?.selected_step1 || {
      financeira: [],
      clientes: [],
      processos: [],
      aprendizado: []
    }
  );

  useEffect(() => {
    if (session) {
      setSelectedSegment(session.segment);
      setLocalSelections(session.selected_step1);
    }
  }, [session]);

  const handleSegmentSelect = async (segment: Segment) => {
    setSelectedSegment(segment);
    if (!session) {
      await onCreateSession(segment);
    } else if (session.segment !== segment) {
      await onUpdateSegment(segment);
      setLocalSelections({
        financeira: [],
        clientes: [],
        processos: [],
        aprendizado: []
      });
    }
  };

  const handleToggleIndicator = async (perspective: Perspective, indicator: string) => {
    const current = localSelections[perspective];
    let updated: string[];

    if (current.includes(indicator)) {
      updated = current.filter(i => i !== indicator);
    } else {
      if (current.length >= 5) {
        toast.error('Limite atingido! Máximo 5 indicadores por perspectiva.');
        return;
      }
      updated = [...current, indicator];
      if (updated.length === 5) {
        toast.success('🔥 Excelente escolha! Perspectiva completa.');
      }
    }

    setLocalSelections(prev => ({ ...prev, [perspective]: updated }));
    await onUpdatePerspective(perspective, updated);
  };

  const getIndicatorsForPerspective = (perspective: Perspective): string[] => {
    if (!selectedSegment) return [];
    const data = indicadoresData as Record<string, Record<string, string[]>>;
    return data[selectedSegment]?.[perspective] || [];
  };

  const getTotalSelected = () => {
    return Object.values(localSelections).reduce((sum, arr) => sum + arr.length, 0);
  };

  if (!selectedSegment) {
    return (
      <div className="space-y-6">
        <IndicatorsProgress currentStep={1} totalSteps={2} />
        <SegmentSelector
          selectedSegment={selectedSegment}
          onSelect={handleSegmentSelect}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <IndicatorsProgress currentStep={1} totalSteps={2} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Selecione indicadores do Balanced Scorecard
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha até 5 indicadores por perspectiva (Total: {getTotalSelected()} / 20)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedSegment(null)}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Trocar segmento
        </Button>
      </div>

      <div className="grid gap-4">
        {PERSPECTIVES.map((perspective) => (
          <PerspectiveCard
            key={perspective.key}
            perspective={perspective}
            indicators={getIndicatorsForPerspective(perspective.key)}
            selectedIndicators={localSelections[perspective.key]}
            maxSelection={5}
            onToggleIndicator={(indicator) => handleToggleIndicator(perspective.key, indicator)}
          />
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={onAdvance}
          disabled={!isComplete}
          className="gap-2"
        >
          Avançar para Seleção Final
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {!isComplete && (
        <p className="text-sm text-center text-muted-foreground">
          🎯 Selecione pelo menos 1 indicador em cada perspectiva para avançar
        </p>
      )}
    </div>
  );
}
