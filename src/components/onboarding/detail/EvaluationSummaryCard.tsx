import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCcw,
  TrendingUp,
  User,
  Calendar,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { OnboardingEvaluation, OnboardingRecommendation } from '@/types/onboarding.types';
import { getRecommendationLabel } from '@/types/onboarding.types';
import { formatBRT } from "@/lib/datetime";

interface EvaluationSummaryCardProps {
  evaluation: OnboardingEvaluation;
}

function getRecommendationIcon(rec: OnboardingRecommendation) {
  switch (rec) {
    case 'aprovado':
    case 'efetivado':
      return CheckCircle2;
    case 'aprovado_ressalvas':
      return AlertTriangle;
    case 'replanejar':
    case 'estender_onboarding':
      return RotateCcw;
    case 'nao_aprovado':
    case 'desligamento':
      return XCircle;
    default:
      return CheckCircle2;
  }
}

function getRecommendationColor(rec: OnboardingRecommendation) {
  switch (rec) {
    case 'aprovado':
    case 'efetivado':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300';
    case 'aprovado_ressalvas':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'replanejar':
    case 'estender_onboarding':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300';
    case 'nao_aprovado':
    case 'desligamento':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreBarColor(score: number | null): string {
  if (score === null) return 'bg-muted';
  if (score >= 8) return 'bg-green-500';
  if (score >= 6) return 'bg-yellow-500';
  if (score >= 4) return 'bg-orange-500';
  return 'bg-red-500';
}

const dimensionLabels: Record<string, string> = {
  clarity_rating: 'Clareza do Papel',
  culture_rating: 'Cultura',
  autonomy_rating: 'Autonomia',
  delivery_rating: 'Qualidade das Entregas',
  integration_rating: 'Integração com o Time',
};

export function EvaluationSummaryCard({ evaluation }: EvaluationSummaryCardProps) {
  const Icon = getRecommendationIcon(evaluation.recommendation);
  
  const dimensions = [
    { key: 'clarity_rating', value: evaluation.clarity_rating },
    { key: 'culture_rating', value: evaluation.culture_rating },
    { key: 'autonomy_rating', value: evaluation.autonomy_rating },
    { key: 'delivery_rating', value: evaluation.delivery_rating },
    { key: 'integration_rating', value: evaluation.integration_rating },
  ].filter(d => d.value !== null);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Avaliação Final</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatBRT(new Date(evaluation.evaluated_at), "d 'de' MMMM 'de' yyyy")}
                {evaluation.evaluator_name && (
                  <>
                    <span>•</span>
                    <User className="h-3.5 w-3.5" />
                    {evaluation.evaluator_name}
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge className={cn('gap-1', getRecommendationColor(evaluation.recommendation))}>
            <Icon className="h-3.5 w-3.5" />
            {getRecommendationLabel(evaluation.recommendation)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Rating */}
        {evaluation.overall_rating !== null && (
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className={cn('text-4xl font-bold', getScoreColor(evaluation.overall_rating))}>
                {evaluation.overall_rating.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Nota Geral
              </div>
            </div>
          </div>
        )}

        {/* Dimension Ratings */}
        {dimensions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avaliação por Dimensão
            </h4>
            <div className="space-y-2">
              {dimensions.map(({ key, value }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{dimensionLabels[key]}</span>
                    <span className={cn('font-medium', getScoreColor(value))}>
                      {value}/10
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn('h-full rounded-full transition-all', getScoreBarColor(value))}
                      style={{ width: `${(value || 0) * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Readiness Summary */}
        {evaluation.readiness_summary && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Resumo de Prontidão</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {evaluation.readiness_summary}
              </p>
            </div>
          </>
        )}

        {/* Strengths */}
        {evaluation.strengths && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
              Pontos Fortes
            </h4>
            <p className="text-sm text-muted-foreground">{evaluation.strengths}</p>
          </div>
        )}

        {/* Areas for Improvement */}
        {evaluation.areas_for_improvement && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Áreas de Desenvolvimento
            </h4>
            <p className="text-sm text-muted-foreground">{evaluation.areas_for_improvement}</p>
          </div>
        )}

        {/* Additional Notes */}
        {evaluation.additional_notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Observações</h4>
            <p className="text-sm text-muted-foreground">{evaluation.additional_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
