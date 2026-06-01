import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  PlaybookChecklistItem, 
  ChecklistProgressItem,
  calculateChecklistProgress 
} from '@/types/playbook.types';

// Type assertion helper for playbook tables not yet in generated types
const db = supabase as any;

interface MilestoneChecklistState {
  checklistItems: PlaybookChecklistItem[];
  progress: ChecklistProgressItem[];
  loading: boolean;
  error: string | null;
}

interface UseMilestoneChecklistReturn extends MilestoneChecklistState {
  toggleItem: (checklistItemId: string) => Promise<boolean>;
  getItemStatus: (checklistItemId: string) => boolean;
  progressPercentage: number;
  refreshChecklist: () => Promise<void>;
}

export function useMilestoneChecklist(
  projectMilestoneId: string | null,
  playbookMilestoneId: string | null
): UseMilestoneChecklistReturn {
  const [state, setState] = useState<MilestoneChecklistState>({
    checklistItems: [],
    progress: [],
    loading: true,
    error: null,
  });

  const fetchChecklist = useCallback(async () => {
    if (!projectMilestoneId || !playbookMilestoneId) {
      setState({
        checklistItems: [],
        progress: [],
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch checklist items from playbook
      const { data: items, error: itemsError } = await db
        .from('playbook_checklist_items')
        .select('*')
        .eq('milestone_id', playbookMilestoneId)
        .order('order_index');

      if (itemsError) throw itemsError;

      // Fetch current progress from project milestone
      const { data: milestone, error: milestoneError } = await supabase
        .from('project_milestones')
        .select('checklist_progress')
        .eq('id', projectMilestoneId)
        .single();

      if (milestoneError) throw milestoneError;

      const rawProgress = milestone?.checklist_progress;
      const progress: ChecklistProgressItem[] = Array.isArray(rawProgress) 
        ? (rawProgress as unknown as ChecklistProgressItem[]) 
        : [];

      setState({
        checklistItems: (items as PlaybookChecklistItem[]) || [],
        progress,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching checklist:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar checklist',
      }));
    }
  }, [projectMilestoneId, playbookMilestoneId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = async (checklistItemId: string): Promise<boolean> => {
    if (!projectMilestoneId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Find current state of item
      const currentItemProgress = state.progress.find(
        p => p.checklist_item_id === checklistItemId
      );

      const isCurrentlyCompleted = currentItemProgress?.completed || false;
      const now = new Date().toISOString();

      // Update progress array
      let newProgress: ChecklistProgressItem[];
      if (currentItemProgress) {
        // Update existing item
        newProgress = state.progress.map(p =>
          p.checklist_item_id === checklistItemId
            ? {
                ...p,
                completed: !isCurrentlyCompleted,
                completed_at: !isCurrentlyCompleted ? now : null,
                completed_by: !isCurrentlyCompleted ? user.id : null,
              }
            : p
        );
      } else {
        // Add new item to progress
        newProgress = [
          ...state.progress,
          {
            checklist_item_id: checklistItemId,
            completed: true,
            completed_at: now,
            completed_by: user.id,
          },
        ];
      }

      // Calculate new progress percentage
      const progressPercentage = calculateChecklistProgress(newProgress);

      // Update database
      const { error: updateError } = await supabase
        .from('project_milestones')
        .update({
          checklist_progress: JSON.parse(JSON.stringify(newProgress)),
          progress_percentage: progressPercentage,
        })
        .eq('id', projectMilestoneId);

      if (updateError) throw updateError;

      // Update local state
      setState(prev => ({
        ...prev,
        progress: newProgress,
      }));

      return true;
    } catch (err) {
      console.error('Error toggling checklist item:', err);
      toast.error('Erro ao atualizar item');
      return false;
    }
  };

  const getItemStatus = (checklistItemId: string): boolean => {
    const item = state.progress.find(p => p.checklist_item_id === checklistItemId);
    return item?.completed || false;
  };

  const progressPercentage = calculateChecklistProgress(state.progress);

  return {
    ...state,
    toggleItem,
    getItemStatus,
    progressPercentage,
    refreshChecklist: fetchChecklist,
  };
}

// Simplified hook for just checking if a milestone has a checklist
export function useMilestoneHasChecklist(playbookMilestoneId: string | null): boolean {
  const [hasChecklist, setHasChecklist] = useState(false);

  useEffect(() => {
    if (!playbookMilestoneId) {
      setHasChecklist(false);
      return;
    }

    const checkChecklist = async () => {
      const { count } = await db
        .from('playbook_checklist_items')
        .select('*', { count: 'exact', head: true })
        .eq('milestone_id', playbookMilestoneId);

      setHasChecklist((count || 0) > 0);
    };

    checkChecklist();
  }, [playbookMilestoneId]);

  return hasChecklist;
}
