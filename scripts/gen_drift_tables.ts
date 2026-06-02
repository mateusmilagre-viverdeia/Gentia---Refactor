// gen_drift_tables.ts — Gera DDL (CREATE TABLE + ALTER ADD COLUMN idempotentes)
// para as tabelas em "schema drift": existem no banco real (refletido em
// src/integrations/supabase/types.ts) mas nenhuma migration as cria.
//
// Fonte da verdade: o bloco `Row` de cada tabela em types.ts.
// Mapeamento de tipos TS -> SQL (aproximado, suficiente para destravar o replay
// e receber os dados; defaults/constraints finos podem ser refinados depois).
//
//   deno run --allow-read --allow-write scripts/gen_drift_tables.ts
//
// Saída: imprime o SQL no stdout.

import { readFileSync } from "node:fs";

const TYPES_PATH = "src/integrations/supabase/types.ts";

// Tabelas em drift (saída do diagnóstico types.ts vs migrations).
const DRIFT_TABLES = [
  "ep_partners",
  "partner_client_grants",
  "partner_licenses",
  "partner_royalties",
  "platform_seat_pricing",
  "platform_subscription_plans",
  "promo_code_redemptions",
  "recruitment_headcount_plan",
  "recruitment_package_features",
  "recruitment_source_spend",
  "whatsapp_message_logs",
];

const src = readFileSync(TYPES_PATH, "utf8");
const lines = src.split("\n");

function extractRow(table: string): Array<[string, string]> {
  const cols: Array<[string, string]> = [];
  let i = lines.findIndex((l) => l === `      ${table}: {`);
  if (i < 0) {
    console.error(`!! tabela não encontrada em types.ts: ${table}`);
    return cols;
  }
  // avança até "Row: {"
  while (i < lines.length && !/^        Row: \{/.test(lines[i])) i++;
  i++; // primeira coluna
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (/^        \}/.test(l)) break; // fecha o Row
    const m = l.match(/^\s*([a-zA-Z0-9_]+)\??:\s*(.+?)\s*$/);
    if (m) cols.push([m[1], m[2]]);
  }
  return cols;
}

function sqlType(col: string, tsType: string): string {
  const nullable = /\|\s*null/.test(tsType);
  let base = tsType.replace(/\|\s*null/g, "").trim();
  const isArray = base.endsWith("[]");
  if (isArray) base = base.slice(0, -2).trim();
  let t: string;
  if (base === "boolean") t = "boolean";
  else if (base === "number") t = "numeric";
  else if (base === "Json") t = "jsonb";
  else if (base === "string") {
    if (col === "id" || col.endsWith("_id") || col.endsWith("_by")) t = "uuid";
    else if (col.endsWith("_at")) t = "timestamptz";
    else if (col.endsWith("_date")) t = "date";
    else t = "text";
  } else t = "text"; // enums e outros -> text (compatível)
  if (isArray) t = t + "[]";
  return t + (nullable ? "" : " not null");
}

let out = `-- ============================================================================
-- FIX DE SCHEMA DRIFT (consolidado) — gerado de types.ts (estado real da origem)
-- 11 tabelas que existem no banco real mas nenhuma migration cria.
-- CREATE TABLE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS = idempotente
-- (cobre tanto criação do zero quanto tabelas já criadas parcialmente nos fixes).
-- Tipos inferidos de types.ts; defaults/FKs finos a refinar na fase de dados.
-- ============================================================================
\n`;

for (const table of DRIFT_TABLES) {
  const cols = extractRow(table);
  if (cols.length === 0) continue;
  const colDefs = cols.map(([c, t]) => {
    let def = `  ${c} ${sqlType(c, t)}`;
    if (c === "id") def = `  id uuid primary key default gen_random_uuid()`;
    else if (c === "created_at") def = `  created_at timestamptz default now()`;
    return def;
  });
  out += `create table if not exists public.${table} (\n${colDefs.join(",\n")}\n);\n`;
  // ALTERs idempotentes para tabelas já criadas parcialmente
  for (const [c, t] of cols) {
    if (c === "id") continue;
    const typeOnly = sqlType(c, t).replace(/ not null$/, "");
    out += `alter table public.${table} add column if not exists ${c} ${typeOnly};\n`;
  }
  out += `alter table public.${table} enable row level security;\n\n`;
}

console.log(out);
