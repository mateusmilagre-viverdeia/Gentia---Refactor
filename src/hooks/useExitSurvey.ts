import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OffboardingCase,
  OffboardingSurveyToken,
  SubmitExitSurveyInput,
} from "@/types/offboarding.types";

const CASES_KEY = "offboarding-cases";

interface SurveyData {
  case: OffboardingCase;
  token: OffboardingSurveyToken;
}

// Validate token and get survey data (public access)
export const useValidateSurveyToken = (token: string | undefined) => {
  return useQuery({
    queryKey: ["exit-survey", token],
    queryFn: async (): Promise<SurveyData | null> => {
      if (!token) return null;

      // Get token data (using anon key for public access)
      const { data: tokenData, error: tokenError } = await supabase
        .from("offboarding_survey_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (tokenError) throw tokenError;
      if (!tokenData) return null;

      // Check if token is valid
      const isExpired = new Date(tokenData.expires_at) < new Date();
      const isUsed = !!tokenData.used_at;

      if (isExpired || isUsed) {
        return null;
      }

      // Get case data
      const { data: caseData, error: caseError } = await supabase
        .from("offboarding_cases")
        .select("*")
        .eq("id", tokenData.case_id)
        .single();

      if (caseError) throw caseError;

      return {
        case: caseData as unknown as OffboardingCase,
        token: tokenData as unknown as OffboardingSurveyToken,
      };
    },
    enabled: !!token,
    retry: false,
  });
};

// Submit survey response
export const useSubmitExitSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      caseId,
      responses,
    }: {
      token: string;
      caseId: string;
      responses: {
        primary_exit_reason: string;
        secondary_reasons: string[];
        avoidability_score: number;
        recommend_score: number;
        leadership_score: number;
        growth_score: number;
        workload_score: number;
        compensation_score: number;
        additional_comments: string;
      };
    }) => {
      // Insert survey response
      const { error: responseError } = await supabase
        .from("offboarding_survey_responses")
        .insert({
          case_id: caseId,
          primary_reason: responses.primary_exit_reason,
          secondary_reasons: responses.secondary_reasons || [],
          avoidability_score: responses.avoidability_score,
          enps_score: responses.recommend_score,
          leadership_rating: responses.leadership_score,
          growth_rating: responses.growth_score,
          workload_rating: responses.workload_score,
          compensation_rating: responses.compensation_score,
          additional_comments: responses.additional_comments || null,
        });

      if (responseError) throw responseError;

      // Mark token as used
      const { error: tokenError } = await supabase
        .from("offboarding_survey_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      if (tokenError) throw tokenError;

      // Update case survey status
      const { error: caseError } = await supabase
        .from("offboarding_cases")
        .update({
          survey_status: "responded",
          survey_responded_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      if (caseError) throw caseError;

      // Mark survey task as completed
      const { error: taskError } = await supabase
        .from("offboarding_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("case_id", caseId)
        .eq("task_type", "survey");

      if (taskError) {
        console.error("Error marking survey task as complete:", taskError);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["exit-survey"] });
    },
    onError: (error) => {
      console.error("Error submitting survey:", error);
      toast.error("Erro ao enviar pesquisa. Tente novamente.");
    },
  });
};

export const useExitSurvey = () => {
  const queryClient = useQueryClient();

  // Legacy method - kept for backwards compatibility
  const validateSurveyToken = (token: string | undefined) => {
    return useQuery({
      queryKey: ["exit-survey", token],
      queryFn: async (): Promise<SurveyData | null> => {
        if (!token) return null;

        // Get token data (using anon key for public access)
        const { data: tokenData, error: tokenError } = await supabase
          .from("offboarding_survey_tokens")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (tokenError) throw tokenError;
        if (!tokenData) return null;

        // Check if token is valid
        const isExpired = new Date(tokenData.expires_at) < new Date();
        const isUsed = !!tokenData.used_at;

        if (isExpired || isUsed) {
          return null;
        }

        // Get case data
        const { data: caseData, error: caseError } = await supabase
          .from("offboarding_cases")
          .select("*")
          .eq("id", tokenData.case_id)
          .single();

        if (caseError) throw caseError;

        return {
          case: caseData as unknown as OffboardingCase,
          token: tokenData as unknown as OffboardingSurveyToken,
        };
      },
      enabled: !!token,
      retry: false,
    });
  };

  // Submit survey response
  const submitSurvey = useMutation({
    mutationFn: async ({
      token,
      ...input
    }: SubmitExitSurveyInput & { token: string }) => {
      // Insert survey response
      const { error: responseError } = await supabase
        .from("offboarding_survey_responses")
        .insert({
          case_id: input.case_id,
          primary_reason: input.primary_reason,
          secondary_reasons: input.secondary_reasons || [],
          avoidability_score: input.avoidability_score,
          enps_score: input.enps_score,
          leadership_rating: input.leadership_rating,
          growth_rating: input.growth_rating,
          workload_rating: input.workload_rating,
          compensation_rating: input.compensation_rating,
          additional_comments: input.additional_comments || null,
        });

      if (responseError) throw responseError;

      // Mark token as used
      const { error: tokenError } = await supabase
        .from("offboarding_survey_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      if (tokenError) throw tokenError;

      // Update case survey status
      const { error: caseError } = await supabase
        .from("offboarding_cases")
        .update({
          survey_status: "responded",
          survey_responded_at: new Date().toISOString(),
        })
        .eq("id", input.case_id);

      if (caseError) throw caseError;

      // Mark survey task as completed
      const { error: taskError } = await supabase
        .from("offboarding_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("case_id", input.case_id)
        .eq("task_type", "survey");

      if (taskError) {
        console.error("Error marking survey task as complete:", taskError);
        // Don't fail the whole submission if task update fails
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["exit-survey"] });
    },
    onError: (error) => {
      console.error("Error submitting survey:", error);
      toast.error("Erro ao enviar pesquisa. Tente novamente.");
    },
  });

  return {
    useValidateSurveyToken,
    submitSurvey,
  };
};
