// Cron mensal: gera snapshot do mês anterior e envia email para super admins / head CS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const USD_TO_BRL = 5.4;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Mês anterior
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodYear = start.getFullYear();
  const periodMonth = start.getMonth() + 1;

  // Logs do mês
  const { data: logs, error } = await supabase
    .from("ai_execution_logs")
    .select("function_name, account_id, estimated_cost, tokens_used")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .eq("status", "success");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const evalFns = ["culture-interview-complete", "technical-interview-complete", "analyze-cv-job-match"];
  const filtered = (logs || []).filter((l) => evalFns.includes(l.function_name));

  // Baselines
  const { data: baselines } = await supabase.from("ai_cost_baselines").select("function_name, avg_cost_brl");
  const baselineMap = new Map((baselines || []).map((b) => [b.function_name, Number(b.avg_cost_brl)]));

  // Aggregate
  const perFunction: Record<string, { cost: number; sessions: number; baseline: number; savings: number }> = {};
  const perAccount = new Map<string, { cost: number; sessions: number }>();
  let totalCostBrl = 0;
  let totalSessions = 0;
  let totalBaseline = 0;

  for (const l of filtered) {
    const cost = (Number(l.estimated_cost) || 0) * USD_TO_BRL;
    totalCostBrl += cost;
    totalSessions++;

    if (!perFunction[l.function_name]) {
      perFunction[l.function_name] = { cost: 0, sessions: 0, baseline: baselineMap.get(l.function_name) || 0, savings: 0 };
    }
    perFunction[l.function_name].cost += cost;
    perFunction[l.function_name].sessions++;

    const baseline = baselineMap.get(l.function_name) || 0;
    totalBaseline += baseline;

    const acc = perAccount.get(l.account_id) || { cost: 0, sessions: 0 };
    acc.cost += cost;
    acc.sessions++;
    perAccount.set(l.account_id, acc);
  }

  // Compute savings per function
  for (const fn of Object.keys(perFunction)) {
    const f = perFunction[fn];
    const baselineTotal = f.baseline * f.sessions;
    f.savings = Math.max(0, baselineTotal - f.cost);
  }

  const savingsBrl = Math.max(0, totalBaseline - totalCostBrl);
  const savingsPct = totalBaseline > 0 ? (savingsBrl / totalBaseline) * 100 : 0;

  // Top accounts
  const accountIds = Array.from(perAccount.keys());
  const { data: accounts } = accountIds.length
    ? await supabase.from("companies").select("id, name").in("id", accountIds)
    : { data: [] };
  const accNameMap = new Map((accounts || []).map((a: any) => [a.id, a.name]));
  const topAccounts = Array.from(perAccount.entries())
    .map(([id, v]) => ({ account_id: id, name: accNameMap.get(id) || "—", cost_brl: v.cost, sessions: v.sessions }))
    .sort((a, b) => b.cost_brl - a.cost_brl)
    .slice(0, 5);

  // Anomalies (custo > 2x média da função)
  const fnAvg = Object.fromEntries(
    Object.entries(perFunction).map(([fn, v]) => [fn, v.sessions > 0 ? v.cost / v.sessions : 0])
  );
  let anomaliesCount = 0;
  for (const l of filtered) {
    const cost = (Number(l.estimated_cost) || 0) * USD_TO_BRL;
    const avg = fnAvg[l.function_name];
    if (avg > 0 && cost > 2 * avg) anomaliesCount++;
  }

  // Snapshot anterior (para comparação)
  const prevMonth = periodMonth === 1 ? 12 : periodMonth - 1;
  const prevYear = periodMonth === 1 ? periodYear - 1 : periodYear;
  const { data: prevSnap } = await supabase
    .from("llm_cost_monthly_snapshots")
    .select("total_cost_brl")
    .eq("period_year", prevYear)
    .eq("period_month", prevMonth)
    .maybeSingle();

  const deltaVsPrev = prevSnap
    ? totalCostBrl - Number(prevSnap.total_cost_brl)
    : null;

  // Persist snapshot (upsert)
  await supabase.from("llm_cost_monthly_snapshots").upsert({
    period_year: periodYear,
    period_month: periodMonth,
    total_cost_brl: totalCostBrl,
    total_sessions: totalSessions,
    savings_vs_baseline_brl: savingsBrl,
    savings_pct: savingsPct,
    per_function: perFunction,
    top_accounts: topAccounts,
    anomalies_count: anomaliesCount,
  }, { onConflict: "period_year,period_month" });

  // Recipients (super admin + head_cs)
  const { data: roleUsers } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["super_admin", "head_cs"]);
  const userIds = Array.from(new Set((roleUsers || []).map((r: any) => r.user_id)));
  const { data: profs } = userIds.length
    ? await supabase.from("profiles").select("email").in("id", userIds)
    : { data: [] };
  const recipients = Array.from(new Set((profs || []).map((p: any) => p.email).filter(Boolean)));

  const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const monthLabel = `${String(periodMonth).padStart(2, "0")}/${periodYear}`;

  const html = `
<h2>Relatório mensal de custos LLM — ${monthLabel}</h2>
<ul>
  <li><strong>Custo total:</strong> ${fmt(totalCostBrl)} (${totalSessions} avaliações)</li>
  <li><strong>Economia vs baseline:</strong> ${fmt(savingsBrl)} (${savingsPct.toFixed(1)}%)</li>
  ${deltaVsPrev !== null ? `<li><strong>Variação vs mês anterior:</strong> ${deltaVsPrev >= 0 ? "+" : ""}${fmt(deltaVsPrev)}</li>` : ""}
  <li><strong>Anomalias detectadas:</strong> ${anomaliesCount}</li>
</ul>
<h3>Por função</h3>
<ul>
${Object.entries(perFunction).map(([fn, v]) =>
  `<li>${fn}: ${fmt(v.cost)} em ${v.sessions} sessões (economia ${fmt(v.savings)})</li>`
).join("")}
</ul>
<h3>Top 5 contas</h3>
<ol>
${topAccounts.map((a) => `<li>${a.name}: ${fmt(a.cost_brl)} (${a.sessions} sessões)</li>`).join("")}
</ol>
<p style="color:#888;font-size:12px">Snapshot salvo em llm_cost_monthly_snapshots.</p>
`;

  // Send email
  let emailStatus = "skipped";
  if (recipients.length > 0) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GENTIA <noreply@gentia.tech>",
          to: recipients,
          subject: `Custos LLM — ${monthLabel}`,
          html,
        }),
      });
      emailStatus = r.ok ? "sent" : `error_${r.status}`;
      if (!r.ok) console.error("[monthly-llm-cost-report] resend error:", await r.text());
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    period: monthLabel,
    total_cost_brl: totalCostBrl,
    sessions: totalSessions,
    savings_brl: savingsBrl,
    savings_pct: savingsPct,
    anomalies_count: anomaliesCount,
    recipients: recipients.length,
    email_status: emailStatus,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
