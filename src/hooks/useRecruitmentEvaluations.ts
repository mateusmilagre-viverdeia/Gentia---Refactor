import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { weightMultipliers, ScorecardCriterion } from "./useRecruitmentScorecards";

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  criterion?: ScorecardCriterion;
}

export interface Evaluation {
  id: string;
  application_id: string;
  template_id: string | null;
  evaluator_id: string;
  stage: string;
  overall_score: number | null;
  recommendation: 'approve' | 'reject' | 'maybe' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  scores?: EvaluationScore[];
  evaluator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export function useEvaluations(applicationId: string | null) {
  return useQuery({
    queryKey: ["evaluations", applicationId],
    queryFn: async () => {
      if (!applicationId) return [];

      const { data, error } = await supabase
        .from("recruitment_evaluations")
        .select(`
          *,
          scores:recruitment_evaluation_scores(
            *,
            criterion:recruitment_scorecard_criteria(*)
          )
        `)
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch evaluator profiles separately
      const evaluatorIds = [...new Set(data.map(e => e.evaluator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", evaluatorIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, {
          id: p.id,
          full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Usuário',
          avatar_url: null,
        }]) || []
      );

      return data.map(evaluation => ({
        ...evaluation,
        evaluator: profileMap.get(evaluation.evaluator_id) || null,
      })) as Evaluation[];
    },
    enabled: !!applicationId,
  });
}

export function useEvaluationSummary(applicationId: string | null) {
  const { data: evaluations } = useEvaluations(applicationId);

  if (!evaluations || evaluations.length === 0) {
    return {
      averageScore: null,
      evaluationCount: 0,
      recommendations: { approve: 0, reject: 0, maybe: 0 },
      latestRecommendation: null,
    };
  }

  const scoresWithValues = evaluations.filter(e => e.overall_score !== null);
  const averageScore = scoresWithValues.length > 0
    ? scoresWithValues.reduce((sum, e) => sum + (e.overall_score || 0), 0) / scoresWithValues.length
    : null;

  const recommendations = evaluations.reduce(
    (acc, e) => {
      if (e.recommendation) {
        acc[e.recommendation]++;
      }
      return acc;
    },
    { approve: 0, reject: 0, maybe: 0 }
  );

  const latestEvaluation = evaluations[0];

  return {
    averageScore,
    evaluationCount: evaluations.length,
    recommendations,
    latestRecommendation: latestEvaluation?.recommendation || null,
  };
}

interface CriterionScore {
  criterionId: string;
  score: number;
  comment?: string;
}

interface SubmitEvaluationData {
  applicationId: string;
  templateId?: string;
  stage: string;
  scores: CriterionScore[];
  recommendation: 'approve' | 'reject' | 'maybe';
  notes?: string;
  criteria: ScorecardCriterion[];
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitEvaluationData) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate weighted overall score
      const totalWeight = data.criteria.reduce(
        (sum, c) => sum + weightMultipliers[c.weight],
        0
      );

      const weightedSum = data.scores.reduce((sum, score) => {
        const criterion = data.criteria.find(c => c.id === score.criterionId);
        if (!criterion) return sum;
        return sum + score.score * weightMultipliers[criterion.weight];
      }, 0);

      const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

      // Create evaluation
      const { data: evaluation, error: evalError } = await supabase
        .from("recruitment_evaluations")
        .insert({
          application_id: data.applicationId,
          template_id: data.templateId || null,
          evaluator_id: user.id,
          stage: data.stage,
          overall_score: Math.round(overallScore * 10) / 10,
          recommendation: data.recommendation,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (evalError) throw evalError;

      // Create individual scores
      if (data.scores.length > 0) {
        const scoresToInsert = data.scores.map(s => ({
          evaluation_id: evaluation.id,
          criterion_id: s.criterionId,
          score: s.score,
          comment: s.comment || null,
        }));

        const { error: scoresError } = await supabase
          .from("recruitment_evaluation_scores")
          .insert(scoresToInsert);

        if (scoresError) throw scoresError;
      }

      return evaluation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations", variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      toast.success("Avaliação enviada com sucesso!");
    },
    onError: (error) => {
      console.error("Error submitting evaluation:", error);
      toast.error("Erro ao enviar avaliação");
    },
  });
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evaluationId, applicationId }: { evaluationId: string; applicationId: string }) => {
      const { error } = await supabase
        .from("recruitment_evaluations")
        .delete()
        .eq("id", evaluationId);

      if (error) throw error;
      return { applicationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations", data.applicationId] });
      toast.success("Avaliação excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting evaluation:", error);
      toast.error("Erro ao excluir avaliação");
    },
  });
}
