import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AutoRechargeScenario =
  | "preventive_recharge"
  | "concurrent_mutex"
  | "add_credits_fix"
  | "payment_failure"
  | "full_flow";

export interface AutoRechargeSimulationResult {
  scenario: AutoRechargeScenario;
  success: boolean;
  org_id?: string;
  stripe_mode?: string;
  error?: string;
  steps: Array<{ name: string; ok: boolean; data?: unknown; error?: string }>;
  stripeCharges?: Array<{ invoiceId: string; amount: number; status: string }>;
  duration_ms?: number;
}

export function useAutoRechargeSimulation() {
  return useMutation({
    mutationFn: async (params: { scenario: AutoRechargeScenario; org_id: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "test-auto-recharge-simulation",
        { body: params },
      );
      if (error) throw error;
      return data as AutoRechargeSimulationResult;
    },
  });
}
