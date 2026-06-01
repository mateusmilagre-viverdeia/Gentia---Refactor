import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RitualSession, RitualItem, RitualSuggestion, RITUAL_PILLARS, AIManagementRecommendation, ApprovedRitual } from '@/types/ritual.types';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('RitualContext');

interface RitualContextType {
  session: RitualSession | null;
  items: RitualItem[];
  suggestions: RitualSuggestion[];
  loading: boolean;
  aiLoading: boolean;
  versionHistory: VersionHistoryItem[];
  highestStageReached: number;
  updateStage: (stage: number) => Promise<void>;
  addItem: (pillarNumber: number, itemText: string, source: string) => Promise<void>;
  updateItem: (id: string, itemText: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemsForPillar: (pillarNumber: number) => RitualItem[];
  getSuggestionsForPillar: (pillarNumber: number) => RitualSuggestion[];
  getAISuggestionsForPillar: (pillarNumber: number) => string[];
  generateAISuggestions: (pillarNumber: number) => Promise<void>;
  resetSession: () => Promise<void>;
  refetch: () => Promise<void>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  saveManagementRituals: (ritualIds: string[]) => Promise<void>;
  saveAIRecommendations: (recs: AIManagementRecommendation[]) => Promise<void>;
  saveFinalRecommendations: (recs: AIManagementRecommendation[]) => Promise<void>;
  saveApprovedRituals: (rituals: ApprovedRitual[]) => Promise<void>;
  saveWorkModel: (model: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
}

const RitualContext = createContext<RitualContextType | undefined>(undefined);

export function RitualProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [session, setSession] = useState<RitualSession | null>(null);
  const [items, setItems] = useState<RitualItem[]>([]);
  const [suggestions, setSuggestions] = useState<RitualSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, string[]>>({});
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [highestStageReached, setHighestStageReached] = useState(0);

  const loadSession = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('ritual_sessions').select('*');
      if (currentAccount?.id) {
        query = query.eq('account_id', currentAccount.id);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      let { data: existingSession } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!existingSession) {
        const { data: newSession, error: createError } = await supabase
          .from('ritual_sessions')
          .insert({ user_id: user.id, account_id: currentAccount?.id, stage: 0 })
          .select()
          .single();

        if (createError) throw createError;
        existingSession = newSession;
      }

      setSession(existingSession as unknown as RitualSession);
      setHighestStageReached(prev => Math.max(prev, (existingSession as any).stage || 0));

      const { data: itemsData } = await supabase
        .from('ritual_items')
        .select('*')
        .eq('session_id', existingSession.id)
        .order('created_at', { ascending: true });

      setItems((itemsData || []) as RitualItem[]);

      const { data: suggestionsData } = await supabase
        .from('ritual_suggestions_catalog')
        .select('*')
        .eq('active', true)
        .order('pillar_number', { ascending: true })
        .order('sort_order', { ascending: true });

      setSuggestions((suggestionsData || []) as RitualSuggestion[]);
      
      await loadVersionHistoryForSession(existingSession.id);
    } catch (error) {
      console.error('Error loading ritual session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a sessão de rituais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentAccount]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Stage mapping for auto-save: pillars are now stages 3-5 (3 pillars)
  const getPillarVariant = (stage: number): string | null => {
    if (stage === 1) return 'step_rituais_gestao';
    if (stage === 2) return 'step_recomendacoes_ia';
    if (stage >= 3 && stage <= 5) return `step_pilar_${stage - 2}`;
    if (stage === 6) return 'step_analise_final';
    if (stage === 7) return 'step_revisao_rituais';
    if (stage === 8) return 'step_rituais_finalizados';
    return null;
  };

  const updateStage = async (stage: number) => {
    if (!session) return;

    const oldStage = session.stage;

    const { error } = await supabase
      .from('ritual_sessions')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) {
      console.error('Error updating stage:', error);
      return;
    }

    const variant = getPillarVariant(stage);
    if (variant && oldStage < stage && items.length > 0) {
      await saveVersionSnapshot(variant);
    }

    setSession(prev => prev ? { ...prev, stage } : prev);
    setHighestStageReached(prev => Math.max(prev, stage));
  };

  const addItem = async (pillarNumber: number, itemText: string, source: string) => {
    if (!session) return;

    const { data, error } = await supabase
      .from('ritual_items')
      .insert({
        session_id: session.id,
        pillar_number: pillarNumber,
        item_text: itemText,
        source,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o item.',
        variant: 'destructive',
      });
      return;
    }

    setItems([...items, data as RitualItem]);
  };

  const updateItem = async (id: string, itemText: string) => {
    const { error } = await supabase
      .from('ritual_items')
      .update({ item_text: itemText })
      .eq('id', id);

    if (error) {
      console.error('Error updating item:', error);
      return;
    }

    setItems(items.map((item) => (item.id === id ? { ...item, item_text: itemText } : item)));
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('ritual_items').delete().eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
      return;
    }

    setItems(items.filter((item) => item.id !== id));
  };

  const getItemsForPillar = (pillarNumber: number) => {
    return items.filter((item) => item.pillar_number === pillarNumber);
  };

  const getSuggestionsForPillar = (pillarNumber: number) => {
    const workModel = session?.work_model;
    return suggestions.filter((s) => {
      if (s.pillar_number !== pillarNumber) return false;
      // If no work model set or suggestion has no tags, show all
      if (!workModel || !s.work_model_tags || s.work_model_tags.length === 0) return true;
      // Filter by work model tag
      return s.work_model_tags.includes(workModel);
    });
  };

  const getAISuggestionsForPillar = (pillarNumber: number) => {
    return aiSuggestions[pillarNumber] || [];
  };

  const getCultureContext = async () => {
    const context: Record<string, unknown> = {};

    const missionData = localStorage.getItem(`mission_session_${user?.id}`);
    if (missionData) {
      try {
        const parsed = JSON.parse(missionData);
        context.mission = parsed.analysis?.mission_statement;
      } catch {}
    }

    const visionData = localStorage.getItem(`vision_session_${user?.id}`);
    if (visionData) {
      try {
        const parsed = JSON.parse(visionData);
        context.vision = parsed.analysis?.vision_inspirational;
      } catch {}
    }

    if (user) {
      const accountFilter = currentAccount?.id
        ? { key: 'account_id' as const, value: currentAccount.id }
        : { key: 'user_id' as const, value: user.id };

      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq(accountFilter.key, accountFilter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (valuesSession) {
        const { data: selections } = await supabase
          .from('values_selections')
          .select('value_id, values_catalog(label)')
          .eq('session_id', valuesSession.id)
          .eq('phase', 3);

        if (selections) {
          context.values = selections.map((s: any) => s.values_catalog?.label).filter(Boolean);
        }
      }

      const { data: indicators } = await supabase
        .from('strategic_indicators')
        .select('final_selection')
        .eq(accountFilter.key, accountFilter.value)
        .limit(1)
        .single();

      if (indicators?.final_selection) {
        context.indicators = indicators.final_selection;
      }

      const { data: projects } = await supabase
        .from('strategic_projects')
        .select('project_name, perspective')
        .eq(accountFilter.key, accountFilter.value);

      if (projects) {
        context.projects = projects;
      }

      const { data: decisionSession } = await supabase
        .from('decision_sessions')
        .select('id')
        .eq(accountFilter.key, accountFilter.value)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (decisionSession) {
        const { data: answers } = await supabase
          .from('decision_answers')
          .select('question_number, answer_text')
          .eq('session_id', decisionSession.id);

        if (answers) {
          context.decisions = answers;
        }
      }

    }

    return context;
  };

  const generateAISuggestions = async (pillarNumber: number) => {
    setAiLoading(true);

    try {
      const cultureContext = await getCultureContext();
      const pillar = RITUAL_PILLARS.find((p) => p.number === pillarNumber);

      const { data, error } = await supabase.functions.invoke('generate-ritual-suggestions', {
        body: {
          pillarNumber,
          pillarTitle: pillar?.title,
          pillarQuestion: pillar?.question,
          cultureContext,
          workModel: session?.work_model,
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setAiSuggestions(prev => ({
          ...prev,
          [pillarNumber]: data.suggestions
        }));
      }
    } catch (error: any) {
      console.error('Error generating AI suggestions:', error);
      
      if (error.message?.includes('429')) {
        toast({
          title: 'Limite de requisições',
          description: 'Aguarde um momento e tente novamente.',
          variant: 'destructive',
        });
      } else if (error.message?.includes('402')) {
        toast({
          title: 'Créditos insuficientes',
          description: 'Adicione créditos para continuar usando a IA.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível gerar sugestões da IA.',
          variant: 'destructive',
        });
      }
    } finally {
      setAiLoading(false);
    }
  };

  const saveManagementRituals = async (ritualIds: string[]) => {
    if (!session) return;

    const { error } = await supabase
      .from('ritual_sessions')
      .update({ management_rituals: ritualIds as any, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) {
      console.error('Error saving management rituals:', error);
      return;
    }

    setSession(prev => prev ? { ...prev, management_rituals: ritualIds } : prev);
  };

  const saveAIRecommendations = async (recs: AIManagementRecommendation[]) => {
    if (!session) return;

    const { error } = await supabase
      .from('ritual_sessions')
      .update({ ai_management_recommendations: recs as any, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) {
      console.error('Error saving AI recommendations:', error);
      return;
    }

    setSession(prev => prev ? { ...prev, ai_management_recommendations: recs } : prev);
  };

  const saveFinalRecommendations = async (recs: AIManagementRecommendation[]) => {
    if (!session) return;

    const { error } = await supabase
      .from('ritual_sessions')
      .update({ ai_final_recommendations: recs as any, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) {
      console.error('Error saving final recommendations:', error);
      return;
    }

    setSession(prev => prev ? { ...prev, ai_final_recommendations: recs } : prev);
  };

  const saveWorkModel = async (model: string) => {
    if (!session) return;

    const { error } = await supabase
      .from('ritual_sessions')
      .update({ work_model: model, updated_at: new Date().toISOString() } as any)
      .eq('id', session.id);

    if (error) {
      console.error('Error saving work model:', error);
      return;
    }

    setSession(prev => prev ? { ...prev, work_model: model } : prev);
  };

  const saveApprovedRituals = async (rituals: ApprovedRitual[]) => {
    if (!session) return;

    const { error } = await supabase
      .from('ritual_sessions')
      .update({ approved_rituals: rituals as any, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) {
      console.error('Error saving approved rituals:', error);
      return;
    }

    setSession(prev => prev ? { ...prev, approved_rituals: rituals } : prev);
  };

  const resetSession = async () => {
    if (!user) return;

    if (session) {
      await supabase.from('ritual_version_history').delete().eq('session_id', session.id);
      await supabase.from('ritual_sessions').delete().eq('id', session.id);
    }

    const { data: newSession } = await supabase
      .from('ritual_sessions')
      .insert({ user_id: user.id, account_id: currentAccount?.id, stage: 0 })
      .select()
      .single();

    if (newSession) {
      setSession(newSession as unknown as RitualSession);
      setItems([]);
      setAiSuggestions({});
      setVersionHistory([]);
    }
  };

  const refetch = async () => {
    await loadSession();
  };

  const loadVersionHistoryForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('ritual_version_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading ritual version history:', error);
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
        items: items.map(i => ({
          pillar_number: i.pillar_number,
          item_text: i.item_text,
          source: i.source,
        })),
        stage: session.stage,
        approved_rituals: session.approved_rituals || [],
        management_rituals: session.management_rituals || [],
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ritual_version_history')
        .insert({
          session_id: session.id,
          snapshot: snapshot as any,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving ritual version snapshot:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!session) return;

    try {
      await saveVersionSnapshot('before_restore');

      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { items?: { pillar_number: number; item_text: string; source: string }[] };

      if (snapshot.items) {
        await supabase.from('ritual_items').delete().eq('session_id', session.id);

        if (snapshot.items.length > 0) {
          const { data: newItems } = await supabase.from('ritual_items').insert(
            snapshot.items.map(i => ({
              session_id: session.id,
              pillar_number: i.pillar_number,
              item_text: i.item_text,
              source: i.source,
            }))
          ).select();

          if (newItems) setItems(newItems as RitualItem[]);
        } else {
          setItems([]);
        }
      }

      await updateStage(8);
      await loadVersionHistory();
      toast({ title: 'Versão restaurada com sucesso!' });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({ title: 'Erro ao restaurar versão', variant: 'destructive' });
    }
  };

  return (
    <RitualContext.Provider
      value={{
        session,
        items,
        suggestions,
        loading,
        aiLoading,
        versionHistory,
        highestStageReached,
        updateStage,
        addItem,
        updateItem,
        deleteItem,
        getItemsForPillar,
        getSuggestionsForPillar,
        getAISuggestionsForPillar,
        generateAISuggestions,
        resetSession,
        refetch,
        saveVersionSnapshot,
        loadVersionHistory,
        saveManagementRituals,
        saveAIRecommendations,
        saveFinalRecommendations,
        saveApprovedRituals,
        saveWorkModel,
        restoreVersion,
      }}
    >
      {children}
    </RitualContext.Provider>
  );
}

export function useRitual() {
  const context = useContext(RitualContext);
  if (!context) {
    throw new Error('useRitual must be used within a RitualProvider');
  }
  return context;
}
