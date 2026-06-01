import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OnboardingRecommendation } from '@/types/onboarding.types';

interface EvaluationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  employeeName: string;
  onSuccess?: () => void;
}

interface RatingQuestion {
  key: string;
  label: string;
  description: string;
}

const ratingQuestions: RatingQuestion[] = [
  {
    key: 'clarity_rating',
    label: 'Clareza do Papel',
    description: 'O colaborador demonstra entender suas responsabilidades e expectativas',
  },
  {
    key: 'culture_rating',
    label: 'Cultura',
    description: 'Alinhamento com os valores e comportamentos esperados pela empresa',
  },
  {
    key: 'autonomy_rating',
    label: 'Autonomia',
    description: 'Capacidade de trabalhar de forma independente e tomar decisões',
  },
  {
    key: 'delivery_rating',
    label: 'Qualidade das Entregas',
    description: 'Nível de qualidade das entregas realizadas durante o onboarding',
  },
  {
    key: 'integration_rating',
    label: 'Integração com o Time',
    description: 'Relacionamento e colaboração com os colegas de trabalho',
  },
];

const recommendationOptions: { 
  value: OnboardingRecommendation; 
  label: string; 
  description: string;
  icon: typeof CheckCircle2;
  color: string;
}[] = [
  {
    value: 'aprovado',
    label: 'Aprovado',
    description: 'Pronto para operar plenamente no cargo',
    icon: CheckCircle2,
    color: 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30',
  },
  {
    value: 'aprovado_ressalvas',
    label: 'Aprovado com Ressalvas',
    description: 'Aprovado, mas precisa de apoio em áreas específicas',
    icon: AlertTriangle,
    color: 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30',
  },
  {
    value: 'replanejar',
    label: 'Replanejar Onboarding',
    description: 'Necessita de um novo plano de desenvolvimento',
    icon: RotateCcw,
    color: 'text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30',
  },
  {
    value: 'nao_aprovado',
    label: 'Não Aprovado',
    description: 'Não atingiu os critérios mínimos esperados',
    icon: XCircle,
    color: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30',
  },
];

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Excelente';
  if (score >= 7) return 'Bom';
  if (score >= 5) return 'Regular';
  if (score >= 3) return 'Precisa melhorar';
  return 'Crítico';
}

export function EvaluationFormModal({
  open,
  onOpenChange,
  processId,
  employeeName,
  onSuccess,
}: EvaluationFormModalProps) {
  const queryClient = useQueryClient();
  
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ratingQuestions.forEach(q => {
      initial[q.key] = 7;
    });
    return initial;
  });
  
  const [recommendation, setRecommendation] = useState<OnboardingRecommendation>('aprovado');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [readinessSummary, setReadinessSummary] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const createEvaluation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      const overallRating = Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length;
      
      const { data, error } = await supabase
        .from('onboarding_evaluations')
        .insert({
          process_id: processId,
          evaluator_id: userData.user?.id,
          overall_rating: Math.round(overallRating * 10) / 10,
          recommendation,
          strengths: strengths || null,
          areas_for_improvement: improvements || null,
          additional_notes: additionalNotes || null,
          clarity_rating: ratings.clarity_rating,
          culture_rating: ratings.culture_rating,
          autonomy_rating: ratings.autonomy_rating,
          delivery_rating: ratings.delivery_rating,
          integration_rating: ratings.integration_rating,
          readiness_summary: readinessSummary || null,
          evaluated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-processes', processId] });
      toast.success('Avaliação final registrada com sucesso!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar avaliação: ${error.message}`);
    },
  });

  const averageRating = Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <DialogTitle>Avaliação Final de Onboarding</DialogTitle>
          </div>
          <DialogDescription>
            Avalie o onboarding de <strong>{employeeName}</strong> e registre a decisão final.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Score Preview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className={cn('text-5xl font-bold', getScoreColor(averageRating))}>
                    {averageRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Nota Geral: <span className={getScoreColor(averageRating)}>{getScoreLabel(averageRating)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating Questions */}
          <div className="space-y-5">
            <h3 className="font-medium">Avaliação por Dimensão</h3>
            {ratingQuestions.map((question) => (
              <div key={question.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{question.label}</Label>
                    <p className="text-xs text-muted-foreground">{question.description}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn('min-w-[60px] justify-center', getScoreColor(ratings[question.key]))}
                  >
                    {ratings[question.key]}/10
                  </Badge>
                </div>
                <div className="px-1">
                  <Slider
                    value={[ratings[question.key]]}
                    onValueChange={([value]) => setRatings(prev => ({ ...prev, [question.key]: value }))}
                    max={10}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Recommendation */}
          <div className="space-y-3">
            <h3 className="font-medium">Decisão Final</h3>
            <RadioGroup
              value={recommendation}
              onValueChange={(value) => setRecommendation(value as OnboardingRecommendation)}
              className="grid gap-3"
            >
              {recommendationOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      recommendation === option.value 
                        ? option.color 
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', option.color.split(' ')[0])} />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <Separator />

          {/* Text Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strengths">Pontos Fortes</Label>
              <Textarea
                id="strengths"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Descreva os principais pontos fortes demonstrados..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="improvements">Áreas de Desenvolvimento</Label>
              <Textarea
                id="improvements"
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="Indique áreas que precisam de desenvolvimento..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="readiness">Resumo de Prontidão</Label>
              <Textarea
                id="readiness"
                value={readinessSummary}
                onChange={(e) => setReadinessSummary(e.target.value)}
                placeholder="Ex: Pronto para operar plenamente / Precisa de apoio em... / Requer novo plano"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações Adicionais (opcional)</Label>
              <Textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Outras observações relevantes para o registro..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => createEvaluation.mutate()} disabled={createEvaluation.isPending}>
            {createEvaluation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar Avaliação Final
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
