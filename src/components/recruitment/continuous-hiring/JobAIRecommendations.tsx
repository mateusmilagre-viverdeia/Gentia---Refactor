import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, UserPlus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface JobAIRecommendationsProps {
  jobId: string;
  accountId: string;
}

interface Recommendation {
  id: string;
  candidate_id: string;
  similarity_score: number;
  composite_score: number;
  recommendation_reason: string;
  status: string;
  created_at: string;
  candidate_name?: string;
  candidate_email?: string;
}

export function JobAIRecommendations({ jobId, accountId }: JobAIRecommendationsProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['continuous-hiring-recommendations', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('continuous_hiring_recommendations')
        .select('*')
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .order('similarity_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch candidate names
      if (data && data.length > 0) {
        const candidateIds = data.map((r: any) => r.candidate_id);
        const { data: candidates } = await supabase
          .from('recruitment_candidates')
          .select('id, name, email')
          .in('id', candidateIds);

        const candidateMap = new Map((candidates || []).map((c: any) => [c.id, c]));
        return data.map((r: any) => ({
          ...r,
          candidate_name: candidateMap.get(r.candidate_id)?.name || 'Candidato',
          candidate_email: candidateMap.get(r.candidate_id)?.email,
        })) as Recommendation[];
      }

      return (data || []) as Recommendation[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('continuous-hiring-match', {
        body: { job_id: jobId, account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['continuous-hiring-recommendations', jobId] });
      toast.success(`${data?.count || 0} recomendações geradas`);
    },
    onError: () => toast.error('Erro ao gerar recomendações'),
  });

  const dismissMutation = useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from('continuous_hiring_recommendations')
        .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
        .eq('id', recId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continuous-hiring-recommendations', jobId] });
    },
  });

  const count = recommendations?.length || 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recomendações IA
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">{count}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="h-7 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              {generateMutation.isPending ? 'Buscando...' : 'Buscar'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : count === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Clique em "Buscar" para encontrar candidatos compatíveis no banco de talentos.
            </p>
          ) : (
            recommendations?.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background/80 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rec.candidate_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{rec.candidate_email}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge
                    variant={rec.similarity_score >= 0.75 ? 'default' : 'secondary'}
                    className="text-xs whitespace-nowrap"
                  >
                    {(rec.similarity_score * 100).toFixed(0)}% match
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => dismissMutation.mutate(rec.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
