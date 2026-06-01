import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AI_PROMPTS, type PromptDefinition } from "@/lib/aiPromptsRegistry";

export interface AIPromptRow {
  key: string;
  template: string;
  default_template: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface MergedPrompt extends PromptDefinition {
  currentTemplate: string;
  isCustomized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export function useAIPrompts() {
  return useQuery({
    queryKey: ["ai-prompts"],
    queryFn: async (): Promise<MergedPrompt[]> => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("key, template, default_template, updated_at, updated_by");
      if (error) throw error;
      const rows = (data || []) as AIPromptRow[];
      const byKey = new Map(rows.map((r) => [r.key, r]));
      return AI_PROMPTS.map((def) => {
        const row = byKey.get(def.key);
        return {
          ...def,
          currentTemplate: row?.template ?? def.defaultTemplate,
          isCustomized: !!row && row.template !== def.defaultTemplate,
          updatedAt: row?.updated_at ?? null,
          updatedBy: row?.updated_by ?? null,
        };
      });
    },
  });
}

export function useSavePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      def,
      template,
    }: {
      def: PromptDefinition;
      template: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const { error } = await supabase
        .from("ai_prompts")
        .upsert(
          {
            key: def.key,
            label: def.label,
            category: def.category,
            description: def.description,
            variables: def.variables as any,
            template,
            default_template: def.defaultTemplate,
            updated_by: userId,
          },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-prompts"] }),
  });
}
