import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SEATS] ${step}${detailsStr}`);
};

interface UpdateSeatsRequest {
  account_id: string;
  action: 'increment' | 'decrement' | 'sync';
}

// Price IDs para seats
const SEAT_PRICE_IDS = [
  "price_1SivVkKV6gEseQSlCuzv0qAM",
  "price_1SizCUKV6gEseQSlCVl5Wo4x"
];

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

    const { account_id, action }: UpdateSeatsRequest = await req.json();
    
    if (!account_id) {
      throw new Error("account_id is required");
    }
    logStep("Request parsed", { account_id, action });

    // Verify user has permission (owner, admin, or EP consultant)
    const { data: membership, error: memberError } = await supabaseClient
      .from('account_members')
      .select('role')
      .eq('account_id', account_id)
      .eq('user_id', userData.user.id)
      .single();

    const isAccountAdmin = !memberError && membership && ['owner', 'admin'].includes(membership.role);

    if (!isAccountAdmin) {
      // Fallback: check if user is an EP consultant assigned to this account
      const { data: isConsultant } = await supabaseClient.rpc(
        'can_edit_client_project',
        { _user_id: userData.user.id, _account_id: account_id }
      );

      if (!isConsultant) {
        throw new Error("Permission denied - must be owner or admin");
      }
      logStep("Permission verified via EP consultant access");
    } else {
      logStep("Permission verified", { role: membership.role });
    }

    // Get org billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_subscription_id, stripe_customer_id, status')
      .eq('org_id', account_id)
      .maybeSingle();

    if (!billing || !billing.stripe_subscription_id) {
      logStep("No subscription found", { account_id });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No active subscription to sync",
        seats: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Billing info retrieved", { 
      subscriptionId: billing.stripe_subscription_id,
      status: billing.status 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription from Stripe (READ-ONLY)
    const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
    
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      logStep("Subscription not active", { status: subscription.status });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Subscription is not active",
        seats: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Sum ALL seat items in the subscription (handles multiple seat items)
    let currentSeatCount = 0;
    let primarySeatItem: Stripe.SubscriptionItem | null = null;
    const allSeatItems: Array<{ id: string; quantity: number; priceId: string }> = [];

    for (const item of subscription.items.data) {
      const isSeatItem = SEAT_PRICE_IDS.includes(item.price.id) ||
        item.price.lookup_key === 'additional_seat' || 
        item.price.metadata?.type === 'seat';
      
      if (isSeatItem) {
        currentSeatCount += item.quantity || 0;
        allSeatItems.push({ id: item.id, quantity: item.quantity || 0, priceId: item.price.id });
        if (!primarySeatItem) {
          primarySeatItem = item;
        }
      }
    }
    
    logStep("Current seat count from Stripe (summed all items)", { 
      seatItemsCount: allSeatItems.length,
      allSeatItems,
      currentSeatCount
    });

    // Get current member and invite counts from database
    const { count: memberCount } = await supabaseClient
      .from('account_members')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account_id);

    const { count: inviteCount } = await supabaseClient
      .from('account_invites')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account_id)
      .eq('accepted', false);

    // Get included seats from org_seats
    const { data: orgSeats } = await supabaseClient
      .from('org_seats')
      .select('included_seats')
      .eq('org_id', account_id)
      .maybeSingle();

    const includedSeats = orgSeats?.included_seats || 1;
    const totalSeats = includedSeats + currentSeatCount;
    const usedSeats = memberCount || 0;
    const pendingSeats = inviteCount || 0;
    const availableSeats = Math.max(0, totalSeats - usedSeats - pendingSeats);

    logStep("Seats calculated", { 
      includedSeats,
      currentSeatCount,
      totalSeats,
      usedSeats,
      pendingSeats,
      availableSeats
    });

    // UPDATE DATABASE ONLY - DO NOT MODIFY STRIPE SUBSCRIPTION
    // This is now a READ-ONLY sync that just reads from Stripe and updates our database
    await supabaseClient
      .from('org_seats')
      .upsert({
        org_id: account_id,
        current_seat_count: currentSeatCount,
        stripe_seat_item_id: primarySeatItem?.id || null,
        included_seats: includedSeats,
        updated_at: new Date().toISOString()
      }, { onConflict: 'org_id' });

    logStep("org_seats synced from Stripe (read-only)");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Seats synced from Stripe",
      seats: {
        included: includedSeats,
        additional: currentSeatCount,
        total: totalSeats,
        used: usedSeats,
        pending: pendingSeats,
        available: availableSeats
      }
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
