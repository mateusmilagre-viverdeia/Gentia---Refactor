import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { toast } from 'sonner';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';

export interface DistributionCredential {
  id: string;
  account_id: string;
  channel_name: string;
  credential_type: string;
  client_id: string | null;
  organization_id: string | null;
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'error';
  last_validated_at: string | null;
  error_message: string | null;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SaveCredentialsInput {
  channelName: string;
  clientId: string;
  clientSecret: string;
  organizationId?: string;
  credentialType?: string;
}

type CredentialsFunctionResult = {
  success: boolean;
  message?: string;
  error?: string;
  scopes?: string[];
};

function normalizeCredential(row: any): DistributionCredential {
  return {
    id: row.id,
    account_id: row.account_id,
    channel_name: row.channel_name,
    credential_type: row.credential_type,
    client_id: row.client_id,
    organization_id: row.organization_id,
    status: (row.status || 'pending') as DistributionCredential['status'],
    last_validated_at: row.last_validated_at,
    error_message: row.error_message,
    scopes: row.scopes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useDistributionCredentials() {
  const { account } = useAccount();

  return useQuery({
    queryKey: ['distribution-credentials', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];

      const { data, error } = await supabase
        .from('job_distribution_credentials')
        .select('id, account_id, channel_name, credential_type, client_id, organization_id, status, last_validated_at, error_message, scopes, created_at, updated_at')
        .eq('account_id', account.id)
        .order('channel_name');

      if (error) {
        console.error('[useDistributionCredentials] Error:', error);
        throw error;
      }

      return (data || []).map(normalizeCredential);
    },
    enabled: !!account?.id,
  });
}

async function manageCredentials(accountId: string, payload: Record<string, unknown>) {
  const result = await invokeAuthenticatedFunction<CredentialsFunctionResult>(
    'validate-distribution-credentials',
    { accountId, ...payload },
  );

  if (result.error || !result.data?.success) {
    throw new Error(result.data?.error || result.error || 'Falha ao processar credenciais');
  }

  return result.data;
}

export function useSaveCredentials() {
  const queryClient = useQueryClient();
  const { account } = useAccount();

  return useMutation({
    mutationFn: async (input: SaveCredentialsInput) => {
      if (!account?.id) throw new Error('Account not found');
      return manageCredentials(account.id, {
        action: 'save',
        channelName: input.channelName,
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        organizationId: input.organizationId,
        credentialType: input.credentialType || 'oauth2',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-credentials'] });
      toast.success('Credenciais salvas com segurança');
    },
    onError: (error: Error) => {
      console.error('[useSaveCredentials] Error:', error);
      toast.error(error.message || 'Erro ao salvar credenciais');
    },
  });
}

export function useValidateCredentials() {
  const queryClient = useQueryClient();
  const { account } = useAccount();

  return useMutation({
    mutationFn: async ({ channelName, clientId, clientSecret, organizationId, credentialType }: {
      channelName: string;
      clientId: string;
      clientSecret: string;
      organizationId?: string;
      credentialType?: string;
    }) => {
      if (!account?.id) throw new Error('Account not found');
      return manageCredentials(account.id, {
        action: 'validate',
        channelName,
        clientId,
        clientSecret,
        organizationId,
        credentialType,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-credentials'] });
      toast.success(`Credenciais do ${variables.channelName} validadas com sucesso!`);
    },
    onError: (error: Error) => {
      console.error('[useValidateCredentials] Error:', error);
      toast.error(error.message || 'Erro ao validar credenciais');
    },
  });
}

export function useRevokeCredentials() {
  const queryClient = useQueryClient();
  const { account } = useAccount();

  return useMutation({
    mutationFn: async (channelName: string) => {
      if (!account?.id) throw new Error('Account not found');
      return manageCredentials(account.id, { action: 'revoke', channelName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-credentials'] });
      toast.success('Credenciais revogadas');
    },
    onError: (error: Error) => {
      console.error('[useRevokeCredentials] Error:', error);
      toast.error(error.message || 'Erro ao revogar credenciais');
    },
  });
}

export function useDeleteCredentials() {
  const queryClient = useQueryClient();
  const { account } = useAccount();

  return useMutation({
    mutationFn: async (channelName: string) => {
      if (!account?.id) throw new Error('Account not found');
      return manageCredentials(account.id, { action: 'delete', channelName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-credentials'] });
      toast.success('Credenciais removidas');
    },
    onError: (error: Error) => {
      console.error('[useDeleteCredentials] Error:', error);
      toast.error(error.message || 'Erro ao remover credenciais');
    },
  });
}

export function useCredentialStatus(channelName: string) {
  const { data: credentials = [] } = useDistributionCredentials();
  return credentials.find(c => c.channel_name === channelName);
}
