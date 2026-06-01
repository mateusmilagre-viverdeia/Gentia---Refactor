import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ValuesSession, SelectedValue } from '@/types/values.types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('ValuesContext');

interface ValuesContextType {
  session: ValuesSession | null;
  loading: boolean;
  versionHistory: VersionHistoryItem[];
  updateStage: (stage: number) => Promise<void>;
  resetSession: () => Promise<void>;
  saveSelections: (phase: number, values: SelectedValue[]) => Promise<void>;
  getSelections: (phase: number) => Promise<SelectedValue[]>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
}

const ValuesContext = createContext<ValuesContextType | null>(null);

export function ValuesProvider({ children }: { children: ReactNode }) {
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<ValuesSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);

  useEffect(() => {
    loadSession();
  }, [currentAccount]);

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let existingSession = null;
      
      if (currentAccount?.id) {
        const { data: accountSession, error: accountError } = await supabase
          .from('values_sessions')
          .select('*')
          .eq('account_id', currentAccount.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (accountError && accountError.code !== 'PGRST116') throw accountError;
        existingSession = accountSession;
      }
      
      if (!existingSession && !currentAccount?.id) {
        const { data: userSession, error: userError } = await supabase
          .from('values_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (userError && userError.code !== 'PGRST116') throw userError;
        existingSession = userSession;
      }

      if (!existingSession) {
        if (currentAccount?.id) {
          await createSession();
        } else {
          log.log('⏳ Waiting for account data before creating session...');
        }
      } else {
        setSession(existingSession);
        await loadVersionHistoryForSession(existingSession.id);
      }
    } catch (error) {
      log.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('values_sessions')
        .insert({
          user_id: user.id,
          account_id: currentAccount?.id,
          stage: 1
        })
        .select()
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      log.error('Error creating session:', error);
      throw error;
    }
  };

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES: Record<number, string> = {
    3: 'step_selecao_valores', // 5 valores selecionados
    7: 'step_valores_aprovados', // Valores aprovados
    9: 'step_valores_finalizados', // Summary
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('values_sessions')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      if (error) throw error;

      // Auto-save checkpoint if this is a key stage
      if (CHECKPOINT_STAGES[stage] && oldStage < stage) {
        await saveVersionSnapshot(CHECKPOINT_STAGES[stage]);
        log.log(`✅ Auto-save: ${CHECKPOINT_STAGES[stage]}`);
      }

      setSession({ ...session, stage });
      log.log('✅ ValuesContext - Stage updated to:', stage);
    } catch (error) {
      log.error('Error updating stage:', error);
      throw error;
    }
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      // Salvar backup ANTES de deletar
      await saveVersionSnapshot('backup_before_reset');
      log.log('✅ Backup saved before reset');

      await supabase.from('values_version_history').delete().eq('session_id', session.id);
      await supabase.from('values_sessions').delete().eq('id', session.id);
      setVersionHistory([]);
      await createSession();
    } catch (error) {
      log.error('Error resetting session:', error);
      throw error;
    }
  };

  const saveSelections = async (phase: number, values: SelectedValue[]) => {
    if (!session) return;

    try {
      await supabase
        .from('values_selections')
        .delete()
        .eq('session_id', session.id)
        .eq('phase', phase);

      const selections = values.map((value, index) => ({
        session_id: session.id,
        value_id: value.id,
        phase,
        position: index + 1
      }));

      const { error } = await supabase
        .from('values_selections')
        .insert(selections);

      if (error) throw error;
    } catch (error) {
      log.error('Error saving selections:', error);
      throw error;
    }
  };

  const getSelections = async (phase: number): Promise<SelectedValue[]> => {
    if (!session) return [];

    try {
      const { data, error } = await supabase
        .from('values_selections')
        .select(`
          value_id,
          position,
          values_catalog (
            id,
            label
          )
        `)
        .eq('session_id', session.id)
        .eq('phase', phase)
        .order('position');

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.values_catalog.id,
        label: item.values_catalog.label
      }));
    } catch (error) {
      log.error('Error getting selections:', error);
      return [];
    }
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('values_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      log.error('Error loading values version history:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (!session) return;
    await loadVersionHistoryForSession(session.id);
  };

  const saveVersionSnapshot = async (variant: string = 'update') => {
    if (!session) return;

    try {
      const values = await getSelections(3);
      
      const { data: behaviors } = await supabase
        .from('values_behaviors_selections')
        .select('value_label, do_selected, dont_selected')
        .eq('session_id', session.id);

      const snapshot = {
        values: values.map(v => ({ id: v.id, label: v.label })),
        behaviors: behaviors || [],
        stage: session.stage,
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('values_version_history')
        .insert({
          session_id: session.id,
          snapshot,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      log.error('Error saving values version snapshot:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      await saveVersionSnapshot('before_restore');

      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { values?: { id: string; label: string }[]; behaviors?: { value_label: string; do_selected: string[]; dont_selected: string[] }[]; stage?: number };

      // Restore values selections
      if (snapshot.values) {
        await supabase.from('values_selections').delete().eq('session_id', session.id).eq('phase', 3);
        if (snapshot.values.length > 0) {
          await supabase.from('values_selections').insert(
            snapshot.values.map((v, i) => ({ session_id: session.id, value_id: v.id, phase: 3, position: i + 1 }))
          );
        }
      }

      // Restore behaviors
      if (snapshot.behaviors && snapshot.behaviors.length > 0) {
        await supabase.from('values_behaviors_selections').delete().eq('session_id', session.id);
        await supabase.from('values_behaviors_selections').insert(
          snapshot.behaviors.map(b => ({ session_id: session.id, value_label: b.value_label, do_selected: b.do_selected, dont_selected: b.dont_selected }))
        );
      }

      await updateStage(snapshot.stage || 9);
      await loadVersionHistory();
      log.log('✅ Version restored');
    } catch (error) {
      log.error('Error restoring version:', error);
    }
  };

  return (
    <ValuesContext.Provider value={{
      session,
      loading,
      versionHistory,
      updateStage,
      resetSession,
      saveSelections,
      getSelections,
      saveVersionSnapshot,
      loadVersionHistory,
      restoreVersion,
    }}>
      {children}
    </ValuesContext.Provider>
  );
}

export function useValues() {
  const context = useContext(ValuesContext);
  if (!context) {
    throw new Error('useValues must be used within ValuesProvider');
  }
  return context;
}
