import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCredits } from '@/hooks/useCredits';
import type { RealtimeChannel } from '@supabase/supabase-js';

const HUNTING_FEATURE_KEY = 'hunting_search';

export interface HuntingSearch {
  id: string;
  account_id: string;
  job_id: string | null;
  query: string;
  sources: string[];
  filters: Record<string, unknown>;
  results_count: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  desired_count?: number;
  min_score?: number;
  qualified_count?: number;
  search_rounds?: number;
  evaboot_job_id?: string | null;
  evaboot_status?: string | null;
}

export interface HuntingResult {
  id: string;
  search_id: string;
  source: 'linkedin' | 'github' | 'portfolio' | 'other';
  source_url: string | null;
  extracted_data: {
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    skills?: string[];
    summary?: string;
    bio?: string;
    email?: string;
    experience_years?: number;
    markdown?: string;
    scraped_at?: string;
    score_breakdown?: {
      mandatory_skills_match: number;
      nice_to_have_match: number;
      experience_fit: number;
      culture_fit: number;
      total_score: number;
      details: {
        matched_mandatory?: string[];
        missed_mandatory?: string[];
        matched_nice_to_have?: string[];
        experience_years_detected?: number;
        culture_traits_detected?: string[];
        deal_breaker_flags?: string[];
      };
    };
    [key: string]: unknown;
  };
  match_score: number | null;
  match_reasoning?: string;
  imported_as_candidate_id: string | null;
  status: 'pending' | 'reviewed' | 'imported' | 'discarded' | 'rejected' | 'shortlisted' | 'interviewing' | 'offer_sent' | 'hired' | 'withdrawn';
  tags: string[];
  recruiter_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  score_source?: 'pending' | 'preview' | 'deep';
  qualified?: boolean;
  final_score_llm?: number | null;
  llm_tier?: 'A' | 'B' | 'C' | null;
  llm_red_flags?: string[] | null;
  llm_justification?: string | null;
  llm_evaluated_at?: string | null;
  completeness_score?: number | null;
  is_low_quality?: boolean | null;
  rejection_reason?: string | null;
  rejection_signals?: Record<string, unknown> | null;
  intent_signals?: any;
  intent_score?: number | null;
  intent_detected_at?: string | null;
  last_refreshed_at?: string | null;
  email_validation_status?: 'valid' | 'invalid' | 'catchall' | 'disposable' | 'unknown' | null;
  email_validation_provider?: string | null;
  email_validation_score?: number | null;
  email_validated_at?: string | null;
}

interface CreateSearchParams {
  query: string;
  sources?: string[];
  jobId?: string;
  maxResults?: number;
  filters?: {
    location?: string;
    seniority?: string;
    skills?: string[];
    niceToHaveSkills?: string[];
    targetCompanies?: string[];
    negativeKeywords?: string[];
    experienceMin?: number;
    experienceMax?: number;
    industry?: string;
  };
}

export function useHuntingSearch() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { hasCredits, consumeCredits, getCost } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [searches, setSearches] = useState<HuntingSearch[]>([]);
  const [results, setResults] = useState<HuntingResult[]>([]);
  const [smartSearchProgress, setSmartSearchProgress] = useState<{
    searchId: string;
    qualifiedCount: number;
    desiredCount: number;
    isRunning: boolean;
  } | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const fetchSearches = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('recruitment_hunting_searches')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearches((data || []) as HuntingSearch[]);
    } catch (error) {
      console.error('Error fetching hunting searches:', error);
    }
  }, [currentOrganization?.id]);

  const fetchResults = useCallback(async (searchId: string) => {
    try {
      const { data, error } = await supabase
        .from('recruitment_hunting_results')
        .select('*')
        .eq('search_id', searchId)
        .order('match_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Hide deep-scored unqualified results, but keep preview/pending results visible
      const filtered = (data || []).filter((r: any) => {
        // Keep results with scrape_failed flag visible (they have score_source: 'preview')
        if (r.score_source === 'preview' && r.extracted_data?.scrape_failed) return true;
        // Hide discarded results
        if (r.status === 'discarded') return false;
        // Hide deep-scored results that are not qualified
        if (r.score_source === 'deep' && r.qualified === false) return false;
        return true;
      });
      
      setResults(filtered as HuntingResult[]);
      return filtered as HuntingResult[];
    } catch (error) {
      console.error('Error fetching hunting results:', error);
      return [];
    }
  }, []);

  const createSearch = useCallback(async (params: CreateSearchParams) => {
    if (!currentOrganization?.id) {
      toast({
        title: 'Erro',
        description: 'Organização não encontrada',
        variant: 'destructive',
      });
      return null;
    }

    // Check if user has enough credits
    if (!hasCredits(HUNTING_FEATURE_KEY)) {
      const cost = getCost(HUNTING_FEATURE_KEY);
      toast({
        title: 'Créditos insuficientes',
        description: `Você precisa de ${cost?.credits_per_use || 5} créditos de Hunting para realizar esta busca.`,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado',
          variant: 'destructive',
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('hunting-search-candidates', {
        body: {
          account_id: currentOrganization.id,
          job_id: params.jobId,
          query: params.query,
          sources: params.sources || ['linkedin'],
          max_results: params.maxResults || 10,
          filters: params.filters || {},
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao realizar busca');
      }

      const creditsUsed = data.credits_consumed ? ` (${data.credits_consumed.toFixed(2)} créditos)` : '';
      toast({
        title: 'Busca concluída',
        description: `Encontrados ${data.results_count} perfis${creditsUsed}`,
      });

      await fetchSearches();
      return data;
    } catch (error: any) {
      console.error('Error creating hunting search:', error);
      toast({
        title: 'Erro na busca',
        description: error.message || 'Não foi possível realizar a busca',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, toast, fetchSearches, hasCredits, getCost]);

  const scrapeProfile = useCallback(async (resultId: string, url: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-scrape-profile', {
        body: { result_id: resultId, url },
      });

      if (error) {
        // supabase-js wraps non-2xx responses in FunctionsHttpError
        // Try to read the response body for specific error codes
        let errorBody: any = null;
        try {
          // Try multiple approaches to extract the error body
          if (error.context?.json) {
            errorBody = await error.context.json();
          } else if (error.context?.body) {
            const reader = error.context.body.getReader();
            const { value } = await reader.read();
            if (value) {
              const text = new TextDecoder().decode(value);
              errorBody = JSON.parse(text);
            }
          }
        } catch (_) { /* ignore parse errors */ }

        const errorMsg = errorBody?.error || error.message || '';
        const isQuotaError = errorMsg.includes('APIFY_QUOTA') || 
                             errorMsg.includes('429');
        const isNoDataError = errorMsg.includes('No profile data') || 
                              errorMsg.includes('profile data found');

        toast({
          title: isQuotaError 
            ? 'Quota do Apify esgotada' 
            : isNoDataError 
              ? 'Perfil não encontrado'
              : 'Erro na extração',
          description: isQuotaError 
            ? 'O limite de uso do scraper LinkedIn foi atingido. Tente novamente mais tarde.'
            : isNoDataError
              ? 'Não foi possível extrair dados deste perfil do LinkedIn. O perfil pode estar restrito.'
              : (errorMsg || 'Não foi possível extrair dados do perfil'),
          variant: 'destructive',
        });
        return null;
      }

      if (!data?.success) {
        const errMsg = data?.error || 'Erro ao extrair dados';
        const isQuota = errMsg.includes('APIFY_QUOTA');
        toast({
          title: isQuota ? 'Quota do Apify esgotada' : 'Erro na extração',
          description: isQuota 
            ? 'O limite de uso do scraper LinkedIn foi atingido. Tente novamente mais tarde.'
            : errMsg,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Dados extraídos',
        description: 'Perfil analisado com sucesso',
      });

      return data;
    } catch (error: any) {
      console.error('Error scraping profile:', error);
      toast({
        title: 'Erro na extração',
        description: error.message || 'Não foi possível extrair dados do perfil',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const importResults = useCallback(async (resultIds: string[], jobId?: string, stageId?: string) => {
    if (!currentOrganization?.id) {
      toast({
        title: 'Erro',
        description: 'Organização não encontrada',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-bulk-import', {
        body: {
          account_id: currentOrganization.id,
          result_ids: resultIds,
          job_id: jobId,
          stage_id: stageId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao importar candidatos');
      }

      toast({
        title: 'Importação concluída',
        description: `${data.imported_count} candidatos importados`,
      });

      return data;
    } catch (error: any) {
      console.error('Error importing results:', error);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Não foi possível importar os candidatos',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, toast]);

  const discardResults = useCallback(async (resultIds: string[]) => {
    try {
      const { error } = await supabase
        .from('recruitment_hunting_results')
        .update({ status: 'discarded' })
        .in('id', resultIds);

      if (error) throw error;

      toast({
        title: 'Resultados descartados',
        description: `${resultIds.length} perfis marcados como descartados`,
      });

      return true;
    } catch (error: any) {
      console.error('Error discarding results:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível descartar os resultados',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const deleteSearch = useCallback(async (searchId: string) => {
    try {
      // Delete results first, then the search
      await supabase
        .from('recruitment_hunting_results')
        .delete()
        .eq('search_id', searchId);

      const { error } = await supabase
        .from('recruitment_hunting_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      setSearches((prev) => prev.filter((s) => s.id !== searchId));
      setResults([]);
      toast({ title: 'Busca excluída com sucesso' });
      return true;
    } catch (error: any) {
      console.error('Error deleting search:', error);
      toast({
        title: 'Erro ao excluir busca',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const rerunSearch = useCallback(async (searchId: string) => {
    const search = searches.find((s) => s.id === searchId);
    if (!search) return null;

    // Delete old results
    await supabase
      .from('recruitment_hunting_results')
      .delete()
      .eq('search_id', searchId);

    // Reset status to pending
    await supabase
      .from('recruitment_hunting_searches')
      .update({ status: 'pending', results_count: 0, error_message: null } as any)
      .eq('id', searchId);

    // Re-invoke the search
    const result = await createSearch({
      query: search.query,
      sources: search.sources,
      jobId: search.job_id || undefined,
      filters: search.filters as any,
    });

    return result;
  }, [searches, createSearch]);

  const searchMore = useCallback(async (searchId: string, additionalCount: number) => {
    if (!currentOrganization?.id) return null;

    const search = searches.find((s) => s.id === searchId);
    if (!search) return null;

    setIsLoading(true);
    try {
      // Check credits
      if (!hasCredits(HUNTING_FEATURE_KEY)) {
        const cost = getCost(HUNTING_FEATURE_KEY);
        toast({
          title: 'Créditos insuficientes',
          description: `Você precisa de ${cost?.credits_per_use || 5} créditos para buscar mais perfis.`,
          variant: 'destructive',
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('hunting-search-candidates', {
        body: {
          account_id: currentOrganization.id,
          job_id: search.job_id,
          query: search.query,
          sources: search.sources,
          filters: search.filters || {},
          max_results: additionalCount,
          offset: search.results_count,
          existing_search_id: searchId,
        },
      });

      if (error) throw error;

      const creditsUsed = data.credits_consumed ? ` (${data.credits_consumed.toFixed(2)} créditos)` : '';
      toast({
        title: 'Busca adicional concluída',
        description: `Encontrados ${data.results_count || 0} novos perfis${creditsUsed}`,
      });

      await fetchSearches();
      if (searchId) await fetchResults(searchId);
      return data;
    } catch (error: any) {
      console.error('Error searching more:', error);
      toast({
        title: 'Erro na busca adicional',
        description: error.message || 'Não foi possível buscar mais perfis',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, searches, toast, fetchSearches, fetchResults, hasCredits, getCost]);

  const refineSearch = useCallback(async (searchId: string, params: CreateSearchParams) => {
    if (!currentOrganization?.id) {
      toast({ title: 'Erro', description: 'Organização não encontrada', variant: 'destructive' });
      return null;
    }

    if (!hasCredits(HUNTING_FEATURE_KEY)) {
      const cost = getCost(HUNTING_FEATURE_KEY);
      toast({
        title: 'Créditos insuficientes',
        description: `Você precisa de ${cost?.credits_per_use || 5} créditos para refinar a busca.`,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Erro', description: 'Você precisa estar logado', variant: 'destructive' });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('hunting-search-candidates', {
        body: {
          account_id: currentOrganization.id,
          job_id: params.jobId,
          query: params.query,
          sources: params.sources || ['linkedin'],
          max_results: params.maxResults || 10,
          filters: params.filters || {},
          existing_search_id: searchId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao refinar busca');

      const creditsUsed = data.credits_consumed ? ` (${data.credits_consumed.toFixed(2)} créditos)` : '';
      toast({
        title: 'Busca refinada concluída',
        description: `Encontrados ${data.results_count || 0} novos perfis${creditsUsed}`,
      });

      await fetchSearches();
      await fetchResults(searchId);
      return data;
    } catch (error: any) {
      console.error('Error refining search:', error);
      toast({
        title: 'Erro ao refinar busca',
        description: error.message || 'Não foi possível refinar a busca',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, toast, fetchSearches, fetchResults, hasCredits, getCost]);

  // Smart Search — calls the new hunting-smart-search edge function
  const smartSearch = useCallback(async (params: CreateSearchParams & { desiredCount?: number; minScore?: number }) => {
    if (!currentOrganization?.id) {
      toast({ title: 'Erro', description: 'Organização não encontrada', variant: 'destructive' });
      return null;
    }

    if (!hasCredits(HUNTING_FEATURE_KEY)) {
      const cost = getCost(HUNTING_FEATURE_KEY);
      toast({
        title: 'Créditos insuficientes',
        description: `Você precisa de ${cost?.credits_per_use || 5} créditos para realizar esta busca.`,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Erro', description: 'Você precisa estar logado', variant: 'destructive' });
        return null;
      }

      const desiredCount = params.desiredCount || 10;
      const minScore = params.minScore || 70;

      const { data, error } = await supabase.functions.invoke('hunting-smart-search', {
        body: {
          account_id: currentOrganization.id,
          job_id: params.jobId,
          query: params.query,
          sources: params.sources || ['linkedin'],
          desired_count: desiredCount,
          min_score: minScore,
          filters: params.filters || {},
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao realizar busca');

      const searchId = data.search_id;

      // Set progress state
      setSmartSearchProgress({
        searchId,
        qualifiedCount: 0,
        desiredCount,
        isRunning: true,
      });

      // Subscribe to realtime updates for this search's results
      subscribeToResults(searchId, desiredCount, minScore);

      toast({
        title: 'Busca inteligente iniciada',
        description: `Buscando ${desiredCount} candidatos com score ≥ ${minScore}...`,
      });

      await fetchSearches();
      return data;
    } catch (error: any) {
      console.error('Error creating smart search:', error);
      toast({
        title: 'Erro na busca',
        description: error.message || 'Não foi possível realizar a busca',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, toast, fetchSearches, hasCredits, getCost]);

  const subscribeToResults = useCallback((searchId: string, desiredCount: number, minScore: number) => {
    // Clean up previous subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`hunting-results-${searchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recruitment_hunting_results',
          filter: `search_id=eq.${searchId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (!newRecord) return;

          // Skip results that are discarded or unqualified with deep score
          if (newRecord.status === 'discarded') return;
          if (newRecord.score_source === 'deep' && newRecord.qualified === false) return;

          setResults((prev) => {
            const existing = prev.find((r) => r.id === newRecord.id);
            if (existing) {
              // If updated to discarded/unqualified, remove from list
              if (newRecord.status === 'discarded' || (newRecord.score_source === 'deep' && newRecord.qualified === false)) {
                return prev.filter((r) => r.id !== newRecord.id);
              }
              return prev
                .map((r) => (r.id === newRecord.id ? { ...r, ...newRecord } as HuntingResult : r))
                .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
            } else {
              return [...prev, newRecord as HuntingResult]
                .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
            }
          });

          // Update qualified count from results
          if (newRecord.qualified) {
            setSmartSearchProgress((prev) => {
              if (!prev) return prev;
              const newCount = prev.qualifiedCount + 1;
              const isRunning = newCount < prev.desiredCount;
              return { ...prev, qualifiedCount: newCount, isRunning };
            });
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    // Also poll search status to detect completion
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('recruitment_hunting_searches')
        .select('status, qualified_count, results_count')
        .eq('id', searchId)
        .single();

      if (data) {
        const qCount = (data as any).qualified_count || 0;
        setSmartSearchProgress((prev) => {
          if (!prev) return prev;
          return { ...prev, qualifiedCount: qCount, isRunning: data.status === 'running' };
        });

        if (data.status !== 'running') {
          clearInterval(pollInterval);
          // Refresh full list
          await fetchSearches();
          await fetchResults(searchId);
        }
      }
    }, 3000);

    // Cleanup after 5 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      setSmartSearchProgress((prev) => prev ? { ...prev, isRunning: false } : null);
    }, 5 * 60 * 1000);
  }, [fetchSearches, fetchResults]);

  const stopSmartSearch = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    setSmartSearchProgress((prev) => prev ? { ...prev, isRunning: false } : null);
  }, []);

  const cancelSearch = useCallback(async (searchId: string) => {
    try {
      const { error } = await supabase
        .from('recruitment_hunting_searches')
        .update({ status: 'cancelled' } as any)
        .eq('id', searchId);

      if (error) throw error;

      // Also stop local realtime tracking
      stopSmartSearch();

      toast({ title: 'Busca cancelada', description: 'A busca será interrompida em breve.' });
      await fetchSearches();
      return true;
    } catch (error: any) {
      console.error('Error cancelling search:', error);
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [toast, fetchSearches, stopSmartSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    searches,
    results,
    smartSearchProgress,
    fetchSearches,
    fetchResults,
    createSearch,
    smartSearch,
    stopSmartSearch,
    cancelSearch,
    scrapeProfile,
    importResults,
    discardResults,
    deleteSearch,
    rerunSearch,
    searchMore,
    refineSearch,
  };
}
