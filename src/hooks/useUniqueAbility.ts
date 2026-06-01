import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/hooks/useAccount';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { 
  UniqueAbilityAnalysis, 
  UniqueAbilityActivity, 
  UniqueAbilityVersionHistory,
  UniqueAbilityAIAnalysis
} from '@/types/unique-ability.types';
import { getTrafficLight } from '@/types/unique-ability.types';

export function useUniqueAbility() {
  const { toast } = useToast();
  const { isOwner, isAdmin, isAdminRH, loading: accountLoading } = useAccount();
  const { currentAccount: account } = useOrganization();
  
  const [analyses, setAnalyses] = useState<UniqueAbilityAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<UniqueAbilityAnalysis | null>(null);
  const [activities, setActivities] = useState<UniqueAbilityActivity[]>([]);
  const [versionHistory, setVersionHistory] = useState<UniqueAbilityVersionHistory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<UniqueAbilityAIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const loading = accountLoading || dataLoading;
  const canAccess = isOwner || isAdmin || isAdminRH;

  // Load all analyses for the account
  const loadAnalyses = useCallback(async () => {
    if (!account?.id || !canAccess) return;

    try {
      const { data, error } = await supabase
        .from('unique_ability_analyses')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  }, [account?.id, canAccess]);

  // Load activities for selected analysis
  const loadActivities = useCallback(async () => {
    if (!selectedAnalysis?.id) {
      setActivities([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('unique_ability_activities')
        .select('*')
        .eq('analysis_id', selectedAnalysis.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, [selectedAnalysis?.id]);

  // Load version history
  const loadVersionHistory = useCallback(async () => {
    if (!selectedAnalysis?.id) {
      setVersionHistory([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('unique_ability_version_history')
        .select('*')
        .eq('analysis_id', selectedAnalysis.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []).map(item => ({
        ...item,
        snapshot: item.snapshot as unknown as { activities: UniqueAbilityActivity[] }
      })));
    } catch (error) {
      console.error('Error loading version history:', error);
    }
  }, [selectedAnalysis?.id]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setDataLoading(true);
      await loadAnalyses();
      setDataLoading(false);
    };
    init();
  }, [loadAnalyses]);

  // Load activities when analysis changes
  useEffect(() => {
    loadActivities();
    loadVersionHistory();
  }, [loadActivities, loadVersionHistory]);

  // Create new analysis
  const createAnalysis = async (name: string, description?: string) => {
    if (!account?.id) return null;

    try {
      const { data, error } = await supabase
        .from('unique_ability_analyses')
        .insert({
          account_id: account.id,
          name,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;

      setAnalyses(prev => [data, ...prev]);
      setSelectedAnalysis(data);
      toast({ title: 'Análise criada com sucesso!' });
      return data;
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast({ title: 'Erro ao criar análise', variant: 'destructive' });
      return null;
    }
  };

  // Update analysis
  const updateAnalysis = async (id: string, name: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('unique_ability_analyses')
        .update({ name, description: description || null })
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.map(a => 
        a.id === id ? { ...a, name, description: description || null } : a
      ));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(prev => prev ? { ...prev, name, description: description || null } : null);
      }
      toast({ title: 'Análise atualizada!' });
    } catch (error) {
      console.error('Error updating analysis:', error);
      toast({ title: 'Erro ao atualizar análise', variant: 'destructive' });
    }
  };

  // Delete analysis
  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unique_ability_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(null);
      }
      toast({ title: 'Análise excluída!' });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({ title: 'Erro ao excluir análise', variant: 'destructive' });
    }
  };

  // Add activity
  const addActivity = async (name: string) => {
    if (!selectedAnalysis?.id) return null;

    const position = activities.length;

    try {
      const { data, error } = await supabase
        .from('unique_ability_activities')
        .insert({
          analysis_id: selectedAnalysis.id,
          name,
          position
        })
        .select()
        .single();

      if (error) throw error;

      setActivities(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({ title: 'Erro ao adicionar atividade', variant: 'destructive' });
      return null;
    }
  };

  // Update activity
  const updateActivity = async (
    id: string, 
    updates: Partial<Pick<UniqueAbilityActivity, 'name' | 'skill_score' | 'value_score'>>
  ) => {
    try {
      const { error } = await supabase
        .from('unique_ability_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setActivities(prev => prev.map(a => 
        a.id === id ? { ...a, ...updates } : a
      ));
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({ title: 'Erro ao atualizar atividade', variant: 'destructive' });
    }
  };

  // Delete activity
  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unique_ability_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({ title: 'Erro ao excluir atividade', variant: 'destructive' });
    }
  };

  // Save version snapshot
  const saveVersionSnapshot = async (variant: string = 'manual') => {
    if (!selectedAnalysis?.id || activities.length === 0) return;

    // Check if current state matches last version
    if (versionHistory.length > 0) {
      const lastSnapshot = versionHistory[0].snapshot;
      if (JSON.stringify(lastSnapshot.activities) === JSON.stringify(activities)) {
        return; // No changes
      }
    }

    try {
      const { data, error } = await supabase
        .from('unique_ability_version_history')
        .insert([{
          analysis_id: selectedAnalysis.id,
          snapshot: JSON.parse(JSON.stringify({ activities })),
          variant
        }])
        .select()
        .single();

      if (error) throw error;

      setVersionHistory(prev => [{
        ...data,
        snapshot: data.snapshot as unknown as { activities: UniqueAbilityActivity[] }
      }, ...prev]);
      
      if (variant === 'manual') {
        toast({ title: 'Versão salva com sucesso!' });
      }
    } catch (error) {
      console.error('Error saving version:', error);
      toast({ title: 'Erro ao salvar versão', variant: 'destructive' });
    }
  };

  // Restore version
  const restoreVersion = async (version: UniqueAbilityVersionHistory) => {
    if (!selectedAnalysis?.id) return;

    try {
      // Delete current activities
      await supabase
        .from('unique_ability_activities')
        .delete()
        .eq('analysis_id', selectedAnalysis.id);

      // Insert restored activities
      const restoredActivities = version.snapshot.activities.map((a, idx) => ({
        analysis_id: selectedAnalysis.id,
        name: a.name,
        skill_score: a.skill_score,
        value_score: a.value_score,
        position: idx
      }));

      if (restoredActivities.length > 0) {
        const { error } = await supabase
          .from('unique_ability_activities')
          .insert(restoredActivities);

        if (error) throw error;
      }

      await loadActivities();
      toast({ title: 'Versão restaurada com sucesso!' });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({ title: 'Erro ao restaurar versão', variant: 'destructive' });
    }
  };

  // Analyze with AI
  const analyzeWithAI = async () => {
    console.log('=== analyzeWithAI CALLED ===');
    console.log('selectedAnalysis:', selectedAnalysis);
    console.log('activities.length:', activities.length);
    
    if (!selectedAnalysis || activities.length === 0) {
      console.log('Early return - no analysis or activities');
      return;
    }

    const scoredActivities = activities.filter(a => 
      a.skill_score !== null && a.value_score !== null
    );
    
    console.log('scoredActivities.length:', scoredActivities.length);

    if (scoredActivities.length === 0) {
      console.log('No scored activities - showing toast');
      toast({ 
        title: 'Nenhuma atividade avaliada',
        description: 'Avalie pelo menos uma atividade antes de analisar.',
        variant: 'destructive'
      });
      return;
    }

    console.log('Setting analyzing to true');
    setAnalyzing(true);
    toast({ title: 'Iniciando análise com IA...' });

    try {
      const activitiesData = scoredActivities.map(a => ({
        name: a.name,
        skill_score: a.skill_score,
        value_score: a.value_score,
        total: (a.skill_score || 0) + (a.value_score || 0),
        trafficLight: getTrafficLight((a.skill_score || 0) + (a.value_score || 0))
      }));
      
      console.log('Calling edge function with:', activitiesData);

      const { data, error } = await supabase.functions.invoke('analyze-unique-ability', {
        body: { 
          activities: activitiesData,
          analysisName: selectedAnalysis.name
        }
      });
      
      console.log('Edge function response:', { data, error });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Setting aiAnalysis:', data);
      setAiAnalysis(data);
      toast({ title: 'Análise concluída!' });
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      toast({ 
        title: 'Erro ao analisar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      console.log('Setting analyzing to false');
      setAnalyzing(false);
    }
  };

  const clearAIAnalysis = () => {
    setAiAnalysis(null);
  };

  return {
    analyses,
    selectedAnalysis,
    setSelectedAnalysis,
    activities,
    versionHistory,
    loading,
    canAccess,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    addActivity,
    updateActivity,
    deleteActivity,
    saveVersionSnapshot,
    restoreVersion,
    loadVersionHistory,
    reload: loadAnalyses,
    aiAnalysis,
    analyzing,
    analyzeWithAI,
    clearAIAnalysis
  };
}
