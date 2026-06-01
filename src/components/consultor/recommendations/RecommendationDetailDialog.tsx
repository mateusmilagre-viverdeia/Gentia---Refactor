import { useState } from 'react';
import { ThumbsUp, ThumbsDown, ArrowRight, Calendar, CheckCircle2, XCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ProjectRecommendation, FeedbackType, RecommendationCategory } from '@/types/recommendations.types';
import { formatBRT } from "@/lib/datetime";

interface RecommendationDetailDialogProps {
  recommendation: ProjectRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: (id: string) => void;
  onDismiss?: (id: string, reason?: string) => void;
  onComplete?: (id: string, notes?: string) => void;
  onFeedback?: (params: { recommendationId: string; feedbackType: FeedbackType; comment?: string }) => void;
  isUpdating?: boolean;
  existingFeedback?: FeedbackType | null;
}

const categoryInfo: Record<RecommendationCategory, { label: string; color: string; bgColor: string }> = {
  health_improvement: { label: 'Melhoria de Saúde', color: 'text-green-600', bgColor: 'bg-green-50' },
  next_action: { label: 'Próxima Ação', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  risk_mitigation: { label: 'Mitigação de Risco', color: 'text-red-600', bgColor: 'bg-red-50' },
  quick_win: { label: 'Vitória Rápida', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  best_practice: { label: 'Melhor Prática', color: 'text-purple-600', bgColor: 'bg-purple-50' },
};

const priorityInfo: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Alta', color: 'text-red-700', bgColor: 'bg-red-100' },
  medium: { label: 'Média', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Baixa', color: 'text-green-700', bgColor: 'bg-green-100' },
};

export function RecommendationDetailDialog({
  recommendation,
  open,
  onOpenChange,
  onAccept,
  onDismiss,
  onComplete,
  onFeedback,
  isUpdating = false,
  existingFeedback = null,
}: RecommendationDetailDialogProps) {
  const navigate = useNavigate();
  const [dismissReason, setDismissReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showDismissInput, setShowDismissInput] = useState(false);
  const [showCompleteInput, setShowCompleteInput] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackType | null>(existingFeedback);

  if (!recommendation) return null;

  const catInfo = categoryInfo[recommendation.category];
  const priInfo = priorityInfo[recommendation.priority];

  const handleToolClick = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const handleFeedback = (type: FeedbackType) => {
    onFeedback?.({
      recommendationId: recommendation.id,
      feedbackType: type,
      comment: feedbackComment || undefined,
    });
    setFeedbackGiven(type);
    setFeedbackComment('');
  };

  const handleDismiss = () => {
    if (showDismissInput) {
      onDismiss?.(recommendation.id, dismissReason || undefined);
      setShowDismissInput(false);
      setDismissReason('');
      onOpenChange(false);
    } else {
      setShowDismissInput(true);
    }
  };

  const handleComplete = () => {
    if (showCompleteInput) {
      onComplete?.(recommendation.id, completionNotes || undefined);
      setShowCompleteInput(false);
      setCompletionNotes('');
      onOpenChange(false);
    } else {
      setShowCompleteInput(true);
    }
  };

  const handleAccept = () => {
    onAccept?.(recommendation.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">{recommendation.title}</DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn(catInfo.color, catInfo.bgColor)}>
                  {catInfo.label}
                </Badge>
                <Badge variant="outline" className={cn(priInfo.color, priInfo.bgColor)}>
                  Prioridade {priInfo.label}
                </Badge>
                {recommendation.status === 'completed' && (
                  <Badge className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Concluída
                  </Badge>
                )}
                {recommendation.status === 'accepted' && (
                  <Badge className="bg-blue-600">Em Andamento</Badge>
                )}
                {recommendation.status === 'dismissed' && (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Descartada
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h4>
            <p className="text-sm">{recommendation.description}</p>
          </div>

          {/* Rationale */}
          {recommendation.rationale && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Por que esta recomendação?</h4>
              <p className="text-sm text-muted-foreground">{recommendation.rationale}</p>
            </div>
          )}

          {/* Expected Impact */}
          {recommendation.expected_impact && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Impacto Esperado</h4>
              <p className="text-sm">{recommendation.expected_impact}</p>
            </div>
          )}

          {/* Suggested Tools */}
          {recommendation.suggested_tools.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Ferramentas Sugeridas</h4>
              <div className="flex flex-wrap gap-2">
                {recommendation.suggested_tools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleToolClick(tool.route)}
                    className="h-8"
                  >
                    {tool.name}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Criada em {formatBRT(new Date(recommendation.created_at), "dd 'de' MMM 'de' yyyy")}
            </div>
            {recommendation.accepted_at && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                Aceita em {formatBRT(new Date(recommendation.accepted_at), "dd 'de' MMM")}
              </div>
            )}
            {recommendation.completed_at && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Concluída em {formatBRT(new Date(recommendation.completed_at), "dd 'de' MMM")}
              </div>
            )}
          </div>

          <Separator />

          {/* Feedback Section */}
          {recommendation.status !== 'dismissed' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Esta recomendação foi útil?</h4>
              {feedbackGiven || existingFeedback ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {(feedbackGiven || existingFeedback) === 'helpful' ? (
                    <>
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      Você marcou como útil
                    </>
                  ) : (feedbackGiven || existingFeedback) === 'not_helpful' ? (
                    <>
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      Você marcou como não útil
                    </>
                  ) : (
                    <>Feedback enviado</>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback('helpful')}
                      className="gap-1"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Útil
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback('not_helpful')}
                      className="gap-1"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Não Útil
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Comentário opcional sobre a recomendação..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            {recommendation.status === 'pending' && (
              <>
                {showDismissInput && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo do descarte (opcional)..."
                      value={dismissReason}
                      onChange={(e) => setDismissReason(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button onClick={handleAccept} disabled={isUpdating}>
                    Aceitar Recomendação
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDismiss}
                    disabled={isUpdating}
                  >
                    {showDismissInput ? 'Confirmar Descarte' : 'Descartar'}
                  </Button>
                  {showDismissInput && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowDismissInput(false)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </>
            )}

            {recommendation.status === 'accepted' && (
              <>
                {showCompleteInput && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Notas de conclusão (opcional)..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleComplete}
                    disabled={isUpdating}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {showCompleteInput ? 'Confirmar Conclusão' : 'Marcar como Concluída'}
                  </Button>
                  {showCompleteInput && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowCompleteInput(false)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </>
            )}

            {recommendation.status === 'completed' && recommendation.completion_notes && (
              <div className="bg-green-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-green-800 mb-1">Notas de Conclusão</h4>
                <p className="text-sm text-green-700">{recommendation.completion_notes}</p>
              </div>
            )}

            {recommendation.status === 'dismissed' && recommendation.dismissed_reason && (
              <div className="bg-muted rounded-lg p-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Motivo do Descarte</h4>
                <p className="text-sm">{recommendation.dismissed_reason}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
