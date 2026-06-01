import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  account_id: string;
}

// 3 vagas demo específicas (alinhadas com a narrativa: Comercial, Tech, Marketing)
const DEMO_JOBS = [
  {
    title: "Analista Comercial Pleno",
    department: "Comercial",
    location: "São Paulo - SP",
    work_modality: "hybrid",
    employment_type: "CLT",
    description:
      "Vaga DEMO - Responsável por prospecção ativa, qualificação de leads e fechamento de contratos B2B no segmento de mid-market.",
    budget_min: 6000,
    budget_max: 9000,
  },
  {
    title: "Desenvolvedor Full Stack Sênior",
    department: "Tecnologia",
    location: "Remoto",
    work_modality: "remote",
    employment_type: "CLT",
    description:
      "Vaga DEMO - Desenvolvimento de aplicações web modernas com React, Node.js e PostgreSQL. Atuação em time ágil multidisciplinar.",
    budget_min: 12000,
    budget_max: 18000,
  },
  {
    title: "Coordenador de Marketing Digital",
    department: "Marketing",
    location: "Rio de Janeiro - RJ",
    work_modality: "onsite",
    employment_type: "CLT",
    description:
      "Vaga DEMO - Liderança da estratégia de aquisição digital, gestão de mídia paga, SEO e produção de conteúdo.",
    budget_min: 9000,
    budget_max: 13000,
  },
];

// 3 clientes demo (consultoria) — 1 por vaga
const DEMO_CLIENTS = [
  { razao_social: "DEMO Tech Solutions LTDA", nome_fantasia: "DEMO Tech", setor: "Tecnologia", porte: "Médio" },
  { razao_social: "DEMO Comércio e Varejo SA", nome_fantasia: "DEMO Varejo", setor: "Varejo", porte: "Grande" },
  { razao_social: "DEMO Indústria Brasil LTDA", nome_fantasia: "DEMO Indústria", setor: "Indústria", porte: "Pequeno" },
];

// 15 candidatos fictícios (5 por vaga)
const DEMO_CANDIDATES = [
  { first_name: "Ana", last_name: "Silva (DEMO)", email: "ana.silva.demo@example.local" },
  { first_name: "Bruno", last_name: "Costa (DEMO)", email: "bruno.costa.demo@example.local" },
  { first_name: "Carla", last_name: "Mendes (DEMO)", email: "carla.mendes.demo@example.local" },
  { first_name: "Diego", last_name: "Pereira (DEMO)", email: "diego.pereira.demo@example.local" },
  { first_name: "Elisa", last_name: "Rodrigues (DEMO)", email: "elisa.rodrigues.demo@example.local" },
  { first_name: "Felipe", last_name: "Almeida (DEMO)", email: "felipe.almeida.demo@example.local" },
  { first_name: "Gabriela", last_name: "Santos (DEMO)", email: "gabriela.santos.demo@example.local" },
  { first_name: "Henrique", last_name: "Lima (DEMO)", email: "henrique.lima.demo@example.local" },
  { first_name: "Isabela", last_name: "Ferreira (DEMO)", email: "isabela.ferreira.demo@example.local" },
  { first_name: "João", last_name: "Oliveira (DEMO)", email: "joao.oliveira.demo@example.local" },
  { first_name: "Karina", last_name: "Barbosa (DEMO)", email: "karina.barbosa.demo@example.local" },
  { first_name: "Lucas", last_name: "Martins (DEMO)", email: "lucas.martins.demo@example.local" },
  { first_name: "Mariana", last_name: "Cardoso (DEMO)", email: "mariana.cardoso.demo@example.local" },
  { first_name: "Nicolas", last_name: "Vieira (DEMO)", email: "nicolas.vieira.demo@example.local" },
  { first_name: "Olivia", last_name: "Rocha (DEMO)", email: "olivia.rocha.demo@example.local" },
];

// Distribuição de 5 candidatos por vaga (índices na lista DEMO_CANDIDATES)
// Cada item: [stage, application_status]
type Plan = { stages: Array<{ stage: string; status: string }> };
const JOB_PLANS: Plan[] = [
  // Vaga 1 — Analista Comercial: 5 candidatos
  {
    stages: [
      { stage: "screening", status: "active" },
      { stage: "screening", status: "active" },
      { stage: "interview", status: "active" },
      { stage: "hired", status: "hired" },
      { stage: "rejected", status: "rejected" },
    ],
  },
  // Vaga 2 — Dev Full Stack: 5 candidatos
  {
    stages: [
      { stage: "screening", status: "active" },
      { stage: "interview", status: "active" },
      { stage: "interview", status: "active" },
      { stage: "offer", status: "active" },
      { stage: "hired", status: "hired" },
    ],
  },
  // Vaga 3 — Coord. Marketing: 5 candidatos (sem hired/rejected — em andamento)
  {
    stages: [
      { stage: "new", status: "active" },
      { stage: "new", status: "active" },
      { stage: "screening", status: "active" },
      { stage: "screening", status: "active" },
      { stage: "interview", status: "active" },
    ],
  },
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("demo-seed: invalid token", userErr);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const user = userData.user;

    const body: SeedRequest = await req.json();
    const accountId = (body.account_id || "").trim();
    if (!accountId) {
      return new Response(JSON.stringify({ success: false, error: "account_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validar que o usuário é Owner/Admin da conta
    const { data: membership, error: memErr } = await supabase
      .from("account_members")
      .select("role, is_active")
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (memErr) {
      console.error("demo-seed: membership lookup error", memErr);
      return new Response(JSON.stringify({ success: false, error: "Membership lookup failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Only Owners or Admins can activate demo mode" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("demo-seed: starting", { accountId, by: user.id });

    let totalInserted = 0;

    // 1) Inserir 3 clientes demo
    const clientsPayload = DEMO_CLIENTS.map((c) => ({
      ...c,
      account_id: accountId,
      status: "ativo",
      is_demo: true,
    }));
    const { data: insertedClients, error: cliErr } = await supabase
      .from("clientes_consultoria")
      .insert(clientsPayload)
      .select("id, nome_fantasia");
    if (cliErr) {
      console.error("demo-seed: clients insert error", cliErr);
      throw cliErr;
    }
    totalInserted += insertedClients?.length || 0;

    // 2) Inserir 3 vagas demo (1 por cliente)
    const jobsPayload = DEMO_JOBS.map((j, idx) => ({
      ...j,
      account_id: accountId,
      cliente_id: insertedClients?.[idx]?.id ?? null,
      status: "active",
      is_public: false,
      is_demo: true,
      published_at: new Date().toISOString(),
    }));
    const { data: insertedJobs, error: jobErr } = await supabase
      .from("recruitment_jobs")
      .insert(jobsPayload)
      .select("id, title");
    if (jobErr) {
      console.error("demo-seed: jobs insert error", jobErr);
      throw jobErr;
    }
    totalInserted += insertedJobs?.length || 0;

    // 3) Inserir 15 candidatos demo
    const candidatesPayload = DEMO_CANDIDATES.map((c) => ({
      ...c,
      account_id: accountId,
      status: "active",
      stage: "new",
      source: "demo_seed",
      is_demo: true,
    }));
    const { data: insertedCandidates, error: candErr } = await supabase
      .from("recruitment_candidates")
      .upsert(candidatesPayload, { onConflict: "account_id,email", ignoreDuplicates: false })
      .select("id, first_name, last_name");
    if (candErr) {
      console.error("demo-seed: candidates insert error", candErr);
      throw candErr;
    }
    totalInserted += insertedCandidates?.length || 0;

    // 4) Distribuir 5 candidatos por vaga, conforme JOB_PLANS
    const applicationsPayload: Array<Record<string, unknown>> = [];
    const hiredAppRefs: Array<{ jobIdx: number; candIdx: number }> = [];

    if (insertedJobs && insertedCandidates) {
      let candIdx = 0;
      for (let jobIdx = 0; jobIdx < insertedJobs.length; jobIdx++) {
        const plan = JOB_PLANS[jobIdx];
        const job = insertedJobs[jobIdx];
        for (let i = 0; i < plan.stages.length && candIdx < insertedCandidates.length; i++, candIdx++) {
          const { stage, status } = plan.stages[i];
          const isHired = status === "hired";
          if (isHired) {
            hiredAppRefs.push({ jobIdx, candIdx });
          }
          applicationsPayload.push({
            account_id: accountId,
            job_id: job.id,
            candidate_id: insertedCandidates[candIdx].id,
            status,
            stage_id: null,
            score: Math.floor(70 + Math.random() * 25),
            source: "demo_seed",
            is_demo: true,
            applied_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
          });
        }
      }
    }

    let insertedApplications: { id: string; candidate_id: string | null; job_id: string | null }[] = [];
    if (applicationsPayload.length > 0) {
      const { data, error: appErr } = await supabase
        .from("recruitment_applications")
        .insert(applicationsPayload)
        .select("id, candidate_id, job_id");
      if (appErr) {
        console.error("demo-seed: applications insert error", appErr);
        throw appErr;
      }
      insertedApplications = data || [];
      totalInserted += insertedApplications.length;
    }

    // 5) NPS — amostras com diferentes scores (10 entradas)
    const npsScores = [10, 9, 9, 8, 8, 7, 7, 6, 5, 9];
    const npsPayload: Array<Record<string, unknown>> = [];
    insertedApplications.slice(0, npsScores.length).forEach((app, idx) => {
      const score = npsScores[idx];
      const category = score >= 9 ? "promoter" : score >= 7 ? "neutral" : "detractor";
      npsPayload.push({
        account_id: accountId,
        application_id: app.id,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        trigger: idx % 2 === 0 ? "hired" : "exit",
        send_status: "answered",
        sent_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        answered_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        score,
        category,
        feedback_text: "Feedback DEMO simulado para visualização do módulo.",
        is_demo: true,
      });
    });
    if (npsPayload.length > 0) {
      const { error: npsErr } = await supabase.from("candidate_nps").insert(npsPayload);
      if (npsErr) {
        console.error("demo-seed: nps insert error", npsErr);
        throw npsErr;
      }
      totalInserted += npsPayload.length;
    }

    // 6) Histórico de processo (8 entradas — mistura de hired/rejected)
    const historyPayload: Array<Record<string, unknown>> = [];
    insertedApplications.slice(0, 8).forEach((app, idx) => {
      const job = insertedJobs?.find((j) => j.id === app.job_id);
      const wasHired = idx % 3 === 0;
      historyPayload.push({
        account_id: accountId,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        job_title: job?.title || "Vaga DEMO",
        final_status: wasHired ? "hired" : "rejected",
        was_shortlisted: wasHired,
        qualification_score: 65 + idx * 3,
        rejection_reason: wasHired ? null : "Aderência cultural insuficiente (DEMO)",
        feedback_notes: "Registro DEMO de histórico para visualização.",
        participated_at: new Date(Date.now() - (30 + idx * 5) * 86400000).toISOString(),
        is_demo: true,
      });
    });
    if (historyPayload.length > 0) {
      const { error: histErr } = await supabase.from("candidate_process_history").insert(historyPayload);
      if (histErr) {
        console.error("demo-seed: history insert error", histErr);
        throw histErr;
      }
      totalInserted += historyPayload.length;
    }

    // 7) Fees — 1 fee por contratação (2 fees: 1 recebido, 1 a_receber)
    const feesPayload: Array<Record<string, unknown>> = [];
    const garantiasPayload: Array<Record<string, unknown>> = [];
    const now = Date.now();

    hiredAppRefs.forEach((ref, idx) => {
      const job = insertedJobs?.[ref.jobIdx];
      const cliente = insertedClients?.[ref.jobIdx];
      const cand = insertedCandidates?.[ref.candIdx];
      if (!job || !cand) return;

      // Spec: salário fechado e fee = salário × 13 × 80%
      // Vaga 1 (Comercial): R$ 7.500 → fee R$ 78.000
      // Vaga 2 (Tech): R$ 15.000 → fee R$ 156.000
      const salarioFechado = ref.jobIdx === 0 ? 7500 : 15000;
      const valorFee = Math.round(salarioFechado * 13 * 0.8);
      const isRecebido = idx === 0;

      // Datas escalonadas: vaga 1 fechada há 20 dias, vaga 2 há 8 dias
      const diasDesdeContratacao = ref.jobIdx === 0 ? 20 : 8;
      const dataContratacao = new Date(now - diasDesdeContratacao * 86400000);

      feesPayload.push({
        account_id: accountId,
        vaga_id: job.id,
        cliente_id: cliente?.id ?? null,
        valor_fee: valorFee,
        status: isRecebido ? "recebido" : "a_receber",
        data_previsao: new Date(now + 15 * 86400000).toISOString(),
        data_recebimento: isRecebido ? new Date(now - 3 * 86400000).toISOString() : null,
        forma_recebimento: isRecebido ? "PIX" : null,
        numero_nota_fiscal: isRecebido ? `DEMO-NF-${1000 + idx}` : null,
        observacoes: `DEMO — Fee 80% s/ salário anual (R$ ${salarioFechado.toLocaleString("pt-BR")} × 13 × 0,8).`,
        is_demo: true,
      });

      // Garantia de 90 dias contados da data de contratação
      const garantiaExpira = new Date(dataContratacao.getTime() + 90 * 86400000);
      garantiasPayload.push({
        account_id: accountId,
        vaga_original_id: job.id,
        candidato_id: cand.id,
        cliente_id: cliente?.id ?? null,
        data_contratacao: dataContratacao.toISOString(),
        prazo_garantia_dias: 90,
        garantia_expira_em: garantiaExpira.toISOString(),
        status: "ativa",
        observacoes: "DEMO — Garantia de reposição padrão de 90 dias.",
        is_demo: true,
      });
    });

    if (feesPayload.length > 0) {
      const { error: feeErr } = await supabase.from("fees_historico").insert(feesPayload);
      if (feeErr) {
        console.error("demo-seed: fees insert error", feeErr);
        throw feeErr;
      }
      totalInserted += feesPayload.length;
    }

    if (garantiasPayload.length > 0) {
      const { error: garErr } = await supabase.from("garantias_reposicao").insert(garantiasPayload);
      if (garErr) {
        console.error("demo-seed: garantias insert error", garErr);
        throw garErr;
      }
      totalInserted += garantiasPayload.length;
    }

    // 8) Ativar / atualizar account_demo_config
    const nowIso = new Date().toISOString();
    const { error: cfgErr } = await supabase
      .from("account_demo_config")
      .upsert(
        {
          account_id: accountId,
          demo_mode_active: true,
          activated_at: nowIso,
          activated_by: user.id,
          last_seed_at: nowIso,
          demo_records_count: totalInserted,
        },
        { onConflict: "account_id" }
      );
    if (cfgErr) {
      console.error("demo-seed: config upsert error", cfgErr);
      throw cfgErr;
    }

    console.log("demo-seed: success", { accountId, totalInserted });

    return new Response(
      JSON.stringify({
        success: true,
        account_id: accountId,
        records_inserted: totalInserted,
        breakdown: {
          clients: insertedClients?.length || 0,
          jobs: insertedJobs?.length || 0,
          candidates: insertedCandidates?.length || 0,
          applications: insertedApplications.length,
          nps: npsPayload.length,
          history: historyPayload.length,
          fees: feesPayload.length,
          garantias: garantiasPayload.length,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("demo-seed: unhandled error", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
