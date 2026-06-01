import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ActionPlan, ActionPlanFormData, ActionPlanStatus } from '@/types/action-plan.types';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { createLogger } from '@/lib/logger';

const log = createLogger('useActionPlans');

export function useActionPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentAccount } = useOrganization();
  const [actions, setActions] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ActionPlanStatus | 'todas'>('todas');

  const fetchActions = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Prefer account_id if available
      let query = supabase.from('action_plans').select('*');
      if (currentAccount?.id) {
        query = query.eq('account_id', currentAccount.id);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      query = query.order('deadline', { ascending: true, nullsFirst: false });

      if (statusFilter !== 'todas') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActions((data as ActionPlan[]) || []);
    } catch (error) {
      log.error('Error fetching actions:', error);
      toast({
        title: 'Erro ao carregar ações',
        description: 'Não foi possível carregar as ações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentAccount, statusFilter, toast]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const createAction = async (data: ActionPlanFormData) => {
    if (!user) return false;

    try {
      const { data: insertedAction, error } = await supabase.from('action_plans').insert({
        user_id: user.id,
        account_id: currentAccount?.id,
        title: data.title,
        description: data.description || null,
        responsible: data.responsible,
        status: data.status,
        deadline: data.deadline ? data.deadline.toISOString().split('T')[0] : null,
        priority: data.priority,
      }).select('id').single();

      if (error) throw error;

      // Create notification for the action creator
      if (insertedAction) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          account_id: currentAccount?.id,
          org_id: currentAccount?.id,
          type: 'action',
          title: `Nova ação criada: ${data.title}`,
          message: data.description || `Responsável: ${data.responsible}`,
          priority: data.priority === 'alta' ? 'high' : 'normal',
          entity_type: 'action_plan',
          entity_id: insertedAction.id,
          target_url: '/plano-de-acao',
        });
      }

      toast({
        title: 'Ação criada',
        description: 'A ação foi adicionada com sucesso.',
      });

      fetchActions();
      return true;
    } catch (error) {
      log.error('Error creating action:', error);
      toast({
        title: 'Erro ao criar ação',
        description: 'Não foi possível criar a ação. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateAction = async (id: string, data: ActionPlanFormData) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('action_plans')
        .update({
          title: data.title,
          description: data.description || null,
          responsible: data.responsible,
          status: data.status,
          deadline: data.deadline ? data.deadline.toISOString().split('T')[0] : null,
          priority: data.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Ação atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });

      fetchActions();
      return true;
    } catch (error) {
      log.error('Error updating action:', error);
      toast({
        title: 'Erro ao atualizar ação',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteAction = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('action_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Ação excluída',
        description: 'A ação foi removida com sucesso.',
      });

      fetchActions();
      return true;
    } catch (error) {
      log.error('Error deleting action:', error);
      toast({
        title: 'Erro ao excluir ação',
        description: 'Não foi possível excluir a ação. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getStatusCounts = () => {
    const allActions = actions;
    return {
      todas: allActions.length,
      planejada: allActions.filter(a => a.status === 'planejada').length,
      em_andamento: allActions.filter(a => a.status === 'em_andamento').length,
      concluida: allActions.filter(a => a.status === 'concluida').length,
      cancelada: allActions.filter(a => a.status === 'cancelada').length,
    };
  };

  return {
    actions,
    loading,
    statusFilter,
    setStatusFilter,
    createAction,
    updateAction,
    deleteAction,
    getStatusCounts,
    refetch: fetchActions,
  };
}
