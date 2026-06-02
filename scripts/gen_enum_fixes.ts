// gen_enum_fixes.ts — Detecta drift de VALORES de enum (valores que existem no
// banco real, refletido no `Constants` de types.ts, mas faltam no destino) e
// emite os ALTER TYPE ADD VALUE necessários.
//
//   bun run scripts/gen_enum_fixes.ts            # imprime o SQL
//
// Lê o token do .env e consulta o destino via query API (HTTPS), contornando
// o DNS intermitente do banco.

import { readFileSync } from "node:fs";

const REF = "tdyvuomybimgygjgvnrk";
const types = readFileSync("src/integrations/supabase/types.ts", "utf8");
const env = readFileSync(".env", "utf8");
const token = (env.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m) || [])[1]?.trim();

// 1) Enums reais — seção `export const Constants` (arrays de strings)
const ci = types.indexOf("export const Constants");
const section = ci >= 0 ? types.slice(ci) : types;
const realEnums: Record<string, string[]> = {};
const re = /^      ([a-z_][a-z0-9_]*): \[([\s\S]*?)\],/gm;
let m: RegExpExecArray | null;
while ((m = re.exec(section)) !== null) {
  const name = m[1];
  const vals = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  if (vals.length) realEnums[name] = vals;
}

// 2) Enums no destino (via query API)
const resp = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query:
      "select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as vals from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typtype='e' group by t.typname",
  }),
});
const rows = (await resp.json()) as Array<{ name: string; vals: string[] }>;
const destEnums: Record<string, string[]> = {};
for (const r of rows) destEnums[r.name] = r.vals;

// 3) Diff -> ALTER TYPE ADD VALUE
let out = "-- Fix de drift de VALORES de enum (gerado: types.ts real vs destino)\n";
let count = 0;
for (const [name, vals] of Object.entries(realEnums)) {
  const dest = destEnums[name];
  if (!dest) {
    console.error(`!! enum ausente no destino (nao e drift de valor): ${name}`);
    continue;
  }
  for (const v of vals) {
    if (!dest.includes(v)) {
      out += `alter type public.${name} add value if not exists '${v.replace(/'/g, "''")}';\n`;
      count++;
    }
  }
}
console.log(out);
console.error(`Valores de enum faltando no destino: ${count}`);
