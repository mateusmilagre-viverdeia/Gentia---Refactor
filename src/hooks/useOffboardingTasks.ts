import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OffboardingTask,
  CreateOffboardingTaskInput,
  UpdateOffboardingTaskInput,
  OffboardingTaskStatus,
} from "@/types/offboarding.types";

const CASES_KEY = "offboarding-cases";

export const useOffboardingTasks = () => {
  const queryClient = useQueryClient();

  // Create task
  const createTask = useMutation({
    mutationFn: async (input: CreateOffboardingTaskInput) => {
      const { data, error } = await supabase
        .from("offboarding_tasks")
        .insert({
          ...input,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OffboardingTask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, variables.case_id] });
      toast.success("Tarefa criada");
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    },
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: async ({ id, case_id, ...input }: UpdateOffboardingTaskInput & { id: string; case_id: string }) => {
      const { data, error } = await supabase
        .from("offboarding_tasks")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, case_id } as unknown as OffboardingTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, data.case_id] });
      toast.success("Tarefa atualizada");
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    },
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async ({ id, case_id }: { id: string; case_id: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("offboarding_tasks")
        .update({
          status: "completed" as OffboardingTaskStatus,
          completed_at: new Date().toISOString(),
          completed_by: userData.user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, case_id } as unknown as OffboardingTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, data.case_id] });
      toast.success("Tarefa concluída");
    },
    onError: (error) => {
      console.error("Error completing task:", error);
      toast.error("Erro ao concluir tarefa");
    },
  });

  // Uncomplete task (revert to pending)
  const uncompleteTask = useMutation({
    mutationFn: async ({ id, case_id }: { id: string; case_id: string }) => {
      const { data, error } = await supabase
        .from("offboarding_tasks")
        .update({
          status: "pending" as OffboardingTaskStatus,
          completed_at: null,
          completed_by: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, case_id } as unknown as OffboardingTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, data.case_id] });
      toast.success("Tarefa reaberta");
    },
    onError: (error) => {
      console.error("Error uncompleting task:", error);
      toast.error("Erro ao reabrir tarefa");
    },
  });

  // Skip task
  const skipTask = useMutation({
    mutationFn: async ({ id, case_id }: { id: string; case_id: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("offboarding_tasks")
        .update({
          status: "skipped" as OffboardingTaskStatus,
          completed_at: new Date().toISOString(),
          completed_by: userData.user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, case_id } as unknown as OffboardingTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, data.case_id] });
      toast.success("Tarefa pulada");
    },
    onError: (error) => {
      console.error("Error skipping task:", error);
      toast.error("Erro ao pular tarefa");
    },
  });

  // Waive task (dispense with reason)
  const waiveTask = useMutation({
    mutationFn: async ({ id, case_id, reason }: { id: string; case_id: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("offboarding_tasks")
        .update({
          status: "waived" as OffboardingTaskStatus,
          waive_reason: reason,
          completed_at: new Date().toISOString(),
          completed_by: userData.user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, case_id } as unknown as OffboardingTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, data.case_id] });
      toast.success("Tarefa dispensada");
    },
    onError: (error) => {
      console.error("Error waiving task:", error);
      toast.error("Erro ao dispensar tarefa");
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async ({ id, case_id }: { id: string; case_id: string }) => {
      const { error } = await supabase
        .from("offboarding_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, case_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CASES_KEY, data.case_id] });
      toast.success("Tarefa removida");
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast.error("Erro ao remover tarefa");
    },
  });

  return {
    createTask,
    updateTask,
    completeTask,
    uncompleteTask,
    skipTask,
    waiveTask,
    deleteTask,
  };
};
