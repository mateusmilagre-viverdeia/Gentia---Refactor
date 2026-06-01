import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PlatformCreditConfig = {
  id: string;
  usd_to_brl: number;
  margin_percent: number;
  credit_value_brl: number;
  updated_at: string;
  updated_by: string | null;
};

export type CreditCost = {
  id: string;
  feature_key: string;
  credit_type: string;
  credits_per_use: number;
  usage_unit: string;
  description: string | null;
  is_active: boolean;
};

export type CreditPackage = {
  id: string;
  name: string;
  description: string | null;
  credit_type: string;
  credits: number;
  price_cents: number;
  price_per_credit_cents: number | null;
  bonus_percent: number | null;
  is_popular: boolean | null;
  is_active: boolean | null;
  display_order: number | null;
  billing_interval: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  included_seats: number;
  included_credits: Record<string, number> | any;
  trial_days: number | null;
  is_active: boolean | null;
  is_default: boolean | null;
  sort_order: number | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
};

// ============ Config ============
export function usePlatformCreditConfig() {
  return useQuery({
    queryKey: ["platform_credit_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_credit_config")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlatformCreditConfig | null;
    },
  });
}

export function useUpdateCreditConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; usd_to_brl: number; margin_percent: number; credit_value_brl: number }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("platform_credit_config")
        .update({
          usd_to_brl: input.usd_to_brl,
          margin_percent: input.margin_percent,
          credit_value_brl: input.credit_value_brl,
          updated_by: user.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_credit_config"] });
      toast.success("Configuração atualizada");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

// ============ Feature Costs ============
export function useCreditCosts() {
  return useQuery({
    queryKey: ["credit_costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_credit_costs")
        .select("*")
        .order("feature_key");
      if (error) throw error;
      return data as CreditCost[];
    },
  });
}

export function useUpsertCreditCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreditCost> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from("recruitment_credit_costs")
          .update({
            credits_per_use: input.credits_per_use,
            usage_unit: input.usage_unit,
            description: input.description,
            is_active: input.is_active,
            feature_key: input.feature_key,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recruitment_credit_costs").insert({
          feature_key: input.feature_key!,
          credit_type: input.credit_type || "universal",
          credits_per_use: input.credits_per_use!,
          usage_unit: input.usage_unit || "per_use",
          description: input.description,
          is_active: input.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_costs"] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteCreditCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_credit_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_costs"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

// ============ Packages ============
export function useCreditPackages() {
  return useQuery({
    queryKey: ["credit_packages_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_credit_packages")
        .select("*")
        .order("billing_interval")
        .order("display_order");
      if (error) throw error;
      return data as CreditPackage[];
    },
  });
}

export function useUpsertCreditPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreditPackage> & { id?: string }) => {
      const payload: any = {
        name: input.name,
        description: input.description,
        credit_type: input.credit_type || "universal",
        credits: input.credits,
        price_cents: input.price_cents,
        price_per_credit_cents: input.price_per_credit_cents ?? 0,
        bonus_percent: input.bonus_percent ?? 0,
        is_popular: input.is_popular ?? false,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
        billing_interval: input.billing_interval || "one_time",
        stripe_price_id: input.stripe_price_id,
        stripe_product_id: input.stripe_product_id,
      };
      let pkgId = input.id;
      if (input.id) {
        const { error } = await supabase.from("recruitment_credit_packages").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("recruitment_credit_packages").insert(payload).select("id").single();
        if (error) throw error;
        pkgId = data?.id;
      }
      // Sincroniza metadata.credits no Stripe (price + product) — best effort
      if (pkgId && input.stripe_price_id) {
        try {
          await supabase.functions.invoke("sync-stripe-metadata", { body: { package_id: pkgId } });
        } catch (e) {
          console.warn("[useUpsertCreditPackage] sync-stripe-metadata falhou:", e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_packages_admin"] });
      toast.success("Pacote salvo e Stripe sincronizado");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteCreditPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_credit_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_packages_admin"] });
      toast.success("Pacote removido");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

// ============ Plans ============
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription_plans_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_subscription_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
}

export function useUpsertSubscriptionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SubscriptionPlan> & { id?: string }) => {
      const payload: any = {
        name: input.name,
        description: input.description,
        price_cents: input.price_cents,
        included_seats: input.included_seats ?? 1,
        included_credits: input.included_credits || {},
        trial_days: input.trial_days ?? 15,
        is_active: input.is_active ?? true,
        is_default: input.is_default ?? false,
        sort_order: input.sort_order ?? 0,
      };
      if (input.id) {
        const { error } = await supabase.from("platform_subscription_plans").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_subscription_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans_admin"] });
      toast.success("Plano salvo");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}
