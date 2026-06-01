import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TalentPoolEntry {
  id: string;
  account_id: string;
  name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  linkedin_url: string | null;
  areas_of_interest: string[];
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTalentPoolInput {
  account_id: string;
  name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  linkedin_url?: string;
  areas_of_interest?: string[];
  message?: string;
}

/**
 * Hook to fetch talent pool entries for an organization (admin view)
 */
export function useTalentPool(accountId: string | undefined) {
  return useQuery({
    queryKey: ["talent-pool", accountId],
    queryFn: async (): Promise<TalentPoolEntry[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("talent_pool")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });
}

/**
 * Hook to submit to talent pool (public)
 */
export function useSubmitToTalentPool() {
  return useMutation({
    mutationFn: async (input: CreateTalentPoolInput) => {
      const { data, error } = await supabase
        .from("talent_pool")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cadastro enviado com sucesso! Entraremos em contato.");
    },
    onError: (error) => {
      console.error("Error submitting to talent pool:", error);
      toast.error("Erro ao enviar cadastro. Tente novamente.");
    },
  });
}

/**
 * Hook to update talent pool entry status
 */
export function useUpdateTalentPoolStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accountId, status }: { id: string; accountId: string; status: string }) => {
      const { data, error } = await supabase
        .from("talent_pool")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool", variables.accountId] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}

/**
 * Hook to delete talent pool entry
 */
export function useDeleteTalentPoolEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      const { error } = await supabase
        .from("talent_pool")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool", variables.accountId] });
      toast.success("Entrada removida!");
    },
    onError: (error) => {
      console.error("Error deleting entry:", error);
      toast.error("Erro ao remover entrada");
    },
  });
}
