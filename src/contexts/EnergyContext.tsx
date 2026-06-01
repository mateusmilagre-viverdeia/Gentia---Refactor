import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EnergySession, SelectedEnergyItem } from '@/types/energy.types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { toast as sonnerToast } from 'sonner';
import { createLogger } from '@/lib/logger';

const log = createLogger('EnergyContext');

interface SaveResult {
  success: boolean;
  error?: string;
}

interface EnergyContextType {
  session: EnergySession | null;
  loading: boolean;
  versionHistory: VersionHistoryItem[];
  loadSession: () => Promise<void>;
  updateStage: (stage: number) => Promise<void>;
  resetSession: () => Promise<void>;
  saveSelections: (phase: number, items: SelectedEnergyItem[]) => Promise<SaveResult>;
  getSelections: (phase: number) => Promise<SelectedEnergyItem[]>;
  updateSelectionLabel: (phase: number, itemId: string, newLabel: string) => Promise<boolean>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
}

const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<EnergySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);

  const loadSession = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let existingSession = null;
      
      if (currentAccount?.id) {
        const { data: accountSession, error: accountError } = await supabase
          .from('energy_sessions')
          .select('*')
          .eq('account_id', currentAccount.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (accountError) throw accountError;
        existingSession = accountSession;
      }
      
      if (!existingSession && !currentAccount?.id) {
        const { data: userSession, error: userError } = await supabase
          .from('energy_sessions')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (userError) throw userError;
        existingSession = userSession;
      }

      if (existingSession) {
        setSession(existingSession as EnergySession);
        await loadVersionHistoryForSession(existingSession.id);
      } else {
        if (currentAccount?.id) {
          await createSession();
        } else {
          console.log('⏳ Waiting for account data before creating energy session...');
        }
      }
    } catch (error) {
      console.error('Error loading energy session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('energy_sessions')
        .insert({ user_id: user.id, account_id: currentAccount?.id, stage: 1 })
        .select()
        .single();

      if (error) throw error;
      setSession(data as EnergySession);
    } catch (error) {
      console.error('Error creating energy session:', error);
    }
  };

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES: Record<number, string> = {
    2: 'step_selecao_10',
    3: 'step_selecao_5',
    4: 'step_aprovacao_energia',
    5: 'step_energia_finalizada',
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('energy_sessions')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      if (error) throw error;

      // Auto-save checkpoint if this is a key stage
      if (CHECKPOINT_STAGES[stage] && oldStage < stage) {
        await saveVersionSnapshot(CHECKPOINT_STAGES[stage]);
        console.log(`✅ Auto-save: ${CHECKPOINT_STAGES[stage]}`);
      }

      setSession(prev => prev ? { ...prev, stage } : null);
    } catch (error) {
      console.error('Error updating energy stage:', error);
    }
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      // Save backup before reset
      await saveVersionSnapshot('backup_before_reset');
      
      // Soft delete - mark as deleted instead of permanently removing
      const { error } = await supabase
        .from('energy_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', session.id);
      
      if (error) throw error;
      
      setSession(null);
      setVersionHistory([]);
      await createSession();
    } catch (error) {
      console.error('Error resetting energy session:', error);
    }
  };

  const saveSelections = async (phase: number, items: SelectedEnergyItem[]): Promise<SaveResult> => {
    if (!session) return { success: false, error: 'Sessão não encontrada' };

    try {
      const { error: deleteError } = await supabase
        .from('energy_selections')
        .delete()
        .eq('session_id', session.id)
        .eq('phase', phase);

      if (deleteError) throw deleteError;

      if (items.length > 0) {
        const insertData = items.map(item => ({
          session_id: session.id,
          item_id: item.id,
          phase,
          label: item.label,
          category: item.category,
          category_label: item.category_label,
        }));

        const { error } = await supabase.from('energy_selections').insert(insertData);
        if (error) throw error;
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error saving energy selections:', error);
      return { success: false, error: error?.message || 'Erro ao salvar seleções' };
    }
  };

  const getSelections = async (phase: number): Promise<SelectedEnergyItem[]> => {
    if (!session) return [];

    try {
      const { data, error } = await supabase
        .from('energy_selections')
        .select('item_id, label, category, category_label')
        .eq('session_id', session.id)
        .eq('phase', phase);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map(row => ({
        id: row.item_id,
        label: row.label || '',
        category: row.category || '',
        category_label: row.category_label || '',
      }));
    } catch (error) {
      console.error('Error getting energy selections:', error);
      return [];
    }
  };
  const updateSelectionLabel = async (phase: number, itemId: string, newLabel: string): Promise<boolean> => {
    if (!session) return false;
    try {
      const { error } = await supabase
        .from('energy_selections')
        .update({ label: newLabel })
        .eq('session_id', session.id)
        .eq('phase', phase)
        .eq('item_id', itemId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating selection label:', error);
      return false;
    }
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('energy_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading energy version history:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (!session) return;
    await loadVersionHistoryForSession(session.id);
  };

  const saveVersionSnapshot = async (variant: string = 'update') => {
    if (!session) return;

    try {
      const selections = await getSelections(3);
      const snapshot = {
        items: selections.map(s => ({
          id: s.id,
          label: s.label,
          category: s.category,
          category_label: s.category_label,
        })),
        stage: session.stage,
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('energy_version_history')
        .insert({
          session_id: session.id,
          snapshot,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving energy version snapshot:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      await saveVersionSnapshot('before_restore');

      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { items?: { id: string; label: string; category: string; category_label: string }[]; stage?: number };
      if (!snapshot.items) return;

      await supabase
        .from('energy_selections')
        .delete()
        .eq('session_id', session.id)
        .eq('phase', 3);

      if (snapshot.items.length > 0) {
        await supabase
          .from('energy_selections')
          .insert(
            snapshot.items.map(item => ({
              session_id: session.id,
              item_id: item.id,
              phase: 3,
              label: item.label,
              category: item.category,
              category_label: item.category_label,
            }))
          );
      }

      await updateStage(5);
      await loadVersionHistory();
      sonnerToast.success('Versão restaurada com sucesso!');
    } catch (error) {
      console.error('Error restoring version:', error);
      sonnerToast.error('Erro ao restaurar versão');
    }
  };

  useEffect(() => {
    loadSession();
  }, [user, currentAccount]);

  return (
    <EnergyContext.Provider value={{
      session,
      loading,
      versionHistory,
      loadSession,
      updateStage,
      resetSession,
      saveSelections,
      getSelections,
      updateSelectionLabel,
      saveVersionSnapshot,
      loadVersionHistory,
      restoreVersion,
    }}>
      {children}
    </EnergyContext.Provider>
  );
}

export function useEnergy() {
  const context = useContext(EnergyContext);
  if (!context) {
    throw new Error('useEnergy must be used within an EnergyProvider');
  }
  return context;
}
