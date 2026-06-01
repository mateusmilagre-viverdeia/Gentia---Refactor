import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { JobICP, JobICPInput, LearnedPatterns } from '@/types/job-icp.types';

export function useJobICP(jobId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch existing ICP for job
  const {
    data: icp,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['job-icp', jobId],
    queryFn: async (): Promise<JobICP | null> => {
      if (!jobId) return null;

      const { data, error } = await supabase
        .from('job_icps')
        .select('*')
        .eq('job_id', jobId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[useJobICP] Fetch error:', error);
        throw error;
      }

      return data as unknown as JobICP | null;
    },
    enabled: !!jobId,
  });

  // Generate ICP via AI
  const generateICP = useMutation({
    mutationFn: async ({ regenerate = false }: { regenerate?: boolean } = {}) => {
      if (!jobId) throw new Error('Job ID is required');

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Sessão expirada');
      }

      const response = await supabase.functions.invoke('generate-job-icp', {
        body: { job_id: jobId, regenerate },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar ICP');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao gerar ICP');
      }

      return response.data.icp as JobICP;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['job-icp', jobId], data);
      toast.success(variables.regenerate ? 'ICP regenerado com sucesso!' : 'ICP gerado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useJobICP] Generate error:', error);
      toast.error(error.message || 'Erro ao gerar ICP');
    },
  });

  // Update ICP manually
  const updateICP = useMutation({
    mutationFn: async (updates: Partial<JobICPInput>) => {
      if (!icp?.id) throw new Error('ICP não encontrado');

      const { data, error } = await supabase
        .from('job_icps')
        .update({
          ...updates,
          generated_by: 'manual',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', icp.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as unknown as JobICP;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['job-icp', jobId], data);
      toast.success('ICP atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useJobICP] Update error:', error);
      toast.error('Erro ao atualizar ICP');
    },
  });

  // Recalibrate ICP with approved candidates data
  const recalibrateICP = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error('Job ID is required');

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Sessão expirada');
      }

      const response = await supabase.functions.invoke('generate-job-icp', {
        body: { job_id: jobId, regenerate: true, recalibrate: true },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao recalibrar ICP');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao recalibrar ICP');
      }

      return response.data.icp as JobICP;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['job-icp', jobId], data);
      toast.success('ICP recalibrado com sucesso com base nos candidatos aprovados!');
    },
    onError: (error: Error) => {
      console.error('[useJobICP] Recalibrate error:', error);
      toast.error(error.message || 'Erro ao recalibrar ICP');
    },
  });

  // Check if recalibration is needed (every 10 new approved candidates)
  const needsRecalibration = icp 
    ? (icp.approved_candidates_count > 0 && icp.approved_candidates_count % 10 === 0 && !icp.last_calibrated_at)
      || (icp.last_calibrated_at && icp.approved_candidates_count > 0)
    : false;

  // Update confidence threshold
  const updateThreshold = useMutation({
    mutationFn: async (threshold: number) => {
      if (!icp?.id) throw new Error('ICP não encontrado');

      const { data, error } = await supabase
        .from('job_icps')
        .update({
          confidence_threshold: threshold,
          updated_at: new Date().toISOString(),
        })
        .eq('id', icp.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as unknown as JobICP;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['job-icp', jobId], data);
    },
    onError: (error: Error) => {
      console.error('[useJobICP] Update threshold error:', error);
      toast.error('Erro ao atualizar threshold');
    },
  });

  return {
    icp,
    isLoading,
    error,
    refetch,
    generateICP: generateICP.mutateAsync,
    isGenerating: generateICP.isPending,
    updateICP: updateICP.mutateAsync,
    isUpdating: updateICP.isPending,
    updateThreshold: updateThreshold.mutateAsync,
    recalibrateICP: recalibrateICP.mutateAsync,
    isRecalibrating: recalibrateICP.isPending,
    needsRecalibration,
    hasICP: !!icp,
  };
}
