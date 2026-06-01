import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDITS-CONSUME] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { 
      org_id, 
      credit_type, 
      amount,
      feature_key,
      reference_id,
      reference_type,
      description 
    } = await req.json();

    if (!org_id) throw new Error("org_id is required");
    if (!credit_type && !feature_key) throw new Error("credit_type or feature_key is required");
    logStep("Request data", { org_id, credit_type, amount, feature_key });

    let finalCreditType = credit_type;
    let finalAmount = amount;

    // If feature_key is provided, look up the credit type and cost
    if (feature_key) {
      const { data: costData, error: costError } = await supabaseClient
        .from("recruitment_credit_costs")
        .select("credit_type, credits_per_use")
        .eq("feature_key", feature_key)
        .eq("is_active", true)
        .single();

      if (costError || !costData) {
        throw new Error(`Feature key not found: ${feature_key}`);
      }

      finalCreditType = costData.credit_type;
      finalAmount = costData.credits_per_use;
      logStep("Feature cost lookup", { feature_key, credit_type: finalCreditType, amount: finalAmount });
    }

    if (!finalCreditType || !finalAmount) {
      throw new Error("Could not determine credit type or amount");
    }

    // ---- PREVENTIVE AUTO-RECHARGE ----
    // Check balance + auto-recharge settings BEFORE consuming.
    // If saldo - custo < threshold OR saldo < custo → tentar recarga ANTES de debitar.
    // Isso evita bloquear o candidato quando a recarga automática está ativa.
    const triggerRecharge = async (reason: string) => {
      try {
        const r = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/credits-auto-recharge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ org_id, triggered_by: `credits-consume:${reason}` }),
          }
        );
        const json = await r.json();
        logStep("Auto-recharge result", json);
        return json;
      } catch (rechargeErr) {
        logStep("Auto-recharge call failed", { error: String(rechargeErr) });
        return null;
      }
    };

    let preventiveRechargeResult: any = null;
    try {
      const [balanceRes, settingsRes] = await Promise.all([
        supabaseClient
          .from("recruitment_usage_credits")
          .select("balance")
          .eq("account_id", org_id)
          .eq("credit_type", finalCreditType)
          .maybeSingle(),
        supabaseClient
          .from("org_auto_recharge_settings")
          .select("enabled, threshold")
          .eq("org_id", org_id)
          .eq("enabled", true)
          .maybeSingle(),
      ]);

      const currentBalance = Number(balanceRes.data?.balance || 0);
      const settings = settingsRes.data;

      if (settings) {
        const threshold = Number(settings.threshold);
        const projected = currentBalance - Number(finalAmount);
        if (currentBalance < Number(finalAmount) || projected < threshold) {
          logStep("Preventive recharge triggered", {
            currentBalance,
            cost: finalAmount,
            threshold,
            projected,
          });
          preventiveRechargeResult = await triggerRecharge("preventive");
        }
      }
    } catch (preErr) {
      logStep("Preventive recharge check failed (non-blocking)", { error: String(preErr) });
    }

    // Consume credits using the database function
    const { data: result, error } = await supabaseClient.rpc('consume_credits', {
      p_account_id: org_id,
      p_credit_type: finalCreditType,
      p_amount: finalAmount,
      p_reference_id: reference_id || null,
      p_reference_type: reference_type || null,
      p_description: description || null,
      p_user_id: user.id
    });

    if (error) throw error;
    logStep("Consume result", result);

    // Check if consumption was successful
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        message: result.message,
        required: result.required,
        available: result.available,
        auto_recharge: preventiveRechargeResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402, // Payment Required
      });
    }

    // Defense-in-depth: also trigger recharge AFTER consume if we're still below threshold
    // and the preventive step didn't already top us up.
    let autoRechargeResult = preventiveRechargeResult;
    if (!preventiveRechargeResult?.recharged && result.balance_after !== undefined) {
      const { data: rechargeSettings } = await supabaseClient
        .from("org_auto_recharge_settings")
        .select("enabled, threshold")
        .eq("org_id", org_id)
        .eq("enabled", true)
        .maybeSingle();

      if (rechargeSettings && Number(result.balance_after) < Number(rechargeSettings.threshold)) {
        logStep("Post-consume recharge triggered", {
          balance: result.balance_after,
          threshold: rechargeSettings.threshold,
        });
        autoRechargeResult = await triggerRecharge("post-consume");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      balance_before: result.balance_before,
      balance_after: result.balance_after,
      consumed: result.consumed,
      auto_recharge: autoRechargeResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
