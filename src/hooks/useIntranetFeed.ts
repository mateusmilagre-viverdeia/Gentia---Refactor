import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
// Simplified types for joined relations
interface PostEmployee {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
}

interface PostEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
}

export type PostType = 'announcement' | 'birthday' | 'new_hire' | 'promotion' | 'holiday' | 'custom';

export interface IntranetPost {
  id: string;
  account_id: string;
  post_type: PostType;
  title: string;
  content: string | null;
  media_url: string | null;
  related_employee_id: string | null;
  related_event_id: string | null;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  requires_confirmation: boolean;
  // New fields for specific post types
  event_date: string | null;
  new_job_title: string | null;
  previous_job_title: string | null;
  department: string | null;
  // Joined relations (simplified)
  employee?: PostEmployee | null;
  event?: PostEvent | null;
}

export interface CreatePostInput {
  post_type: PostType;
  title: string;
  content?: string;
  media_url?: string;
  related_employee_id?: string;
  related_event_id?: string;
  is_pinned?: boolean;
  expires_at?: string;
  requires_confirmation?: boolean;
  // New fields
  event_date?: string;
  new_job_title?: string;
  previous_job_title?: string;
  department?: string;
}

export function useIntranetFeed(limit = 20) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const accountId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const feedQuery = useQuery({
    queryKey: ['intranet-feed', accountId, limit],
    queryFn: async () => {
      if (!accountId) return [];
      
      const { data, error } = await supabase
        .from('intranet_posts')
        .select(`
          *,
          employee:related_employee_id(id, full_name, job_title, avatar_url),
          event:related_event_id(id, title, event_type, event_date)
        `)
        .eq('account_id', accountId)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as IntranetPost[];
    },
    enabled: !!accountId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel(`intranet-posts-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intranet_posts',
          filter: `account_id=eq.${accountId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['intranet-feed', accountId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, queryClient]);

  const createPost = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!accountId || !user) throw new Error('No organization or user');
      
      const { data, error } = await supabase
        .from('intranet_posts')
        .insert({
          account_id: accountId,
          created_by: user.id,
          ...input,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Send notification to Discord (fire and forget)
      try {
        const orgName = currentOrganization?.name || 'Organização';
        supabase.functions.invoke('notify-discord-intranet', {
          body: {
            post_id: data.id,
            title: input.title,
            content: input.content,
            post_type: input.post_type,
            account_name: orgName,
          },
        });
      } catch (discordError) {
        console.warn('Failed to send Discord notification:', discordError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intranet-feed', accountId] });
      toast.success('Post publicado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar post: ${error.message}`);
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...input }: Partial<IntranetPost> & { id: string }) => {
      const { data, error } = await supabase
        .from('intranet_posts')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intranet-feed', accountId] });
      toast.success('Post atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar post: ${error.message}`);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('intranet_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intranet-feed', accountId] });
      toast.success('Post removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover post: ${error.message}`);
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('intranet_posts')
        .update({ is_pinned })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intranet-feed', accountId] });
    },
  });

  return {
    posts: feedQuery.data ?? [],
    isLoading: feedQuery.isLoading,
    error: feedQuery.error,
    createPost,
    updatePost,
    deletePost,
    togglePin,
    refetch: feedQuery.refetch,
  };
}
