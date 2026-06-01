import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

interface ValuesQuestion {
  id: string;
  stage_number: number;
  value_label: string | null;
  question_text: string;
  position: number | null;
}

interface ValuesQuestionsStats {
  total: number;
  byStage: {
    initial: number;      // stage 1
    wildcardInitial: number; // stage 2
    byValue: number;      // stage 3
    wildcardFinal: number;   // stage 4
  };
}

interface ValueBehavior {
  value_label: string;
  do_selected: string[];
  dont_selected: string[];
}

interface ValuesStats {
  total: number;
}

const CRITERIA_COLORS = [
  "blue", "red", "green", "yellow", "purple", 
  "pink", "orange", "teal", "indigo", "cyan"
];

export function useValuesQuestionsForAgent() {
  const { account } = useAccount();

  // Query for questions (existing functionality)
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["values-questions-for-agent", account?.id],
    queryFn: async () => {
      if (!account?.id) return null;

      // First get the session for this account
      const { data: session, error: sessionError } = await supabase
        .from("values_questions_sessions")
        .select("id, stage, updated_at")
        .eq("account_id", account.id)
        .maybeSingle();

      if (sessionError) {
        console.error("Error fetching values session:", sessionError);
        return null;
      }

      if (!session) {
        return null;
      }

      // Get all questions for this session
      const { data: questions, error: questionsError } = await supabase
        .from("values_questions_items")
        .select("id, stage_number, value_label, question_text, position")
        .eq("session_id", session.id)
        .order("stage_number", { ascending: true })
        .order("position", { ascending: true });

      if (questionsError) {
        console.error("Error fetching values questions:", questionsError);
        return null;
      }

      return {
        sessionId: session.id,
        sessionStage: session.stage,
        sessionUpdatedAt: session.updated_at as string | null,
        questions: questions as ValuesQuestion[],
      };
    },
    enabled: !!account?.id,
  });

  // Query for values/behaviors (new functionality)
  const { data: valuesData, isLoading: isLoadingValues } = useQuery({
    queryKey: ["values-behaviors-for-agent", account?.id],
    queryFn: async () => {
      if (!account?.id) return null;

      // Get the values session for this account
      const { data: session, error: sessionError } = await supabase
        .from("values_sessions")
        .select("id")
        .eq("account_id", account.id)
        .maybeSingle();

      if (sessionError) {
        console.error("Error fetching values session:", sessionError);
        return null;
      }

      if (!session) {
        return null;
      }

      // Get all behavior selections for this session
      const { data: behaviors, error: behaviorsError } = await supabase
        .from("values_behaviors_selections")
        .select("value_label, do_selected, dont_selected")
        .eq("session_id", session.id);

      if (behaviorsError) {
        console.error("Error fetching values behaviors:", behaviorsError);
        return null;
      }

      return {
        sessionId: session.id,
        values: behaviors as ValueBehavior[],
      };
    },
    enabled: !!account?.id,
  });

  const hasQuestions = (questionsData?.questions?.length ?? 0) > 0;
  const hasValues = (valuesData?.values?.length ?? 0) > 0;
  
  const stats: ValuesQuestionsStats = {
    total: questionsData?.questions?.length ?? 0,
    byStage: {
      initial: questionsData?.questions?.filter(q => q.stage_number === 1).length ?? 0,
      wildcardInitial: questionsData?.questions?.filter(q => q.stage_number === 2).length ?? 0,
      byValue: questionsData?.questions?.filter(q => q.stage_number === 3).length ?? 0,
      wildcardFinal: questionsData?.questions?.filter(q => q.stage_number === 4).length ?? 0,
    },
  };

  const valuesStats: ValuesStats = {
    total: valuesData?.values?.length ?? 0,
  };

  const formatBehaviorsAsBullets = (behaviors: string[]): string => {
    return behaviors.map(b => `• ${b}`).join('\n');
  };

  const importQuestionsToAgent = async (agentId: string): Promise<number> => {
    if (!questionsData?.questions || questionsData.questions.length === 0) {
      return 0;
    }

    // Prepare questions for insertion, maintaining order
    const questionsToInsert = questionsData.questions.map((q, index) => ({
      agent_id: agentId,
      question_text: q.question_text,
      position: index + 1,
    }));

    const { error } = await supabase
      .from("recruitment_agent_questions")
      .insert(questionsToInsert);

    if (error) {
      console.error("Error importing questions:", error);
      throw error;
    }

    // Stamp the agent so we know when it was last synced
    await supabase
      .from("recruitment_agents")
      .update({ last_values_sync_at: new Date().toISOString() })
      .eq("id", agentId);

    return questionsToInsert.length;
  };

  /**
   * Re-sync values questions into an existing agent.
   * Uses delete-then-insert pattern (per project memory) to fully replace
   * the agent's question list with the current values questions.
   */
  const syncQuestionsToAgent = async (agentId: string): Promise<number> => {
    if (!questionsData?.questions) {
      return 0;
    }

    // Delete existing questions for this agent
    const { error: deleteError } = await supabase
      .from("recruitment_agent_questions")
      .delete()
      .eq("agent_id", agentId);

    if (deleteError) {
      console.error("Error deleting existing questions:", deleteError);
      throw deleteError;
    }

    // Insert fresh values questions
    if (questionsData.questions.length > 0) {
      const questionsToInsert = questionsData.questions.map((q, index) => ({
        agent_id: agentId,
        question_text: q.question_text,
        position: index + 1,
      }));

      const { error: insertError } = await supabase
        .from("recruitment_agent_questions")
        .insert(questionsToInsert);

      if (insertError) {
        console.error("Error inserting synced questions:", insertError);
        throw insertError;
      }
    }

    // Stamp the agent
    await supabase
      .from("recruitment_agents")
      .update({ last_values_sync_at: new Date().toISOString() })
      .eq("id", agentId);

    return questionsData.questions.length;
  };

  const importCriteriaToAgent = async (agentId: string): Promise<number> => {
    if (!valuesData?.values || valuesData.values.length === 0) {
      return 0;
    }

    // Prepare criteria for insertion
    const criteriaToInsert = valuesData.values.map((v, index) => ({
      agent_id: agentId,
      name: v.value_label,
      description: `Avaliação do alinhamento com o valor "${v.value_label}"`,
      excellence_description: formatBehaviorsAsBullets(v.do_selected),
      warning_signs_description: formatBehaviorsAsBullets(v.dont_selected),
      minimum_score: 7,
      importance: "important", // x3
      weight: 3,
      color: CRITERIA_COLORS[index % CRITERIA_COLORS.length],
    }));

    const { error } = await supabase
      .from("recruitment_agent_criteria")
      .insert(criteriaToInsert);

    if (error) {
      console.error("Error importing criteria:", error);
      throw error;
    }

    return criteriaToInsert.length;
  };

  return {
    // Questions
    hasQuestions,
    stats,
    questions: questionsData?.questions ?? [],
    valuesSessionUpdatedAt: questionsData?.sessionUpdatedAt ?? null,
    importQuestionsToAgent,
    syncQuestionsToAgent,
    
    // Values/Criteria
    hasValues,
    valuesStats,
    values: valuesData?.values ?? [],
    importCriteriaToAgent,
    
    isLoading: isLoadingQuestions || isLoadingValues,
  };
}
