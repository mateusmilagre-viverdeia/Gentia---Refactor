import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("calculate-seats-price");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

interface CalculatePriceRequest {
  account_id: string;
  quantity: number;
  price_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Invalid authentication");
    }
    logStep("User authenticated", { userId: userData.user.id });

    const { account_id, quantity, price_id }: CalculatePriceRequest = await req.json();
    
    if (!account_id || !quantity || !price_id) {
      throw new Error("account_id, quantity, and price_id are required");
    }
    logStep("Request parsed", { account_id, quantity, price_id });

    // Verify user has permission (owner or admin)
    const { data: membership, error: memberError } = await supabaseClient
      .from('account_members')
      .select('role')
      .eq('account_id', account_id)
      .eq('user_id', userData.user.id)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error("Permission denied - must be owner or admin");
    }
    logStep("Permission verified", { role: membership.role });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get price info
    const price = await stripe.prices.retrieve(price_id);
    const monthlyPriceCents = price.unit_amount || 1990;
    const monthlyPriceBRL = monthlyPriceCents / 100;
    const newSeatsAmount = quantity * monthlyPriceBRL;

    logStep("Price retrieved", { monthlyPriceCents, monthlyPriceBRL, newSeatsAmount });

    // Get org billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_subscription_id, stripe_customer_id, status')
      .eq('org_id', account_id)
      .maybeSingle();

    // No billing or no subscription - new subscription flow
    if (!billing || !billing.stripe_subscription_id) {
      logStep("No existing subscription - full price", { newSeatsAmount });
      
      return new Response(JSON.stringify({
        isProRata: false,
        proRataAmount: null,
        fullAmount: newSeatsAmount,
        monthlyRecurringAmount: newSeatsAmount,
        remainingDays: null,
        totalDays: null,
        nextBillingDate: null,
        // New fields for total breakdown
        totalNextBillAmount: newSeatsAmount,
        currentSubscriptionAmount: 0,
        basePlanAmount: 0,
        existingAdditionalSeatsAmount: 0,
        existingAdditionalSeatsCount: 0,
        newSeatsAmount: newSeatsAmount,
        newSeatsCount: quantity,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Has subscription - calculate pro-rata and total next bill
    logStep("Subscription found", { subscriptionId: billing.stripe_subscription_id });

    const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      logStep("Subscription not active", { status: subscription.status });
      
      return new Response(JSON.stringify({
        isProRata: false,
        proRataAmount: null,
        fullAmount: newSeatsAmount,
        monthlyRecurringAmount: newSeatsAmount,
        remainingDays: null,
        totalDays: null,
        nextBillingDate: null,
        // New fields
        totalNextBillAmount: newSeatsAmount,
        currentSubscriptionAmount: 0,
        basePlanAmount: 0,
        existingAdditionalSeatsAmount: 0,
        existingAdditionalSeatsCount: 0,
        newSeatsAmount: newSeatsAmount,
        newSeatsCount: quantity,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate current subscription breakdown
    const BASE_PLAN_PRICE_ID = "price_1SivZbKV6gEseQSlAlIoMXok"; // R$ 297/mês
    const SEAT_PRICE_IDS = [
      "price_1SivVkKV6gEseQSlCuzv0qAM", // Seat adicional original
      "price_1SizCUKV6gEseQSlCVl5Wo4x", // Seat adicional variante
    ];

    let basePlanAmount = 0;
    let existingAdditionalSeatsAmount = 0;
    let existingAdditionalSeatsCount = 0;
    let currentSubscriptionAmount = 0;

    // Calculate amounts from all subscription items
    for (const item of subscription.items.data) {
      const itemPriceId = item.price.id;
      const itemQuantity = item.quantity || 1;
      const itemUnitAmount = (item.price.unit_amount || 0) / 100;
      const itemTotalAmount = itemUnitAmount * itemQuantity;

      logStep("Processing subscription item", { 
        priceId: itemPriceId, 
        quantity: itemQuantity, 
        unitAmount: itemUnitAmount,
        totalAmount: itemTotalAmount 
      });

      if (itemPriceId === BASE_PLAN_PRICE_ID) {
        basePlanAmount = itemTotalAmount;
      } else if (SEAT_PRICE_IDS.includes(itemPriceId)) {
        existingAdditionalSeatsAmount += itemTotalAmount;
        existingAdditionalSeatsCount += itemQuantity;
      }

      currentSubscriptionAmount += itemTotalAmount;
    }

    // Calculate total for next bill (current + new seats)
    const totalNextBillAmount = currentSubscriptionAmount + newSeatsAmount;

    logStep("Subscription breakdown calculated", {
      basePlanAmount,
      existingAdditionalSeatsAmount,
      existingAdditionalSeatsCount,
      currentSubscriptionAmount,
      newSeatsAmount,
      totalNextBillAmount,
    });

    // Calculate billing period
    const firstItem = subscription.items?.data?.[0] as unknown as {
      current_period_start?: number;
      current_period_end?: number;
    } | undefined;

    const periodEnd = firstItem?.current_period_end ?? subscription.current_period_end;
    const periodStart = firstItem?.current_period_start ?? subscription.current_period_start;

    if (typeof periodEnd !== "number" || typeof periodStart !== "number") {
      throw new Error("Could not determine subscription billing period");
    }

    const now = Math.floor(Date.now() / 1000);
    const totalDays = Math.max(1, (periodEnd - periodStart) / 86400);
    const remainingDays = Math.max(1, (periodEnd - now) / 86400);

    // Pro-rata calculation for new seats only
    const proRataFraction = remainingDays / totalDays;
    const proRataAmountCents = Math.round(monthlyPriceCents * quantity * proRataFraction);
    const proRataAmount = proRataAmountCents / 100;

    // Next billing date
    const nextBillingDate = new Date(periodEnd * 1000).toISOString();

    logStep("Pro-rata calculated", {
      remainingDays: Math.round(remainingDays),
      totalDays: Math.round(totalDays),
      proRataFraction,
      proRataAmount,
      nextBillingDate,
    });

    return new Response(JSON.stringify({
      isProRata: true,
      proRataAmount,
      fullAmount: newSeatsAmount,
      monthlyRecurringAmount: newSeatsAmount,
      remainingDays: Math.round(remainingDays),
      totalDays: Math.round(totalDays),
      nextBillingDate,
      // New fields for total breakdown
      totalNextBillAmount,
      currentSubscriptionAmount,
      basePlanAmount,
      existingAdditionalSeatsAmount,
      existingAdditionalSeatsCount,
      newSeatsAmount,
      newSeatsCount: quantity,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
