import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CrossMatchStatus = "pending" | "aprovado" | "rejeitado" | "imported";

export interface CrossMatchSuggestion {
  id: string;
  account_id: string;
  source_candidate_id: string | null;
  source_job_id: string | null;
  suggested_job_id: string | null;
  match_score: number;
  reasoning: string | null;
  status: CrossMatchStatus;
  nota_recrutador: string | null;
  rejeitado_motivo: string | null;
  imported_to_job_id: string | null;
  imported_at: string | null;
  created_at: string;
  candidate?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
    linkedin_url: string | null;
  } | null;
  source_job?: {
    id: string;
    title: string;
  } | null;
  suggested_job?: {
    id: string;
    title: string;
    location: string | null;
    cliente_id: string | null;
  } | null;
}

export interface CrossMatchFilters {
  jobId?: string | null;
  status?: CrossMatchStatus | "all";
  minScore?: number;
}

export function useCrossMatchSuggestions(accountId: string | undefined, filters: CrossMatchFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["cross-match-suggestions", accountId, filters],
    queryFn: async () => {
      if (!accountId) return [] as CrossMatchSuggestion[];

      let q = supabase
        .from("recruitment_cross_match_suggestions")
        .select(`
          id, account_id, source_candidate_id, source_job_id, suggested_job_id,
          match_score, reasoning, status, nota_recrutador, rejeitado_motivo,
          imported_to_job_id, imported_at, created_at,
          candidate:source_candidate_id (id, first_name, last_name, email, avatar_url, linkedin_url),
          source_job:source_job_id (id, title),
          suggested_job:suggested_job_id (id, title, location, cliente_id)
        `)
        .eq("account_id", accountId)
        .order("match_score", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.jobId) q = q.eq("suggested_job_id", filters.jobId);
      if (typeof filters.minScore === "number") q = q.gte("match_score", filters.minScore);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CrossMatchSuggestion[];
    },
    enabled: !!accountId,
  });

  const forwardMutation = useMutation({
    mutationFn: async ({ suggestionId, note }: { suggestionId: string; note?: string }) => {
      const { data, error } = await supabase
        .from("recruitment_cross_match_suggestions")
        .update({
          status: "aprovado",
          nota_recrutador: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", suggestionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidato encaminhado");
      queryClient.invalidateQueries({ queryKey: ["cross-match-suggestions"] });
    },
    onError: (e: any) => toast.error(`Erro ao encaminhar: ${e.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ suggestionId, reason }: { suggestionId: string; reason?: string }) => {
      const { error } = await supabase
        .from("recruitment_cross_match_suggestions")
        .update({
          status: "rejeitado",
          rejeitado_motivo: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sugestão ignorada");
      queryClient.invalidateQueries({ queryKey: ["cross-match-suggestions"] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const stats = (() => {
    const list = query.data || [];
    const pending = list.filter((s) => s.status === "pending").length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const reused = list.filter(
      (s) => (s.status === "aprovado" || s.status === "imported") && new Date(s.created_at) >= monthStart,
    ).length;
    const benefitedJobs = new Set(list.filter((s) => s.suggested_job_id).map((s) => s.suggested_job_id)).size;
    const handled = list.filter((s) => s.status !== "pending").length;
    const approved = list.filter((s) => s.status === "aprovado" || s.status === "imported").length;
    const rate = handled > 0 ? Math.round((approved / handled) * 100) : 0;
    return { pending, reused, benefitedJobs, rate };
  })();

  return {
    suggestions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    stats,
    forward: forwardMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    isForwarding: forwardMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
