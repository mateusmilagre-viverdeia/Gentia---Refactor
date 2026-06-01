import { Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectRecommendations } from '@/hooks/useProjectRecommendations';
import { RecommendationCard } from './RecommendationCard';

interface QuickRecommendationWidgetProps {
  accountId: string;
  maxItems?: number;
  onViewAll?: () => void;
}

export function QuickRecommendationWidget({
  accountId,
  maxItems = 3,
  onViewAll,
}: QuickRecommendationWidgetProps) {
  const {
    highPriorityRecommendations,
    pendingRecommendations,
    isLoading,
    isGenerating,
    generateRecommendations,
    acceptRecommendation,
    isUpdating,
  } = useProjectRecommendations({ accountId });

  // Show high priority first, then fill with other pending
  const displayItems = [
    ...highPriorityRecommendations,
    ...pendingRecommendations.filter(r => r.priority !== 'high'),
  ].slice(0, maxItems);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Recomendações AI</CardTitle>
          </div>
          {highPriorityRecommendations.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {highPriorityRecommendations.length} alta prioridade
            </span>
          )}
        </div>
        <CardDescription>
          Sugestões baseadas em análise do projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma recomendação pendente</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => generateRecommendations('dashboard', 5)}
              disabled={isGenerating}
            >
              {isGenerating ? 'Gerando...' : 'Gerar Recomendações'}
            </Button>
          </div>
        ) : (
          <>
            {displayItems.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onAccept={acceptRecommendation}
                isUpdating={isUpdating}
                showActions={true}
                compact={true}
              />
            ))}
            
            {pendingRecommendations.length > maxItems && onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onViewAll}
              >
                Ver todas ({pendingRecommendations.length})
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
