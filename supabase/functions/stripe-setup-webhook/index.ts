import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SETUP-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("is_ep_admin")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.is_ep_admin) {
      throw new Error("Only EP admins can manage webhooks");
    }

    logStep("Admin verified", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const { action } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhooks`;

    const enabledEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
      "checkout.session.completed",
      "invoice.paid",
      "invoice.payment_failed",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "customer.subscription.trial_will_end",
    ];

    logStep("Listing existing webhooks");

    // Listar webhooks existentes
    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existingWebhook = existingWebhooks.data.find((w: Stripe.WebhookEndpoint) => w.url === webhookUrl);

    logStep("Webhooks listed", { 
      total: existingWebhooks.data.length, 
      found: !!existingWebhook 
    });

    if (action === "check") {
      const currentSecretConfigured = !!Deno.env.get("STRIPE_WEBHOOK_SECRET");
      
      return new Response(JSON.stringify({
        configured: !!existingWebhook,
        secret_configured: currentSecretConfigured,
        webhook: existingWebhook ? {
          id: existingWebhook.id,
          url: existingWebhook.url,
          status: existingWebhook.status,
          enabled_events: existingWebhook.enabled_events,
          created: new Date(existingWebhook.created * 1000).toISOString(),
        } : null,
        expected_url: webhookUrl,
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (action === "create") {
      if (existingWebhook) {
        logStep("Updating existing webhook", { webhookId: existingWebhook.id });
        
        // Atualizar eventos se necessário
        const webhook = await stripe.webhookEndpoints.update(existingWebhook.id, {
          enabled_events: enabledEvents,
          description: "ECP - Webhook automático via API (atualizado)",
        });

        logStep("Webhook updated successfully");

        return new Response(JSON.stringify({
          success: true,
          action: "updated",
          message: "Webhook já existia e foi atualizado com os eventos corretos",
          webhook_id: webhook.id,
          webhook_url: webhook.url,
          enabled_events: webhook.enabled_events,
          note: "O webhook_secret permanece o mesmo. Se você não tem o secret salvo, delete e recrie o webhook.",
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      logStep("Creating new webhook");

      // Criar novo webhook
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: enabledEvents,
        description: "ECP - Webhook automático via API",
      });

      logStep("Webhook created successfully", { webhookId: webhook.id });

      return new Response(JSON.stringify({
        success: true,
        action: "created",
        message: "Webhook criado com sucesso!",
        webhook_id: webhook.id,
        webhook_url: webhook.url,
        webhook_secret: webhook.secret,
        enabled_events: webhook.enabled_events,
        instructions: [
          "IMPORTANTE: Copie o webhook_secret acima!",
          "Adicione como STRIPE_WEBHOOK_SECRET nos secrets do projeto",
          "Este secret só é mostrado uma vez na criação",
        ],
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (action === "delete") {
      if (!existingWebhook) {
        return new Response(JSON.stringify({
          success: false,
          message: "Nenhum webhook encontrado para deletar",
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      logStep("Deleting webhook", { webhookId: existingWebhook.id });

      await stripe.webhookEndpoints.del(existingWebhook.id);

      logStep("Webhook deleted successfully");

      return new Response(JSON.stringify({
        success: true,
        action: "deleted",
        message: "Webhook deletado com sucesso. Você pode criar um novo para obter um novo secret.",
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (action === "list_all") {
      const allWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
      
      return new Response(JSON.stringify({
        total: allWebhooks.data.length,
        webhooks: allWebhooks.data.map((w: Stripe.WebhookEndpoint) => ({
          id: w.id,
          url: w.url,
          status: w.status,
          enabled_events: w.enabled_events,
          created: new Date(w.created * 1000).toISOString(),
          description: w.description,
        })),
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      error: "Ação inválida. Use: check, create, delete, ou list_all" 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
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
