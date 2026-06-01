import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendWhatsAppViaZApi } from "../_shared/whatsapp-zapi.ts";
import { createLogger } from "../_shared/logger.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";
import {
  getActiveRecruitmentTemplate,
  renderTemplateVariables,
  templateMetadata,
} from "../_shared/recruitment-message-templates.ts";

const logger = createLogger("send-disc-reminders");

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type CommStatus = "queued" | "sent" | "failed" | "skipped";
type CommChannel = "email" | "whatsapp";

type ReminderDay = 1 | 3 | 5;
const REMINDER_DAYS: ReminderDay[] = [1, 3, 5];

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getBaseUrl() {
  return Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
}

function isRejectedApplicationStatus(status: string | null | undefined) {
  if (!status) return false;
  if (status === "rejected") return true;
  return status.startsWith("desqualificado");
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

  // reminderDay === 5
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
      ? "<p style=\"margin:0 0 10px; font-size:14px; color:#666;\"><strong>⚠️</strong> Este é o último lembrete automático.</p>"
      : "";

  const expLine = expLabel
    ? `<p style=\"margin:0; font-size:14px; color:#666;\"><strong>📅 Prazo:</strong> ${expLabel}</p>`
    : "";

  const subject = subjectByDay[reminderDay];
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
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
    // Auth gate: allow cron secret OR any Bearer auth.
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    const hasCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith("Bearer ");

    if (!hasCronSecret && !hasAuthHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const nowIso = now.toISOString();
    const baseUrl = getBaseUrl();
    const windowStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    logger.info("Starting DISC reminders", { now: nowIso });

    // 1) Fetch pending sessions (DISC not completed, not expired)
    const { data: sessions, error: sessionsError } = await supabase
      .from("candidate_disc_sessions")
      .select("id, account_id, candidate_id, job_id, token, status, expires_at, created_at")
      .in("status", ["pending", "in_progress"])
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (sessionsError) throw sessionsError;

    const sessionList = sessions || [];
    if (sessionList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, sent: 0, skipped: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionIds = sessionList.map((s: any) => s.id as string);
    const candidateIds = Array.from(new Set(sessionList.map((s: any) => s.candidate_id as string)));
    const jobIds = Array.from(new Set(sessionList.map((s: any) => s.job_id as string)));

    // 2) Fetch invite logs (first successful invite per session)
    const { data: inviteLogs } = await supabase
      .from("recruitment_communications_log")
      .select("id, session_id, created_at")
      .in("session_id", sessionIds)
      .eq("message_type", "disc_invite")
      .eq("status", "sent")
      .order("created_at", { ascending: true })
      .limit(1000);

    const inviteBySession = new Map<string, { id: string; created_at: string }>();
    for (const log of inviteLogs || []) {
      if (!inviteBySession.has((log as any).session_id)) {
        inviteBySession.set((log as any).session_id, {
          id: (log as any).id,
          created_at: (log as any).created_at,
        });
      }
    }

    // 3) Fetch reminder logs (sent) for dedupe + 24h anti-spam
    const { data: reminderLogs } = await supabase
      .from("recruitment_communications_log")
      .select("session_id, created_at, metadata")
      .in("session_id", sessionIds)
      .eq("message_type", "disc_reminder")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(2000);

    const reminderSentDays = new Map<string, Set<number>>();
    const reminderLastSentAtByDay = new Map<string, Map<number, string>>();
    for (const log of reminderLogs || []) {
      const sid = (log as any).session_id as string;
      const day = Number((log as any)?.metadata?.reminder_day);
      if (![1, 3, 5].includes(day)) continue;
      if (!reminderSentDays.has(sid)) reminderSentDays.set(sid, new Set());
      reminderSentDays.get(sid)!.add(day);

      if (!reminderLastSentAtByDay.has(sid)) reminderLastSentAtByDay.set(sid, new Map());
      // reminderLogs ordered desc; keep first seen per (sid, day)
      if (!reminderLastSentAtByDay.get(sid)!.has(day)) {
        reminderLastSentAtByDay.get(sid)!.set(day, (log as any).created_at);
      }
    }

    // 4) Fetch contact prefs + exceptions (source of truth)
    const { data: prefsRows } = await supabase
      .from("recruitment_candidate_contact_prefs")
      .select("candidate_id, opt_out_all")
      .eq("account_id", sessionList[0]?.account_id)
      .in("candidate_id", candidateIds)
      .limit(1000);

    const optOutByCandidate = new Map<string, boolean>();
    for (const r of prefsRows || []) {
      optOutByCandidate.set((r as any).candidate_id as string, (r as any).opt_out_all === true);
    }

    const { data: exceptionRows } = await supabase
      .from("recruitment_candidate_contact_exceptions")
      .select("candidate_id, job_id, allow_contact")
      .eq("account_id", sessionList[0]?.account_id)
      .in("candidate_id", candidateIds)
      .in("job_id", jobIds)
      .limit(2000);

    const allowContactKeys = new Set<string>();
    for (const r of exceptionRows || []) {
      if ((r as any).allow_contact === true) {
        allowContactKeys.add(`${(r as any).candidate_id}::${(r as any).job_id}`);
      }
    }

    // 5) Fetch candidates (email/phone/name)
    const { data: candidates } = await supabase
      .from("recruitment_candidates")
      .select("id, first_name, last_name, email, phone")
      .in("id", candidateIds)
      .limit(1000);

    const candidateById = new Map<string, any>();
    for (const c of candidates || []) candidateById.set((c as any).id, c);

    // 6) Fetch jobs + company name
    const { data: jobs } = await supabase
      .from("recruitment_jobs")
      .select("id, title, account:companies(name)")
      .in("id", jobIds)
      .limit(1000);

    const jobById = new Map<string, any>();
    for (const j of jobs || []) jobById.set((j as any).id, j);

    // 7) Fetch application statuses (best-effort), to stop reminders if rejected
    const { data: apps } = await supabase
      .from("recruitment_applications")
      .select("candidate_id, job_id, status")
      .in("candidate_id", candidateIds)
      .in("job_id", jobIds)
      .limit(1000);

    const appStatusByKey = new Map<string, string>();
    for (const a of apps || []) {
      const key = `${(a as any).candidate_id}::${(a as any).job_id}`;
      appStatusByKey.set(key, (a as any).status);
    }

    const insertCommLog = async (payload: {
      account_id: string;
      candidate_id: string;
      job_id: string;
      session_id: string;
      channel: CommChannel;
      status: CommStatus;
      recipient: string;
      subject?: string | null;
      body?: string | null;
      provider?: string | null;
      provider_message_id?: string | null;
      error_message?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      await supabase.from("recruitment_communications_log").insert({
        account_id: payload.account_id,
        candidate_id: payload.candidate_id,
        job_id: payload.job_id,
        session_id: payload.session_id,
        message_type: "disc_reminder",
        channel: payload.channel,
        recipient: payload.recipient,
        subject: payload.subject ?? null,
        body: payload.body ?? null,
        status: payload.status,
        provider: payload.provider ?? null,
        provider_message_id: payload.provider_message_id ?? null,
        error_message: payload.error_message ?? null,
        metadata: payload.metadata ?? {},
      });
    };

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

     // Cache templates per (account/channel/type/day) to avoid N+1 queries.
     const templateCache = new Map<string, any | null>();
     const getTemplateCached = async (params: {
       accountId: string;
       channel: "email" | "whatsapp";
       messageType: "disc_invite" | "disc_reminder";
       reminderDay: number | null;
     }) => {
       const key = `${params.accountId}::${params.channel}::${params.messageType}::${params.reminderDay ?? "_"}`;
       if (templateCache.has(key)) return templateCache.get(key);
       const t = await getActiveRecruitmentTemplate({
         supabase,
         accountId: params.accountId,
         channel: params.channel,
         messageType: params.messageType,
         reminderDay: params.reminderDay,
       });
       templateCache.set(key, t);
       return t;
     };

    for (const s of sessionList) {
      processed++;

      const sessionId = (s as any).id as string;
      const accountId = (s as any).account_id as string;
      const candidateId = (s as any).candidate_id as string;
      const jobId = (s as any).job_id as string;

      // Stop conditions
      if ((s as any).status === "completed") {
        skipped++;
        continue;
      }
      if ((s as any).expires_at && new Date((s as any).expires_at).getTime() <= now.getTime()) {
        skipped++;
        continue;
      }
      const optOutAll = optOutByCandidate.get(candidateId) === true;
      const allowForJob = allowContactKeys.has(`${candidateId}::${jobId}`);
      if (optOutAll && !allowForJob) {
        await insertCommLog({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          channel: "email",
          status: "skipped",
          recipient: "(opt_out)",
          provider: "resend",
          metadata: { skipped_reason: "opt_out" },
        });
        skipped++;
        continue;
      }

      const appKey = `${candidateId}::${jobId}`;
      if (isRejectedApplicationStatus(appStatusByKey.get(appKey))) {
        skipped++;
        continue;
      }

      const invite = inviteBySession.get(sessionId);
      if (!invite) {
        // No successful invite logged; skip (prevents unexpected reminders)
        await insertCommLog({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          channel: "email",
          status: "skipped",
          recipient: "(unknown)",
          provider: "resend",
          metadata: { skipped_reason: "missing_invite_log" },
        });
        skipped++;
        continue;
      }

      const inviteAt = new Date(invite.created_at);
      const daysSinceInvite = daysBetween(inviteAt, now);

      // Determine which reminder is due (D+1/D+3/D+5)
      const alreadySent = reminderSentDays.get(sessionId) ?? new Set<number>();
      let dueDay: ReminderDay | null = null;
      for (const d of REMINDER_DAYS) {
        if (daysSinceInvite >= d && !alreadySent.has(d)) {
          dueDay = d;
          break;
        }
      }

      if (!dueDay) {
        skipped++;
        continue;
      }

      // 24h anti-spam per reminder_day
      const lastSentAt = reminderLastSentAtByDay.get(sessionId)?.get(dueDay);
      if (lastSentAt && new Date(lastSentAt).toISOString() >= windowStartIso) {
        skipped++;
        continue;
      }

      const candidate = candidateById.get(candidateId);
      const job = jobById.get(jobId);

      if (!candidate || !job) {
        await insertCommLog({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          channel: "email",
          status: "skipped",
          recipient: candidate?.email || "(missing_candidate_or_job)",
          provider: "resend",
          metadata: { skipped_reason: "missing_candidate_or_job" },
        });
        skipped++;
        continue;
      }

      const candidateName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "candidato";
      const companyName = (job.account as any)?.name || "a empresa";
      const assessmentUrl = `${baseUrl}/assessment/disc/${(s as any).token}`;

      const { subject, html } = getEmailTemplate({
        reminderDay: dueDay,
        candidateName,
        jobTitle: job.title,
        companyName,
        assessmentUrl,
        expiresAtIso: (s as any).expires_at,
      });

      const whatsappBody = getWhatsAppMessage({
        reminderDay: dueDay,
        candidateName,
        jobTitle: job.title,
        companyName,
        assessmentUrl,
        expiresAtIso: (s as any).expires_at,
      });

      const templateVars = {
        candidate_name: candidateName,
        job_title: job.title,
        company_name: companyName,
        assessment_url: assessmentUrl,
      };

      const emailTemplate = await getTemplateCached({
        accountId,
        channel: "email",
        messageType: "disc_reminder",
        reminderDay: dueDay,
      });
      const whatsappTemplate = await getTemplateCached({
        accountId,
        channel: "whatsapp",
        messageType: "disc_reminder",
        reminderDay: dueDay,
      });

      const resolvedSubject = renderTemplateVariables(emailTemplate?.subject || subject, templateVars);
      const resolvedHtml = renderTemplateVariables(emailTemplate?.body || html, templateVars);
      const resolvedWhatsappBody = renderTemplateVariables(whatsappTemplate?.body || whatsappBody, templateVars);

      const commonMeta = {
        reminder_day: dueDay,
        invite_log_id: invite.id,
        invite_sent_at: invite.created_at,
        days_since_invite: daysSinceInvite,
      };

      const emailTemplateMeta = templateMetadata(emailTemplate);
      const whatsappTemplateMeta = templateMetadata(whatsappTemplate);

      // Email
      try {
        const emailTo = candidate.email as string | null | undefined;
        if (!emailTo) {
          await insertCommLog({
            account_id: accountId,
            candidate_id: candidateId,
            job_id: jobId,
            session_id: sessionId,
            channel: "email",
            status: "skipped",
            recipient: "(no_email)",
            subject: resolvedSubject,
            body: resolvedHtml,
            provider: "resend",
            metadata: { ...commonMeta, ...emailTemplateMeta, skipped_reason: "no_email" },
          });
        } else {
          const emailResp = await resend.emails.send({
            from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
            to: [emailTo],
            subject: resolvedSubject,
            html: resolvedHtml,
          });

          await insertCommLog({
            account_id: accountId,
            candidate_id: candidateId,
            job_id: jobId,
            session_id: sessionId,
            channel: "email",
            status: "sent",
            recipient: emailTo,
            subject: resolvedSubject,
            body: resolvedHtml,
            provider: "resend",
            provider_message_id: (emailResp as any)?.id ?? null,
            metadata: { ...commonMeta, ...emailTemplateMeta },
          });
          sent++;
        }
      } catch (err: any) {
        await insertCommLog({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          channel: "email",
          status: "failed",
          recipient: candidate.email || "(unknown)",
          subject: resolvedSubject,
          body: resolvedHtml,
          provider: "resend",
          error_message: err?.message || "failed",
          metadata: { ...commonMeta, ...emailTemplateMeta },
        });
        failed++;
      }

      // WhatsApp (best-effort)
      try {
        const phone = candidate.phone as string | null | undefined;
        if (!phone) {
          await insertCommLog({
            account_id: accountId,
            candidate_id: candidateId,
            job_id: jobId,
            session_id: sessionId,
            channel: "whatsapp",
            status: "skipped",
            recipient: "(no_phone)",
            body: resolvedWhatsappBody,
            provider: "zapi",
            metadata: { ...commonMeta, ...whatsappTemplateMeta, skipped_reason: "no_phone" },
          });
        } else {
          await sendWhatsAppViaZApi({ toPhoneE164: phone, message: resolvedWhatsappBody });
          await insertCommLog({
            account_id: accountId,
            candidate_id: candidateId,
            job_id: jobId,
            session_id: sessionId,
            channel: "whatsapp",
            status: "sent",
            recipient: phone,
            body: resolvedWhatsappBody,
            provider: "zapi",
            metadata: { ...commonMeta, ...whatsappTemplateMeta },
          });
          sent++;
        }
      } catch (err: any) {
        await insertCommLog({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          channel: "whatsapp",
          status: "failed",
          recipient: candidate.phone || "(unknown)",
          body: resolvedWhatsappBody,
          provider: "zapi",
          error_message: err?.message || "failed",
          metadata: { ...commonMeta, ...whatsappTemplateMeta },
        });
        failed++;
      }
    }

    logger.info("Completed DISC reminders", { processed, sent, skipped, failed });

    return new Response(
      JSON.stringify({ success: true, processed, sent, skipped, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logger.error("Error in send-disc-reminders", { message: error?.message });
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
