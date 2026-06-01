import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDITS-PURCHASE] ${step}${detailsStr}`);
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
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { org_id, package_id } = await req.json();
    if (!org_id) throw new Error("org_id is required");
    if (!package_id) throw new Error("package_id is required");
    logStep("Request data", { org_id, package_id });

    // Get package details
    const { data: pkg, error: pkgError } = await supabaseClient
      .from("recruitment_credit_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();

    if (pkgError || !pkg) throw new Error("Package not found or inactive");
    logStep("Package found", { name: pkg.name, credits: pkg.credits, price: pkg.price_cents });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user already has a Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Create or use existing Stripe price
    let priceId = pkg.stripe_price_id;

    if (!priceId) {
      // Create a one-time price for this package
      const price = await stripe.prices.create({
        currency: "brl",
        unit_amount: pkg.price_cents,
        product_data: {
          name: `${pkg.name} - ${pkg.credits} créditos`,
          metadata: {
            package_id: pkg.id,
            credit_type: pkg.credit_type,
            credits: pkg.credits.toString(),
          }
        },
      });
      priceId = price.id;
      logStep("Created Stripe price", { priceId });

      // Save price_id for future use
      await supabaseClient
        .from("recruitment_credit_packages")
        .update({ stripe_price_id: priceId })
        .eq("id", package_id);
    }

    const origin = req.headers.get("origin") || "https://gentia.lovable.app";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/atracao-contratacao/recrutamento?credits_success=true&package=${package_id}`,
      cancel_url: `${origin}/atracao-contratacao/recrutamento?credits_canceled=true`,
      metadata: {
        org_id: org_id,
        user_id: user.id,
        package_id: package_id,
        credit_type: pkg.credit_type,
        credits: pkg.credits.toString(),
        type: "credit_purchase"
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Log the event
    await supabaseClient.from("billing_events").insert({
      org_id: org_id,
      event_type: "credit_checkout_created",
      payload: {
        session_id: session.id,
        package_id: package_id,
        package_name: pkg.name,
        credits: pkg.credits,
        price_cents: pkg.price_cents,
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
