import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FeatureLLMMapping = {
  feature_key: string;
  model_id: string;
  avg_tokens_input: number | null;
  avg_tokens_output: number | null;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
};

export function useFeatureLLMMapping() {
  return useQuery({
    queryKey: ["feature_llm_mapping"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_llm_mapping" as any)
        .select("*")
        .order("feature_key");
      if (error) throw error;
      return (data ?? []) as unknown as FeatureLLMMapping[];
    },
  });
}

export function useUpsertFeatureLLMMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FeatureLLMMapping> & { feature_key: string; model_id: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        feature_key: input.feature_key,
        model_id: input.model_id,
        avg_tokens_input: input.avg_tokens_input ?? null,
        avg_tokens_output: input.avg_tokens_output ?? null,
        notes: input.notes ?? null,
        updated_by: u.user?.id ?? null,
      };
      const { error } = await supabase
        .from("feature_llm_mapping" as any)
        .upsert(payload, { onConflict: "feature_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature_llm_mapping"] });
      toast.success("Mapeamento de modelo salvo");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export type LLMPricingAlert = {
  id: string;
  model: string;
  field: string;
  current_value_usd: number;
  detected_value_usd: number;
  delta_pct: number | null;
  source_url: string;
  raw_excerpt: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

export function useLLMPricingAlerts(includeAcked = false) {
  return useQuery({
    queryKey: ["llm_pricing_alerts", includeAcked],
    queryFn: async () => {
      let q = supabase.from("llm_pricing_alerts" as any).select("*").order("detected_at", { ascending: false });
      if (!includeAcked) q = q.is("acknowledged_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LLMPricingAlert[];
    },
  });
}

export function useAckPricingAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("llm_pricing_alerts" as any)
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: u.user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm_pricing_alerts"] });
      toast.success("Alerta confirmado");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}
