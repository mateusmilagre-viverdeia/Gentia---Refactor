#!/usr/bin/env bun
/**
 * Guardrail de CI: garante que toda feature ativa em recruitment_credit_costs
 * tem um modelo definido em feature_llm_mapping (modelo real OU 'no_llm').
 *
 * Falha (exit 1) se houver features pendentes.
 *
 * Uso: bun run scripts/check-llm-mapping.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error("❌ SUPABASE_URL / KEY env vars não configurados.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, KEY);

const { data: costs, error: e1 } = await sb
  .from("recruitment_credit_costs")
  .select("feature_key")
  .eq("is_active", true);
if (e1) { console.error(e1); process.exit(1); }

const { data: mapping, error: e2 } = await sb
  .from("feature_llm_mapping")
  .select("feature_key, model_id");
if (e2) { console.error(e2); process.exit(1); }

const mapByKey = new Map((mapping ?? []).map(m => [m.feature_key, m.model_id]));

const missing: string[] = [];
const operational: string[] = [];
const mapped: string[] = [];

for (const c of costs ?? []) {
  const m = mapByKey.get(c.feature_key);
  if (!m) missing.push(c.feature_key);
  else if (m === "no_llm") operational.push(c.feature_key);
  else mapped.push(c.feature_key);
}

console.log(`✅ ${mapped.length} mapeadas para LLM real`);
console.log(`⚪ ${operational.length} operacionais (no_llm)`);
console.log(`📊 Total ativas: ${(costs ?? []).length}`);

if (missing.length > 0) {
  console.error(`\n❌ ${missing.length} feature(s) SEM mapeamento:`);
  missing.forEach(k => console.error(`   - ${k}`));
  console.error("\nDefina em /admin/pricing → Tabela de Preços ou rode uma migration de seed.");
  process.exit(1);
}

console.log("\n🟢 Mapeamento completo.");
