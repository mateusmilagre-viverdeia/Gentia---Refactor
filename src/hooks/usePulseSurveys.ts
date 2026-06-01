import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PulseSurvey, CreatePulseSurveyData, UpdatePulseSurveyData } from '@/types/pulseSurvey.types';

export function usePulseSurveys(accountId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all pulse surveys for the account
  const { data: surveys = [], isLoading: isLoadingSurveys, refetch: refetchSurveys } = useQuery({
    queryKey: ['pulse-surveys', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PulseSurvey[];
    },
    enabled: !!accountId,
  });

  // Create survey mutation
  const createSurveyMutation = useMutation({
    mutationFn: async (data: CreatePulseSurveyData) => {
      if (!accountId) throw new Error('Account ID required');
      
      const { data: result, error } = await supabase
        .from('pulse_surveys')
        .insert({
          account_id: accountId,
          ...data,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as PulseSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
      toast({ title: 'Pesquisa Pulse criada com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar pesquisa', description: error.message, variant: 'destructive' });
    },
  });

  // Update survey mutation
  const updateSurveyMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdatePulseSurveyData & { id: string }) => {
      const { data: result, error } = await supabase
        .from('pulse_surveys')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as PulseSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
      toast({ title: 'Pesquisa atualizada com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar pesquisa', description: error.message, variant: 'destructive' });
    },
  });

  // Delete survey mutation
  const deleteSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pulse_surveys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
      toast({ title: 'Pesquisa excluída' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir pesquisa', description: error.message, variant: 'destructive' });
    },
  });

  // Publish survey
  const publishSurvey = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('pulse_surveys')
      .update({ status: 'active' })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
    toast({ title: 'Pesquisa publicada com sucesso' });
  }, [accountId, queryClient, toast]);

  // Pause survey
  const pauseSurvey = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('pulse_surveys')
      .update({ status: 'paused' })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao pausar', description: error.message, variant: 'destructive' });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
    toast({ title: 'Pesquisa pausada' });
  }, [accountId, queryClient, toast]);

  // Resume survey
  const resumeSurvey = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('pulse_surveys')
      .update({ status: 'active' })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao retomar', description: error.message, variant: 'destructive' });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
    toast({ title: 'Pesquisa retomada' });
  }, [accountId, queryClient, toast]);

  // Close survey
  const closeSurvey = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('pulse_surveys')
      .update({ status: 'closed' })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao encerrar', description: error.message, variant: 'destructive' });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
    toast({ title: 'Pesquisa encerrada' });
  }, [accountId, queryClient, toast]);

  // Duplicate survey
  const duplicateSurvey = useCallback(async (id: string) => {
    const { data: original, error: fetchError } = await supabase
      .from('pulse_surveys')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { id: _, created_at, updated_at, created_by, status, ...rest } = original;
    
    const { data: result, error } = await supabase
      .from('pulse_surveys')
      .insert({
        ...rest,
        title: `${rest.title} (Cópia)`,
        status: 'draft',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    queryClient.invalidateQueries({ queryKey: ['pulse-surveys', accountId] });
    toast({ title: 'Pesquisa duplicada' });
    
    return result as PulseSurvey;
  }, [accountId, queryClient, toast]);

  return {
    surveys,
    isLoadingSurveys,
    refetchSurveys,
    createSurvey: createSurveyMutation.mutateAsync,
    updateSurvey: updateSurveyMutation.mutateAsync,
    deleteSurvey: deleteSurveyMutation.mutateAsync,
    publishSurvey,
    pauseSurvey,
    resumeSurvey,
    closeSurvey,
    duplicateSurvey,
    isCreating: createSurveyMutation.isPending,
    isUpdating: updateSurveyMutation.isPending,
    isDeleting: deleteSurveyMutation.isPending,
  };
}
