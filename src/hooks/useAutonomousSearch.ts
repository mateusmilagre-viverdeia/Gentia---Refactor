import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface AutonomousSearchState {
  searchId: string | null;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed';
  resultsCount: number;
  error: string | null;
}

export function useAutonomousSearch() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [state, setState] = useState<AutonomousSearchState>({
    searchId: null,
    status: 'idle',
    resultsCount: 0,
    error: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollSearchStatus = useCallback((searchId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('recruitment_hunting_searches')
        .select('status, results_count, error_message')
        .eq('id', searchId)
        .single();

      if (error || !data) return;

      if (data.status === 'completed') {
        stopPolling();
        setState(prev => ({
          ...prev,
          status: 'completed',
          resultsCount: data.results_count || 0,
        }));
        toast({
          title: 'Busca autônoma concluída',
          description: `${data.results_count || 0} perfis encontrados e analisados`,
        });
      } else if (data.status === 'failed') {
        stopPolling();
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: data.error_message || 'Busca falhou',
        }));
        toast({
          title: 'Busca falhou',
          description: data.error_message || 'Não foi possível completar a busca',
          variant: 'destructive',
        });
      } else {
        setState(prev => ({
          ...prev,
          resultsCount: data.results_count || 0,
        }));
      }
    }, 3000);
  }, [stopPolling, toast]);

  const startAutonomousSearch = useCallback(async (jobId: string, maxResults?: number, useApollo?: boolean) => {
    if (!currentOrganization?.id) {
      toast({
        title: 'Erro',
        description: 'Organização não encontrada',
        variant: 'destructive',
      });
      return null;
    }

    setState({
      searchId: null,
      status: 'starting',
      resultsCount: 0,
      error: null,
    });

    try {
      const { data, error } = await supabase.functions.invoke('hunting-autonomous-search', {
        body: {
          job_id: jobId,
          account_id: currentOrganization.id,
          max_results: maxResults || 10,
          use_apollo: useApollo ?? false,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Falha na busca autônoma');
      }

      setState({
        searchId: data.search_id,
        status: 'completed',
        resultsCount: data.results_count || 0,
        error: null,
      });

      toast({
        title: 'Busca autônoma concluída',
        description: `${data.results_count || 0} perfis encontrados e rankeados por IA`,
      });

      return data;
    } catch (err: any) {
      console.error('Autonomous search error:', err);
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: err.message || 'Erro desconhecido',
      }));
      toast({
        title: 'Erro na busca autônoma',
        description: err.message || 'Não foi possível realizar a busca',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentOrganization?.id, toast]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      searchId: null,
      status: 'idle',
      resultsCount: 0,
      error: null,
    });
  }, [stopPolling]);

  return {
    ...state,
    startAutonomousSearch,
    reset,
    isSearching: state.status === 'starting' || state.status === 'running',
  };
}
