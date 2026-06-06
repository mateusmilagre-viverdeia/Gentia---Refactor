import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppViaZApi } from "../_shared/whatsapp-zapi.ts";
import { sendEmailViaResend } from "../_shared/resend-email.ts";
import { filterFactualQuestions } from "../_shared/factualQuestionFilter.ts";
import { resolveCulturalAgentId } from "../_shared/resolveCulturalAgent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInviteRequest {
  candidate_id: string;
  job_id: string;
  agent_id?: string;
  custom_message?: string;
  language?: "pt" | "en" | "es";
  is_resend?: boolean;
  session_id?: string; // For resending existing invites
  skip_notifications?: boolean;
}

type CommStatus = "queued" | "sent" | "failed" | "skipped";
type CommChannel = "email" | "whatsapp";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid or expired token");
    }

    const requestData: SendInviteRequest = await req.json();
    const { candidate_id, job_id, agent_id, custom_message, language = "pt", is_resend = false, session_id, skip_notifications = false } = requestData;

    console.log("Processing invite request:", { candidate_id, job_id, agent_id, is_resend, session_id });

    // Get candidate details
    const { data: candidate, error: candidateError } = await supabase
      .from("recruitment_candidates")
      .select("id, first_name, last_name, email, phone, account_id")
      .eq("id", candidate_id)
      .single();

    if (candidateError || !candidate) {
      console.error("Candidate error:", candidateError);
      throw new Error("Candidate not found");
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("recruitment_jobs")
      .select("id, title, account_id")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      console.error("Job error:", jobError);
      throw new Error("Job not found");
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", candidate.account_id)
      .single();

    if (companyError || !company) {
      console.error("Company error:", companyError);
      throw new Error("Company not found");
    }

    let interviewSession;
    let interviewToken: string;

    if (is_resend && session_id) {
      // Update existing session
      const { data: existingSession, error: sessionError } = await supabase
        .from("culture_interview_sessions")
        .select("*")
        .eq("id", session_id)
        .single();

      if (sessionError || !existingSession) {
        throw new Error("Interview session not found");
      }

      interviewToken = existingSession.token;
      
      // Update resend count and sent_at
      await supabase
        .from("culture_interview_sessions")
        .update({
          email_sent_at: new Date().toISOString(),
          email_resend_count: (existingSession.email_resend_count || 0) + 1,
        })
        .eq("id", session_id);

      interviewSession = existingSession;
    } else {
      // Generate unique token for interview
      interviewToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to complete

      // Load canonical values questions for this account so the AI uses the
      // configured cultural questions instead of falling back to generic defaults.
      const { data: vqSession } = await supabase
        .from("values_questions_sessions")
        .select("id")
        .eq("account_id", candidate.account_id)
        .maybeSingle();

      let questions: Array<{
        id: string;
        position: number;
        question_text: string;
        value_label: string | null;
        requires_thinking_time: boolean;
      }> = [];
      if (vqSession?.id) {
        const { data: qs } = await supabase
          .from("values_questions_items")
          .select("id, stage_number, value_label, question_text, position, requires_thinking_time")
          .eq("session_id", vqSession.id)
          .order("stage_number", { ascending: true })
          .order("position", { ascending: true });
        const rawQuestions = (qs || []).map((q: any) => ({
          id: q.id,
          position: 0,
          question_text: q.question_text,
          value_label: q.value_label,
          requires_thinking_time: !!q.requires_thinking_time,
        }));
        const { kept, removed } = filterFactualQuestions(rawQuestions, (q) => q.question_text);
        if (removed.length > 0) {
          console.log("[factualFilter] send-interview-invite removed", {
            account_id: candidate.account_id,
            removedCount: removed.length,
            removedTexts: removed.map((r) => r.question_text),
          });
        }
        questions = kept.map((q, i) => ({ ...q, position: i + 1 }));
      }

      if (questions.length === 0) {
        console.error("No values questions configured for account", candidate.account_id);
        return new Response(
          JSON.stringify({
            success: false,
            error: "NO_QUESTIONS_CONFIGURED",
            message:
              "Esta conta não tem perguntas de valores configuradas. Configure em Atração & Contratação → Perguntas de Valores antes de iniciar entrevistas.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Resolve cultural agent_id (Fase 2): persist at session creation so
      // we don't depend solely on the runtime fallback in culture-interview-complete.
      const resolvedAgent = await resolveCulturalAgentId(supabase, {
        jobId: job_id,
        accountId: candidate.account_id,
        fallbackId: agent_id,
      });
      console.log("[send-interview-invite] agent resolved", {
        job_id,
        account_id: candidate.account_id,
        level: resolvedAgent.level,
        source: resolvedAgent.source,
        agent_id: resolvedAgent.agentId,
      });
      if (!resolvedAgent.agentId) {
        console.warn("[send-interview-invite] no cultural agent resolved", {
          job_id,
          account_id: candidate.account_id,
        });
      }

      // Create interview session
      const { data: newSession, error: sessionError } = await supabase
        .from("culture_interview_sessions")
        .insert({
          account_id: candidate.account_id,
          candidate_id: candidate_id,
          job_id: job_id,
          agent_id: resolvedAgent.agentId,
          token: interviewToken,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          email_sent_at: new Date().toISOString(),
          email_resend_count: 0,
          questions,
          questions_total: questions.length,
          questions_covered: 0,
          conductor_enabled: true,
        } as any)
        .select()
        .single();

      if (sessionError) {
        console.error("Session creation error:", sessionError);
        throw new Error("Failed to create interview session");
      }

      interviewSession = newSession;
    }

    // Build interview URL
    const baseUrl = Deno.env.get("FRONTEND_URL") || "https://gentia.lovable.app";
    const interviewUrl = `${baseUrl}/interview/${interviewToken}`;

    // If skip_notifications=true: session created, return URL without sending any messages
    if (skip_notifications) {
      console.log("skip_notifications=true: returning sessionUrl without sending messages");
      return new Response(
        JSON.stringify({ success: true, token: interviewToken, sessionUrl: interviewUrl, sessionId: interviewSession.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const candidateName = `${candidate.first_name} ${candidate.last_name || ""}`.trim();

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
          account_id: candidate.account_id,
          candidate_id: candidate.id,
          job_id: job.id,
          session_id: interviewSession.id,
          message_type: "culture_invite",
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

    // Email templates by language
    const templates = {
      pt: {
        subject: `Convite para Entrevista - ${job.title} na ${company.name}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Olá, ${candidateName}!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Você foi convidado(a) para participar de uma entrevista para a vaga de <strong>${job.title}</strong> na <strong>${company.name}</strong>.
              </p>
              
              ${custom_message ? `
                <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
                  <p style="margin: 0; color: #475569; font-style: italic;">"${custom_message}"</p>
                </div>
              ` : ""}
              
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                A entrevista será conduzida por nossa IA e leva aproximadamente <strong>15-20 minutos</strong>. Você pode realizar a qualquer momento, no seu próprio ritmo.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Iniciar Entrevista
                </a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                <strong>Dicas para a entrevista:</strong>
              </p>
              <ul style="font-size: 14px; color: #64748b; line-height: 1.8;">
                <li>Escolha um ambiente tranquilo e sem distrações</li>
                <li>Tenha em mãos seu currículo ou experiências que deseja compartilhar</li>
                <li>Seja autêntico(a) nas suas respostas</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                Este convite expira em 7 dias. Se você não solicitou esta entrevista, pode ignorar este email.
              </p>
            </div>
          </div>
        `,
      },
      en: {
        subject: `Interview Invitation - ${job.title} at ${company.name}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Hello, ${candidateName}!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                You have been invited to participate in an interview for the <strong>${job.title}</strong> position at <strong>${company.name}</strong>.
              </p>
              
              ${custom_message ? `
                <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
                  <p style="margin: 0; color: #475569; font-style: italic;">"${custom_message}"</p>
                </div>
              ` : ""}
              
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                The interview will be conducted by our AI and takes approximately <strong>15-20 minutes</strong>. You can complete it at any time, at your own pace.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Start Interview
                </a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                <strong>Tips for the interview:</strong>
              </p>
              <ul style="font-size: 14px; color: #64748b; line-height: 1.8;">
                <li>Choose a quiet environment without distractions</li>
                <li>Have your resume or experiences you want to share at hand</li>
                <li>Be authentic in your responses</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                This invitation expires in 7 days. If you did not request this interview, you can ignore this email.
              </p>
            </div>
          </div>
        `,
      },
      es: {
        subject: `Invitación a Entrevista - ${job.title} en ${company.name}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">¡Hola, ${candidateName}!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                Has sido invitado(a) a participar en una entrevista para el puesto de <strong>${job.title}</strong> en <strong>${company.name}</strong>.
              </p>
              
              ${custom_message ? `
                <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
                  <p style="margin: 0; color: #475569; font-style: italic;">"${custom_message}"</p>
                </div>
              ` : ""}
              
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                La entrevista será conducida por nuestra IA y dura aproximadamente <strong>15-20 minutos</strong>. Puedes realizarla en cualquier momento, a tu propio ritmo.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Iniciar Entrevista
                </a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                <strong>Consejos para la entrevista:</strong>
              </p>
              <ul style="font-size: 14px; color: #64748b; line-height: 1.8;">
                <li>Elige un ambiente tranquilo y sin distracciones</li>
                <li>Ten a mano tu currículum o experiencias que deseas compartir</li>
                <li>Sé auténtico(a) en tus respuestas</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                Esta invitación expira en 7 días. Si no solicitaste esta entrevista, puedes ignorar este correo.
              </p>
            </div>
          </div>
        `,
      },
    };

    const template = templates[language] || templates.pt;

    // Send email via global platform config
    let emailLogId: string | undefined;
    try {
      const emailResult = await sendEmailViaResend({
        supabase,
        to: candidate.email,
        subject: template.subject,
        html: template.html,
      });

      console.log("Email sent:", emailResult);
      emailLogId = await insertCommLog({
        channel: "email",
        status: emailResult.ok ? "sent" : "failed",
        recipient: candidate.email,
        subject: template.subject,
        body: template.html,
        provider: "resend",
        error_message: emailResult.ok ? null : emailResult.error,
        metadata: { language, custom_message: custom_message || null, is_resend },
      });
    } catch (err: any) {
      console.error("Email send failed in send-interview-invite", err);
      emailLogId = await insertCommLog({
        channel: "email",
        status: "failed",
        recipient: candidate.email,
        subject: template.subject,
        body: template.html,
        provider: "resend",
        error_message: err?.message || "failed",
        metadata: { language, custom_message: custom_message || null, is_resend },
      });
    }

    // Log the email
    await supabase.from("recruitment_email_log").insert({
      account_id: candidate.account_id,
      candidate_id: candidate.id,
      session_id: interviewSession.id,
      job_id: job.id,
      email_type: is_resend ? "resend" : "interview_invite",
      sent_to: candidate.email,
      subject: template.subject,
      status: "sent",
      metadata: {
        language,
        custom_message: custom_message || null,
        resend_id: emailLogId,
      },
    });

    // Send WhatsApp (best effort; never blocks email)
    let whatsapp: {
      attempted: boolean;
      sent: boolean;
      skipped_reason?: string;
      error?: string;
    } = { attempted: false, sent: false };

    const phone = (candidate as any)?.phone as string | null | undefined;
    if (!phone) {
      whatsapp = { attempted: false, sent: false, skipped_reason: "no_phone" };
      await insertCommLog({
        channel: "whatsapp",
        status: "skipped",
        recipient: "(no_phone)",
        subject: null,
        body: null,
        provider: "zapi",
        metadata: {
          skipped_reason: "no_phone",
          language,
          is_resend,
        },
      });
    } else {
      whatsapp.attempted = true;
      try {
        const msgByLang: Record<string, string> = {
          pt: `Olá, ${candidateName}!\n\nVocê foi convidado(a) para a entrevista da vaga *${job.title}* na *${company.name}*.\n\nAcesse o link para iniciar (válido por 7 dias):\n${interviewUrl}`,
          en: `Hello, ${candidateName}!\n\nYou were invited to an interview for *${job.title}* at *${company.name}*.\n\nStart here (valid for 7 days):\n${interviewUrl}`,
          es: `¡Hola, ${candidateName}!\n\nHas sido invitado(a) a una entrevista para *${job.title}* en *${company.name}*.\n\nInicia aquí (válido por 7 días):\n${interviewUrl}`,
        };

        const baseMsg = msgByLang[language] || msgByLang.pt;
        const finalMsg = custom_message
          ? `${baseMsg}\n\nMensagem: ${custom_message}`
          : baseMsg;

        await sendWhatsAppViaZApi({ toPhoneE164: phone, message: finalMsg });
        whatsapp.sent = true;
        await insertCommLog({
          channel: "whatsapp",
          status: "sent",
          recipient: phone,
          subject: null,
          body: finalMsg,
          provider: "zapi",
          metadata: {
            language,
            is_resend,
          },
        });
      } catch (err: any) {
        console.error("WhatsApp send failed in send-interview-invite", err);
        whatsapp.sent = false;
        whatsapp.error = err?.message || "failed";
        await insertCommLog({
          channel: "whatsapp",
          status: "failed",
          recipient: phone,
          subject: null,
          body: null,
          provider: "zapi",
          error_message: err?.message || "failed",
          metadata: {
            language,
            is_resend,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: interviewSession.id,
        email_id: emailLogId,
        logs: { emailLogId },
        whatsapp,
        message: is_resend ? "Invite resent successfully" : "Invite sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-interview-invite function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
