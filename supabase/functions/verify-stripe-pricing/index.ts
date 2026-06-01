// Audit: compares recruitment_credit_packages (DB) vs Stripe live prices.
// Auth: x-cron-secret header (CRON_SECRET) OR super_admin JWT.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const headerSecret = req.headers.get("x-cron-secret");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let authorized = !!cronSecret && headerSecret === cronSecret;

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: u } = await admin.auth.getUser(token);
        if (u?.user) {
          const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: u.user.id });
          authorized = isAdmin === true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: packages, error: pkgErr } = await admin
      .from("recruitment_credit_packages")
      .select("id, name, credits, price_cents, stripe_price_id, stripe_product_id")
      .not("stripe_price_id", "is", null)
      .neq("stripe_price_id", "")
      .order("price_cents", { ascending: true });
    if (pkgErr) throw pkgErr;

    const report: any[] = [];
    for (const pkg of packages ?? []) {
      const row: any = {
        package: pkg.name,
        db_credits: pkg.credits,
        db_price_cents: pkg.price_cents,
        stripe_price_id: pkg.stripe_price_id,
      };
      try {
        const price = await stripe.prices.retrieve(pkg.stripe_price_id, { expand: ["product"] });
        row.stripe_unit_amount = price.unit_amount;
        row.stripe_currency = price.currency;
        row.stripe_active = price.active;
        row.stripe_recurring = price.recurring?.interval ?? null;
        row.stripe_metadata_credits = price.metadata?.credits
          ? Number(price.metadata.credits)
          : null;
        const prod: any = price.product;
        row.stripe_product_id = typeof prod === "string" ? prod : prod?.id;
        row.stripe_product_metadata_credits = prod?.metadata?.credits
          ? Number(prod.metadata.credits)
          : null;

        const effectiveStripeCredits =
          row.stripe_metadata_credits ?? row.stripe_product_metadata_credits;
        row.mismatches = [];
        if (price.unit_amount !== pkg.price_cents)
          row.mismatches.push(`price: db=${pkg.price_cents} stripe=${price.unit_amount}`);
        if (effectiveStripeCredits !== null && effectiveStripeCredits !== pkg.credits)
          row.mismatches.push(`credits: db=${pkg.credits} stripe=${effectiveStripeCredits}`);
        if (effectiveStripeCredits === null)
          row.mismatches.push("credits: stripe metadata missing");
        if (!price.active) row.mismatches.push("stripe price inactive");
        row.ok = row.mismatches.length === 0;
      } catch (e: any) {
        row.error = e?.message ?? String(e);
        row.ok = false;
      }
      report.push(row);
    }

    // Audit active subscriptions: credits_per_period vs package.credits
    const { data: subs } = await admin
      .from("org_credit_subscriptions")
      .select("id, org_id, status, credits_per_period, package_id, stripe_subscription_id, recruitment_credit_packages(name,credits)")
      .eq("status", "active");
    const subMismatches = (subs ?? [])
      .filter((s: any) => s.recruitment_credit_packages && s.credits_per_period !== s.recruitment_credit_packages.credits)
      .map((s: any) => ({
        subscription_id: s.id,
        org_id: s.org_id,
        stripe_subscription_id: s.stripe_subscription_id,
        package: s.recruitment_credit_packages.name,
        sub_credits_per_period: s.credits_per_period,
        package_credits: s.recruitment_credit_packages.credits,
      }));

    const summary = {
      packages_checked: report.length,
      packages_ok: report.filter((r) => r.ok).length,
      packages_with_issues: report.filter((r) => !r.ok).length,
      subs_active_checked: subs?.length ?? 0,
      subs_with_outdated_credits: subMismatches.length,
    };

    return new Response(
      JSON.stringify({ summary, packages: report, subscription_mismatches: subMismatches }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
