import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OnboardingTask,
  CreateOnboardingTaskInput,
  UpdateOnboardingTaskInput,
  OnboardingTaskStatus,
  OnboardingPhaseStatus,
} from "@/types/onboarding.types";

const PROCESSES_KEY = "onboarding-processes";

export const useOnboardingTasks = () => {
  const queryClient = useQueryClient();

  // Create task
  const createTask = useMutation({
    mutationFn: async (input: CreateOnboardingTaskInput) => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .insert({
          ...input,
          status: "pending" as OnboardingTaskStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, data.process_id] });
      toast.success("Tarefa criada");
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    },
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: async ({ id, processId, ...input }: UpdateOnboardingTaskInput & { id: string; processId: string }) => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { task: data as OnboardingTask, processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    },
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async ({ id, processId }: { id: string; processId: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("onboarding_tasks")
        .update({
          status: "completed" as OnboardingTaskStatus,
          completed_at: new Date().toISOString(),
          completed_by: userData.user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { task: data as OnboardingTask, processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
      toast.success("Tarefa concluída!");
    },
    onError: (error) => {
      console.error("Error completing task:", error);
      toast.error("Erro ao concluir tarefa");
    },
  });

  // Uncomplete task (revert to pending)
  const uncompleteTask = useMutation({
    mutationFn: async ({ id, processId }: { id: string; processId: string }) => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .update({
          status: "pending" as OnboardingTaskStatus,
          completed_at: null,
          completed_by: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { task: data as OnboardingTask, processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
    },
    onError: (error) => {
      console.error("Error uncompleting task:", error);
      toast.error("Erro ao reverter tarefa");
    },
  });

  // Skip task
  const skipTask = useMutation({
    mutationFn: async ({ id, processId, notes }: { id: string; processId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("onboarding_tasks")
        .update({
          status: "skipped" as OnboardingTaskStatus,
          notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { task: data as OnboardingTask, processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
      toast.success("Tarefa pulada");
    },
    onError: (error) => {
      console.error("Error skipping task:", error);
      toast.error("Erro ao pular tarefa");
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async ({ id, processId }: { id: string; processId: string }) => {
      const { error } = await supabase
        .from("onboarding_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
      toast.success("Tarefa removida");
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast.error("Erro ao remover tarefa");
    },
  });

  // Update phase status
  const updatePhaseStatus = useMutation({
    mutationFn: async ({
      phaseId,
      processId,
      status,
    }: {
      phaseId: string;
      processId: string;
      status: OnboardingPhaseStatus;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("onboarding_phases")
        .update(updateData)
        .eq("id", phaseId)
        .select()
        .single();

      if (error) throw error;
      return { phase: data, processId };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, processId] });
    },
  });

  return {
    createTask,
    updateTask,
    completeTask,
    uncompleteTask,
    skipTask,
    deleteTask,
    updatePhaseStatus,
  };
};
