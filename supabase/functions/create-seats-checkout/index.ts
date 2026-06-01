import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Build trigger: 2026-01-05

const log = createLogger("create-seats-checkout");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

interface CheckoutRequest {
  account_id: string;
  quantity: number;
  price_id: string;
  coupon_code?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { account_id, quantity, price_id, coupon_code }: CheckoutRequest = await req.json();
    logStep("Request parsed", { account_id, quantity, price_id, coupon_code: coupon_code ? 'provided' : 'none' });

    if (!account_id || !quantity || !price_id) {
      throw new Error("Missing required parameters: account_id, quantity, price_id");
    }

    // Verify user has permission (owner or admin)
    const { data: memberData, error: memberError } = await supabaseClient
      .from('account_members')
      .select('role')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      throw new Error("User is not a member of this account");
    }

    if (!['owner', 'admin'].includes(memberData.role)) {
      throw new Error("User does not have permission to purchase seats");
    }
    logStep("User permission verified", { role: memberData.role });

    // Check if this is an EP Partner's own organization (exempt from charges)
    const { data: epPartnerGrant } = await supabaseClient
      .from('ep_partners')
      .select('id, own_project_grant_id, partner_client_grants!ep_partners_own_project_grant_id_fkey(org_id)')
      .not('own_project_grant_id', 'is', null)
      .maybeSingle();

    // Check if the account_id matches an EP Partner's own organization
    let isExemptOrg = false;
    if (epPartnerGrant?.partner_client_grants) {
      const grantData = epPartnerGrant.partner_client_grants as { org_id: string } | { org_id: string }[];
      const orgId = Array.isArray(grantData) ? grantData[0]?.org_id : grantData.org_id;
      isExemptOrg = orgId === account_id;
    }

    // Alternative check: directly query if account_id has an own_project_grant
    if (!isExemptOrg) {
      const { data: directCheck } = await supabaseClient
        .from('partner_client_grants')
        .select('id, ep_partners!ep_partners_own_project_grant_id_fkey(id)')
        .eq('org_id', account_id)
        .maybeSingle();
      
      if (directCheck?.ep_partners) {
        isExemptOrg = true;
      }
    }

    if (isExemptOrg) {
      logStep("EP Partner own organization detected - granting free seats", { account_id, quantity });

      // Get or create org_seats record
      const { data: existingSeats } = await supabaseClient
        .from('org_seats')
        .select('*')
        .eq('org_id', account_id)
        .maybeSingle();

      const currentPaidSeats = existingSeats?.paid_seats || 0;
      const newPaidSeats = currentPaidSeats + quantity;

      await supabaseClient
        .from('org_seats')
        .upsert({
          org_id: account_id,
          paid_seats: newPaidSeats,
          updated_at: new Date().toISOString(),
        });

      // Log the exemption
      await supabaseClient
        .from('billing_events')
        .insert({
          org_id: account_id,
          event_type: 'ep_partner_seats_granted',
          payload: {
            quantity,
            reason: 'EP Partner own organization - exempt from charges',
          },
        });

      logStep("Free seats granted successfully", { newPaidSeats, quantity });

      return new Response(JSON.stringify({
        exempt: true,
        message: `${quantity} assento(s) adicionado(s) gratuitamente (organização de sócio EP)`,
        newPaidSeats,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Not an EP Partner own organization, proceeding with payment");

    // Get org billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('org_id', account_id)
      .maybeSingle();

    logStep("Billing info fetched", { 
      hasCustomer: !!billing?.stripe_customer_id,
      hasSubscription: !!billing?.stripe_subscription_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId = billing?.stripe_customer_id;

    // If no customer, create one
    if (!customerId) {
      // Get company name
      const { data: company } = await supabaseClient
        .from('companies')
        .select('name')
        .eq('id', account_id)
        .single();

      const customer = await stripe.customers.create({
        email: user.email,
        name: company?.name || undefined,
        metadata: {
          account_id,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });

      // Save customer ID to org_billing
      await supabaseClient
        .from('org_billing')
        .upsert({
          org_id: account_id,
          stripe_customer_id: customerId,
          status: 'incomplete',
        });
    }

    const origin = req.headers.get("origin") || "https://app.example.com";

    // Se já tem assinatura, criar Checkout Session para pagamento único (pro-rata)
    if (billing?.stripe_subscription_id) {
      logStep("Creating pro-rata checkout for existing subscription", { 
        subscriptionId: billing.stripe_subscription_id 
      });

      // Recuperar a subscription para calcular pro-rata
      const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
      
      // Calcular dias restantes no ciclo
      const now = Math.floor(Date.now() / 1000);

      // Algumas respostas do Stripe podem trazer esses campos no item da assinatura.
      // Preferimos pegar do primeiro item e, se não existir, cair para a raiz.
      const firstItem = subscription.items?.data?.[0] as unknown as {
        current_period_start?: number;
        current_period_end?: number;
      } | undefined;

      const periodEnd = firstItem?.current_period_end ?? subscription.current_period_end;
      const periodStart = firstItem?.current_period_start ?? subscription.current_period_start;

      if (typeof periodEnd !== "number" || typeof periodStart !== "number") {
        throw new Error("Could not determine subscription billing period");
      }

      const totalDays = Math.max(1, (periodEnd - periodStart) / 86400);
      const remainingDays = Math.max(1, (periodEnd - now) / 86400);

      // Recuperar preço do assento
      const price = await stripe.prices.retrieve(price_id);
      const monthlyPriceCents = price.unit_amount || 1990; // R$ 19,90 = 1990 centavos
      
      // Calcular valor pro-rata (dias restantes / dias totais * preço * quantidade)
      const dailyPrice = monthlyPriceCents / totalDays;
      const proRataAmount = Math.ceil(dailyPrice * remainingDays * quantity);
      
      // Apply coupon if provided (for mode: 'payment', we need to apply manually)
      let finalProRataAmount = proRataAmount;
      let appliedDiscount = 0;
      let couponDescription = '';
      
      if (coupon_code) {
        try {
          // Search for promotion code
          const promotionCodes = await stripe.promotionCodes.list({
            code: coupon_code,
            active: true,
            limit: 1,
          });
          
          if (promotionCodes.data.length > 0) {
            const promoCode = promotionCodes.data[0];
            const coupon = promoCode.coupon;
            
            if (coupon.percent_off) {
              appliedDiscount = Math.ceil(proRataAmount * (coupon.percent_off / 100));
              couponDescription = `${coupon.percent_off}% de desconto`;
              logStep("Coupon applied (percent)", { couponId: coupon.id, percentOff: coupon.percent_off, discount: appliedDiscount });
            } else if (coupon.amount_off) {
              appliedDiscount = Math.min(coupon.amount_off, proRataAmount - 100); // Keep at least R$1
              couponDescription = `R$ ${(coupon.amount_off / 100).toFixed(2)} de desconto`;
              logStep("Coupon applied (amount)", { couponId: coupon.id, amountOff: coupon.amount_off, discount: appliedDiscount });
            }
            
            finalProRataAmount = Math.max(proRataAmount - appliedDiscount, 100);
          } else {
            logStep("Coupon code not found or inactive", { coupon_code });
          }
        } catch (couponError) {
          logStep("Error applying coupon (continuing without)", { error: String(couponError) });
        }
      }
      
      // Garantir valor mínimo de R$ 1,00 (100 centavos) para evitar faturas de R$ 0
      finalProRataAmount = Math.max(finalProRataAmount, 100);
      
      logStep("Pro-rata calculation", { 
        totalDays: Math.ceil(totalDays),
        remainingDays: Math.ceil(remainingDays),
        monthlyPriceCents,
        dailyPrice: dailyPrice.toFixed(2),
        proRataAmount,
        appliedDiscount,
        finalProRataAmount,
        quantity
      });

      // Format next billing date
      const nextBillingDate = new Date(periodEnd * 1000);
      const formattedNextBilling = nextBillingDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Pro-rata calculation description
      const monthlyPriceBRL = monthlyPriceCents / 100;
      let proRataDescription = `R$ ${monthlyPriceBRL.toFixed(2)} × ${Math.ceil(remainingDays)}/${Math.ceil(totalDays)} dias × ${quantity} assento(s)`;
      if (appliedDiscount > 0) {
        proRataDescription += ` (${couponDescription} aplicado)`;
      }

      // CORREÇÃO: Usar Checkout Session com mode: 'payment' para pagamento único
      // Isso garante que o cliente DEVE pagar antes de liberar os assentos
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: 'brl',
              unit_amount: finalProRataAmount,
              product_data: {
                name: `${quantity} assento(s) adicional(is) - Pro-rata`,
                description: `Cálculo: ${proRataDescription}. A partir de ${formattedNextBilling}, será cobrado R$ ${(monthlyPriceBRL * quantity).toFixed(2)}/mês automaticamente.`,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'payment', // Pagamento único, NÃO subscription
        success_url: `${origin}/conta/usuarios?seats_purchased=true&quantity=${quantity}`,
        cancel_url: `${origin}/conta/usuarios?seats_cancelled=true`,
        allow_promotion_codes: true, // Permite cupons de desconto na página de checkout
        metadata: {
          account_id,
          type: 'seat_upgrade',
          quantity: quantity.toString(),
          subscription_id: subscription.id,
          price_id: price_id,
          next_billing_date: nextBillingDate.toISOString(),
          pro_rata_amount: finalProRataAmount.toString(),
        },
        payment_intent_data: {
          metadata: {
            account_id,
            type: 'seat_upgrade',
            quantity: quantity.toString(),
            subscription_id: subscription.id,
            price_id: price_id,
          },
        },
      });
      
      logStep("Checkout session created for seat upgrade", { 
        sessionId: session.id, 
        url: session.url,
        proRataAmount: finalProRataAmount / 100
      });

      return new Response(JSON.stringify({ 
        url: session.url,
        proRataAmount: finalProRataAmount / 100, // Converter para reais
        remainingDays: Math.ceil(remainingDays),
        quantity
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Não tem assinatura - criar nova subscription via Checkout Session
    logStep("Creating checkout for new subscription (seats only)");
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price_id,
          quantity,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/conta/usuarios?seats_purchased=true&quantity=${quantity}`,
      cancel_url: `${origin}/conta/usuarios?seats_cancelled=true`,
      metadata: {
        account_id,
        type: 'additional_seats',
        quantity: quantity.toString(),
      },
      subscription_data: {
        metadata: {
          account_id,
          org_id: account_id,
          type: 'seat_purchase',
        },
      },
      allow_promotion_codes: true,
      payment_method_types: ['card'],
    });
    
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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
