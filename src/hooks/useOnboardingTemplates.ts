import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OnboardingTemplate,
  OnboardingTemplatePhase,
  OnboardingTemplateTask,
  OnboardingTemplateWithPhases,
} from "@/types/onboarding.types";

const TEMPLATES_KEY = "onboarding-templates";

export const useOnboardingTemplates = () => {
  const queryClient = useQueryClient();

  // Fetch all templates
  const templatesQuery = useQuery({
    queryKey: [TEMPLATES_KEY],
    queryFn: async (): Promise<OnboardingTemplate[]> => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OnboardingTemplate[];
    },
  });

  // Fetch single template with phases and tasks
  const useTemplateWithDetails = (templateId: string | undefined) => {
    return useQuery({
      queryKey: [TEMPLATES_KEY, templateId],
      queryFn: async (): Promise<OnboardingTemplateWithPhases | null> => {
        if (!templateId) return null;

        const { data: template, error: templateError } = await supabase
          .from("onboarding_templates")
          .select("*")
          .eq("id", templateId)
          .single();

        if (templateError) throw templateError;

        const { data: phases, error: phasesError } = await supabase
          .from("onboarding_template_phases")
          .select("*")
          .eq("template_id", templateId)
          .order("order_index");

        if (phasesError) throw phasesError;

        const phaseIds = phases.map((p) => p.id);
        const { data: tasks, error: tasksError } = await supabase
          .from("onboarding_template_tasks")
          .select("*")
          .in("phase_id", phaseIds)
          .order("order_index");

        if (tasksError) throw tasksError;

        const phasesWithTasks = phases.map((phase) => ({
          ...phase,
          tasks: tasks.filter((t) => t.phase_id === phase.id) as OnboardingTemplateTask[],
        }));

        return {
          ...template,
          phases: phasesWithTasks,
        } as OnboardingTemplateWithPhases;
      },
      enabled: !!templateId,
    });
  };

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (input: { name: string; description?: string; default_duration_days?: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("onboarding_templates")
        .insert({
          name: input.name,
          description: input.description || null,
          default_duration_days: input.default_duration_days || 90,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success("Template criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast.error("Erro ao criar template");
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...input }: Partial<OnboardingTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success("Template atualizado");
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast.error("Erro ao atualizar template");
    },
  });

  // Delete template (soft delete)
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("onboarding_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success("Template removido");
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("Erro ao remover template");
    },
  });

  // Create phase
  const createPhase = useMutation({
    mutationFn: async (input: { template_id: string; name: string; description?: string; order_index?: number; duration_days?: number }) => {
      const { data, error } = await supabase
        .from("onboarding_template_phases")
        .insert({
          template_id: input.template_id,
          name: input.name,
          description: input.description || null,
          order_index: input.order_index || 0,
          duration_days: input.duration_days || 7,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingTemplatePhase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, variables.template_id] });
    },
  });

  // Create task
  const createTask = useMutation({
    mutationFn: async (input: { phase_id: string; title: string; description?: string; responsible_type?: "rh" | "leader" | "employee"; is_required?: boolean; order_index?: number }) => {
      const { data, error } = await supabase
        .from("onboarding_template_tasks")
        .insert({
          phase_id: input.phase_id,
          title: input.title,
          description: input.description || null,
          responsible_type: input.responsible_type || "leader",
          is_required: input.is_required !== false,
          order_index: input.order_index || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingTemplateTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    useTemplateWithDetails,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createPhase,
    createTask,
  };
};
