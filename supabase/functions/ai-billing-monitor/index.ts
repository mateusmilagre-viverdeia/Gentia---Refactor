// Edge function: ai-billing-monitor
// Roda a cada 15min via pg_cron. Detecta divergências account-level
// entre uso de IA (ai_execution_logs) e débitos (recruitment_usage_log)
// no escopo R&S, aplica auto-estorno e notifica os admins da conta.
//
// Acesso: x-cron-secret OU super admin (Authorization Bearer).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ---------- Escopo R&S (espelha audit-ai-billing) ----------
const RECRUITMENT_PREFIXES = [
  "recruitment-", "hunting-", "candidate-", "careers-",
  "culture-interview-", "technical-interview-", "interview-",
  "send-disc-", "disc-", "send-interview-", "send-technical-",
  "send-rejection-", "send-talent-pool-", "screening-",
  "outreach-", "talent-", "offline-interview-",
];
const RECRUITMENT_NAMES = new Set<string>([
  "analyze-cv-job-match", "analyze-social-profile", "apify-instagram",
  "apify-linkedin", "compare-finalists", "compile-decision",
  "continuous-hiring-match", "crossmatch-executar", "enrich-batch-candidates",
  "enrich-candidate-context", "enrich-candidate-profile", "enrich-company-data",
  "extension-capture-profile", "generate-candidate-ranking",
  "generate-full-job-description", "generate-indeed-feed", "generate-job-icp",
  "generate-screening-questions", "generate-shortlist-report",
  "generate-success-prediction", "job-benchmark-search",
  "match-candidate-jobs", "parse-candidate-cv", "post-job-to-channel",
  "process-external-entry", "recruiter-copilot",
  "retranscribe-culture-interview", "reuse-prior-assessments",
  "semantic-search-candidates", "suggest-job-description",
  "validate-distribution-credentials",
]);
const RECRUITMENT_BILLING_EXEMPT = new Set<string>([
  "agent-test-realtime", "openai-realtime-session",
  "start-culture-session", "start-technical-session",
  "technical-interview-session", "interview-watchdog",
  "hunting-demo-seed",
]);

function isInScope(fn: string): boolean {
  if (!fn) return false;
  if (RECRUITMENT_BILLING_EXEMPT.has(fn)) return false;
  if (RECRUITMENT_NAMES.has(fn)) return true;
  return RECRUITMENT_PREFIXES.some((p) => fn.startsWith(p));
}

// Heurística de segurança: se algo está sistemicamente quebrado
// e gera muitos incidentes na mesma janela, NÃO auto-corrigir.
const MAX_AUTO_CORRECT_PER_RUN = 10;

// Janela de detecção (minutos)
const WINDOW_MINUTES = 30;

interface DivergencyKey {
  account_id: string;
  function_name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---- Auth ----
  const cronHeader = req.headers.get("x-cron-secret");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = Boolean(cronHeader && cronSecret && cronHeader === cronSecret);
  let triggeredBy: "cron" | "manual" = isCron ? "cron" : "manual";

  if (!isCron) {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_super_admin", {
      _user_id: userData.user.id,
    });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const windowEnd = new Date();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  // ---- 1) Telemetria de IA agrupada por (account, função) ----
  const { data: aiLogs, error: aiErr } = await supabase
    .from("ai_execution_logs")
    .select("function_name, estimated_cost, account_id")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString());

  if (aiErr) {
    return new Response(JSON.stringify({ error: aiErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const usage = new Map<string, {
    account_id: string;
    function_name: string;
    calls: number;
    cost: number;
  }>();

  for (const row of aiLogs ?? []) {
    const fn = (row.function_name as string) ?? "";
    const accId = (row.account_id as string) ?? "";
    if (!fn || !accId) continue;
    if (!isInScope(fn)) continue;
    const key = `${accId}::${fn}`;
    const cur = usage.get(key) ?? {
      account_id: accId, function_name: fn, calls: 0, cost: 0,
    };
    cur.calls += 1;
    cur.cost += Number(row.estimated_cost ?? 0);
    usage.set(key, cur);
  }

  // ---- 2) Débitos na mesma janela ----
  const { data: debits, error: dErr } = await supabase
    .from("recruitment_usage_log")
    .select("amount, description, metadata, reference_type, account_id")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())
    .lt("amount", 0);

  if (dErr) {
    return new Response(JSON.stringify({ error: dErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- 3) Identifica divergências ----
  const divergencies: Array<{
    account_id: string; function_name: string;
    ai_calls: number; estimated_cost: number;
  }> = [];

  for (const u of usage.values()) {
    let matched = 0;
    for (const d of debits ?? []) {
      if ((d.account_id as string) !== u.account_id) continue;
      const desc = (d.description ?? "").toString().toLowerCase();
      const ref = (d.reference_type ?? "").toString().toLowerCase();
      const meta = JSON.stringify(d.metadata ?? {}).toLowerCase();
      const fn = u.function_name.toLowerCase();
      if (desc.includes(fn) || ref.includes(fn) || meta.includes(fn)) {
        matched++;
      }
    }
    if (matched === 0 && u.cost > 0) {
      divergencies.push({
        account_id: u.account_id,
        function_name: u.function_name,
        ai_calls: u.calls,
        estimated_cost: Number(u.cost.toFixed(4)),
      });
    }
  }

  // ---- 4) Decide estratégia (auto-correct vs manual review) ----
  const tooMany = divergencies.length > MAX_AUTO_CORRECT_PER_RUN;
  const createdIncidents: any[] = [];
  let autoCorrected = 0;
  let manualReview = 0;

  // Filtra divergências que já têm incidente recente (últimos 30min, mesma conta+função)
  const dedupeSince = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recentIncidents } = await supabase
    .from("ai_billing_incidents")
    .select("account_id, function_name, detected_at")
    .gte("detected_at", dedupeSince);
  const recentSet = new Set(
    (recentIncidents ?? []).map((r: any) => `${r.account_id}::${r.function_name}`),
  );

  for (const div of divergencies) {
    const dedupeKey = `${div.account_id}::${div.function_name}`;
    if (recentSet.has(dedupeKey)) continue;

    const shouldAutoCorrect = !tooMany;
    let status: string = shouldAutoCorrect ? "auto_corrected" : "requires_manual_review";
    let correctionRefId: string | null = null;
    let creditsAdjusted = 0;
    let notes: string | null = tooMany
      ? `Mais de ${MAX_AUTO_CORRECT_PER_RUN} divergências nesta janela — auto-correção desabilitada.`
      : null;

    if (shouldAutoCorrect) {
      // Converte custo BRL em "créditos" — assumimos paridade 1 BRL = 1 crédito
      // (tabela de pricing trata de margem; aqui o objetivo é apenas estornar).
      // Mínimo 0.1 crédito para evitar débitos zerados.
      creditsAdjusted = Math.max(0.1, Number(div.estimated_cost.toFixed(2)));

      const { data: consumeResult, error: consumeErr } = await supabase.rpc(
        "consume_credits",
        {
          p_account_id: div.account_id,
          p_credit_type: "recruitment",
          p_amount: creditsAdjusted,
          p_reference_id: null,
          p_reference_type: "ai_billing_auto_correction",
          p_description: `Auto-estorno billing IA: ${div.function_name} (${div.ai_calls} chamadas)`,
          p_user_id: null,
        },
      );

      if (consumeErr || (consumeResult as any)?.success === false) {
        status = "requires_manual_review";
        notes = `Falha ao debitar: ${consumeErr?.message ?? (consumeResult as any)?.error ?? "erro desconhecido"}`;
        creditsAdjusted = 0;
      } else {
        correctionRefId = (consumeResult as any)?.transaction_id ?? null;
        autoCorrected++;
      }
    } else {
      manualReview++;
    }

    const { data: incident, error: incErr } = await supabase
      .from("ai_billing_incidents")
      .insert({
        account_id: div.account_id,
        function_name: div.function_name,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        ai_calls_count: div.ai_calls,
        estimated_cost_brl: div.estimated_cost,
        credits_adjusted: creditsAdjusted,
        status,
        correction_reference_id: correctionRefId,
        notes,
        metadata: { triggered_by: triggeredBy },
      })
      .select()
      .single();

    if (incErr) {
      console.error("[ai-billing-monitor] insert incident failed", incErr);
      continue;
    }
    createdIncidents.push(incident);

    // ---- 5) Notificar (apenas auto_corrected) ----
    if (status === "auto_corrected") {
      try {
        // In-app: notificar admins da conta
        const { data: admins } = await supabase
          .from("account_members")
          .select("user_id")
          .eq("account_id", div.account_id)
          .in("role", ["admin", "owner", "account_admin"]);

        const notifs = (admins ?? []).map((a: any) => ({
          account_id: div.account_id,
          user_id: a.user_id,
          type: "ai_billing_auto_correction",
          title: "Ajuste automático de crédito de IA",
          message: `Identificamos ${div.ai_calls} uso(s) de IA (${div.function_name}) sem cobrança e ajustamos ${creditsAdjusted} créditos automaticamente.`,
          link: "/configuracoes/faturamento",
        }));
        if (notifs.length > 0) {
          await supabase.from("notifications").insert(notifs);
        }

        await supabase
          .from("ai_billing_incidents")
          .update({ status: "notified", notified_at: new Date().toISOString() })
          .eq("id", (incident as any).id);
      } catch (notifErr) {
        console.error("[ai-billing-monitor] notify failed", notifErr);
      }
    }
  }

  const result = {
    scanned_at: new Date().toISOString(),
    window_minutes: WINDOW_MINUTES,
    triggered_by: triggeredBy,
    divergencies_found: divergencies.length,
    incidents_created: createdIncidents.length,
    auto_corrected: autoCorrected,
    requires_manual_review: manualReview,
    safety_guard_triggered: tooMany,
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
