import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface ScorecardTemplate {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  stage: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScorecardCriterion {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  weight: 'minor' | 'moderate' | 'important' | 'critical';
  order_index: number;
  created_at: string;
}

export interface ScorecardTemplateWithCriteria extends ScorecardTemplate {
  criteria: ScorecardCriterion[];
}

export function useScorecardTemplates() {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["scorecard-templates", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];

      const { data, error } = await supabase
        .from("recruitment_scorecard_templates")
        .select(`
          *,
          criteria:recruitment_scorecard_criteria(*)
        `)
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ScorecardTemplateWithCriteria[];
    },
    enabled: !!currentAccount?.id,
  });
}

export function useScorecardTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ["scorecard-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from("recruitment_scorecard_templates")
        .select(`
          *,
          criteria:recruitment_scorecard_criteria(*)
        `)
        .eq("id", templateId)
        .maybeSingle();

      if (error) throw error;
      return data as ScorecardTemplateWithCriteria | null;
    },
    enabled: !!templateId,
  });
}

export function useDefaultTemplateForStage(stage: string) {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ["scorecard-template-default", currentAccount?.id, stage],
    queryFn: async () => {
      if (!currentAccount?.id) return null;

      const { data, error } = await supabase
        .from("recruitment_scorecard_templates")
        .select(`
          *,
          criteria:recruitment_scorecard_criteria(*)
        `)
        .eq("account_id", currentAccount.id)
        .eq("stage", stage)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as ScorecardTemplateWithCriteria | null;
    },
    enabled: !!currentAccount?.id && !!stage,
  });
}

interface CreateTemplateData {
  name: string;
  description?: string;
  stage: string;
  is_default?: boolean;
  criteria: {
    name: string;
    description?: string;
    weight: 'minor' | 'moderate' | 'important' | 'critical';
  }[];
}

export function useCreateScorecardTemplate() {
  const queryClient = useQueryClient();
  const { currentAccount } = useOrganization();

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      // Create the template
      const { data: template, error: templateError } = await supabase
        .from("recruitment_scorecard_templates")
        .insert({
          account_id: currentAccount.id,
          name: data.name,
          description: data.description || null,
          stage: data.stage,
          is_default: data.is_default || false,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create criteria
      if (data.criteria.length > 0) {
        const criteriaToInsert = data.criteria.map((c, index) => ({
          template_id: template.id,
          name: c.name,
          description: c.description || null,
          weight: c.weight,
          order_index: index,
        }));

        const { error: criteriaError } = await supabase
          .from("recruitment_scorecard_criteria")
          .insert(criteriaToInsert);

        if (criteriaError) throw criteriaError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-templates"] });
      toast.success("Template de scorecard criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating scorecard template:", error);
      toast.error("Erro ao criar template de scorecard");
    },
  });
}

export function useDeleteScorecardTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("recruitment_scorecard_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-templates"] });
      toast.success("Template excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting scorecard template:", error);
      toast.error("Erro ao excluir template");
    },
  });
}

// Weight multipliers for score calculation
export const weightMultipliers: Record<string, number> = {
  minor: 1,
  moderate: 2,
  important: 3,
  critical: 4,
};

export const weightLabels: Record<string, string> = {
  minor: 'Menor',
  moderate: 'Moderado',
  important: 'Importante',
  critical: 'Crítico',
};

export const stageLabels: Record<string, string> = {
  screening: 'Triagem',
  interview: 'Entrevista',
  technical: 'Técnica',
  cultural: 'Cultural',
  offer: 'Proposta',
};
