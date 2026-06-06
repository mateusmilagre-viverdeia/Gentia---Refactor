import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Toda leitura/escrita do portal passa pela edge function `portal-data`, que valida
// o TOKEN no servidor e escopa tudo por `cliente_id`/`account_id` do token (service_role).
// Não há mais acesso anônimo direto às tabelas (que vazava PII). Os hooks recebem o
// TOKEN (não o clienteId) — o servidor é a única fonte de verdade do escopo.
async function invokePortal<T = unknown>(token: string, resource: string, params?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("portal-data", {
    body: { token, resource, params },
  });
  if (error) throw error;
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const usePortalJobs = (token: string | undefined) => {
  return useQuery({
    queryKey: ["portal-jobs", token],
    queryFn: () => invokePortal<any[]>(token!, "jobs"),
    enabled: !!token,
  });
};

export const usePortalCandidates = (token: string | undefined) => {
  return useQuery({
    queryKey: ["portal-candidates", token],
    queryFn: () => invokePortal<any[]>(token!, "candidates"),
    enabled: !!token,
  });
};

export const usePortalShortlist = (token: string | undefined, jobId: string | undefined) => {
  return useQuery({
    queryKey: ["portal-shortlist", token, jobId],
    queryFn: () => invokePortal<any[]>(token!, "shortlist", { jobId }),
    enabled: !!token && !!jobId,
  });
};

export const usePortalFeedbacks = (token: string | undefined) => {
  return useQuery({
    queryKey: ["portal-feedbacks", token],
    queryFn: () => invokePortal<any[]>(token!, "feedbacks"),
    enabled: !!token,
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // account_id/cliente_id/contato_id NÃO vêm do client — o servidor deriva do token.
    mutationFn: async (feedback: {
      token: string;
      vaga_id: string;
      candidato_id: string;
      decisao: string;
      motivo?: string;
      nota?: number;
    }) => {
      const { token, ...params } = feedback;
      return invokePortal(token, "submit_feedback", params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal-feedbacks", variables.token] });
      queryClient.invalidateQueries({ queryKey: ["portal-shortlist"] });
      toast.success("Feedback enviado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao enviar feedback");
    },
  });
};
