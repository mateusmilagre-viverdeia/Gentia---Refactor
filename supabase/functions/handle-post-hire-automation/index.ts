import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateRequest, forbiddenResponse, verifyAccountAccess } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function optionalUuid(value: unknown) {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function requiredUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new Error(`invalid_${field}`);
  return value;
}

function asDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date().toISOString().slice(0, 10);
  return value;
}

async function ensureNotification(admin: any, input: {
  accountId: string;
  userId: string;
  jobId: string;
  candidateId: string;
  title: string;
  message: string;
  type: string;
  dedupeKey: string;
}) {
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("dedupe_key", input.dedupeKey)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data } = await admin
    .from("notifications")
    .insert({
      account_id: input.accountId,
      org_id: input.accountId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: "medium",
      entity_type: "recruitment_job",
      entity_id: input.jobId,
      target_url: `/atracao-contratacao/recrutamento/jobs/${input.jobId}`,
      dedupe_key: input.dedupeKey,
    })
    .select("id")
    .maybeSingle();

  return data?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await authenticateRequest(req);
  if (!auth.success || !auth.context) return json({ error: auth.error || "unauthorized" }, auth.status || 401);

  try {
    const admin = auth.context.supabase;
    const userId = auth.context.user.id;
    const body = await req.json().catch(() => ({}));

    const applicationId = requiredUuid(body.applicationId, "application_id");
    const candidateIdFromBody = optionalUuid(body.candidateId);
    const jobIdFromBody = optionalUuid(body.jobId);
    const onboardingProcessId = optionalUuid(body.onboardingProcessId);
    const hiredAt = asDate(body.hiredAt || body.dataContratacao);
    const salary = typeof body.salary === "number" ? body.salary : Number(body.salary || body.salarioContratado || 0);
    const feeValue = typeof body.feeValue === "number" ? body.feeValue : Number(body.feeValue || body.valorFee || 0);
    const feeDueDate = typeof body.feeDueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.feeDueDate) ? body.feeDueDate : null;
    const feeNotes = typeof body.feeNotes === "string" ? body.feeNotes.slice(0, 1000) : null;

    const { data: application, error: appError } = await admin
      .from("recruitment_applications")
      .select("id, account_id, candidate_id, job_id, status, source, medium, campaign")
      .eq("id", applicationId)
      .maybeSingle();
    if (appError) throw appError;
    if (!application) return json({ error: "application_not_found" }, 404);

    const accountId = application.account_id;
    const candidateId = candidateIdFromBody || application.candidate_id;
    const jobId = jobIdFromBody || application.job_id;
    if (!candidateId || !jobId) return json({ error: "application_missing_candidate_or_job" }, 422);

    const hasAccess = await verifyAccountAccess(admin, userId, accountId);
    if (!hasAccess) return forbiddenResponse(corsHeaders);

    const [{ data: job, error: jobError }, { data: candidate }] = await Promise.all([
      admin
        .from("recruitment_jobs")
        .select("id, account_id, title, cliente_id, status, data_contratacao, salario_contratado, roi_report_scheduled_at, fee_acordado, prazo_entrega_dias, clientes_consultoria:cliente_id(prazo_garantia_dias, fee_fixo, fee_percentual, modelo_fee)")
        .eq("id", jobId)
        .maybeSingle(),
      admin
        .from("recruitment_candidates")
        .select("id, account_id, first_name, last_name, stage, first_touch_source, first_touch_medium, first_touch_campaign")
        .eq("id", candidateId)
        .maybeSingle(),
    ]);
    if (jobError) throw jobError;
    if (!job || job.account_id !== accountId) return json({ error: "job_not_found" }, 404);
    if (!candidate || candidate.account_id !== accountId) return json({ error: "candidate_not_found" }, 404);

    const wasAlreadyHired = application.status === "hired" && candidate.stage === "hired" && job.status === "filled";
    const roiScheduledAt = job.roi_report_scheduled_at || new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Sequential updates with explicit verification — avoid silent Promise.all swallowing.
    const appUpdate = await admin
      .from("recruitment_applications")
      .update({ status: "hired", updated_at: new Date().toISOString() })
      .eq("id", applicationId)
      .select("id, status");
    if (appUpdate.error) {
      console.error("Failed to update application status:", appUpdate.error);
      throw new Error(`application_update_failed: ${appUpdate.error.message}`);
    }
    if (!appUpdate.data || appUpdate.data.length === 0) {
      console.error("Application UPDATE matched 0 rows for id:", applicationId);
      throw new Error("application_update_no_rows");
    }
    console.log("Application updated to hired:", applicationId, appUpdate.data);

    const candUpdate = await admin
      .from("recruitment_candidates")
      .update({ stage: "hired", updated_at: new Date().toISOString() })
      .eq("id", candidateId)
      .select("id, stage");
    if (candUpdate.error) {
      console.error("Failed to update candidate stage:", candUpdate.error);
      throw new Error(`candidate_update_failed: ${candUpdate.error.message}`);
    }
    console.log("Candidate updated to hired:", candidateId);

    const jobUpdate = await admin
      .from("recruitment_jobs")
      .update({
        status: "filled",
        data_contratacao: job.data_contratacao || hiredAt,
        salario_contratado: job.salario_contratado ?? (Number.isFinite(salary) && salary > 0 ? salary : null),
        roi_report_scheduled_at: job.roi_report_scheduled_at || (job.cliente_id ? roiScheduledAt : null),
      })
      .eq("id", jobId)
      .select("id, status");
    if (jobUpdate.error) {
      console.error("Failed to update job status:", jobUpdate.error);
      throw new Error(`job_update_failed: ${jobUpdate.error.message}`);
    }
    console.log("Job updated to filled:", jobId);

    const source = application.source || candidate.first_touch_source || null;
    const medium = application.medium || candidate.first_touch_medium || null;
    const campaign = application.campaign || candidate.first_touch_campaign || null;

    const [{ data: existingEvent }, { data: existingActivity }] = await Promise.all([
      admin.from("candidate_tracking_events").select("id").eq("application_id", applicationId).eq("event_type", "hired").maybeSingle(),
      admin.from("recruitment_activities").select("id").eq("application_id", applicationId).eq("activity_type", "post_hire_automation").maybeSingle(),
    ]);

    if (!existingEvent) {
      await admin.from("candidate_tracking_events").insert({
        account_id: accountId,
        candidate_id: candidateId,
        application_id: applicationId,
        job_id: jobId,
        event_type: "hired",
        source,
        medium,
        campaign,
        metadata: { triggered_by: "post_hire_automation", hired_at: hiredAt },
      });
    }

    if (!existingActivity) {
      await admin.from("recruitment_activities").insert({
        account_id: accountId,
        candidate_id: candidateId,
        application_id: applicationId,
        job_id: jobId,
        activity_type: "post_hire_automation",
        description: `Contratação registrada e automações pós-contratação iniciadas para ${job.title}`,
        metadata: { hired_at: hiredAt, was_already_hired: wasAlreadyHired },
        performed_by: userId,
      });
    }

    if (job.cliente_id && Number.isFinite(feeValue) && feeValue > 0) {
      const { data: existingFee } = await admin.from("fees_historico").select("id").eq("account_id", accountId).eq("vaga_id", jobId).maybeSingle();
      if (!existingFee) {
        await admin.from("fees_historico").insert({
          account_id: accountId,
          vaga_id: jobId,
          cliente_id: job.cliente_id,
          valor_fee: feeValue,
          status: "a_receber",
          data_previsao: feeDueDate,
          observacoes: feeNotes,
        });
      }
    }

    const clientConfig = Array.isArray(job.clientes_consultoria)
      ? job.clientes_consultoria[0]
      : job.clientes_consultoria;
    const warrantyDays = Number(clientConfig?.prazo_garantia_dias || 0);
    if (job.cliente_id && warrantyDays > 0) {
      const { data: existingWarranty } = await admin
        .from("garantias_reposicao")
        .select("id")
        .eq("account_id", accountId)
        .eq("vaga_original_id", jobId)
        .eq("candidato_id", candidateId)
        .maybeSingle();
      if (!existingWarranty) {
        const expires = new Date(`${hiredAt}T00:00:00.000Z`);
        expires.setUTCDate(expires.getUTCDate() + warrantyDays);
        await admin.from("garantias_reposicao").insert({
          account_id: accountId,
          vaga_original_id: jobId,
          candidato_id: candidateId,
          cliente_id: job.cliente_id,
          data_contratacao: hiredAt,
          prazo_garantia_dias: warrantyDays,
          garantia_expira_em: expires.toISOString().slice(0, 10),
          status: "ativa",
        });
      }
    }

    const { data: existingNps } = await admin.from("candidate_nps").select("id").eq("application_id", applicationId).eq("trigger", "hired").maybeSingle();
    if (!existingNps) {
      await admin.from("candidate_nps").insert({
        account_id: accountId,
        candidate_id: candidateId,
        job_id: jobId,
        application_id: applicationId,
        trigger: "hired",
        send_status: "pending",
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const { data: checklist, error: checklistError } = await admin
      .from("post_hire_checklists")
      .upsert({
        account_id: accountId,
        application_id: applicationId,
        candidate_id: candidateId,
        job_id: jobId,
        cliente_id: job.cliente_id,
        onboarding_process_id: onboardingProcessId,
        hired_at: hiredAt,
        status: "active",
        owner_user_id: userId,
        metadata: { salary: Number.isFinite(salary) && salary > 0 ? salary : null, roi_scheduled_at: job.cliente_id ? roiScheduledAt : null },
      }, { onConflict: "application_id" })
      .select("id")
      .single();
    if (checklistError) throw checklistError;

    const now = Date.now();
    const items = [
      ["confirm_hire", "Confirmar contratação", "Validar contratação, data de início e condições combinadas.", "agency", 0],
      ["register_fee", "Registrar fee", "Confirmar fee e previsão de recebimento.", "agency", 1],
      ["activate_warranty", "Ativar garantia", "Acompanhar prazo de garantia de reposição.", "agency", 1],
      ["onboarding", "Iniciar onboarding", "Criar ou acompanhar onboarding do contratado.", "agency", 3],
      ["candidate_nps", "Agendar NPS do candidato", "Enviar avaliação de experiência pós-contratação.", "agency", 7],
      ["roi_report", "Gerar relatório ROI", "Gerar relatório executivo do processo encerrado.", "agency", 1],
      ["client_feedback", "Solicitar feedback do cliente", "Coletar percepção do cliente sobre o processo e contratado.", "employer", 30],
      ["followup_30", "Acompanhamento 30 dias", "Registrar sinais de adaptação e performance inicial.", "employer", 30],
      ["followup_60", "Acompanhamento 60 dias", "Registrar evolução, riscos e necessidades de suporte.", "employer", 60],
      ["followup_90", "Acompanhamento 90 dias", "Consolidar resultado percebido da contratação.", "employer", 90],
    ];

    await admin.from("post_hire_checklist_items").upsert(items.map(([item_key, title, description, responsible_type, days]) => ({
      checklist_id: checklist.id,
      account_id: accountId,
      item_key,
      title,
      description,
      responsible_type,
      status: item_key === "confirm_hire" ? "completed" : "pending",
      completed_at: item_key === "confirm_hire" ? new Date().toISOString() : null,
      completed_by: item_key === "confirm_hire" ? userId : null,
      due_at: new Date(now + Number(days) * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {},
    })), { onConflict: "checklist_id,item_key" });

    // Only notify administrative roles (owner / admin / admin_rh) — not all members.
    const { data: members } = await admin
      .from("account_members")
      .select("user_id, role")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .in("role", ["owner", "admin", "admin_rh"])
      .limit(50);
    await Promise.all((members || []).map((member: any) => ensureNotification(admin, {
      accountId,
      userId: member.user_id,
      jobId,
      candidateId,
      type: "post_hire_automation",
      title: "Candidato contratado",
      message: `Fluxo pós-contratação iniciado para ${job.title}.`,
      dedupeKey: `post-hire:${applicationId}:${member.user_id}`,
    })));

    return json({
      success: true,
      application_id: applicationId,
      job_id: jobId,
      candidate_id: candidateId,
      checklist_id: checklist.id,
      roi_report_scheduled_at: job.cliente_id ? roiScheduledAt : null,
      already_hired: wasAlreadyHired,
    });
  } catch (error) {
    console.error("handle-post-hire-automation error:", error);
    return json({ error: error instanceof Error ? error.message : "internal_error" }, 500);
  }
});