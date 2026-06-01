import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from './use-toast';
import { HiringFunnel, HiringFunnelStage, DEFAULT_STAGES } from '@/types/hiring-funnel.types';

export function useHiringFunnels() {
  const { currentAccount: account } = useOrganization();
  const { toast } = useToast();
  const [funnels, setFunnels] = useState<HiringFunnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<HiringFunnel | null>(null);
  const [stages, setStages] = useState<HiringFunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFunnels = useCallback(async () => {
    if (!account?.id) return;

    try {
      const { data, error } = await supabase
        .from('hiring_funnels')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedData = (data || []) as HiringFunnel[];
      setFunnels(typedData);

      // Auto-select default or first funnel
      if (typedData.length > 0 && !selectedFunnel) {
        const defaultFunnel = typedData.find(f => f.is_default) || typedData[0];
        setSelectedFunnel(defaultFunnel);
      }
    } catch (error) {
      console.error('Error loading funnels:', error);
    } finally {
      setLoading(false);
    }
  }, [account?.id, selectedFunnel]);

  const loadStages = useCallback(async () => {
    if (!selectedFunnel?.id) {
      setStages([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hiring_funnel_stages')
        .select('*')
        .eq('funnel_id', selectedFunnel.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setStages((data || []) as HiringFunnelStage[]);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  }, [selectedFunnel?.id]);

  useEffect(() => {
    loadFunnels();
  }, [loadFunnels]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const createFunnel = async (name: string, description?: string, copyFromFunnelId?: string) => {
    if (!account?.id) return null;

    try {
      // Create funnel
      const { data: funnel, error: funnelError } = await supabase
        .from('hiring_funnels')
        .insert({
          account_id: account.id,
          name,
          description: description || null,
          is_default: funnels.length === 0
        })
        .select()
        .single();

      if (funnelError) throw funnelError;

      // Get stages to copy
      let stagesToCreate = DEFAULT_STAGES;

      if (copyFromFunnelId) {
        const { data: existingStages } = await supabase
          .from('hiring_funnel_stages')
          .select('*')
          .eq('funnel_id', copyFromFunnelId)
          .order('position', { ascending: true });

        if (existingStages && existingStages.length > 0) {
          stagesToCreate = existingStages.map(s => ({
            name: s.name,
            description: s.description,
            position: s.position,
            icon: s.icon,
            color: s.color,
            is_required: s.is_required,
            step_type: s.step_type || null,
          }));
        }
      }

      // Create stages
      const { error: stagesError } = await supabase
        .from('hiring_funnel_stages')
        .insert(stagesToCreate.map(stage => ({
          ...stage,
          funnel_id: funnel.id
        })));

      if (stagesError) throw stagesError;

      toast({ title: 'Funil criado', description: `"${name}" foi criado com sucesso` });
      
      await loadFunnels();
      setSelectedFunnel(funnel as HiringFunnel);
      
      return funnel as HiringFunnel;
    } catch (error) {
      console.error('Error creating funnel:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar o funil', variant: 'destructive' });
      return null;
    }
  };

  const updateFunnel = async (funnelId: string, updates: Partial<Pick<HiringFunnel, 'name' | 'description' | 'is_default'>>) => {
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default && account?.id) {
        await supabase
          .from('hiring_funnels')
          .update({ is_default: false })
          .eq('account_id', account.id);
      }

      const { error } = await supabase
        .from('hiring_funnels')
        .update(updates)
        .eq('id', funnelId);

      if (error) throw error;

      toast({ title: 'Funil atualizado' });
      await loadFunnels();
      
      if (selectedFunnel?.id === funnelId) {
        setSelectedFunnel(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Error updating funnel:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o funil', variant: 'destructive' });
    }
  };

  const deleteFunnel = async (funnelId: string) => {
    try {
      const { error } = await supabase
        .from('hiring_funnels')
        .delete()
        .eq('id', funnelId);

      if (error) throw error;

      toast({ title: 'Funil excluído' });
      
      if (selectedFunnel?.id === funnelId) {
        setSelectedFunnel(null);
      }
      
      await loadFunnels();
    } catch (error) {
      console.error('Error deleting funnel:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o funil', variant: 'destructive' });
    }
  };

  const addStage = async (name: string, description?: string, stepType?: string | null) => {
    if (!selectedFunnel?.id) return;

    try {
      const newPosition = stages.length + 1;

      const { error } = await supabase
        .from('hiring_funnel_stages')
        .insert({
          funnel_id: selectedFunnel.id,
          name,
          description: description || null,
          position: newPosition,
          step_type: stepType || null,
        });

      if (error) throw error;

      toast({ title: 'Etapa adicionada' });
      await loadStages();
    } catch (error) {
      console.error('Error adding stage:', error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar a etapa', variant: 'destructive' });
    }
  };

  const updateStage = async (stageId: string, updates: Partial<Pick<HiringFunnelStage, 'name' | 'description' | 'icon' | 'color' | 'is_required' | 'step_type'>>) => {
    try {
      const { error } = await supabase
        .from('hiring_funnel_stages')
        .update(updates)
        .eq('id', stageId);

      if (error) throw error;

      toast({ title: 'Etapa atualizada' });
      await loadStages();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a etapa', variant: 'destructive' });
    }
  };

  const deleteStage = async (stageId: string) => {
    try {
      const stageToDelete = stages.find(s => s.id === stageId);
      if (!stageToDelete) return;

      const { error: deleteError } = await supabase
        .from('hiring_funnel_stages')
        .delete()
        .eq('id', stageId);

      if (deleteError) throw deleteError;

      // Reorder remaining stages
      const remainingStages = stages
        .filter(s => s.id !== stageId)
        .sort((a, b) => a.position - b.position);

      for (let i = 0; i < remainingStages.length; i++) {
        if (remainingStages[i].position !== i + 1) {
          await supabase
            .from('hiring_funnel_stages')
            .update({ position: i + 1 })
            .eq('id', remainingStages[i].id);
        }
      }

      toast({ title: 'Etapa excluída' });
      await loadStages();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir a etapa', variant: 'destructive' });
    }
  };

  const reorderStages = async (activeId: string, overId: string) => {
    const oldIndex = stages.findIndex(s => s.id === activeId);
    const newIndex = stages.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    // Optimistic update
    const newStages = [...stages];
    const [movedStage] = newStages.splice(oldIndex, 1);
    newStages.splice(newIndex, 0, movedStage);
    
    const updatedStages = newStages.map((stage, index) => ({
      ...stage,
      position: index + 1
    }));
    
    setStages(updatedStages);

    try {
      // Update positions in database
      for (const stage of updatedStages) {
        await supabase
          .from('hiring_funnel_stages')
          .update({ position: stage.position })
          .eq('id', stage.id);
      }
    } catch (error) {
      console.error('Error reordering stages:', error);
      toast({ title: 'Erro', description: 'Não foi possível reordenar as etapas', variant: 'destructive' });
      await loadStages();
    }
  };

  return {
    funnels,
    selectedFunnel,
    setSelectedFunnel,
    stages,
    loading,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    refreshFunnels: loadFunnels,
    refreshStages: loadStages
  };
}
