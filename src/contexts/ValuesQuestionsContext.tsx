import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { 
  ValuesQuestionsSession, 
  ValuesQuestionItem, 
  ValuesQuestionsCatalogItem,
  VersionHistoryEntry,
  findCatalogValueLabel 
} from '@/types/values-questions.types';
import { createLogger } from '@/lib/logger';
import { isFactualQuestion, FACTUAL_QUESTION_BLOCK_MESSAGE } from '@/lib/factualQuestionFilter';

const log = createLogger('ValuesQuestionsContext');

interface ValuesQuestionsContextType {
  session: ValuesQuestionsSession | null;
  items: ValuesQuestionItem[];
  catalog: ValuesQuestionsCatalogItem[];
  loading: boolean;
  aiLoading: boolean;
  aiSuggestions: string[];
  companyValues: string[];
  versionHistory: VersionHistoryEntry[];
  
  // Stage management
  updateStage: (stage: number) => Promise<void>;
  
  // Items CRUD
  addItem: (stageNumber: number, text: string, source: 'catalog' | 'ai' | 'custom', valueLabel?: string) => Promise<void>;
  updateItem: (id: string, text: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reorderItems: (items: ValuesQuestionItem[]) => Promise<void>;
  toggleThinkingTime: (id: string, value: boolean) => Promise<void>;
  
  // Helpers
  getItemsForStage: (stage: number) => ValuesQuestionItem[];
  getItemsForValue: (valueLabel: string) => ValuesQuestionItem[];
  getCatalogForStage: (stage: number) => ValuesQuestionsCatalogItem[];
  getCatalogForValue: (valueLabel: string) => ValuesQuestionsCatalogItem[];
  
  // AI
  generateAISuggestions: (valueLabel: string) => Promise<void>;
  clearAISuggestions: () => void;
  
  // Values management
  updateWorkingValues: (values: string[]) => Promise<void>;
  addWorkingValue: (value: string) => Promise<void>;
  removeWorkingValue: (value: string) => Promise<void>;
  
  // Version history
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  
  // Reset
  resetSession: () => Promise<void>;
}

const ValuesQuestionsContext = createContext<ValuesQuestionsContextType | null>(null);

export function ValuesQuestionsProvider({ children }: { children: React.ReactNode }) {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  
  const [session, setSession] = useState<ValuesQuestionsSession | null>(null);
  const [items, setItems] = useState<ValuesQuestionItem[]>([]);
  const [catalog, setCatalog] = useState<ValuesQuestionsCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [companyValues, setCompanyValues] = useState<string[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);

  // Load company values from values_selections phase 3
  const loadCompanyValues = useCallback(async () => {
    if (!currentAccount?.id) return;
    
    try {
      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq('account_id', currentAccount.id)
        .maybeSingle();

      if (valuesSession) {
        const { data: selections } = await supabase
          .from('values_selections')
          .select(`
            value_id,
            values_catalog (label)
          `)
          .eq('session_id', valuesSession.id)
          .eq('phase', 3)
          .order('position', { ascending: true });

        if (selections) {
          const labels = selections
            .map((s: any) => s.values_catalog?.label)
            .filter(Boolean);
          setCompanyValues(labels);
        }
      }
    } catch (error) {
      console.error('Error loading company values:', error);
    }
  }, [currentAccount?.id]);

  // Load catalog
  const loadCatalog = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('values_questions_catalog')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setCatalog(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  }, []);

  // Load or create session
  const loadSession = useCallback(async () => {
    if (!currentAccount?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to find existing session
      const { data: existingSession, error: fetchError } = await supabase
        .from('values_questions_sessions')
        .select('*')
        .eq('account_id', currentAccount.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingSession) {
        setSession({
          ...existingSession,
          working_values: existingSession.working_values as string[] || []
        });
        
        // Load items
        const { data: itemsData } = await supabase
          .from('values_questions_items')
          .select('*')
          .eq('session_id', existingSession.id)
          .order('position', { ascending: true });
        
        setItems((itemsData || []).map(item => ({
          ...item,
          source: item.source as 'catalog' | 'ai' | 'custom'
        })));
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('values_questions_sessions')
          .insert({
            account_id: currentAccount.id,
            user_id: user.id,
            stage: 0,
            working_values: []
          })
          .select()
          .single();

        if (createError) throw createError;
        setSession({
          ...newSession,
          working_values: []
        });
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar sessão',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.id, toast]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadCompanyValues();
  }, [loadCompanyValues]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES: Record<number, string> = {
    5: 'step_revisao_perguntas',
    6: 'step_perguntas_finalizadas',
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('values_questions_sessions')
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

  const addItem = async (
    stageNumber: number, 
    text: string, 
    source: 'catalog' | 'ai' | 'custom',
    valueLabel?: string
  ) => {
    if (!session) return;

    if (isFactualQuestion(text)) {
      toast({ title: 'Pergunta bloqueada', description: FACTUAL_QUESTION_BLOCK_MESSAGE, variant: 'destructive' });
      return;
    }

    try {
      const maxPosition = items
        .filter(i => i.stage_number === stageNumber)
        .reduce((max, i) => Math.max(max, i.position || 0), 0);

      const { data, error } = await supabase
        .from('values_questions_items')
        .insert({
          session_id: session.id,
          stage_number: stageNumber,
          question_text: text,
          source,
          value_label: valueLabel || null,
          position: maxPosition + 1
        })
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [...prev, { ...data, source: data.source as 'catalog' | 'ai' | 'custom' }]);
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar pergunta',
        variant: 'destructive'
      });
    }
  };

  const updateItem = async (id: string, text: string) => {
    if (isFactualQuestion(text)) {
      toast({ title: 'Pergunta bloqueada', description: FACTUAL_QUESTION_BLOCK_MESSAGE, variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('values_questions_items')
        .update({ question_text: text })
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.map(i => i.id === id ? { ...i, question_text: text } : i));
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const toggleThinkingTime = async (id: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('values_questions_items')
        .update({ requires_thinking_time: value } as any)
        .eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === id ? { ...i, requires_thinking_time: value } : i));
    } catch (error) {
      console.error('Error toggling thinking time:', error);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('values_questions_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const reorderItems = async (reorderedItems: ValuesQuestionItem[]) => {
    try {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        position: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('values_questions_items')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      setItems(reorderedItems.map((item, index) => ({ ...item, position: index + 1 })));
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  const getItemsForStage = (stage: number) => {
    return items.filter(i => i.stage_number === stage).sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const getItemsForValue = (valueLabel: string) => {
    return items.filter(i => i.value_label === valueLabel).sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const getCatalogForStage = (stage: number) => {
    return catalog.filter(c => c.stage_number === stage);
  };

  const getCatalogForValue = (valueLabel: string) => {
    const catalogLabel = findCatalogValueLabel(valueLabel);
    if (catalogLabel) {
      return catalog.filter(c => c.stage_number === 3 && c.value_label === catalogLabel);
    }
    return [];
  };

  const generateAISuggestions = async (valueLabel: string) => {
    setAiLoading(true);
    setAiSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-values-questions', {
        body: { valueLabel }
      });

      if (error) throw error;
      setAiSuggestions(data.questions || []);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar sugestões da IA',
        variant: 'destructive'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const clearAISuggestions = () => {
    setAiSuggestions([]);
  };

  const updateWorkingValues = async (values: string[]) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('values_questions_sessions')
        .update({ working_values: values })
        .eq('id', session.id);

      if (error) throw error;
      setSession(prev => prev ? { ...prev, working_values: values } : null);
    } catch (error) {
      console.error('Error updating working values:', error);
    }
  };

  const addWorkingValue = async (value: string) => {
    if (!session) return;
    const newValues = [...session.working_values, value];
    await updateWorkingValues(newValues);
  };

  const removeWorkingValue = async (value: string) => {
    if (!session) return;
    const newValues = session.working_values.filter(v => v !== value);
    await updateWorkingValues(newValues);
    
    // Also remove items associated with this value
    const itemsToRemove = items.filter(i => i.value_label === value);
    for (const item of itemsToRemove) {
      await deleteItem(item.id);
    }
  };

  const saveVersionSnapshot = useCallback(async (variant = 'manual') => {
    if (!session) return;

    try {
      const snapshot = {
        items: items,
        working_values: session.working_values
      };

      // Check if last version is identical to avoid duplicates
      const { data: lastVersion } = await supabase
        .from('values_questions_version_history')
        .select('snapshot')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastVersion) {
        const lastSnapshot = lastVersion.snapshot as any;
        const lastItemsJson = JSON.stringify(lastSnapshot.items || []);
        const currentItemsJson = JSON.stringify(items);
        
        // If items are identical, skip saving
        if (lastItemsJson === currentItemsJson) {
          console.log('⏭️ Snapshot idêntico ao anterior, pulando salvamento');
          return;
        }
      }

      const { error } = await supabase
        .from('values_questions_version_history')
        .insert([{
          session_id: session.id,
          snapshot: snapshot as any,
          variant
        }]);

      if (error) throw error;
      await loadVersionHistory();
      
      // Only show toast for manual saves
      if (variant === 'manual') {
        toast({
          title: 'Versão salva',
          description: 'Histórico atualizado com sucesso'
        });
      }
    } catch (error) {
      console.error('Error saving version:', error);
    }
  }, [session, items, toast]);

  const loadVersionHistory = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('values_questions_version_history')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []).map(v => ({
        ...v,
        snapshot: v.snapshot as unknown as VersionHistoryEntry['snapshot']
      })));
    } catch (error) {
      console.error('Error loading version history:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      // Find version to restore
      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      // Save current state as backup before restoring
      await saveVersionSnapshot('before_restore');

      // Delete all current items
      await supabase
        .from('values_questions_items')
        .delete()
        .eq('session_id', session.id);

      // Insert items from snapshot
      const snapshotItems = version.snapshot.items || [];
      if (snapshotItems.length > 0) {
        const itemsToInsert = snapshotItems.map((item: any, index: number) => ({
          session_id: session.id,
          stage_number: item.stage_number,
          question_text: item.question_text,
          source: item.source,
          value_label: item.value_label,
          position: index + 1
        }));

        const { data: insertedItems, error: insertError } = await supabase
          .from('values_questions_items')
          .insert(itemsToInsert)
          .select();

        if (insertError) throw insertError;

        setItems((insertedItems || []).map(item => ({
          ...item,
          source: item.source as 'catalog' | 'ai' | 'custom'
        })));
      } else {
        setItems([]);
      }

      // Restore working values
      const workingValues = version.snapshot.working_values || [];
      await updateWorkingValues(workingValues);

      toast({
        title: 'Versão restaurada',
        description: 'O questionário foi restaurado para a versão selecionada'
      });

      await loadVersionHistory();
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao restaurar versão',
        variant: 'destructive'
      });
    }
  };

  const resetSession = async () => {
    if (!session) return;

    try {
      // Salvar backup ANTES de resetar
      await saveVersionSnapshot('backup_before_reset');
      console.log('✅ Backup saved before reset');

      // Delete all items
      await supabase
        .from('values_questions_items')
        .delete()
        .eq('session_id', session.id);

      // Reset session
      await supabase
        .from('values_questions_sessions')
        .update({ stage: 0, working_values: [] })
        .eq('id', session.id);

      setItems([]);
      setSession(prev => prev ? { ...prev, stage: 0, working_values: [] } : null);
      
      toast({
        title: 'Sessão reiniciada',
        description: 'Você pode começar novamente'
      });
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  return (
    <ValuesQuestionsContext.Provider value={{
      session,
      items,
      catalog,
      loading,
      aiLoading,
      aiSuggestions,
      companyValues,
      versionHistory,
      updateStage,
      addItem,
      updateItem,
      deleteItem,
      reorderItems,
      toggleThinkingTime,
      getItemsForStage,
      getItemsForValue,
      getCatalogForStage,
      getCatalogForValue,
      generateAISuggestions,
      clearAISuggestions,
      updateWorkingValues,
      addWorkingValue,
      removeWorkingValue,
      saveVersionSnapshot,
      loadVersionHistory,
      restoreVersion,
      resetSession
    }}>
      {children}
    </ValuesQuestionsContext.Provider>
  );
}

export function useValuesQuestions() {
  const context = useContext(ValuesQuestionsContext);
  if (!context) {
    throw new Error('useValuesQuestions must be used within ValuesQuestionsProvider');
  }
  return context;
}
