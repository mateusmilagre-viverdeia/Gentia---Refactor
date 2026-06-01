import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";

export type ResetStepType = "cultural" | "disc" | "technical";

interface ResetCandidateStepParams {
  candidateId: string;
  jobId: string;
  applicationId: string;
  stepType: ResetStepType;
}

export function useResetCandidateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResetCandidateStepParams) => {
      const { data, error } = await invokeAuthenticatedFunction("reset-candidate-step", {
        candidateId: params.candidateId,
        jobId: params.jobId,
        applicationId: params.applicationId,
        stepType: params.stepType,
      });

      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (_data, variables) => {
      const stepLabels: Record<ResetStepType, string> = {
        cultural: "Fit Cultural",
        disc: "Fit Comportamental",
        technical: "Fit Técnico",
      };
      toast.success(`Etapa "${stepLabels[variables.stepType]}" liberada para o candidato refazer.`);
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-details"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-kanban"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar etapa: ${error.message}`);
    },
  });
}
