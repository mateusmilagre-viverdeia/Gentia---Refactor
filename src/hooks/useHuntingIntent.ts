import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useHuntingIntent() {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const refreshTalentPool = async (params: {
    account_id?: string;
    hunting_result_ids?: string[];
    max_profiles?: number;
  } = {}) => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-refresh-talent-pool', {
        body: params,
      });
      if (error) throw error;
      toast({
        title: 'Talent pool atualizado',
        description: `${data?.refreshed ?? 0} perfis re-analisados · ${data?.signals_detected ?? 0} sinais detectados`,
      });
      return data;
    } catch (err: any) {
      toast({
        title: 'Falha ao atualizar talent pool',
        description: err?.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshTalentPool, refreshing };
}

export function useTunedAutonomousSearch() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);

  const runTunedSearch = async (params: {
    job_id: string;
    account_id: string;
    desired_qualified?: number;
    max_rounds?: number;
    use_apollo?: boolean;
  }) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-autonomous-search-tuned', {
        body: params,
      });
      if (error) throw error;
      toast({
        title: 'Busca autônoma adaptativa concluída',
        description: `${data?.total_qualified ?? 0} qualificados em ${data?.rounds_executed ?? 0} rodadas`,
      });
      return data;
    } catch (err: any) {
      toast({
        title: 'Falha na busca adaptativa',
        description: err?.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    } finally {
      setRunning(false);
    }
  };

  return { runTunedSearch, running };
}

export function useGitHubScraper() {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);

  const searchGitHub = async (params: {
    search_id: string;
    account_id: string;
    skills?: string[];
    location?: string;
    language?: string;
    min_followers?: number;
    max_results?: number;
  }) => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-github-scraper', { body: params });
      if (error) throw error;
      toast({
        title: 'Busca no GitHub concluída',
        description: `${data?.inserted ?? 0} perfis adicionados (${data?.total_found ?? 0} encontrados)`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Falha na busca GitHub', description: err?.message, variant: 'destructive' });
      return null;
    } finally {
      setSearching(false);
    }
  };

  return { searchGitHub, searching };
}

export function useStackOverflowScraper() {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);

  const searchSO = async (params: {
    search_id: string;
    account_id: string;
    tags: string[];
    min_reputation?: number;
    max_results?: number;
    location?: string;
  }) => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-stackoverflow-scraper', { body: params });
      if (error) throw error;
      toast({
        title: 'Busca no Stack Overflow concluída',
        description: `${data?.inserted ?? 0} perfis adicionados`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Falha na busca Stack Overflow', description: err?.message, variant: 'destructive' });
      return null;
    } finally {
      setSearching(false);
    }
  };

  return { searchSO, searching };
}
