import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

import { createLogger } from "../_shared/logger.ts";
import { sendWhatsAppViaZApi } from "../_shared/whatsapp-zapi.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";
import {
  getActiveRecruitmentTemplate,
  renderTemplateVariables,
  templateMetadata,
} from "../_shared/recruitment-message-templates.ts";

const logger = createLogger("disc-token-revalidate");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "token" | "discover" | "send";

type CommStatus = "queued" | "sent" | "failed" | "skipped";
type CommChannel = "email" | "whatsapp";

function getBaseUrl() {
  return Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
}

function normEmail(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

function toIso(d: Date) {
  return d.toISOString();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function insertCommLog(params: {
  supabase: any;
  accountId: string;
  candidateId: string | null;
  jobId: string | null;
  sessionId: string | null;
  messageType: string;
  channel: CommChannel;
  recipient: string;
  status: CommStatus;
  subject?: string | null;
  body?: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const {
    supabase,
    accountId,
    candidateId,
    jobId,
    sessionId,
    messageType,
    channel,
    recipient,
    status,
    subject,
    body,
    provider,
    providerMessageId,
    errorCode,
    errorMessage,
    metadata,
  } = params;

  const { data } = await supabase
    .from("recruitment_communications_log")
    .insert({
      account_id: accountId,
      candidate_id: candidateId,
      job_id: jobId,
      session_id: sessionId,
      message_type: messageType,
      channel,
      recipient,
      subject: subject ?? null,
      body: body ?? null,
      status,
      provider: provider ?? null,
      provider_message_id: providerMessageId ?? null,
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  return data?.id as string | undefined;
}

async function createNewDiscSessionFromExisting(params: {
  supabase: any;
  existing: {
    id: string;
    candidate_id: string;
    job_id: string;
    agent_id: string | null;
    account_id: string;
    status: string;
  };
  reason: "token_revalidate" | "lost_link";
}) {
  const { supabase, existing } = params;

  const token = crypto.randomUUID();
  const expiresAt = addDays(7);

  const { data: newSession, error: createErr } = await supabase
    .from("candidate_disc_sessions")
    .insert({
      candidate_id: existing.candidate_id,
      job_id: existing.job_id,
      agent_id: existing.agent_id,
      account_id: existing.account_id,
      token,
      status: "pending",
      expires_at: toIso(expiresAt),
    })
    .select("id, token")
    .single();

  if (createErr || !newSession) {
    throw new Error("failed_to_create_session");
  }

  // Mark old session as expired (also ensures it won't be reused by invite flow which checks expires_at)
  const { error: expireErr } = await supabase
    .from("candidate_disc_sessions")
    .update({ status: "expired", expires_at: toIso(new Date()) })
    .eq("id", existing.id);

  if (expireErr) {
    logger.warn("Failed to expire old session", { sessionId: existing.id, error: expireErr });
  }

  return {
    newSessionId: newSession.id as string,
    newToken: newSession.token as string,
  };
}

async function sendDiscInviteBestEffort(params: {
  supabase: any;
  accountId: string;
  candidateId: string;
  jobId: string;
  sessionId: string;
  token: string;
  revalidateReason: "lost_link";
}) {
  const { supabase, accountId, candidateId, jobId, sessionId, token, revalidateReason } = params;
  const baseUrl = getBaseUrl();
  const assessmentUrl = `${baseUrl}/assessment/disc/${token}`;

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

  const candidateName =
    `${(candidate as any)?.first_name || ""} ${(candidate as any)?.last_name || ""}`.trim() || "candidato";
  const companyName = ((job as any)?.account as any)?.name || "a empresa";
  const jobTitle = (job as any)?.title || "vaga";

  const templateVars = {
    candidate_name: candidateName,
    job_title: jobTitle,
    company_name: companyName,
    assessment_url: assessmentUrl,
  };

  const emailTemplate = await getActiveRecruitmentTemplate({
    supabase,
    accountId,
    channel: "email",
    messageType: "disc_invite",
    reminderDay: null,
  });
  const whatsappTemplate = await getActiveRecruitmentTemplate({
    supabase,
    accountId,
    channel: "whatsapp",
    messageType: "disc_invite",
    reminderDay: null,
  });

  const fallbackEmailSubject = `Avaliação de Fit Comportamental - ${companyName} - ${jobTitle}`;
  const fallbackEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center; margin-bottom: 22px;">
        <h1 style="margin:0; color:#7C3AED;">Assessment Comportamental</h1>
      </div>
      <p style="font-size:16px;">Olá ${candidateName},</p>
      <p style="font-size:16px;">Você recebeu um novo link para sua <strong>avaliação DISC</strong> para a vaga de <strong>${jobTitle}</strong> na <strong>${companyName}</strong>.</p>
      <div style="text-align:center; margin: 26px 0;">
        <a href="${assessmentUrl}" style="background:#7C3AED; color:#fff; padding: 14px 30px; text-decoration:none; border-radius: 10px; font-weight: 700; display: inline-block;">Abrir avaliação →</a>
      </div>
      <p style="font-size: 14px; color: #666;">Se o botão acima não funcionar, copie e cole este link no navegador:</p>
      <p style="font-size: 12px; color: #999; word-break: break-all;">${assessmentUrl}</p>
      <hr style="border:none; border-top: 1px solid #eee; margin: 26px 0;" />
      <p style="font-size: 12px; color: #999; text-align:center;">Este é um e-mail automático do sistema de recrutamento.<br/>© ${new Date().getFullYear()} ${companyName}</p>
    </body>
    </html>
  `;

  const emailSubject = renderTemplateVariables(emailTemplate?.subject || fallbackEmailSubject, templateVars);
  const emailHtml = renderTemplateVariables(emailTemplate?.body || fallbackEmailHtml, templateVars);

  const phone = (candidate as any)?.phone as string | null | undefined;
  const fallbackWhatsappMessage = `Olá, ${candidateName}!\n\nAqui está seu novo link da avaliação DISC para a vaga *${jobTitle}* na *${companyName}*.\n\nAcesse: ${assessmentUrl}`;
  const whatsappMessage = renderTemplateVariables(whatsappTemplate?.body || fallbackWhatsappMessage, templateVars);

  const baseMeta = {
    revalidated: true,
    revalidate_reason: revalidateReason,
  } as Record<string, unknown>;

  const emailTemplateMeta = templateMetadata(emailTemplate);
  const whatsappTemplateMeta = templateMetadata(whatsappTemplate);

  const emailTo = (candidate as any)?.email as string | null | undefined;
  let emailSent = false;
  let whatsappSent = false;

  // Email
  if (!emailTo) {
    await insertCommLog({
      supabase,
      accountId,
      candidateId,
      jobId,
      sessionId,
      messageType: "disc_invite",
      channel: "email",
      recipient: "(no_email)",
      status: "skipped",
      provider: "resend",
      subject: emailSubject,
      body: emailHtml,
      metadata: { ...baseMeta, ...emailTemplateMeta, skipped_reason: "no_email" },
    });
  } else {
    try {
      const emailResp = await resend.emails.send({
        from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
        to: [emailTo],
        subject: emailSubject,
        html: emailHtml,
      });
      emailSent = true;
      await insertCommLog({
        supabase,
        accountId,
        candidateId,
        jobId,
        sessionId,
        messageType: "disc_invite",
        channel: "email",
        recipient: emailTo,
        status: "sent",
        provider: "resend",
        providerMessageId: (emailResp as any)?.id ?? null,
        subject: emailSubject,
        body: emailHtml,
        metadata: { ...baseMeta, ...emailTemplateMeta },
      });
    } catch (err: any) {
      await insertCommLog({
        supabase,
        accountId,
        candidateId,
        jobId,
        sessionId,
        messageType: "disc_invite",
        channel: "email",
        recipient: emailTo,
        status: "failed",
        provider: "resend",
        subject: emailSubject,
        body: emailHtml,
        errorMessage: err?.message || "failed",
        metadata: { ...baseMeta, ...emailTemplateMeta },
      });
    }
  }

  // WhatsApp (best effort)
  if (!phone) {
    await insertCommLog({
      supabase,
      accountId,
      candidateId,
      jobId,
      sessionId,
      messageType: "disc_invite",
      channel: "whatsapp",
      recipient: "(no_phone)",
      status: "skipped",
      provider: "zapi",
      body: whatsappMessage,
      metadata: { ...baseMeta, ...whatsappTemplateMeta, skipped_reason: "no_phone" },
    });
  } else {
    try {
      await sendWhatsAppViaZApi({ toPhoneE164: phone, message: whatsappMessage });
      whatsappSent = true;
      await insertCommLog({
        supabase,
        accountId,
        candidateId,
        jobId,
        sessionId,
        messageType: "disc_invite",
        channel: "whatsapp",
        recipient: phone,
        status: "sent",
        provider: "zapi",
        body: whatsappMessage,
        metadata: { ...baseMeta, ...whatsappTemplateMeta },
      });
    } catch (err: any) {
      await insertCommLog({
        supabase,
        accountId,
        candidateId,
        jobId,
        sessionId,
        messageType: "disc_invite",
        channel: "whatsapp",
        recipient: phone,
        status: "failed",
        provider: "zapi",
        body: whatsappMessage,
        errorMessage: err?.message || "failed",
        metadata: { ...baseMeta, ...whatsappTemplateMeta },
      });
    }
  }

  return { emailSent, whatsappSent };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "server_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const email = normEmail(body?.email);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

    const mode: Mode = token
      ? "token"
      : sessionId
        ? "send"
        : email
          ? "discover"
          : "discover";

    // =========================
    // Mode A: Token revalidate
    // =========================
    if (mode === "token") {
      const { data: existing, error: fetchErr } = await supabase
        .from("candidate_disc_sessions")
        .select("id, candidate_id, job_id, agent_id, account_id, status")
        .eq("token", token)
        .maybeSingle();

      if (fetchErr || !existing) {
        return new Response(JSON.stringify({ success: false, error: "invalid_token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if ((existing as any).status === "completed") {
        return new Response(JSON.stringify({ success: false, error: "already_completed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { newSessionId, newToken } = await createNewDiscSessionFromExisting({
        supabase,
        existing: existing as any,
        reason: "token_revalidate",
      });

      // Audit log (not a message send)
      await insertCommLog({
        supabase,
        accountId: (existing as any).account_id,
        candidateId: (existing as any).candidate_id,
        jobId: (existing as any).job_id,
        sessionId: newSessionId,
        messageType: "disc_revalidate",
        channel: "email",
        recipient: "(self_service)",
        status: "skipped",
        provider: "internal",
        metadata: {
          reason: "token_revalidate",
          previous_session_id: (existing as any).id,
          new_session_id: newSessionId,
        },
      });

      const newUrl = `${getBaseUrl()}/assessment/disc/${newToken}`;
      return new Response(JSON.stringify({ success: true, newToken, newUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================
    // Mode B1: Discover (lost link)
    // =========================
    if (mode === "discover") {
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: "invalid_request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find candidates by email (may exist across accounts)
      const { data: candidates, error: candErr } = await supabase
        .from("recruitment_candidates")
        .select("id")
        .eq("email", email)
        .limit(50);

      if (candErr) {
        logger.error("Candidate lookup failed", { error: candErr });
        return new Response(JSON.stringify({ success: false, error: "lookup_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const candidateIds = (candidates || []).map((c: any) => c.id as string);
      if (candidateIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "no_pending_sessions" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: sessions, error: sessErr } = await supabase
        .from("candidate_disc_sessions")
        .select("id, candidate_id, job_id, account_id, status, expires_at, created_at")
        .in("candidate_id", candidateIds)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(25);

      if (sessErr) {
        logger.error("Session lookup failed", { error: sessErr });
        return new Response(JSON.stringify({ success: false, error: "lookup_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "no_pending_sessions" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const jobIds = Array.from(new Set(sessions.map((s: any) => s.job_id as string)));
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id, title, account:companies(name)")
        .in("id", jobIds);

      const jobsMap = new Map<string, any>();
      (jobs || []).forEach((j: any) => jobsMap.set(j.id, j));

      const options = sessions.map((s: any) => {
        const job = jobsMap.get(s.job_id);
        return {
          sessionId: s.id,
          jobId: s.job_id,
          jobTitle: job?.title || "Vaga",
          companyName: (job?.account as any)?.name || "",
          expiresAt: s.expires_at,
          status: s.status,
        };
      });

      if (options.length === 1) {
        return new Response(JSON.stringify({ success: true, action: "send", option: options[0] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, action: "choose", options }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================
    // Mode B2: Send (lost link)
    // =========================
    if (!email || !sessionId) {
      return new Response(JSON.stringify({ success: false, error: "invalid_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing, error: existingErr } = await supabase
      .from("candidate_disc_sessions")
      .select("id, candidate_id, job_id, agent_id, account_id, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (existingErr || !existing) {
      return new Response(JSON.stringify({ success: false, error: "session_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((existing as any).status === "completed") {
      return new Response(JSON.stringify({ success: false, error: "already_completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify email belongs to the candidate
    const { data: candidate } = await supabase
      .from("recruitment_candidates")
      .select("id, email")
      .eq("id", (existing as any).candidate_id)
      .maybeSingle();

    if (!candidate || normEmail((candidate as any).email) !== email) {
      return new Response(JSON.stringify({ success: false, error: "email_mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 24h anti-spam per candidate + job
    const windowStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentInvite } = await supabase
      .from("recruitment_communications_log")
      .select("id")
      .eq("account_id", (existing as any).account_id)
      .eq("candidate_id", (existing as any).candidate_id)
      .eq("job_id", (existing as any).job_id)
      .eq("message_type", "disc_invite")
      .eq("status", "sent")
      .gte("created_at", windowStartIso)
      .limit(1)
      .maybeSingle();

    if (recentInvite) {
      // Audit log (no send)
      await insertCommLog({
        supabase,
        accountId: (existing as any).account_id,
        candidateId: (existing as any).candidate_id,
        jobId: (existing as any).job_id,
        sessionId: (existing as any).id,
        messageType: "disc_revalidate",
        channel: "email",
        recipient: email,
        status: "skipped",
        provider: "internal",
        metadata: {
          reason: "lost_link",
          skipped_reason: "rate_limited_24h",
          window_start: windowStartIso,
        },
      });

      return new Response(JSON.stringify({ success: true, sent: false, skipped_reason: "rate_limited_24h" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { newSessionId, newToken } = await createNewDiscSessionFromExisting({
      supabase,
      existing: existing as any,
      reason: "lost_link",
    });

    const sendResult = await sendDiscInviteBestEffort({
      supabase,
      accountId: (existing as any).account_id,
      candidateId: (existing as any).candidate_id,
      jobId: (existing as any).job_id,
      sessionId: newSessionId,
      token: newToken,
      revalidateReason: "lost_link",
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: sendResult.emailSent || sendResult.whatsappSent,
        emailSent: sendResult.emailSent,
        whatsappSent: sendResult.whatsappSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    logger.error("Unhandled error", { message: err?.message });
    return new Response(JSON.stringify({ success: false, error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
