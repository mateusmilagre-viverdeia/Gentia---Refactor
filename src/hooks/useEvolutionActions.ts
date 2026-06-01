import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EvolutionAction, EvolutionActionStatus } from "@/types/evolution.types";

export function useEvolutionActions(cycleId?: string) {
  const queryClient = useQueryClient();

  const createAction = useMutation({
    mutationFn: async (action: Partial<EvolutionAction>) => {
      const { data, error } = await supabase
        .from("evolution_actions")
        .insert({
          objective_id: action.objective_id!,
          action_type: action.action_type!,
          description: action.description!,
          linked_project_id: action.linked_project_id,
          linked_project_name: action.linked_project_name,
          responsible: action.responsible,
          due_date: action.due_date,
          status: action.status || "pending",
          order_index: action.order_index || 0,
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
      console.error("Error creating action:", error);
      toast.error("Erro ao criar ação");
    },
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvolutionAction> & { id: string }) => {
      const { data, error } = await supabase
        .from("evolution_actions")
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
      console.error("Error updating action:", error);
      toast.error("Erro ao atualizar ação");
    },
  });

  const updateActionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EvolutionActionStatus }) => {
      const updateData: Partial<EvolutionAction> = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("evolution_actions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      
      if (variables.status === "completed") {
        toast.success("Ação concluída! 🎉");
      } else {
        toast.success("Status da ação atualizado");
      }
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  const addEvidence = useMutation({
    mutationFn: async ({ id, evidence_description, evidence_url }: { 
      id: string; 
      evidence_description: string; 
      evidence_url?: string 
    }) => {
      const { data, error } = await supabase
        .from("evolution_actions")
        .update({ evidence_description, evidence_url })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      toast.success("Evidência registrada!");
    },
    onError: (error) => {
      console.error("Error adding evidence:", error);
      toast.error("Erro ao registrar evidência");
    },
  });

  const deleteAction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evolution_actions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      toast.success("Ação excluída!");
    },
    onError: (error) => {
      console.error("Error deleting action:", error);
      toast.error("Erro ao excluir ação");
    },
  });

  return {
    createAction,
    updateAction,
    updateActionStatus,
    addEvidence,
    deleteAction,
  };
}
