import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendWhatsAppViaZApi } from "../_shared/whatsapp-zapi.ts";
import {
  getActiveRecruitmentTemplate,
  renderTemplateVariables,
  templateMetadata,
} from "../_shared/recruitment-message-templates.ts";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDISCInvitationRequest {
  candidateId: string;
  jobId: string;
  agentId?: string;
  accountId: string;
  force?: boolean;
  manual?: boolean;
  batchId?: string;
  skip_notifications?: boolean;
}

type CommStatus = "queued" | "sent" | "failed" | "skipped";
type CommChannel = "email" | "whatsapp";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { candidateId, jobId, agentId, accountId, force, manual, batchId, skip_notifications = false }: SendDISCInvitationRequest =
      await req.json();

    // Validate required fields
    if (!candidateId || !jobId || !accountId) {
      return new Response(
        JSON.stringify({ error: "candidateId, jobId, and accountId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch candidate info
    const { data: candidate, error: candidateError } = await supabaseClient
      .from("recruitment_candidates")
      .select("first_name, last_name, email, phone")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error("Candidate fetch error:", candidateError);
      return new Response(
        JSON.stringify({ error: "Candidate not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!candidate.email) {
      return new Response(
        JSON.stringify({ error: "Candidate does not have an email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Resolve candidate_profile_id from email → profiles → candidate_profiles
    let candidateProfileId: string | null = null;
    try {
      const { data: prof } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", candidate.email)
        .maybeSingle();
      if (prof?.id) {
        const { data: cp } = await supabaseClient
          .from("candidate_profiles")
          .select("id")
          .eq("user_id", prof.id)
          .maybeSingle();
        candidateProfileId = cp?.id || null;
      }
      console.log("Resolved candidate_profile_id:", candidateProfileId);
    } catch (err) {
      console.warn("Failed to resolve candidate_profile_id:", err);
    }

    // Fetch job and company info
    const { data: job, error: jobError } = await supabaseClient
      .from("recruitment_jobs")
      .select("title, account:companies(name)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Job fetch error:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for existing (valid) pending session
    // Rule: only reuse if it's still within the 7-day window; if expired, create a new session
    const nowIso = new Date().toISOString();
    const { data: existingSession } = await supabaseClient
      .from("candidate_disc_sessions")
      .select("id, token, status, expires_at")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .in("status", ["pending", "in_progress"])
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let token: string;
    let sessionId: string;

    if (existingSession) {
      // Use existing session
      token = existingSession.token;
      sessionId = existingSession.id;
      console.log("Using existing (non-expired) DISC session:", sessionId);
    } else {
      // Create new session with unique token
      token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const { data: newSession, error: sessionError } = await supabaseClient
        .from("candidate_disc_sessions")
        .insert({
          candidate_id: candidateId,
          candidate_profile_id: candidateProfileId,
          job_id: jobId,
          agent_id: agentId || null,
          account_id: accountId,
          token,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        console.error("Session creation error:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create assessment session" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      sessionId = newSession.id;
      console.log("Created new session:", sessionId);
    }

    // Build assessment URL
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
    const assessmentUrl = `${baseUrl}/assessment/disc/${token}`;

    // If skip_notifications=true: session created, return URL without sending any messages
    if (skip_notifications) {
      console.log("skip_notifications=true: returning sessionUrl without sending messages");
      return new Response(
        JSON.stringify({ success: true, token, sessionUrl: assessmentUrl, sessionId }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const candidateName = `${candidate.first_name} ${candidate.last_name || ""}`.trim();
    const companyName = (job.account as any)?.name || "a empresa";

    // Resolve contact preferences (opt-out + exception per job)
    const { data: prefs } = await supabaseClient
      .from("recruitment_candidate_contact_prefs")
      .select("opt_out_all")
      .eq("account_id", accountId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    const optOutAll = (prefs as any)?.opt_out_all === true;

    const { data: exception } = await supabaseClient
      .from("recruitment_candidate_contact_exceptions")
      .select("allow_contact")
      .eq("account_id", accountId)
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();

    const allowContactForJob = (exception as any)?.allow_contact === true;

    // Anti-spam: block re-sending DISC invites for 24h (per candidate + job)
    const windowStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentInvite } = await supabaseClient
      .from("recruitment_communications_log")
      .select("id")
      .eq("account_id", accountId)
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .eq("message_type", "disc_invite")
      // Semântica: bloquear somente se houver um envio bem-sucedido recente
      .eq("status", "sent")
      .gte("created_at", windowStartIso)
      .limit(1)
      .maybeSingle();

    const insertCommLog = async (payload: {
      channel: CommChannel;
      status: CommStatus;
      recipient: string;
      subject?: string | null;
      body?: string | null;
      provider?: string | null;
      provider_message_id?: string | null;
      error_code?: string | null;
      error_message?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      const { data } = await supabaseClient
        .from("recruitment_communications_log")
        .insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "disc_invite",
          channel: payload.channel,
          recipient: payload.recipient,
          subject: payload.subject ?? null,
          body: payload.body ?? null,
          status: payload.status,
          provider: payload.provider ?? null,
          provider_message_id: payload.provider_message_id ?? null,
          error_code: payload.error_code ?? null,
          error_message: payload.error_message ?? null,
          metadata: payload.metadata ?? {},
        })
        .select("id")
        .single();

      return data?.id as string | undefined;
    };

    const templateVars = {
      candidate_name: candidateName,
      job_title: job.title,
      company_name: companyName,
      assessment_url: assessmentUrl,
    };

    const emailTemplate = await getActiveRecruitmentTemplate({
      supabase: supabaseClient,
      accountId,
      channel: "email",
      messageType: "disc_invite",
      reminderDay: null,
    });
    const whatsappTemplate = await getActiveRecruitmentTemplate({
      supabase: supabaseClient,
      accountId,
      channel: "whatsapp",
      messageType: "disc_invite",
      reminderDay: null,
    });

    const fallbackEmailSubject = `Avaliação de Fit Comportamental - ${companyName} - ${job.title}`;
    const fallbackEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7C3AED; margin-bottom: 10px;">Assessment Comportamental</h1>
          </div>
          
          <p style="font-size: 16px;">Olá ${candidateName},</p>
          
          <p style="font-size: 16px;">
            Você foi convidado(a) para participar de uma <strong>avaliação comportamental DISC</strong> como parte do processo seletivo para a vaga de <strong>${job.title}</strong> na <strong>${companyName}</strong>.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
              <strong>⏱️ Duração estimada:</strong> 10-15 minutos
            </p>
            <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
              <strong>📋 Formato:</strong> 32 afirmações sobre comportamento
            </p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>⚡ Validade:</strong> Este link expira em 7 dias
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${assessmentUrl}" style="background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Iniciar Assessment →
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
          </p>
          <p style="font-size: 12px; color: #999; word-break: break-all;">
            ${assessmentUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Este é um email automático enviado pelo sistema de recrutamento.
            <br>
            © ${new Date().getFullYear()} ${companyName}
          </p>
        </body>
        </html>
      `;

    const emailSubject = renderTemplateVariables(emailTemplate?.subject || fallbackEmailSubject, templateVars);
    const emailHtml = renderTemplateVariables(emailTemplate?.body || fallbackEmailHtml, templateVars);

    const phone = (candidate as any)?.phone as string | null | undefined;
    const fallbackWhatsappMessage = `Olá, ${candidateName}!\n\nVocê foi convidado(a) para realizar a avaliação comportamental DISC para a vaga *${job.title}* na *${companyName}*.\n\nAcesse o link (válido por 7 dias):\n${assessmentUrl}`;
    const whatsappMessage = renderTemplateVariables(whatsappTemplate?.body || fallbackWhatsappMessage, templateVars);

    const baseMetadata = {
      manual: manual === true,
      force: force === true,
      ...(batchId ? { batch_id: batchId } : {}),
    } as Record<string, unknown>;

    const emailTemplateMeta = templateMetadata(emailTemplate);
    const whatsappTemplateMeta = templateMetadata(whatsappTemplate);

    // If opted-out and not allowed via exception, skip unless force.
    if (optOutAll && !allowContactForJob && force !== true) {
      const emailLogId = await insertCommLog({
        channel: "email",
        status: "skipped",
        recipient: candidate.email,
        subject: emailSubject,
        body: emailHtml,
        provider: "resend",
        metadata: { ...baseMetadata, ...emailTemplateMeta, skipped_reason: "opt_out" },
      });

      const whatsappRecipient = phone || "";
      const whatsappLogId = await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: whatsappRecipient || "(no_phone)",
        subject: null,
        body: whatsappMessage,
        provider: "zapi",
        metadata: {
          ...baseMetadata,
          ...whatsappTemplateMeta,
          skipped_reason: "opt_out",
          ...(phone ? {} : { skipped_detail: "no_phone" }),
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          skipped_reason: "opt_out",
          sessionId,
          token,
          assessmentUrl,
          logs: { emailLogId, whatsappLogId },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const optOutOverridden = optOutAll && !allowContactForJob && force === true;

    // If rate-limited, record skipped logs and return without sending (unless force)
    if (recentInvite && force !== true) {
      const emailLogId = await insertCommLog({
        channel: "email",
        status: "skipped",
        recipient: candidate.email,
        subject: emailSubject,
        body: emailHtml,
        provider: "resend",
        metadata: { ...baseMetadata, ...emailTemplateMeta, skipped_reason: "rate_limited_24h", window_start: windowStartIso },
      });

      const whatsappRecipient = phone || "";
      const whatsappLogId = await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: whatsappRecipient || "(no_phone)",
        subject: null,
        body: whatsappMessage,
        provider: "zapi",
        metadata: {
          ...baseMetadata,
          ...whatsappTemplateMeta,
          skipped_reason: "rate_limited_24h",
          window_start: windowStartIso,
          ...(phone ? {} : { skipped_detail: "no_phone" }),
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          rateLimited: true,
          sessionId,
          token,
          assessmentUrl,
          emailSentTo: candidate.email,
          whatsapp: phone
            ? { attempted: false, sent: false, skipped_reason: "rate_limited_24h" }
            : { attempted: false, sent: false, skipped_reason: "no_phone" },
          logs: { emailLogId, whatsappLogId },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email
    let emailLogId: string | undefined;
    let emailResponse: any = null;
    try {
      emailResponse = await resend.emails.send({
        from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
        to: [candidate.email],
        subject: emailSubject,
        html: emailHtml,
      });
      console.log("Email sent successfully:", emailResponse);

      emailLogId = await insertCommLog({
        channel: "email",
        status: "sent",
        recipient: candidate.email,
        subject: emailSubject,
        body: emailHtml,
        provider: "resend",
        provider_message_id: emailResponse?.id ?? null,
        metadata: {
          ...baseMetadata,
          ...emailTemplateMeta,
          ...(optOutOverridden ? { opt_out_overridden: true } : {}),
        },
      });
    } catch (err: any) {
      console.error("Email send failed in send-disc-invitation", err);
      emailLogId = await insertCommLog({
        channel: "email",
        status: "failed",
        recipient: candidate.email,
        subject: emailSubject,
        body: emailHtml,
        provider: "resend",
        error_message: err?.message || "failed",
        metadata: {
          ...baseMetadata,
          ...emailTemplateMeta,
          ...(optOutOverridden ? { opt_out_overridden: true } : {}),
        },
      });
    }

    // Send WhatsApp (best effort; never blocks email)
    let whatsapp: {
      attempted: boolean;
      sent: boolean;
      skipped_reason?: string;
      error?: string;
    } = { attempted: false, sent: false };

    let whatsappLogId: string | undefined;
    if (!phone) {
      whatsapp = { attempted: false, sent: false, skipped_reason: "no_phone" };
      whatsappLogId = await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: "(no_phone)",
        subject: null,
        body: whatsappMessage,
        provider: "zapi",
        metadata: {
          ...baseMetadata,
          ...whatsappTemplateMeta,
          skipped_reason: "no_phone",
          ...(optOutOverridden ? { opt_out_overridden: true } : {}),
        },
      });
    } else {
      whatsapp.attempted = true;
      try {
        await sendWhatsAppViaZApi({ toPhoneE164: phone, message: whatsappMessage });
        whatsapp.sent = true;
        whatsappLogId = await insertCommLog({
          channel: "whatsapp",
          status: "sent",
          recipient: phone,
          subject: null,
          body: whatsappMessage,
          provider: "zapi",
          metadata: {
            ...baseMetadata,
            ...whatsappTemplateMeta,
            ...(optOutOverridden ? { opt_out_overridden: true } : {}),
          },
        });
      } catch (err: any) {
        console.error("WhatsApp send failed in send-disc-invitation", err);
        whatsapp.sent = false;
        whatsapp.error = err?.message || "failed";
        whatsappLogId = await insertCommLog({
          channel: "whatsapp",
          status: "failed",
          recipient: phone,
          subject: null,
          body: whatsappMessage,
          provider: "zapi",
          error_message: err?.message || "failed",
          metadata: {
            ...baseMetadata,
            ...whatsappTemplateMeta,
            ...(optOutOverridden ? { opt_out_overridden: true } : {}),
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rateLimited: false,
        sessionId,
        token,
        assessmentUrl,
        emailSentTo: candidate.email,
        whatsapp,
        logs: { emailLogId, whatsappLogId },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-disc-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
