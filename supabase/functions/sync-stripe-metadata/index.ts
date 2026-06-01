// Sincroniza metadata.credits no Stripe (price + product) a partir de
// recruitment_credit_packages. Idempotente. Pode ser chamada manualmente
// pelo admin (botão) ou automaticamente após editar um pacote.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY ausente");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Auth — exigir super admin (ou service role para chamadas internas)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem authorization header");
    const token = authHeader.replace("Bearer ", "");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (token !== serviceRole) {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData.user) throw new Error("Não autenticado");
      const { data: isSA } = await supabaseAdmin.rpc("is_super_admin", {
        _user_id: userData.user.id,
      });
      if (!isSA) throw new Error("Apenas super admin");
    }

    // Filtro opcional: { package_id?: string } — se omitido sincroniza todos os ativos com stripe_price_id
    let body: { package_id?: string } = {};
    try { body = await req.json(); } catch { /* sem body */ }

    let query = supabaseAdmin
      .from("recruitment_credit_packages")
      .select("id, name, credits, stripe_price_id, stripe_product_id, is_active")
      .not("stripe_price_id", "is", null);
    if (body.package_id) query = query.eq("id", body.package_id);
    else query = query.eq("is_active", true);

    const { data: pkgs, error: pkgsErr } = await query;
    if (pkgsErr) throw pkgsErr;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const results: Array<Record<string, unknown>> = [];

    for (const p of pkgs ?? []) {
      try {
        const price = await stripe.prices.retrieve(p.stripe_price_id!);
        const productId = typeof price.product === "string" ? price.product : price.product.id;
        const creditsStr = String(p.credits);

        const priceNeeds = price.metadata?.credits !== creditsStr;
        const product = await stripe.products.retrieve(productId);
        const productNeeds = product.metadata?.credits !== creditsStr;

        if (priceNeeds) {
          await stripe.prices.update(price.id, {
            metadata: { ...price.metadata, credits: creditsStr, package_name: p.name },
          });
        }
        if (productNeeds) {
          await stripe.products.update(productId, {
            metadata: { ...product.metadata, credits: creditsStr, package_name: p.name },
          });
        }

        // Backfill stripe_product_id no DB se estava vazio
        if (!p.stripe_product_id) {
          await supabaseAdmin
            .from("recruitment_credit_packages")
            .update({ stripe_product_id: productId })
            .eq("id", p.id);
        }

        results.push({
          package: p.name,
          price_id: price.id,
          product_id: productId,
          credits: p.credits,
          price_updated: priceNeeds,
          product_updated: productNeeds,
        });
      } catch (e) {
        results.push({ package: p.name, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
