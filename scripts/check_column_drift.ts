// check_column_drift.ts — Compara as colunas de cada tabela entre o schema real
// (src/integrations/supabase/types.ts) e o destino, detectando DRIFT DE COLUNA
// (colunas que existem na origem mas faltam no destino).
//
//   bun run scripts/check_column_drift.ts

import { readFileSync } from "node:fs";

const REF = "tdyvuomybimgygjgvnrk";
const types = readFileSync("src/integrations/supabase/types.ts", "utf8");
const env = readFileSync(".env", "utf8");
const token = (env.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m) || [])[1]?.trim();
const lines = types.split("\n");

// Extrai { tabela: [colunas] } da seção Tables (bloco Row de cada tabela)
function tablesFromTypes(): Record<string, string[]> {
  const res: Record<string, string[]> = {};
  let inTables = false, cur: string | null = null, inRow = false;
  for (const l of lines) {
    if (/^    Tables: \{/.test(l)) inTables = true;
    if (/^    Views: \{/.test(l)) inTables = false;
    if (!inTables) continue;
    const m = l.match(/^      ([a-zA-Z0-9_]+): \{$/);
    if (m) { cur = m[1]; res[cur] = []; inRow = false; continue; }
    if (cur && /^        Row: \{/.test(l)) { inRow = true; continue; }
    if (inRow) {
      if (/^        \}/.test(l)) { inRow = false; continue; }
      const cm = l.match(/^          ([a-zA-Z0-9_]+):/);
      if (cm) res[cur].push(cm[1]);
    }
  }
  return res;
}

const real = tablesFromTypes();

const resp = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "select table_name, array_agg(column_name) as cols from information_schema.columns where table_schema='public' group by table_name",
  }),
});
const rows = (await resp.json()) as Array<{ table_name: string; cols: string[] }>;
const dest: Record<string, string[]> = {};
for (const r of rows) dest[r.table_name] = r.cols;

let totalMissing = 0, tablesWithDrift = 0, missingTables = 0;
for (const [t, cols] of Object.entries(real)) {
  const d = dest[t];
  if (!d) { console.log(`[TABELA AUSENTE no destino] ${t}`); missingTables++; continue; }
  const missing = cols.filter((c) => !d.includes(c));
  if (missing.length) {
    totalMissing += missing.length; tablesWithDrift++;
    console.log(`${t}: faltam ${missing.length} -> ${missing.join(", ")}`);
  }
}
console.error(`\nTabelas com drift de coluna: ${tablesWithDrift} | colunas faltantes: ${totalMissing} | tabelas ausentes: ${missingTables}`);
