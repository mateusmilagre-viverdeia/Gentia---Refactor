import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Build version: 2024-12-31T16:30:00Z - Direct API update (NO PortalSession)
const BUILD_VERSION = "v2.0.0-direct-api";

const log = createLogger("create-seats-increase-portal");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

interface CreatePortalRequest {
  account_id: string;
  subscription_id: string;
  seat_subscription_item_id: string | null;
  new_quantity: number;
  seat_price_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { build: BUILD_VERSION });
    logStep("IMPORTANT: This version uses direct Stripe API, NOT PortalSession");

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

    const { account_id, subscription_id, seat_subscription_item_id, new_quantity, seat_price_id }: CreatePortalRequest = await req.json();
    
    if (!account_id || !subscription_id || new_quantity < 1) {
      throw new Error("account_id, subscription_id, and new_quantity (>= 1) are required");
    }
    logStep("Request parsed", { account_id, subscription_id, seat_subscription_item_id, new_quantity, seat_price_id });

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

    // Get stripe customer id
    const { data: billing } = await supabaseClient
      .from('org_billing')
      .select('stripe_customer_id')
      .eq('org_id', account_id)
      .single();

    if (!billing?.stripe_customer_id) {
      throw new Error("Stripe customer not found");
    }
    logStep("Stripe customer found", { customerId: billing.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let updatedItem;

    if (seat_subscription_item_id) {
      // Existing seat item - update quantity directly
      logStep("Updating existing seat item", { 
        itemId: seat_subscription_item_id,
        newQuantity: new_quantity 
      });

      updatedItem = await stripe.subscriptionItems.update(seat_subscription_item_id, {
        quantity: new_quantity,
        proration_behavior: 'create_prorations',
      });

      logStep("Seat item updated successfully", { itemId: updatedItem.id, quantity: updatedItem.quantity });
    } else {
      // No existing seat item - create new item
      if (!seat_price_id) {
        throw new Error("seat_price_id is required when creating new seat item");
      }

      logStep("Creating new seat item", { 
        subscriptionId: subscription_id,
        priceId: seat_price_id,
        quantity: new_quantity 
      });

      updatedItem = await stripe.subscriptionItems.create({
        subscription: subscription_id,
        price: seat_price_id,
        quantity: new_quantity,
        proration_behavior: 'create_prorations',
      });

      logStep("New seat item created successfully", { itemId: updatedItem.id, quantity: updatedItem.quantity });
    }

    // Update org_seats in database with correct column names
    const { error: updateError } = await supabaseClient
      .from('org_seats')
      .update({ 
        current_seat_count: new_quantity,
        stripe_seat_item_id: updatedItem.id,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', account_id);

    if (updateError) {
      logStep("Warning: Failed to update org_seats", { error: updateError.message });
      // Don't throw - Stripe update was successful
    } else {
      logStep("org_seats updated successfully", { 
        current_seat_count: new_quantity,
        stripe_seat_item_id: updatedItem.id 
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Seats updated successfully. Pro-rata charge will be applied.",
      item_id: updatedItem.id,
      new_quantity: updatedItem.quantity
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
