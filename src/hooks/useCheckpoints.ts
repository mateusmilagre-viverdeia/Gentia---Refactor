import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectCheckpoint, CheckpointAction } from '@/types/consultant.types';

interface UseCheckpointsReturn {
  checkpoints: ProjectCheckpoint[];
  actions: CheckpointAction[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  reloadCheckpoints: () => Promise<void>;
  createCheckpoint: (data: Omit<ProjectCheckpoint, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<ProjectCheckpoint | null>;
  updateCheckpoint: (id: string, data: Partial<ProjectCheckpoint>) => Promise<boolean>;
  deleteCheckpoint: (id: string) => Promise<boolean>;
  createAction: (data: Omit<CheckpointAction, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<CheckpointAction | null>;
  updateAction: (id: string, data: Partial<CheckpointAction>) => Promise<boolean>;
  deleteAction: (id: string) => Promise<boolean>;
}

export function useCheckpoints(accountId: string | null): UseCheckpointsReturn {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [checkpoints, setCheckpoints] = useState<ProjectCheckpoint[]>([]);
  const [actions, setActions] = useState<CheckpointAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  // Use impersonated user's ID when impersonating for READING permissions
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  const loadCheckpoints = useCallback(async () => {
    if (!accountId || !effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Check if user can manage checkpoints (is EP Team member) using effectiveUserId
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', effectiveUserId);

      const roles = new Set(userRoles?.map(r => r.role) || []);
      const isSuperAdmin = roles.has('super_admin');
      const isHeadCS = roles.has('head_cs');
      const isEPConsultant = roles.has('ep_consultant');

      // If EP consultant, check if assigned to this project
      let canManageCheckpoints = isSuperAdmin || isHeadCS;
      
      if (isEPConsultant && !canManageCheckpoints) {
        const { data: consultant } = await supabase
          .from('ep_consultants')
          .select('id')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (consultant) {
          const { data: assignment } = await supabase
            .from('consultant_assignments')
            .select('id')
            .eq('consultant_id', consultant.id)
            .eq('account_id', accountId)
            .eq('active', true)
            .maybeSingle();

          canManageCheckpoints = !!assignment;
        }
      }

      setCanManage(canManageCheckpoints);

      // Get checkpoints
      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from('project_checkpoints')
        .select('*')
        .eq('account_id', accountId)
        .order('checkpoint_date', { ascending: false });

      if (checkpointsError) throw checkpointsError;

      // Get all actions for this account
      const { data: actionsData, error: actionsError } = await supabase
        .from('checkpoint_actions')
        .select('*')
        .eq('account_id', accountId)
        .order('due_date', { ascending: true });

      if (actionsError) throw actionsError;

      // Attach actions to checkpoints
      const checkpointsWithActions = (checkpointsData || []).map(checkpoint => ({
        ...checkpoint,
        status: checkpoint.status as ProjectCheckpoint['status'],
        actions: (actionsData || [])
          .filter(a => a.checkpoint_id === checkpoint.id)
          .map(a => ({ ...a, status: a.status as CheckpointAction['status'] })),
      }));

      setCheckpoints(checkpointsWithActions);
      setActions((actionsData || []).map(a => ({ ...a, status: a.status as CheckpointAction['status'] })));
    } catch (err) {
      console.error('Error loading checkpoints:', err);
      setError('Erro ao carregar checkpoints');
    } finally {
      setLoading(false);
    }
  }, [accountId, effectiveUserId]);

  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  const createCheckpoint = async (data: Omit<ProjectCheckpoint, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<ProjectCheckpoint | null> => {
    if (!user || !canManage) return null;

    try {
      const { data: checkpoint, error } = await supabase
        .from('project_checkpoints')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Checkpoint criado');
      await loadCheckpoints();
      return { ...checkpoint, status: checkpoint.status as ProjectCheckpoint['status'] };
    } catch (err) {
      console.error('Error creating checkpoint:', err);
      toast.error('Erro ao criar checkpoint');
      return null;
    }
  };

  const updateCheckpoint = async (id: string, data: Partial<ProjectCheckpoint>): Promise<boolean> => {
    if (!canManage) return false;

    try {
      const { error } = await supabase
        .from('project_checkpoints')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast.success('Checkpoint atualizado');
      await loadCheckpoints();
      return true;
    } catch (err) {
      console.error('Error updating checkpoint:', err);
      toast.error('Erro ao atualizar checkpoint');
      return false;
    }
  };

  const deleteCheckpoint = async (id: string): Promise<boolean> => {
    if (!canManage) return false;

    try {
      const { error } = await supabase
        .from('project_checkpoints')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Checkpoint excluído');
      await loadCheckpoints();
      return true;
    } catch (err) {
      console.error('Error deleting checkpoint:', err);
      toast.error('Erro ao excluir checkpoint');
      return false;
    }
  };

  const createAction = async (data: Omit<CheckpointAction, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<CheckpointAction | null> => {
    if (!user || !canManage) return null;

    try {
      const { data: action, error } = await supabase
        .from('checkpoint_actions')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Ação criada');
      await loadCheckpoints();
      return { ...action, status: action.status as CheckpointAction['status'] };
    } catch (err) {
      console.error('Error creating action:', err);
      toast.error('Erro ao criar ação');
      return null;
    }
  };

  const updateAction = async (id: string, data: Partial<CheckpointAction>): Promise<boolean> => {
    if (!canManage) return false;

    try {
      const { error } = await supabase
        .from('checkpoint_actions')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast.success('Ação atualizada');
      await loadCheckpoints();
      return true;
    } catch (err) {
      console.error('Error updating action:', err);
      toast.error('Erro ao atualizar ação');
      return false;
    }
  };

  const deleteAction = async (id: string): Promise<boolean> => {
    if (!canManage) return false;

    try {
      const { error } = await supabase
        .from('checkpoint_actions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Ação excluída');
      await loadCheckpoints();
      return true;
    } catch (err) {
      console.error('Error deleting action:', err);
      toast.error('Erro ao excluir ação');
      return false;
    }
  };

  return {
    checkpoints,
    actions,
    loading,
    error,
    canManage,
    reloadCheckpoints: loadCheckpoints,
    createCheckpoint,
    updateCheckpoint,
    deleteCheckpoint,
    createAction,
    updateAction,
    deleteAction,
  };
}
