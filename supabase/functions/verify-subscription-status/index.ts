import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("verify-subscription-status");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { org_id } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ active: false, error: "org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Check for active admin grant
    const { data: grants } = await supabase
      .from("admin_grants")
      .select("id, expires_at")
      .eq("org_id", org_id)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (grants && grants.length > 0) {
      log.log("Org has active admin grant", { org_id });
      // If org is blocked but has grant, fix it
      await supabase
        .from("org_billing")
        .update({ status: "active", blocked_at: null })
        .eq("org_id", org_id)
        .eq("status", "blocked");
      
      return new Response(JSON.stringify({ active: true, reason: "admin_grant", expires_at: grants[0].expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check for active partner grant
    const { data: partnerGrants } = await supabase
      .from("partner_client_grants")
      .select("id, expires_at")
      .eq("org_id", org_id)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (partnerGrants && partnerGrants.length > 0) {
      log.log("Org has active partner grant", { org_id });
      await supabase
        .from("org_billing")
        .update({ status: "active", blocked_at: null })
        .eq("org_id", org_id)
        .eq("status", "blocked");

      return new Response(JSON.stringify({ active: true, reason: "partner_grant", expires_at: partnerGrants[0].expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check Stripe subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const { data: billing } = await supabase
      .from("org_billing")
      .select("stripe_subscription_id, stripe_customer_id, status")
      .eq("org_id", org_id)
      .maybeSingle();

    if (billing?.stripe_subscription_id && stripeKey) {
      // Direct lookup by subscription ID
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${billing.stripe_subscription_id}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const sub = await stripeRes.json();

      if (sub.status === "active" || sub.status === "trialing") {
        log.log("Stripe subscription active, syncing locally", { org_id, stripe_status: sub.status });
        await supabase
          .from("org_billing")
          .update({
            status: "active",
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            blocked_at: null,
            grace_until: null,
          })
          .eq("org_id", org_id);

        return new Response(JSON.stringify({ active: true, reason: "stripe_active" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log.log("Stripe subscription not active", { org_id, stripe_status: sub.status });
    }

    // 4. Fallback: lookup Stripe by org owner email when no stripe_subscription_id
    if (!billing?.stripe_subscription_id && stripeKey) {
      log.log("No stripe_subscription_id, trying email fallback", { org_id });

      // Find org owner
      const { data: org } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", org_id)
        .maybeSingle();

      if (org?.user_id) {
        const { data: ownerData } = await supabase.auth.admin.getUserById(org.user_id);
        const ownerEmail = ownerData?.user?.email;

        if (ownerEmail) {
          log.log("Looking up Stripe customer by email", { email: ownerEmail });

          const customerRes = await fetch(
            `https://api.stripe.com/v1/customers?email=${encodeURIComponent(ownerEmail)}&limit=1`,
            { headers: { Authorization: `Bearer ${stripeKey}` } }
          );
          const customerData = await customerRes.json();

          if (customerData.data?.length > 0) {
            const customerId = customerData.data[0].id;

            // Check for active subscription
            const subsRes = await fetch(
              `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
              { headers: { Authorization: `Bearer ${stripeKey}` } }
            );
            const subsData = await subsRes.json();

            let activeSub = subsData.data?.[0];

            // Also check trialing
            if (!activeSub) {
              const trialRes = await fetch(
                `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=trialing&limit=1`,
                { headers: { Authorization: `Bearer ${stripeKey}` } }
              );
              const trialData = await trialRes.json();
              activeSub = trialData.data?.[0];
            }

            if (activeSub) {
              log.log("Found active subscription via email fallback, syncing", {
                org_id,
                subscriptionId: activeSub.id,
                status: activeSub.status,
              });

              await supabase
                .from("org_billing")
                .upsert({
                  org_id,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: activeSub.id,
                  status: "active",
                  current_period_end: activeSub.current_period_end
                    ? new Date(activeSub.current_period_end * 1000).toISOString()
                    : null,
                  blocked_at: null,
                  grace_until: null,
                }, { onConflict: "org_id" });

              return new Response(JSON.stringify({ active: true, reason: "stripe_email_fallback" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ active: false, reason: "no_active_subscription_or_grant" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("Unexpected error", e);
    return new Response(JSON.stringify({ active: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
