import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("sync-after-checkout");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { org_id } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is member of this org
    const { data: membership } = await supabase
      .from("account_members")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("account_id", org_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      // Also check if user is org owner
      const { data: org } = await supabase
        .from("companies")
        .select("id")
        .eq("id", org_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!org) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userEmail = userData.user.email;
    log.log("Syncing after checkout", { org_id, email: userEmail });

    // Find Stripe customer by email
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      log.log("No Stripe customer found", { email: userEmail });
      return new Response(JSON.stringify({ synced: false, reason: "no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing if no active found
    let subscription: Stripe.Subscription | null = subscriptions.data[0] || null;
    if (!subscription) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      subscription = trialingSubs.data[0] || null;
    }

    if (!subscription) {
      log.log("No active/trialing subscription found", { customerId });
      return new Response(JSON.stringify({ synced: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.log("Found subscription", {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId,
    });

    // Upsert org_billing
    const isTrialing = subscription.status === "trialing";
    const { error: upsertError } = await supabase
      .from("org_billing")
      .upsert({
        org_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: isTrialing ? "trialing" : "active",
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        blocked_at: null,
        grace_until: null,
      }, { onConflict: "org_id" });

    if (upsertError) {
      log.error("Error upserting org_billing", upsertError);
      return new Response(JSON.stringify({ synced: false, error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.log("Successfully synced billing", { org_id, subscriptionId: subscription.id });

    return new Response(JSON.stringify({
      synced: true,
      status: isTrialing ? "trialing" : "active",
      subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("Unexpected error", e);
    return new Response(JSON.stringify({ synced: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
