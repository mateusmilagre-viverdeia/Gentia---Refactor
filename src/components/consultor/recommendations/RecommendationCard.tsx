import { Heart, ArrowRight, ShieldAlert, Zap, Award, LucideIcon, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { 
  ProjectRecommendation, 
  RecommendationCategory,
  FeedbackType,
} from '@/types/recommendations.types';

interface RecommendationCardProps {
  recommendation: ProjectRecommendation;
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onComplete?: (id: string) => void;
  onViewDetails?: (recommendation: ProjectRecommendation) => void;
  onFeedback?: (id: string, type: FeedbackType) => void;
  isUpdating?: boolean;
  showActions?: boolean;
  compact?: boolean;
  feedbackGiven?: FeedbackType | null;
}

const categoryIcons: Record<RecommendationCategory, LucideIcon> = {
  health_improvement: Heart,
  next_action: ArrowRight,
  risk_mitigation: ShieldAlert,
  quick_win: Zap,
  best_practice: Award,
};

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

export function RecommendationCard({
  recommendation,
  onAccept,
  onDismiss,
  onComplete,
  onViewDetails,
  onFeedback,
  isUpdating = false,
  showActions = true,
  compact = false,
  feedbackGiven = null,
}: RecommendationCardProps) {
  const navigate = useNavigate();
  const Icon = categoryIcons[recommendation.category];
  const catInfo = categoryInfo[recommendation.category];
  const priInfo = priorityInfo[recommendation.priority];

  const handleToolClick = (route: string) => {
    navigate(route);
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        recommendation.status === 'pending' && "bg-card",
        recommendation.status === 'accepted' && "bg-blue-50/50 border-blue-200",
        recommendation.status === 'completed' && "bg-green-50/50 border-green-200",
        recommendation.status === 'dismissed' && "bg-muted/50 opacity-60"
      )}>
        <div className={cn("p-2 rounded-lg", catInfo.bgColor)}>
          <Icon className={cn("h-4 w-4", catInfo.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{recommendation.title}</span>
            <Badge variant="outline" className={cn("text-xs", priInfo.color, priInfo.bgColor)}>
              {priInfo.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {recommendation.description}
          </p>
        </div>
        <div className="flex gap-1">
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(recommendation)}
              className="h-7 px-2"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          {showActions && recommendation.status === 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAccept?.(recommendation.id)}
              disabled={isUpdating}
              className="h-7 px-2"
            >
              Aceitar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "transition-all",
      recommendation.status === 'pending' && "border-l-4 border-l-primary",
      recommendation.status === 'accepted' && "border-l-4 border-l-blue-500",
      recommendation.status === 'completed' && "border-l-4 border-l-green-500 bg-green-50/30",
      recommendation.status === 'dismissed' && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", catInfo.bgColor)}>
              <Icon className={cn("h-5 w-5", catInfo.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{recommendation.title}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {catInfo.label}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn(priInfo.color, priInfo.bgColor)}>
            Prioridade {priInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {recommendation.description}
        </p>

        {recommendation.rationale && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Por que esta recomendação?</p>
            <p className="text-sm">{recommendation.rationale}</p>
          </div>
        )}

        {recommendation.expected_impact && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Impacto esperado</p>
            <p className="text-sm">{recommendation.expected_impact}</p>
          </div>
        )}

        {recommendation.suggested_tools.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Ferramentas sugeridas</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.suggested_tools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleToolClick(tool.route)}
                  className="h-7 text-xs"
                >
                  {tool.name}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {onFeedback && recommendation.status !== 'dismissed' && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Útil?</span>
            {feedbackGiven ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {feedbackGiven === 'helpful' ? (
                  <><ThumbsUp className="h-3 w-3 text-green-600" /> Marcado como útil</>
                ) : (
                  <><ThumbsDown className="h-3 w-3 text-red-600" /> Marcado como não útil</>
                )}
              </span>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(recommendation.id, 'helpful')}
                  className="h-6 px-2"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(recommendation.id, 'not_helpful')}
                  className="h-6 px-2"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {recommendation.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onAccept?.(recommendation.id)}
                  disabled={isUpdating}
                >
                  Aceitar Recomendação
                </Button>
                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(recommendation)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Detalhes
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss?.(recommendation.id)}
                  disabled={isUpdating}
                >
                  Descartar
                </Button>
              </>
            )}
            {recommendation.status === 'accepted' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete?.(recommendation.id)}
                  disabled={isUpdating}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Marcar como Concluída
                </Button>
                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetails(recommendation)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Detalhes
                  </Button>
                )}
              </>
            )}
            {recommendation.status === 'completed' && (
              <span className="text-sm text-green-600 font-medium">
                ✓ Concluída
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
