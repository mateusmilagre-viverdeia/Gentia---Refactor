// Edge function de simulação da Recarga Automática.
// SOMENTE em modo Test do Stripe. Restrito a super_admin.
// Roda cenários ponta-a-ponta e restaura o saldo no final.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Scenario =
  | "preventive_recharge"
  | "concurrent_mutex"
  | "add_credits_fix"
  | "payment_failure"
  | "full_flow";

interface Step {
  name: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

const log = (msg: string, data?: unknown) =>
  console.log(`[AUTO-RECHARGE-SIM] ${msg}${data ? " " + JSON.stringify(data) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const t0 = Date.now();
  const steps: Step[] = [];
  const stripeCharges: Array<{ invoiceId: string; amount: number; status: string }> = [];

  const pushStep = (name: string, ok: boolean, extra: Partial<Step> = {}) => {
    steps.push({ name, ok, ...extra });
    log(`step ${name} ok=${ok}`, extra);
  };

  // -------- AUTH --------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ success: false, error: "No auth header" }, 401);
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json({ success: false, error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = new Set((rolesData ?? []).map((r: any) => r.role));
  if (!roles.has("super_admin")) {
    return json({ success: false, error: "Only super_admin can run simulations" }, 403);
  }

  // -------- BODY --------
  let body: { scenario?: Scenario; org_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }
  const scenario = body.scenario ?? "preventive_recharge";
  const org_id = body.org_id;
  if (!org_id) return json({ success: false, error: "org_id is required" }, 400);

  // -------- STRIPE TEST MODE GUARD --------
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ success: false, error: "STRIPE_SECRET_KEY not set" }, 500);
  if (!stripeKey.startsWith("sk_test_")) {
    return json(
      {
        success: false,
        error:
          "Simulação bloqueada: STRIPE_SECRET_KEY não está em modo Test (sk_test_). " +
          "Troque temporariamente para uma chave de teste antes de rodar.",
      },
      400,
    );
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // -------- PRECHECKS --------
  const { data: settings } = await supabase
    .from("org_auto_recharge_settings")
    .select("*, recruitment_credit_packages(*)")
    .eq("org_id", org_id)
    .maybeSingle();

  const { data: billing } = await supabase
    .from("org_billing")
    .select("stripe_customer_id")
    .eq("org_id", org_id)
    .maybeSingle();

  const checklist = {
    auto_recharge_enabled: !!settings?.enabled,
    package_configured: !!settings?.recharge_package_id && !!settings?.recruitment_credit_packages?.stripe_price_id,
    threshold: Number(settings?.threshold ?? 0),
    stripe_customer_id: billing?.stripe_customer_id ?? null,
  };
  pushStep("prechecks", checklist.auto_recharge_enabled && checklist.package_configured && !!checklist.stripe_customer_id, { data: checklist });
  if (!steps[0].ok) {
    return json({
      scenario,
      success: false,
      error: "Pré-requisitos não atendidos. Confira a checklist.",
      steps,
      duration_ms: Date.now() - t0,
    });
  }

  // -------- SNAPSHOT --------
  const { data: creditRow } = await supabase
    .from("recruitment_usage_credits")
    .select("balance")
    .eq("account_id", org_id)
    .eq("credit_type", "universal")
    .maybeSingle();
  const initialBalance = Number(creditRow?.balance ?? 0);
  pushStep("snapshot_initial_balance", true, { data: { balance: initialBalance } });

  // Helpers
  const forceLowBalance = async (target = 0) => {
    const { data: row } = await supabase
      .from("recruitment_usage_credits")
      .select("balance")
      .eq("account_id", org_id)
      .eq("credit_type", "universal")
      .maybeSingle();
    const current = Number(row?.balance ?? 0);
    const diff = current - target;
    if (diff > 0) {
      // debita via update direto (não passa por consume RPC pra evitar disparo de auto-recharge)
      await supabase
        .from("recruitment_usage_credits")
        .update({ balance: target })
        .eq("account_id", org_id)
        .eq("credit_type", "universal");
    } else if (diff < 0) {
      await supabase
        .from("recruitment_usage_credits")
        .update({ balance: target })
        .eq("account_id", org_id)
        .eq("credit_type", "universal");
    }
    return { previous: current, target };
  };

  const releaseRechargeLock = async () => {
    await supabase
      .from("org_auto_recharge_settings")
      .update({ recharge_in_progress: false, recharge_lock_until: null })
      .eq("org_id", org_id);
  };

  const invokeRecharge = async () => {
    const r = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/credits-auto-recharge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ org_id, triggered_by: "simulation" }),
      },
    );
    return await r.json();
  };

  const invokeConsume = async (feature_key: string) => {
    const r = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/credits-consume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader, // forward user token (consume valida user)
        },
        body: JSON.stringify({ org_id, feature_key }),
      },
    );
    return { status: r.status, body: await r.json() };
  };

  // -------- SCENARIOS --------
  const runPreventive = async () => {
    await releaseRechargeLock();
    await forceLowBalance(1); // saldo 1 → abaixo do custo de qualquer feature
    pushStep("force_low_balance_preventive", true, { data: { newBalance: 1 } });

    const beforeAttempts = await supabase
      .from("recruitment_auto_recharge_attempts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id);

    const consume = await invokeConsume("culture_interview_realtime");
    pushStep("invoke_consume", consume.status === 200, {
      data: { status: consume.status, message: consume.body?.message, auto_recharge: consume.body?.auto_recharge },
    });

    // verifica audit log
    const { data: lastAttempt } = await supabase
      .from("recruitment_auto_recharge_attempts")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    pushStep("verify_audit_log", lastAttempt?.status === "success", { data: lastAttempt });

    if (lastAttempt?.invoice_id) {
      stripeCharges.push({
        invoiceId: lastAttempt.invoice_id,
        amount: Number(lastAttempt.amount_charged ?? 0),
        status: lastAttempt.status,
      });
    }
  };

  const runConcurrent = async () => {
    await releaseRechargeLock();
    await forceLowBalance(1);
    pushStep("force_low_balance_concurrent", true, { data: { newBalance: 1 } });

    const results = await Promise.all([invokeRecharge(), invokeRecharge(), invokeRecharge()]);
    const recharged = results.filter((r) => r?.recharged === true).length;
    const locked = results.filter((r) => r?.reason === "lock_active").length;
    pushStep("concurrent_calls", recharged === 1, {
      data: { results, recharged_count: recharged, lock_active_count: locked },
    });
  };

  const runAddCreditsFix = async () => {
    await releaseRechargeLock();
    await forceLowBalance(1);

    const result = await invokeRecharge();
    pushStep("invoke_recharge", result?.recharged === true, { data: result });

    // procura por linha auto_recharge mais recente
    const { data: usage } = await supabase
      .from("recruitment_usage_log")
      .select("id, operation, amount, metadata, created_at")
      .eq("account_id", org_id)
      .eq("operation", "auto_recharge")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const hasInvoice = !!(usage?.metadata as any)?.invoice_id;
    pushStep("verify_metadata_invoice_id", hasInvoice, { data: usage });

    if ((usage?.metadata as any)?.invoice_id) {
      stripeCharges.push({
        invoiceId: (usage!.metadata as any).invoice_id,
        amount: Number(usage!.amount ?? 0),
        status: "credited",
      });
    }
  };

  const runPaymentFailure = async () => {
    await releaseRechargeLock();
    await forceLowBalance(1);

    // anexa cartão "always declines" e marca como default
    const customer = billing!.stripe_customer_id!;
    let originalDefault: string | null = null;
    let attachedPm: string | null = null;
    try {
      const cust = await stripe.customers.retrieve(customer);
      // @ts-ignore
      originalDefault = (cust as any).invoice_settings?.default_payment_method ?? null;

      const pm = await stripe.paymentMethods.create({
        type: "card",
        card: { token: "tok_chargeDeclined" },
      });
      await stripe.paymentMethods.attach(pm.id, { customer });
      await stripe.customers.update(customer, {
        invoice_settings: { default_payment_method: pm.id },
      });
      attachedPm = pm.id;
      pushStep("attach_declined_card", true, { data: { pm_id: pm.id } });

      const result = await invokeRecharge();
      pushStep("invoke_recharge_expect_failure", result?.recharged === false, { data: result });

      const { data: lastAttempt } = await supabase
        .from("recruitment_auto_recharge_attempts")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      pushStep("verify_failed_attempt_logged", lastAttempt?.status === "failed", { data: lastAttempt });
    } catch (e) {
      pushStep("payment_failure_setup", false, { error: String(e) });
    } finally {
      // restaura cartão original
      try {
        if (originalDefault) {
          await stripe.customers.update(customer, {
            invoice_settings: { default_payment_method: originalDefault },
          });
        }
        if (attachedPm) {
          await stripe.paymentMethods.detach(attachedPm);
        }
        pushStep("restore_default_payment_method", true);
      } catch (e) {
        pushStep("restore_default_payment_method", false, { error: String(e) });
      }
    }
  };

  // -------- DISPATCH --------
  try {
    if (scenario === "preventive_recharge" || scenario === "full_flow") await runPreventive();
    if (scenario === "concurrent_mutex" || scenario === "full_flow") await runConcurrent();
    if (scenario === "add_credits_fix" || scenario === "full_flow") await runAddCreditsFix();
    if (scenario === "payment_failure" || scenario === "full_flow") await runPaymentFailure();
  } catch (e) {
    pushStep("scenario_exception", false, { error: String(e) });
  } finally {
    // -------- RESTORE --------
    try {
      await releaseRechargeLock();
      await supabase
        .from("recruitment_usage_credits")
        .update({ balance: initialBalance })
        .eq("account_id", org_id)
        .eq("credit_type", "universal");
      pushStep("restore_initial_balance", true, { data: { balance: initialBalance } });
    } catch (e) {
      pushStep("restore_initial_balance", false, { error: String(e) });
    }
  }

  const success = steps.every((s) => s.ok);
  return json({
    scenario,
    success,
    org_id,
    stripe_mode: "test",
    steps,
    stripeCharges,
    duration_ms: Date.now() - t0,
  });
});
