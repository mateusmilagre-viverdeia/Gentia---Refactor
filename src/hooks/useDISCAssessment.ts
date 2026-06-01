import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useAccount } from '@/hooks/useAccount';
import { toast } from 'sonner';
import {
  DISCQuestion,
  DISCSession,
  DISCResponse,
  DISCResult,
  DISCDimension,
  MIN_DIMENSION_SCORE,
  MAX_DIMENSION_SCORE,
  INTENSITY_THRESHOLDS,
  BALANCE_THRESHOLD
} from '@/types/disc.types';

// =============================================
// DISC Scoring Logic
// =============================================

interface DimensionScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

/**
 * Calcula scores brutos por dimensão
 */
export function calculateRawScores(
  responses: { question_id: string; score: number }[],
  questions: DISCQuestion[]
): DimensionScores {
  const scores: DimensionScores = { D: 0, I: 0, S: 0, C: 0 };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.question_id);
    if (!question) return;

    let score = response.score;
    
    // Inverter score se for pergunta reversa (1→5, 2→4, etc.)
    if (question.is_reverse_scored) {
      score = 6 - score;
    }

    scores[question.dimension] += score;
  });

  return scores;
}

/**
 * Normaliza score de 8-40 para 0-100
 */
export function normalizeScore(rawScore: number): number {
  const normalized = ((rawScore - MIN_DIMENSION_SCORE) / (MAX_DIMENSION_SCORE - MIN_DIMENSION_SCORE)) * 100;
  return Math.round(normalized * 100) / 100; // 2 casas decimais
}

/**
 * Identifica perfil primário e secundário
 */
export function identifyProfiles(normalizedScores: DimensionScores): {
  primary: DISCDimension;
  secondary: DISCDimension | null;
} {
  const sorted = (Object.entries(normalizedScores) as [DISCDimension, number][])
    .sort((a, b) => b[1] - a[1]);

  const primary = sorted[0][0];
  
  // Secundário só se tiver diferença significativa do terço
  const secondaryScore = sorted[1][1];
  const thirdScore = sorted[2][1];
  const secondary = (secondaryScore - thirdScore >= 5) ? sorted[1][0] : null;

  return { primary, secondary };
}

/**
 * Determina intensidade do perfil primário
 */
export function getIntensity(primaryScore: number): 'baixa' | 'média' | 'alta' {
  if (primaryScore <= INTENSITY_THRESHOLDS.baixa.max) return 'baixa';
  if (primaryScore <= INTENSITY_THRESHOLDS.média.max) return 'média';
  return 'alta';
}

/**
 * Verifica se há equilíbrio entre dimensões
 */
export function checkBalance(normalizedScores: DimensionScores): boolean {
  const values = Object.values(normalizedScores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (max - min) <= BALANCE_THRESHOLD;
}

/**
 * Calcula resultado completo do DISC
 */
export function calculateDISCResult(
  responses: { question_id: string; score: number }[],
  questions: DISCQuestion[]
): Omit<DISCResult, 'id' | 'session_id' | 'created_at'> {
  const rawScores = calculateRawScores(responses, questions);
  
  const normalizedScores: DimensionScores = {
    D: normalizeScore(rawScores.D),
    I: normalizeScore(rawScores.I),
    S: normalizeScore(rawScores.S),
    C: normalizeScore(rawScores.C)
  };

  const { primary, secondary } = identifyProfiles(normalizedScores);
  const intensity = getIntensity(normalizedScores[primary]);
  const isBalanced = checkBalance(normalizedScores);

  return {
    d_score: rawScores.D,
    i_score: rawScores.I,
    s_score: rawScores.S,
    c_score: rawScores.C,
    d_normalized: normalizedScores.D,
    i_normalized: normalizedScores.I,
    s_normalized: normalizedScores.S,
    c_normalized: normalizedScores.C,
    primary_profile: primary,
    secondary_profile: secondary,
    intensity,
    is_balanced: isBalanced
  };
}

// =============================================
// React Hook
// =============================================

export function useDISCAssessment() {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const { isAdmin, isOwner } = useAccount();
  const queryClient = useQueryClient();
  
  // Effective user ID for filtering (respects impersonation)
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  // Fetch user's account_id from profile
  const { data: accountId } = useQuery({
    queryKey: ['user-account-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();
      return data?.account_id ?? null;
    },
    enabled: !!user?.id
  });

  // Fetch questions
  const {
    data: questions = [],
    isLoading: isLoadingQuestions
  } = useQuery({
    queryKey: ['disc-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disc_questions')
        .select('*')
        .eq('is_active', true)
        .order('dimension')
        .order('question_number');

      if (error) throw error;
      return data as DISCQuestion[];
    }
  });

  // Fetch sessions for current account
  const {
    data: rawSessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['disc-sessions', accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from('disc_sessions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DISCSession[];
    },
    enabled: !!accountId
  });

  // Filter sessions based on impersonation and role
  const sessions = useMemo(() => {
    // If not impersonating or is admin/owner, show all
    if (!isImpersonating || isAdmin || isOwner) {
      return rawSessions;
    }
    // When impersonating a non-admin, show only their sessions
    return rawSessions.filter(s => s.user_id === effectiveUserId);
  }, [rawSessions, isImpersonating, isAdmin, isOwner, effectiveUserId]);

  // Create new session
  const createSession = useMutation({
    mutationFn: async (data: { participant_name: string; participant_email?: string }) => {
      if (!user?.id || !accountId) throw new Error('Usuário não autenticado');

      const { data: session, error } = await supabase
        .from('disc_sessions')
        .insert({
          account_id: accountId,
          user_id: user.id,
          participant_name: data.participant_name,
          participant_email: data.participant_email || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return session as DISCSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disc-sessions'] });
      toast.success('Assessment criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar assessment: ' + error.message);
    }
  });

  // Start session
  const startSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('disc_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disc-sessions'] });
    }
  });

  // Save responses and calculate result
  const submitResponses = useMutation({
    mutationFn: async (data: {
      sessionId: string;
      responses: { question_id: string; score: number }[];
    }) => {
      // 1. Insert responses
      const responsesToInsert = data.responses.map(r => ({
        session_id: data.sessionId,
        question_id: r.question_id,
        score: r.score
      }));

      const { error: responsesError } = await supabase
        .from('disc_responses')
        .insert(responsesToInsert);

      if (responsesError) throw responsesError;

      // 2. Calculate result
      const result = calculateDISCResult(data.responses, questions);

      // 3. Insert result
      const { error: resultError } = await supabase
        .from('disc_results')
        .insert({
          session_id: data.sessionId,
          ...result
        });

      if (resultError) throw resultError;

      // 4. Update session status
      const { error: sessionError } = await supabase
        .from('disc_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', data.sessionId);

      if (sessionError) throw sessionError;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disc-sessions'] });
      toast.success('Assessment concluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar respostas: ' + error.message);
    }
  });

  // Fetch result for a session
  const fetchResult = useCallback(async (sessionId: string): Promise<DISCResult | null> => {
    const { data, error } = await supabase
      .from('disc_results')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as DISCResult;
  }, []);

  // Delete session
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('disc_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disc-sessions'] });
      toast.success('Assessment excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  return {
    // Data
    questions,
    sessions,
    
    // Loading states
    isLoadingQuestions,
    isLoadingSessions,
    
    // Mutations
    createSession,
    startSession,
    submitResponses,
    deleteSession,
    
    // Helpers
    fetchResult,
    refetchSessions
  };
}
