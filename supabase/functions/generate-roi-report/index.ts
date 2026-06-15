import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = "direct" || "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function assertUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function fullName(person?: { first_name?: string | null; last_name?: string | null } | null, fallback = "Não informado") {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || fallback;
}

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function normalizePct(value: number) {
  return Number(Math.max(0, Math.min(100, value)).toFixed(1));
}

async function callAI(messages: any[], tools?: any[], toolChoice?: any) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const body: any = { model: "google/gemini-2.5-pro", messages };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const res = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI Gateway: ${res.status} ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const body = await req.json().catch(() => ({}));
    const job_id = assertUuid(body.job_id, "job_id");
    const account_id = assertUuid(body.account_id, "account_id");
    const generated_by = body.generated_by ? assertUuid(body.generated_by, "generated_by") : null;

    const isServiceCall = token === SERVICE_ROLE_KEY;
    if (!isServiceCall) {
      const { data: { user }, error: userError } = await admin.auth.getUser(token);
      if (userError || !user) return json({ error: "unauthorized" }, 401);
      if (generated_by && generated_by !== user.id) return json({ error: "generated_by_mismatch" }, 403);

      const { data: membership } = await admin
        .from("account_members")
        .select("id")
        .eq("account_id", account_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership) return json({ error: "forbidden" }, 403);
    }

    const [jobRes, appsRes, npsRes, consultancyRes] = await Promise.all([
      admin.from("recruitment_jobs").select("*").eq("id", job_id).maybeSingle(),
      admin
        .from("recruitment_applications")
        .select("id, status, score, applied_at, updated_at, candidate_id, assigned_to, source")
        .eq("job_id", job_id),
      admin.from("candidate_nps").select("score, answered_at, sent_at").eq("job_id", job_id),
      admin.from("consultancy_portal_settings").select("consultancy_name, logo_url").eq("account_id", account_id).maybeSingle(),
    ]);

    if (jobRes.error) throw jobRes.error;
    if (appsRes.error) throw appsRes.error;
    if (npsRes.error) throw npsRes.error;
    const job = jobRes.data;
    if (!job) return json({ error: "job_not_found" }, 404);
    if (job.account_id !== account_id) return json({ error: "job_account_mismatch" }, 403);

    const [clientRes, { data: account }, feeRes] = await Promise.all([
      job.cliente_id
        ? admin
            .from("clientes_consultoria")
            .select("id, account_id, razao_social, nome_fantasia, logo_url, site, responsavel_interno, fee_fixo, fee_percentual")
            .eq("id", job.cliente_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      admin.from("companies").select("id, name, website, logo_url").eq("id", account_id).maybeSingle(),
      admin
        .from("fees_historico")
        .select("valor_fee, status")
        .eq("vaga_id", job_id)
        .eq("account_id", account_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Fallback: if job has no consultancy client, treat the account's company as the client (internal job)
    const client = clientRes.data ?? {
      id: null as string | null,
      account_id,
      razao_social: account?.name || "Empresa",
      nome_fantasia: account?.name || "Empresa",
      logo_url: (account as any)?.logo_url || null,
      site: account?.website || null,
      responsavel_interno: null,
      fee_fixo: 0,
      fee_percentual: 0,
    };
    if (clientRes.data && client.account_id !== account_id) return json({ error: "client_account_mismatch" }, 403);
    if (feeRes.error) throw feeRes.error;

    const apps = appsRes.data || [];
    const npsRows = npsRes.data || [];
    const npsScores = npsRows.map((n: any) => Number(n.score)).filter((s) => Number.isFinite(s));
    const answeredNps = npsRows.filter((n: any) => n.answered_at || n.score !== null).length;
    const sentNps = Math.max(npsRows.filter((n: any) => n.sent_at || n.answered_at || n.score !== null).length, npsRows.length);
    const responseRate = sentNps > 0 ? normalizePct((answeredNps / sentNps) * 100) : 0;

    const statusCounts = apps.reduce((acc: Record<string, number>, app: any) => {
      const status = app.status || "applied";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const total_evaluated = apps.length;
    const shortlistApps = apps.filter((a: any) => ["shortlisted", "approved", "hired"].includes(a.status));
    const shortlistScores = shortlistApps.map((a: any) => Number(a.score)).filter((s) => Number.isFinite(s) && s > 0);
    const shortlist_score_avg = shortlistScores.length ? shortlistScores.reduce((a, b) => a + b, 0) / shortlistScores.length : 0;
    const nps_avg = npsScores.length ? npsScores.reduce((a, b) => a + b, 0) / npsScores.length : 0;

    const startDate = new Date(job.data_abertura_cliente || job.created_at || new Date().toISOString());
    const endDate = new Date(job.data_contratacao || new Date().toISOString());
    const total_days = daysBetween(startDate, endDate);

    const hiredApp = apps.find((a: any) => a.status === "hired") || null;
    const assignedUserId = hiredApp?.assigned_to || apps.find((a: any) => a.assigned_to)?.assigned_to || generated_by;
    const [candidateRes, recruiterRes] = await Promise.all([
      hiredApp?.candidate_id
        ? admin
            .from("recruitment_candidates")
            .select("first_name, last_name, linkedin_url, avatar_url, source, email")
            .eq("id", hiredApp.candidate_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      assignedUserId
        ? admin.from("profiles").select("first_name, last_name, email").eq("id", assignedUserId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (candidateRes.error) throw candidateRes.error;
    if (recruiterRes.error) console.error("Recruiter profile lookup failed:", recruiterRes.error);

    const candidate = candidateRes.data;
    const hired_candidate = candidate
      ? {
          name: fullName(candidate, "Candidato contratado"),
          avatar_url: candidate.avatar_url || null,
          current_role: candidate.linkedin_url ? "Perfil LinkedIn disponível" : "Cargo não informado",
          current_company: candidate.source ? `Origem: ${candidate.source}` : "Não informado",
          composite_score: Number(hiredApp?.score) || 0,
          strengths: ["Aderência ao perfil", "Avanço até etapa final", "Pontuação composta consistente"],
          start_date: job.data_contratacao || null,
          linkedin_url: candidate.linkedin_url || null,
        }
      : null;

    const funnel = [
      { stage: "Avaliados", count: total_evaluated, conversion_rate: 1 },
      { stage: "Triagem", count: statusCounts.screening || statusCounts.interview || 0, conversion_rate: 0 },
      { stage: "Entrevista cultural", count: statusCounts.cultural || 0, conversion_rate: 0 },
      { stage: "DISC", count: statusCounts.disc || 0, conversion_rate: 0 },
      { stage: "Técnica", count: statusCounts.technical || statusCounts.evaluation || 0, conversion_rate: 0 },
      { stage: "Shortlist", count: shortlistApps.length, conversion_rate: 0 },
      { stage: "Contratado", count: hiredApp ? 1 : 0, conversion_rate: 0 },
    ].filter((f) => f.count > 0 || ["Avaliados", "Shortlist"].includes(f.stage));

    for (let i = 1; i < funnel.length; i++) {
      const prev = funnel[i - 1].count;
      funnel[i].conversion_rate = prev > 0 ? funnel[i].count / prev : 0;
    }

    const clientName = client.nome_fantasia || client.razao_social;
    const consultancyName = consultancyRes.data?.consultancy_name || account?.name || "Consultoria";
    const recruiterName = fullName(recruiterRes.data, client.responsavel_interno || "Não informado");
    const feeValue = Number(feeRes.data?.valor_fee ?? job.fee_acordado ?? client.fee_fixo ?? 0);

    const dataContext = `
- Vaga: ${job.title}
- Empresa cliente: ${clientName}
- Consultoria: ${consultancyName}
- Responsável: ${recruiterName}
- Período: ${startDate.toISOString().slice(0, 10)} a ${endDate.toISOString().slice(0, 10)}
- Total avaliados: ${total_evaluated}
- Shortlist: ${shortlistApps.length} candidatos
- Score médio shortlist: ${shortlist_score_avg.toFixed(1)}
- NPS médio: ${nps_avg ? nps_avg.toFixed(1) : "n/a"}
- Taxa de resposta NPS: ${responseRate || "n/a"}%
- Tempo total: ${total_days} dias
- Fee: ${feeValue || "n/a"}
${hired_candidate ? `- Contratado: ${hired_candidate.name} (${hired_candidate.current_role})` : "- Status: em andamento"}
`;

    let executive_summary = `Processo seletivo para ${job.title} conduzido para ${clientName}. Foram avaliados ${total_evaluated} candidatos ao longo de ${total_days} dias, com ${shortlistApps.length} candidatos em shortlist${hired_candidate ? ` e contratação de ${hired_candidate.name}` : ""}.`;
    let insights: any[] = [
      { titulo: "Volume de candidatos", descricao: `${total_evaluated} candidatos avaliados no processo.` },
      { titulo: "Eficiência", descricao: `Processo conduzido em ${total_days} dias.` },
      { titulo: "Qualidade", descricao: `Score médio da shortlist: ${shortlist_score_avg.toFixed(1)}.` },
    ];

    try {
      const summaryRes = await callAI([
        { role: "system", content: "Você é um consultor de recrutamento experiente. Escreva profissional, consultivo, orientado a resultados, sem jargões de RH." },
        { role: "user", content: `Com base nos dados abaixo, escreva um resumo executivo de 3 parágrafos para um relatório de processo seletivo. Sem títulos. Sem bullets.\n\n${dataContext}` },
      ]);
      executive_summary = summaryRes.choices?.[0]?.message?.content || executive_summary;
    } catch (e) {
      console.error("Summary AI error:", e);
    }

    try {
      const insightsRes = await callAI(
        [
          { role: "system", content: "Você é um consultor de recrutamento. Gere insights relevantes para o cliente." },
          { role: "user", content: `Com base nos dados, gere 3 insights relevantes (qualidade dos candidatos, eficiência, aprendizados):\n\n${dataContext}` },
        ],
        [{ type: "function", function: { name: "return_insights", description: "Return 3 process insights", parameters: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { titulo: { type: "string" }, descricao: { type: "string" } }, required: ["titulo", "descricao"] } } }, required: ["insights"] } } }],
        { type: "function", function: { name: "return_insights" } },
      );
      const args = insightsRes.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (args) insights = JSON.parse(args).insights || insights;
    } catch (e) {
      console.error("Insights AI error:", e);
    }

    const report_data = {
      meta: {
        job_title: job.title,
        client_name: clientName,
        client_logo_url: client.logo_url || null,
        client_site: client.site || null,
        consultancy_name: consultancyName,
        consultancy_logo_url: consultancyRes.data?.logo_url || null,
        consultancy_site: account?.website || null,
        consultancy_whatsapp: null,
        recruiter_name: recruiterName,
        generated_at: new Date().toISOString(),
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
      },
      executive_summary,
      kpis: {
        total_evaluated,
        total_days,
        shortlist_score_avg: Number(shortlist_score_avg.toFixed(1)),
        nps_avg: Number(nps_avg.toFixed(1)),
        response_rate: responseRate,
      },
      funnel,
      hired_candidate,
      insights,
      fee: feeValue > 0 ? { value: feeValue, status: feeRes.data?.status || (job.fee_acordado ? "acordado" : "previsto") } : null,
    };

    const { data: creditResult, error: creditErr } = await admin.rpc("consume_credits", {
      p_account_id: account_id,
      p_credit_type: "universal",
      p_amount: 3,
      p_reference_id: job_id,
      p_reference_type: "roi_report",
      p_description: `Relatório de ROI gerado para ${job.title}`,
      p_user_id: generated_by,
    });
    if (creditErr) throw creditErr;
    if (creditResult && creditResult.success === false) return json(creditResult, 402);

    const { data: report, error: insertErr } = await admin
      .from("process_roi_reports")
      .insert({ account_id, job_id, client_id: client.id ?? null, report_data, generated_by })
      .select()
      .single();
    if (insertErr) throw insertErr;

    const reportUrl = `/report/${report.public_token}`;
    if (generated_by) {
      const { error: notificationError } = await admin.from("notifications").insert({
        account_id,
        user_id: generated_by,
        type: "roi_report_generated",
        title: "📊 Relatório de ROI gerado",
        message: `Relatório de ROI para ${clientName} pronto. Compartilhe com seu cliente.`,
        link: reportUrl,
        target_url: reportUrl,
        entity_type: "roi_report",
        entity_id: report.id,
      });
      if (notificationError) console.error("ROI notification insert failed:", notificationError);
    }

    return json({ report_id: report.id, public_token: report.public_token, report_url: reportUrl, client_id: client.id ?? null });
  } catch (e: any) {
    console.error("generate-roi-report error:", e);
    return json({ error: e?.message || "unknown" }, 500);
  }
});
