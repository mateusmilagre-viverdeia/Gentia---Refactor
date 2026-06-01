import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";

export function useShortlistReports(jobId: string) {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ["shortlist-reports", jobId, currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id || !jobId) return [];
      const { data, error } = await supabase
        .from("shortlist_relatorios")
        .select("*")
        .eq("vaga_id", jobId)
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAccount?.id && !!jobId,
  });

  const generateReport = useMutation({
    mutationFn: async (params: {
      candidate_ids: string[];
      custom_message?: string;
      titulo?: string;
      show_scores?: boolean;
      show_transcripts?: boolean;
      show_contact?: boolean;
    }) => {
      const result = await invokeAuthenticatedFunction<{
        id: string;
        token_publico: string;
        conteudo_json: any;
      }>("generate-shortlist-report", {
        job_id: jobId,
        ...params,
      });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlist-reports", jobId] });
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao gerar relatório");
    },
  });

  return { reports: reportsQuery.data || [], isLoading: reportsQuery.isLoading, generateReport };
}

export function usePublicReport(token: string | undefined) {
  return useQuery({
    queryKey: ["public-report", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from("shortlist_relatorios")
        .select("*")
        .eq("token_publico", token)
        .single();
      if (error) throw error;

      // Increment views
      if (data) {
        await supabase
          .from("shortlist_relatorios")
          .update({ visualizacoes: (data.visualizacoes || 0) + 1 })
          .eq("id", data.id);
      }

      return data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });
}
