import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  OnboardingAlert,
  OnboardingAlertType,
  OnboardingAlertSeverity,
  CreateOnboardingAlertInput,
} from '@/types/onboarding.types';

export function useOnboardingAlerts(processId?: string) {
  const queryClient = useQueryClient();

  // Fetch alerts for a process
  const alertsQuery = useQuery({
    queryKey: ['onboarding-alerts', processId],
    queryFn: async (): Promise<OnboardingAlert[]> => {
      if (!processId) return [];

      const { data, error } = await supabase
        .from('onboarding_alerts')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as OnboardingAlert[];
    },
    enabled: !!processId,
  });

  // Fetch unread alerts count for a process
  const unreadCountQuery = useQuery({
    queryKey: ['onboarding-alerts-unread', processId],
    queryFn: async (): Promise<number> => {
      if (!processId) return 0;

      const { count, error } = await supabase
        .from('onboarding_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('process_id', processId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!processId,
  });

  // Create alert
  const createAlert = useMutation({
    mutationFn: async (input: CreateOnboardingAlertInput) => {
      const { data, error } = await supabase
        .from('onboarding_alerts')
        .insert({
          ...input,
          severity: input.severity || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts', processId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts-unread', processId] });
    },
    onError: (error: Error) => {
      console.error('Error creating alert:', error.message);
    },
  });

  // Mark alert as read
  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('onboarding_alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts', processId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts-unread', processId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar alerta como lido: ${error.message}`);
    },
  });

  // Mark all alerts as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!processId) return;

      const { error } = await supabase
        .from('onboarding_alerts')
        .update({ is_read: true })
        .eq('process_id', processId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts', processId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts-unread', processId] });
      toast.success('Todos os alertas marcados como lidos');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar alertas: ${error.message}`);
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('onboarding_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: userData.user?.id,
          is_read: true,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts', processId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts-unread', processId] });
      toast.success('Alerta resolvido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resolver alerta: ${error.message}`);
    },
  });

  // Delete alert
  const deleteAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('onboarding_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts', processId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-alerts-unread', processId] });
      toast.success('Alerta excluído');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir alerta: ${error.message}`);
    },
  });

  // Helper to get severity based on alert type
  const getDefaultSeverity = (type: OnboardingAlertType): OnboardingAlertSeverity => {
    const severityMap: Record<OnboardingAlertType, OnboardingAlertSeverity> = {
      task_delayed: 'medium',
      checkpoint_at_risk: 'high',
      low_evaluation_score: 'high',
      missing_leader_feedback: 'medium',
      onboarding_not_closed: 'low',
      checkpoint_pending: 'low',
    };
    return severityMap[type];
  };

  // Filter helpers
  const activeAlerts = (alertsQuery.data || []).filter((a) => !a.resolved_at);
  const resolvedAlerts = (alertsQuery.data || []).filter((a) => a.resolved_at);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high');

  return {
    alerts: alertsQuery.data || [],
    activeAlerts,
    resolvedAlerts,
    criticalAlerts,
    unreadCount: unreadCountQuery.data || 0,
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    refetch: alertsQuery.refetch,
    createAlert,
    markAsRead,
    markAllAsRead,
    resolveAlert,
    deleteAlert,
    getDefaultSeverity,
  };
}

// Hook to fetch all alerts for dashboard/overview
export function useAllOnboardingAlerts() {
  const alertsQuery = useQuery({
    queryKey: ['all-onboarding-alerts'],
    queryFn: async (): Promise<(OnboardingAlert & { process_name?: string })[]> => {
      const { data, error } = await supabase
        .from('onboarding_alerts')
        .select(`
          *,
          onboarding_processes!inner(employee_name)
        `)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      return (data || []).map((alert: Record<string, unknown>) => ({
        ...alert,
        process_name: (alert.onboarding_processes as { employee_name?: string })?.employee_name,
      })) as (OnboardingAlert & { process_name?: string })[];
    },
  });

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    refetch: alertsQuery.refetch,
  };
}
