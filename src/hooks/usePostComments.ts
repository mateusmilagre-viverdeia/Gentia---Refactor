import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  replies?: PostComment[];
}

export function usePostComments(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Fetch author info for each comment
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = new Map((profiles as any[])?.map(p => [p.id, {
        full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Usuário',
        avatar_url: null,
      }]) || []);

      // Build comment tree
      const comments: PostComment[] = data.map(c => ({
        ...c,
        author: profileMap.get(c.user_id) || { full_name: 'Usuário', avatar_url: null },
        replies: [],
      }));

      // Organize into tree structure
      const rootComments: PostComment[] = [];
      const commentMap = new Map(comments.map(c => [c.id, c]));

      comments.forEach(comment => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      return rootComments;
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      toast.success('Comentário adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao comentar: ${error.message}`);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      toast.success('Comentário removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    addComment,
    deleteComment,
  };
}
