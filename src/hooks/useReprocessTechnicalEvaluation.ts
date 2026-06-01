import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";

interface ReprocessTechnicalResult {
  success: boolean;
  score: number;
  recommendation: string;
  skillsCount: number;
  eliminators?: string[];
}

function mapReprocessError(raw: string): string {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("permission_denied") || lower.includes("permissão"))
    return "Você não tem permissão para reprocessar esta avaliação.";
  if (lower.includes("no_transcript"))
    return "Sessão sem transcrição para reavaliar.";
  if (lower.includes("evaluation_failed"))
    return "A IA não conseguiu avaliar agora. Tente novamente em alguns minutos.";
  if (lower.includes("rate") || lower.includes("429"))
    return "Limite de uso da IA atingido. Tente novamente em instantes.";
  return raw || "Não foi possível reprocessar a avaliação técnica.";
}

export function useReprocessTechnicalEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await invokeAuthenticatedFunction<ReprocessTechnicalResult>(
        "reprocess-technical-evaluation",
        { sessionId }
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Avaliação técnica reprocessada! Novo score: ${data?.score?.toFixed(0)} · ${data?.recommendation}`
      );
      queryClient.invalidateQueries({ queryKey: ["technical-interview-details"] });
      queryClient.invalidateQueries({ queryKey: ["technical-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-details"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
    onError: (error: Error) => {
      toast.error(mapReprocessError(error.message));
    },
  });
}
