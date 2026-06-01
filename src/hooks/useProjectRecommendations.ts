import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  ProjectRecommendation, 
  RecommendationStatus,
  FeedbackType,
  GenerateRecommendationsResponse,
  SuggestedTool
} from '@/types/recommendations.types';
import type { Json } from '@/integrations/supabase/types';

interface UseProjectRecommendationsOptions {
  accountId: string;
  status?: RecommendationStatus | RecommendationStatus[];
  enabled?: boolean;
}

// Helper to parse suggested_tools from JSON
function parseSuggestedTools(tools: Json | null): SuggestedTool[] {
  if (!tools || !Array.isArray(tools)) return [];
  return tools
    .filter((t): t is Record<string, Json | undefined> => 
      typeof t === 'object' && t !== null && !Array.isArray(t)
    )
    .filter(t => 
      typeof t.id === 'string' && 
      typeof t.name === 'string' && 
      typeof t.route === 'string'
    )
    .map(t => ({
      id: t.id as string,
      name: t.name as string,
      route: t.route as string,
      pillar: typeof t.pillar === 'string' ? t.pillar : undefined,
      icon: typeof t.icon === 'string' ? t.icon : undefined,
    }));
}

export function useProjectRecommendations({ 
  accountId, 
  status,
  enabled = true 
}: UseProjectRecommendationsOptions) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch recommendations
  const { 
    data: recommendations = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['project-recommendations', accountId, status],
    queryFn: async (): Promise<ProjectRecommendation[]> => {
      let query = supabase
        .from('project_recommendations')
        .select('*')
        .eq('account_id', accountId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Parse and transform data
      return (data || []).map(rec => ({
        ...rec,
        suggested_tools: parseSuggestedTools(rec.suggested_tools),
        metadata: (rec.metadata as Record<string, unknown>) || {},
      }));
    },
    enabled: enabled && !!accountId,
  });

  // Generate new recommendations
  const generateRecommendations = useCallback(async (
    context: 'dashboard' | 'checkpoint' | 'alert_response' = 'dashboard',
    maxRecommendations: number = 5
  ): Promise<GenerateRecommendationsResponse | null> => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return null;
      }

      const response = await supabase.functions.invoke('generate-project-recommendations', {
        body: { 
          account_id: accountId, 
          context,
          max_recommendations: maxRecommendations
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.error === 'rate_limit') {
        toast.warning(result.message);
        return null;
      }

      toast.success(`${result.recommendations?.length || 0} recomendações geradas!`);
      
      // Refresh recommendations list
      queryClient.invalidateQueries({ queryKey: ['project-recommendations', accountId] });
      
      return result;
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast.error(error.message || 'Erro ao gerar recomendações');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [accountId, queryClient]);

  // Update recommendation status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      reason,
      notes 
    }: { 
      id: string; 
      status: RecommendationStatus;
      reason?: string;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = { status };

      switch (status) {
        case 'accepted':
          updates.accepted_at = new Date().toISOString();
          break;
        case 'dismissed':
          updates.dismissed_at = new Date().toISOString();
          updates.dismissed_reason = reason || null;
          break;
        case 'completed':
          updates.completed_at = new Date().toISOString();
          updates.completion_notes = notes || null;
          break;
      }

      const { data, error } = await supabase
        .from('project_recommendations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-recommendations', accountId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar recomendação');
    }
  });

  // Accept recommendation
  const acceptRecommendation = useCallback((id: string) => {
    return updateStatusMutation.mutateAsync({ id, status: 'accepted' });
  }, [updateStatusMutation]);

  // Dismiss recommendation
  const dismissRecommendation = useCallback((id: string, reason?: string) => {
    return updateStatusMutation.mutateAsync({ id, status: 'dismissed', reason });
  }, [updateStatusMutation]);

  // Complete recommendation
  const completeRecommendation = useCallback((id: string, notes?: string) => {
    return updateStatusMutation.mutateAsync({ id, status: 'completed', notes });
  }, [updateStatusMutation]);

  // Submit feedback
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ 
      recommendationId, 
      feedbackType, 
      comment 
    }: { 
      recommendationId: string; 
      feedbackType: FeedbackType;
      comment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('recommendation_feedback')
        .insert({
          recommendation_id: recommendationId,
          feedback_type: feedbackType,
          comment,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Feedback enviado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar feedback');
    }
  });

  // Helper filters
  const pendingRecommendations = recommendations.filter(r => r.status === 'pending');
  const acceptedRecommendations = recommendations.filter(r => r.status === 'accepted');
  const completedRecommendations = recommendations.filter(r => r.status === 'completed');
  const highPriorityRecommendations = recommendations.filter(
    r => r.priority === 'high' && r.status === 'pending'
  );

  return {
    recommendations,
    pendingRecommendations,
    acceptedRecommendations,
    completedRecommendations,
    highPriorityRecommendations,
    isLoading,
    isGenerating,
    error,
    refetch,
    generateRecommendations,
    acceptRecommendation,
    dismissRecommendation,
    completeRecommendation,
    submitFeedback: submitFeedbackMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}
