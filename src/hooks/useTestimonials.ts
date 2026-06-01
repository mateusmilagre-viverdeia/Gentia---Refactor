import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Testimonial {
  id: string;
  account_id: string;
  employee_name: string;
  employee_role: string | null;
  employee_photo_url: string | null;
  testimonial_text: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTestimonialInput {
  account_id: string;
  employee_name: string;
  employee_role?: string;
  employee_photo_url?: string;
  testimonial_text: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateTestimonialInput {
  employee_name?: string;
  employee_role?: string | null;
  employee_photo_url?: string | null;
  testimonial_text?: string;
  is_active?: boolean;
  display_order?: number;
}

/**
 * Hook to fetch testimonials for an organization (admin view)
 */
export function useTestimonials(accountId: string | undefined) {
  return useQuery({
    queryKey: ["testimonials", accountId],
    queryFn: async (): Promise<Testimonial[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("employee_testimonials")
        .select("*")
        .eq("account_id", accountId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });
}

/**
 * Hook to fetch active testimonials for public careers page
 */
export function usePublicTestimonials(accountId: string | undefined) {
  return useQuery({
    queryKey: ["public-testimonials", accountId],
    queryFn: async (): Promise<Testimonial[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("employee_testimonials")
        .select("*")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });
}

/**
 * Hook to create a new testimonial
 */
export function useCreateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTestimonialInput) => {
      const { data, error } = await supabase
        .from("employee_testimonials")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testimonials", variables.account_id] });
      toast.success("Depoimento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating testimonial:", error);
      toast.error("Erro ao criar depoimento");
    },
  });
}

/**
 * Hook to update a testimonial
 */
export function useUpdateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accountId, ...input }: UpdateTestimonialInput & { id: string; accountId: string }) => {
      const { data, error } = await supabase
        .from("employee_testimonials")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testimonials", variables.accountId] });
      toast.success("Depoimento atualizado!");
    },
    onError: (error) => {
      console.error("Error updating testimonial:", error);
      toast.error("Erro ao atualizar depoimento");
    },
  });
}

/**
 * Hook to delete a testimonial
 */
export function useDeleteTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      const { error } = await supabase
        .from("employee_testimonials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["testimonials", variables.accountId] });
      toast.success("Depoimento excluído!");
    },
    onError: (error) => {
      console.error("Error deleting testimonial:", error);
      toast.error("Erro ao excluir depoimento");
    },
  });
}
