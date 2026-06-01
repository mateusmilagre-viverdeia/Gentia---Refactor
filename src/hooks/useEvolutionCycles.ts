import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import type { EvolutionCycle, EvolutionCycleStatus } from "@/types/evolution.types";

export function useEvolutionCycles() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const cyclesQuery = useQuery({
    queryKey: ["evolution-cycles", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from("evolution_cycles")
        .select(`
          *,
          job_description:job_descriptions(id, title),
          collaborator:profiles!collaborator_id(id, first_name, last_name, email),
          leader:profiles!leader_id(id, first_name, last_name, email),
          competencies:evolution_competencies(*),
          objectives:evolution_objectives(
            *,
            actions:evolution_actions(*)
          ),
          checkins:evolution_checkins(*),
          feedbacks:evolution_feedbacks(*)
        `)
        .eq("account_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EvolutionCycle[];
    },
    enabled: !!currentOrganization?.id,
  });

  const createCycle = useMutation({
    mutationFn: async (cycle: Partial<EvolutionCycle>) => {
      if (!currentOrganization?.id) throw new Error("Organização não encontrada");

      const { data, error } = await supabase
        .from("evolution_cycles")
        .insert({
          account_id: currentOrganization.id,
          collaborator_id: cycle.collaborator_id!,
          leader_id: cycle.leader_id || null,
          job_description_id: cycle.job_description_id,
          status: cycle.status || "draft",
          start_date: cycle.start_date!,
          end_date: cycle.end_date!,
          notes: cycle.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      toast.success("Ciclo de evolução criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating cycle:", error);
      toast.error("Erro ao criar ciclo de evolução");
    },
  });

  const updateCycle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvolutionCycle> & { id: string }) => {
      const { data, error } = await supabase
        .from("evolution_cycles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      toast.success("Ciclo atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating cycle:", error);
      toast.error("Erro ao atualizar ciclo");
    },
  });

  const updateCycleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EvolutionCycleStatus }) => {
      const { data, error } = await supabase
        .from("evolution_cycles")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      const statusMessages: Record<EvolutionCycleStatus, string> = {
        draft: "Ciclo salvo como rascunho",
        active: "Ciclo ativado com sucesso!",
        completed: "Ciclo concluído com sucesso!",
        cancelled: "Ciclo cancelado",
      };
      toast.success(statusMessages[variables.status]);
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status do ciclo");
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evolution_cycles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      toast.success("Ciclo excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting cycle:", error);
      toast.error("Erro ao excluir ciclo");
    },
  });

  return {
    cycles: cyclesQuery.data || [],
    isLoading: cyclesQuery.isLoading,
    error: cyclesQuery.error,
    createCycle,
    updateCycle,
    updateCycleStatus,
    deleteCycle,
    refetch: cyclesQuery.refetch,
  };
}

export function useEvolutionCycle(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["evolution-cycle", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;

      const { data, error } = await supabase
        .from("evolution_cycles")
        .select(`
          *,
          job_description:job_descriptions(id, title),
          collaborator:profiles!collaborator_id(id, first_name, last_name, email),
          leader:profiles!leader_id(id, first_name, last_name, email),
          competencies:evolution_competencies(*),
          objectives:evolution_objectives(
            *,
            actions:evolution_actions(*)
          ),
          checkins:evolution_checkins(*),
          feedbacks:evolution_feedbacks(*)
        `)
        .eq("id", cycleId)
        .single();

      if (error) throw error;
      return data as EvolutionCycle;
    },
    enabled: !!cycleId,
  });
}
