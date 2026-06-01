import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createLogger } from "../_shared/logger.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("process-billing-reminders");
const logStep = (step: string, details?: any) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

// Email templates in Portuguese
const emailTemplates = {
  grace_warning_7: {
    subject: "⚠️ Pagamento pendente - EP Partners",
    getHtml: (companyName: string, graceUntil: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Pagamento Pendente</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Identificamos que o pagamento da assinatura da empresa <strong>${companyName}</strong> está pendente.</p>
            
            <div class="warning">
              <strong>Importante:</strong> Você tem até <strong>${graceUntil}</strong> para regularizar o pagamento e evitar a suspensão do acesso à plataforma.
            </div>
            
            <p>Para regularizar, acesse a plataforma e atualize suas informações de pagamento:</p>
            
            <center>
              <a href="https://eppartners.lovable.app/account/billing" class="button">Regularizar Pagamento</a>
            </center>
            
            <p>Se você já realizou o pagamento, por favor desconsidere este email.</p>
            
            <p>Atenciosamente,<br><strong>Equipe EP Partners</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>EP Partners - Transformando empresas através das pessoas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  grace_warning_3: {
    subject: "🚨 URGENTE: Acesso será suspenso em 3 dias - EP Partners",
    getHtml: (companyName: string, graceUntil: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .countdown { font-size: 48px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 URGENTE: Suspensão Iminente</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            
            <div class="countdown">3 DIAS</div>
            
            <p>O acesso da empresa <strong>${companyName}</strong> à plataforma EP Partners será <strong>suspenso em 3 dias</strong> por falta de pagamento.</p>
            
            <div class="warning">
              <strong>Data limite:</strong> ${graceUntil}<br>
              <strong>Após esta data, todos os usuários perderão acesso à plataforma.</strong>
            </div>
            
            <p>Regularize agora para evitar interrupções:</p>
            
            <center>
              <a href="https://eppartners.lovable.app/account/billing" class="button">Regularizar Agora</a>
            </center>
            
            <p>Atenciosamente,<br><strong>Equipe EP Partners</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>EP Partners - Transformando empresas através das pessoas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  grace_warning_1: {
    subject: "⛔ ÚLTIMO AVISO: Acesso será suspenso AMANHÃ - EP Partners",
    getHtml: (companyName: string, graceUntil: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7f1d1d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #7f1d1d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #fef2f2; border-left: 4px solid #7f1d1d; padding: 15px; margin: 20px 0; }
          .countdown { font-size: 48px; font-weight: bold; color: #7f1d1d; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⛔ ÚLTIMO AVISO</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            
            <div class="countdown">AMANHÃ</div>
            
            <p>Este é o <strong>último aviso</strong> antes da suspensão do acesso da empresa <strong>${companyName}</strong> à plataforma EP Partners.</p>
            
            <div class="warning">
              <strong>⚠️ O acesso será suspenso em ${graceUntil}</strong><br><br>
              Após a suspensão:<br>
              • Todos os usuários perderão acesso<br>
              • Dados permanecerão salvos, mas inacessíveis<br>
              • A reativação requer pagamento pendente
            </div>
            
            <p><strong>Regularize agora para evitar a suspensão:</strong></p>
            
            <center>
              <a href="https://eppartners.lovable.app/account/billing" class="button">Regularizar Agora</a>
            </center>
            
            <p>Atenciosamente,<br><strong>Equipe EP Partners</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>EP Partners - Transformando empresas através das pessoas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  blocked: {
    subject: "🚫 Acesso suspenso - EP Partners",
    getHtml: (companyName: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info { background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚫 Acesso Suspenso</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            
            <p>Informamos que o acesso da empresa <strong>${companyName}</strong> à plataforma EP Partners foi <strong>suspenso</strong> devido ao não pagamento da assinatura.</p>
            
            <div class="info">
              <strong>O que acontece agora:</strong><br>
              • Todos os usuários da empresa não conseguirão acessar a plataforma<br>
              • Seus dados estão seguros e serão mantidos<br>
              • O acesso será restaurado após a regularização do pagamento
            </div>
            
            <p>Para reativar o acesso, regularize o pagamento:</p>
            
            <center>
              <a href="https://eppartners.lovable.app/account/billing" class="button">Reativar Acesso</a>
            </center>
            
            <p>Em caso de dúvidas, entre em contato conosco.</p>
            
            <p>Atenciosamente,<br><strong>Equipe EP Partners</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>EP Partners - Transformando empresas através das pessoas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  grant_expiring_7: {
    subject: "📅 Seu acesso liberado expira em 7 dias - EP Partners",
    getHtml: (companyName: string, expiresAt: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info { background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Acesso Liberado Expirando</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            
            <p>O período de acesso liberado da empresa <strong>${companyName}</strong> à plataforma EP Partners está chegando ao fim.</p>
            
            <div class="info">
              <strong>Data de expiração:</strong> ${expiresAt}<br><br>
              Após esta data, será necessário ativar uma assinatura para continuar utilizando a plataforma.
            </div>
            
            <p>Para garantir acesso contínuo, ative sua assinatura agora:</p>
            
            <center>
              <a href="https://eppartners.lovable.app/account/billing" class="button">Ativar Assinatura</a>
            </center>
            
            <p>Atenciosamente,<br><strong>Equipe EP Partners</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>EP Partners - Transformando empresas através das pessoas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

// Format date to Brazilian format
const formatDateBR = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Calculate days between two dates
const daysBetween = (date1: Date, date2: Date): number => {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if notification was already sent today
const wasNotificationSentToday = async (
  supabase: any,
  orgId: string,
  notificationType: string
): Promise<boolean> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from("billing_notifications")
    .select("id")
    .eq("org_id", orgId)
    .eq("notification_type", notificationType)
    .gte("sent_at", today.toISOString())
    .limit(1);

  if (error) {
    logStep("Error checking notification", { error: error.message });
    return true; // Assume sent to avoid duplicates on error
  }

  return data && data.length > 0;
};

// Send email and log notification
const sendNotification = async (
  resend: any,
  supabase: any,
  orgId: string,
  email: string,
  notificationType: string,
  subject: string,
  html: string,
  metadata?: any
): Promise<boolean> => {
  try {
    // Check if already sent today
    const alreadySent = await wasNotificationSentToday(supabase, orgId, notificationType);
    if (alreadySent) {
      logStep(`Notification ${notificationType} already sent today for org ${orgId}`);
      return false;
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: `EP Partners <${RESEND_DEFAULT_FROM_EMAIL}>`,
      to: [email],
      subject,
      html,
    });

    logStep(`Email sent`, { orgId, notificationType, email, emailId: emailResponse.id });

    // Log notification
    await supabase.from("billing_notifications").insert({
      org_id: orgId,
      notification_type: notificationType,
      email_to: email,
      metadata: { ...metadata, resend_id: emailResponse.id },
    });

    return true;
  } catch (error: any) {
    logStep(`Failed to send notification`, { orgId, notificationType, error: error.message });
    return false;
  }
};

// Get admin email for organization
const getOrgAdminEmail = async (supabase: any, orgId: string): Promise<string | null> => {
  // First try to get owner from account_members
  const { data: memberData } = await supabase
    .from("account_members")
    .select(`
      user_id,
      role
    `)
    .eq("account_id", orgId)
    .eq("role", "owner")
    .limit(1)
    .single();

  if (memberData?.user_id) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", memberData.user_id)
      .single();
    
    if (profileData?.email) {
      return profileData.email;
    }
  }

  // Fallback: get company creator
  const { data: companyData } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", orgId)
    .single();

  if (companyData?.user_id) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", companyData.user_id)
      .single();
    
    return profileData?.email || null;
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting billing reminders process");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const now = new Date();
    let emailsSent = 0;
    let orgsBlocked = 0;

    // 1. Process past_due organizations
    logStep("Processing past_due organizations");
    
    const { data: pastDueOrgs, error: pastDueError } = await supabase
      .from("org_billing")
      .select(`
        org_id,
        grace_until,
        status,
        stripe_subscription_id,
        companies:org_id (
          id,
          name
        )
      `)
      .eq("status", "past_due")
      .not("grace_until", "is", null);

    if (pastDueError) {
      logStep("Error fetching past_due orgs", { error: pastDueError.message });
    } else if (pastDueOrgs) {
      logStep(`Found ${pastDueOrgs.length} past_due organizations`);

      for (const org of pastDueOrgs) {
        const graceUntil = new Date(org.grace_until);
        const daysUntilBlocked = daysBetween(now, graceUntil);
        const company = Array.isArray(org.companies) ? org.companies[0] : org.companies;
        const companyName = company?.name || "Sua empresa";
        const graceUntilFormatted = formatDateBR(org.grace_until);

        // Get admin email
        const adminEmail = await getOrgAdminEmail(supabase, org.org_id);
        if (!adminEmail) {
          logStep(`No admin email found for org ${org.org_id}`);
          continue;
        }

        // Check which notification to send based on days remaining
        if (daysUntilBlocked <= 0) {
          // Check for active admin grant before blocking
          const { data: activeGrant } = await supabase
            .from('admin_grants')
            .select('id')
            .eq('org_id', org.org_id)
            .is('revoked_at', null)
            .gt('expires_at', now.toISOString())
            .limit(1);

          if (activeGrant && activeGrant.length > 0) {
            logStep(`Org ${org.org_id} has active admin grant, skipping block`);
            continue;
          }

          // Check Stripe if subscription exists
          if (org.stripe_subscription_id) {
            try {
              const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
              if (stripeKey) {
                const stripeRes = await fetch(
                  `https://api.stripe.com/v1/subscriptions/${org.stripe_subscription_id}`,
                  { headers: { Authorization: `Bearer ${stripeKey}` } }
                );
                const sub = await stripeRes.json();
                if (sub.status === 'active' || sub.status === 'trialing') {
                  await supabase
                    .from('org_billing')
                    .update({
                      status: 'active',
                      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                      blocked_at: null,
                      grace_until: null,
                    })
                    .eq('org_id', org.org_id);
                  logStep(`Org ${org.org_id} subscription active on Stripe, synced locally`);
                  continue;
                }
              }
            } catch (stripeErr) {
              logStep(`Error checking Stripe for org ${org.org_id}, skipping block`, { error: String(stripeErr) });
              continue;
            }
          }

          // Actually block
          logStep(`Blocking org ${org.org_id}`, { daysUntilBlocked });
          
          await supabase
            .from("org_billing")
            .update({
              status: "blocked",
              blocked_at: now.toISOString(),
            })
            .eq("org_id", org.org_id);

          const template = emailTemplates.blocked;
          const sent = await sendNotification(
            resend,
            supabase,
            org.org_id,
            adminEmail,
            "blocked",
            template.subject,
            template.getHtml(companyName),
            { daysUntilBlocked }
          );

          if (sent) {
            emailsSent++;
            orgsBlocked++;
          }
        } else if (daysUntilBlocked <= 1) {
          const template = emailTemplates.grace_warning_1;
          const sent = await sendNotification(
            resend,
            supabase,
            org.org_id,
            adminEmail,
            "grace_warning_1",
            template.subject,
            template.getHtml(companyName, graceUntilFormatted),
            { daysUntilBlocked }
          );
          if (sent) emailsSent++;
        } else if (daysUntilBlocked <= 3) {
          const template = emailTemplates.grace_warning_3;
          const sent = await sendNotification(
            resend,
            supabase,
            org.org_id,
            adminEmail,
            "grace_warning_3",
            template.subject,
            template.getHtml(companyName, graceUntilFormatted),
            { daysUntilBlocked }
          );
          if (sent) emailsSent++;
        } else if (daysUntilBlocked <= 7) {
          const template = emailTemplates.grace_warning_7;
          const sent = await sendNotification(
            resend,
            supabase,
            org.org_id,
            adminEmail,
            "grace_warning_7",
            template.subject,
            template.getHtml(companyName, graceUntilFormatted),
            { daysUntilBlocked }
          );
          if (sent) emailsSent++;
        }
      }
    }

    // 2. Process expiring grants
    logStep("Processing expiring grants");

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringGrants, error: grantsError } = await supabase
      .from("admin_grants")
      .select(`
        id,
        org_id,
        expires_at,
        companies:org_id (
          id,
          name
        )
      `)
      .is("revoked_at", null)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", sevenDaysFromNow.toISOString());

    if (grantsError) {
      logStep("Error fetching expiring grants", { error: grantsError.message });
    } else if (expiringGrants) {
      logStep(`Found ${expiringGrants.length} expiring grants`);

      for (const grant of expiringGrants) {
        if (!grant.org_id) continue;

        const company = Array.isArray(grant.companies) ? grant.companies[0] : grant.companies;
        const companyName = company?.name || "Sua empresa";
        const expiresAtFormatted = formatDateBR(grant.expires_at);

        const adminEmail = await getOrgAdminEmail(supabase, grant.org_id);
        if (!adminEmail) {
          logStep(`No admin email found for org ${grant.org_id}`);
          continue;
        }

        const template = emailTemplates.grant_expiring_7;
        const sent = await sendNotification(
          resend,
          supabase,
          grant.org_id,
          adminEmail,
          "grant_expiring_7",
          template.subject,
          template.getHtml(companyName, expiresAtFormatted),
          { grantId: grant.id, expiresAt: grant.expires_at }
        );
        if (sent) emailsSent++;
      }
    }

    // Log billing event
    await supabase.from("billing_events").insert({
      event_type: "billing_reminders_processed",
      payload: {
        processed_at: now.toISOString(),
        emails_sent: emailsSent,
        orgs_blocked: orgsBlocked,
      },
    });

    logStep("Process completed", { emailsSent, orgsBlocked });

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        orgsBlocked,
        processedAt: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("Error in process", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
