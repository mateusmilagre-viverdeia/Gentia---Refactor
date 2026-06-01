import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDITS-CHECK-SUB] ${step}${detailsStr}`);
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

  // Safe fallback payload — keeps the UI from blank-screening on transient auth/network errors.
  const safeFallback = (extra: Record<string, unknown> = {}) => new Response(
    JSON.stringify({
      has_subscription: false,
      status: null,
      package_name: null,
      credits_per_period: 0,
      current_period_end: null,
      fallback: true,
      ...extra,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No auth header — returning fallback");
      return safeFallback({ error: "NO_AUTH_HEADER" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      logStep("Auth failed — returning fallback", { error: userError ? JSON.stringify(userError) : "no_user" });
      return safeFallback({ error: "AUTH_FAILED" });
    }

    const { org_id } = await req.json().catch(() => ({}));
    if (!org_id) {
      logStep("Missing org_id — returning fallback");
      return safeFallback({ error: "ORG_ID_REQUIRED" });
    }

    // Get local subscription record
    const { data: sub } = await supabaseClient
      .from("org_credit_subscriptions")
      .select("*, recruitment_credit_packages(*)")
      .eq("org_id", org_id)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({
        has_subscription: false,
        status: null,
        package_name: null,
        credits_per_period: 0,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Optionally sync with Stripe for accuracy
    let stripeStatus = sub.status;
    let periodEnd = sub.current_period_end;

    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      stripeStatus = stripeSub.status;
      periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

      // Sync if different
      if (stripeStatus !== sub.status || periodEnd !== sub.current_period_end) {
        await supabaseClient
          .from("org_credit_subscriptions")
          .update({
            status: stripeStatus,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", org_id);
      }
    } catch (e) {
      logStep("Stripe sync failed, using local data", { error: String(e) });
    }

    const pkg = sub.recruitment_credit_packages;

    return new Response(JSON.stringify({
      has_subscription: true,
      status: stripeStatus,
      package_id: sub.package_id,
      package_name: pkg?.name || null,
      credits_per_period: sub.credits_per_period,
      current_period_end: periodEnd,
      stripe_subscription_id: sub.stripe_subscription_id,
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
