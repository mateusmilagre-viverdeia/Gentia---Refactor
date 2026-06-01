import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";

interface RetranscribeResult {
  success: boolean;
  responsesExtracted: number;
  transcriptionLength: number;
  score: number | null;
  recommendation: string | null;
}

export function useRetranscribeCultureInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await invokeAuthenticatedFunction<RetranscribeResult>(
        "retranscribe-culture-interview",
        { sessionId }
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      const scoreMsg = data?.score != null ? ` Score: ${data.score.toFixed(1)}%` : "";
      toast.success(
        `Retranscrição concluída! ${data?.responsesExtracted} respostas extraídas.${scoreMsg}`
      );
      queryClient.invalidateQueries({ queryKey: ["culture-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-details"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-interviews-modal"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao retranscrever: ${error.message}`);
    },
  });
}
