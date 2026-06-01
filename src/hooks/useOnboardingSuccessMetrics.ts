import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  OnboardingSuccessMetric,
  CreateSuccessMetricInput,
} from '@/types/onboarding.types';

export function useOnboardingSuccessMetrics(processId?: string) {
  const queryClient = useQueryClient();

  // Fetch success metrics for a process
  const metricsQuery = useQuery({
    queryKey: ['onboarding-success-metrics', processId],
    queryFn: async (): Promise<OnboardingSuccessMetric[]> => {
      if (!processId) return [];

      const { data, error } = await supabase
        .from('onboarding_success_metrics')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as OnboardingSuccessMetric[];
    },
    enabled: !!processId,
  });

  // Create metric
  const createMetric = useMutation({
    mutationFn: async (input: CreateSuccessMetricInput) => {
      const { data, error } = await supabase
        .from('onboarding_success_metrics')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-success-metrics', processId] });
      toast.success('Métrica criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar métrica: ${error.message}`);
    },
  });

  // Create default metrics for a process
  const createDefaultMetrics = useMutation({
    mutationFn: async (processId: string) => {
      const defaultMetrics = [
        { metric_name: 'Produtividade atingida', metric_description: 'Colaborador atingiu nível esperado de produtividade' },
        { metric_name: 'Entendimento da cultura', metric_description: 'Demonstra compreensão e alinhamento com a cultura da empresa' },
        { metric_name: 'Autonomia no papel', metric_description: 'Executa tarefas do cargo com independência' },
        { metric_name: 'Integração ao time', metric_description: 'Estabeleceu bom relacionamento com a equipe' },
        { metric_name: 'Clareza do papel', metric_description: 'Compreende suas responsabilidades e expectativas' },
      ];

      const metricsToCreate = defaultMetrics.map((m) => ({
        ...m,
        process_id: processId,
      }));

      const { data, error } = await supabase
        .from('onboarding_success_metrics')
        .insert(metricsToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-success-metrics', processId] });
      toast.success('Métricas padrão criadas');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar métricas: ${error.message}`);
    },
  });

  // Update metric
  const updateMetric = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<OnboardingSuccessMetric> & { id: string }) => {
      const { data, error } = await supabase
        .from('onboarding_success_metrics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-success-metrics', processId] });
      toast.success('Métrica atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar métrica: ${error.message}`);
    },
  });

  // Evaluate metric (mark as achieved or not)
  const evaluateMetric = useMutation({
    mutationFn: async ({
      id,
      is_achieved,
      achieved_value,
    }: {
      id: string;
      is_achieved: boolean;
      achieved_value?: string;
    }) => {
      const { data, error } = await supabase
        .from('onboarding_success_metrics')
        .update({
          is_achieved,
          achieved_value,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-success-metrics', processId] });
      toast.success('Métrica avaliada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao avaliar métrica: ${error.message}`);
    },
  });

  // Delete metric
  const deleteMetric = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('onboarding_success_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-success-metrics', processId] });
      toast.success('Métrica excluída');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir métrica: ${error.message}`);
    },
  });

  // Calculate metrics summary
  const getMetricsSummary = () => {
    const metrics = metricsQuery.data || [];
    const total = metrics.length;
    const evaluated = metrics.filter((m) => m.evaluated_at !== null).length;
    const achieved = metrics.filter((m) => m.is_achieved === true).length;
    const notAchieved = metrics.filter((m) => m.is_achieved === false).length;
    const pending = total - evaluated;

    return {
      total,
      evaluated,
      achieved,
      notAchieved,
      pending,
      achievementRate: evaluated > 0 ? (achieved / evaluated) * 100 : 0,
    };
  };

  return {
    metrics: metricsQuery.data || [],
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    refetch: metricsQuery.refetch,
    createMetric,
    createDefaultMetrics,
    updateMetric,
    evaluateMetric,
    deleteMetric,
    getMetricsSummary,
  };
}
