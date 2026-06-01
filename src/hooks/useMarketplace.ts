import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface MarketplaceCandidate {
  id: string;
  display_id: string;
  cultural_score: number | null;
  cultural_radar_data: Record<string, unknown> | null;
  disc_primary: string | null;
  disc_secondary: string | null;
  disc_scores: Record<string, number> | null;
  skills: string[];
  experience_years: number | null;
  seniority_level: string | null;
  salary_range: string | null;
  location_city: string | null;
  location_state: string | null;
  remote_preference: string | null;
  unlock_count: number;
  created_at: string;
  is_unlocked: boolean;
}

export interface MarketplaceFilters {
  min_cultural_score?: number;
  disc_profiles?: string[];
  skills?: string[];
  location_city?: string;
  location_state?: string;
  remote_preference?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  seniority_levels?: string[];
  limit?: number;
  offset?: number;
}

export interface RevealedData {
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  cv_url?: string;
  city?: string;
  cultural_score?: number;
  disc_primary?: string;
  disc_secondary?: string;
  source_sector?: string;
}

export interface TalentPoolUnlock {
  id: string;
  talent_pool_id: string;
  credits_charged: number;
  revealed_data: RevealedData;
  status: string;
  contact_initiated: boolean;
  contacted_at: string | null;
  interview_scheduled: boolean;
  hired: boolean;
  hired_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useMarketplaceSearch(filters: MarketplaceFilters) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["marketplace-search", currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) return { candidates: [], total: 0 };

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("marketplace-search", {
        body: {
          buyer_account_id: currentOrganization.id,
          filters,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data as { candidates: MarketplaceCandidate[]; total: number };
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function useMarketplaceUnlock() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poolId: string) => {
      if (!currentOrganization?.id) throw new Error("No organization selected");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("marketplace-unlock", {
        body: {
          buyer_account_id: currentOrganization.id,
          pool_id: poolId,
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      const result = response.data;
      if (!result.success) {
        throw new Error(result.message || "Failed to unlock candidate");
      }

      return result as {
        success: boolean;
        already_unlocked: boolean;
        revealed_data: RevealedData;
        credits_charged: number;
        balance_after?: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-search"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      
      if (data.already_unlocked) {
        toast.info("Este candidato já foi desbloqueado anteriormente");
      } else {
        toast.success(`Candidato desbloqueado! ${data.credits_charged} créditos utilizados`);
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("insufficient_credits")) {
        toast.error("Créditos insuficientes para desbloquear este candidato");
      } else {
        toast.error(error.message || "Erro ao desbloquear candidato");
      }
    },
  });
}

export function useMyUnlocks() {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["marketplace-unlocks", currentOrganization?.id],
    queryFn: async (): Promise<TalentPoolUnlock[]> => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from("talent_pool_unlocks")
        .select("*")
        .eq("buyer_account_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as TalentPoolUnlock[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useUpdateUnlockStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      unlockId,
      updates,
    }: {
      unlockId: string;
      updates: Partial<Pick<TalentPoolUnlock, "status" | "contact_initiated" | "contacted_at" | "interview_scheduled" | "hired" | "hired_at" | "notes">>;
    }) => {
      const { error } = await supabase
        .from("talent_pool_unlocks")
        .update(updates)
        .eq("id", unlockId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-unlocks"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
}
