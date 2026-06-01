import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ReadConfirmation {
  id: string;
  post_id: string;
  user_id: string;
  confirmed_at: string;
}

export interface UnconfirmedPost {
  id: string;
  title: string;
  content: string | null;
  post_type: string;
  published_at: string;
  requires_confirmation: boolean;
}

export function useReadConfirmations() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const accountId = currentOrganization?.id;

  // Fetch user's confirmations
  const confirmationsQuery = useQuery({
    queryKey: ['read-confirmations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('post_read_confirmations')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as ReadConfirmation[];
    },
    enabled: !!user,
  });

  // Fetch posts that require confirmation and user hasn't confirmed
  const unconfirmedPostsQuery = useQuery({
    queryKey: ['unconfirmed-posts', accountId, user?.id],
    queryFn: async () => {
      if (!user || !accountId) return [];
      
      // Get confirmed post IDs
      const { data: confirmations } = await supabase
        .from('post_read_confirmations')
        .select('post_id')
        .eq('user_id', user.id);
      
      const confirmedIds = confirmations?.map(c => c.post_id) ?? [];
      
      // Get posts requiring confirmation that user hasn't confirmed
      let query = supabase
        .from('intranet_posts')
        .select('id, title, content, post_type, published_at, requires_confirmation')
        .eq('account_id', accountId)
        .eq('requires_confirmation', true)
        .order('published_at', { ascending: false });
      
      if (confirmedIds.length > 0) {
        query = query.not('id', 'in', `(${confirmedIds.join(',')})`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as UnconfirmedPost[];
    },
    enabled: !!user && !!accountId,
  });

  // Confirm reading
  const confirmReading = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('post_read_confirmations')
        .insert({
          post_id: postId,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['read-confirmations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unconfirmed-posts', accountId, user?.id] });
      toast.success('Leitura confirmada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao confirmar leitura: ${error.message}`);
    },
  });

  const isConfirmed = (postId: string) => {
    return confirmationsQuery.data?.some(c => c.post_id === postId) ?? false;
  };

  return {
    confirmations: confirmationsQuery.data ?? [],
    unconfirmedPosts: unconfirmedPostsQuery.data ?? [],
    confirmReading,
    isConfirmed,
    isLoading: confirmationsQuery.isLoading || unconfirmedPostsQuery.isLoading,
    hasUnconfirmedPosts: (unconfirmedPostsQuery.data?.length ?? 0) > 0,
  };
}
