// Edge function: audit-ai-billing
// Auditoria NÃO RESTRITIVA do guardrail de billing de IA do módulo
// Recrutamento & Seleção. Não bloqueia nenhuma chamada em runtime — apenas
// observa a telemetria (ai_execution_logs + recruitment_usage_log) e devolve
// um relatório para o dashboard do Super Admin.
//
// Acesso: Super Admin (header Authorization) OU cron interno (x-cron-secret).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ---------- Escopo R&S (espelha scripts/check-ai-billing.ts) ----------
const RECRUITMENT_PREFIXES = [
  "recruitment-",
  "hunting-",
  "candidate-",
  "careers-",
  "culture-interview-",
  "technical-interview-",
  "interview-",
  "send-disc-",
  "disc-",
  "send-interview-",
  "send-technical-",
  "send-rejection-",
  "send-talent-pool-",
  "screening-",
  "outreach-",
  "talent-",
  "offline-interview-",
];

const RECRUITMENT_NAMES = new Set<string>([
  "analyze-cv-job-match",
  "analyze-social-profile",
  "apify-instagram",
  "apify-linkedin",
  "compare-finalists",
  "compile-decision",
  "continuous-hiring-match",
  "crossmatch-executar",
  "enrich-batch-candidates",
  "enrich-candidate-context",
  "enrich-candidate-profile",
  "enrich-company-data",
  "extension-capture-profile",
  "generate-candidate-ranking",
  "generate-full-job-description",
  "generate-indeed-feed",
  "generate-job-icp",
  "generate-screening-questions",
  "generate-shortlist-report",
  "generate-success-prediction",
  "job-benchmark-search",
  "match-candidate-jobs",
  "parse-candidate-cv",
  "post-job-to-channel",
  "process-external-entry",
  "recruiter-copilot",
  "retranscribe-culture-interview",
  "reuse-prior-assessments",
  "semantic-search-candidates",
  "suggest-job-description",
  "validate-distribution-credentials",
]);

const RECRUITMENT_BILLING_EXEMPT = new Set<string>([
  "agent-test-realtime",
  "openai-realtime-session",
  "start-culture-session",
  "start-technical-session",
  "technical-interview-session",
  "interview-watchdog",
  "hunting-demo-seed",
]);

function isInRecruitmentScope(fnName: string): boolean {
  if (RECRUITMENT_NAMES.has(fnName)) return true;
  return RECRUITMENT_PREFIXES.some((p) => fnName.startsWith(p));
}

interface SuspectRow {
  function_name: string;
  ai_calls: number;
  estimated_cost_brl: number;
  debits_count: number;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // --- Auth: cron secret OU super admin ---
  const cronHeader = req.headers.get("x-cron-secret");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = Boolean(cronHeader && cronSecret && cronHeader === cronSecret);

  let triggeredBy: "cron" | "manual" = isCron ? "cron" : "manual";

  if (!isCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      token,
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("is_super_admin", {
      _user_id: userData.user.id,
    });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // --- Window ---
  const url = new URL(req.url);
  const windowDays = Math.max(
    1,
    Math.min(90, parseInt(url.searchParams.get("days") ?? "7", 10) || 7),
  );
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString();

  // --- Telemetry: AI execution by function ---
  const { data: aiLogs, error: aiErr } = await supabaseAdmin
    .from("ai_execution_logs")
    .select("function_name, estimated_cost, account_id")
    .gte("created_at", since);

  if (aiErr) {
    return new Response(JSON.stringify({ error: aiErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const byFn = new Map<
    string,
    { ai_calls: number; cost: number; accounts: Set<string> }
  >();
  for (const row of aiLogs ?? []) {
    const fn = row.function_name as string;
    if (!fn) continue;
    if (!isInRecruitmentScope(fn)) continue;
    const cur = byFn.get(fn) ?? {
      ai_calls: 0,
      cost: 0,
      accounts: new Set<string>(),
    };
    cur.ai_calls += 1;
    cur.cost += Number(row.estimated_cost ?? 0);
    if (row.account_id) cur.accounts.add(row.account_id as string);
    byFn.set(fn, cur);
  }

  // --- Debits in same window ---
  const { data: debits, error: dErr } = await supabaseAdmin
    .from("recruitment_usage_log")
    .select("amount, description, metadata, reference_type")
    .gte("created_at", since)
    .lt("amount", 0); // débitos de crédito (consumo)

  if (dErr) {
    return new Response(JSON.stringify({ error: dErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const suspects: SuspectRow[] = [];
  let aiCallers = 0;
  let billed = 0;
  let exempt = 0;

  for (const [fn, info] of byFn.entries()) {
    aiCallers++;
    if (RECRUITMENT_BILLING_EXEMPT.has(fn)) {
      exempt++;
      continue;
    }
    // Heurística: contar débitos cuja descrição/reference_type/metadata
    // mencione o nome da função.
    let matches = 0;
    for (const d of debits ?? []) {
      const desc = (d.description ?? "").toString().toLowerCase();
      const ref = (d.reference_type ?? "").toString().toLowerCase();
      const meta = JSON.stringify(d.metadata ?? {}).toLowerCase();
      if (
        desc.includes(fn) ||
        ref.includes(fn) ||
        meta.includes(fn)
      ) {
        matches++;
      }
    }
    if (matches > 0) {
      billed++;
    } else {
      suspects.push({
        function_name: fn,
        ai_calls: info.ai_calls,
        estimated_cost_brl: Number((info.cost ?? 0).toFixed(4)),
        debits_count: 0,
        reason:
          "Função R&S chamou IA mas não encontrei débito correlato em recruitment_usage_log (janela = " +
          windowDays + "d). Pode ser falsa positiva se o débito for emitido por função irmã.",
      });
    }
  }

  const totalRsScope = byFn.size; // funções R&S vistas em telemetria
  const result = {
    scanned_at: new Date().toISOString(),
    window_days: windowDays,
    total_rs_functions: totalRsScope,
    ai_callers: aiCallers,
    billed,
    exempt,
    suspects_count: suspects.length,
    suspects,
    scope_snapshot: {
      prefixes: RECRUITMENT_PREFIXES,
      names: Array.from(RECRUITMENT_NAMES),
      exempt: Array.from(RECRUITMENT_BILLING_EXEMPT),
    },
    triggered_by: triggeredBy,
  };

  // Persist run
  await supabaseAdmin.from("ai_billing_audit_log").insert({
    window_days: windowDays,
    total_rs_functions: totalRsScope,
    ai_callers: aiCallers,
    billed,
    exempt,
    suspects: suspects as unknown as Record<string, unknown>[],
    scope_snapshot: result.scope_snapshot,
    triggered_by: triggeredBy,
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
