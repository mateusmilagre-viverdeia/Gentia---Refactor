import { Sparkles, ArrowRight, AlertTriangle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { RecommendationCategory } from '@/types/recommendations.types';

interface DashboardRecommendationsWidgetProps {
  maxItems?: number;
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

export function DashboardRecommendationsWidget({
  maxItems = 3,
}: DashboardRecommendationsWidgetProps) {
  const navigate = useNavigate();

  // Fetch all pending recommendations across all assigned projects
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['dashboard-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_recommendations')
        .select(`
          id,
          account_id,
          title,
          description,
          category,
          priority,
          status,
          created_at,
          companies:account_id (
            id,
            name
          )
        `)
        .in('status', ['pending', 'accepted'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  const highPriorityCount = recommendations.filter(r => r.priority === 'high' && r.status === 'pending').length;
  const displayItems = recommendations.slice(0, maxItems);

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

  if (displayItems.length === 0) {
    return null; // Don't show widget if no recommendations
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Recomendações AI</CardTitle>
          </div>
          {highPriorityCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {highPriorityCount} alta prioridade
            </span>
          )}
        </div>
        <CardDescription>
          Insights de IA para seus projetos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayItems.map((rec) => {
          const priInfo = priorityInfo[rec.priority];
          return (
            <div
              key={rec.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/consultor/projeto/${rec.account_id}?tab=recommendations`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {rec.companies?.name || 'Projeto'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{rec.title}</span>
                  <Badge variant="outline" className={cn("text-xs shrink-0", priInfo.color, priInfo.bgColor)}>
                    {priInfo.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {rec.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
        
        {recommendations.length > maxItems && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{recommendations.length - maxItems} mais recomendações nos seus projetos
          </p>
        )}
      </CardContent>
    </Card>
  );
}
