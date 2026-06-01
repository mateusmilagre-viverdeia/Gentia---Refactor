/**
 * Sanitiza e valida um jobId vindo da URL pública.
 *
 * Cobre os principais sintomas que causam falsos "Vaga não encontrada":
 *  - URL truncada no WhatsApp/e-mail (id parcial ou vazio)
 *  - Espaços, %20, quebras de linha ou aspas coladas no copy/paste
 *  - Query string ou fragmento (#…) misturados com o id
 *
 * Retorna o UUID limpo se válido, ou null caso contrário.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeJobId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let value = String(raw);

  try {
    value = decodeURIComponent(value);
  } catch {
    /* ignore malformed encoding */
  }

  // Remove query/fragment se vier colado
  value = value.split("?")[0].split("#")[0];
  // Remove aspas, espaços e caracteres invisíveis
  value = value.replace(/["'`\s\u200B-\u200D\uFEFF]/g, "");
  value = value.trim().toLowerCase();

  if (!UUID_REGEX.test(value)) return null;
  return value;
}

export type JobLookupErrorKind = "invalid_link" | "job_closed" | "not_found";
