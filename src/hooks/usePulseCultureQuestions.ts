import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PulseCultureQuestion, CulturePillar } from '@/types/pulseCulture.types';

interface SyncResult {
  success: boolean;
  questionsCount: number;
  newCount: number;
  skippedCount: number;
  byPillar: Record<string, number>;
  cultureDataFound: {
    mission: boolean;
    vision: boolean;
    values: number;
    decision: boolean;
    indicators: number;
    projects: number;
    energy: number;
    development: number;
  };
}

export function usePulseCultureQuestions(accountId: string | null) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<PulseCultureQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('pulse_culture_questions')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('pillar_type', { ascending: true });

      if (error) throw error;
      
      setQuestions((data || []) as PulseCultureQuestion[]);
    } catch (error) {
      console.error('Error fetching culture questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const syncQuestions = useCallback(async (): Promise<boolean> => {
    if (!accountId) return false;
    setSyncing(true);
    setLastSyncResult(null);
    
    try {
      // Get user token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('generate-culture-pulse-questions', {
        body: { account_id: accountId },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: 'Aviso',
          description: data.error || 'Nenhuma pergunta gerada.',
          variant: 'destructive',
        });
        return false;
      }

      const result: SyncResult = {
        success: true,
        questionsCount: data.questions_count,
        newCount: data.new_count ?? data.questions_count,
        skippedCount: data.skipped_count ?? 0,
        byPillar: data.by_pillar,
        cultureDataFound: data.culture_data_found,
      };
      
      setLastSyncResult(result);

      toast({
        title: 'Sucesso',
        description: `${data.questions_count} perguntas de cultura sincronizadas.`,
      });

      await fetchQuestions();
      return true;
    } catch (error) {
      console.error('Error syncing culture questions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar as perguntas de cultura.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [accountId, fetchQuestions, toast]);

  const toggleQuestion = useCallback(async (questionId: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pulse_culture_questions')
        .update({ is_active: isActive })
        .eq('id', questionId);

      if (error) throw error;
      
      setQuestions(prev => 
        prev.map(q => q.id === questionId ? { ...q, is_active: isActive } : q)
      );
      
      toast({
        title: 'Sucesso',
        description: isActive ? 'Pergunta ativada.' : 'Pergunta desativada.',
      });
      return true;
    } catch (error) {
      console.error('Error toggling question:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a pergunta.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Stats by pillar
  const stats = {
    total: questions.length,
    active: questions.filter(q => q.is_active).length,
    byPillar: questions.reduce((acc, q) => {
      acc[q.pillar_type] = (acc[q.pillar_type] || 0) + 1;
      return acc;
    }, {} as Record<CulturePillar, number>),
  };

  return {
    questions,
    loading,
    syncing,
    fetchQuestions,
    syncQuestions,
    toggleQuestion,
    stats,
    lastSyncResult,
  };
}
