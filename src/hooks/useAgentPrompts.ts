import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_EVALUATION_PROMPT,
  DEFAULT_SCORING_PROMPT,
} from "@/lib/defaultAgentPrompts";

export type PromptType = "system" | "evaluation" | "scoring";

export interface AgentPrompt {
  id: string;
  agentId: string;
  promptType: PromptType;
  name: string;
  content: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptInput {
  promptType: PromptType;
  name: string;
  content: string;
  isActive?: boolean;
}

interface DbPrompt {
  id: string;
  agent_id: string;
  prompt_type: string;
  name: string;
  content: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const getDefaultPrompt = (type: PromptType): string => {
  switch (type) {
    case "system":
      return DEFAULT_SYSTEM_PROMPT;
    case "evaluation":
      return DEFAULT_EVALUATION_PROMPT;
    case "scoring":
      return DEFAULT_SCORING_PROMPT;
    default:
      return "";
  }
};

const getDefaultName = (type: PromptType): string => {
  switch (type) {
    case "system":
      return "Prompt de Sistema";
    case "evaluation":
      return "Prompt de Avaliação";
    case "scoring":
      return "Prompt de Scoring";
    default:
      return "Prompt";
  }
};

export function useAgentPrompts(agentId: string | undefined) {
  const queryClient = useQueryClient();

  const promptsQuery = useQuery({
    queryKey: ["agent-prompts", agentId],
    queryFn: async (): Promise<AgentPrompt[]> => {
      if (!agentId) return [];

      const { data, error } = await supabase
        .from("recruitment_agent_prompts" as any)
        .select("*")
        .eq("agent_id", agentId)
        .order("prompt_type");

      if (error) {
        console.error("Error fetching agent prompts:", error);
        throw error;
      }

      return ((data as unknown as DbPrompt[]) ?? []).map((p) => ({
        id: p.id,
        agentId: p.agent_id,
        promptType: p.prompt_type as PromptType,
        name: p.name,
        content: p.content,
        isActive: p.is_active,
        version: p.version,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      }));
    },
    enabled: !!agentId,
  });

  // Get prompts with defaults filled in
  const getPromptsWithDefaults = (): Record<PromptType, AgentPrompt | null> => {
    const prompts = promptsQuery.data ?? [];
    const result: Record<PromptType, AgentPrompt | null> = {
      system: null,
      evaluation: null,
      scoring: null,
    };

    for (const type of ["system", "evaluation", "scoring"] as PromptType[]) {
      const existing = prompts.find((p) => p.promptType === type);
      if (existing) {
        result[type] = existing;
      }
    }

    return result;
  };

  const upsertPromptMutation = useMutation({
    mutationFn: async (input: PromptInput) => {
      if (!agentId) throw new Error("Agent ID is required");

      // Check if prompt exists
      const { data: existingData } = await supabase
        .from("recruitment_agent_prompts" as any)
        .select("id, version")
        .eq("agent_id", agentId)
        .eq("prompt_type", input.promptType)
        .single();

      const existing = existingData as unknown as { id: string; version: number } | null;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("recruitment_agent_prompts" as any)
          .update({
            name: input.name,
            content: input.content,
            is_active: input.isActive ?? true,
            version: existing.version + 1,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("recruitment_agent_prompts" as any)
          .insert({
            agent_id: agentId,
            prompt_type: input.promptType,
            name: input.name,
            content: input.content,
            is_active: input.isActive ?? true,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-prompts", agentId] });
      toast.success("Prompt salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving prompt:", error);
      toast.error("Erro ao salvar prompt");
    },
  });

  const saveAllPromptsMutation = useMutation({
    mutationFn: async (prompts: PromptInput[]) => {
      if (!agentId) throw new Error("Agent ID is required");

      for (const prompt of prompts) {
        const { data: existingData } = await supabase
          .from("recruitment_agent_prompts" as any)
          .select("id, version")
          .eq("agent_id", agentId)
          .eq("prompt_type", prompt.promptType)
          .single();

        const existing = existingData as unknown as { id: string; version: number } | null;

        if (existing) {
          const { error } = await supabase
            .from("recruitment_agent_prompts" as any)
            .update({
              name: prompt.name,
              content: prompt.content,
              is_active: prompt.isActive ?? true,
              version: existing.version + 1,
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("recruitment_agent_prompts" as any)
            .insert({
              agent_id: agentId,
              prompt_type: prompt.promptType,
              name: prompt.name,
              content: prompt.content,
              is_active: prompt.isActive ?? true,
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-prompts", agentId] });
      toast.success("Prompts salvos com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving prompts:", error);
      toast.error("Erro ao salvar prompts");
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptType: PromptType) => {
      if (!agentId) throw new Error("Agent ID is required");

      const { error } = await supabase
        .from("recruitment_agent_prompts" as any)
        .delete()
        .eq("agent_id", agentId)
        .eq("prompt_type", promptType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-prompts", agentId] });
      toast.success("Prompt restaurado para o padrão");
    },
    onError: (error) => {
      console.error("Error deleting prompt:", error);
      toast.error("Erro ao restaurar prompt");
    },
  });

  return {
    prompts: promptsQuery.data ?? [],
    promptsWithDefaults: getPromptsWithDefaults(),
    isLoading: promptsQuery.isLoading,
    error: promptsQuery.error,
    upsertPrompt: upsertPromptMutation.mutate,
    saveAllPrompts: saveAllPromptsMutation.mutate,
    deletePrompt: deletePromptMutation.mutate,
    isSaving: upsertPromptMutation.isPending || saveAllPromptsMutation.isPending,
    getDefaultPrompt,
    getDefaultName,
  };
}
