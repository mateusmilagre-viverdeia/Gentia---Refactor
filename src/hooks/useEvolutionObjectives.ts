import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EvolutionObjective, EvolutionObjectiveStatus } from "@/types/evolution.types";

export function useEvolutionObjectives(cycleId?: string) {
  const queryClient = useQueryClient();

  const createObjective = useMutation({
    mutationFn: async (objective: Partial<EvolutionObjective>) => {
      const { data, error } = await supabase
        .from("evolution_objectives")
        .insert({
          cycle_id: objective.cycle_id!,
          competency_id: objective.competency_id,
          objective_text: objective.objective_text!,
          key_behaviors: objective.key_behaviors || [],
          progress_indicators: objective.progress_indicators || [],
          status: objective.status || "pending",
          order_index: objective.order_index || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
    },
    onError: (error) => {
      console.error("Error creating objective:", error);
      toast.error("Erro ao criar objetivo");
    },
  });

  const updateObjective = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvolutionObjective> & { id: string }) => {
      const { data, error } = await supabase
        .from("evolution_objectives")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
    },
    onError: (error) => {
      console.error("Error updating objective:", error);
      toast.error("Erro ao atualizar objetivo");
    },
  });

  const updateObjectiveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EvolutionObjectiveStatus }) => {
      const { data, error } = await supabase
        .from("evolution_objectives")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      toast.success("Status do objetivo atualizado!");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evolution_objectives")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      toast.success("Objetivo excluído!");
    },
    onError: (error) => {
      console.error("Error deleting objective:", error);
      toast.error("Erro ao excluir objetivo");
    },
  });

  return {
    createObjective,
    updateObjective,
    updateObjectiveStatus,
    deleteObjective,
  };
}
