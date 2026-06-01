import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DISCDimension, DISCQuestion } from '@/types/disc.types';

// =============================================
// Types
// =============================================

export interface CandidateDISCSession {
  id: string;
  candidate_id: string;
  job_id: string;
  agent_id: string | null;
  account_id: string;
  token: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface CandidateDISCResult {
  id: string;
  session_id: string;
  d_score: number;
  i_score: number;
  s_score: number;
  c_score: number;
  d_normalized: number;
  i_normalized: number;
  s_normalized: number;
  c_normalized: number;
  primary_profile: DISCDimension;
  secondary_profile: DISCDimension | null;
  intensity: 'baixa' | 'média' | 'alta';
  is_balanced: boolean;
  match_score: number | null;
  created_at: string;
}

export interface CandidateDISCResponse {
  question_id: string;
  score: number; // 1-5
}

// =============================================
// Scoring Logic (reused from useDISCAssessment)
// =============================================

const QUESTIONS_PER_DIMENSION = 8;
const MIN_DIMENSION_SCORE = 8;
const MAX_DIMENSION_SCORE = 40;

function calculateRawScores(
  responses: CandidateDISCResponse[],
  questions: DISCQuestion[]
): Record<DISCDimension, number> {
  const scores: Record<DISCDimension, number> = { D: 0, I: 0, S: 0, C: 0 };
  
  responses.forEach(response => {
    const question = questions.find(q => q.id === response.question_id);
    if (!question) return;
    
    const dimension = question.dimension as DISCDimension;
    const score = question.is_reverse_scored ? (6 - response.score) : response.score;
    scores[dimension] += score;
  });
  
  return scores;
}

function normalizeScore(rawScore: number): number {
  const range = MAX_DIMENSION_SCORE - MIN_DIMENSION_SCORE;
  const normalized = ((rawScore - MIN_DIMENSION_SCORE) / range) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

function identifyProfiles(normalizedScores: Record<DISCDimension, number>): {
  primary: DISCDimension;
  secondary: DISCDimension | null;
} {
  const sorted = (Object.entries(normalizedScores) as [DISCDimension, number][])
    .sort((a, b) => b[1] - a[1]);
  
  const primary = sorted[0][0];
  const secondary = sorted[1][1] >= 40 ? sorted[1][0] : null;
  
  return { primary, secondary };
}

function getIntensity(primaryScore: number): 'baixa' | 'média' | 'alta' {
  if (primaryScore <= 40) return 'baixa';
  if (primaryScore <= 70) return 'média';
  return 'alta';
}

function checkBalance(normalizedScores: Record<DISCDimension, number>): boolean {
  const values = Object.values(normalizedScores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (max - min) <= 15;
}

export function calculateDISCResult(
  responses: CandidateDISCResponse[],
  questions: DISCQuestion[]
): Omit<CandidateDISCResult, 'id' | 'session_id' | 'match_score' | 'created_at'> {
  const rawScores = calculateRawScores(responses, questions);
  
  const normalizedScores: Record<DISCDimension, number> = {
    D: normalizeScore(rawScores.D),
    I: normalizeScore(rawScores.I),
    S: normalizeScore(rawScores.S),
    C: normalizeScore(rawScores.C),
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
    is_balanced: isBalanced,
  };
}

// =============================================
// Match Calculation
// =============================================

export interface DesiredDISCProfile {
  primary_profile: DISCDimension;
  secondary_profile: DISCDimension | null;
  min_match_score: number;
  weight_d: number;
  weight_i: number;
  weight_s: number;
  weight_c: number;
  // Advanced mode fields
  use_advanced_mode?: boolean;
  target_d?: number;
  target_i?: number;
  target_s?: number;
  target_c?: number;
  tolerance?: number;
  eliminator_d?: number | null;
  eliminator_i?: number | null;
  eliminator_s?: number | null;
  eliminator_c?: number | null;
}

export interface MatchScoreResult {
  score: number;
  eliminated: boolean;
  eliminationReason?: string;
}

export function calculateMatchScore(
  candidateResult: Pick<CandidateDISCResult, 'd_normalized' | 'i_normalized' | 's_normalized' | 'c_normalized'>,
  desiredProfile: DesiredDISCProfile
): number | MatchScoreResult {
  const candidateScores: Record<DISCDimension, number> = {
    D: candidateResult.d_normalized,
    I: candidateResult.i_normalized,
    S: candidateResult.s_normalized,
    C: candidateResult.c_normalized,
  };

  // Advanced mode: use individual targets and eliminators
  if (desiredProfile.use_advanced_mode) {
    const eliminators: Record<DISCDimension, number | null | undefined> = {
      D: desiredProfile.eliminator_d,
      I: desiredProfile.eliminator_i,
      S: desiredProfile.eliminator_s,
      C: desiredProfile.eliminator_c,
    };

    const dimensionNames: Record<DISCDimension, string> = {
      D: 'Dominância',
      I: 'Influência',
      S: 'Estabilidade',
      C: 'Conformidade',
    };

    // 1. Check elimination criteria first
    for (const dim of ['D', 'I', 'S', 'C'] as DISCDimension[]) {
      const eliminator = eliminators[dim];
      if (eliminator != null && candidateScores[dim] < eliminator) {
        return {
          score: 0,
          eliminated: true,
          eliminationReason: `${dimensionNames[dim]} (${candidateScores[dim]}) abaixo do mínimo (${eliminator})`,
        };
      }
    }

    // 2. Calculate differences with tolerance
    const targets: Record<DISCDimension, number> = {
      D: desiredProfile.target_d ?? 50,
      I: desiredProfile.target_i ?? 50,
      S: desiredProfile.target_s ?? 50,
      C: desiredProfile.target_c ?? 50,
    };

    const tolerance = desiredProfile.tolerance ?? 15;
    
    const weights: Record<DISCDimension, number> = {
      D: desiredProfile.weight_d / 100,
      I: desiredProfile.weight_i / 100,
      S: desiredProfile.weight_s / 100,
      C: desiredProfile.weight_c / 100,
    };

    let totalWeight = 0;
    let weightedDiff = 0;

    for (const dim of ['D', 'I', 'S', 'C'] as DISCDimension[]) {
      // Apply tolerance: only penalize differences beyond tolerance
      const rawDiff = Math.abs(candidateScores[dim] - targets[dim]);
      const effectiveDiff = Math.max(0, rawDiff - tolerance);
      
      weightedDiff += effectiveDiff * weights[dim];
      totalWeight += weights[dim];
    }

    const avgDiff = totalWeight > 0 ? weightedDiff / totalWeight : 0;
    // Scale the score: max diff after tolerance would be ~85 (100-15), so normalize accordingly
    const matchScore = Math.max(0, 100 - (avgDiff * 1.2));

    return {
      score: Math.round(matchScore),
      eliminated: false,
    };
  }

  // Simple mode: use hardcoded targets based on primary/secondary
  const targetScores: Record<DISCDimension, number> = {
    D: desiredProfile.primary_profile === 'D' ? 80 : (desiredProfile.secondary_profile === 'D' ? 60 : 30),
    I: desiredProfile.primary_profile === 'I' ? 80 : (desiredProfile.secondary_profile === 'I' ? 60 : 30),
    S: desiredProfile.primary_profile === 'S' ? 80 : (desiredProfile.secondary_profile === 'S' ? 60 : 30),
    C: desiredProfile.primary_profile === 'C' ? 80 : (desiredProfile.secondary_profile === 'C' ? 60 : 30),
  };
  
  const weights: Record<DISCDimension, number> = {
    D: desiredProfile.weight_d / 100,
    I: desiredProfile.weight_i / 100,
    S: desiredProfile.weight_s / 100,
    C: desiredProfile.weight_c / 100,
  };
  
  let totalWeight = 0;
  let weightedDiff = 0;
  
  for (const dim of ['D', 'I', 'S', 'C'] as DISCDimension[]) {
    const diff = Math.abs(candidateScores[dim] - targetScores[dim]);
    weightedDiff += diff * weights[dim];
    totalWeight += weights[dim];
  }
  
  const avgDiff = totalWeight > 0 ? weightedDiff / totalWeight : 0;
  const matchScore = Math.max(0, 100 - avgDiff);
  
  return Math.round(matchScore);
}

// Helper to get numeric score from result (for backward compatibility)
export function getMatchScoreValue(result: number | MatchScoreResult): number {
  if (typeof result === 'number') return result;
  return result.score;
}

// Helper to check if candidate was eliminated
export function isEliminated(result: number | MatchScoreResult): boolean {
  if (typeof result === 'number') return false;
  return result.eliminated;
}

// Helper to get elimination reason
export function getEliminationReason(result: number | MatchScoreResult): string | undefined {
  if (typeof result === 'number') return undefined;
  return result.eliminationReason;
}

// =============================================
// Hook
// =============================================

export function useCandidateDISC() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch session by token (public)
  const fetchSessionByToken = useCallback(async (token: string): Promise<CandidateDISCSession | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('candidate_disc_sessions')
        .select('*')
        .eq('token', token)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Sessão não encontrada ou expirada');
          return null;
        }
        throw fetchError;
      }
      
      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Esta sessão expirou');
        return null;
      }
      
      return data as CandidateDISCSession;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar sessão');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch DISC questions
  const fetchQuestions = useCallback(async (): Promise<DISCQuestion[]> => {
    const { data, error: fetchError } = await supabase
      .from('disc_questions')
      .select('*')
      .eq('is_active', true)
      .order('question_number');
    
    if (fetchError) throw fetchError;
    return data as DISCQuestion[];
  }, []);

  // Start session
  const startSession = useCallback(async (sessionId: string): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from('candidate_disc_sessions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    
    return true;
  }, []);

  // Submit responses and calculate result
  const submitResponses = useCallback(async (
    sessionId: string,
    responses: CandidateDISCResponse[],
    questions: DISCQuestion[],
    desiredProfile?: DesiredDISCProfile
  ): Promise<CandidateDISCResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Insert responses
      const responsesToInsert = responses.map(r => ({
        session_id: sessionId,
        question_id: r.question_id,
        score: r.score,
      }));
      
      const { error: insertError } = await supabase
        .from('candidate_disc_responses')
        .upsert(responsesToInsert, { onConflict: 'session_id,question_id' });
      
      if (insertError) throw insertError;
      
      // Calculate result
      const calculatedResult = calculateDISCResult(responses, questions);
      
      // Calculate match score if desired profile exists
      let matchScore: number | null = null;
      if (desiredProfile) {
        const matchResult = calculateMatchScore(calculatedResult, desiredProfile);
        matchScore = getMatchScoreValue(matchResult);
      }
      
      // Insert result
      const { data: resultData, error: resultError } = await supabase
        .from('candidate_disc_results')
        .insert({
          session_id: sessionId,
          ...calculatedResult,
          match_score: matchScore,
        })
        .select()
        .single();
      
      if (resultError) throw resultError;
      
      // Update session status
      await supabase
        .from('candidate_disc_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      
      // Get session data for orchestrator
      const { data: sessionData } = await supabase
        .from('candidate_disc_sessions')
        .select('candidate_id, job_id, account_id')
        .eq('id', sessionId)
        .single();

      // Call the orchestrator to handle auto-advancement/rejection
      if (sessionData) {
        try {
          console.log('🎯 Calling recruitment orchestrator for DISC completion...');
          await supabase.functions.invoke('recruitment-orchestrator', {
            body: {
              candidateId: sessionData.candidate_id,
              jobId: sessionData.job_id,
              accountId: sessionData.account_id,
              completedStepType: 'disc',
              sessionId: sessionId,
            },
          });
        } catch (orchError) {
          console.error('⚠️ Failed to call orchestrator:', orchError);
          // Don't fail the whole request if orchestrator fails
        }
      }
      
      return resultData as CandidateDISCResult;
    } catch (err: any) {
      console.error('[useCandidateDISC] submitResponses failed for session:', sessionId, 'Error:', err);
      setError(err.message || 'Erro ao enviar respostas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create session (for recruiters)
  const createSession = useCallback(async (data: {
    candidateId: string;
    jobId: string;
    agentId?: string;
    accountId: string;
  }): Promise<CandidateDISCSession | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate unique token
      const token = crypto.randomUUID();
      
      const { data: session, error: insertError } = await supabase
        .from('candidate_disc_sessions')
        .insert({
          candidate_id: data.candidateId,
          job_id: data.jobId,
          agent_id: data.agentId || null,
          account_id: data.accountId,
          token,
          status: 'pending',
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      return session as CandidateDISCSession;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar sessão');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch result for a session
  const fetchResult = useCallback(async (sessionId: string): Promise<CandidateDISCResult | null> => {
    const { data, error: fetchError } = await supabase
      .from('candidate_disc_results')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') return null;
      throw fetchError;
    }
    
    return data as CandidateDISCResult;
  }, []);

  // Fetch sessions for a candidate
  const fetchCandidateSessions = useCallback(async (candidateId: string): Promise<CandidateDISCSession[]> => {
    const { data, error: fetchError } = await supabase
      .from('candidate_disc_sessions')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    if (fetchError) throw fetchError;
    return data as CandidateDISCSession[];
  }, []);

  return {
    isLoading,
    error,
    fetchSessionByToken,
    fetchQuestions,
    startSession,
    submitResponses,
    createSession,
    fetchResult,
    fetchCandidateSessions,
    calculateMatchScore,
  };
}
