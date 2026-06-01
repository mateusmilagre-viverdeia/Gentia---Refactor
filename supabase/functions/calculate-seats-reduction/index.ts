import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("calculate-seats-reduction");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

interface CalculateReductionRequest {
  account_id: string;
  quantity: number; // Number of seats to REMOVE
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

    const { account_id, quantity }: CalculateReductionRequest = await req.json();
    
    if (!account_id || !quantity || quantity < 1) {
      throw new Error("account_id and quantity (>= 1) are required");
    }
    logStep("Request parsed", { account_id, quantity });

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

    // Get org billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_subscription_id, stripe_customer_id, status')
      .eq('org_id', account_id)
      .maybeSingle();

    if (!billing || !billing.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    logStep("Billing info retrieved", { 
      subscriptionId: billing.stripe_subscription_id
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      throw new Error("Subscription is not active");
    }

    // Find the seat subscription item
    const BASE_PLAN_PRICE_ID = "price_1SivZbKV6gEseQSlAlIoMXok";
    const SEAT_PRICE_IDS = [
      "price_1SivVkKV6gEseQSlCuzv0qAM",
      "price_1SizCUKV6gEseQSlCVl5Wo4x",
    ];

    let basePlanAmount = 0;
    let primarySeatItem: { id: string; priceId: string; quantity: number; unitAmount: number } | null = null;
    let currentMonthlyTotal = 0;
    let totalSeatQuantity = 0;
    const allSeatItems: Array<{ id: string; priceId: string; quantity: number; unitAmount: number }> = [];

    for (const item of subscription.items.data) {
      const itemPriceId = item.price.id;
      const itemQuantity = item.quantity || 1;
      const itemUnitAmount = (item.price.unit_amount || 0) / 100;
      const itemTotalAmount = itemUnitAmount * itemQuantity;

      currentMonthlyTotal += itemTotalAmount;

      if (itemPriceId === BASE_PLAN_PRICE_ID) {
        basePlanAmount = itemTotalAmount;
      } else if (SEAT_PRICE_IDS.includes(itemPriceId)) {
        // Sum ALL seat items
        totalSeatQuantity += itemQuantity;
        allSeatItems.push({
          id: item.id,
          priceId: itemPriceId,
          quantity: itemQuantity,
          unitAmount: itemUnitAmount,
        });
        if (!primarySeatItem) {
          primarySeatItem = {
            id: item.id,
            priceId: itemPriceId,
            quantity: itemQuantity,
            unitAmount: itemUnitAmount,
          };
        }
      }
    }

    if (totalSeatQuantity === 0) {
      throw new Error("No seat subscription items found");
    }

    // Create a virtual seat item with combined quantity for calculations
    const seatSubscriptionItem = {
      id: primarySeatItem!.id,
      priceId: primarySeatItem!.priceId,
      quantity: totalSeatQuantity, // Combined quantity from all seat items
      unitAmount: primarySeatItem!.unitAmount,
    };

    logStep("Subscription items analyzed (summed all seat items)", {
      basePlanAmount,
      allSeatItems,
      totalSeatQuantity,
      currentMonthlyTotal,
    });

    // Calculate new amounts after reduction
    const newSeatQuantity = seatSubscriptionItem.quantity - quantity;
    const reductionAmount = quantity * seatSubscriptionItem.unitAmount;
    const newSeatsAmount = newSeatQuantity * seatSubscriptionItem.unitAmount;
    const newMonthlyTotal = currentMonthlyTotal - reductionAmount;

    // Calculate billing period for pro-rata credit
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
    const remainingDays = Math.max(0, (periodEnd - now) / 86400);

    // Pro-rata credit calculation
    const proRataFraction = remainingDays / totalDays;
    const proRataCreditCents = Math.round(seatSubscriptionItem.unitAmount * 100 * quantity * proRataFraction);
    const proRataCredit = proRataCreditCents / 100;

    // Next billing date
    const nextBillingDate = new Date(periodEnd * 1000).toISOString();

    logStep("Reduction calculated", {
      currentSeatQuantity: seatSubscriptionItem.quantity,
      seatsToRemove: quantity,
      newSeatQuantity,
      reductionAmount,
      currentMonthlyTotal,
      newMonthlyTotal,
      remainingDays: Math.round(remainingDays),
      proRataCredit,
      nextBillingDate,
    });

    return new Response(JSON.stringify({
      // Current state
      currentMonthlyAmount: currentMonthlyTotal,
      currentSeatQuantity: seatSubscriptionItem.quantity,
      basePlanAmount,
      currentSeatsAmount: seatSubscriptionItem.quantity * seatSubscriptionItem.unitAmount,
      
      // Reduction details
      seatsToRemove: quantity,
      reductionAmount, // Monthly reduction
      
      // New state after reduction
      newSeatQuantity,
      newSeatsAmount,
      newMonthlyAmount: newMonthlyTotal,
      
      // Pro-rata credit info
      proRataCredit,
      remainingDays: Math.round(remainingDays),
      totalDays: Math.round(totalDays),
      
      // Billing info
      nextBillingDate,
      
      // Subscription item info (needed for portal)
      subscriptionId: billing.stripe_subscription_id,
      seatSubscriptionItemId: seatSubscriptionItem.id,
      seatPriceId: seatSubscriptionItem.priceId,
      unitPrice: seatSubscriptionItem.unitAmount,
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
