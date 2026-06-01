import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Segment, Perspective, IndicatorSession } from '@/types/indicators.types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';

export function useIndicatorsSession() {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<IndicatorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);

  const loadSession = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('strategic_indicators').select('*');
      if (currentAccount?.id) {
        query = query.eq('account_id', currentAccount.id);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSession({
          ...data,
          segment: data.segment as Segment,
          selected_step1: (data.selected_step1 as Record<Perspective, string[]>) || {
            financeira: [],
            clientes: [],
            processos: [],
            aprendizado: []
          },
          final_selection: (data.final_selection as string[]) || []
        });
        
        await loadVersionHistoryForSession(data.id);
      }
    } catch (error) {
      console.error('Error loading indicators session:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentAccount]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const createSession = async (segment: Segment) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('strategic_indicators')
        .insert({
          user_id: user.id,
          account_id: currentAccount?.id,
          segment,
          selected_step1: {
            financeira: [],
            clientes: [],
            processos: [],
            aprendizado: []
          },
          final_selection: [],
          stage: 1
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: IndicatorSession = {
        ...data,
        segment: data.segment as Segment,
        selected_step1: data.selected_step1 as Record<Perspective, string[]>,
        final_selection: data.final_selection as string[]
      };
      setSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Error creating indicators session:', error);
      return null;
    }
  };

  const updateSegment = async (segment: Segment) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('strategic_indicators')
        .update({ 
          segment,
          selected_step1: {
            financeira: [],
            clientes: [],
            processos: [],
            aprendizado: []
          }
        })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? { 
        ...prev, 
        segment,
        selected_step1: {
          financeira: [],
          clientes: [],
          processos: [],
          aprendizado: []
        }
      } : null);
    } catch (error) {
      console.error('Error updating segment:', error);
    }
  };

  const updatePerspectiveSelection = async (perspective: Perspective, indicators: string[]) => {
    if (!session) return;

    const newSelection = {
      ...session.selected_step1,
      [perspective]: indicators
    };

    try {
      const { error } = await supabase
        .from('strategic_indicators')
        .update({ selected_step1: newSelection })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? { ...prev, selected_step1: newSelection } : null);
    } catch (error) {
      console.error('Error updating perspective selection:', error);
    }
  };

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES: Record<number, string> = {
    2: 'step_selecao_perspectivas',
    3: 'step_kpis_finalizados',
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('strategic_indicators')
        .update({ stage })
        .eq('id', session.id);

      if (error) throw error;

      // Auto-save checkpoint if this is a key stage
      if (CHECKPOINT_STAGES[stage] && oldStage < stage) {
        await saveVersionSnapshot(CHECKPOINT_STAGES[stage]);
        console.log(`✅ Auto-save: ${CHECKPOINT_STAGES[stage]}`);
      }

      setSession(prev => prev ? { ...prev, stage } : null);
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const updateFinalSelection = async (indicators: string[]) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('strategic_indicators')
        .update({ final_selection: indicators, stage: 3 })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? { ...prev, final_selection: indicators, stage: 3 } : null);
    } catch (error) {
      console.error('Error updating final selection:', error);
    }
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      // Salvar backup ANTES de deletar
      await saveVersionSnapshot('backup_before_reset');
      console.log('✅ Backup saved before reset');

      await supabase.from('indicators_version_history').delete().eq('session_id', session.id);
      await supabase.from('strategic_indicators').delete().eq('id', session.id);
      setSession(null);
      setVersionHistory([]);
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  const getAllSelectedIndicators = (): string[] => {
    if (!session) return [];
    return Object.values(session.selected_step1).flat();
  };

  const getTotalSelected = (): number => {
    return getAllSelectedIndicators().length;
  };

  const isStep1Complete = (): boolean => {
    if (!session) return false;
    return Object.values(session.selected_step1).every(arr => arr.length > 0);
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('indicators_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading indicators version history:', error);
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
        segment: session.segment,
        selected_step1: session.selected_step1,
        final_selection: session.final_selection,
        stage: session.stage,
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('indicators_version_history')
        .insert({
          session_id: session.id,
          snapshot,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving indicators version snapshot:', error);
    }
  };

  return {
    session,
    loading,
    versionHistory,
    createSession,
    updateSegment,
    updatePerspectiveSelection,
    updateStage,
    updateFinalSelection,
    resetSession,
    getAllSelectedIndicators,
    getTotalSelected,
    isStep1Complete,
    saveVersionSnapshot,
    loadVersionHistory,
  };
}
