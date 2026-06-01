import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback IDs caso a tabela platform_stripe_config esteja vazia
const FALLBACK_PRICE_ORG_BASE = "price_1SivZbKV6gEseQSlAlIoMXok";
const FALLBACK_PRICE_SEAT_ADDITIONAL = "price_1SivVkKV6gEseQSlCuzv0qAM";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CHECKOUT] ${step}${detailsStr}`);
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

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Receber org_id e coupon opcional
    const { org_id, coupon_code } = await req.json();
    if (!org_id) throw new Error("org_id is required");
    logStep("Request data", { org_id, coupon_code });

    // Buscar dados da organização
    const { data: org, error: orgError } = await supabaseClient
      .from("companies")
      .select("id, name, user_id")
      .eq("id", org_id)
      .single();
    
    if (orgError || !org) throw new Error("Organization not found");
    logStep("Organization found", { orgName: org.name });

    // Contar membros ativos (para seats)
    const { count: memberCount } = await supabaseClient
      .from("account_members")
      .select("id", { count: "exact", head: true })
      .eq("account_id", org_id);
    
    const additionalSeats = Math.max(0, (memberCount || 1) - 1);
    logStep("Seat calculation", { memberCount, additionalSeats });

    // Buscar preços oficiais do banco
    const { data: stripeConfig } = await supabaseClient
      .from("platform_stripe_config")
      .select("price_org_base, price_seat_additional")
      .limit(1)
      .single();

    const PRICE_ORG_BASE = stripeConfig?.price_org_base || FALLBACK_PRICE_ORG_BASE;
    const PRICE_SEAT_ADDITIONAL = stripeConfig?.price_seat_additional || FALLBACK_PRICE_SEAT_ADDITIONAL;
    logStep("Official prices loaded", { PRICE_ORG_BASE, PRICE_SEAT_ADDITIONAL });

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verificar se já tem customer para este email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Preparar line_items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: PRICE_ORG_BASE,
        quantity: 1,
      },
    ];

    // Adicionar seats se houver membros além do owner
    if (additionalSeats > 0) {
      line_items.push({
        price: PRICE_SEAT_ADDITIONAL,
        quantity: additionalSeats,
      });
    }
    logStep("Line items prepared", { itemCount: line_items.length });

    // Criar sessão de checkout com trial de 15 dias
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items,
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/conta/billing?success=true`,
      cancel_url: `${req.headers.get("origin")}/conta/billing?canceled=true`,
      subscription_data: {
        metadata: {
          org_id: org_id,
          org_name: org.name,
        },
      },
      metadata: {
        org_id: org_id,
        user_id: user.id,
      },
      allow_promotion_codes: true,
    };
    logStep("Checkout session configured (no trial, immediate charge)");

    // Aplicar cupom se fornecido
    if (coupon_code) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: coupon_code,
          active: true,
          limit: 1,
        });
        if (promotionCodes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
          delete sessionParams.allow_promotion_codes;
          logStep("Coupon applied", { code: coupon_code });
        }
      } catch (e) {
        logStep("Coupon not found or invalid", { code: coupon_code });
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Logar evento
    await supabaseClient.from("billing_events").insert({
      org_id: org_id,
      event_type: "checkout_session_created",
      payload: {
        session_id: session.id,
        user_id: user.id,
        additional_seats: additionalSeats,
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
