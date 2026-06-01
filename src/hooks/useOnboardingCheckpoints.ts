import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  OnboardingCheckpoint,
  OnboardingCheckpointResponse,
  OnboardingCheckpointWithResponses,
  OnboardingCheckpointStatus,
  CreateOnboardingCheckpointInput,
  CreateCheckpointResponseInput,
} from '@/types/onboarding.types';

export function useOnboardingCheckpoints(processId?: string) {
  const queryClient = useQueryClient();

  // Fetch checkpoints with responses for a process
  const checkpointsQuery = useQuery({
    queryKey: ['onboarding-checkpoints', processId],
    queryFn: async (): Promise<OnboardingCheckpointWithResponses[]> => {
      if (!processId) return [];

      const { data: checkpoints, error } = await supabase
        .from('onboarding_checkpoints')
        .select('*')
        .eq('process_id', processId)
        .order('checkpoint_day', { ascending: true });

      if (error) throw error;

      // Fetch responses for each checkpoint
      const checkpointsWithResponses: OnboardingCheckpointWithResponses[] = await Promise.all(
        (checkpoints || []).map(async (checkpoint) => {
          const { data: responses, error: responsesError } = await supabase
            .from('onboarding_checkpoint_responses')
            .select('*')
            .eq('checkpoint_id', checkpoint.id);

          if (responsesError) {
            console.error('Error fetching checkpoint responses:', responsesError);
            return { ...checkpoint, responses: [] } as OnboardingCheckpointWithResponses;
          }

          return {
            ...checkpoint,
            responses: responses || [],
          } as OnboardingCheckpointWithResponses;
        })
      );

      return checkpointsWithResponses;
    },
    enabled: !!processId,
  });

  // Create checkpoint
  const createCheckpoint = useMutation({
    mutationFn: async (input: CreateOnboardingCheckpointInput) => {
      const { data, error } = await supabase
        .from('onboarding_checkpoints')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoints', processId] });
      toast.success('Checkpoint criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar checkpoint: ${error.message}`);
    },
  });

  // Create multiple checkpoints (for initial setup)
  const createDefaultCheckpoints = useMutation({
    mutationFn: async ({ processId, startDate }: { processId: string; startDate: string }) => {
      const defaultCheckpoints = [
        { day: 7, name: 'Integração Inicial', description: 'Avaliação da integração inicial do colaborador' },
        { day: 30, name: 'Clareza e Primeiras Entregas', description: 'Avaliação de clareza do papel e primeiras entregas' },
        { day: 60, name: 'Autonomia em Construção', description: 'Avaliação do desenvolvimento da autonomia' },
        { day: 90, name: 'Prontidão Final', description: 'Avaliação final de prontidão para o cargo' },
      ];

      const start = new Date(startDate);
      
      const checkpointsToCreate = defaultCheckpoints.map((cp) => ({
        process_id: processId,
        checkpoint_day: cp.day,
        name: cp.name,
        description: cp.description,
        scheduled_date: new Date(start.getTime() + cp.day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));

      const { data, error } = await supabase
        .from('onboarding_checkpoints')
        .insert(checkpointsToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoints', processId] });
      toast.success('Checkpoints criados com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar checkpoints: ${error.message}`);
    },
  });

  // Update checkpoint status
  const updateCheckpointStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OnboardingCheckpointStatus }) => {
      const updateData: Partial<OnboardingCheckpoint> = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('onboarding_checkpoints')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoints', processId] });
      toast.success('Status do checkpoint atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar checkpoint: ${error.message}`);
    },
  });

  // Delete checkpoint
  const deleteCheckpoint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('onboarding_checkpoints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoints', processId] });
      toast.success('Checkpoint excluído');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir checkpoint: ${error.message}`);
    },
  });

  // Submit checkpoint response
  const submitResponse = useMutation({
    mutationFn: async (input: CreateCheckpointResponseInput) => {
      // Calculate overall score based on respondent type
      let overallScore: number | null = null;
      
      if (input.respondent_type === 'employee') {
        const scores = [
          input.feeling_score,
          input.role_clarity_score,
          input.team_integration_score,
          input.work_preparation_score,
        ].filter((s): s is number => s !== undefined && s !== null);
        
        if (scores.length > 0) {
          overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      } else {
        const scores = [
          input.role_clarity_score,
          input.delivery_quality_score,
          input.culture_adherence_score,
          input.autonomy_score,
        ].filter((s): s is number => s !== undefined && s !== null);
        
        if (scores.length > 0) {
          overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }

      const { data, error } = await supabase
        .from('onboarding_checkpoint_responses')
        .upsert({
          ...input,
          overall_score: overallScore,
          responded_at: new Date().toISOString(),
        }, {
          onConflict: 'checkpoint_id,respondent_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checkpoints', processId] });
      toast.success('Resposta registrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar resposta: ${error.message}`);
    },
  });

  // Calculate checkpoint status based on responses
  const calculateCheckpointStatus = (
    checkpoint: OnboardingCheckpointWithResponses
  ): OnboardingCheckpointStatus => {
    const { responses, scheduled_date } = checkpoint;
    
    // If no responses yet, check if overdue
    if (responses.length === 0) {
      const scheduled = new Date(scheduled_date);
      const today = new Date();
      if (today > scheduled) {
        return 'at_risk';
      }
      return 'pending';
    }

    // Check average scores
    const allScores = responses
      .map((r) => r.overall_score)
      .filter((s): s is number => s !== null);
    
    if (allScores.length === 0) return 'pending';
    
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    
    if (avgScore < 5) return 'at_risk';
    if (avgScore < 7) return 'attention';
    if (responses.length >= 2) return 'completed'; // Both employee and leader responded
    
    return 'pending';
  };

  return {
    checkpoints: checkpointsQuery.data || [],
    isLoading: checkpointsQuery.isLoading,
    error: checkpointsQuery.error,
    refetch: checkpointsQuery.refetch,
    createCheckpoint,
    createDefaultCheckpoints,
    updateCheckpointStatus,
    deleteCheckpoint,
    submitResponse,
    calculateCheckpointStatus,
  };
}
