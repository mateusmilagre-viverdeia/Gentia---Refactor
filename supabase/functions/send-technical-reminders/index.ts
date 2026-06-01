import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendWhatsAppViaZApi, isZApiConfigured } from "../_shared/whatsapp-zapi.ts";
import {
  getActiveRecruitmentTemplate,
  renderTemplateVariables,
  templateMetadata,
} from "../_shared/recruitment-message-templates.ts";
import { createLogger } from "../_shared/logger.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";

const logger = createLogger("send-technical-reminders");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [1, 3, 5];

interface PendingSession {
  id: string;
  session_token: string;
  candidate_id: string;
  job_id: string;
  account_id: string;
  created_at: string;
  expires_at: string;
  candidate?: {
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }[] | null;
  job?: {
    title: string;
  }[] | null;
  account?: {
    name: string;
  }[] | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const results = {
      processed: 0,
      reminded: 0,
      skipped: 0,
      errors: 0,
    };

    // Get all pending technical interview sessions that haven't expired
    const { data: pendingSessions, error: fetchError } = await supabase
      .from("technical_interview_sessions")
      .select(`
        id,
        session_token,
        candidate_id,
        job_id,
        account_id,
        created_at,
        expires_at,
        candidate:recruitment_candidates(name, first_name, last_name, email, phone),
        job:recruitment_jobs(title),
        account:companies(name)
      `)
      .eq("status", "pending")
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingSessions || pendingSessions.length === 0) {
      logger.info("No pending technical interview sessions found");
      return new Response(
        JSON.stringify({ success: true, message: "No pending sessions", results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info(`Found ${pendingSessions.length} pending sessions to check`);

    for (const session of pendingSessions as PendingSession[]) {
      results.processed++;

      try {
        const createdAt = new Date(session.created_at);
        const daysSinceCreation = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if today is a reminder day
        if (!REMINDER_DAYS.includes(daysSinceCreation)) {
          results.skipped++;
          continue;
        }

        const reminderDay = daysSinceCreation as 1 | 3 | 5;

        // Check if reminder already sent today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const { data: existingReminder } = await supabase
          .from("recruitment_communications_log")
          .select("id")
          .eq("session_id", session.id)
          .eq("message_type", "technical_reminder")
          .contains("metadata", { reminder_day: reminderDay })
          .gte("created_at", todayStart.toISOString())
          .limit(1)
          .maybeSingle();

        if (existingReminder) {
          logger.info(`Reminder already sent for session ${session.id} day ${reminderDay}`);
          results.skipped++;
          continue;
        }

        const candidate = Array.isArray(session.candidate) ? session.candidate[0] : session.candidate;
        const jobData = Array.isArray(session.job) ? session.job[0] : session.job;
        const accountData = Array.isArray(session.account) ? session.account[0] : session.account;
        
        const candidateName = candidate?.name || 
          `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() || 
          "Candidato";
        const candidateEmail = candidate?.email;
        const candidatePhone = candidate?.phone;
        const jobTitle = jobData?.title || "Vaga";
        const companyName = accountData?.name || "Empresa";

        if (!candidateEmail) {
          logger.warn(`No email for session ${session.id}, skipping`);
          results.skipped++;
          continue;
        }

        const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
        const interviewUrl = `${baseUrl}/interview/technical/${session.session_token}`;

        const templateVars = {
          candidate_name: candidateName,
          job_title: jobTitle,
          company_name: companyName,
          interview_url: interviewUrl,
          assessment_url: interviewUrl,
          reminder_day: String(reminderDay),
          days_remaining: String(Math.ceil((new Date(session.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        };

        // Get templates
        const emailTemplate = await getActiveRecruitmentTemplate({
          supabase,
          accountId: session.account_id,
          channel: "email",
          messageType: "technical_reminder" as any,
          reminderDay,
        });

        const whatsappTemplate = await getActiveRecruitmentTemplate({
          supabase,
          accountId: session.account_id,
          channel: "whatsapp",
          messageType: "technical_reminder" as any,
          reminderDay,
        });

        // Fallback content
        const reminderLabels: Record<number, string> = {
          1: "Lembrete Gentil",
          3: "Não Esqueça",
          5: "Última Chance",
        };

        const fallbackEmailSubject = `${reminderLabels[reminderDay]}: Sua Entrevista Técnica Aguarda - ${jobTitle}`;
        const fallbackEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin-bottom: 10px;">⏰ ${reminderLabels[reminderDay]}</h1>
            </div>
            
            <p style="font-size: 16px;">Olá ${candidateName},</p>
            
            <p style="font-size: 16px;">
              Ainda não recebemos sua entrevista técnica para a vaga de <strong>${jobTitle}</strong> na <strong>${companyName}</strong>.
            </p>

            <p style="font-size: 16px;">
              O link expira em <strong>${templateVars.days_remaining} dias</strong>. Reserve 15-25 minutos em um ambiente tranquilo para realizar a entrevista.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${interviewUrl}" style="background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Iniciar Entrevista Técnica →
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Este é um email automático enviado pelo sistema de recrutamento.
            </p>
          </body>
          </html>
        `;

        const fallbackWhatsappMessage = `⏰ *${reminderLabels[reminderDay]}*\n\nOlá, ${candidateName}!\n\nAinda não recebemos sua entrevista técnica para *${jobTitle}* na *${companyName}*.\n\nO link expira em ${templateVars.days_remaining} dias:\n${interviewUrl}`;

        const emailSubject = renderTemplateVariables(emailTemplate?.subject || fallbackEmailSubject, templateVars);
        const emailHtml = renderTemplateVariables(emailTemplate?.body || fallbackEmailHtml, templateVars);
        const whatsappMessage = renderTemplateVariables(whatsappTemplate?.body || fallbackWhatsappMessage, templateVars);

        const baseMetadata = {
          reminder_day: reminderDay,
          days_remaining: Number(templateVars.days_remaining),
          ...templateMetadata(emailTemplate),
        };

        // Send email
        try {
          await resend.emails.send({
            from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
            to: [candidateEmail],
            subject: emailSubject,
            html: emailHtml,
          });

          await supabase.from("recruitment_communications_log").insert({
            account_id: session.account_id,
            candidate_id: session.candidate_id,
            job_id: session.job_id,
            session_id: session.id,
            message_type: "technical_reminder",
            channel: "email",
            recipient: candidateEmail,
            subject: emailSubject,
            body: emailHtml,
            status: "sent",
            provider: "resend",
            metadata: baseMetadata,
          });

          logger.info(`Email reminder sent for session ${session.id} day ${reminderDay}`);
        } catch (emailErr: any) {
          logger.error(`Email reminder failed for session ${session.id}:`, emailErr);
          await supabase.from("recruitment_communications_log").insert({
            account_id: session.account_id,
            candidate_id: session.candidate_id,
            job_id: session.job_id,
            session_id: session.id,
            message_type: "technical_reminder",
            channel: "email",
            recipient: candidateEmail,
            subject: emailSubject,
            body: emailHtml,
            status: "failed",
            provider: "resend",
            error_message: emailErr?.message || "failed",
            metadata: baseMetadata,
          });
        }

        // Send WhatsApp
        if (candidatePhone && isZApiConfigured()) {
          try {
            await sendWhatsAppViaZApi({
              toPhoneE164: candidatePhone,
              message: whatsappMessage,
            });

            await supabase.from("recruitment_communications_log").insert({
              account_id: session.account_id,
              candidate_id: session.candidate_id,
              job_id: session.job_id,
              session_id: session.id,
              message_type: "technical_reminder",
              channel: "whatsapp",
              recipient: candidatePhone,
              body: whatsappMessage,
              status: "sent",
              provider: "zapi",
              metadata: { ...baseMetadata, ...templateMetadata(whatsappTemplate) },
            });

            logger.info(`WhatsApp reminder sent for session ${session.id} day ${reminderDay}`);
          } catch (waErr: any) {
            logger.error(`WhatsApp reminder failed for session ${session.id}:`, waErr);
          }
        }

        results.reminded++;
      } catch (sessionErr: any) {
        logger.error(`Error processing session ${session.id}:`, sessionErr);
        results.errors++;
      }
    }

    logger.info("Technical reminders completed", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logger.error("Error in send-technical-reminders:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
