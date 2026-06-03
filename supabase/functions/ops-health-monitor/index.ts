// ops-health-monitor — verificação periódica de saúde OPERACIONAL (Frente B).
// Detecta custo de IA anormal, pico de erros/timeouts e funções problemáticas,
// grava em public.ops_alerts e (se configurado) notifica no Discord.
//
// Acionamento: cron (pg_cron via net.http_post) ou chamada manual do admin.
// Autorização: header x-cron-secret == CRON_SECRET, OU Bearer == SERVICE_ROLE_KEY.
// Thresholds configuráveis por env (com defaults sensatos).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface Alert {
  alert_type: string;
  severity: "info" | "warning" | "high" | "critical";
  message: string;
  details: Record<string, unknown>;
}

const SEVERITY_COLOR: Record<string, number> = {
  info: 0x3b82f6,
  warning: 0xf59e0b,
  high: 0xef4444,
  critical: 0x991b1b,
};

async function notifyDiscord(webhook: string, alerts: Alert[]): Promise<void> {
  const worst = alerts.reduce((acc, a) =>
    (["info", "warning", "high", "critical"].indexOf(a.severity) >
     ["info", "warning", "high", "critical"].indexOf(acc) ? a.severity : acc), "info");
  const embed = {
    title: `🚨 Gentia — ${alerts.length} alerta(s) operacional(is)`,
    color: SEVERITY_COLOR[worst] ?? 0x6b7280,
    fields: alerts.slice(0, 10).map((a) => ({
      name: `[${a.severity.toUpperCase()}] ${a.alert_type}`,
      value: a.message.slice(0, 1000),
    })),
    timestamp: new Date().toISOString(),
  };
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error("[ops-health-monitor] Discord falhou:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // --- Autorização: cron secret OU service_role ---
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const CRON = Deno.env.get("CRON_SECRET") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const authorized = (SERVICE && bearer === SERVICE) || (CRON && cronHeader === CRON);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);

  // Thresholds (env override) ------------------------------------------------
  const COST_24H_LIMIT = Number(Deno.env.get("OPS_AI_COST_24H_LIMIT_USD") ?? "50");
  const ERROR_RATE_LIMIT = Number(Deno.env.get("OPS_AI_ERROR_RATE_PCT") ?? "20");
  const FN_ERROR_MIN = Number(Deno.env.get("OPS_FN_ERROR_MIN") ?? "5");
  const MIN_SAMPLE = 10;

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const alerts: Alert[] = [];

  // --- Coleta: execuções de IA nas últimas 24h ---
  const { data: logs, error } = await supabase
    .from("ai_execution_logs")
    .select("estimated_cost,status,function_name")
    .gte("created_at", since);

  if (error) {
    alerts.push({
      alert_type: "db", severity: "high",
      message: `Falha ao consultar ai_execution_logs: ${error.message}`, details: {},
    });
  } else {
    const total = logs?.length ?? 0;
    const totalCost = (logs ?? []).reduce((s, l) => s + Number(l.estimated_cost ?? 0), 0);
    const failed = (logs ?? []).filter((l) => l.status === "error" || l.status === "timeout").length;
    const errorRate = total ? (100 * failed) / total : 0;

    // 1) Custo de IA em 24h acima do teto
    if (totalCost > COST_24H_LIMIT) {
      alerts.push({
        alert_type: "ai_cost", severity: "high",
        message: `Custo de IA nas últimas 24h = US$ ${totalCost.toFixed(2)} (teto US$ ${COST_24H_LIMIT}).`,
        details: { totalCost, limit: COST_24H_LIMIT, calls: total },
      });
    }
    // 2) Taxa de erro de IA acima do limite (com amostra mínima)
    if (total >= MIN_SAMPLE && errorRate > ERROR_RATE_LIMIT) {
      alerts.push({
        alert_type: "ai_error_rate", severity: "high",
        message: `Taxa de erro/timeout de IA em 24h = ${errorRate.toFixed(1)}% (limite ${ERROR_RATE_LIMIT}%).`,
        details: { errorRate, failed, total },
      });
    }
    // 3) Funções com muitos erros (top ofensores)
    const byFn: Record<string, { total: number; failed: number }> = {};
    for (const l of logs ?? []) {
      const k = l.function_name ?? "(desconhecida)";
      byFn[k] ??= { total: 0, failed: 0 };
      byFn[k].total++;
      if (l.status === "error" || l.status === "timeout") byFn[k].failed++;
    }
    for (const [fn, s] of Object.entries(byFn)) {
      if (s.failed >= FN_ERROR_MIN) {
        alerts.push({
          alert_type: "fn_errors", severity: "warning",
          message: `Função ${fn}: ${s.failed} falhas em 24h (de ${s.total} chamadas).`,
          details: { function: fn, ...s },
        });
      }
    }
  }

  // --- Persiste alertas + notifica ---
  if (alerts.length > 0) {
    await supabase.from("ops_alerts").insert(alerts);
    const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (webhook) await notifyDiscord(webhook, alerts);
  }

  return new Response(
    JSON.stringify({ checked: true, alerts_count: alerts.length, alerts }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
