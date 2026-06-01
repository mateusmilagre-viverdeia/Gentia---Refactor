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

const logger = createLogger("send-technical-invitation");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTechnicalInvitationRequest {
  candidateId: string;
  jobId: string;
  accountId: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  jobTitle?: string;
  companyName?: string;
  agentId?: string | null;
  force?: boolean;
  manual?: boolean;
  batchId?: string;
  skip_notifications?: boolean;
}

interface TechnicalQuestion {
  skill: string;
  skillType: "required" | "desired";
  level: number;
  questionText: string;
  followupSuperficial?: string;
  followupExcellent?: string;
  isFromBank: boolean;
}

interface JobDescriptionContext {
  title: string;
  mission: string | null;
  requiredSkills: string[];
  desiredSkills: string[];
  responsibilities: string[];
}

type CommStatus = "queued" | "sent" | "failed" | "skipped";
type CommChannel = "email" | "whatsapp";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      candidateId,
      jobId,
      accountId,
      candidateName: providedName,
      candidateEmail: providedEmail,
      candidatePhone: providedPhone,
      jobTitle: providedJobTitle,
      companyName: providedCompanyName,
      agentId,
      force,
      manual,
      batchId,
      skip_notifications = false,
    }: SendTechnicalInvitationRequest = await req.json();

    // Validate required fields
    if (!candidateId || !jobId || !accountId) {
      return new Response(
        JSON.stringify({ error: "candidateId, jobId, and accountId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logger.info(`Processing technical invitation for candidate=${candidateId}, job=${jobId}`);

    // Fetch candidate info if not provided
    let candidateName = providedName;
    let candidateEmail = providedEmail;
    let candidatePhone = providedPhone;

    if (!candidateName || !candidateEmail) {
      const { data: candidate, error: candidateError } = await supabase
        .from("recruitment_candidates")
        .select("first_name, last_name, email, phone")
        .eq("id", candidateId)
        .single();

      if (candidateError || !candidate) {
        logger.error("Candidate fetch error:", candidateError);
        return new Response(
          JSON.stringify({ error: "Candidate not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      candidateName = candidateName || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email;
      candidateEmail = candidateEmail || candidate.email;
      candidatePhone = candidatePhone || candidate.phone;
    }

    if (!candidateEmail) {
      return new Response(
        JSON.stringify({ error: "Candidate does not have an email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch job and company info (always fetch full data for context)
    let jobTitle = providedJobTitle;
    let companyName = providedCompanyName;
    let jobDescriptionContext: JobDescriptionContext | null = null;

    const { data: job, error: jobError } = await supabase
      .from("recruitment_jobs")
      .select("title, job_description_id, account:companies(name)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      logger.error("Job fetch error:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    jobTitle = jobTitle || job.title;
    companyName = companyName || (job.account as any)?.name || "a empresa";

    // Fetch job description for technical context
    if (job.job_description_id) {
      const { data: jd } = await supabase
        .from("job_descriptions")
        .select("title, mission, required_skills, desired_skills, responsibilities")
        .eq("id", job.job_description_id)
        .single();

      if (jd) {
        jobDescriptionContext = {
          title: jd.title || jobTitle,
          mission: jd.mission,
          requiredSkills: jd.required_skills || [],
          desiredSkills: jd.desired_skills || [],
          responsibilities: jd.responsibilities || [],
        };
        logger.info("Job description context loaded", {
          requiredSkills: jobDescriptionContext.requiredSkills.length,
          desiredSkills: jobDescriptionContext.desiredSkills.length,
        });
      }
    }

    // Check if candidate already completed a technical interview for this job
    const { data: completedSession } = await supabase
      .from("technical_interview_sessions")
      .select("id, status")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();

    if (completedSession) {
      logger.info("Candidate already completed technical interview, skipping new session creation", {
        candidateId,
        jobId,
        completedSessionId: completedSession.id,
      });
      return new Response(
        JSON.stringify({
          success: true,
          already_completed: true,
          session_id: completedSession.id,
          message: "Candidato já realizou a entrevista técnica para esta vaga.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending technical interview session
    const nowIso = new Date().toISOString();
    const { data: existingSession } = await supabase
      .from("technical_interview_sessions")
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
      logger.info("Using existing technical interview session:", sessionId);
    } else {
      // Generate technical questions based on job skills
      const questions: TechnicalQuestion[] = [];
      
      // Add questions for required skills (level 2-3)
      if (jobDescriptionContext?.requiredSkills) {
        for (const skill of jobDescriptionContext.requiredSkills.slice(0, 5)) {
          questions.push({
            skill,
            skillType: "required",
            level: 2,
            questionText: `Explique sua experiência com ${skill} e como você aplica isso no dia a dia.`,
            followupSuperficial: `Pode dar um exemplo mais concreto de quando você utilizou ${skill}?`,
            followupExcellent: `Quais são os desafios avançados que você enfrentou com ${skill}?`,
            isFromBank: false,
          });
        }
      }

      // Add questions for desired skills (level 1-2)
      if (jobDescriptionContext?.desiredSkills) {
        for (const skill of jobDescriptionContext.desiredSkills.slice(0, 3)) {
          questions.push({
            skill,
            skillType: "desired",
            level: 1,
            questionText: `Você tem experiência com ${skill}? Conte-me sobre isso.`,
            followupSuperficial: `Já teve oportunidade de estudar ou usar ${skill} em algum projeto?`,
            followupExcellent: `Como você integraria ${skill} com as outras tecnologias do dia a dia?`,
            isFromBank: false,
          });
        }
      }

      logger.info("Generated technical questions", { count: questions.length });

      // Resolve technical agent from workflow steps if not explicitly provided
      let resolvedAgentId = agentId;
      if (!resolvedAgentId) {
        const { data: techStep } = await supabase
          .from("recruitment_job_workflow_steps")
          .select("agent_id")
          .eq("job_id", jobId)
          .eq("step_type", "technical")
          .eq("is_active", true)
          .maybeSingle();
        resolvedAgentId = techStep?.agent_id || null;
      }

      // Create new session with unique token and questions
      token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { data: newSession, error: sessionError } = await supabase
        .from("technical_interview_sessions")
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          agent_id: resolvedAgentId || null,
          token,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          questions,
          job_description_context: jobDescriptionContext,
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        logger.error("Session creation error:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create technical interview session" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      sessionId = newSession.id;
      logger.info("Created new technical interview session:", sessionId);
    }

    // Build interview URL
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
    const interviewUrl = `${baseUrl}/interview/technical/${token}`;

    // If skip_notifications=true: session created, return URL without sending any messages
    if (skip_notifications) {
      logger.info("skip_notifications=true: returning sessionUrl without sending messages");
      return new Response(
        JSON.stringify({ success: true, token, sessionUrl: interviewUrl, sessionId }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Resolve contact preferences (opt-out + exception per job)
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

    // Anti-spam: block re-sending invites for 24h (per candidate + job)
    const windowStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentInvite } = await supabase
      .from("recruitment_communications_log")
      .select("id")
      .eq("account_id", accountId)
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .eq("message_type", "technical_invite")
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
      const { data } = await supabase
        .from("recruitment_communications_log")
        .insert({
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          session_id: sessionId,
          message_type: "technical_invite",
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
      job_title: jobTitle,
      company_name: companyName,
      interview_url: interviewUrl,
      assessment_url: interviewUrl, // Alias for compatibility
    };

    // Get templates
    const emailTemplate = await getActiveRecruitmentTemplate({
      supabase,
      accountId,
      channel: "email",
      messageType: "technical_invite" as any,
      reminderDay: null,
    });

    const whatsappTemplate = await getActiveRecruitmentTemplate({
      supabase,
      accountId,
      channel: "whatsapp",
      messageType: "technical_invite" as any,
      reminderDay: null,
    });

    // Fallback email content
    const fallbackEmailSubject = `Próxima Etapa: Entrevista Técnica - ${jobTitle}`;
    const fallbackEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7C3AED; margin-bottom: 10px;">Entrevista Técnica</h1>
        </div>
        
        <p style="font-size: 16px;">Olá ${candidateName},</p>
        
        <p style="font-size: 16px;">
          Parabéns! Você foi aprovado(a) na etapa anterior e está convidado(a) para a <strong>Entrevista Técnica com IA</strong> para a vaga de <strong>${jobTitle}</strong> na <strong>${companyName}</strong>.
        </p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
            <strong>🎯 O que esperar:</strong> Conversa por voz com IA adaptativa
          </p>
          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
            <strong>📋 Temas:</strong> Perguntas técnicas sobre competências da vaga
          </p>
          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
            <strong>⏱️ Duração estimada:</strong> 15-25 minutos
          </p>
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>⚡ Validade:</strong> Este link expira em 7 dias
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${interviewUrl}" style="background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Iniciar Entrevista →
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">
          ${interviewUrl}
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

    // Fallback WhatsApp message
    const fallbackWhatsappMessage = `Olá, ${candidateName}!\n\nParabéns! Você avançou para a *Entrevista Técnica* para a vaga *${jobTitle}* na *${companyName}*.\n\n🎯 Conversa por voz com IA adaptativa\n⏱️ Duração: 15-25 minutos\n\nAcesse o link (válido por 7 dias):\n${interviewUrl}`;
    const whatsappMessage = renderTemplateVariables(whatsappTemplate?.body || fallbackWhatsappMessage, templateVars);

    const baseMetadata = {
      manual: manual === true,
      force: force === true,
      ...(batchId ? { batch_id: batchId } : {}),
    } as Record<string, unknown>;

    const emailTemplateMeta = templateMetadata(emailTemplate);
    const whatsappTemplateMeta = templateMetadata(whatsappTemplate);

    // If opted-out and not allowed via exception, skip unless force
    if (optOutAll && !allowContactForJob && force !== true) {
      const emailLogId = await insertCommLog({
        channel: "email",
        status: "skipped",
        recipient: candidateEmail,
        subject: emailSubject,
        body: emailHtml,
        provider: "resend",
        metadata: { ...baseMetadata, ...emailTemplateMeta, skipped_reason: "opt_out" },
      });

      const whatsappLogId = await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: candidatePhone || "(no_phone)",
        subject: null,
        body: whatsappMessage,
        provider: "zapi",
        metadata: {
          ...baseMetadata,
          ...whatsappTemplateMeta,
          skipped_reason: "opt_out",
          ...(candidatePhone ? {} : { skipped_detail: "no_phone" }),
        },
      });

      logger.info("Skipped due to opt-out", { candidateId, jobId });

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          skipped_reason: "opt_out",
          sessionId,
          token,
          interviewUrl,
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
        recipient: candidateEmail,
        subject: emailSubject,
        body: emailHtml,
        provider: "resend",
        metadata: { ...baseMetadata, ...emailTemplateMeta, skipped_reason: "rate_limited_24h", window_start: windowStartIso },
      });

      const whatsappLogId = await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: candidatePhone || "(no_phone)",
        subject: null,
        body: whatsappMessage,
        provider: "zapi",
        metadata: {
          ...baseMetadata,
          ...whatsappTemplateMeta,
          skipped_reason: "rate_limited_24h",
          window_start: windowStartIso,
          ...(candidatePhone ? {} : { skipped_detail: "no_phone" }),
        },
      });

      logger.info("Skipped due to rate limit (24h)", { candidateId, jobId });

      return new Response(
        JSON.stringify({
          success: true,
          rateLimited: true,
          sessionId,
          token,
          interviewUrl,
          emailSentTo: candidateEmail,
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
        to: [candidateEmail],
        subject: emailSubject,
        html: emailHtml,
      });
      logger.info("Email sent successfully:", emailResponse);

      emailLogId = await insertCommLog({
        channel: "email",
        status: "sent",
        recipient: candidateEmail,
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
      logger.error("Email send failed:", err);
      emailLogId = await insertCommLog({
        channel: "email",
        status: "failed",
        recipient: candidateEmail,
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
    if (!candidatePhone) {
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
        },
      });
    } else if (!isZApiConfigured()) {
      whatsapp = { attempted: false, sent: false, skipped_reason: "zapi_not_configured" };
      whatsappLogId = await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: candidatePhone,
        subject: null,
        body: whatsappMessage,
        provider: "zapi",
        metadata: {
          ...baseMetadata,
          ...whatsappTemplateMeta,
          skipped_reason: "zapi_not_configured",
        },
      });
    } else {
      try {
        const zapiResult = await sendWhatsAppViaZApi({
          toPhoneE164: candidatePhone,
          message: whatsappMessage,
        });
        whatsapp = { attempted: true, sent: true };
        whatsappLogId = await insertCommLog({
          channel: "whatsapp",
          status: "sent",
          recipient: candidatePhone,
          subject: null,
          body: whatsappMessage,
          provider: "zapi",
          provider_message_id: (zapiResult.response as any)?.messageId ?? null,
          metadata: {
            ...baseMetadata,
            ...whatsappTemplateMeta,
            ...(optOutOverridden ? { opt_out_overridden: true } : {}),
          },
        });
        logger.info("WhatsApp sent successfully");
      } catch (waErr: any) {
        whatsapp = { attempted: true, sent: false, error: waErr?.message || "unknown" };
        whatsappLogId = await insertCommLog({
          channel: "whatsapp",
          status: "failed",
          recipient: candidatePhone,
          subject: null,
          body: whatsappMessage,
          provider: "zapi",
          error_message: waErr?.message || "failed",
          metadata: {
            ...baseMetadata,
            ...whatsappTemplateMeta,
            ...(optOutOverridden ? { opt_out_overridden: true } : {}),
          },
        });
        logger.error("WhatsApp send failed:", waErr);
      }
    }

    logger.info("Technical invitation process completed", {
      candidateId,
      jobId,
      sessionId,
      emailSent: !!emailResponse?.id,
      whatsappSent: whatsapp.sent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        token,
        interviewUrl,
        emailSentTo: candidateEmail,
        whatsapp,
        logs: { emailLogId, whatsappLogId },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logger.error("Error in send-technical-invitation:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
