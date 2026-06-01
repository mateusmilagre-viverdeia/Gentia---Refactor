import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  QAQuestion,
  QASession,
  QAResult,
  QADimension,
  getProfileFromScore,
  groupQuestionsByEvent,
  QAEventGroup
} from '@/types/qa.types';

// =============================================
// QA Scoring Logic
// =============================================

interface DimensionScores {
  C: number;
  R: number;
  A: number;
  D: number;
}

/**
 * Calcula scores brutos por dimensão
 */
export function calculateRawScores(
  responses: { question_id: string; score: number }[],
  questions: QAQuestion[]
): DimensionScores {
  const scores: DimensionScores = { C: 0, R: 0, A: 0, D: 0 };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.question_id);
    if (!question) return;
    scores[question.dimension as QADimension] += response.score;
  });

  return scores;
}

/**
 * Calcula resultado completo do QA - Modelo CORE Oficial (escala 20-100)
 */
export function calculateQAResult(
  responses: { question_id: string; score: number }[],
  questions: QAQuestion[]
): Omit<QAResult, 'id' | 'session_id' | 'created_at'> {
  const rawScores = calculateRawScores(responses, questions);
  
  // QA Total = C + O + R + E (escala 20-100)
  const qaTotal = rawScores.C + rawScores.R + rawScores.A + rawScores.D;
  
  const { profile, level } = getProfileFromScore(qaTotal);

  return {
    c_score: rawScores.C,
    r_score: rawScores.R,
    a_score: rawScores.A,
    d_score: rawScores.D,
    qa_total: qaTotal,
    profile,
    profile_level: level
  };
}

// =============================================
// React Hook
// =============================================

export function useQAAssessment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    queryKey: ['qa-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_questions')
        .select('*')
        .eq('is_active', true)
        .order('event_number')
        .order('dimension');

      if (error) throw error;
      return data as QAQuestion[];
    }
  });

  // Group questions by event
  const eventGroups: QAEventGroup[] = groupQuestionsByEvent(questions);

  // Fetch sessions for current account
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['qa-sessions', accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from('qa_sessions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QASession[];
    },
    enabled: !!accountId
  });

  // Create new session
  const createSession = useMutation({
    mutationFn: async (data: { participant_name: string; participant_email?: string; team_id?: string }) => {
      if (!user?.id || !accountId) throw new Error('Usuário não autenticado');

      const { data: session, error } = await supabase
        .from('qa_sessions')
        .insert({
          account_id: accountId,
          user_id: user.id,
          participant_name: data.participant_name,
          participant_email: data.participant_email || null,
          team_id: data.team_id || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return session as QASession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-sessions'] });
      toast.success('Teste QA criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar teste: ' + error.message);
    }
  });

  // Start session
  const startSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('qa_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-sessions'] });
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
        .from('qa_responses')
        .insert(responsesToInsert);

      if (responsesError) throw responsesError;

      // 2. Calculate result
      const result = calculateQAResult(data.responses, questions);

      // 3. Insert result
      const { error: resultError } = await supabase
        .from('qa_results')
        .insert({
          session_id: data.sessionId,
          ...result
        });

      if (resultError) throw resultError;

      // 4. Update session status
      const { error: sessionError } = await supabase
        .from('qa_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', data.sessionId);

      if (sessionError) throw sessionError;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-sessions'] });
      toast.success('Teste QA concluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar respostas: ' + error.message);
    }
  });

  // Fetch result for a session
  const fetchResult = useCallback(async (sessionId: string): Promise<QAResult | null> => {
    const { data, error } = await supabase
      .from('qa_results')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as QAResult;
  }, []);

  // Delete session
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('qa_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-sessions'] });
      toast.success('Teste QA excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  return {
    // Data
    questions,
    eventGroups,
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
