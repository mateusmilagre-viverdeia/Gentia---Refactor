import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

export interface RecruitmentNote {
  id: string;
  account_id: string;
  candidate_id: string;
  application_id: string | null;
  content: string;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export function useRecruitmentNotes(candidateId: string | null) {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["recruitment-notes", candidateId, currentAccount?.id],
    queryFn: async () => {
      if (!candidateId || !currentAccount?.id) return [];

      const { data, error } = await supabase
        .from("recruitment_notes")
        .select(`
          *,
          author:profiles!recruitment_notes_created_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq("candidate_id", candidateId)
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RecruitmentNote[];
    },
    enabled: !!candidateId && !!currentAccount?.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({
      candidateId,
      content,
      isPrivate = false,
      applicationId,
    }: {
      candidateId: string;
      content: string;
      isPrivate?: boolean;
      applicationId?: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("recruitment_notes")
        .insert({
          account_id: currentAccount.id,
          candidate_id: candidateId,
          application_id: applicationId || null,
          content,
          is_private: isPrivate,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Register activity
      await supabase.from("recruitment_activities").insert({
        account_id: currentAccount.id,
        candidate_id: candidateId,
        application_id: applicationId || null,
        activity_type: "note_added",
        description: isPrivate ? "Nota privada adicionada" : "Nota adicionada ao candidato",
        created_by: userData.user.id,
        metadata: { note_id: data.id, is_private: isPrivate },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-notes"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Nota adicionada",
        description: "A nota foi salva com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      content,
    }: {
      noteId: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("recruitment_notes")
        .update({ content })
        .eq("id", noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-notes"] });
      toast({
        title: "Nota atualizada",
        description: "A nota foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("recruitment_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-notes"] });
      toast({
        title: "Nota removida",
        description: "A nota foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notes: notesQuery.data ?? [],
    isLoading: notesQuery.isLoading,
    addNote: addNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    isAdding: addNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
  };
}
