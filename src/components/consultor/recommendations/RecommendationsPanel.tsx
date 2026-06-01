import { useState } from 'react';
import { Sparkles, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RecommendationCard } from './RecommendationCard';
import { RecommendationDetailDialog } from './RecommendationDetailDialog';
import { useProjectRecommendations } from '@/hooks/useProjectRecommendations';
import type { RecommendationCategory, ProjectRecommendation, FeedbackType } from '@/types/recommendations.types';

interface RecommendationsPanelProps {
  accountId: string;
}

export function RecommendationsPanel({ accountId }: RecommendationsPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<RecommendationCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRecommendation, setSelectedRecommendation] = useState<ProjectRecommendation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackType>>({});

  const {
    recommendations,
    pendingRecommendations,
    acceptedRecommendations,
    completedRecommendations,
    isLoading,
    isGenerating,
    generateRecommendations,
    acceptRecommendation,
    dismissRecommendation,
    completeRecommendation,
    submitFeedback,
    isUpdating,
  } = useProjectRecommendations({ accountId });

  const handleGenerate = async () => {
    await generateRecommendations('dashboard', 5);
  };

  const handleViewDetails = (rec: ProjectRecommendation) => {
    setSelectedRecommendation(rec);
    setDialogOpen(true);
  };

  const handleFeedback = (id: string, type: FeedbackType) => {
    submitFeedback({ recommendationId: id, feedbackType: type });
    setFeedbackMap(prev => ({ ...prev, [id]: type }));
  };

  const handleDialogFeedback = (params: { recommendationId: string; feedbackType: FeedbackType; comment?: string }) => {
    submitFeedback(params);
    setFeedbackMap(prev => ({ ...prev, [params.recommendationId]: params.feedbackType }));
  };

  const getFilteredRecommendations = () => {
    let list = [];
    switch (activeTab) {
      case 'pending':
        list = pendingRecommendations;
        break;
      case 'accepted':
        list = acceptedRecommendations;
        break;
      case 'completed':
        list = completedRecommendations;
        break;
      default:
        list = recommendations;
    }

    if (categoryFilter !== 'all') {
      list = list.filter(r => r.category === categoryFilter);
    }

    return list;
  };

  const filteredList = getFilteredRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recomendações AI</h3>
          {pendingRecommendations.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {pendingRecommendations.length} pendentes
            </span>
          )}
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="sm"
          variant="outline"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Recomendações
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="pending">
              Pendentes ({pendingRecommendations.length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Aceitas ({acceptedRecommendations.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Concluídas ({completedRecommendations.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select 
          value={categoryFilter} 
          onValueChange={(v) => setCategoryFilter(v as RecommendationCategory | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="health_improvement">Melhoria de Saúde</SelectItem>
            <SelectItem value="next_action">Próxima Ação</SelectItem>
            <SelectItem value="risk_mitigation">Mitigação de Risco</SelectItem>
            <SelectItem value="quick_win">Vitória Rápida</SelectItem>
            <SelectItem value="best_practice">Melhor Prática</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhuma recomendação encontrada</p>
            <p className="text-sm mt-1">
              {activeTab === 'pending' 
                ? 'Clique em "Gerar Recomendações" para obter sugestões da AI.'
                : 'Não há recomendações nesta categoria.'}
            </p>
          </div>
        ) : (
          filteredList.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onAccept={acceptRecommendation}
              onDismiss={dismissRecommendation}
              onComplete={completeRecommendation}
              onViewDetails={handleViewDetails}
              onFeedback={handleFeedback}
              feedbackGiven={feedbackMap[rec.id] || null}
              isUpdating={isUpdating}
              showActions={true}
            />
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <RecommendationDetailDialog
        recommendation={selectedRecommendation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAccept={acceptRecommendation}
        onDismiss={dismissRecommendation}
        onComplete={completeRecommendation}
        onFeedback={handleDialogFeedback}
        isUpdating={isUpdating}
        existingFeedback={selectedRecommendation ? feedbackMap[selectedRecommendation.id] : null}
      />
    </div>
  );
}
