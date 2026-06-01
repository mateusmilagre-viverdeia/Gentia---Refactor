import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';
import { toast } from 'sonner';
import { PREMIUM_CHANNELS } from '@/hooks/useJobDistribution';

export interface JobPublishingLog {
  id: string;
  job_id: string;
  channel_name: string;
  status: 'pending' | 'active' | 'removed' | 'error';
  distributed_at: string | null;
  removed_at: string | null;
  error_message: string | null;
  external_posting_id: string | null;
  metadata: Record<string, unknown>;
}

// Query distribution logs for a specific job
export function useJobPublishingStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-publishing-status', jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from('job_distribution_logs')
        .select('*')
        .eq('job_id', jobId)
        .in('channel_name', PREMIUM_CHANNELS.map(c => c.name));

      if (error) throw error;
      return (data || []) as JobPublishingLog[];
    },
    enabled: !!jobId,
  });
}

// Publish a job to a channel
export function usePublishJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, channelName }: { jobId: string; channelName: string }) => {
      const result = await invokeAuthenticatedFunction<{ success: boolean; message?: string; error?: string; externalId?: string }>(
        'post-job-to-channel',
        { jobId, channelName }
      );

      if (result.error || !result.data?.success) {
        throw new Error(result.data?.error || result.error || 'Erro ao publicar vaga');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-publishing-status', variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ['distribution-logs'] });
      toast.success(data.message || 'Vaga publicada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao publicar vaga');
    },
  });
}

// Unpublish/close a job from a channel
export function useUnpublishJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, channelName }: { jobId: string; channelName: string }) => {
      const result = await invokeAuthenticatedFunction<{ success: boolean; message?: string; error?: string }>(
        'close-job-posting',
        { jobId, channelName }
      );

      if (result.error || !result.data?.success) {
        throw new Error(result.data?.error || result.error || 'Erro ao despublicar vaga');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-publishing-status', variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ['distribution-logs'] });
      toast.success(data.message || 'Vaga despublicada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao despublicar vaga');
    },
  });
}
