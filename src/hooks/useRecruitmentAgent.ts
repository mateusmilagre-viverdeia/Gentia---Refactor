import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentQuestion {
  id: string;
  order: number;
  content: string;
}

export interface AgentCriterion {
  id: string;
  name: string;
  description: string;
  excellenceDescription: string;
  warningSignsDescription: string;
  minimumScore: number;
  importance: "minor" | "moderate" | "important" | "very_important" | "critical";
  weight: number;
  color: string;
}

export interface RecruitmentAgent {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  type: "structured" | "adaptive" | "disc";
  language: string;
  minimumScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  questions: AgentQuestion[];
  criteria: AgentCriterion[];
  settings?: Record<string, unknown>;
}

function coerceNumber(value: unknown, fallback: number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function useRecruitmentAgent(agentId: string | undefined) {
  const queryClient = useQueryClient();

  const agentQuery = useQuery({
    queryKey: ["recruitment-agent", agentId],
    queryFn: async (): Promise<RecruitmentAgent | null> => {
      if (!agentId) return null;

      // Fetch agent
      const { data: agent, error: agentError } = await supabase
        .from("recruitment_agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (agentError) {
        console.error("Error fetching agent:", agentError);
        throw agentError;
      }

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from("recruitment_agent_questions")
        .select("*")
        .eq("agent_id", agentId)
        .order("position", { ascending: true });

      if (questionsError) {
        console.error("Error fetching questions:", questionsError);
      }

      // Fetch criteria
      const { data: criteria, error: criteriaError } = await supabase
        .from("recruitment_agent_criteria")
        .select("*")
        .eq("agent_id", agentId)
        .order("weight", { ascending: false });

      if (criteriaError) {
        console.error("Error fetching criteria:", criteriaError);
      }

      return {
        id: agent.id,
        accountId: agent.account_id,
        name: agent.name,
        description: agent.description,
        type: agent.type as "structured" | "adaptive" | "disc",
        language: agent.language,
        minimumScore: coerceNumber(agent.minimum_score, 7),
        isActive: agent.is_active,
        createdAt: new Date(agent.created_at),
        updatedAt: new Date(agent.updated_at),
        settings: ((agent as Record<string, unknown>).settings as Record<string, unknown>) ?? undefined,
        questions: (questions ?? []).map((q) => ({
          id: q.id,
          order: q.position,
          content: q.question_text,
        })),
        criteria: (criteria ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? "",
          excellenceDescription: c.excellence_description ?? "",
          warningSignsDescription: c.warning_signs_description ?? "",
           minimumScore: coerceNumber(c.minimum_score, 5),
          importance: c.importance as AgentCriterion["importance"],
          weight: c.weight ?? 1,
          color: c.color ?? "gray",
        })),
      };
    },
    enabled: !!agentId,
  });

  const saveMinimumScoreMutation = useMutation({
    mutationFn: async (minimumScore: number) => {
      if (!agentId) throw new Error("Agent ID is required");

      const normalized = Math.round(Math.min(10, Math.max(0, minimumScore)) * 10) / 10;

      const { error } = await supabase
        .from("recruitment_agents")
        .update({ minimum_score: normalized })
        .eq("id", agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agent", agentId] });
      toast.success("Nota mínima geral salva com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving minimum score:", error);
      toast.error("Erro ao salvar nota mínima geral");
    },
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: async (questions: AgentQuestion[]) => {
      if (!agentId) throw new Error("Agent ID is required");

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from("recruitment_agent_questions")
        .delete()
        .eq("agent_id", agentId);

      if (deleteError) throw deleteError;

      // Insert new questions
      if (questions.length > 0) {
        const { error: insertError } = await supabase
          .from("recruitment_agent_questions")
          .insert(
            questions.map((q, idx) => ({
              agent_id: agentId,
              question_text: q.content,
              position: idx + 1,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agent", agentId] });
      toast.success("Perguntas salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving questions:", error);
      toast.error("Erro ao salvar perguntas");
    },
  });

  const saveCriteriaMutation = useMutation({
    mutationFn: async (criteria: AgentCriterion[]) => {
      if (!agentId) throw new Error("Agent ID is required");

      // Delete existing criteria
      const { error: deleteError } = await supabase
        .from("recruitment_agent_criteria")
        .delete()
        .eq("agent_id", agentId);

      if (deleteError) throw deleteError;

      // Insert new criteria
      if (criteria.length > 0) {
        const { error: insertError } = await supabase
          .from("recruitment_agent_criteria")
          .insert(
            criteria.map((c) => ({
              agent_id: agentId,
              name: c.name,
              description: c.description,
              excellence_description: c.excellenceDescription,
              warning_signs_description: c.warningSignsDescription,
              minimum_score: c.minimumScore,
              importance: c.importance,
              weight: c.weight,
              color: c.color,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agent", agentId] });
      toast.success("Critérios salvos com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving criteria:", error);
      toast.error("Erro ao salvar critérios");
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Record<string, unknown>) => {
      if (!agentId) throw new Error("Agent ID is required");

      const { error } = await supabase
        .from("recruitment_agents")
        .update({ settings: newSettings as any })
        .eq("id", agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agent", agentId] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    agent: agentQuery.data,
    isLoading: agentQuery.isLoading,
    error: agentQuery.error,
    saveQuestions: saveQuestionsMutation.mutate,
    saveCriteria: saveCriteriaMutation.mutate,
    saveMinimumScore: saveMinimumScoreMutation.mutate,
    saveSettings: saveSettingsMutation.mutate,
    isSaving:
      saveQuestionsMutation.isPending ||
      saveCriteriaMutation.isPending ||
      saveMinimumScoreMutation.isPending ||
      saveSettingsMutation.isPending,
  };
}

// Hook to get questions for a job's agent
export function useJobAgentQuestions(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-agent-questions", jobId],
    queryFn: async () => {
      if (!jobId) return [];

      // First get the job to find the agent_id
      const { data: job, error: jobError } = await supabase
        .from("recruitment_jobs")
        .select("agent_id")
        .eq("id", jobId)
        .single();

      if (jobError || !job?.agent_id) {
        console.log("No agent linked to job:", jobId);
        return [];
      }

      // Then get questions for that agent
      const { data: questions, error: questionsError } = await supabase
        .from("recruitment_agent_questions")
        .select("*")
        .eq("agent_id", job.agent_id)
        .order("position", { ascending: true });

      if (questionsError) {
        console.error("Error fetching agent questions:", questionsError);
        return [];
      }

      return questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        position: q.position,
      }));
    },
    enabled: !!jobId,
  });
}
