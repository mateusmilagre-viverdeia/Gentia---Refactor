import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

import { authenticateRequest, forbiddenResponse, unauthorizedResponse, verifyAccountAccess } from "../_shared/auth-helpers.ts";
import { createLogger } from "../_shared/logger.ts";
import { sendWhatsAppViaZApi } from "../_shared/whatsapp-zapi.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";
import {
  getActiveRecruitmentTemplate,
  renderTemplateVariables,
  templateMetadata,
} from "../_shared/recruitment-message-templates.ts";

const logger = createLogger("send-disc-reminder-manual");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReminderDay = 1 | 3 | 5;

function getBaseUrl() {
  return Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
}

function getWhatsAppMessage(params: {
  reminderDay: ReminderDay;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  assessmentUrl: string;
  expiresAtIso?: string | null;
}) {
  const { reminderDay, candidateName, jobTitle, companyName, assessmentUrl, expiresAtIso } = params;
  const exp = expiresAtIso ? new Date(expiresAtIso) : null;
  const expLabel = exp ? exp.toLocaleDateString("pt-BR") : "";
  const expLine = expLabel ? `\n\nPrazo: ${expLabel}` : "";

  if (reminderDay === 1) {
    return `Oi ${candidateName}! Você ainda não completou sua avaliação DISC para a vaga *${jobTitle}* na *${companyName}*.\n\nLeva apenas alguns minutos. Acesse: ${assessmentUrl}${expLine}`;
  }
  if (reminderDay === 3) {
    return `Olá ${candidateName}, sua avaliação DISC ainda está pendente para a vaga *${jobTitle}* na *${companyName}*.\n\nComplete agora: ${assessmentUrl}${expLine}`;
  }
  return `Último lembrete: sua avaliação DISC para a vaga *${jobTitle}* na *${companyName}* expira em breve.\n\nAcesse: ${assessmentUrl}${expLine}`;
}

function getEmailTemplate(params: {
  reminderDay: ReminderDay;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  assessmentUrl: string;
  expiresAtIso?: string | null;
}) {
  const { reminderDay, candidateName, jobTitle, companyName, assessmentUrl, expiresAtIso } = params;
  const exp = expiresAtIso ? new Date(expiresAtIso) : null;
  const expLabel = exp ? exp.toLocaleDateString("pt-BR") : null;

  const subjectByDay: Record<ReminderDay, string> = {
    1: `Lembrete: complete sua avaliação DISC (${companyName})`,
    3: `Sua avaliação DISC está pendente - ${companyName}`,
    5: `Último lembrete: sua avaliação DISC expira em breve (${companyName})`,
  };

  const titleByDay: Record<ReminderDay, string> = {
    1: "Lembrete de avaliação comportamental",
    3: "Sua avaliação DISC ainda está pendente",
    5: "Último lembrete: prazo se aproximando",
  };

  const urgencyLine =
    reminderDay === 5
      ? '<p style="margin:0 0 10px; font-size:14px; color:#666;"><strong>⚠️</strong> Este é um lembrete manual.</p>'
      : "";

  const expLine = expLabel
    ? `<p style="margin:0; font-size:14px; color:#666;"><strong>📅 Prazo:</strong> ${expLabel}</p>`
    : "";

  const subject = subjectByDay[reminderDay];
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center; margin-bottom: 22px;">
        <h1 style="margin:0; color:#7C3AED;">${titleByDay[reminderDay]}</h1>
      </div>
      <p style="font-size:16px;">Olá ${candidateName},</p>
      <p style="font-size:16px;">Sua <strong>avaliação comportamental DISC</strong> para a vaga de <strong>${jobTitle}</strong> na <strong>${companyName}</strong> ainda está pendente.</p>
      ${urgencyLine}
      <div style="background:#f8f9fa; border-radius: 10px; padding: 18px; margin: 22px 0;">
        <p style="margin:0 0 10px; font-size:14px; color:#666;"><strong>⏱️ Duração estimada:</strong> 10-15 minutos</p>
        ${expLine}
      </div>
      <div style="text-align:center; margin: 26px 0;">
        <a href="${assessmentUrl}" style="background:#7C3AED; color:#fff; padding: 14px 30px; text-decoration:none; border-radius: 10px; font-weight: 700; display: inline-block;">Continuar avaliação →</a>
      </div>
      <p style="font-size: 14px; color: #666;">Se o botão acima não funcionar, copie e cole este link no navegador:</p>
      <p style="font-size: 12px; color: #999; word-break: break-all;">${assessmentUrl}</p>
      <hr style="border:none; border-top: 1px solid #eee; margin: 26px 0;" />
      <p style="font-size: 12px; color: #999; text-align:center;">Este é um e-mail automático do sistema de recrutamento.<br/>© ${new Date().getFullYear()} ${companyName}</p>
    </body>
    </html>
  `;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.context) {
      return unauthorizedResponse(corsHeaders);
    }

    const body = await req.json();
    const accountId = String(body?.accountId || "");
    const sessionId = String(body?.sessionId || "");
    const reminderDay = Number(body?.reminder_day) as ReminderDay;
    const force = body?.force === true;
    const batchId = typeof body?.batchId === "string" ? body.batchId : null;

    if (!accountId || !sessionId || ![1, 3, 5].includes(reminderDay)) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasAccess = await verifyAccountAccess(auth.context.supabase, auth.context.user.id, accountId);
    if (!hasAccess) {
      return forbiddenResponse(corsHeaders);
    }

    const supabase = auth.context.supabase;
    const nowIso = new Date().toISOString();
    const baseUrl = getBaseUrl();
    const windowStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: session, error: sessionError } = await supabase
      .from("candidate_disc_sessions")
      .select("id, account_id, candidate_id, job_id, token, status, expires_at")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "session_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((session as any).expires_at && new Date((session as any).expires_at).toISOString() <= nowIso) {
      return new Response(JSON.stringify({ error: "session_expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateId = (session as any).candidate_id as string;
    const jobId = (session as any).job_id as string;

    // Contact prefs + exception
    const { data: prefs } = await supabase
      .from("recruitment_candidate_contact_prefs")
      .select("opt_out_all")
      .eq("account_id", accountId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    const optOutAll = (prefs as any)?.opt_out_all === true;

    const { data: exception } = await supabase
      .from("recruitment_candidate_contact_exceptions")
      .select("allow_contact")
      .eq("account_id", accountId)
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();

    const allowContactForJob = (exception as any)?.allow_contact === true;
    const optOutOverridden = optOutAll && !allowContactForJob && force;

    if (optOutAll && !allowContactForJob && !force) {
      await supabase.from("recruitment_communications_log").insert({
        account_id: accountId,
        candidate_id: candidateId,
        job_id: jobId,
        session_id: sessionId,
        message_type: "disc_reminder",
        channel: "email",
        recipient: "(opt_out)",
        status: "skipped",
        provider: "resend",
        metadata: { reminder_day: reminderDay, manual: true, force: false, skipped_reason: "opt_out" },
      });

      return new Response(JSON.stringify({ success: true, skipped: true, skipped_reason: "opt_out" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 24h anti-spam per reminder_day (unless force)
    if (!force) {
      const { data: recent } = await supabase
        .from("recruitment_communications_log")
        .select("id")
        .eq("account_id", accountId)
        .eq("session_id", sessionId)
        .eq("message_type", "disc_reminder")
        .eq("status", "sent")
        .filter("metadata->>reminder_day", "eq", String(reminderDay))
        .gte("created_at", windowStartIso)
        .limit(1)
        .maybeSingle();

      if (recent) {
        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "disc_reminder",
          channel: "email",
          recipient: "(rate_limited)",
          status: "skipped",
          provider: "resend",
          metadata: {
            reminder_day: reminderDay,
            manual: true,
            force: false,
            skipped_reason: "rate_limited_24h",
            window_start: windowStartIso,
          },
        });

        return new Response(JSON.stringify({ success: true, skipped: true, skipped_reason: "rate_limited_24h" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: candidate } = await supabase
      .from("recruitment_candidates")
      .select("first_name, last_name, email, phone")
      .eq("id", candidateId)
      .single();

    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("title, account:companies(name)")
      .eq("id", jobId)
      .single();

    const candidateName = `${(candidate as any)?.first_name || ""} ${(candidate as any)?.last_name || ""}`.trim() ||
      "candidato";
    const companyName = ((job as any)?.account as any)?.name || "a empresa";
    const assessmentUrl = `${baseUrl}/assessment/disc/${(session as any).token}`;

    const templateVars = {
      candidate_name: candidateName,
      job_title: (job as any)?.title || "vaga",
      company_name: companyName,
      assessment_url: assessmentUrl,
    };

    const emailTemplate = await getActiveRecruitmentTemplate({
      supabase,
      accountId,
      channel: "email",
      messageType: "disc_reminder",
      reminderDay,
    });
    const whatsappTemplate = await getActiveRecruitmentTemplate({
      supabase,
      accountId,
      channel: "whatsapp",
      messageType: "disc_reminder",
      reminderDay,
    });

    const { subject, html } = getEmailTemplate({
      reminderDay,
      candidateName,
      jobTitle: (job as any)?.title || "vaga",
      companyName,
      assessmentUrl,
      expiresAtIso: (session as any)?.expires_at,
    });

    const whatsappBody = getWhatsAppMessage({
      reminderDay,
      candidateName,
      jobTitle: (job as any)?.title || "vaga",
      companyName,
      assessmentUrl,
      expiresAtIso: (session as any)?.expires_at,
    });

    const resolvedSubject = renderTemplateVariables(emailTemplate?.subject || subject, templateVars);
    const resolvedHtml = renderTemplateVariables(emailTemplate?.body || html, templateVars);
    const resolvedWhatsappBody = renderTemplateVariables(whatsappTemplate?.body || whatsappBody, templateVars);

    const metaBase = {
      reminder_day: reminderDay,
      manual: true,
      force,
      ...(batchId ? { batch_id: batchId } : {}),
      ...(optOutOverridden ? { opt_out_overridden: true } : {}),
    };

    const emailTemplateMeta = templateMetadata(emailTemplate);
    const whatsappTemplateMeta = templateMetadata(whatsappTemplate);

    // Email
    const emailTo = (candidate as any)?.email as string | null | undefined;
    if (!emailTo) {
      await supabase.from("recruitment_communications_log").insert({
        account_id: accountId,
        candidate_id: candidateId,
        job_id: jobId,
        session_id: sessionId,
        message_type: "disc_reminder",
        channel: "email",
        recipient: "(no_email)",
        subject: resolvedSubject,
        body: resolvedHtml,
        status: "skipped",
        provider: "resend",
        metadata: { ...metaBase, ...emailTemplateMeta, skipped_reason: "no_email" },
      });
    } else {
      try {
        const emailResp = await resend.emails.send({
          from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
          to: [emailTo],
          subject: resolvedSubject,
          html: resolvedHtml,
        });

        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "disc_reminder",
          channel: "email",
          recipient: emailTo,
          subject: resolvedSubject,
          body: resolvedHtml,
          status: "sent",
          provider: "resend",
          provider_message_id: (emailResp as any)?.id ?? null,
          metadata: { ...metaBase, ...emailTemplateMeta },
        });
      } catch (err: any) {
        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "disc_reminder",
          channel: "email",
          recipient: emailTo,
          subject: resolvedSubject,
          body: resolvedHtml,
          status: "failed",
          provider: "resend",
          error_message: err?.message || "failed",
          metadata: { ...metaBase, ...emailTemplateMeta },
        });
      }
    }

    // WhatsApp
    const phone = (candidate as any)?.phone as string | null | undefined;
    if (!phone) {
      await supabase.from("recruitment_communications_log").insert({
        account_id: accountId,
        candidate_id: candidateId,
        job_id: jobId,
        session_id: sessionId,
        message_type: "disc_reminder",
        channel: "whatsapp",
        recipient: "(no_phone)",
        body: resolvedWhatsappBody,
        status: "skipped",
        provider: "zapi",
        metadata: { ...metaBase, ...whatsappTemplateMeta, skipped_reason: "no_phone" },
      });
    } else {
      try {
        await sendWhatsAppViaZApi({ toPhoneE164: phone, message: resolvedWhatsappBody });
        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "disc_reminder",
          channel: "whatsapp",
          recipient: phone,
          body: resolvedWhatsappBody,
          status: "sent",
          provider: "zapi",
          metadata: { ...metaBase, ...whatsappTemplateMeta },
        });
      } catch (err: any) {
        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "disc_reminder",
          channel: "whatsapp",
          recipient: phone,
          body: resolvedWhatsappBody,
          status: "failed",
          provider: "zapi",
          error_message: err?.message || "failed",
          metadata: { ...metaBase, ...whatsappTemplateMeta },
        });
      }
    }

    logger.info("Manual DISC reminder processed", { sessionId, reminderDay, force, optOutOverridden });
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logger.error("Error in send-disc-reminder-manual", { message: error?.message });
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
