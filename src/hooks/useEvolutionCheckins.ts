import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EvolutionCheckin } from "@/types/evolution.types";

export function useEvolutionCheckins(cycleId?: string) {
  const queryClient = useQueryClient();

  const createCheckin = useMutation({
    mutationFn: async (checkin: Partial<EvolutionCheckin>) => {
      const { data, error } = await supabase
        .from("evolution_checkins")
        .insert({
          cycle_id: checkin.cycle_id!,
          checkin_date: checkin.checkin_date || new Date().toISOString().split("T")[0],
          checkin_type: checkin.checkin_type || "regular",
          planned_vs_executed: checkin.planned_vs_executed,
          perceived_evolution: checkin.perceived_evolution,
          real_evidence: checkin.real_evidence,
          blockers: checkin.blockers,
          next_steps: checkin.next_steps,
          overall_progress: checkin.overall_progress,
          ai_generated_questions: checkin.ai_generated_questions,
          created_by: checkin.created_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      toast.success("Check-in registrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating checkin:", error);
      toast.error("Erro ao registrar check-in");
    },
  });

  const updateCheckin = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvolutionCheckin> & { id: string }) => {
      const { data, error } = await supabase
        .from("evolution_checkins")
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
      toast.success("Check-in atualizado!");
    },
    onError: (error) => {
      console.error("Error updating checkin:", error);
      toast.error("Erro ao atualizar check-in");
    },
  });

  const deleteCheckin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evolution_checkins")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-cycle", cycleId] });
      toast.success("Check-in excluído!");
    },
    onError: (error) => {
      console.error("Error deleting checkin:", error);
      toast.error("Erro ao excluir check-in");
    },
  });

  return {
    createCheckin,
    updateCheckin,
    deleteCheckin,
  };
}
