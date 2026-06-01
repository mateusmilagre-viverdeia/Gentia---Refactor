import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("stripe-reconcile");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

interface ReconcileIssue {
  type: string;
  subscription_id?: string;
  org_id?: string;
  customer_email?: string;
  db_status?: string;
  stripe_status?: string;
  details?: string;
}

interface FixedItem {
  type: string;
  org_id?: string;
  subscription_id?: string;
  details?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_ep_admin")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.is_ep_admin) {
      throw new Error("Only EP admins can run reconciliation");
    }

    logStep("Admin verified", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "check";
    const issues: ReconcileIssue[] = [];
    const fixed: FixedItem[] = [];

    logStep("Starting reconciliation", { mode });

    // 1. Buscar todas as assinaturas do Stripe
    logStep("Fetching Stripe subscriptions");
    const stripeSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const subs = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });
      stripeSubscriptions.push(...subs.data);
      hasMore = subs.has_more;
      if (subs.data.length > 0) {
        startingAfter = subs.data[subs.data.length - 1].id;
      }
    }

    logStep("Stripe subscriptions fetched", { total: stripeSubscriptions.length });

    // 2. Buscar todos os registros de org_billing
    logStep("Fetching org_billing records");
    const { data: billingRecords, error: billingError } = await supabase
      .from("org_billing")
      .select("*, companies:org_id(id, name, user_id)");

    if (billingError) {
      throw new Error(`Error fetching billing records: ${billingError.message}`);
    }

    logStep("Billing records fetched", { total: billingRecords?.length || 0 });

    // 3. Buscar todas as empresas (para encontrar as que não têm billing)
    const { data: allCompanies } = await supabase
      .from("companies")
      .select("id, name, user_id");

    logStep("Companies fetched", { total: allCompanies?.length || 0 });

    // Criar mapa de subscription_id -> billing_record
    const billingBySubscription = new Map<string, typeof billingRecords[0]>();
    const billingByOrgId = new Map<string, typeof billingRecords[0]>();
    
    (billingRecords || []).forEach(b => {
      if (b.stripe_subscription_id) {
        billingBySubscription.set(b.stripe_subscription_id, b);
      }
      billingByOrgId.set(b.org_id, b);
    });

    // 4. Verificar cada assinatura ativa/trialing do Stripe
    logStep("Checking Stripe subscriptions against database");
    
    for (const sub of stripeSubscriptions) {
      // Ignorar assinaturas canceladas ou incompletas
      if (!["active", "trialing", "past_due"].includes(sub.status)) {
        continue;
      }

      const orgId = sub.metadata?.org_id;
      const billingRecord = billingBySubscription.get(sub.id);
      const customer = sub.customer as Stripe.Customer;

      if (!billingRecord) {
        if (orgId) {
          // Assinatura existe no Stripe com org_id mas não tem registro no banco
          issues.push({
            type: "missing_billing_record",
            subscription_id: sub.id,
            org_id: orgId,
            customer_email: customer.email || undefined,
            stripe_status: sub.status,
            details: `Assinatura ${sub.id} para org ${orgId} não tem registro em org_billing`,
          });

          if (mode === "sync") {
            logStep("Creating missing billing record", { orgId, subscriptionId: sub.id });
            
            const { error: insertError } = await supabase.from("org_billing").insert({
              org_id: orgId,
              stripe_customer_id: customer.id,
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
              trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            });

            if (!insertError) {
              fixed.push({ 
                type: "created_billing_record", 
                org_id: orgId,
                subscription_id: sub.id,
                details: "Registro criado com sucesso",
              });
            } else {
              logStep("Error creating billing record", { error: insertError.message });
            }
          }
        } else {
          // Assinatura sem org_id no metadata - precisa de atenção manual
          issues.push({
            type: "subscription_without_org_id",
            subscription_id: sub.id,
            customer_email: customer.email || undefined,
            stripe_status: sub.status,
            details: `Assinatura ${sub.id} não tem org_id no metadata. Email: ${customer.email}`,
          });
        }
      } else {
        // Verificar se o status está correto
        const expectedStatus = sub.status;
        const dbStatus = billingRecord.status;

        if (dbStatus !== expectedStatus) {
          issues.push({
            type: "status_mismatch",
            subscription_id: sub.id,
            org_id: billingRecord.org_id,
            db_status: dbStatus,
            stripe_status: expectedStatus,
            details: `Status no banco (${dbStatus}) diferente do Stripe (${expectedStatus})`,
          });

          if (mode === "sync") {
            logStep("Updating status mismatch", { orgId: billingRecord.org_id, from: dbStatus, to: expectedStatus });
            
            const { error: updateError } = await supabase
              .from("org_billing")
              .update({
                status: expectedStatus,
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("org_id", billingRecord.org_id);

            if (!updateError) {
              fixed.push({ 
                type: "updated_status", 
                org_id: billingRecord.org_id,
                details: `Status atualizado de ${dbStatus} para ${expectedStatus}`,
              });
            }
          }
        }

        // Verificar se current_period_end está correto
        const stripeEndDate = new Date(sub.current_period_end * 1000).toISOString().split('T')[0];
        const dbEndDate = billingRecord.current_period_end?.split('T')[0];

        if (dbEndDate && dbEndDate !== stripeEndDate) {
          issues.push({
            type: "period_end_mismatch",
            subscription_id: sub.id,
            org_id: billingRecord.org_id,
            details: `current_period_end no banco (${dbEndDate}) diferente do Stripe (${stripeEndDate})`,
          });

          if (mode === "sync") {
            await supabase
              .from("org_billing")
              .update({
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("org_id", billingRecord.org_id);

            fixed.push({ 
              type: "updated_period_end", 
              org_id: billingRecord.org_id,
              details: `Período atualizado para ${stripeEndDate}`,
            });
          }
        }
      }
    }

    // 5. Verificar registros no banco que dizem estar ativos mas a assinatura no Stripe não está
    logStep("Checking for orphan billing records");
    
    for (const record of billingRecords || []) {
      if (record.stripe_subscription_id && ["active", "trialing"].includes(record.status)) {
        const stripeSub = stripeSubscriptions.find(s => s.id === record.stripe_subscription_id);
        
        if (!stripeSub) {
          issues.push({
            type: "orphan_billing_record_no_subscription",
            org_id: record.org_id,
            subscription_id: record.stripe_subscription_id,
            db_status: record.status,
            details: `Registro marcado como ${record.status} mas assinatura ${record.stripe_subscription_id} não existe no Stripe`,
          });

          if (mode === "sync") {
            await supabase
              .from("org_billing")
              .update({
                status: "canceled",
                updated_at: new Date().toISOString(),
              })
              .eq("org_id", record.org_id);

            fixed.push({ 
              type: "marked_as_canceled", 
              org_id: record.org_id,
              details: "Registro marcado como cancelado pois assinatura não existe",
            });
          }
        } else if (!["active", "trialing", "past_due"].includes(stripeSub.status)) {
          issues.push({
            type: "orphan_billing_record_inactive_subscription",
            org_id: record.org_id,
            subscription_id: record.stripe_subscription_id,
            db_status: record.status,
            stripe_status: stripeSub.status,
            details: `Registro marcado como ${record.status} mas assinatura está ${stripeSub.status} no Stripe`,
          });

          if (mode === "sync") {
            await supabase
              .from("org_billing")
              .update({
                status: stripeSub.status,
                updated_at: new Date().toISOString(),
              })
              .eq("org_id", record.org_id);

            fixed.push({ 
              type: "synced_status", 
              org_id: record.org_id,
              details: `Status sincronizado para ${stripeSub.status}`,
            });
          }
        }
      }
    }

    // 6. Empresas sem registro de billing
    logStep("Checking companies without billing records");
    
    for (const company of allCompanies || []) {
      if (!billingByOrgId.has(company.id)) {
        issues.push({
          type: "company_without_billing",
          org_id: company.id,
          details: `Empresa "${company.name}" não tem registro em org_billing`,
        });

        // Não criar automaticamente - pode ser empresa em trial inicial sem checkout
      }
    }

    logStep("Reconciliation completed", { 
      issues_found: issues.length, 
      fixed_count: fixed.length 
    });

    // Agrupar issues por tipo para o relatório
    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return new Response(JSON.stringify({
      success: true,
      mode,
      summary: {
        total_stripe_subscriptions: stripeSubscriptions.length,
        active_stripe_subscriptions: stripeSubscriptions.filter(s => 
          ["active", "trialing", "past_due"].includes(s.status)
        ).length,
        total_billing_records: billingRecords?.length || 0,
        total_companies: allCompanies?.length || 0,
        issues_found: issues.length,
        issues_by_type: issuesByType,
        fixed_count: fixed.length,
      },
      issues,
      fixed,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
