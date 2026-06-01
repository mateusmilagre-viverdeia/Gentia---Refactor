import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReactionType = 'like' | 'celebrate' | 'support';

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionCounts {
  like: number;
  celebrate: number;
  support: number;
}

export function usePostReactions(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all reactions for this post
  const reactionsQuery = useQuery({
    queryKey: ['post-reactions', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId);
      
      if (error) throw error;
      return data as PostReaction[];
    },
    enabled: !!postId,
  });

  // Calculate counts
  const counts: ReactionCounts = {
    like: reactionsQuery.data?.filter(r => r.reaction_type === 'like').length ?? 0,
    celebrate: reactionsQuery.data?.filter(r => r.reaction_type === 'celebrate').length ?? 0,
    support: reactionsQuery.data?.filter(r => r.reaction_type === 'support').length ?? 0,
  };

  // Check which reactions the current user has
  const userReactions = reactionsQuery.data?.filter(r => r.user_id === user?.id) ?? [];
  const hasReacted = (type: ReactionType) => userReactions.some(r => r.reaction_type === type);

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async (type: ReactionType) => {
      if (!user) throw new Error('User not authenticated');
      
      const existingReaction = userReactions.find(r => r.reaction_type === type);
      
      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);
        
        if (error) throw error;
        return { action: 'removed', type };
      } else {
        // Add reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: type,
          });
        
        if (error) throw error;
        return { action: 'added', type };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
    },
  });

  return {
    reactions: reactionsQuery.data ?? [],
    counts,
    hasReacted,
    toggleReaction,
    isLoading: reactionsQuery.isLoading,
  };
}
