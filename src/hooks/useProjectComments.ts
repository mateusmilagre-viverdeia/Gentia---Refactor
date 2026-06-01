import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ProjectCommentEntityType = "milestone" | "checkpoint";

export interface ProjectComment {
  id: string;
  account_id: string;
  entity_type: ProjectCommentEntityType;
  entity_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
  };
  replies?: ProjectComment[];
}

export function useProjectComments(params: {
  accountId: string;
  entityType: ProjectCommentEntityType;
  entityId: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { accountId, entityType, entityId } = params;

  const queryKey = ["project-comments", accountId, entityType, entityId] as const;

  const commentsQuery = useQuery({
    queryKey,
    enabled: !!accountId && !!entityType && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_comments")
        .select("*")
        .eq("account_id", accountId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      const profileMap = new Map(
        ((profiles as any[]) ?? []).map((p) => [
          p.id,
          {
            full_name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Usuário",
          },
        ])
      );

      const comments: ProjectComment[] = (data ?? []).map((c: any) => ({
        ...c,
        author: profileMap.get(c.user_id) || { full_name: "Usuário" },
        replies: [],
      }));

      const rootComments: ProjectComment[] = [];
      const commentMap = new Map(comments.map((c) => [c.id, c]));

      comments.forEach((comment) => {
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
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Comentário vazio");

      const { data, error } = await supabase
        .from("project_comments")
        .insert({
          account_id: accountId,
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          parent_id: parentId || null,
          content: trimmed,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Comentário enviado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao comentar: ${error.message}`);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("project_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Comentário removido");
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
