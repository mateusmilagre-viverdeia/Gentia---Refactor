#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Auditoria retroativa de billing de entrevistas de voz (Cultural + Técnica).
 *
 * Compara cada cobrança histórica (recruitment_usage_log) com o NOVO preço
 * de tabela (0,35 cr/min) e emite estornos para sobrecobranças > 0,5 cr.
 *
 * Uso:
 *   DRY_RUN=1 deno run --allow-net --allow-env scripts/audit-voice-interview-billing.ts
 *   DRY_RUN=0 deno run --allow-net --allow-env scripts/audit-voice-interview-billing.ts  (executa estornos)
 *
 * Envs requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Output: /mnt/documents/audit-voice-billing.csv
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DRY_RUN = (Deno.env.get("DRY_RUN") ?? "1") !== "0";
const DAYS_BACK = Number(Deno.env.get("DAYS_BACK") ?? "90");
const TOLERANCE_CR = 0.5; // só estorna se sobrecobrado > 0,5 cr

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log(`Audit voice billing | DRY_RUN=${DRY_RUN} | DAYS_BACK=${DAYS_BACK} | tolerance=${TOLERANCE_CR}cr`);

// 1) Buscar preço de tabela atual.
const { data: featRows } = await sb
  .from("recruitment_credit_costs")
  .select("feature_key, credits_per_use")
  .in("feature_key", ["culture_interview_realtime", "technical_interview_realtime"]);

const priceByFeature = new Map<string, number>();
for (const r of featRows ?? []) priceByFeature.set(r.feature_key, Number(r.credits_per_use));
const PRICE_CULTURE = priceByFeature.get("culture_interview_realtime") ?? 0.35;
const PRICE_TECH = priceByFeature.get("technical_interview_realtime") ?? 0.35;
console.log(`Tabela: culture=${PRICE_CULTURE} cr/min, technical=${PRICE_TECH} cr/min`);

// 2) Buscar cobranças de voz dos últimos N dias (operation = 'consume', reference_type entrevista).
const since = new Date(Date.now() - DAYS_BACK * 24 * 3600 * 1000).toISOString();
const refTypes = [
  "culture_interview",
  "culture_interview_realtime",
  "culture_interview_realtime_watchdog",
  "culture_interview_evaluation",
  "technical_interview",
  "technical_interview_realtime",
  "technical_interview_realtime_watchdog",
  "technical_interview_evaluation",
];

const { data: logs, error: logErr } = await sb
  .from("recruitment_usage_log")
  .select("id, account_id, amount, reference_id, reference_type, description, created_at, operation")
  .gte("created_at", since)
  .in("reference_type", refTypes)
  .eq("operation", "consume")
  .order("created_at", { ascending: true });

if (logErr) {
  console.error("Erro buscando logs:", logErr);
  Deno.exit(1);
}

console.log(`Encontradas ${logs?.length ?? 0} cobranças no período`);

// 3) Agrupar por (session_id, kind). session_id = reference_id.
type Row = {
  account_id: string;
  session_id: string;
  kind: "culture" | "technical";
  charged: number;       // soma líquida das cobranças desta sessão
  duration_min: number;  // resolvido a partir da tabela de sessões
  expected: number;
  over: number;
  log_ids: string[];
};

const grouped = new Map<string, Row>();
for (const l of logs ?? []) {
  if (!l.reference_id) continue;
  const isCulture = l.reference_type.startsWith("culture_");
  const kind: "culture" | "technical" = isCulture ? "culture" : "technical";
  const key = `${l.reference_id}|${kind}`;
  const existing = grouped.get(key) ?? {
    account_id: l.account_id,
    session_id: l.reference_id,
    kind,
    charged: 0,
    duration_min: 0,
    expected: 0,
    over: 0,
    log_ids: [] as string[],
  };
  existing.charged += Number(l.amount);
  existing.log_ids.push(l.id);
  grouped.set(key, existing);
}

// Subtrair estornos já feitos (operation='refund') no mesmo reference_id.
const { data: refunds } = await sb
  .from("recruitment_usage_log")
  .select("amount, reference_id, reference_type")
  .gte("created_at", since)
  .in("reference_type", refTypes)
  .eq("operation", "refund");

for (const r of refunds ?? []) {
  if (!r.reference_id) continue;
  const kind = r.reference_type.startsWith("culture_") ? "culture" : "technical";
  const key = `${r.reference_id}|${kind}`;
  const row = grouped.get(key);
  if (row) row.charged -= Number(r.amount);
}

// 4) Buscar durações reais.
const cultureIds = [...grouped.values()].filter(r => r.kind === "culture").map(r => r.session_id);
const techIds = [...grouped.values()].filter(r => r.kind === "technical").map(r => r.session_id);

if (cultureIds.length) {
  const { data: cs } = await sb
    .from("culture_interview_sessions")
    .select("id, duration_seconds")
    .in("id", cultureIds);
  for (const s of cs ?? []) {
    const row = grouped.get(`${s.id}|culture`);
    if (row) row.duration_min = (Number(s.duration_seconds) || 0) / 60;
  }
}
if (techIds.length) {
  const { data: ts } = await sb
    .from("technical_interview_sessions")
    .select("id, duration_seconds")
    .in("id", techIds);
  for (const s of ts ?? []) {
    const row = grouped.get(`${s.id}|technical`);
    if (row) row.duration_min = (Number(s.duration_seconds) || 0) / 60;
  }
}

// 5) Calcular sobrecobrança.
const rows = [...grouped.values()].map(r => {
  const price = r.kind === "culture" ? PRICE_CULTURE : PRICE_TECH;
  r.expected = Math.max(Math.round(price * r.duration_min * 10) / 10, 0);
  r.over = Math.round((r.charged - r.expected) * 10) / 10;
  return r;
});

const overbilled = rows.filter(r => r.duration_min > 0 && r.over > TOLERANCE_CR);
const totalOver = overbilled.reduce((s, r) => s + r.over, 0);
const byAccount = new Map<string, number>();
for (const r of overbilled) byAccount.set(r.account_id, (byAccount.get(r.account_id) ?? 0) + r.over);

console.log(`\n📊 Sessões analisadas: ${rows.length}`);
console.log(`⚠️  Sobrecobradas (>${TOLERANCE_CR} cr): ${overbilled.length}`);
console.log(`💰 Total a estornar: ${totalOver.toFixed(1)} créditos em ${byAccount.size} contas\n`);

// 6) CSV
const csvLines = ["account_id,session_id,kind,duration_min,charged_cr,expected_cr,overcharge_cr"];
for (const r of rows) {
  csvLines.push(
    [r.account_id, r.session_id, r.kind, r.duration_min.toFixed(2), r.charged.toFixed(1), r.expected.toFixed(1), r.over.toFixed(1)].join(","),
  );
}
const outPath = "/mnt/documents/audit-voice-billing.csv";
await Deno.writeTextFile(outPath, csvLines.join("\n"));
console.log(`📄 CSV: ${outPath}`);

// 7) Aplicar estornos (apenas se DRY_RUN=0)
if (DRY_RUN) {
  console.log("\nDRY RUN — nenhum estorno aplicado. Rode com DRY_RUN=0 para executar.");
  Deno.exit(0);
}

console.log("\n🔧 Aplicando estornos...");
let ok = 0, fail = 0;
for (const r of overbilled) {
  const { error } = await sb.rpc("refund_credits", {
    p_account_id: r.account_id,
    p_credit_type: "universal",
    p_amount: r.over,
    p_reference_id: r.session_id,
    p_reference_type: `${r.kind}_interview`,
    p_description: `Auditoria retroativa — novo preço de tabela ${r.kind === "culture" ? PRICE_CULTURE : PRICE_TECH} cr/min × ${r.duration_min.toFixed(2)}min = ${r.expected} cr (cobrado ${r.charged.toFixed(1)} cr)`,
    p_metadata: { audit_reason: "voice_table_pricing_migration", session_id: r.session_id },
  });
  if (error) { fail++; console.error(`❌ ${r.session_id}`, error.message); }
  else ok++;
}
console.log(`\n✅ Estornos OK: ${ok} | falhas: ${fail}`);
