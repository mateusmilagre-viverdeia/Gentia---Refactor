import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { EventSession, EventItem, EventFormat, ItemSource, CultureContext, EventSuggestion } from '@/types/event.types';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('EventContext');

interface EventContextType {
  session: EventSession | null;
  items: EventItem[];
  suggestions: EventSuggestion[];
  loading: boolean;
  aiLoading: boolean;
  aiSuggestions: string[];
  versionHistory: VersionHistoryItem[];
  setEventFormat: (format: EventFormat) => Promise<void>;
  updateStage: (stage: number) => Promise<void>;
  addItem: (pillarNumber: number, text: string, source: ItemSource) => Promise<void>;
  updateItem: (itemId: string, newText: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  getItemsForPillar: (pillarNumber: number) => EventItem[];
  getSuggestionsForPillar: (pillarNumber: number) => EventSuggestion[];
  resetSession: () => Promise<void>;
  generateAISuggestions: (pillarNumber: number) => Promise<void>;
  getCultureContext: () => Promise<CultureContext>;
  refetch: () => Promise<void>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<EventSession | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);

  const loadSession = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('event_sessions').select('*');
      if (currentAccount?.id) {
        query = query.eq('account_id', currentAccount.id);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      let { data: sessionData, error: sessionError } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!sessionData) {
        const { data: newSession, error: createError } = await supabase
          .from('event_sessions')
          .insert({ user_id: user.id, account_id: currentAccount?.id, stage: 0 })
          .select()
          .single();

        if (createError) throw createError;
        sessionData = newSession;
      }

      setSession(sessionData as EventSession);

      const { data: itemsData, error: itemsError } = await supabase
        .from('event_items')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as EventItem[]);

      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('event_suggestions_catalog')
        .select('*')
        .eq('active', true);

      if (suggestionsError) throw suggestionsError;
      setSuggestions((suggestionsData || []) as EventSuggestion[]);
      
      await loadVersionHistoryForSession(sessionData.id);

    } catch (error) {
      console.error('Error loading event session:', error);
      toast({ title: 'Erro ao carregar sessão', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, currentAccount, toast]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const setEventFormat = async (format: EventFormat) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('event_sessions')
        .update({ event_format: format, stage: 1, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      if (error) throw error;
      setSession({ ...session, event_format: format, stage: 1 });
    } catch (error) {
      console.error('Error setting event format:', error);
      toast({ title: 'Erro ao salvar formato', variant: 'destructive' });
    }
  };

  // Auto-save checkpoints for stages (pillars 1-9 + review + summary)
  const getEventVariant = (stage: number): string | null => {
    if (stage >= 1 && stage <= 9) return `step_pilar_${stage}`;
    if (stage === 10) return 'step_revisao_evento';
    if (stage === 11) return 'step_evento_finalizado';
    return null;
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    try {
      const { error } = await supabase
        .from('event_sessions')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      if (error) throw error;

      // Auto-save when completing a pillar or reaching review/summary
      const variant = getEventVariant(stage);
      if (variant && oldStage < stage && items.length > 0) {
        await saveVersionSnapshot(variant);
        console.log(`✅ Auto-save: ${variant}`);
      }

      setSession({ ...session, stage });
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({ title: 'Erro ao atualizar etapa', variant: 'destructive' });
    }
  };

  const addItem = async (pillarNumber: number, text: string, source: ItemSource) => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('event_items')
        .insert({
          session_id: session.id,
          pillar_number: pillarNumber,
          item_text: text,
          source
        })
        .select()
        .single();

      if (error) throw error;
      setItems([...items, data as EventItem]);
    } catch (error) {
      console.error('Error adding item:', error);
      toast({ title: 'Erro ao adicionar item', variant: 'destructive' });
    }
  };

  const updateItem = async (itemId: string, newText: string) => {
    try {
      const { error } = await supabase
        .from('event_items')
        .update({ item_text: newText })
        .eq('id', itemId);

      if (error) throw error;
      setItems(items.map(item => item.id === itemId ? { ...item, item_text: newText } : item));
    } catch (error) {
      console.error('Error updating item:', error);
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('event_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Erro ao excluir item', variant: 'destructive' });
    }
  };

  const getItemsForPillar = (pillarNumber: number) => {
    return items.filter(item => item.pillar_number === pillarNumber);
  };

  const getSuggestionsForPillar = (pillarNumber: number) => {
    if (!session) return [];
    return suggestions.filter(s => 
      s.pillar_number === pillarNumber && 
      (s.event_format === null || s.event_format === session.event_format)
    );
  };

  const getCultureContext = async (): Promise<CultureContext> => {
    if (!user) return {};

    const context: CultureContext = {};

    try {
      const missionKey = `mission_session_${user.id}`;
      const missionData = localStorage.getItem(missionKey);
      if (missionData) {
        const parsed = JSON.parse(missionData);
        if (parsed.analysis?.mission_statement) {
          context.mission = {
            statement: parsed.analysis.mission_statement,
            answers: parsed.answers || {}
          };
        }
      }

      const visionKey = `vision_session_${user.id}`;
      const visionData = localStorage.getItem(visionKey);
      if (visionData) {
        const parsed = JSON.parse(visionData);
        if (parsed.analysis) {
          context.vision = {
            inspirational: parsed.analysis.vision_inspirational || '',
            measurable: parsed.analysis.vision_measurable || '',
            answers: parsed.answers || {}
          };
        }
      }

      const accountFilter = currentAccount?.id
        ? { key: 'account_id' as const, value: currentAccount.id }
        : { key: 'user_id' as const, value: user.id };

      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq(accountFilter.key, accountFilter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (valuesSession) {
        const { data: behaviors } = await supabase
          .from('values_behaviors_selections')
          .select('value_label, do_selected, dont_selected')
          .eq('session_id', valuesSession.id);

        if (behaviors && behaviors.length > 0) {
          context.values = behaviors.map(b => ({
            label: b.value_label,
            dos: b.do_selected || [],
            donts: b.dont_selected || []
          }));
        }
      }

      const { data: indicators } = await supabase
        .from('strategic_indicators')
        .select('final_selection')
        .eq(accountFilter.key, accountFilter.value)
        .maybeSingle();

      if (indicators?.final_selection) {
        context.indicators = indicators.final_selection as string[];
      }

      const { data: projects } = await supabase
        .from('strategic_projects')
        .select('project_name, perspective')
        .eq(accountFilter.key, accountFilter.value);

      if (projects && projects.length > 0) {
        context.projects = projects.map(p => ({
          name: p.project_name,
          perspective: p.perspective
        }));
      }

      const { data: energySession } = await supabase
        .from('energy_sessions')
        .select('id')
        .eq(accountFilter.key, accountFilter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (energySession) {
        const { data: energySelections } = await supabase
          .from('energy_selections')
          .select('item_id')
          .eq('session_id', energySession.id)
          .eq('phase', 3);

        if (energySelections && energySelections.length > 0) {
          const { data: energyItems } = await supabase
            .from('energy_catalog')
            .select('label')
            .in('id', energySelections.map(s => s.item_id));

          if (energyItems) {
            context.energyRituals = energyItems.map(i => i.label);
          }
        }
      }

      const { data: devSession } = await supabase
        .from('development_sessions')
        .select('id')
        .eq(accountFilter.key, accountFilter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (devSession) {
        const { data: devSelections } = await supabase
          .from('development_selections')
          .select('item_id')
          .eq('session_id', devSession.id)
          .eq('phase', 3);

        if (devSelections && devSelections.length > 0) {
          const { data: devItems } = await supabase
            .from('development_catalog')
            .select('label')
            .in('id', devSelections.map(s => s.item_id));

          if (devItems) {
            context.developmentRituals = devItems.map(i => i.label);
          }
        }
      }

      const { data: decisionSession } = await supabase
        .from('decision_sessions')
        .select('id')
        .eq(accountFilter.key, accountFilter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (decisionSession) {
        const { data: decisionAnswers } = await supabase
          .from('decision_answers')
          .select('question_number, answer_text')
          .eq('session_id', decisionSession.id)
          .order('question_number', { ascending: true });

        if (decisionAnswers && decisionAnswers.length > 0) {
          const grouped: Record<number, string[]> = {};
          decisionAnswers.forEach(a => {
            if (!grouped[a.question_number]) grouped[a.question_number] = [];
            grouped[a.question_number].push(a.answer_text);
          });

          const { DECISION_QUESTIONS } = await import('@/types/decision.types');
          context.decisionCriteria = Object.entries(grouped).map(([num, answers]) => ({
            question: DECISION_QUESTIONS.find(q => q.number === parseInt(num))?.question || '',
            answers
          }));
        }
      }

    } catch (error) {
      console.error('Error getting culture context:', error);
    }

    return context;
  };

  const generateAISuggestions = async (pillarNumber: number) => {
    if (!session) return;

    setAiLoading(true);
    setAiSuggestions([]);

    try {
      const cultureContext = await getCultureContext();

      const response = await supabase.functions.invoke('generate-event-suggestions', {
        body: {
          pillarNumber,
          eventFormat: session.event_format,
          cultureContext
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast({ title: 'Erro ao gerar sugestões da IA', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const resetSession = async () => {
    if (!session || !user) return;

    try {
      await supabase.from('event_version_history').delete().eq('session_id', session.id);
      await supabase.from('event_sessions').delete().eq('id', session.id);

      const { data: newSession, error } = await supabase
        .from('event_sessions')
        .insert({ user_id: user.id, account_id: currentAccount?.id, stage: 0 })
        .select()
        .single();

      if (error) throw error;
      setSession(newSession as EventSession);
      setItems([]);
      setAiSuggestions([]);
      setVersionHistory([]);
      toast({ title: 'Sessão reiniciada com sucesso' });
    } catch (error) {
      console.error('Error resetting session:', error);
      toast({ title: 'Erro ao reiniciar sessão', variant: 'destructive' });
    }
  };

  const refetch = async () => {
    await loadSession();
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading event version history:', error);
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
        format: session.event_format,
        items: items.map(i => ({
          pillar_number: i.pillar_number,
          item_text: i.item_text,
          source: i.source,
        })),
        stage: session.stage,
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('event_version_history')
        .insert({
          session_id: session.id,
          snapshot,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving event version snapshot:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      await saveVersionSnapshot('before_restore');

      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { items?: { pillar_number: number; item_text: string; source: string }[]; format?: string };

      if (snapshot.items) {
        // Delete current items
        await supabase.from('event_items').delete().eq('session_id', session.id);

        // Re-insert from snapshot
        if (snapshot.items.length > 0) {
          const { data: newItems } = await supabase.from('event_items').insert(
            snapshot.items.map(i => ({
              session_id: session.id,
              pillar_number: i.pillar_number,
              item_text: i.item_text,
              source: i.source,
            }))
          ).select();

          if (newItems) setItems(newItems as EventItem[]);
        } else {
          setItems([]);
        }
      }

      await updateStage(11);
      await loadVersionHistory();
      toast({ title: 'Versão restaurada com sucesso!' });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({ title: 'Erro ao restaurar versão', variant: 'destructive' });
    }
  };

  return (
    <EventContext.Provider value={{
      session,
      items,
      suggestions,
      loading,
      aiLoading,
      aiSuggestions,
      versionHistory,
      setEventFormat,
      updateStage,
      addItem,
      updateItem,
      deleteItem,
      getItemsForPillar,
      getSuggestionsForPillar,
      resetSession,
      generateAISuggestions,
      getCultureContext,
      refetch,
      saveVersionSnapshot,
      loadVersionHistory,
      restoreVersion,
    }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
