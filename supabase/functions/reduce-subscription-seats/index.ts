import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REDUCE-SUBSCRIPTION-SEATS] ${step}${detailsStr}`);
};

interface ReduceSeatsRequest {
  account_id: string;
  quantity: number;
}

// Price IDs for seat subscriptions
const SEAT_PRICE_IDS = [
  "price_1SivVkKV6gEseQSlCuzv0qAM",
  "price_1SizCUKV6gEseQSlCVl5Wo4x",
];

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
    const { account_id, quantity }: ReduceSeatsRequest = await req.json();
    logStep("Request parsed", { account_id, quantity });

    if (!account_id || !quantity || quantity < 1) {
      throw new Error("Missing or invalid parameters: account_id, quantity");
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
      throw new Error("User does not have permission to manage seats");
    }
    logStep("User permission verified", { role: memberData.role });

    // Get org billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_subscription_id')
      .eq('org_id', account_id)
      .maybeSingle();

    if (!billing?.stripe_subscription_id) {
      throw new Error("No active subscription found for this account");
    }
    logStep("Billing info fetched", { subscriptionId: billing.stripe_subscription_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve subscription
    const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
    
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      throw new Error(`Subscription is not active (status: ${subscription.status})`);
    }

    // Find ALL seat subscription items and sum their quantities
    let totalSeatQuantity = 0;
    const seatItems: Array<{ id: string; quantity: number; priceId: string }> = [];
    
    for (const item of subscription.items.data) {
      if (SEAT_PRICE_IDS.includes(item.price.id)) {
        totalSeatQuantity += item.quantity || 0;
        seatItems.push({
          id: item.id,
          quantity: item.quantity || 0,
          priceId: item.price.id,
        });
      }
    }

    if (seatItems.length === 0) {
      throw new Error("No seat subscription item found");
    }

    const currentQuantity = totalSeatQuantity;
    logStep("Current seat items found (summed)", { 
      seatItemsCount: seatItems.length,
      seatItems,
      totalQuantity: currentQuantity 
    });

    if (quantity > currentQuantity) {
      throw new Error(`Cannot remove ${quantity} seats. Current quantity is ${currentQuantity}`);
    }

    // Verify we're not removing seats that are in use
    const { data: orgSeats } = await supabaseClient
      .from('org_seats')
      .select('included_seats')
      .eq('org_id', account_id)
      .maybeSingle();

    const { count: memberCount } = await supabaseClient
      .from('account_members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account_id);

    const { count: pendingCount } = await supabaseClient
      .from('account_invites')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account_id)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString());

    const includedSeats = orgSeats?.included_seats || 1;
    const usedSeats = memberCount || 0;
    const pendingSeats = pendingCount || 0;
    const occupiedSeats = usedSeats + pendingSeats;
    const minAdditionalSeatsRequired = Math.max(0, occupiedSeats - includedSeats);
    const newQuantity = currentQuantity - quantity;

    logStep("Validation check", {
      includedSeats,
      usedSeats,
      pendingSeats,
      occupiedSeats,
      minAdditionalSeatsRequired,
      currentQuantity,
      requestedRemoval: quantity,
      newQuantity,
    });

    if (newQuantity < minAdditionalSeatsRequired) {
      throw new Error(
        `Cannot reduce to ${newQuantity} additional seats. You have ${occupiedSeats} users/invites ` +
        `and only ${includedSeats} included in base plan. Minimum additional seats required: ${minAdditionalSeatsRequired}`
      );
    }

    // Update the subscription items WITHOUT proration (takes effect on next billing cycle)
    // Strategy: distribute the reduction across seat items, removing items with 0 quantity
    let remainingToRemove = quantity;
    
    for (const item of seatItems) {
      if (remainingToRemove <= 0) break;
      
      const removeFromThisItem = Math.min(remainingToRemove, item.quantity);
      const newItemQuantity = item.quantity - removeFromThisItem;
      remainingToRemove -= removeFromThisItem;
      
      if (newItemQuantity === 0) {
        await stripe.subscriptionItems.del(item.id, {
          proration_behavior: 'none',
        });
        logStep("Seat item removed entirely", { itemId: item.id });
      } else {
        await stripe.subscriptionItems.update(item.id, {
          quantity: newItemQuantity,
          proration_behavior: 'none',
        });
        logStep("Seat item updated", { itemId: item.id, newQuantity: newItemQuantity });
      }
    }
    
    logStep("All seat items processed - effective next billing cycle", { newTotalQuantity: newQuantity });

    // Update org_seats in Supabase
    const { error: updateError } = await supabaseClient
      .from('org_seats')
      .update({
        current_seat_count: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', account_id);

    if (updateError) {
      logStep("Warning: Failed to update org_seats", { error: updateError.message });
    } else {
      logStep("org_seats updated successfully", { newSeatCount: newQuantity });
    }

    // Log the billing event
    await supabaseClient
      .from('billing_events')
      .insert({
        org_id: account_id,
        event_type: 'seats_reduced',
        payload: {
          previous_quantity: currentQuantity,
          new_quantity: newQuantity,
          removed_quantity: quantity,
          user_id: user.id,
        },
      });

    return new Response(JSON.stringify({ 
      success: true,
      previousQuantity: currentQuantity,
      newQuantity,
      removedQuantity: quantity,
      message: `Redução de ${quantity} assento(s) confirmada. A alteração entrará em vigor a partir da próxima fatura.`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
