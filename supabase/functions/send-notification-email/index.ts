import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RESEND_NOTIFICATIONS_FROM_EMAIL } from "../_shared/resend-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationEmailRequest {
  notification_id: string;
  user_id: string;
  template: 'billing' | 'action_overdue' | 'announcement' | 'pulse_inactive_member';
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-NOTIFICATION-EMAIL] ${step}${detailsStr}`);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id, user_id, template }: SendNotificationEmailRequest = await req.json();
    logStep("Processing email request", { notification_id, user_id, template });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error('Notification not found');
    }

    // Fetch user email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User email not found');
    }

    // Build email based on template
    let subject = '';
    let html = '';

    switch (template) {
      case 'billing':
        subject = `[Ação Necessária] ${notification.title}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ ${notification.title}</h1>
            <p>Olá ${profile.first_name || 'usuário'},</p>
            <p>${notification.message}</p>
            <div style="margin: 24px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://app.example.com"}/conta/billing" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Regularizar Pagamento
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Se você já efetuou o pagamento, por favor desconsidere este email.
            </p>
          </div>
        `;
        break;

      case 'action_overdue':
        subject = `Ação Atrasada: ${notification.title}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">⏰ Ação Atrasada</h1>
            <p>Olá ${profile.first_name || 'usuário'},</p>
            <p>${notification.message}</p>
            <div style="margin: 24px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://app.example.com"}/plano-de-acao" 
                 style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Ver Plano de Ação
              </a>
            </div>
          </div>
        `;
        break;

      case 'announcement':
        subject = notification.title;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">📢 ${notification.title}</h1>
            <p>Olá ${profile.first_name || 'usuário'},</p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              ${notification.message}
            </div>
            ${notification.target_url ? `
            <div style="margin: 24px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://app.example.com"}${notification.target_url}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Ver Detalhes
              </a>
            </div>
            ` : ''}
          </div>
        `;
        break;

      case 'pulse_inactive_member':
        subject = `[Pulse] Alerta de Participação: ${notification.title}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">⚠️ Alerta de Participação</h1>
            <p>Olá ${profile.first_name || 'líder'},</p>
            <p>${notification.message}</p>
            <p style="margin-top: 16px; color: #666;">
              Sugerimos uma conversa individual para entender o motivo da ausência e reengajar o colaborador.
            </p>
            <div style="margin: 24px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://app.example.com"}/retencao/pulse/dashboard?tab=participation" 
                 style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Ver Dashboard de Participação
              </a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Este alerta foi gerado automaticamente pelo sistema Pulse.
            </p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown template: ${template}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: `Gentia <${RESEND_NOTIFICATIONS_FROM_EMAIL}>`,
      to: [profile.email],
      subject,
      html,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Update notification recipient with email_sent_at
    const { data: recipient } = await supabase
      .from('notification_recipients')
      .select('id')
      .eq('notification_id', notification_id)
      .eq('user_id', user_id)
      .single();

    if (recipient) {
      await supabase
        .from('notification_recipients')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', recipient.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error sending email", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
