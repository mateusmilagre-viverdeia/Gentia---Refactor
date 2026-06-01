import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDITS-AUTO-RECHARGE] ${step}${detailsStr}`);
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

  let org_id: string | undefined;
  let triggered_by: string | undefined;
  let acquiredLock = false;

  const recordAttempt = async (
    status: string,
    extra: {
      reason?: string;
      invoice_id?: string;
      credits_added?: number;
      amount_charged?: number;
      error_message?: string;
    } = {}
  ) => {
    try {
      await supabaseClient.from("recruitment_auto_recharge_attempts").insert({
        org_id,
        triggered_by,
        status,
        reason: extra.reason ?? null,
        invoice_id: extra.invoice_id ?? null,
        credits_added: extra.credits_added ?? null,
        amount_charged: extra.amount_charged ?? null,
        error_message: extra.error_message ?? null,
      });

      const update: Record<string, unknown> = {
        last_recharge_at: new Date().toISOString(),
        last_recharge_status: status,
        last_recharge_reason: extra.reason ?? null,
      };
      if (extra.invoice_id) update.last_recharge_invoice_id = extra.invoice_id;
      if (acquiredLock) {
        update.recharge_in_progress = false;
        update.recharge_lock_until = null;
      }

      if (org_id) {
        await supabaseClient
          .from("org_auto_recharge_settings")
          .update(update)
          .eq("org_id", org_id);
      }
    } catch (err) {
      logStep("Failed to record attempt", { error: String(err) });
    }
  };

  const releaseLockOnly = async () => {
    if (!org_id || !acquiredLock) return;
    try {
      await supabaseClient
        .from("org_auto_recharge_settings")
        .update({ recharge_in_progress: false, recharge_lock_until: null })
        .eq("org_id", org_id);
    } catch {}
  };

  try {
    logStep("Function started");

    const body = await req.json();
    org_id = body.org_id;
    triggered_by = body.triggered_by;
    if (!org_id) throw new Error("org_id is required");
    logStep("Request data", { org_id, triggered_by });

    // 1. Load settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from("org_auto_recharge_settings")
      .select("*, recruitment_credit_packages(*)")
      .eq("org_id", org_id)
      .eq("enabled", true)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (!settings) {
      logStep("Auto-recharge not enabled");
      return new Response(JSON.stringify({ recharged: false, reason: "not_enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Acquire mutex (anti-double-charge): only proceed if no recharge is in progress
    //    OR the previous lock has expired.
    const lockUntil = new Date(Date.now() + 60_000).toISOString();
    const { data: locked, error: lockError } = await supabaseClient
      .from("org_auto_recharge_settings")
      .update({ recharge_in_progress: true, recharge_lock_until: lockUntil })
      .eq("org_id", org_id)
      .or(`recharge_in_progress.eq.false,recharge_lock_until.lt.${new Date().toISOString()}`)
      .select("id")
      .maybeSingle();

    if (lockError) throw lockError;
    if (!locked) {
      logStep("Lock not acquired, another recharge in progress");
      return new Response(JSON.stringify({ recharged: false, reason: "lock_active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    acquiredLock = true;

    // 3. Current balance
    const { data: creditData, error: creditError } = await supabaseClient
      .from("recruitment_usage_credits")
      .select("balance")
      .eq("account_id", org_id)
      .eq("credit_type", "universal")
      .maybeSingle();

    if (creditError) throw creditError;

    const currentBalance = Number(creditData?.balance || 0);
    logStep("Current balance", { currentBalance, threshold: settings.threshold });

    if (currentBalance >= Number(settings.threshold)) {
      await recordAttempt("skipped", { reason: "above_threshold" });
      return new Response(JSON.stringify({ recharged: false, reason: "above_threshold" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Validate package
    const pkg = settings.recruitment_credit_packages;
    if (!pkg || !pkg.stripe_price_id) {
      await recordAttempt("failed", { reason: "no_package", error_message: "Pacote de recarga não configurado" });
      return new Response(JSON.stringify({ recharged: false, reason: "no_package" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Stripe customer
    const { data: billingData, error: billingError } = await supabaseClient
      .from("org_billing")
      .select("stripe_customer_id")
      .eq("org_id", org_id)
      .maybeSingle();

    if (billingError) throw billingError;
    if (!billingData?.stripe_customer_id) {
      await recordAttempt("failed", { reason: "no_stripe_customer", error_message: "Cliente Stripe não encontrado" });
      return new Response(JSON.stringify({ recharged: false, reason: "no_stripe_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 6. Charge
    logStep("Creating Stripe invoice", { customer: billingData.stripe_customer_id, price: pkg.stripe_price_id });

    await stripe.invoiceItems.create({
      customer: billingData.stripe_customer_id,
      price: pkg.stripe_price_id,
      quantity: 1,
      description: `Recarga automática - ${pkg.name} (${pkg.credits} créditos)`,
    });

    const invoice = await stripe.invoices.create({
      customer: billingData.stripe_customer_id,
      auto_advance: true,
      collection_method: "charge_automatically",
      metadata: {
        org_id,
        auto_recharge: "true",
        package_id: settings.recharge_package_id,
        credits: String(pkg.credits),
      },
    });

    let paidInvoice;
    try {
      paidInvoice = await stripe.invoices.pay(invoice.id);
    } catch (payErr) {
      const msg = payErr instanceof Error ? payErr.message : String(payErr);
      logStep("Invoice payment threw", { error: msg });
      await recordAttempt("failed", {
        reason: "payment_failed",
        invoice_id: invoice.id,
        error_message: msg,
      });
      return new Response(JSON.stringify({ recharged: false, reason: "payment_failed", error: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }

    logStep("Invoice paid", { invoiceId: paidInvoice.id, status: paidInvoice.status });

    if (paidInvoice.status !== "paid") {
      await recordAttempt("failed", {
        reason: "payment_failed",
        invoice_id: paidInvoice.id,
        error_message: `status=${paidInvoice.status}`,
      });
      return new Response(JSON.stringify({
        recharged: false,
        reason: "payment_failed",
        invoice_status: paidInvoice.status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }

    // 7. Add credits (FIX: use p_metadata, not p_reference_id)
    const { data: addResult, error: addError } = await supabaseClient.rpc("add_credits", {
      p_account_id: org_id,
      p_credit_type: "universal",
      p_amount: pkg.credits,
      p_operation: "auto_recharge",
      p_description: `Recarga automática - ${pkg.name}`,
      p_metadata: {
        invoice_id: paidInvoice.id,
        package_id: settings.recharge_package_id,
        source: "auto_recharge",
      },
    });

    if (addError) {
      // Stripe charged but credits failed to post — record clearly so we can reconcile.
      logStep("add_credits failed AFTER successful Stripe charge", { error: addError.message, invoice: paidInvoice.id });
      await recordAttempt("failed", {
        reason: "credit_post_failed",
        invoice_id: paidInvoice.id,
        amount_charged: pkg.credits,
        error_message: `Stripe cobrou ${paidInvoice.id} mas add_credits falhou: ${addError.message}`,
      });
      throw addError;
    }

    logStep("Credits added", { credits: pkg.credits });

    await recordAttempt("success", {
      reason: "ok",
      invoice_id: paidInvoice.id,
      credits_added: pkg.credits,
      amount_charged: Number(paidInvoice.amount_paid || 0) / 100,
    });

    return new Response(JSON.stringify({
      recharged: true,
      credits_added: pkg.credits,
      package_name: pkg.name,
      invoice_id: paidInvoice.id,
      new_balance: addResult?.new_balance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    await releaseLockOnly();
    return new Response(JSON.stringify({ error: errorMessage, recharged: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
