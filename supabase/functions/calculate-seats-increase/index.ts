import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("calculate-seats-increase");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

interface CalculateIncreaseRequest {
  account_id: string;
  quantity: number; // Number of seats to ADD
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

    const { account_id, quantity }: CalculateIncreaseRequest = await req.json();
    
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

    const BASE_PLAN_PRICE_ID = "price_1SivZbKV6gEseQSlAlIoMXok";
    const SEAT_PRICE_IDS = [
      "price_1SivVkKV6gEseQSlCuzv0qAM",
      "price_1SizCUKV6gEseQSlCVl5Wo4x",
    ];

    // Check active grants (waive base plan + free seats)
    const nowIso = new Date().toISOString();
    const [{ data: seatGrants }, { data: adminGrants }] = await Promise.all([
      supabaseClient
        .from('org_seat_grants')
        .select('free_seats, valid_until')
        .eq('org_id', account_id),
      supabaseClient
        .from('admin_grants')
        .select('id, expires_at, revoked_at')
        .eq('org_id', account_id)
        .is('revoked_at', null)
        .gt('expires_at', nowIso),
    ]);

    const freeSeats = (seatGrants ?? [])
      .filter((g: any) => !g.valid_until || g.valid_until > nowIso)
      .reduce((sum: number, g: any) => sum + (g.free_seats || 0), 0);
    const hasAdminGrant = (adminGrants?.length ?? 0) > 0;
    const hasActiveGrant = freeSeats > 0 || hasAdminGrant;

    logStep("Grants evaluated", { freeSeats, hasAdminGrant, hasActiveGrant });

    if (!billing || !billing.stripe_subscription_id) {
      logStep("No active subscription found, returning setup info", { account_id });

      const seatUnitPrice = 19.90;
      const basePlanAmount = hasActiveGrant ? 0 : 297.00;
      const paidSeats = hasActiveGrant ? Math.max(0, quantity - freeSeats) : quantity;
      const increaseAmount = paidSeats * seatUnitPrice;

      return new Response(JSON.stringify({
        requiresNewSubscription: true,
        currentMonthlyAmount: 0,
        currentSeatQuantity: 0,
        basePlanAmount,
        currentSeatsAmount: 0,
        seatsToAdd: quantity,
        paidSeats,
        freeSeats,
        grantApplied: hasActiveGrant,
        increaseAmount,
        newSeatQuantity: quantity,
        newSeatsAmount: increaseAmount,
        newMonthlyAmount: basePlanAmount + increaseAmount,
        proRataCharge: 0,
        remainingDays: 0,
        totalDays: 30,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subscriptionId: null,
        seatSubscriptionItemId: null,
        seatPriceId: SEAT_PRICE_IDS[1],
        basePlanPriceId: hasActiveGrant ? null : BASE_PLAN_PRICE_ID,
        unitPrice: seatUnitPrice,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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

    // Get seat price for calculation even if no seat item exists yet
    const seatUnitPrice = primarySeatItem?.unitAmount ?? 19.90;
    const currentSeatQuantity = totalSeatQuantity;

    logStep("Subscription items analyzed (summed all seat items)", {
      basePlanAmount,
      allSeatItems,
      totalSeatQuantity,
      currentMonthlyTotal,
    });

    // Calculate new amounts after increase, applying free_seats (grant) if any
    // Free seats already absorbed by current seats reduce remaining free credits
    const freeSeatsRemaining = Math.max(0, freeSeats - currentSeatQuantity);
    const paidSeats = hasActiveGrant ? Math.max(0, quantity - freeSeatsRemaining) : quantity;
    const newSeatQuantity = currentSeatQuantity + quantity;
    const increaseAmount = paidSeats * seatUnitPrice;
    const newSeatsAmount = newSeatQuantity * seatUnitPrice;
    const newMonthlyTotal = currentMonthlyTotal + increaseAmount;

    // Calculate billing period for pro-rata charge
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

    // Pro-rata charge calculation (only on paid seats)
    const proRataFraction = remainingDays / totalDays;
    const proRataChargeCents = Math.round(seatUnitPrice * 100 * paidSeats * proRataFraction);
    const proRataCharge = proRataChargeCents / 100;

    // Next billing date
    const nextBillingDate = new Date(periodEnd * 1000).toISOString();

    logStep("Increase calculated", {
      currentSeatQuantity,
      seatsToAdd: quantity,
      newSeatQuantity,
      increaseAmount,
      currentMonthlyTotal,
      newMonthlyTotal,
      remainingDays: Math.round(remainingDays),
      proRataCharge,
      nextBillingDate,
    });

    return new Response(JSON.stringify({
      // Current state
      currentMonthlyAmount: currentMonthlyTotal,
      currentSeatQuantity,
      basePlanAmount,
      currentSeatsAmount: currentSeatQuantity * seatUnitPrice,
      
      // Increase details
      seatsToAdd: quantity,
      paidSeats,
      freeSeats,
      grantApplied: hasActiveGrant,
      increaseAmount, // Monthly increase (paid seats only)
      
      // New state after increase
      newSeatQuantity,
      newSeatsAmount,
      newMonthlyAmount: newMonthlyTotal,
      
      // Pro-rata charge info
      proRataCharge,
      remainingDays: Math.round(remainingDays),
      totalDays: Math.round(totalDays),
      
      // Billing info
      nextBillingDate,
      
      // Subscription item info (needed for portal)
      subscriptionId: billing.stripe_subscription_id,
      seatSubscriptionItemId: primarySeatItem?.id ?? null,
      seatPriceId: primarySeatItem?.priceId ?? SEAT_PRICE_IDS[1],
      unitPrice: seatUnitPrice,
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
