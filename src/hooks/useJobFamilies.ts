import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JobFamily, CreateJobFamilyInput } from "@/types/compensation.types";

const MODELS_KEY = "compensation-models";

export const useJobFamilies = () => {
  const queryClient = useQueryClient();

  // Criar família
  const createFamily = useMutation({
    mutationFn: async (input: CreateJobFamilyInput) => {
      const { data, error } = await supabase
        .from("job_families")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as JobFamily;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      toast.success("Família de cargos criada");
    },
    onError: (error) => {
      console.error("Error creating family:", error);
      toast.error("Erro ao criar família");
    },
  });

  // Atualizar família
  const updateFamily = useMutation({
    mutationFn: async ({ id, ...input }: Partial<JobFamily> & { id: string }) => {
      const { data, error } = await supabase
        .from("job_families")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as JobFamily;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      toast.success("Família atualizada");
    },
    onError: (error) => {
      console.error("Error updating family:", error);
      toast.error("Erro ao atualizar família");
    },
  });

  // Deletar família
  const deleteFamily = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("job_families")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      toast.success("Família excluída");
    },
    onError: (error) => {
      console.error("Error deleting family:", error);
      toast.error("Erro ao excluir família");
    },
  });

  // Reordenar famílias
  const reorderFamilies = useMutation({
    mutationFn: async (families: { id: string; display_order: number }[]) => {
      const updates = families.map(f => 
        supabase
          .from("job_families")
          .update({ display_order: f.display_order })
          .eq("id", f.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
    },
    onError: (error) => {
      console.error("Error reordering families:", error);
      toast.error("Erro ao reordenar famílias");
    },
  });

  return {
    createFamily,
    updateFamily,
    deleteFamily,
    reorderFamilies,
  };
};
