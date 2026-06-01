import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("create-seats-reduction-portal");
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
  seat_subscription_item_id: string;
  new_quantity: number;
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

    const { 
      account_id, 
      subscription_id, 
      seat_subscription_item_id, 
      new_quantity 
    }: CreatePortalRequest = await req.json();
    
    if (!account_id || !subscription_id || !seat_subscription_item_id || new_quantity === undefined) {
      throw new Error("account_id, subscription_id, seat_subscription_item_id, and new_quantity are required");
    }
    logStep("Request parsed", { account_id, subscription_id, seat_subscription_item_id, new_quantity });

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

    // Get Stripe customer ID
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_customer_id')
      .eq('org_id', account_id)
      .single();

    if (billingError || !billing?.stripe_customer_id) {
      throw new Error("No Stripe customer found for this organization");
    }

    const customerId = billing.stripe_customer_id;
    logStep("Customer ID retrieved", { customerId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get origin for return URL
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const returnUrl = `${origin}/conta/usuarios?seats_reduced=true`;

    // Create portal session with subscription update flow
    // This will show the user a confirmation page with the new quantity
    let portalSession;

    if (new_quantity === 0) {
      // If reducing to 0 seats, we need to cancel the seat item entirely
      // Use the regular portal without flow_data so user can manage subscription
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      logStep("Created regular portal session (removing all seats)", { sessionId: portalSession.id });
    } else {
      // Use flow_data for quantity update
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        flow_data: {
          type: 'subscription_update_confirm',
          subscription_update_confirm: {
            subscription: subscription_id,
            items: [{
              id: seat_subscription_item_id,
              quantity: new_quantity,
            }],
          },
        },
      });
      logStep("Created portal session with update flow", { 
        sessionId: portalSession.id, 
        newQuantity: new_quantity 
      });
    }

    return new Response(JSON.stringify({
      url: portalSession.url,
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
