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
import { Loader2, User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingCheckpoints } from '@/hooks/useOnboardingCheckpoints';
import type { 
  OnboardingCheckpoint, 
  OnboardingRespondentType,
} from '@/types/onboarding.types';

interface CheckpointFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkpoint: OnboardingCheckpoint;
  respondentType: OnboardingRespondentType;
  onSuccess?: () => void;
}

interface ScoreQuestion {
  key: string;
  label: string;
  description: string;
}

const employeeQuestions: ScoreQuestion[] = [
  {
    key: 'feeling_score',
    label: 'Como você está se sentindo?',
    description: 'Seu bem-estar geral no trabalho',
  },
  {
    key: 'role_clarity_score',
    label: 'Clareza do papel',
    description: 'Quão claro você está sobre suas responsabilidades',
  },
  {
    key: 'team_integration_score',
    label: 'Integração com o time',
    description: 'Seu nível de integração com os colegas',
  },
  {
    key: 'work_preparation_score',
    label: 'Preparação para o trabalho',
    description: 'Quão preparado você se sente para executar suas tarefas',
  },
];

const leaderQuestions: ScoreQuestion[] = [
  {
    key: 'role_clarity_score',
    label: 'Clareza do papel',
    description: 'O colaborador demonstra entender suas responsabilidades',
  },
  {
    key: 'delivery_quality_score',
    label: 'Qualidade das entregas',
    description: 'Nível de qualidade das entregas realizadas',
  },
  {
    key: 'culture_adherence_score',
    label: 'Aderência à cultura',
    description: 'Alinhamento com os valores e comportamentos esperados',
  },
  {
    key: 'autonomy_score',
    label: 'Autonomia',
    description: 'Capacidade de trabalhar de forma independente',
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

export function CheckpointFormModal({
  open,
  onOpenChange,
  checkpoint,
  respondentType,
  onSuccess,
}: CheckpointFormModalProps) {
  const { submitResponse } = useOnboardingCheckpoints(checkpoint.process_id);
  
  const questions = respondentType === 'employee' ? employeeQuestions : leaderQuestions;
  
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    questions.forEach(q => {
      initial[q.key] = 5;
    });
    return initial;
  });
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    await submitResponse.mutateAsync({
      checkpoint_id: checkpoint.id,
      respondent_type: respondentType,
      ...(respondentType === 'employee' ? {
        feeling_score: scores.feeling_score,
        role_clarity_score: scores.role_clarity_score,
        team_integration_score: scores.team_integration_score,
        work_preparation_score: scores.work_preparation_score,
      } : {
        role_clarity_score: scores.role_clarity_score,
        delivery_quality_score: scores.delivery_quality_score,
        culture_adherence_score: scores.culture_adherence_score,
        autonomy_score: scores.autonomy_score,
      }),
      additional_notes: notes || undefined,
    });
    onSuccess?.();
  };

  const averageScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {respondentType === 'employee' ? (
              <User className="h-5 w-5 text-green-600" />
            ) : (
              <Briefcase className="h-5 w-5 text-blue-600" />
            )}
            <DialogTitle>
              Checkpoint Dia {checkpoint.checkpoint_day} — {checkpoint.name}
            </DialogTitle>
          </div>
          <DialogDescription>
            {respondentType === 'employee' 
              ? 'Avalie sua experiência até o momento respondendo às perguntas abaixo.'
              : 'Avalie o progresso do colaborador respondendo às perguntas abaixo.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Average Score Preview */}
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className={cn('text-4xl font-bold', getScoreColor(averageScore))}>
                {averageScore.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Média geral: <span className={getScoreColor(averageScore)}>{getScoreLabel(averageScore)}</span>
              </div>
            </div>
          </div>

          {/* Score Questions */}
          {questions.map((question) => (
            <div key={question.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{question.label}</Label>
                  <p className="text-xs text-muted-foreground">{question.description}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn('min-w-[60px] justify-center', getScoreColor(scores[question.key]))}
                >
                  {scores[question.key]}/10
                </Badge>
              </div>
              <div className="px-1">
                <Slider
                  value={[scores[question.key]]}
                  onValueChange={([value]) => setScores(prev => ({ ...prev, [question.key]: value }))}
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

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações adicionais (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={respondentType === 'employee' 
                ? 'Compartilhe como está sendo sua experiência...'
                : 'Adicione observações sobre o progresso do colaborador...'
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitResponse.isPending}>
            {submitResponse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
