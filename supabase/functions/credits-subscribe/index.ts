import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDITS-SUBSCRIBE] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { org_id, package_id } = await req.json();
    if (!org_id) throw new Error("org_id is required");
    if (!package_id) throw new Error("package_id is required");

    // Get package details
    const { data: pkg, error: pkgError } = await supabaseClient
      .from("recruitment_credit_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();

    if (pkgError || !pkg) throw new Error("Package not found or inactive");
    if (!pkg.stripe_price_id) throw new Error("Package has no Stripe price configured");
    logStep("Package found", { name: pkg.name, credits: pkg.credits, priceId: pkg.stripe_price_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if org already has a credit subscription
    const { data: existingSub } = await supabaseClient
      .from("org_credit_subscriptions")
      .select("*")
      .eq("org_id", org_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub?.stripe_subscription_id) {
      // UPGRADE/DOWNGRADE: Update existing subscription with pro-rata
      logStep("Existing subscription found, updating with proration", {
        currentSubId: existingSub.stripe_subscription_id,
        currentCredits: existingSub.credits_per_period,
        newCredits: pkg.credits,
      });

      const subscription = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);
      const currentItem = subscription.items.data[0];

      if (!currentItem) throw new Error("No subscription item found");

      // If same price, no change needed
      if (currentItem.price.id === pkg.stripe_price_id) {
        return new Response(JSON.stringify({
          success: true,
          message: "Already on this plan",
          action: "none"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const previousCredits = Number(existingSub.credits_per_period || 0);
      const newCredits = Number(pkg.credits || 0);
      const isUpgrade = newCredits > previousCredits;

      // Update subscription. For upgrades, use 'always_invoice' so Stripe charges the
      // pro-rata difference immediately. For downgrades, keep 'create_prorations' so
      // the credit shows up in the next regular invoice (no immediate refund).
      await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
        items: [{
          id: currentItem.id,
          price: pkg.stripe_price_id,
        }],
        proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
        metadata: {
          org_id,
          package_id,
          credit_type: pkg.credit_type,
          credits: pkg.credits.toString(),
          type: "credit_subscription",
        },
      });

      // Compute proportional remaining ratio of the current billing period
      const periodStart = Number((subscription as any).current_period_start || 0);
      const periodEnd = Number((subscription as any).current_period_end || 0);
      const nowSec = Math.floor(Date.now() / 1000);
      let remainingRatio = 0;
      if (periodEnd > periodStart && periodEnd > nowSec) {
        remainingRatio = (periodEnd - nowSec) / (periodEnd - periodStart);
        if (remainingRatio < 0) remainingRatio = 0;
        if (remainingRatio > 1) remainingRatio = 1;
      }

      let deltaCredited = 0;
      if (isUpgrade && remainingRatio > 0) {
        deltaCredited = Math.round((newCredits - previousCredits) * remainingRatio);
        if (deltaCredited > 0) {
          logStep("Crediting proportional upgrade delta", { deltaCredited, remainingRatio, previousCredits, newCredits });
          const { error: addError } = await supabaseClient.rpc('add_credits', {
            p_account_id: org_id,
            p_credit_type: 'universal',
            p_amount: deltaCredited,
            p_operation: 'subscription_upgrade_proration',
            p_description: `Upgrade pro-rata: +${deltaCredited} créditos (${pkg.name})`,
          });
          if (addError) {
            logStep("ERROR crediting upgrade delta (logged, not thrown)", { error: addError.message });
            await supabaseClient.from("billing_events").insert({
              org_id,
              event_type: "credit_add_failed",
              payload: { error: addError.message, credits: deltaCredited, operation: 'subscription_upgrade_proration' },
            });
            deltaCredited = 0;
          }
        }
      }

      // Update local record
      await supabaseClient
        .from("org_credit_subscriptions")
        .update({
          package_id,
          credits_per_period: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", org_id);

      // Log event
      await supabaseClient.from("billing_events").insert({
        org_id,
        event_type: isUpgrade ? "credit_plan_upgraded" : "credit_plan_downgraded",
        payload: {
          previous_credits: previousCredits,
          new_credits: newCredits,
          package_name: pkg.name,
          remaining_ratio: remainingRatio,
          delta_credited: deltaCredited,
          proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
        },
      });

      logStep("Subscription updated with proration", { newPlan: pkg.name, isUpgrade, deltaCredited, remainingRatio });

      return new Response(JSON.stringify({
        success: true,
        message: isUpgrade
          ? `Upgrade aplicado. ${deltaCredited > 0 ? `+${deltaCredited} créditos pro-rata adicionados.` : ''}`
          : "Downgrade agendado para o próximo ciclo.",
        action: "updated",
        delta_credited: deltaCredited,
        remaining_ratio: remainingRatio,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // NEW SUBSCRIPTION: Create Stripe Checkout Session
    logStep("No existing subscription, creating checkout session");

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://gentia.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price: pkg.stripe_price_id,
        quantity: 1,
      }],
      mode: "subscription",
      subscription_data: {
        metadata: {
          org_id,
          package_id,
          credit_type: pkg.credit_type,
          credits: pkg.credits.toString(),
          type: "credit_subscription",
        },
      },
      success_url: `${origin}/atracao-contratacao/recrutamento?credits_success=true&plan=${pkg.name}`,
      cancel_url: `${origin}/atracao-contratacao/recrutamento?credits_canceled=true`,
      metadata: {
        org_id,
        package_id,
        credit_type: pkg.credit_type,
        credits: pkg.credits.toString(),
        type: "credit_subscription",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    await supabaseClient.from("billing_events").insert({
      org_id,
      event_type: "credit_subscription_checkout_created",
      payload: {
        session_id: session.id,
        package_name: pkg.name,
        credits: pkg.credits,
        price_cents: pkg.price_cents,
      },
    });

    return new Response(JSON.stringify({ url: session.url, action: "checkout" }), {
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
