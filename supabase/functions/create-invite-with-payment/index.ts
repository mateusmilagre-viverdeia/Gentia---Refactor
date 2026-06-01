import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('create-invite-with-payment');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  account_id: string;
  email: string;
  role: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.log("Function started");

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
    log.log("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { account_id, email, role }: InviteRequest = await req.json();
    log.log("Request parsed", { account_id, email, role });

    if (!account_id || !email || !role) {
      throw new Error("Missing required parameters: account_id, email, role");
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
      throw new Error("User does not have permission to invite members");
    }
    log.log("User permission verified", { role: memberData.role });

    // Check if email is already a member
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase());

    if (profiles && profiles.length > 0) {
      const { data: existingMember } = await supabaseClient
        .from('account_members')
        .select('id')
        .eq('account_id', account_id)
        .eq('user_id', profiles[0].id)
        .maybeSingle();

      if (existingMember) {
        throw new Error("Este usuário já é membro desta organização");
      }
    }

    // Check if there's already a pending invite for this email
    const { data: existingInvite } = await supabaseClient
      .from('account_invites')
      .select('id, status')
      .eq('account_id', account_id)
      .eq('email', email.toLowerCase())
      .in('status', ['pending', 'awaiting_payment', 'sent'])
      .maybeSingle();

    if (existingInvite) {
      throw new Error("Já existe um convite pendente para este email");
    }

    // Get org billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('org_id', account_id)
      .maybeSingle();

    if (!billing || !billing.stripe_subscription_id) {
      throw new Error("Organização não possui assinatura ativa. Inicie uma assinatura primeiro.");
    }

    if (!['active', 'trialing'].includes(billing.status)) {
      throw new Error("Assinatura não está ativa. Regularize o pagamento primeiro.");
    }

    log.log("Billing info fetched", { 
      hasCustomer: !!billing.stripe_customer_id,
      hasSubscription: !!billing.stripe_subscription_id,
      status: billing.status
    });

    // Get company name
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', account_id)
      .single();

    // Create invite with status 'awaiting_payment'
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const { data: invite, error: inviteError } = await supabaseClient
      .from('account_invites')
      .insert({
        account_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        status: 'awaiting_payment',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError || !invite) {
      log.error("Error creating invite", { error: inviteError });
      throw new Error("Erro ao criar convite");
    }

    log.log("Invite created", { inviteId: invite.id, status: 'awaiting_payment' });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate pro-rata amount
    const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
    
    log.log("Subscription retrieved", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end
    });

    // Price for additional seat: R$ 19,90 = 1990 centavos
    const SEAT_PRICE_ID = "price_1SizCUKV6gEseQSlCVl5Wo4x";
    const monthlyPriceCents = 1990;
    
    let proRataAmount = monthlyPriceCents; // Default to full month price
    let remainingDays = 30;
    let totalDays = 30;
    
    // Calculate pro-rata only if we have valid period dates
    const periodEnd = subscription.current_period_end;
    const periodStart = subscription.current_period_start;
    
    if (periodEnd && periodStart && typeof periodEnd === 'number' && typeof periodStart === 'number') {
      const now = Math.floor(Date.now() / 1000);
      totalDays = Math.max(1, Math.round((periodEnd - periodStart) / 86400));
      remainingDays = Math.max(1, Math.round((periodEnd - now) / 86400));
      
      // Calculate pro-rata
      const dailyPrice = monthlyPriceCents / totalDays;
      proRataAmount = Math.max(100, Math.ceil(dailyPrice * remainingDays)); // Min R$ 1,00
      
      log.log("Pro-rata calculation", { 
        totalDays,
        remainingDays,
        monthlyPriceCents,
        dailyPrice: dailyPrice.toFixed(2),
        proRataAmount
      });
    } else {
      // If no period info, charge full month
      log.log("No period info, using full month price", { proRataAmount });
    }

    // Format next billing date
    const nextBillingDate = new Date(periodEnd * 1000);
    const formattedNextBilling = nextBillingDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.lovable.app";

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: billing.stripe_customer_id,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: proRataAmount,
            product_data: {
              name: `Novo membro: ${email}`,
              description: `Pro-rata: R$ 19,90 × ${Math.ceil(remainingDays)}/${Math.ceil(totalDays)} dias. A partir de ${formattedNextBilling}, será cobrado R$ 19,90/mês.`,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/conta/usuarios?invite_paid=true&invite_id=${invite.id}`,
      cancel_url: `${origin}/conta/usuarios?invite_cancelled=true`,
      metadata: {
        account_id,
        type: 'invite_seat_purchase',
        invite_id: invite.id,
        email: email.toLowerCase(),
        role,
        subscription_id: subscription.id,
        price_id: SEAT_PRICE_ID,
        quantity: '1',
      },
      payment_intent_data: {
        metadata: {
          account_id,
          type: 'invite_seat_purchase',
          invite_id: invite.id,
          email: email.toLowerCase(),
          role,
          subscription_id: subscription.id,
        },
      },
    });

    // Update invite with checkout session ID
    await supabaseClient
      .from('account_invites')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', invite.id);

    log.log("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      inviteId: invite.id,
      proRataAmount: proRataAmount / 100
    });

    return new Response(JSON.stringify({ 
      success: true,
      url: session.url,
      inviteId: invite.id,
      proRataAmount: proRataAmount / 100, // Em reais
      remainingDays: Math.ceil(remainingDays),
      nextBillingDate: formattedNextBilling,
      companyName: company?.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
