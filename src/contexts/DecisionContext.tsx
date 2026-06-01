import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DecisionSession, DecisionAnswer } from '@/types/decision.types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('DecisionContext');

export interface CompiledDecision {
  guidelines: string[];
  summary: string;
}

interface DecisionContextType {
  session: DecisionSession | null;
  answers: DecisionAnswer[];
  loading: boolean;
  versionHistory: VersionHistoryItem[];
  compiledDecision: CompiledDecision | null;
  isCompiling: boolean;
  updateStage: (stage: number) => Promise<void>;
  addAnswer: (questionNumber: number, text: string, isSuggestion: boolean) => Promise<void>;
  updateAnswer: (answerId: string, newText: string) => Promise<void>;
  deleteAnswer: (answerId: string) => Promise<void>;
  getAnswersForQuestion: (questionNumber: number) => DecisionAnswer[];
  resetSession: () => Promise<void>;
  refetch: () => Promise<void>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  compileDecision: () => Promise<void>;
  clearCompiledDecision: () => void;
  restoreVersion: (versionId: string) => Promise<void>;
}

const DecisionContext = createContext<DecisionContextType | undefined>(undefined);

export function DecisionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [answers, setAnswers] = useState<DecisionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [compiledDecision, setCompiledDecision] = useState<CompiledDecision | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const loadSession = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      let existingSession = null;
      
      if (currentAccount?.id) {
        const { data: accountSession, error: accountError } = await supabase
          .from('decision_sessions')
          .select('*')
          .eq('account_id', currentAccount.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (accountError) throw accountError;
        existingSession = accountSession;
      }
      
      if (!existingSession && !currentAccount?.id) {
        const { data: userSession, error: userError } = await supabase
          .from('decision_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (userError) throw userError;
        existingSession = userSession;
      }

      if (!existingSession) {
        if (!currentAccount?.id) {
          console.log('⏳ Waiting for account data before creating decision session...');
          setLoading(false);
          return;
        }
        
        const { data: newSession, error: createError } = await supabase
          .from('decision_sessions')
          .insert({ user_id: user.id, account_id: currentAccount.id, stage: 1 })
          .select()
          .single();

        if (createError) throw createError;
        existingSession = newSession;
      }

      setSession(existingSession as DecisionSession);

      // Load compiled decision from database if it exists
      if (existingSession.compiled_decision) {
        const saved = existingSession.compiled_decision as { guidelines: string[]; summary: string };
        if (saved.guidelines && Array.isArray(saved.guidelines)) {
          setCompiledDecision(saved);
          console.log('✅ Loaded compiled decision from database');
        }
      }

      const { data: answersData, error: answersError } = await supabase
        .from('decision_answers')
        .select('*')
        .eq('session_id', existingSession.id)
        .order('created_at', { ascending: true });

      if (answersError) throw answersError;
      setAnswers((answersData || []) as DecisionAnswer[]);
      
      await loadVersionHistoryForSession(existingSession.id);

    } catch (error) {
      console.error('Error loading decision session:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentAccount?.id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES: Record<number, string> = {
    8: 'step_revisao_decisoes', // Review
    9: 'step_decisoes_finalizadas', // Summary
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('decision_sessions')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      if (error) throw error;

      // Auto-save checkpoint if this is a key stage
      if (CHECKPOINT_STAGES[stage] && oldStage < stage) {
        await saveVersionSnapshot(CHECKPOINT_STAGES[stage]);
        console.log(`✅ Auto-save: ${CHECKPOINT_STAGES[stage]}`);
      }

      setSession({ ...session, stage });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const invalidateCompiledDecision = async () => {
    if (!session) return;
    
    // Clear in database
    await supabase
      .from('decision_sessions')
      .update({ compiled_decision: null, updated_at: new Date().toISOString() })
      .eq('id', session.id);
    
    // Clear in state
    setCompiledDecision(null);
  };

  const addAnswer = async (questionNumber: number, text: string, isSuggestion: boolean) => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('decision_answers')
        .insert({
          session_id: session.id,
          question_number: questionNumber,
          answer_text: text,
          is_suggestion: isSuggestion
        })
        .select()
        .single();

      if (error) throw error;
      setAnswers([...answers, data as DecisionAnswer]);
      // Invalidate compiled decision when answers change
      await invalidateCompiledDecision();
    } catch (error) {
      console.error('Error adding answer:', error);
    }
  };

  const updateAnswer = async (answerId: string, newText: string) => {
    try {
      const { error } = await supabase
        .from('decision_answers')
        .update({ answer_text: newText })
        .eq('id', answerId);

      if (error) throw error;
      setAnswers(answers.map(a => a.id === answerId ? { ...a, answer_text: newText } : a));
      // Invalidate compiled decision when answers change
      await invalidateCompiledDecision();
    } catch (error) {
      console.error('Error updating answer:', error);
    }
  };

  const deleteAnswer = async (answerId: string) => {
    try {
      const { error } = await supabase
        .from('decision_answers')
        .delete()
        .eq('id', answerId);

      if (error) throw error;
      setAnswers(answers.filter(a => a.id !== answerId));
      // Invalidate compiled decision when answers change
      await invalidateCompiledDecision();
    } catch (error) {
      console.error('Error deleting answer:', error);
    }
  };

  const getAnswersForQuestion = (questionNumber: number) => {
    return answers.filter(a => a.question_number === questionNumber);
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      // Salvar backup ANTES de deletar
      await saveVersionSnapshot('backup_before_reset');
      console.log('✅ Backup saved before reset');

      await supabase.from('decision_version_history').delete().eq('session_id', session.id);
      await supabase.from('decision_sessions').delete().eq('id', session.id);

      const { data: newSession, error } = await supabase
        .from('decision_sessions')
        .insert({ user_id: session.user_id, account_id: currentAccount?.id, stage: 1 })
        .select()
        .single();

      if (error) throw error;
      setSession(newSession as DecisionSession);
      setAnswers([]);
      setVersionHistory([]);
      setCompiledDecision(null);
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  const refetch = async () => {
    setLoading(true);
    await loadSession();
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('decision_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading decision version history:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (!session) return;
    await loadVersionHistoryForSession(session.id);
  };

  const saveVersionSnapshot = async (variant: string = 'update') => {
    if (!session) return;

    try {
      const snapshot = {
        answers: answers.map(a => ({
          question_number: a.question_number,
          answer_text: a.answer_text,
          is_suggestion: a.is_suggestion,
        })),
        stage: session.stage,
        compiledDecision: compiledDecision,
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('decision_version_history')
        .insert([{
          session_id: session.id,
          snapshot: snapshot as unknown as Json,
          variant,
        }]);

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving decision version snapshot:', error);
    }
  };

  const compileDecision = async () => {
    if (!session) return;
    
    if (!answers || answers.length === 0) {
      toast.error('Nenhuma resposta para compilar');
      return;
    }

    setIsCompiling(true);

    try {
      const response = await supabase.functions.invoke('compile-decision', {
        body: { answers }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao compilar framework');
      }

      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }

      const compiled = {
        guidelines: data.guidelines,
        summary: data.summary
      };

      // Save to database for persistence
      const { error: updateError } = await supabase
        .from('decision_sessions')
        .update({ 
          compiled_decision: compiled as unknown as Json,
          updated_at: new Date().toISOString() 
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error saving compiled decision:', updateError);
      } else {
        console.log('✅ Compiled decision saved to database');
      }

      setCompiledDecision(compiled);

      toast.success('Framework compilado com sucesso!');
    } catch (error) {
      console.error('Error compiling decision:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao compilar framework');
    } finally {
      setIsCompiling(false);
    }
  };

  const clearCompiledDecision = () => {
    setCompiledDecision(null);
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      await saveVersionSnapshot('before_restore');

      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { answers?: { question_number: number; answer_text: string; is_suggestion: boolean }[]; compiledDecision?: CompiledDecision };

      if (snapshot.answers) {
        // Delete current answers
        await supabase.from('decision_answers').delete().eq('session_id', session.id);

        // Re-insert from snapshot
        if (snapshot.answers.length > 0) {
          await supabase.from('decision_answers').insert(
            snapshot.answers.map(a => ({
              session_id: session.id,
              question_number: a.question_number,
              answer_text: a.answer_text,
              is_suggestion: a.is_suggestion,
            }))
          );
        }

        // Restore compiled decision if present
        if (snapshot.compiledDecision) {
          setCompiledDecision(snapshot.compiledDecision);
          await supabase.from('decision_sessions').update({ compiled_decision: snapshot.compiledDecision as unknown as Json, updated_at: new Date().toISOString() }).eq('id', session.id);
        }
      }

      await updateStage(9);
      await refetch();
      toast.success('Versão restaurada com sucesso!');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Erro ao restaurar versão');
    }
  };

  return (
    <DecisionContext.Provider value={{
      session,
      answers,
      loading,
      versionHistory,
      compiledDecision,
      isCompiling,
      updateStage,
      addAnswer,
      updateAnswer,
      deleteAnswer,
      getAnswersForQuestion,
      resetSession,
      refetch,
      saveVersionSnapshot,
      loadVersionHistory,
      compileDecision,
      clearCompiledDecision,
      restoreVersion,
    }}>
      {children}
    </DecisionContext.Provider>
  );
}

export function useDecision() {
  const context = useContext(DecisionContext);
  if (context === undefined) {
    throw new Error('useDecision must be used within a DecisionProvider');
  }
  return context;
}
