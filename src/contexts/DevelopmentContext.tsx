import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DevelopmentSession, SelectedDevelopmentItem } from '@/types/development.types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('DevelopmentContext');

interface SaveResult {
  success: boolean;
  error?: string;
}

interface DevelopmentContextType {
  session: DevelopmentSession | null;
  loading: boolean;
  versionHistory: VersionHistoryItem[];
  updateStage: (stage: number) => Promise<void>;
  resetSession: () => Promise<void>;
  saveSelections: (phase: number, items: SelectedDevelopmentItem[]) => Promise<SaveResult>;
  getSelections: (phase: number) => Promise<SelectedDevelopmentItem[]>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
}

const DevelopmentContext = createContext<DevelopmentContextType | undefined>(undefined);

export function DevelopmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<DevelopmentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);

  useEffect(() => {
    if (user) {
      loadSession();
    }
  }, [user, currentAccount]);

  const loadSession = async () => {
    if (!user) return;
    
    try {
      let existingSession = null;
      
      if (currentAccount?.id) {
        const { data: accountSession, error: accountError } = await supabase
          .from('development_sessions')
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
          .from('development_sessions')
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
        setSession(existingSession as DevelopmentSession);
        await loadVersionHistoryForSession(existingSession.id);
      } else {
        if (currentAccount?.id) {
          await createSession();
        } else {
          console.log('⏳ Waiting for account data before creating development session...');
        }
      }
    } catch (error) {
      console.error('Error loading development session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('development_sessions')
        .insert({ user_id: user.id, account_id: currentAccount?.id, stage: 1 })
        .select()
        .single();

      if (error) throw error;
      setSession(data as DevelopmentSession);
    } catch (error) {
      console.error('Error creating development session:', error);
    }
  };

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES: Record<number, string> = {
    2: 'step_selecao_10_dev',
    3: 'step_selecao_5_dev',
    4: 'step_aprovacao_dev',
    5: 'step_desenvolvimento_finalizado',
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('development_sessions')
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

  const resetSession = async () => {
    if (!session) return;

    try {
      // Save backup before reset
      await saveVersionSnapshot('backup_before_reset');
      
      // Soft delete - mark as deleted instead of permanently removing
      const { error } = await supabase
        .from('development_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', session.id);
      
      if (error) throw error;
      
      setVersionHistory([]);
      await createSession();
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  const saveSelections = async (phase: number, items: SelectedDevelopmentItem[]): Promise<SaveResult> => {
    if (!session) return { success: false, error: 'Sessão não encontrada' };

    try {
      const { error: deleteError } = await supabase
        .from('development_selections')
        .delete()
        .eq('session_id', session.id)
        .eq('phase', phase);

      if (deleteError) throw deleteError;

      if (items.length > 0) {
        const { error } = await supabase
          .from('development_selections')
          .insert(
            items.map(item => ({
              session_id: session.id,
              item_id: item.id,
              phase,
              label: item.label,
              category: item.category,
              category_label: item.category_label,
            }))
          );

        if (error) throw error;
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error saving selections:', error);
      return { success: false, error: error?.message || 'Erro ao salvar seleções' };
    }
  };

  const getSelections = async (phase: number): Promise<SelectedDevelopmentItem[]> => {
    if (!session) return [];

    try {
      const { data, error } = await supabase
        .from('development_selections')
        .select('item_id, label, category, category_label')
        .eq('session_id', session.id)
        .eq('phase', phase);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.item_id,
        label: row.label || '',
        category: row.category || '',
        category_label: row.category_label || '',
      }));
    } catch (error) {
      console.error('Error getting selections:', error);
      return [];
    }
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('development_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading development version history:', error);
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
        .from('development_version_history')
        .insert({
          session_id: session.id,
          snapshot,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving development version snapshot:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      // Save backup of current state
      await saveVersionSnapshot('before_restore');

      // Find the version to restore
      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { items?: { id: string; label: string; category: string; category_label: string }[]; stage?: number };
      if (!snapshot.items) return;

      // Delete current phase 3 selections
      await supabase
        .from('development_selections')
        .delete()
        .eq('session_id', session.id)
        .eq('phase', 3);

      // Re-insert from snapshot
      if (snapshot.items.length > 0) {
        await supabase
          .from('development_selections')
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

      // Update stage to summary
      await updateStage(5);
      await loadVersionHistory();
      toast.success('Versão restaurada com sucesso!');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Erro ao restaurar versão');
    }
  };

  return (
    <DevelopmentContext.Provider
      value={{
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
      }}
    >
      {children}
    </DevelopmentContext.Provider>
  );
}

export function useDevelopment() {
  const context = useContext(DevelopmentContext);
  if (!context) {
    throw new Error('useDevelopment must be used within a DevelopmentProvider');
  }
  return context;
}
