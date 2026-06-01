import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ProjectPlaybook,
  PlaybookWithDetails,
  PlaybookPhase,
  PlaybookMilestone,
  PlaybookChecklistItem,
  PlaybookGuide,
  PlaybookCategory,
  CreatePlaybookInput,
  CreatePhaseInput,
  CreateMilestoneInput,
  CreateChecklistItemInput,
  CreateGuideInput,
  PlaybookPhaseWithMilestones,
  PlaybookMilestoneWithChecklist,
} from '@/types/playbook.types';

// Type assertion helper for playbook tables not yet in generated types
const db = supabase as any;

interface UsePlaybooksReturn {
  playbooks: ProjectPlaybook[];
  loading: boolean;
  error: string | null;
  refreshPlaybooks: () => Promise<void>;
  createPlaybook: (input: CreatePlaybookInput) => Promise<ProjectPlaybook | null>;
  updatePlaybook: (id: string, updates: Partial<ProjectPlaybook>) => Promise<boolean>;
  deletePlaybook: (id: string) => Promise<boolean>;
  duplicatePlaybook: (id: string, newName: string) => Promise<ProjectPlaybook | null>;
}

export function usePlaybooks(): UsePlaybooksReturn {
  const [playbooks, setPlaybooks] = useState<ProjectPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await db
        .from('project_playbooks')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (fetchError) throw fetchError;

      setPlaybooks((data as ProjectPlaybook[]) || []);
    } catch (err) {
      console.error('Error fetching playbooks:', err);
      setError('Erro ao carregar playbooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  const createPlaybook = async (input: CreatePlaybookInput): Promise<ProjectPlaybook | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: insertError } = await db
        .from('project_playbooks')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newPlaybook = data as ProjectPlaybook;
      setPlaybooks(prev => [...prev, newPlaybook]);
      toast.success('Playbook criado com sucesso');
      return newPlaybook;
    } catch (err) {
      console.error('Error creating playbook:', err);
      toast.error('Erro ao criar playbook');
      return null;
    }
  };

  const updatePlaybook = async (id: string, updates: Partial<ProjectPlaybook>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('project_playbooks')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setPlaybooks(prev =>
        prev.map(p => (p.id === id ? { ...p, ...updates } : p))
      );
      toast.success('Playbook atualizado');
      return true;
    } catch (err) {
      console.error('Error updating playbook:', err);
      toast.error('Erro ao atualizar playbook');
      return false;
    }
  };

  const deletePlaybook = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await db
        .from('project_playbooks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setPlaybooks(prev => prev.filter(p => p.id !== id));
      toast.success('Playbook excluído');
      return true;
    } catch (err) {
      console.error('Error deleting playbook:', err);
      toast.error('Erro ao excluir playbook');
      return false;
    }
  };

  const duplicatePlaybook = async (id: string, newName: string): Promise<ProjectPlaybook | null> => {
    try {
      // First fetch the full playbook with details
      const { data: original, error: fetchError } = await db
        .from('project_playbooks')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create new playbook
      const newPlaybook = await createPlaybook({
        name: newName,
        description: original.description,
        category: original.category as PlaybookCategory,
        estimated_duration_weeks: original.estimated_duration_weeks,
        icon: original.icon,
        color: original.color,
      });

      if (!newPlaybook) return null;

      // Fetch and duplicate phases
      const { data: phases } = await db
        .from('playbook_phases')
        .select('*')
        .eq('playbook_id', id)
        .order('order_index');

      if (phases && phases.length > 0) {
        for (const phase of phases) {
          const { data: newPhase } = await db
            .from('playbook_phases')
            .insert({
              playbook_id: newPlaybook.id,
              name: phase.name,
              description: phase.description,
              order_index: phase.order_index,
              duration_weeks: phase.duration_weeks,
              color: phase.color,
            })
            .select()
            .single();

          if (newPhase) {
            // Duplicate milestones for this phase
            const { data: milestones } = await db
              .from('playbook_milestones')
              .select('*')
              .eq('phase_id', phase.id)
              .order('order_index');

            if (milestones && milestones.length > 0) {
              for (const milestone of milestones) {
                const { data: newMilestone } = await db
                  .from('playbook_milestones')
                  .insert({
                    phase_id: newPhase.id,
                    milestone_name: milestone.milestone_name,
                    milestone_type: milestone.milestone_type,
                    pillar: milestone.pillar,
                    description: milestone.description,
                    relative_start_days: milestone.relative_start_days,
                    duration_days: milestone.duration_days,
                    order_index: milestone.order_index,
                  })
                  .select()
                  .single();

                if (newMilestone) {
                  // Duplicate checklist items
                  const { data: checklistItems } = await db
                    .from('playbook_checklist_items')
                    .select('*')
                    .eq('milestone_id', milestone.id)
                    .order('order_index');

                  if (checklistItems && checklistItems.length > 0) {
                    await db.from('playbook_checklist_items').insert(
                      checklistItems.map((item: any) => ({
                        milestone_id: newMilestone.id,
                        title: item.title,
                        description: item.description,
                        is_required: item.is_required,
                        order_index: item.order_index,
                      }))
                    );
                  }
                }
              }
            }
          }
        }
      }

      // Duplicate guides
      const { data: guides } = await db
        .from('playbook_guides')
        .select('*')
        .eq('playbook_id', id)
        .order('order_index');

      if (guides && guides.length > 0) {
        await db.from('playbook_guides').insert(
          guides.map((guide: any) => ({
            playbook_id: newPlaybook.id,
            title: guide.title,
            content: guide.content,
            order_index: guide.order_index,
          }))
        );
      }

      toast.success('Playbook duplicado com sucesso');
      await fetchPlaybooks();
      return newPlaybook;
    } catch (err) {
      console.error('Error duplicating playbook:', err);
      toast.error('Erro ao duplicar playbook');
      return null;
    }
  };

  return {
    playbooks,
    loading,
    error,
    refreshPlaybooks: fetchPlaybooks,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
    duplicatePlaybook,
  };
}

// Hook for fetching a single playbook with all details
interface UsePlaybookDetailsReturn {
  playbook: PlaybookWithDetails | null;
  loading: boolean;
  error: string | null;
  refreshPlaybook: () => Promise<void>;
  // Phase operations
  createPhase: (input: CreatePhaseInput) => Promise<PlaybookPhase | null>;
  updatePhase: (id: string, updates: Partial<PlaybookPhase>) => Promise<boolean>;
  deletePhase: (id: string) => Promise<boolean>;
  reorderPhases: (phaseIds: string[]) => Promise<boolean>;
  // Milestone operations
  createMilestone: (input: CreateMilestoneInput) => Promise<PlaybookMilestone | null>;
  updateMilestone: (id: string, updates: Partial<PlaybookMilestone>) => Promise<boolean>;
  deleteMilestone: (id: string) => Promise<boolean>;
  reorderMilestones: (phaseId: string, milestoneIds: string[]) => Promise<boolean>;
  // Checklist operations
  createChecklistItem: (input: CreateChecklistItemInput) => Promise<PlaybookChecklistItem | null>;
  updateChecklistItem: (id: string, updates: Partial<PlaybookChecklistItem>) => Promise<boolean>;
  deleteChecklistItem: (id: string) => Promise<boolean>;
  reorderChecklistItems: (milestoneId: string, itemIds: string[]) => Promise<boolean>;
  // Guide operations
  createGuide: (input: CreateGuideInput) => Promise<PlaybookGuide | null>;
  updateGuide: (id: string, updates: Partial<PlaybookGuide>) => Promise<boolean>;
  deleteGuide: (id: string) => Promise<boolean>;
}

export function usePlaybookDetails(playbookId: string | null): UsePlaybookDetailsReturn {
  const [playbook, setPlaybook] = useState<PlaybookWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybook = useCallback(async () => {
    if (!playbookId) {
      setPlaybook(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch playbook base
      const { data: playbookData, error: playbookError } = await db
        .from('project_playbooks')
        .select('*')
        .eq('id', playbookId)
        .single();

      if (playbookError) throw playbookError;

      // Fetch phases
      const { data: phasesData, error: phasesError } = await db
        .from('playbook_phases')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('order_index');

      if (phasesError) throw phasesError;

      // Fetch milestones
      const phaseIds = phasesData?.map((p: any) => p.id) || [];
      let milestonesData: any[] = [];
      if (phaseIds.length > 0) {
        const { data: milestones, error: milestonesError } = await db
          .from('playbook_milestones')
          .select('*')
          .in('phase_id', phaseIds)
          .order('order_index');

        if (milestonesError) throw milestonesError;
        milestonesData = milestones || [];
      }

      // Fetch checklist items
      const milestoneIds = milestonesData.map((m: any) => m.id);
      let checklistData: any[] = [];
      if (milestoneIds.length > 0) {
        const { data: checklist, error: checklistError } = await db
          .from('playbook_checklist_items')
          .select('*')
          .in('milestone_id', milestoneIds)
          .order('order_index');

        if (checklistError) throw checklistError;
        checklistData = checklist || [];
      }

      // Fetch guides
      const { data: guidesData, error: guidesError } = await db
        .from('playbook_guides')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('order_index');

      if (guidesError) throw guidesError;

      // Assemble the full structure
      const phases: PlaybookPhaseWithMilestones[] = (phasesData || []).map((phase: any) => ({
        ...phase,
        milestones: milestonesData
          .filter((m: any) => m.phase_id === phase.id)
          .map((milestone: any) => ({
            ...milestone,
            checklist_items: checklistData.filter((c: any) => c.milestone_id === milestone.id),
          })),
      }));

      const fullPlaybook: PlaybookWithDetails = {
        ...playbookData,
        category: playbookData.category as PlaybookCategory,
        phases,
        guides: guidesData || [],
      };

      setPlaybook(fullPlaybook);
    } catch (err) {
      console.error('Error fetching playbook details:', err);
      setError('Erro ao carregar detalhes do playbook');
    } finally {
      setLoading(false);
    }
  }, [playbookId]);

  useEffect(() => {
    fetchPlaybook();
  }, [fetchPlaybook]);

  // Phase operations
  const createPhase = async (input: CreatePhaseInput): Promise<PlaybookPhase | null> => {
    try {
      const { data, error: insertError } = await db
        .from('playbook_phases')
        .insert(input)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchPlaybook();
      toast.success('Fase criada');
      return data as PlaybookPhase;
    } catch (err) {
      console.error('Error creating phase:', err);
      toast.error('Erro ao criar fase');
      return null;
    }
  };

  const updatePhase = async (id: string, updates: Partial<PlaybookPhase>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('playbook_phases')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error updating phase:', err);
      toast.error('Erro ao atualizar fase');
      return false;
    }
  };

  const deletePhase = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await db
        .from('playbook_phases')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchPlaybook();
      toast.success('Fase excluída');
      return true;
    } catch (err) {
      console.error('Error deleting phase:', err);
      toast.error('Erro ao excluir fase');
      return false;
    }
  };

  const reorderPhases = async (phaseIds: string[]): Promise<boolean> => {
    try {
      const updates = phaseIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        await db
          .from('playbook_phases')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error reordering phases:', err);
      toast.error('Erro ao reordenar fases');
      return false;
    }
  };

  // Milestone operations
  const createMilestone = async (input: CreateMilestoneInput): Promise<PlaybookMilestone | null> => {
    try {
      const { data, error: insertError } = await db
        .from('playbook_milestones')
        .insert(input)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchPlaybook();
      toast.success('Marco criado');
      return data as PlaybookMilestone;
    } catch (err) {
      console.error('Error creating milestone:', err);
      toast.error('Erro ao criar marco');
      return null;
    }
  };

  const updateMilestone = async (id: string, updates: Partial<PlaybookMilestone>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('playbook_milestones')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error updating milestone:', err);
      toast.error('Erro ao atualizar marco');
      return false;
    }
  };

  const deleteMilestone = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await db
        .from('playbook_milestones')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchPlaybook();
      toast.success('Marco excluído');
      return true;
    } catch (err) {
      console.error('Error deleting milestone:', err);
      toast.error('Erro ao excluir marco');
      return false;
    }
  };

  const reorderMilestones = async (phaseId: string, milestoneIds: string[]): Promise<boolean> => {
    try {
      for (let i = 0; i < milestoneIds.length; i++) {
        await db
          .from('playbook_milestones')
          .update({ order_index: i })
          .eq('id', milestoneIds[i]);
      }

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error reordering milestones:', err);
      toast.error('Erro ao reordenar marcos');
      return false;
    }
  };

  // Checklist operations
  const createChecklistItem = async (input: CreateChecklistItemInput): Promise<PlaybookChecklistItem | null> => {
    try {
      const { data, error: insertError } = await db
        .from('playbook_checklist_items')
        .insert(input)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchPlaybook();
      toast.success('Item adicionado');
      return data as PlaybookChecklistItem;
    } catch (err) {
      console.error('Error creating checklist item:', err);
      toast.error('Erro ao adicionar item');
      return null;
    }
  };

  const updateChecklistItem = async (id: string, updates: Partial<PlaybookChecklistItem>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('playbook_checklist_items')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error updating checklist item:', err);
      toast.error('Erro ao atualizar item');
      return false;
    }
  };

  const deleteChecklistItem = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await db
        .from('playbook_checklist_items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchPlaybook();
      toast.success('Item removido');
      return true;
    } catch (err) {
      console.error('Error deleting checklist item:', err);
      toast.error('Erro ao remover item');
      return false;
    }
  };

  const reorderChecklistItems = async (milestoneId: string, itemIds: string[]): Promise<boolean> => {
    try {
      for (let i = 0; i < itemIds.length; i++) {
        await db
          .from('playbook_checklist_items')
          .update({ order_index: i })
          .eq('id', itemIds[i]);
      }

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error reordering checklist items:', err);
      toast.error('Erro ao reordenar itens');
      return false;
    }
  };

  // Guide operations
  const createGuide = async (input: CreateGuideInput): Promise<PlaybookGuide | null> => {
    try {
      const { data, error: insertError } = await db
        .from('playbook_guides')
        .insert(input)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchPlaybook();
      toast.success('Guia criado');
      return data as PlaybookGuide;
    } catch (err) {
      console.error('Error creating guide:', err);
      toast.error('Erro ao criar guia');
      return null;
    }
  };

  const updateGuide = async (id: string, updates: Partial<PlaybookGuide>): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('playbook_guides')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPlaybook();
      return true;
    } catch (err) {
      console.error('Error updating guide:', err);
      toast.error('Erro ao atualizar guia');
      return false;
    }
  };

  const deleteGuide = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await db
        .from('playbook_guides')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchPlaybook();
      toast.success('Guia excluído');
      return true;
    } catch (err) {
      console.error('Error deleting guide:', err);
      toast.error('Erro ao excluir guia');
      return false;
    }
  };

  return {
    playbook,
    loading,
    error,
    refreshPlaybook: fetchPlaybook,
    createPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    createGuide,
    updateGuide,
    deleteGuide,
  };
}
