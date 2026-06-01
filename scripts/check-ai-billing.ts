#!/usr/bin/env -S deno run --allow-read
/**
 * AI Billing Guardrail — Recrutamento & Seleção
 *
 * Enforces credit billing ONLY for edge functions that serve the
 * Recrutamento & Seleção module (/atracao-contratacao/recrutamento).
 *
 * Demais módulos do produto (Cultura, Retenção, Atração — códigos/missão/visão/
 * valores, Rituais, Pulse/Surveys, Propostas, NPS, Help, ferramentas internas
 * de consultoria) NÃO debitam créditos por decisão de produto e ficam fora de
 * escopo deste check.
 *
 * Uso:
 *   deno run --allow-read scripts/check-ai-billing.ts
 *   bun run check:ai-billing
 *
 * Como adicionar uma nova função R&S:
 *   1. Adicione o nome (ou prefixo) em RECRUITMENT_SCOPE abaixo.
 *   2. Garanta que a função use `consumeAICredits` (preferencial, em
 *      `_shared/ai-credit-consumption.ts`) ou `supabase.rpc('consume_credits', ...)`.
 *   3. Rode `bun run check:ai-billing` — exit 0 = OK.
 *
 * Exit codes:
 *   0 — nenhuma função R&S com chamada de IA sem billing
 *   1 — uma ou mais funções R&S chamam IA sem debitar créditos
 */

import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.224.0/path/mod.ts";

const FUNCTIONS_DIR = "supabase/functions";
const IGNORED_DIRS = new Set<string>(["_shared", "_tests", "_templates"]);

// Funções que pertencem ao módulo R&S e precisam debitar créditos.
const RECRUITMENT_PREFIXES = [
  "recruitment-",
  "hunting-",
  "candidate-",
  "careers-",
  "culture-interview-", // entrevista cultural do candidato (NÃO culture code de empresa)
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

// Exceções LEGÍTIMAS dentro do escopo R&S — não debitam diretamente porque o
// billing ocorre em outra função correlata (ex.: *-complete cobra a sessão).
const RECRUITMENT_BILLING_EXEMPT = new Set<string>([
  "agent-test-realtime", // Exclusivo Super Admin; sem cobrança.
  "openai-realtime-session", // Apenas emite ephemeral token; billing em *-complete.
  "start-culture-session", // Idem.
  "start-technical-session", // Idem.
  "technical-interview-session", // Idem.
  "interview-watchdog", // Billing via helper interno chargeRealtimeWatchdog.
  "hunting-demo-seed", // Popula dados demo de hunting; não consome créditos do cliente.
]);

function isInRecruitmentScope(fnName: string): boolean {
  if (RECRUITMENT_NAMES.has(fnName)) return true;
  return RECRUITMENT_PREFIXES.some((p) => fnName.startsWith(p));
}

// Padrões que indicam chamada a provedor de IA.
const AI_PATTERNS: RegExp[] = [
  /api\.openai\.com/,
  /generativelanguage\.googleapis\.com/,
  /api\.anthropic\.com/,
  /ai\.gateway\.lovable\.dev/,
  /\bnew\s+OpenAI\s*\(/,
];

// Padrões aceitos como prova de billing.
const BILLING_PATTERNS: RegExp[] = [
  /from\s+['"][^'"]*_shared\/ai-credit-consumption(\.ts)?['"]/,
  /\bconsumeAICredits\s*\(/,
  /\.rpc\(\s*['"]consume_credits['"]/,
];

type Violation = { fn: string; file: string; matches: string[] };

const violations: Violation[] = [];
let scanned = 0;
let inScope = 0;
let aiCallers = 0;
let exempt = 0;

for await (const entry of walk(FUNCTIONS_DIR, { exts: [".ts"], includeDirs: false })) {
  const rel = relative(".", entry.path);
  const parts = rel.split("/");
  if (parts.length < 4) continue;
  const fnName = parts[2];
  if (IGNORED_DIRS.has(fnName)) continue;
  scanned++;

  if (!isInRecruitmentScope(fnName)) continue;
  inScope++;

  const content = await Deno.readTextFile(entry.path);

  const hits: string[] = [];
  for (const pat of AI_PATTERNS) {
    const m = content.match(pat);
    if (m) hits.push(m[0]);
  }
  if (hits.length === 0) continue;
  aiCallers++;

  if (RECRUITMENT_BILLING_EXEMPT.has(fnName)) {
    exempt++;
    continue;
  }

  if (BILLING_PATTERNS.some((p) => p.test(content))) continue;

  violations.push({ fn: fnName, file: rel, matches: [...new Set(hits)] });
}

console.log(
  `Scanned ${scanned} edge function files | ${inScope} in R&S scope | ` +
    `${aiCallers} R&S functions call AI | ${exempt} exempt (session-start/watchdog).`,
);

if (violations.length === 0) {
  console.log("✅ AI billing guardrail OK — every R&S AI caller debits credits.");
  Deno.exit(0);
}

console.error(
  `\n❌ ${violations.length} R&S function(s) call AI providers without debiting credits:\n`,
);
for (const v of violations) {
  console.error(`  • ${v.fn}`);
  console.error(`      file:    ${v.file}`);
  console.error(`      matched: ${v.matches.join(", ")}`);
}
console.error(
  `\nFix options:\n` +
    `  • Instrument: import { consumeAICredits } from "../_shared/ai-credit-consumption.ts"\n` +
    `    (or call supabase.rpc('consume_credits', { ... }) directly).\n` +
    `  • If the function is NOT actually part of Recrutamento & Seleção, remove it from\n` +
    `    RECRUITMENT_PREFIXES / RECRUITMENT_NAMES in scripts/check-ai-billing.ts.\n` +
    `  • If it is R&S but billing happens in a sibling function, add it to\n` +
    `    RECRUITMENT_BILLING_EXEMPT with a justifying comment.\n`,
);
Deno.exit(1);
