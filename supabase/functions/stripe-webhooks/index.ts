import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = createLogger("stripe-webhooks");
const logStep = (step: string, details?: any) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

// Price IDs para seats
const SEAT_PRICE_IDS = [
  "price_1SivVkKV6gEseQSlCuzv0qAM", // Original seat price
  "price_1SizCUKV6gEseQSlCVl5Wo4x"  // Additional seat price
];

/**
 * Extrai current_period_end de uma Subscription com compat para Stripe API 2025-08-27.basil.
 * Na nova API, current_period_end foi movido para subscription.items.data[i].current_period_end.
 * Retorna null se não encontrar (em vez de quebrar com Invalid time value).
 */
function getPeriodEnd(subscription: any): string | null {
  if (!subscription) return null;
  // Tentar campo legacy primeiro (compat)
  let ts: number | undefined = subscription.current_period_end;
  // Fallback: novo formato API basil
  if (!ts && subscription.items?.data?.length) {
    for (const item of subscription.items.data) {
      if (item?.current_period_end) {
        ts = item.current_period_end;
        break;
      }
    }
  }
  if (!ts || typeof ts !== "number" || !isFinite(ts)) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // Verificar assinatura do webhook (se configurado)
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: err });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      event = JSON.parse(body);
      logStep("Processing webhook without signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    // ===== IDEMPOTÊNCIA: verifica se este event.id já foi processado =====
    if (event.id) {
      const { data: existing } = await supabaseClient
        .from("billing_events")
        .select("id")
        .eq("stripe_event_id", event.id)
        .maybeSingle();
      if (existing) {
        logStep("Duplicate event, skipping", { eventId: event.id });
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Processar eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Suportar tanto org_id quanto account_id nos metadados
        const orgId = session.metadata?.org_id || session.metadata?.account_id;
        const checkoutType = session.metadata?.type;

        // === CREDIT SUBSCRIPTION CHECKOUT ===
        if (checkoutType === 'credit_subscription' && session.mode === 'subscription') {
          const creditOrgId = session.metadata?.org_id;
          const packageId = session.metadata?.package_id;
          const credits = parseInt(session.metadata?.credits || '0');
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          logStep("Credit subscription checkout completed", { creditOrgId, packageId, credits, subscriptionId });

          if (creditOrgId && subscriptionId) {
            // Set metadata on the subscription for future webhook identification
            await stripe.subscriptions.update(subscriptionId, {
              metadata: {
                org_id: creditOrgId,
                package_id: packageId || '',
                credits: credits.toString(),
                type: "credit_subscription",
              },
            });

            // Upsert org_credit_subscriptions
            await supabaseClient
              .from("org_credit_subscriptions")
              .upsert({
                org_id: creditOrgId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                package_id: packageId,
                status: "active",
                credits_per_period: credits,
                current_period_end: null, // will be set by invoice.paid
                updated_at: new Date().toISOString(),
              }, { onConflict: "org_id" });

            // Add initial credits
            logStep("Adding initial credits", { creditOrgId, credits });
            const { data: addResult, error: addError } = await supabaseClient.rpc('add_credits', {
              p_account_id: creditOrgId,
              p_credit_type: 'universal',
              p_amount: credits,
              p_operation: 'subscription_initial',
              p_description: `Assinatura inicial: ${credits} créditos`,
            });

            if (addError) {
              logStep("ERROR adding initial credits (logged, not thrown)", { error: addError.message, creditOrgId, credits });
              await supabaseClient.from("billing_events").insert({
                org_id: creditOrgId,
                event_type: "credit_add_failed",
                stripe_event_id: `${event.id}_credit_initial_error`,
                payload: { error: addError.message, credits, operation: 'subscription_initial' },
              });
            } else {
              logStep("Initial credits added successfully", { result: addResult, creditOrgId, credits });
            }

            await supabaseClient.from("billing_events").insert({
              org_id: creditOrgId,
              event_type: "credit_subscription_activated",
              stripe_event_id: event.id,
              payload: {
                subscription_id: subscriptionId,
                package_id: packageId,
                credits,
              },
            });

            logStep("Credit subscription activated and credits added", { creditOrgId, credits });
          }
          break;
        }
        const addedSeats = session.metadata?.quantity ? parseInt(session.metadata.quantity) : 0;
        
        logStep("Checkout completed", { 
          orgId, 
          customerId: session.customer,
          checkoutType,
          addedSeats,
          mode: session.mode,
          paymentStatus: session.payment_status
        });
        
        // NOVO FLUXO: Processar invite_seat_purchase (webhook-first)
        if (checkoutType === 'invite_seat_purchase' && session.mode === 'payment') {
          if (session.payment_status !== 'paid') {
            logStep("Invite seat purchase payment not completed, skipping", { 
              paymentStatus: session.payment_status 
            });
            break;
          }
          
          const accountId = session.metadata?.account_id;
          const inviteId = session.metadata?.invite_id;
          const email = session.metadata?.email;
          const role = session.metadata?.role;
          const targetSubscriptionId = session.metadata?.subscription_id;
          const priceId = session.metadata?.price_id || SEAT_PRICE_IDS[1];
          const quantity = 1;
          
          logStep("Processing invite seat purchase after payment", { 
            accountId, 
            inviteId,
            email,
            targetSubscriptionId,
            amountTotal: session.amount_total
          });
          
          if (targetSubscriptionId && accountId && inviteId) {
            // 1. Atualizar subscription no Stripe (adicionar seat)
            const subscription = await stripe.subscriptions.retrieve(targetSubscriptionId);
            
            // Somar todas as quantidades de todos os itens de seats
            let currentTotalSeats = 0;
            let primarySeatItem: Stripe.SubscriptionItem | null = null;
            
            for (const item of subscription.items.data) {
              if (SEAT_PRICE_IDS.includes(item.price.id)) {
                currentTotalSeats += item.quantity || 0;
                if (!primarySeatItem) {
                  primarySeatItem = item;
                }
              }
            }
            
            let newSeatCount = currentTotalSeats + quantity;
            
            if (primarySeatItem) {
              logStep("Updating seat item for invite (summed all seats)", { 
                itemId: primarySeatItem.id,
                currentTotalSeats,
                addedQuantity: quantity,
                newQuantity: newSeatCount
              });
              
              await stripe.subscriptionItems.update(primarySeatItem.id, {
                quantity: newSeatCount,
                proration_behavior: 'none',
              });
            } else {
              logStep("Creating new seat item for invite", { quantity, priceId });
              
              const newItem = await stripe.subscriptionItems.create({
                subscription: targetSubscriptionId,
                price: priceId,
                quantity: quantity,
                proration_behavior: 'none',
              });
              
              await supabaseClient
                .from("org_seats")
                .update({ stripe_seat_item_id: newItem.id })
                .eq("org_id", accountId);
            }
            
            // 2. Atualizar org_seats (current_seat_count e paid_seats)
            const { data: currentSeats } = await supabaseClient
              .from("org_seats")
              .select("current_seat_count, paid_seats")
              .eq("org_id", accountId)
              .single();
              
            await supabaseClient
              .from("org_seats")
              .update({ 
                current_seat_count: newSeatCount,
                paid_seats: (currentSeats?.paid_seats || 0) + quantity
              })
              .eq("org_id", accountId);
            
            // 3. Registrar em billing_invoices
            await supabaseClient.from("billing_invoices").insert({
              org_id: accountId,
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              amount_due: session.amount_total || 0,
              amount_paid: session.amount_total || 0,
              currency: session.currency || 'brl',
              status: 'paid',
              description: `Novo membro: ${email}`,
              related_invite_id: inviteId,
            });
            
            // 4. Atualizar invite para status 'sent'
            await supabaseClient
              .from("account_invites")
              .update({ 
                status: 'sent',
                stripe_payment_intent_id: session.payment_intent as string
              })
              .eq("id", inviteId);
            
            // 5. Buscar dados necessários para enviar email
            const { data: invite } = await supabaseClient
              .from("account_invites")
              .select("email, role, token")
              .eq("id", inviteId)
              .single();
            
            const { data: company } = await supabaseClient
              .from("companies")
              .select("name")
              .eq("id", accountId)
              .single();
              
            // 6. Enviar email de convite via Resend (chamada interna)
            try {
              const resendApiKey = Deno.env.get("RESEND_API_KEY");
              if (resendApiKey && invite?.email) {
                const origin = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://gentia.lovable.app";
                const inviteLink = `${origin}/app/accept-invite?invite_id=${inviteId}`;
                
                const roleLabels: Record<string, string> = {
                  owner: "Proprietário",
                  admin: "Administrador",
                  member: "Membro",
                  viewer: "Visualizador",
                };
                
                const emailHtml = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { text-align: center; margin-bottom: 30px; }
                      .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
                      .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                      .footer { font-size: 12px; color: #666; text-align: center; margin-top: 30px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>Convite para ${company?.name || 'a equipe'}</h1>
                      </div>
                      <div class="content">
                        <p>Olá!</p>
                        <p>Você foi convidado para fazer parte da equipe <strong>${company?.name || ''}</strong> como <strong>${roleLabels[invite.role] || invite.role}</strong>.</p>
                        <p>Clique no botão abaixo para aceitar o convite:</p>
                        <p style="text-align: center;">
                          <a href="${inviteLink}" class="button">Aceitar Convite</a>
                        </p>
                        <p style="font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:<br>${inviteLink}</p>
                      </div>
                      <div class="footer">
                        <p>Este convite expira em 7 dias.</p>
                        <p>Se você não esperava este convite, pode ignorar este email.</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `;
                
                const emailResponse = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${resendApiKey}`,
                  },
                  body: JSON.stringify({
                    from: "EP Partners <noreply@resend.ecpmais.com.br>",
                    to: [invite.email],
                    subject: `Convite para participar de ${company?.name || 'a equipe'}`,
                    html: emailHtml,
                  }),
                });
                
                if (emailResponse.ok) {
                  logStep("Invite email sent successfully", { email: invite.email });
                } else {
                  const errorText = await emailResponse.text();
                  logStep("Failed to send invite email", { error: errorText });
                }
              }
            } catch (emailError) {
              logStep("Error sending invite email", { error: String(emailError) });
              // Don't fail the webhook if email fails - invite is still created
            }
            
            // 7. Logar evento
            await supabaseClient.from("billing_events").insert({
              org_id: accountId,
              event_type: "invite_seat_purchased",
              stripe_event_id: event.id,
              payload: {
                checkout_session_id: session.id,
                invite_id: inviteId,
                email: email,
                amount_paid: session.amount_total,
                payment_intent: session.payment_intent,
              },
            });
            
            logStep("Invite seat purchase completed", { accountId, inviteId, email });
          }
          break;
        }
        
        // Processar seat_upgrade de pagamento único (mode: 'payment')
        if (checkoutType === 'seat_upgrade' && session.mode === 'payment') {
          // Verificar se o pagamento foi concluído
          if (session.payment_status !== 'paid') {
            logStep("Seat upgrade payment not completed, skipping", { 
              paymentStatus: session.payment_status 
            });
            break;
          }
          
          const accountId = session.metadata?.account_id;
          const quantity = parseInt(session.metadata?.quantity || '0');
          const targetSubscriptionId = session.metadata?.subscription_id;
          const priceId = session.metadata?.price_id || SEAT_PRICE_IDS[1];
          
          logStep("Processing seat upgrade after payment confirmation", { 
            accountId, 
            quantity, 
            targetSubscriptionId,
            priceId,
            amountTotal: session.amount_total
          });
          
          if (targetSubscriptionId && quantity > 0 && accountId) {
            // Recuperar subscription
            const subscription = await stripe.subscriptions.retrieve(targetSubscriptionId);
            
            // Somar todas as quantidades de todos os itens de seats
            let currentTotalSeats = 0;
            let primarySeatItem: Stripe.SubscriptionItem | null = null;
            
            for (const item of subscription.items.data) {
              if (SEAT_PRICE_IDS.includes(item.price.id)) {
                currentTotalSeats += item.quantity || 0;
                if (!primarySeatItem) {
                  primarySeatItem = item;
                }
              }
            }
            
            if (primarySeatItem) {
              // Atualizar quantidade do item existente
              const newQuantity = currentTotalSeats + quantity;
              
              logStep("Updating existing seat item (summed all seats)", { 
                itemId: primarySeatItem.id,
                currentTotalSeats,
                addedQuantity: quantity,
                newQuantity
              });
              
              await stripe.subscriptionItems.update(primarySeatItem.id, {
                quantity: newQuantity,
                proration_behavior: 'none', // Já cobramos pro-rata no checkout
              });
              
              // Atualizar org_seats
              await supabaseClient
                .from("org_seats")
                .update({ current_seat_count: newQuantity })
                .eq("org_id", accountId);
                
            } else {
              // Criar novo item de seats
              logStep("Creating new seat item", { quantity, priceId });
              
              const newItem = await stripe.subscriptionItems.create({
                subscription: targetSubscriptionId,
                price: priceId,
                quantity: quantity,
                proration_behavior: 'none',
              });
              
              // Atualizar org_seats
              await supabaseClient
                .from("org_seats")
                .update({ 
                  current_seat_count: quantity,
                  stripe_seat_item_id: newItem.id
                })
                .eq("org_id", accountId);
            }
            
            // Logar evento
            await supabaseClient.from("billing_events").insert({
              org_id: accountId,
              event_type: "seats_upgraded",
              stripe_event_id: event.id,
              payload: {
                checkout_session_id: session.id,
                quantity_added: quantity,
                amount_paid: session.amount_total,
                payment_intent: session.payment_intent,
              },
            });
            
            logStep("Seat upgrade completed via checkout", { accountId, quantity });
          }
          break;
        }
        
        // Fluxo normal para subscriptions
        logStep("MAIN SUBSCRIPTION FLOW - Starting", { orgId, checkoutType, sessionId: session.id, customer: session.customer, subscription: session.subscription });
        if (orgId) {
          // Buscar subscription
          let subscriptionId = session.subscription as string;
          let subscription: Stripe.Subscription | null = null;
          
          if (subscriptionId) {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          }

          // Determinar status e datas de trial
          const isTrialing = subscription?.status === "trialing";
          const trialStart = subscription?.trial_start 
            ? new Date(subscription.trial_start * 1000).toISOString() 
            : null;
          const trialEnd = subscription?.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString() 
            : null;

          logStep("Subscription status", { 
            isTrialing, 
            status: subscription?.status,
            trialStart,
            trialEnd 
          });

          // Criar ou atualizar org_billing
          const { error: billingError } = await supabaseClient
            .from("org_billing")
            .upsert({
              org_id: orgId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              status: isTrialing ? "trialing" : "active",
              current_period_end: getPeriodEnd(subscription),
              trial_start: trialStart,
              trial_end: trialEnd,
            }, { onConflict: "org_id" });

          if (billingError) {
            logStep("Error upserting billing", { error: billingError });
          }

          // Atualizar org_seats
          if (subscription) {
            const BASE_PRICE_IDS = [
              "price_1SivZbKV6gEseQSlAlIoMXok", // R$ 297 (atual)
              "price_1SivVVKV6gEseQSlq5aQKC2D", // R$ 197 (legado)
            ];
            const baseItem = subscription.items.data.find(
              (item: Stripe.SubscriptionItem) => BASE_PRICE_IDS.includes(item.price.id)
            );
            
            // Somar todas as quantidades de todos os itens de seats
            let seatCount = 0;
            let primarySeatItem: Stripe.SubscriptionItem | null = null;
            
            for (const item of subscription.items.data) {
              if (SEAT_PRICE_IDS.includes(item.price.id)) {
                seatCount += item.quantity || 0;
                if (!primarySeatItem) {
                  primarySeatItem = item;
                }
              }
            }
            
            logStep("Updating org_seats (summed all seats)", { 
              orgId, 
              seatCount, 
              seatItemId: primarySeatItem?.id,
              checkoutType 
            });

            await supabaseClient
              .from("org_seats")
              .upsert({
                org_id: orgId,
                stripe_base_item_id: baseItem?.id,
                stripe_seat_item_id: primarySeatItem?.id,
                current_seat_count: seatCount,
              }, { onConflict: "org_id" });
          }

          // Logar evento
          const eventType = checkoutType === 'additional_seats' 
            ? 'seats_purchased' 
            : (isTrialing ? 'trial_started' : 'subscription_activated');
            
          await supabaseClient.from("billing_events").insert({
            org_id: orgId,
            event_type: eventType,
            stripe_event_id: event.id,
            payload: {
              customer_id: session.customer,
              subscription_id: subscriptionId,
              trial_end: trialEnd,
              added_seats: addedSeats,
              checkout_type: checkoutType,
            },
          });
          
          logStep("Billing event logged", { eventType, addedSeats });
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial vai acabar em 3 dias
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;
        
        if (orgId) {
          logStep("Trial will end soon", { orgId, trialEnd: subscription.trial_end });
          
          await supabaseClient.from("billing_events").insert({
            org_id: orgId,
            event_type: "trial_ending_soon",
            stripe_event_id: event.id,
            payload: {
              subscription_id: subscription.id,
              trial_end: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
            },
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const invoiceMetadata = invoice.metadata || {};
        
        logStep("Invoice paid", { 
          invoiceId: invoice.id, 
          subscriptionId,
          amountPaid: invoice.amount_paid,
          metadata: invoiceMetadata 
        });
        
        // CORREÇÃO: Ignorar faturas de R$ 0,00 - não devem processar nada
        if (invoice.amount_paid === 0) {
          logStep("Ignoring zero-amount invoice - no action taken", { 
            invoiceId: invoice.id,
            status: invoice.status 
          });
          break;
        }
        
        // Verificar se é uma fatura de upgrade de assentos (fluxo antigo com invoice)
        // NOTA: O novo fluxo usa checkout.session.completed, mas mantemos este para compatibilidade
        if (invoiceMetadata.type === 'seat_upgrade') {
          const accountId = invoiceMetadata.account_id;
          const quantity = parseInt(invoiceMetadata.quantity || '0');
          const targetSubscriptionId = invoiceMetadata.subscription_id;
          const priceId = invoiceMetadata.price_id || SEAT_PRICE_IDS[1];
          
          logStep("Processing seat upgrade after invoice payment", { 
            accountId, 
            quantity, 
            targetSubscriptionId,
            priceId,
            amountPaid: invoice.amount_paid
          });
          
          if (targetSubscriptionId && quantity > 0) {
            // Recuperar subscription
            const subscription = await stripe.subscriptions.retrieve(targetSubscriptionId);
            
            // Somar todas as quantidades de todos os itens de seats
            let currentTotalSeats = 0;
            let primarySeatItem: Stripe.SubscriptionItem | null = null;
            
            for (const item of subscription.items.data) {
              if (SEAT_PRICE_IDS.includes(item.price.id)) {
                currentTotalSeats += item.quantity || 0;
                if (!primarySeatItem) {
                  primarySeatItem = item;
                }
              }
            }
            
            if (primarySeatItem) {
              // Atualizar quantidade do item existente
              const newQuantity = currentTotalSeats + quantity;
              
              logStep("Updating seat item via invoice (summed all seats)", { 
                itemId: primarySeatItem.id,
                currentTotalSeats,
                addedQuantity: quantity,
                newQuantity
              });
              
              await stripe.subscriptionItems.update(primarySeatItem.id, {
                quantity: newQuantity,
                proration_behavior: 'none', // Já cobramos pro-rata na fatura
              });
              
              // Atualizar org_seats
              await supabaseClient
                .from("org_seats")
                .update({ current_seat_count: newQuantity })
                .eq("org_id", accountId);
                
            } else {
              // Criar novo item de seats
              logStep("Creating new seat item", { quantity, priceId });
              
              const newItem = await stripe.subscriptionItems.create({
                subscription: targetSubscriptionId,
                price: priceId,
                quantity: quantity,
                proration_behavior: 'none',
              });
              
              // Atualizar org_seats
              await supabaseClient
                .from("org_seats")
                .update({ 
                  current_seat_count: quantity,
                  stripe_seat_item_id: newItem.id
                })
                .eq("org_id", accountId);
            }
            
            // Logar evento
            await supabaseClient.from("billing_events").insert({
              org_id: accountId,
              event_type: "seats_upgraded",
              stripe_event_id: event.id,
              payload: {
                invoice_id: invoice.id,
                quantity_added: quantity,
                amount_paid: invoice.amount_paid,
              },
            });
            
            logStep("Seat upgrade completed via invoice", { accountId, quantity });
          }
        } else if (subscriptionId) {
          // Check if this is a credit subscription renewal
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const subType = subscription.metadata?.type;

          if (subType === 'credit_subscription') {
            const creditOrgId = subscription.metadata?.org_id;
            const metadataCredits = parseInt(subscription.metadata?.credits || '0');
            const billingReason = (invoice as any).billing_reason as string | undefined;

            // Source of truth for credit amount on renewal = current package value in DB.
            // This guarantees that admin price-table edits (e.g. Pro 1: 50 → 65) are honored
            // on the next renewal even if Stripe subscription metadata is stale.
            let credits = metadataCredits;
            if (creditOrgId) {
              const { data: subRow } = await supabaseClient
                .from("org_credit_subscriptions")
                .select("credits_per_period, package_id, recruitment_credit_packages(credits)")
                .eq("org_id", creditOrgId)
                .maybeSingle();
              const pkgCredits = (subRow as any)?.recruitment_credit_packages?.credits;
              const subCredits = subRow?.credits_per_period;
              const liveCredits = pkgCredits ?? subCredits ?? metadataCredits;
              if (liveCredits && liveCredits !== metadataCredits) {
                logStep("Using DB package credits over Stripe metadata snapshot", {
                  creditOrgId, metadataCredits, pkgCredits, subCredits, liveCredits,
                });
              }
              credits = liveCredits || metadataCredits;
            }


            if (creditOrgId && credits > 0) {
              // Only credit the FULL plan amount on initial purchase or scheduled renewal.
              // 'subscription_update' invoices are pro-rata charges from upgrades — those
              // are already credited proportionally inside credits-subscribe.
              const shouldCreditFullPackage =
                billingReason === 'subscription_create' ||
                billingReason === 'subscription_cycle' ||
                !billingReason; // safety fallback for legacy invoices

              if (!shouldCreditFullPackage) {
                logStep("Skipping renewal credit for non-renewal invoice", { creditOrgId, billingReason, invoiceId: invoice.id });
                await supabaseClient.from("billing_events").insert({
                  org_id: creditOrgId,
                  event_type: "credit_proration_invoice_paid",
                  stripe_event_id: event.id,
                  payload: { invoice_id: invoice.id, billing_reason: billingReason, amount_paid: invoice.amount_paid },
                });
              } else {
                logStep("Credit subscription renewal", { creditOrgId, credits, invoiceId: invoice.id, billingReason });

                // Accumulate credits (don't reset)
                logStep("Adding renewal credits", { creditOrgId, credits });
                const { data: renewResult, error: renewError } = await supabaseClient.rpc('add_credits', {
                  p_account_id: creditOrgId,
                  p_credit_type: 'universal',
                  p_amount: credits,
                  p_operation: 'subscription_renewal',
                  p_description: `Renovação mensal: ${credits} créditos`,
                });

                if (renewError) {
                  logStep("ERROR adding renewal credits (logged, not thrown)", { error: renewError.message, creditOrgId, credits });
                  await supabaseClient.from("billing_events").insert({
                    org_id: creditOrgId,
                    event_type: "credit_add_failed",
                    stripe_event_id: `${event.id}_credit_renewal_error`,
                    payload: { error: renewError.message, credits, operation: 'subscription_renewal' },
                  });
                } else {
                  logStep("Renewal credits added successfully", { result: renewResult, creditOrgId, credits });
                }
              }

              // Update period end
              await supabaseClient
                .from("org_credit_subscriptions")
                .update({
                  status: "active",
                  current_period_end: getPeriodEnd(subscription),
                  updated_at: new Date().toISOString(),
                })
                .eq("org_id", creditOrgId);

              await supabaseClient.from("billing_events").insert({
                org_id: creditOrgId,
                event_type: "credit_subscription_renewed",
                stripe_event_id: event.id,
                payload: {
                  invoice_id: invoice.id,
                  credits_added: credits,
                  amount_paid: invoice.amount_paid,
                },
              });

              logStep("Credit subscription renewed, credits accumulated", { creditOrgId, credits });
            }
          } else {
          // Fatura normal de subscription
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          let orgId = subscription.metadata?.org_id;
          
          // FALLBACK: Se não tem org_id no metadata, buscar pelo stripe_customer_id
          if (!orgId) {
            const customerId = invoice.customer as string;
            logStep("No org_id in metadata, searching by customer_id", { customerId, subscriptionId });
            
            const { data: billingByCustomer } = await supabaseClient
              .from("org_billing")
              .select("org_id")
              .eq("stripe_customer_id", customerId)
              .eq("stripe_subscription_id", subscriptionId)
              .single();
            
            if (billingByCustomer) {
              orgId = billingByCustomer.org_id;
              logStep("Found org by customer_id and subscription_id", { orgId, customerId });
            } else {
              // Tentar buscar apenas pelo subscription_id
              const { data: billingBySub } = await supabaseClient
                .from("org_billing")
                .select("org_id")
                .eq("stripe_subscription_id", subscriptionId)
                .single();
              
              if (billingBySub) {
                orgId = billingBySub.org_id;
                logStep("Found org by subscription_id", { orgId, subscriptionId });
              }
            }
          }
          
          if (orgId) {
            logStep("Regular invoice paid", { orgId, invoiceId: invoice.id, amountPaid: invoice.amount_paid });
            
            await supabaseClient
              .from("org_billing")
              .update({
                status: "active",
                current_period_end: getPeriodEnd(subscription),
                grace_until: null,
                blocked_at: null,
              })
              .eq("org_id", orgId);

            await supabaseClient.from("billing_events").insert({
              org_id: orgId,
              event_type: "invoice_paid",
              stripe_event_id: event.id,
              payload: {
                invoice_id: invoice.id,
                amount_paid: invoice.amount_paid,
              },
            });
          } else {
            logStep("WARNING: Could not find org for invoice", { 
              invoiceId: invoice.id, 
              subscriptionId,
              customerId: invoice.customer 
            });
          }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const orgId = subscription.metadata?.org_id;
          
          if (orgId) {
            logStep("Payment failed", { orgId, invoiceId: invoice.id });
            
            // Calcular grace period (7 dias)
            const graceUntil = new Date();
            graceUntil.setDate(graceUntil.getDate() + 7);
            
            await supabaseClient
              .from("org_billing")
              .update({
                status: "past_due",
                grace_until: graceUntil.toISOString(),
              })
              .eq("org_id", orgId);

            await supabaseClient.from("billing_events").insert({
              org_id: orgId,
              event_type: "payment_failed",
              stripe_event_id: event.id,
              payload: {
                invoice_id: invoice.id,
                grace_until: graceUntil.toISOString(),
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;
        const subType = subscription.metadata?.type;
        
        if (subType === 'credit_subscription' && orgId) {
          logStep("Credit subscription canceled", { orgId });
          await supabaseClient
            .from("org_credit_subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("org_id", orgId);

          await supabaseClient.from("billing_events").insert({
            org_id: orgId,
            event_type: "credit_subscription_canceled",
            stripe_event_id: event.id,
            payload: { subscription_id: subscription.id },
          });
        } else if (orgId) {
          logStep("Subscription canceled", { orgId });
          
          await supabaseClient
            .from("org_billing")
            .update({ status: "canceled" })
            .eq("org_id", orgId);

          await supabaseClient.from("billing_events").insert({
            org_id: orgId,
            event_type: "subscription_canceled",
            stripe_event_id: event.id,
            payload: { subscription_id: subscription.id },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let orgId = subscription.metadata?.org_id || subscription.metadata?.account_id;
        const customerId = subscription.customer as string;
        const subType = subscription.metadata?.type;

        // Handle credit subscription updates separately
        if (subType === 'credit_subscription' && orgId) {
          const credits = parseInt(subscription.metadata?.credits || '0');
          const packageId = subscription.metadata?.package_id;
          logStep("Credit subscription updated", { orgId, status: subscription.status, credits });

          await supabaseClient
            .from("org_credit_subscriptions")
            .update({
              status: subscription.status,
              credits_per_period: credits,
              package_id: packageId || null,
              current_period_end: getPeriodEnd(subscription),
              updated_at: new Date().toISOString(),
            })
            .eq("org_id", orgId);

          break;
        }
        
        // FALLBACK: Se não tem org_id no metadata, buscar pelo stripe_customer_id
        if (!orgId) {
          logStep("No org_id in metadata, searching by customer_id", { customerId, subscriptionId: subscription.id });
          
          const { data: billingByCustomer } = await supabaseClient
            .from("org_billing")
            .select("org_id")
            .eq("stripe_customer_id", customerId)
            .eq("stripe_subscription_id", subscription.id)
            .single();
          
          if (billingByCustomer) {
            orgId = billingByCustomer.org_id;
            logStep("Found org by customer_id and subscription_id", { orgId, customerId });
          } else {
            // Tentar buscar apenas pelo subscription_id
            const { data: billingBySub } = await supabaseClient
              .from("org_billing")
              .select("org_id")
              .eq("stripe_subscription_id", subscription.id)
              .single();
            
            if (billingBySub) {
              orgId = billingBySub.org_id;
              logStep("Found org by subscription_id", { orgId, subscriptionId: subscription.id });
            }
          }
        }
        
        if (orgId) {
          logStep("Subscription updated", { orgId, status: subscription.status });
          
          // Somar todas as quantidades de todos os itens de seats
          let totalSeatCount = 0;
          let primarySeatItem: Stripe.SubscriptionItem | null = null;
          
          for (const item of subscription.items.data) {
            if (SEAT_PRICE_IDS.includes(item.price.id)) {
              totalSeatCount += item.quantity || 0;
              if (!primarySeatItem) {
                primarySeatItem = item;
              }
            }
          }

          if (primarySeatItem || totalSeatCount > 0) {
            logStep("Updating seat count from subscription update (summed all seats)", { 
              totalSeatCount, 
              seatItemId: primarySeatItem?.id 
            });
            
            await supabaseClient
              .from("org_seats")
              .update({
                current_seat_count: totalSeatCount,
                stripe_seat_item_id: primarySeatItem?.id,
              })
              .eq("org_id", orgId);
          }

          // Atualizar period_end e limpar bloqueio se ativo
          await supabaseClient
            .from("org_billing")
            .update({
              current_period_end: getPeriodEnd(subscription),
              status: subscription.status === 'active' ? 'active' : subscription.status,
              blocked_at: subscription.status === 'active' ? null : undefined,
            })
            .eq("org_id", orgId);
        } else {
          logStep("WARNING: Could not find org for subscription update", { 
            subscriptionId: subscription.id,
            customerId 
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR in webhook handler (returning 200 to avoid Stripe retries)", {
      message: errorMessage,
      stack: errorStack,
    });
    // Persistir erro em billing_events para auditoria (best-effort)
    try {
      await supabaseClient.from("billing_events").insert({
        event_type: "webhook_processing_error",
        stripe_event_id: `error_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        payload: {
          error: errorMessage,
          stack: errorStack?.slice(0, 2000),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (logErr) {
      logStep("Failed to persist webhook error", { error: String(logErr) });
    }
    // Retornar 200 para evitar retentativas infinitas da Stripe em bugs lógicos internos
    return new Response(
      JSON.stringify({ received: true, error_logged: true, message: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
