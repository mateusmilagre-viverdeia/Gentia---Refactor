import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { RECRUITMENT_SESSIONS_KEY } from "@/hooks/useRecruitmentSessions";
import { toast } from "sonner";

interface ReprocessResult {
  success: boolean;
  score: number;
  recommendation: string;
  criteriaCount: number;
}

function mapReprocessError(raw: string): string {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("permission_denied") || lower.includes("permissão"))
    return "Você não tem permissão para reprocessar esta avaliação.";
  if (lower.includes("payment") || lower.includes("402") || lower.includes("créditos"))
    return "Créditos de IA esgotados. Adicione créditos para reprocessar.";
  if (lower.includes("rate") || lower.includes("429"))
    return "Limite de uso da IA atingido. Tente novamente em instantes.";
  if (lower.includes("evaluationfailed") || lower.includes("ambos os modelos"))
    return "A IA não conseguiu avaliar agora. Tente reprocessar em alguns minutos.";
  if (lower.includes("no responses") || lower.includes("no criteria") || lower.includes("no cultural agent"))
    return "Dados insuficientes para reprocessar esta entrevista.";
  return raw || "Não foi possível reprocessar a avaliação.";
}

export function useReprocessCultureEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await invokeAuthenticatedFunction<ReprocessResult>(
        "reprocess-culture-evaluation",
        { sessionId }
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Avaliação reprocessada com sucesso! Novo score: ${data?.score?.toFixed(1)}%`
      );
      queryClient.invalidateQueries({ queryKey: ["culture-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-details"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: [RECRUITMENT_SESSIONS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(mapReprocessError(error.message));
    },
  });
}
