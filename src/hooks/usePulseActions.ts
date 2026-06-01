import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PulseAction {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  related_driver_id: string | null;
  related_pillar_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  pulse_drivers?: { id: string; name: string; key: string } | null;
  pulse_pillars?: { id: string; name: string; emoji: string | null } | null;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface CreateActionInput {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  related_driver_id?: string;
  related_pillar_id?: string;
}

export interface UpdateActionInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  related_driver_id?: string | null;
  related_pillar_id?: string | null;
}

export function usePulseActions(accountId: string | null) {
  const [actions, setActions] = useState<PulseAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchActions = useCallback(async (status?: string) => {
    if (!accountId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('pulse_admin_actions')
        .select(`
          *,
          pulse_drivers:related_driver_id(id, name, key),
          pulse_pillars:related_pillar_id(id, name, emoji),
          profiles:created_by_user_id(first_name, last_name, email)
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
      toast({
        title: 'Erro ao carregar ações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const createAction = useCallback(async (input: CreateActionInput) => {
    if (!accountId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('pulse_admin_actions')
        .insert({
          account_id: accountId,
          title: input.title,
          description: input.description || null,
          priority: input.priority || 'medium',
          due_date: input.due_date || null,
          related_driver_id: input.related_driver_id || null,
          related_pillar_id: input.related_pillar_id || null,
          created_by_user_id: user.id,
          status: 'planned',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Ação criada',
        description: 'O plano de ação foi criado com sucesso.',
      });

      return data;
    } catch (error) {
      console.error('Error creating action:', error);
      toast({
        title: 'Erro ao criar ação',
        variant: 'destructive',
      });
      return null;
    }
  }, [accountId, toast]);

  const updateAction = useCallback(async (actionId: string, input: UpdateActionInput) => {
    try {
      const { error } = await supabase
        .from('pulse_admin_actions')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actionId);

      if (error) throw error;

      setActions(prev => prev.map(a => 
        a.id === actionId ? { ...a, ...input, updated_at: new Date().toISOString() } : a
      ));

      toast({
        title: 'Ação atualizada',
      });

      return true;
    } catch (error) {
      console.error('Error updating action:', error);
      toast({
        title: 'Erro ao atualizar ação',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const deleteAction = useCallback(async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_admin_actions')
        .delete()
        .eq('id', actionId);

      if (error) throw error;

      setActions(prev => prev.filter(a => a.id !== actionId));

      toast({
        title: 'Ação removida',
      });

      return true;
    } catch (error) {
      console.error('Error deleting action:', error);
      toast({
        title: 'Erro ao remover ação',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const updateStatus = useCallback(async (actionId: string, status: string) => {
    return updateAction(actionId, { status });
  }, [updateAction]);

  return {
    actions,
    loading,
    fetchActions,
    createAction,
    updateAction,
    deleteAction,
    updateStatus,
  };
}
