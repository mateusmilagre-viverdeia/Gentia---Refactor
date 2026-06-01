import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectMilestone, MilestoneStatus } from '@/types/project-timeline.types';

interface UseProjectMilestonesReturn {
  milestones: ProjectMilestone[];
  loading: boolean;
  error: string | null;
  createMilestone: (milestone: Partial<ProjectMilestone>) => Promise<ProjectMilestone | null>;
  updateMilestone: (id: string, updates: Partial<ProjectMilestone>) => Promise<boolean>;
  deleteMilestone: (id: string) => Promise<boolean>;
  updateMilestoneStatus: (id: string, status: MilestoneStatus) => Promise<boolean>;
  reorderMilestones: (milestoneIds: string[]) => Promise<boolean>;
  refreshMilestones: () => Promise<void>;
}

export function useProjectMilestones(accountId: string | null): UseProjectMilestonesReturn {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMilestones = useCallback(async () => {
    if (!accountId) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('account_id', accountId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      // Type assertion for depends_on since it comes as Json from DB
      const typedMilestones: ProjectMilestone[] = (data || []).map(m => ({
        ...m,
        depends_on: Array.isArray(m.depends_on) ? m.depends_on as string[] : [],
        status: m.status as MilestoneStatus,
        milestone_type: m.milestone_type as ProjectMilestone['milestone_type'],
        playbook_milestone_id: (m as Record<string, unknown>).playbook_milestone_id as string | null ?? null,
        playbook_application_id: (m as Record<string, unknown>).playbook_application_id as string | null ?? null,
        checklist_progress: Array.isArray(m.checklist_progress) ? m.checklist_progress : null,
      }));

      setMilestones(typedMilestones);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Erro ao carregar marcos do projeto');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const createMilestone = async (milestone: Partial<ProjectMilestone>): Promise<ProjectMilestone | null> => {
    if (!accountId) return null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const newMilestone = {
        account_id: accountId,
        milestone_name: milestone.milestone_name || 'Novo Marco',
        milestone_type: milestone.milestone_type || 'custom',
        pillar: milestone.pillar || null,
        description: milestone.description || null,
        planned_start: milestone.planned_start || null,
        planned_end: milestone.planned_end || null,
        actual_start: milestone.actual_start || null,
        actual_end: milestone.actual_end || null,
        status: milestone.status || 'pending',
        progress_percentage: milestone.progress_percentage || 0,
        depends_on: milestone.depends_on || [],
        responsible: milestone.responsible || null,
        order_index: milestone.order_index ?? milestones.length,
        created_by: userData?.user?.id || null,
      };

      const { data, error: insertError } = await supabase
        .from('project_milestones')
        .insert(newMilestone)
        .select()
        .single();

      if (insertError) throw insertError;

      const dataRecord = data as Record<string, unknown>;
      const typedMilestone: ProjectMilestone = {
        ...data,
        depends_on: Array.isArray(data.depends_on) ? data.depends_on as string[] : [],
        status: data.status as MilestoneStatus,
        milestone_type: data.milestone_type as ProjectMilestone['milestone_type'],
        playbook_milestone_id: dataRecord.playbook_milestone_id as string | null ?? null,
        playbook_application_id: dataRecord.playbook_application_id as string | null ?? null,
        checklist_progress: Array.isArray(data.checklist_progress) ? data.checklist_progress : null,
      };

      setMilestones(prev => [...prev, typedMilestone]);
      
      toast({
        title: "Marco criado",
        description: "O marco foi criado com sucesso.",
      });

      return typedMilestone;
    } catch (err) {
      console.error('Error creating milestone:', err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o marco.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateMilestone = async (id: string, updates: Partial<ProjectMilestone>): Promise<boolean> => {
    try {
      // Create a clean update object without properties that might cause type issues
      const { playbook_milestone_id, playbook_application_id, checklist_progress, ...cleanUpdates } = updates;
      
      const dbUpdates: Record<string, unknown> = {
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      };
      
      // Only include playbook fields if they are explicitly being updated
      if (playbook_milestone_id !== undefined) dbUpdates.playbook_milestone_id = playbook_milestone_id;
      if (playbook_application_id !== undefined) dbUpdates.playbook_application_id = playbook_application_id;
      if (checklist_progress !== undefined) dbUpdates.checklist_progress = checklist_progress;
      
      const { error: updateError } = await supabase
        .from('project_milestones')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setMilestones(prev => 
        prev.map(m => m.id === id ? { ...m, ...updates } : m)
      );

      toast({
        title: "Marco atualizado",
        description: "As alterações foram salvas.",
      });

      return true;
    } catch (err) {
      console.error('Error updating milestone:', err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o marco.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateMilestoneStatus = async (id: string, status: MilestoneStatus): Promise<boolean> => {
    const updates: Partial<ProjectMilestone> = { status };
    
    // Auto-set dates based on status
    if (status === 'in_progress' && !milestones.find(m => m.id === id)?.actual_start) {
      updates.actual_start = new Date().toISOString().split('T')[0];
    }
    if (status === 'completed') {
      updates.actual_end = new Date().toISOString().split('T')[0];
      updates.progress_percentage = 100;
    }

    return updateMilestone(id, updates);
  };

  const deleteMilestone = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setMilestones(prev => prev.filter(m => m.id !== id));

      toast({
        title: "Marco excluído",
        description: "O marco foi removido do projeto.",
      });

      return true;
    } catch (err) {
      console.error('Error deleting milestone:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o marco.",
        variant: "destructive",
      });
      return false;
    }
  };

  const reorderMilestones = async (milestoneIds: string[]): Promise<boolean> => {
    try {
      const updates = milestoneIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('project_milestones')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      setMilestones(prev => {
        const sorted = [...prev].sort((a, b) => {
          const aIndex = milestoneIds.indexOf(a.id);
          const bIndex = milestoneIds.indexOf(b.id);
          return aIndex - bIndex;
        });
        return sorted.map((m, i) => ({ ...m, order_index: i }));
      });

      return true;
    } catch (err) {
      console.error('Error reordering milestones:', err);
      return false;
    }
  };

  return {
    milestones,
    loading,
    error,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateMilestoneStatus,
    reorderMilestones,
    refreshMilestones: fetchMilestones,
  };
}
