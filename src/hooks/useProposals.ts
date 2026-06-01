import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ProposalTemplate {
  id: string;
  account_id: string;
  name: string;
  type: string;
  description?: string | null;
  content: string;
  variables: Json;
  is_default: boolean;
  is_active: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalBenefit {
  name: string;
  value?: string;
  description?: string;
}

export interface Proposal {
  id: string;
  account_id: string;
  application_id: string;
  template_id?: string | null;
  salary_offered?: number | null;
  currency: string;
  start_date?: string | null;
  benefits: Json;
  custom_clauses?: string[] | null;
  additional_notes?: string | null;
  generated_content?: string | null;
  final_content?: string | null;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  sent_via?: string | null;
  viewed_at?: string | null;
  responded_at?: string | null;
  response_type?: string | null;
  response_notes?: string | null;
  valid_until?: string | null;
  generated_by?: string | null;
  version: number;
  metadata?: Json | null;
  created_at: string;
  updated_at: string;
}

interface GenerateProposalParams {
  application_id: string;
  template_id: string;
  account_id: string;
  salary_offered: number;
  currency?: string;
  start_date: string;
  benefits?: ProposalBenefit[];
  custom_clauses?: string[];
  additional_notes?: string;
  valid_until?: string;
  hiring_manager_name?: string;
}

interface UseProposalsOptions {
  accountId: string;
}

export function useProposals({ accountId }: UseProposalsOptions) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ['proposal-templates', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_proposal_templates')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as unknown as ProposalTemplate[];
    },
    enabled: !!accountId,
  });

  // Fetch all proposals
  const {
    data: proposals,
    isLoading: isLoadingProposals,
    error: proposalsError,
  } = useQuery({
    queryKey: ['proposals', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_proposals')
        .select(`
          *,
          recruitment_applications (
            id,
            recruitment_candidates (
              id,
              first_name,
              last_name,
              email
            ),
            recruitment_jobs (
              id,
              title
            )
          ),
          recruitment_proposal_templates (
            id,
            name,
            type
          )
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as (Proposal & {
        recruitment_applications: {
          id: string;
          recruitment_candidates: { id: string; first_name: string | null; last_name: string | null; email: string };
          recruitment_jobs: { id: string; title: string };
        };
        recruitment_proposal_templates?: { id: string; name: string; type: string };
      })[];
    },
    enabled: !!accountId,
  });

  // Fetch proposals for a specific application
  const getProposalsForApplication = useCallback(async (applicationId: string) => {
    const { data, error } = await supabase
      .from('recruitment_proposals')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as unknown as Proposal[];
  }, []);

  // Generate a new proposal
  const generateProposal = useCallback(async (params: GenerateProposalParams) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: params,
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      queryClient.invalidateQueries({ queryKey: ['proposals', accountId] });
      toast.success('Proposta gerada com sucesso!');
      
      return data.proposal as Proposal;
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast.error('Erro ao gerar proposta');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [accountId, queryClient]);

  // Update proposal
  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('recruitment_proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', accountId] });
      toast.success('Proposta atualizada!');
    },
    onError: (error) => {
      console.error('Error updating proposal:', error);
      toast.error('Erro ao atualizar proposta');
    },
  });

  // Update proposal status
  const updateStatus = useCallback(async (
    proposalId: string,
    status: string,
    additionalUpdates?: Record<string, unknown>
  ) => {
    const updates: Record<string, unknown> = { status, ...additionalUpdates };
    
    // Add timestamps based on status
    const now = new Date().toISOString();
    if (status === 'sent') updates.sent_at = now;
    if (status === 'viewed') updates.viewed_at = now;
    if (status === 'accepted' || status === 'rejected') updates.responded_at = now;

    return updateProposalMutation.mutateAsync({ id: proposalId, updates });
  }, [updateProposalMutation]);

  // Save edited content
  const saveContent = useCallback(async (proposalId: string, content: string) => {
    return updateProposalMutation.mutateAsync({
      id: proposalId,
      updates: { final_content: content },
    });
  }, [updateProposalMutation]);

  // Delete proposal
  const deleteProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', accountId] });
      toast.success('Proposta excluída!');
    },
    onError: (error) => {
      console.error('Error deleting proposal:', error);
      toast.error('Erro ao excluir proposta');
    },
  });

  // Create template
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<ProposalTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('recruitment_proposal_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates', accountId] });
      toast.success('Template criado!');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Erro ao criar template');
    },
  });

  // Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProposalTemplate> }) => {
      const { data, error } = await supabase
        .from('recruitment_proposal_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates', accountId] });
      toast.success('Template atualizado!');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    },
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_proposal_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-templates', accountId] });
      toast.success('Template removido!');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erro ao remover template');
    },
  });

  return {
    // Data
    templates,
    proposals,
    
    // Loading states
    isLoadingTemplates,
    isLoadingProposals,
    isGenerating,
    
    // Errors
    templatesError,
    proposalsError,
    
    // Proposal actions
    generateProposal,
    updateStatus,
    saveContent,
    deleteProposal: deleteProposalMutation.mutate,
    getProposalsForApplication,
    
    // Template actions
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    
    // Mutation states
    isUpdatingProposal: updateProposalMutation.isPending,
    isDeletingProposal: deleteProposalMutation.isPending,
    isCreatingTemplate: createTemplateMutation.isPending,
    isUpdatingTemplate: updateTemplateMutation.isPending,
  };
}
