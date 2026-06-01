import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JobNote {
  id: string;
  account_id: string;
  job_id: string;
  author_id: string | null;
  note_type: string;
  content: string;
  metadata: any;
  created_at: string;
}

export function useJobNotes(jobId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["job-notes", jobId],
    queryFn: async () => {
      if (!jobId) return [] as JobNote[];
      const { data, error } = await (supabase as any)
        .from("recruitment_job_notes")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as JobNote[];
    },
    enabled: !!jobId,
  });

  const add = useMutation({
    mutationFn: async (input: { accountId: string; content: string; noteType?: string; metadata?: any }) => {
      if (!jobId) throw new Error("jobId is required");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("recruitment_job_notes")
        .insert({
          account_id: input.accountId,
          job_id: jobId,
          author_id: user?.id ?? null,
          note_type: input.noteType ?? "manual",
          content: input.content,
          metadata: input.metadata ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as JobNote;
    },
    onSuccess: () => {
      toast.success("Nota adicionada");
      queryClient.invalidateQueries({ queryKey: ["job-notes", jobId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  return {
    notes: query.data || [],
    isLoading: query.isLoading,
    add: add.mutateAsync,
    isAdding: add.isPending,
  };
}
