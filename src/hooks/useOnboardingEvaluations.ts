import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OnboardingEvaluation,
  CreateOnboardingEvaluationInput,
} from "@/types/onboarding.types";

const PROCESSES_KEY = "onboarding-processes";

export const useOnboardingEvaluations = () => {
  const queryClient = useQueryClient();

  // Create evaluation
  const createEvaluation = useMutation({
    mutationFn: async (input: CreateOnboardingEvaluationInput) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("onboarding_evaluations")
        .insert({
          ...input,
          evaluator_id: input.evaluator_id || userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingEvaluation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, data.process_id] });
      toast.success("Avaliação registrada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating evaluation:", error);
      toast.error("Erro ao registrar avaliação");
    },
  });

  // Update evaluation
  const updateEvaluation = useMutation({
    mutationFn: async ({
      id,
      processId,
      ...input
    }: Partial<OnboardingEvaluation> & { id: string; processId: string }) => {
      const { data, error } = await supabase
        .from("onboarding_evaluations")
        .update({
          ...input,
          evaluated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { evaluation: data as OnboardingEvaluation, processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
      toast.success("Avaliação atualizada");
    },
    onError: (error) => {
      console.error("Error updating evaluation:", error);
      toast.error("Erro ao atualizar avaliação");
    },
  });

  return {
    createEvaluation,
    updateEvaluation,
  };
};
