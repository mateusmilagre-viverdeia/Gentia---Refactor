import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmailViaResend } from "../_shared/resend-email.ts";
import { sendWhatsAppViaMeta, isMetaWhatsAppConfigured, sendWhatsAppTemplateMeta, getWorkflowTemplateConfig } from "../_shared/whatsapp-meta.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrchestratorRequest {
  candidateId: string;
  jobId: string;
  accountId: string;
  completedStepType: "screening" | "cultural" | "disc" | "technical";
  sessionId?: string;
  completedNaturally?: boolean | null;
  attemptNumber?: number;
}

interface WorkflowStep {
  id: string;
  step_type: string;
  position: number;
  is_active: boolean;
  agent_id: string | null;
  threshold_config: {
    min_score?: number;
    min_match?: number;
  };
}

interface FunnelStage {
  id: string;
  name: string;
  position: number;
  step_type: string | null;
}

// Default status mapping when no funnel is configured
const STEP_TO_DEFAULT_STATUS: Record<string, string> = {
  screening: "applied",
  cultural: "interview",
  disc: "disc",
  technical: "evaluation",
};

const NEXT_DEFAULT_STATUS: Record<string, string> = {
  interview: "disc",
  disc: "evaluation",
  evaluation: "offer",
};

// ─── Fixed email templates ──────────────────────────────────────────────────

function advanceEmailTemplate(name: string, jobTitle: string, nextStepUrl: string, nextStepLabel: string) {
  return {
    subject: `Próxima etapa do processo seletivo para ${jobTitle}`,
    html: `
<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:30px;border-radius:16px 16px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">Olá, ${name}!</h1>
  </div>
  <div style="background:#f8fafc;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Informamos que você avançou para a <strong>próxima etapa</strong> do processo seletivo para a vaga de <strong>${jobTitle}</strong>.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Você já pode realizar a próxima etapa. Clique no botão abaixo para começar:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${nextStepUrl}"
         style="background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        ${nextStepLabel} →
      </a>
    </div>
    <p style="color:#64748b;font-size:14px;">
      Ou copie e cole este link no seu navegador:<br>
      <a href="${nextStepUrl}" style="color:#6366f1;">${nextStepUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;">Processo gerenciado por Gent.IA</p>
  </div>
</div>`,
  };
}

function completeEmailTemplate(name: string, jobTitle: string) {
  return {
    subject: `Você completou todas as etapas do processo para ${jobTitle}`,
    html: `
<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;border-radius:16px 16px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">Olá, ${name}!</h1>
  </div>
  <div style="background:#f8fafc;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Você concluiu <strong>todas as etapas</strong> do processo seletivo para a vaga de <strong>${jobTitle}</strong>.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Nossa equipe analisará o seu perfil com base nos resultados obtidos e entrará em contato em breve com as próximas informações.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Agradecemos a sua participação no processo.
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;">Processo gerenciado por Gent.IA</p>
  </div>
</div>`,
  };
}

function rejectEmailTemplate(name: string, jobTitle: string) {
  return {
    subject: `Sobre sua participação no processo para ${jobTitle}`,
    html: `
<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#64748b 0%,#475569 100%);padding:30px;border-radius:16px 16px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">Olá, ${name}</h1>
  </div>
  <div style="background:#f8fafc;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Agradecemos imensamente pelo seu interesse e pela sua participação no processo seletivo para a vaga de <strong>${jobTitle}</strong>.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Após uma análise cuidadosa, informamos que não iremos seguir com a sua candidatura neste momento. Essa decisão não reflete necessariamente a sua capacidade ou potencial.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Agradecemos o tempo dedicado e desejamos muito sucesso na sua jornada profissional!
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;">Processo gerenciado por Gent.IA</p>
  </div>
</div>`,
  };
}

// ─── AI-personalized WhatsApp messages ──────────────────────────────────────

async function generatePersonalizedAdvanceMessage(
  candidateName: string,
  jobTitle: string,
  completedStep: string,
  nextStepLabel: string,
  nextStepUrl: string,
  supabase?: any,
  accountId?: string,
  candidateId?: string,
): Promise<string> {
  const fallback = `Olá, ${candidateName}! Você avançou para a próxima etapa do processo seletivo para a vaga de *${jobTitle}*.\n\nVocê já pode realizar a próxima etapa:\n*${nextStepLabel}*\n👉 ${nextStepUrl}\n\nAcesse o link acima para continuar.`;

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return fallback;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você gera mensagens de WhatsApp curtas e profissionais para candidatos que avançaram em um processo seletivo. 
Tom: empático, profissional e encorajador. Máximo 400 caracteres.
OBRIGATÓRIO incluir: nome do candidato, nome da vaga, o que acabou de completar, próximo passo, e o link.
Use *negrito* para destaques. Use emoji com moderação (1-2).
NÃO mencione scores ou notas. NÃO diga "parabéns por passar".
Foco: informar que avançou e orientar sobre o próximo passo.`,
          },
          {
            role: 'user',
            content: `Candidato: ${candidateName}\nVaga: ${jobTitle}\nEtapa concluída: ${completedStep}\nPróximo passo: ${nextStepLabel}\nLink: ${nextStepUrl}`,
          },
        ],
        temperature: 0.6,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (supabase && accountId) {
        await consumeAICredits({
          supabase, accountId, aiData: data, model: 'google/gemini-3-flash-preview',
          referenceType: 'orchestrator_advance_message', referenceId: candidateId,
          description: `Msg avanço ${candidateName}`,
        });
      }
      const msg = data.choices?.[0]?.message?.content;
      if (msg && msg.length > 20 && msg.length < 600) return msg;
    }
  } catch (e) {
    console.warn('⚠️ AI personalization failed, using default:', e);
  }

  return fallback;
}

const completeWhatsApp = (name: string, jobTitle: string) =>
  `Olá, ${name}! Você concluiu todas as etapas do processo seletivo para *${jobTitle}*. Nossa equipe analisará o seu perfil e entrará em contato em breve. Agradecemos a sua participação.`;

// ─── Helper: log decision ────────────────────────────────────────────────────

interface DecisionLogInput {
  supabase: any;
  accountId: string;
  candidateId: string;
  jobId: string;
  applicationId: string;
  decisionType: string;
  stepType: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  decision: string;
  score?: number | null;
  threshold?: number | null;
  justification?: string;
  triggeredBy?: string;
  startTime?: number;
}

async function logDecision({
  supabase,
  accountId,
  candidateId,
  jobId,
  applicationId,
  decisionType,
  stepType,
  inputData,
  outputData,
  decision,
  score,
  threshold,
  justification,
  triggeredBy = "orchestrator",
  startTime,
}: DecisionLogInput): Promise<void> {
  try {
    const processingTimeMs = startTime ? Date.now() - startTime : null;
    await (supabase.from("recruitment_decision_log") as any).insert({
      account_id: accountId,
      candidate_id: candidateId,
      job_id: jobId,
      application_id: applicationId,
      decision_type: decisionType,
      step_type: stepType,
      input_data: inputData,
      output_data: outputData,
      decision,
      score: score ?? null,
      threshold: threshold ?? null,
      justification,
      processing_time_ms: processingTimeMs,
      triggered_by: triggeredBy,
    });
    console.log(`📝 Decision logged: ${decisionType} -> ${decision}`);
  } catch (error) {
    console.error("⚠️ Error logging decision:", error);
  }
}

// ─── Helper: send WhatsApp via Meta API ──────────────────────────────────────

async function trySendWhatsApp(
  supabase: any,
  phone: string,
  message: string,
  ctx?: { accountId?: string; candidateId?: string | null; jobId?: string | null },
): Promise<void> {
  const configured = await isMetaWhatsAppConfigured(supabase);
  if (!configured) {
    console.warn("📱 WhatsApp Meta API not configured or inactive, skipping");
    return;
  }
  const result = await sendWhatsAppViaMeta({
    supabase,
    toPhone: phone,
    message,
    accountId: ctx?.accountId,
    candidateId: ctx?.candidateId,
    jobId: ctx?.jobId,
  });
  if (!result.success) {
    console.error("📱 WhatsApp send failed:", result.error);
  } else {
    console.log("📱 WhatsApp sent via Meta API");
  }
}

/**
 * Tries to send WhatsApp using a configured workflow template.
 * Falls back to free-form text if no template is configured.
 */
async function trySendWhatsAppWorkflow(
  supabase: any,
  phone: string,
  fallbackMessage: string,
  scenario: 'cultural' | 'disc' | 'technical' | 'completion' | 'rejection',
  candidateName: string,
  jobTitle: string,
  ctx?: { accountId?: string; candidateId?: string | null; jobId?: string | null },
): Promise<{ sent: boolean; skipped: boolean; error?: string }> {
  const configured = await isMetaWhatsAppConfigured(supabase);
  if (!configured) {
    console.warn("📱 WhatsApp Meta API not configured or inactive, skipping");
    return { sent: false, skipped: true, error: "WhatsApp Meta API not configured or inactive" };
  }

  try {
    const templateConfig = await getWorkflowTemplateConfig(supabase);
    const tmpl = templateConfig[scenario];

    if (tmpl) {
      console.log(`📱 Sending WhatsApp ${scenario} via template: ${tmpl.name}`);
      const result = await sendWhatsAppTemplateMeta({
        supabase,
        toPhone: phone,
        templateName: tmpl.name,
        templateLanguage: tmpl.language,
        bodyParams: [candidateName, jobTitle],
        accountId: ctx?.accountId,
        candidateId: ctx?.candidateId,
        jobId: ctx?.jobId,
      });
      if (!result.success) {
        console.error(`📱 WhatsApp template ${scenario} failed:`, result.error, "— falling back to text");
        await trySendWhatsApp(supabase, phone, fallbackMessage, ctx);
      } else {
        console.log(`📱 WhatsApp template ${scenario} sent successfully`);
      }
    } else {
      console.log(`📱 No template configured for ${scenario}, using free-form text`);
      await trySendWhatsApp(supabase, phone, fallbackMessage, ctx);
    }
    return { sent: true, skipped: false };
  } catch (err) {
    console.error(`📱 WhatsApp ${scenario} error:`, err);
    return { sent: false, skipped: false, error: String(err) };
  }
}

// ─── Auto-shortlist (Autopilot) check ────────────────────────────────────────

async function checkAutopilotShortlist(jobId: string, supabase: any): Promise<void> {
  try {
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("id, title, account_id, cliente_id, autopilot_enabled, autopilot_min_candidates, autopilot_min_score, autopilot_triggered_at")
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return;
    if (!job.autopilot_enabled) { console.log("🤖 Autopilot disabled — skip"); return; }
    if (job.autopilot_triggered_at) { console.log("🤖 Autopilot already triggered — skip"); return; }
    if (!job.cliente_id) { console.log("🤖 No cliente_id — skip autopilot"); return; }

    const minCandidates = job.autopilot_min_candidates ?? 3;
    const minScore = Number(job.autopilot_min_score ?? 7.0);

    const { count } = await supabase
      .from("recruitment_applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("status", "shortlisted")
      .gte("score", minScore);

    console.log(`🤖 Autopilot: ${count || 0}/${minCandidates} (score>=${minScore})`);
    if ((count || 0) < minCandidates) return;

    // Idempotent claim
    const { data: claimed, error: claimErr } = await supabase
      .from("recruitment_jobs")
      .update({ autopilot_triggered_at: new Date().toISOString() })
      .eq("id", jobId)
      .is("autopilot_triggered_at", null)
      .select("id")
      .maybeSingle();
    if (claimErr || !claimed) { console.log("🤖 Autopilot trigger skipped (race/error)"); return; }

    console.log("🤖 Generating autopilot shortlist...");
    const { data: reportData, error: reportErr } = await supabase.functions.invoke(
      "generate-shortlist-report",
      { body: { jobId, job_id: jobId, accountId: job.account_id, autoTriggered: true } },
    );
    if (reportErr) {
      console.error("🤖 Shortlist report failed:", reportErr);
      await supabase.from("recruitment_jobs").update({ autopilot_triggered_at: null }).eq("id", jobId);
      return;
    }

    try {
      await supabase.functions.invoke("portal-activity-emit", {
        body: {
          cliente_id: job.cliente_id,
          job_id: jobId,
          account_id: job.account_id,
          event_type: "shortlist_ready",
          event_data: {
            job_title: job.title,
            shortlist_count: count,
            report_id: (reportData as any)?.id || null,
            report_token: (reportData as any)?.token_publico || null,
            auto_triggered: true,
          },
        },
      });
    } catch (e) {
      console.error("🤖 portal-activity-emit failed:", e);
    }

    try {
      const { data: cli } = await supabase
        .from("clientes_consultoria")
        .select("razao_social")
        .eq("id", job.cliente_id)
        .maybeSingle();
      await supabase.from("notifications").insert({
        account_id: job.account_id,
        title: "🤖 Autopilot: Shortlist gerada automaticamente",
        message: `Vaga: ${job.title} — ${cli?.razao_social ?? "Cliente"}\n${count} candidatos qualificados\nVer shortlist →`,
        type: "autopilot_shortlist",
        link: `/atracao-contratacao/recrutamento/jobs/${jobId}`,
        metadata: { job_id: jobId, count, auto_triggered: true },
      });
    } catch (e) {
      console.warn("⚠️ notifications insert (non-fatal):", e);
    }
  } catch (e) {
    console.error("❌ checkAutopilotShortlist error:", e);
  }
}

// ─── Portal activity: candidate advanced (only for client jobs) ─────────────

async function logPortalCandidateAdvance(
  supabase: any,
  jobId: string,
  accountId: string,
  candidateName: string,
  fromStage: string,
  toStage: string | null,
  score: number | null,
): Promise<void> {
  try {
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("cliente_id, title")
      .eq("id", jobId)
      .maybeSingle();
    if (!job?.cliente_id) return;

    await supabase.functions.invoke("portal-activity-emit", {
      body: {
        cliente_id: job.cliente_id,
        job_id: jobId,
        account_id: accountId,
        event_type: "candidate_advanced",
        event_data: {
          job_title: job.title,
          candidate_name: candidateName,
          from_stage: fromStage,
          to_stage: toStage,
          score,
        },
      },
    });
  } catch (e) {
    console.error("⚠️ logPortalCandidateAdvance failed (non-fatal):", e);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: OrchestratorRequest = await req.json();
    let { candidateId, jobId, accountId, completedStepType, sessionId, completedNaturally, attemptNumber } = body;

    console.log(`🎯 Orchestrator triggered: step=${completedStepType}, candidate=${candidateId}, job=${jobId}, completedNaturally=${completedNaturally}, attempt=${attemptNumber}`);

    if (!completedStepType || !jobId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: jobId, completedStepType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Resolve missing candidate_id via sessionId (cultural sessions often have it null) ───
    if (!candidateId && sessionId && completedStepType === "cultural") {
      console.log(`🔧 candidateId missing — resolving from cultural session ${sessionId}`);
      const { data: sess } = await supabase
        .from("culture_interview_sessions")
        .select("candidate_id, candidate_profile_id, account_id, job_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (sess) {
        accountId = accountId || sess.account_id;
        jobId = jobId || sess.job_id;
        if (sess.candidate_id) {
          candidateId = sess.candidate_id;
          console.log(`✅ Resolved candidateId from session.candidate_id: ${candidateId}`);
        } else if (sess.candidate_profile_id) {
          // candidate_profiles.user_id → profiles.email → recruitment_candidates.email
          const { data: cp } = await supabase
            .from("candidate_profiles")
            .select("user_id")
            .eq("id", sess.candidate_profile_id)
            .maybeSingle();
          if (cp?.user_id) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", cp.user_id)
              .maybeSingle();
            if (prof?.email) {
              const { data: rc } = await supabase
                .from("recruitment_candidates")
                .select("id")
                .eq("email", prof.email)
                .eq("account_id", sess.account_id)
                .maybeSingle();
              if (rc?.id) {
                candidateId = rc.id;
                console.log(`✅ Resolved candidateId via profile→email→recruitment_candidates: ${candidateId}`);
                // Backfill on session for future lookups
                await supabase
                  .from("culture_interview_sessions")
                  .update({ candidate_id: candidateId })
                  .eq("id", sessionId);
                console.log(`💾 Backfilled candidate_id on session ${sessionId}`);
              }
            }
          }
        }
      }
    }

    if (!candidateId || !jobId || !accountId || !completedStepType) {
      console.log(`⚠️ Cannot resolve required fields. candidateId=${candidateId}, jobId=${jobId}, accountId=${accountId}`);
      return new Response(
        JSON.stringify({ error: "Missing required fields: candidateId, jobId, accountId, completedStepType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Idempotency check (include attemptNumber so retries on the same day are not skipped)
    const actionHash = `orchestrator_${candidateId}_${jobId}_${completedStepType}_${attemptNumber || 1}_${new Date().toISOString().slice(0, 10)}`;

    const { data: existingLog } = await supabase
      .from("recruitment_communications_log")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .contains("metadata", { orchestrator_action_hash: actionHash })
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      console.log("⚠️ Already processed (idempotent skip):", actionHash);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get workflow steps
    const { data: workflowSteps, error: wfError } = await supabase
      .from("recruitment_job_workflow_steps")
      .select("*")
      .eq("job_id", jobId)
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (wfError) throw wfError;

    if (!workflowSteps || workflowSteps.length === 0) {
      console.log("ℹ️ No workflow configured for this job");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No workflow configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find current step
    const currentStep = workflowSteps.find((s: WorkflowStep) => s.step_type === completedStepType);
    if (!currentStep) {
      console.log(`ℹ️ Step type ${completedStepType} not in this job's workflow`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: `Step ${completedStepType} not in workflow` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get score
    let score: number | null = null;

    if (completedStepType === "screening") {
      // For screening, check screening results
      const { data: screeningResult } = await supabase
        .from("recruitment_screening_results")
        .select("passed")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      score = screeningResult?.passed ? 100 : 0;
    } else if (completedStepType === "cultural") {
      const { data: session } = await supabase
        .from("culture_interview_sessions")
        .select("matching_score")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      score = session?.matching_score ?? null;
    } else if (completedStepType === "disc") {
      // Try to find DISC session by candidate_id first
      let discSession = null;
      const { data: directSession } = await supabase
        .from("candidate_disc_sessions")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      discSession = directSession;

      // Fallback: search by candidate_profile_id if direct lookup failed
      if (!discSession) {
        console.log("🔍 DISC session not found by candidate_id, trying candidate_profile_id fallback...");
        const { data: candidateData } = await supabase
          .from("recruitment_candidates")
          .select("email")
          .eq("id", candidateId)
          .maybeSingle();
        if (candidateData?.email) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", candidateData.email)
            .maybeSingle();
          if (profileData?.id) {
            const { data: cpData } = await supabase
              .from("candidate_profiles")
              .select("id")
              .eq("user_id", profileData.id)
              .maybeSingle();
            if (cpData?.id) {
              const { data: fallbackSession } = await supabase
                .from("candidate_disc_sessions")
                .select("id")
                .eq("candidate_profile_id", cpData.id)
                .eq("job_id", jobId)
                .eq("status", "completed")
                .order("completed_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              discSession = fallbackSession;
              if (discSession) {
                console.log("✅ DISC session found via candidate_profile_id fallback");
              }
            }
          }
        }
      }

      if (discSession) {
        const { data: discResult } = await supabase
          .from("candidate_disc_results")
          .select("match_score, d_normalized, i_normalized, s_normalized, c_normalized")
          .eq("session_id", discSession.id)
          .maybeSingle();
        score = discResult?.match_score ?? null;

        // Use the pre-calculated match_score as single source of truth
        // This score was already calculated correctly by analyze-disc at submission time
        if (discResult && score == null) {
          // Fallback: if match_score is null (edge case), calculate simple average
          score = Math.round(
            (discResult.d_normalized + discResult.i_normalized +
             discResult.s_normalized + discResult.c_normalized) / 4
          );
          console.log(`📊 DISC fallback score (simple avg): ${score}%`);
          // Persist for future lookups
          await supabase
            .from("candidate_disc_results")
            .update({ match_score: score })
            .eq("session_id", discSession.id);
        } else if (score != null) {
          console.log(`📊 DISC using saved match_score: ${score}%`);
        }
      }
    } else if (completedStepType === "technical") {
      const { data: techSession } = await supabase
        .from("technical_interview_sessions")
        .select("overall_score")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      score = techSession?.overall_score ?? null;
    }

    console.log(`📊 Score for ${completedStepType}: ${score}`);

    if (score === null) {
      console.log("⚠️ No score found, cannot auto-advance");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No score available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Get threshold
    const thresholdConfig = currentStep.threshold_config || {};
    // Screening uses pass/fail (100/0), threshold is always 100
    const threshold = completedStepType === "screening" ? 100 : (thresholdConfig.min_score ?? thresholdConfig.min_match ?? 70);

    console.log(`🎚️ Threshold for ${completedStepType}: ${threshold}, Score: ${score}`);

    // 6. Get application (auto-create if missing — happens for public/portal flows
    //    where the application row was never inserted, e.g. when the watchdog
    //    finalizes an abandoned interview via reprocess-culture-evaluation).
    let { data: application } = await supabase
      .from("recruitment_applications")
      .select("id, status")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (!application) {
      const initialStatus = score >= threshold ? "applied" : "desqualificado";
      console.log(`🆕 No application row found — auto-creating with status='${initialStatus}' (score=${score}, threshold=${threshold})`);
      const { data: created, error: createErr } = await supabase
        .from("recruitment_applications")
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          status: initialStatus,
          update_source: "orchestrator_autocreate",
        })
        .select("id, status")
        .single();

      if (createErr || !created) {
        console.error("❌ Failed to auto-create application:", createErr);
        return new Response(
          JSON.stringify({ success: false, error: "Application not found and auto-create failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      application = created;
    }

    // 7. Determine next status from funnel
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("funnel_id, title")
      .eq("id", jobId)
      .maybeSingle();

    let nextStatus: string | null = null;
    let nextStageName: string | null = null;

    if (job?.funnel_id) {
      const { data: funnelStages } = await supabase
        .from("hiring_funnel_stages")
        .select("id, name, position, step_type")
        .eq("funnel_id", job.funnel_id)
        .order("position", { ascending: true });

      if (funnelStages && funnelStages.length > 0) {
        const currentStageIdx = funnelStages.findIndex((s: FunnelStage) => s.step_type === completedStepType);
        if (currentStageIdx >= 0 && currentStageIdx < funnelStages.length - 1) {
          const nextStage = funnelStages[currentStageIdx + 1];
          nextStatus = nextStage.id;
          nextStageName = nextStage.name;
        }
      }
    }

    if (!nextStatus) {
      const currentDefaultStatus = STEP_TO_DEFAULT_STATUS[completedStepType];
      nextStatus = NEXT_DEFAULT_STATUS[currentDefaultStatus] || null;
    }

    // 8. Get candidate/company info for messages
    const { data: candidate } = await supabase
      .from("recruitment_candidates")
      .select("first_name, last_name, email, phone, account_id")
      .eq("id", candidateId)
      .maybeSingle();

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", accountId)
      .maybeSingle();

    const candidateName = `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() || "Candidato";
    const companyName = company?.name || "Empresa";
    const jobTitle = job?.title || "Vaga";

    // Phone fallback: try candidate_profiles if recruitment_candidates.phone is null
    let candidatePhone = candidate?.phone || null;
    if (!candidatePhone && candidate?.email) {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", candidate.email)
          .maybeSingle();
        if (profileData?.id) {
          const { data: cpData } = await supabase
            .from("candidate_profiles")
            .select("phone")
            .eq("user_id", profileData.id)
            .maybeSingle();
          candidatePhone = cpData?.phone || null;
          if (candidatePhone) {
            console.log(`📱 Phone fallback: found ${candidatePhone} from candidate_profiles`);
          }
        }
      } catch (phoneFallbackErr) {
        console.error("⚠️ Phone fallback lookup error:", phoneFallbackErr);
      }
    }

    // ─── 9. Apply decision ─────────────────────────────────────────────────

    const decisionStartTime = Date.now();

    if (score >= threshold) {
      // ── APPROVED ──────────────────────────────────────────────────────────
      console.log(`✅ Candidate PASSED (${score} >= ${threshold})`);

      const nextWorkflowStep = workflowSteps.find(
        (s: WorkflowStep) => s.position > currentStep.position
      );
      const isLastStep = !nextWorkflowStep;

      await logDecision({
        supabase, accountId, candidateId, jobId,
        applicationId: application.id,
        decisionType: "advance",
        stepType: completedStepType,
        inputData: { score, threshold, session_id: sessionId, current_status: application.status },
        outputData: { next_status: nextStatus, next_stage_name: nextStageName, is_last_step: isLastStep },
        decision: "approved",
        score, threshold,
        justification: `Candidato atingiu score ${score}% (mínimo: ${threshold}%) na etapa ${completedStepType}`,
        startTime: decisionStartTime,
      });

      if (nextStatus) {
        await supabase
          .from("recruitment_applications")
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
            update_source: "orchestrator_advance",
          })
          .eq("id", application.id);

        try {
          await supabase.from("recruitment_activities").insert({
            application_id: application.id,
            candidate_id: candidateId,
            job_id: jobId,
            account_id: accountId,
            activity_type: "status_change",
            description: `Avançou automaticamente de ${completedStepType} para ${nextStageName || nextStatus} (score: ${score}%)`,
            metadata: { previous_status: application.status, new_status: nextStatus, score, threshold, step_type: completedStepType, automated: true },
          });
        } catch (activityError) {
          console.error("⚠️ Non-fatal: failed to log activity:", activityError);
        }

        // Portal activity log (Fase 4 — only fires for jobs with cliente_id)
        await logPortalCandidateAdvance(
          supabase, jobId, accountId, candidateName,
          completedStepType, nextStageName || nextStatus, score,
        );

        // Autopilot check — fires when a candidate reaches "shortlisted"
        if (nextStatus === "shortlisted" || nextStageName?.toLowerCase().includes("shortlist")) {
          await checkAutopilotShortlist(jobId, supabase);
        }
      }

      // Tracking event
      try {
        const { data: candidateData } = await supabase
          .from("recruitment_candidates")
          .select("first_touch_source, first_touch_medium, first_touch_campaign")
          .eq("id", candidateId)
          .maybeSingle();

        await supabase.from("candidate_tracking_events").insert([{
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          application_id: application.id,
          event_type: "qualified",
          source: candidateData?.first_touch_source || null,
          medium: candidateData?.first_touch_medium || null,
          campaign: candidateData?.first_touch_campaign || null,
          metadata: { from_step: completedStepType, to_status: nextStatus, score, threshold, automated: true },
        }]);
      } catch (trackingError) {
        console.error("⚠️ Error registering tracking event:", trackingError);
      }

      // Final evaluation notification
      const isFinalEvaluation = nextStatus === "evaluation" ||
        nextStageName?.toLowerCase().includes("avaliação final") ||
        nextStageName?.toLowerCase().includes("avaliacao final");
      if (isFinalEvaluation) {
        try {
          await supabase.functions.invoke("notify-final-evaluation", {
            body: { candidateId, candidateName, jobId, jobTitle, accountId, score, previousStep: completedStepType },
          });
        } catch (notifError) {
          console.error("⚠️ Error sending final evaluation notification:", notifError);
        }
      }

      if (isLastStep) {
        // ── WORKFLOW COMPLETE ──────────────────────────────────────────────
        console.log("🏁 All workflow steps completed! Sending completion notifications...");

        // Email
        if (candidate?.email) {
          try {
            const tmpl = completeEmailTemplate(candidateName, jobTitle);
            await sendEmailViaResend({ supabase, to: candidate.email, subject: tmpl.subject, html: tmpl.html, accountId, candidateId, jobId });
            console.log("📧 Completion email sent");
            await supabase.from("recruitment_communications_log").insert({
              candidate_id: candidateId, job_id: jobId, account_id: accountId,
              recipient: candidate.email,
              channel: "email", message_type: "workflow_complete", status: "sent",
              metadata: { step_type: completedStepType, score, threshold },
            });
          } catch (emailErr) {
            console.error("⚠️ Completion email error:", emailErr);
            await supabase.from("recruitment_communications_log").insert({
              candidate_id: candidateId, job_id: jobId, account_id: accountId,
              recipient: candidate.email,
              channel: "email", message_type: "workflow_complete", status: "failed",
              error_message: String(emailErr),
              metadata: { step_type: completedStepType, score, threshold },
            });
          }
        }

        // WhatsApp via Meta API (template or fallback)
        if (candidatePhone) {
          const waResult = await trySendWhatsAppWorkflow(supabase, candidatePhone, completeWhatsApp(candidateName, jobTitle), 'completion', candidateName, jobTitle, { accountId, candidateId, jobId });
          await supabase.from("recruitment_communications_log").insert({
            candidate_id: candidateId, job_id: jobId, account_id: accountId,
            recipient: candidatePhone,
            channel: "whatsapp", message_type: "workflow_complete",
            status: waResult.sent ? "sent" : (waResult.skipped ? "skipped" : "failed"),
            error_message: waResult.error || null,
            metadata: { step_type: completedStepType, score, threshold },
          });
        }
      } else if (nextWorkflowStep) {
        // ── ADVANCE TO NEXT STEP ───────────────────────────────────────────
        console.log(`➡️ Advancing to next step: ${nextWorkflowStep.step_type}`);

        const nextStepType = nextWorkflowStep.step_type;
        const nextAgentId = nextWorkflowStep.agent_id || null;

        // Step labels by type
        const nextStepLabels: Record<string, string> = {
          disc: "Realizar Avaliação DISC",
          technical: "Realizar Entrevista Técnica",
          cultural: "Realizar Entrevista Cultural",
        };
        const nextStepLabel = nextStepLabels[nextStepType] || "Continuar Processo";

        // 1. Invoke next step function with skip_notifications=true to get the sessionUrl
        let nextStepUrl: string | null = null;

        try {
          if (nextStepType === "disc") {
            const inviteResp = await supabase.functions.invoke("send-disc-invitation", {
              body: {
                candidateId,
                jobId,
                accountId,
                agentId: nextAgentId,
                skip_notifications: true,
              },
            });
            const inviteData = inviteResp.data;
            nextStepUrl = inviteData?.sessionUrl || null;
            console.log(`✉️ DISC session created, sessionUrl: ${nextStepUrl}`);
          } else if (nextStepType === "technical") {
            const inviteResp = await supabase.functions.invoke("send-technical-invitation", {
              body: {
                candidateId,
                jobId,
                accountId,
                candidateName,
                candidateEmail: candidate?.email,
                candidatePhone: candidatePhone,
                jobTitle,
                companyName,
                agentId: nextAgentId,
                skip_notifications: true,
              },
            });
            const inviteData = inviteResp.data;
            nextStepUrl = inviteData?.sessionUrl || null;
            console.log(`✉️ Technical session created, sessionUrl: ${nextStepUrl}`);
          } else if (nextStepType === "cultural") {
            const inviteResp = await supabase.functions.invoke("send-interview-invite", {
              body: {
                candidate_id: candidateId,
                job_id: jobId,
                agent_id: nextAgentId,
                skip_notifications: true,
              },
            });
            const inviteData = inviteResp.data;
            nextStepUrl = inviteData?.sessionUrl || null;
            console.log(`✉️ Cultural session created, sessionUrl: ${nextStepUrl}`);
          }
        } catch (inviteErr) {
          console.error(`⚠️ Error creating ${nextStepType} session:`, inviteErr);
        }

        // 2. Build the candidate stepper URL (preferred over token-based URLs)
        const baseUrl = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
        const candidateStepperUrl = `${baseUrl}/candidato/aplicar/${jobId}`;

        // 3. Send consolidated advance notification WITH the stepper link
        if (candidate?.email) {
          try {
            const tmpl = advanceEmailTemplate(candidateName, jobTitle, candidateStepperUrl, nextStepLabel);
            await sendEmailViaResend({ supabase, to: candidate.email, subject: tmpl.subject, html: tmpl.html, accountId, candidateId, jobId });
            console.log("📧 Advance email sent with stepper link:", candidateStepperUrl);
            await supabase.from("recruitment_communications_log").insert({
              candidate_id: candidateId, job_id: jobId, account_id: accountId,
              recipient: candidate.email,
              channel: "email", message_type: "workflow_advance", status: "sent",
              metadata: { from_step: completedStepType, to_step: nextStepType, score, threshold },
            });
          } catch (emailErr) {
            console.error("⚠️ Advance email error:", emailErr);
            await supabase.from("recruitment_communications_log").insert({
              candidate_id: candidateId, job_id: jobId, account_id: accountId,
              recipient: candidate.email,
              channel: "email", message_type: "workflow_advance", status: "failed",
              error_message: String(emailErr),
              metadata: { from_step: completedStepType, to_step: nextStepType, score, threshold },
            });
          }
        }

        if (candidatePhone) {
          const personalizedMsg = await generatePersonalizedAdvanceMessage(
            candidateName, jobTitle, completedStepType, nextStepLabel, candidateStepperUrl,
            supabase, accountId, candidateId,
          );
          // Use completedStepType (etapa que o candidato ACABOU de passar) para escolher o template,
          // já que os templates Meta aprovados são redigidos como "Aprovação na etapa de Fit X".
          const waResult = await trySendWhatsAppWorkflow(supabase, candidatePhone, personalizedMsg, completedStepType as 'cultural' | 'disc' | 'technical', candidateName, jobTitle, { accountId, candidateId, jobId });
          await supabase.from("recruitment_communications_log").insert({
            candidate_id: candidateId, job_id: jobId, account_id: accountId,
            recipient: candidatePhone,
            channel: "whatsapp", message_type: "workflow_advance",
            status: waResult.sent ? "sent" : (waResult.skipped ? "skipped" : "failed"),
            error_message: waResult.error || null,
            metadata: { from_step: completedStepType, to_step: nextStepType, score, threshold },
          });
        }
      }

      // Log action
      await supabase.from("recruitment_communications_log").insert({
        candidate_id: candidateId,
        job_id: jobId,
        account_id: accountId,
        recipient: candidateId,
        channel: "system",
        message_type: "auto_advance",
        status: "sent",
        metadata: {
          orchestrator_action_hash: actionHash,
          from_step: completedStepType,
          to_status: nextStatus,
          score,
          threshold,
          is_last_step: !workflowSteps.find((s: WorkflowStep) => s.position > currentStep.position),
        },
      });

      return new Response(
        JSON.stringify({ success: true, action: !workflowSteps.find((s: WorkflowStep) => s.position > currentStep.position) ? "completed" : "advanced", from: completedStepType, to: nextStatus, score, threshold }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // ── REJECTED ──────────────────────────────────────────────────────────
      console.log(`❌ Candidate FAILED (${score} < ${threshold})`);

      // ── AUTO-RETRY LOGIC ──────────────────────────────────────────────────
      // Determine if candidate gets automatic retry rights
      const currentAttempt = attemptNumber || 1;
      const isAbortedSession = completedNaturally === false;
      const isLegitimateCompletion = completedNaturally === true;

      let canRetry = false;
      let retryReason = "";

      if (isAbortedSession) {
        // Aborted session (AI didn't say farewell) → unlimited retries
        canRetry = true;
        retryReason = "aborted_session";
        console.log(`🔄 Aborted session detected (completedNaturally=false). Candidate can retry (unlimited).`);
      } else if (isLegitimateCompletion && currentAttempt <= 1) {
        // Legitimate completion, 1st attempt → grant 1 more retry
        canRetry = true;
        retryReason = "first_attempt_retry";
        console.log(`🔄 First legitimate attempt. Candidate gets 1 more retry (attempt ${currentAttempt}).`);
      } else {
        // 2nd+ legitimate attempt or unknown → final disqualification
        canRetry = false;
        retryReason = "max_attempts_reached";
        console.log(`🚫 Final disqualification. Attempt ${currentAttempt}, completedNaturally=${completedNaturally}.`);
      }

      await logDecision({
        supabase, accountId, candidateId, jobId,
        applicationId: application.id,
        decisionType: "reject",
        stepType: completedStepType,
        inputData: { score, threshold, session_id: sessionId, current_status: application.status, completed_naturally: completedNaturally, attempt_number: currentAttempt },
        outputData: { new_status: "desqualificado", rejection_reason: "threshold_not_met", can_retry: canRetry, retry_reason: retryReason },
        decision: "rejected",
        score, threshold,
        justification: `Candidato não atingiu score mínimo: ${score}% < ${threshold}% na etapa ${completedStepType}. Retry: ${canRetry ? 'sim' : 'não'} (${retryReason})`,
        startTime: decisionStartTime,
      });

      // ALWAYS mark as desqualificado (candidate appears as disqualified in dashboards)
      await supabase
        .from("recruitment_applications")
        .update({
          status: "desqualificado",
          updated_at: new Date().toISOString(),
          update_source: "orchestrator_reject",
        })
        .eq("id", application.id);

      try {
        await supabase.from("recruitment_activities").insert({
          application_id: application.id,
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          activity_type: "status_change",
          description: canRetry
            ? `Reprovado em ${completedStepType} (score: ${score}%, mínimo: ${threshold}%) — retry disponível (${retryReason})`
            : `Reprovado automaticamente em ${completedStepType} (score: ${score}%, mínimo: ${threshold}%) — desqualificação definitiva`,
          metadata: { previous_status: application.status, new_status: "desqualificado", score, threshold, step_type: completedStepType, automated: true, rejection_reason: "threshold_not_met", can_retry: canRetry, retry_reason: retryReason, attempt_number: currentAttempt },
        });
      } catch (activityError) {
        console.error("⚠️ Non-fatal: failed to log rejection activity:", activityError);
      }

      // Tracking event
      try {
        const { data: candidateDataRej } = await supabase
          .from("recruitment_candidates")
          .select("first_touch_source, first_touch_medium, first_touch_campaign")
          .eq("id", candidateId)
          .maybeSingle();

        await supabase.from("candidate_tracking_events").insert([{
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          application_id: application.id,
          event_type: "rejected",
          source: candidateDataRej?.first_touch_source || null,
          medium: candidateDataRej?.first_touch_medium || null,
          campaign: candidateDataRej?.first_touch_campaign || null,
          metadata: { step_type: completedStepType, score, threshold, rejection_reason: "threshold_not_met", automated: true },
        }]);
      } catch (trackingError) {
        console.error("⚠️ Error registering tracking event:", trackingError);
      }

      // Rejection email (fixed template)
      if (candidate?.email) {
        try {
          const tmpl = rejectEmailTemplate(candidateName, jobTitle);
          await sendEmailViaResend({ supabase, to: candidate.email, subject: tmpl.subject, html: tmpl.html, accountId, candidateId, jobId });
          console.log("📧 Rejection email sent");
           await supabase.from("recruitment_communications_log").insert({
            candidate_id: candidateId, job_id: jobId, account_id: accountId,
            recipient: candidate.email,
            channel: "email", message_type: "workflow_reject", status: "sent",
            metadata: { step_type: completedStepType, score, threshold },
          });
        } catch (emailErr) {
          console.error("⚠️ Rejection email error:", emailErr);
          await supabase.from("recruitment_communications_log").insert({
            candidate_id: candidateId, job_id: jobId, account_id: accountId,
            recipient: candidate.email,
            channel: "email", message_type: "workflow_reject", status: "failed",
            error_message: String(emailErr),
            metadata: { step_type: completedStepType, score, threshold },
          });
        }
      }

      // Rejection WhatsApp with AI-generated feedback
      if (candidatePhone) {
        try {
          await supabase.functions.invoke("send-rejection-whatsapp", {
            body: { candidateId, candidateName, candidatePhone, jobId, jobTitle, accountId, companyName, stepType: completedStepType, score, threshold, sessionId },
          });
          console.log("📱 Rejection WhatsApp sent with AI feedback");
          await supabase.from("recruitment_communications_log").insert({
            candidate_id: candidateId, job_id: jobId, account_id: accountId,
            recipient: candidatePhone,
            channel: "whatsapp", message_type: "workflow_reject", status: "sent",
            metadata: { step_type: completedStepType, score, threshold },
          });
        } catch (whatsappError) {
          console.error("⚠️ Error sending rejection WhatsApp:", whatsappError);
          await supabase.from("recruitment_communications_log").insert({
            candidate_id: candidateId, job_id: jobId, account_id: accountId,
            recipient: candidatePhone,
            channel: "whatsapp", message_type: "workflow_reject", status: "failed",
            error_message: String(whatsappError),
            metadata: { step_type: completedStepType },
          });
        }
      }

      // Log action
      await supabase.from("recruitment_communications_log").insert({
        candidate_id: candidateId,
        job_id: jobId,
        account_id: accountId,
        recipient: candidateId,
        channel: "system",
        message_type: "auto_reject",
        status: "sent",
        metadata: { orchestrator_action_hash: actionHash, step_type: completedStepType, score, threshold, rejection_reason: "threshold_not_met" },
      });

      // Trigger cross-match: rejected candidate may fit other open jobs (fire-and-forget)
      try {
        supabase.functions.invoke("crossmatch-executar", {
          body: { trigger: "candidate_rejected", candidato_id: candidateId, account_id: accountId },
        }).then(({ error: cmErr }) => {
          if (cmErr) console.error("⚠️ crossmatch-executar error:", cmErr);
          else console.log("🔁 crossmatch-executar triggered for rejected candidate");
        });
      } catch (cmCatch) {
        console.error("⚠️ crossmatch invoke threw:", cmCatch);
      }

      // Trigger NPS survey for exited candidate (fire-and-forget)
      try {
        supabase.functions.invoke("nps-send", {
          body: {
            candidate_id: candidateId,
            job_id: jobId,
            account_id: accountId,
            trigger: "exit",
            exit_stage: completedStepType,
          },
        }).then(({ error: npsErr }) => {
          if (npsErr) console.error("⚠️ nps-send error:", npsErr);
          else console.log("📋 nps-send triggered for rejected candidate");
        });
      } catch (npsCatch) {
        console.error("⚠️ nps-send invoke threw:", npsCatch);
      }

      return new Response(
        JSON.stringify({ success: true, action: "rejected", step: completedStepType, score, threshold }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("❌ Orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
