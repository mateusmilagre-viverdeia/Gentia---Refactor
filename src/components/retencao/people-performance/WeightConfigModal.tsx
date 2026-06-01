import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { PeoplePerformanceWeights, DEFAULT_WEIGHTS } from '@/types/people-performance.types';
import { cn } from '@/lib/utils';

interface WeightConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weights: PeoplePerformanceWeights;
  onSave: (weights: PeoplePerformanceWeights) => boolean;
}

export function WeightConfigModal({ open, onOpenChange, weights, onSave }: WeightConfigModalProps) {
  const [localWeights, setLocalWeights] = useState<PeoplePerformanceWeights>(weights);

  useEffect(() => {
    if (open) {
      setLocalWeights(weights);
    }
  }, [open, weights]);

  const total = localWeights.cultural + localWeights.performance + localWeights.maturity;
  const isValid = total === 100;

  const handleSliderChange = (field: keyof PeoplePerformanceWeights, value: number[]) => {
    setLocalWeights(prev => ({
      ...prev,
      [field]: value[0],
    }));
  };

  const handleReset = () => {
    setLocalWeights(DEFAULT_WEIGHTS);
  };

  const handleSave = () => {
    if (onSave(localWeights)) {
      onOpenChange(false);
    }
  };

  const weightConfig = [
    { key: 'cultural' as const, label: 'Cultural', description: 'Peso do Analisador de Pessoas', color: 'bg-purple-500' },
    { key: 'performance' as const, label: 'Desempenho', description: 'Peso da Avaliação de Desempenho', color: 'bg-green-500' },
    { key: 'maturity' as const, label: 'Maturidade', description: 'Peso da Maturidade do Time', color: 'bg-blue-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Pesos</DialogTitle>
          <DialogDescription>
            Ajuste a importância de cada dimensão no cálculo do índice People Performance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {weightConfig.map(({ key, label, description, color }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', color)} />
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Badge variant="outline" className="text-lg font-mono">
                  {localWeights[key]}%
                </Badge>
              </div>
              <Slider
                value={[localWeights[key]]}
                onValueChange={(value) => handleSliderChange(key, value)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          ))}

          {/* Total indicator */}
          <div className={cn(
            'p-3 rounded-lg border flex items-center justify-between',
            isValid ? 'bg-green-50 border-green-200' : 'bg-destructive/10 border-destructive/30'
          )}>
            <div className="flex items-center gap-2">
              {!isValid && <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className="font-medium">Total</span>
            </div>
            <span className={cn('font-bold text-lg', !isValid && 'text-destructive')}>
              {total}%
            </span>
          </div>

          {!isValid && (
            <p className="text-sm text-destructive">
              O total deve ser exatamente 100%. Ajuste os valores.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
