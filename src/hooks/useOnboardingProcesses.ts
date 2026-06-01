import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  OnboardingProcess,
  OnboardingPhase,
  OnboardingTask,
  OnboardingProcessWithDetails,
  CreateOnboardingProcessInput,
  OnboardingStatus,
} from "@/types/onboarding.types";

const PROCESSES_KEY = "onboarding-processes";

export interface OnboardingProcessWithTasks extends OnboardingProcess {
  onboarding_tasks: Pick<OnboardingTask, 'id' | 'status'>[];
}

export const useOnboardingProcesses = (accountId?: string) => {
  const queryClient = useQueryClient();

  // Fetch all processes with task counts
  const processesQuery = useQuery({
    queryKey: [PROCESSES_KEY, accountId],
    queryFn: async (): Promise<OnboardingProcessWithTasks[]> => {
      let query = supabase
        .from("onboarding_processes")
        .select(`
          *,
          onboarding_tasks (id, status)
        `)
        .order("created_at", { ascending: false });

      // Note: RLS handles account filtering, but we can add explicit filter if needed
      
      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as OnboardingProcessWithTasks[];
    },
    enabled: true,
  });

  // Fetch single process with all details
  const useProcessWithDetails = (processId: string | undefined) => {
    return useQuery({
      queryKey: [PROCESSES_KEY, processId],
      queryFn: async (): Promise<OnboardingProcessWithDetails | null> => {
        if (!processId) return null;

        const { data: process, error: processError } = await supabase
          .from("onboarding_processes")
          .select("*")
          .eq("id", processId)
          .single();

        if (processError) throw processError;

        const { data: phases, error: phasesError } = await supabase
          .from("onboarding_phases")
          .select("*")
          .eq("process_id", processId)
          .order("order_index");

        if (phasesError) throw phasesError;

        const { data: tasks, error: tasksError } = await supabase
          .from("onboarding_tasks")
          .select("*")
          .eq("process_id", processId)
          .order("order_index");

        if (tasksError) throw tasksError;

        const { data: evaluation, error: evalError } = await supabase
          .from("onboarding_evaluations")
          .select("*")
          .eq("process_id", processId)
          .maybeSingle();

        if (evalError) throw evalError;

        const phasesWithTasks = phases.map((phase) => ({
          ...phase,
          tasks: tasks.filter((t) => t.phase_id === phase.id) as OnboardingTask[],
        }));

        return {
          ...process,
          phases: phasesWithTasks,
          evaluation,
        } as OnboardingProcessWithDetails;
      },
      enabled: !!processId,
    });
  };

  // Create process
  const createProcess = useMutation({
    mutationFn: async (input: CreateOnboardingProcessInput) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("onboarding_processes")
        .insert({
          ...input,
          created_by: userData.user?.id,
          status: "draft" as OnboardingStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingProcess;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY] });
      toast.success("Processo de onboarding criado");
    },
    onError: (error) => {
      console.error("Error creating process:", error);
      toast.error("Erro ao criar processo de onboarding");
    },
  });

  // Update process
  const updateProcess = useMutation({
    mutationFn: async ({ id, ...input }: Partial<OnboardingProcess> & { id: string }) => {
      const { data, error } = await supabase
        .from("onboarding_processes")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingProcess;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, variables.id] });
      toast.success("Processo atualizado");
    },
    onError: (error) => {
      console.error("Error updating process:", error);
      toast.error("Erro ao atualizar processo");
    },
  });

  // Start process (change status from draft to active)
  const startProcess = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("onboarding_processes")
        .update({ status: "active" as OnboardingStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingProcess;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, id] });
      toast.success("Onboarding iniciado!");
    },
    onError: (error) => {
      console.error("Error starting process:", error);
      toast.error("Erro ao iniciar onboarding");
    },
  });

  // Complete process
  const completeProcess = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("onboarding_processes")
        .update({ status: "completed" as OnboardingStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingProcess;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, id] });
      toast.success("Onboarding concluído!");
    },
    onError: (error) => {
      console.error("Error completing process:", error);
      toast.error("Erro ao concluir onboarding");
    },
  });

  // Cancel process
  const cancelProcess = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("onboarding_processes")
        .update({ status: "cancelled" as OnboardingStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingProcess;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, id] });
      toast.success("Onboarding cancelado");
    },
    onError: (error) => {
      console.error("Error cancelling process:", error);
      toast.error("Erro ao cancelar onboarding");
    },
  });

  // Create phase for a process
  const createPhase = useMutation({
    mutationFn: async (input: { process_id: string; name: string; description?: string; order_index?: number; start_date?: string; end_date?: string }) => {
      const { data, error } = await supabase
        .from("onboarding_phases")
        .insert({
          process_id: input.process_id,
          name: input.name,
          description: input.description || null,
          order_index: input.order_index || 0,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          status: "pending" as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingPhase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, variables.process_id] });
    },
  });

  // Bulk create phases and tasks from template
  const createFromTemplate = useMutation({
    mutationFn: async ({
      processId,
      templatePhases,
    }: {
      processId: string;
      templatePhases: Array<{
        name: string;
        description: string | null;
        order_index: number;
        start_date: string | null;
        end_date: string | null;
        tasks: Array<{
          title: string;
          description: string | null;
          responsible_type: "rh" | "leader" | "employee" | "ti" | "buddy";
          is_required: boolean;
          order_index: number;
          due_date: string | null;
        }>;
      }>;
    }) => {
      // Create phases
      for (const phase of templatePhases) {
        const { data: createdPhase, error: phaseError } = await supabase
          .from("onboarding_phases")
          .insert({
            process_id: processId,
            name: phase.name,
            description: phase.description,
            order_index: phase.order_index,
            start_date: phase.start_date,
            end_date: phase.end_date,
            status: "pending" as const,
          })
          .select()
          .single();

        if (phaseError) throw phaseError;

        // Create tasks for this phase
        if (phase.tasks.length > 0) {
          const tasksToInsert = phase.tasks.map((task) => ({
            phase_id: createdPhase.id,
            process_id: processId,
            title: task.title,
            description: task.description,
            responsible_type: task.responsible_type,
            is_required: task.is_required,
            order_index: task.order_index,
            due_date: task.due_date,
            status: "pending" as const,
          }));

          const { error: tasksError } = await supabase
            .from("onboarding_tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROCESSES_KEY, variables.processId] });
    },
  });

  return {
    processes: processesQuery.data ?? [],
    isLoading: processesQuery.isLoading,
    error: processesQuery.error,
    refetch: processesQuery.refetch,
    useProcessWithDetails,
    createProcess,
    updateProcess,
    startProcess,
    completeProcess,
    cancelProcess,
    createPhase,
    createFromTemplate,
  };
};
