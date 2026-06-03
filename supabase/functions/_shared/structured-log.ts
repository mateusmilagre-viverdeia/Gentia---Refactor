// structured-log.ts — logging estruturado (JSON) para edge functions (Frente B).
//
// Diferença para o logger.ts existente: aquele formata TEXTO e SILENCIA em
// produção (exceto error). Este emite uma linha JSON por EVENTO operacional,
// SEMPRE (inclusive em prod), para ser parseado por Log Drains (Supabase Pro →
// Datadog/Logflare/etc.) e por queries de log.
//
// Regra de ouro: NUNCA logar PII (nome, e-mail, telefone, CV, conteúdo de
// mensagens). Logar identificadores (account_id, job_id), métricas (duration_ms,
// tokens) e status. Para mensagens de erro, logar e.message — não o payload.
//
// Uso:
//   import { fnLogger } from "../_shared/structured-log.ts";
//   const log = fnLogger("generate-job-description");
//   const t0 = Date.now();
//   log.info("start", { account_id });
//   ...
//   log.info("done", { account_id, duration_ms: Date.now() - t0, tokens });
//   // no catch:
//   log.error("failed", { account_id, error: (e as Error).message });

type Level = "debug" | "info" | "warn" | "error";

export interface LogFields {
  account_id?: string;
  duration_ms?: number;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

function emit(level: Level, fn: string, event: string, fields: LogFields): void {
  // Uma linha JSON — fácil de parsear/filtrar em log drains.
  const line = JSON.stringify({ ts: new Date().toISOString(), level, fn, event, ...fields });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

/** Cria um logger ligado ao nome da função. */
export function fnLogger(fn: string) {
  return {
    debug: (event: string, fields: LogFields = {}) => emit("debug", fn, event, fields),
    info: (event: string, fields: LogFields = {}) => emit("info", fn, event, fields),
    warn: (event: string, fields: LogFields = {}) => emit("warn", fn, event, fields),
    error: (event: string, fields: LogFields = {}) => emit("error", fn, event, fields),
  };
}

export type FnLogger = ReturnType<typeof fnLogger>;
