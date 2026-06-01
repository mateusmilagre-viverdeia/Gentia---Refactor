import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SemanticSearchResult {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
  tags?: string[];
  similarity_score: number;
  source_type: string;
  recruitment_applications?: Array<{
    id: string;
    job_id: string;
    stage: string;
    status: string;
    recruitment_jobs?: {
      id: string;
      title: string;
    };
  }>;
}

interface MatchingJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  status: string;
  similarity_score: number;
}

interface MatchingCandidate {
  id: string;
  name: string;
  email: string;
  similarity_score: number;
  has_applied: boolean;
}

interface UseSemanticSearchOptions {
  accountId: string;
}

export function useSemanticSearch({ accountId }: UseSemanticSearchOptions) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);

  // Generate embedding for a candidate or job
  const generateEmbedding = useCallback(async (
    entityType: 'candidate' | 'job',
    entityId: string,
    text: string,
    sourceType: string
  ) => {
    if (!text.trim()) {
      console.warn('Empty text provided for embedding generation');
      return { success: false, error: 'Empty text' };
    }

    setIsGeneratingEmbedding(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: {
          text,
          entity_type: entityType,
          entity_id: entityId,
          source_type: sourceType,
          account_id: accountId,
        },
      });

      if (error) throw error;
      
      if (data?.cached) {
        console.log('Embedding was already up-to-date');
      } else {
        console.log('Embedding generated successfully');
      }
      
      return { success: true, cached: data?.cached };
    } catch (error) {
      console.error('Error generating embedding:', error);
      return { success: false, error };
    } finally {
      setIsGeneratingEmbedding(false);
    }
  }, [accountId]);

  // Search candidates by natural language query
  const searchCandidates = useCallback(async (
    query: string,
    options?: {
      jobId?: string;
      threshold?: number;
      limit?: number;
      excludeCandidateIds?: string[];
    }
  ) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search-candidates', {
        body: {
          query,
          account_id: accountId,
          job_id: options?.jobId,
          threshold: options?.threshold ?? 0.6,
          limit: options?.limit ?? 20,
          exclude_candidate_ids: options?.excludeCandidateIds ?? [],
        },
      });

      if (error) throw error;

      const results = data?.candidates || [];
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      toast.error('Erro na busca semântica');
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [accountId]);

  // Find matching jobs for a candidate
  const findMatchingJobs = useCallback(async (
    candidateId: string,
    options?: {
      threshold?: number;
      limit?: number;
    }
  ): Promise<MatchingJob[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('match-candidate-jobs', {
        body: {
          candidate_id: candidateId,
          account_id: accountId,
          threshold: options?.threshold ?? 0.6,
          limit: options?.limit ?? 10,
        },
      });

      if (error) throw error;
      return data?.jobs || [];
    } catch (error) {
      console.error('Error finding matching jobs:', error);
      toast.error('Erro ao buscar vagas compatíveis');
      return [];
    }
  }, [accountId]);

  // Find matching candidates for a job
  const findMatchingCandidates = useCallback(async (
    jobId: string,
    options?: {
      threshold?: number;
      limit?: number;
    }
  ): Promise<MatchingCandidate[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('match-candidate-jobs', {
        body: {
          job_id: jobId,
          account_id: accountId,
          threshold: options?.threshold ?? 0.6,
          limit: options?.limit ?? 20,
        },
      });

      if (error) throw error;
      return data?.candidates || [];
    } catch (error) {
      console.error('Error finding matching candidates:', error);
      toast.error('Erro ao buscar candidatos compatíveis');
      return [];
    }
  }, [accountId]);

  // Clear search results
  const clearResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    // State
    isSearching,
    searchResults,
    isGeneratingEmbedding,
    
    // Actions
    generateEmbedding,
    searchCandidates,
    findMatchingJobs,
    findMatchingCandidates,
    clearResults,
  };
}
