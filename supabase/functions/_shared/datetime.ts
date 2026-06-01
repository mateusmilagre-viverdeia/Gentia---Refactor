/**
 * Helpers de data/hora para edge functions (Deno).
 * Fuso padrão: America/Sao_Paulo (Brasília).
 *
 * Use em e-mails, mensagens WhatsApp, relatórios e qualquer string
 * voltada ao usuário final. Banco continua em UTC.
 */

export const BRT_TZ = "America/Sao_Paulo";

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formata uma data no fuso de Brasília usando Intl.DateTimeFormat.
 * `style` controla o preset; para padrões customizados, use `formatBRTParts`.
 */
export function formatBRT(
  value: DateInput,
  style: "short" | "long" | "datetime" | "time" | "date" = "datetime",
  fallback = "—",
): string {
  const d = toDate(value);
  if (!d) return fallback;

  const options: Intl.DateTimeFormatOptions = (() => {
    switch (style) {
      case "short":
        return { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
      case "long":
        return { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
      case "time":
        return { hour: "2-digit", minute: "2-digit" };
      case "date":
        return { day: "2-digit", month: "2-digit", year: "numeric" };
      case "datetime":
      default:
        return {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        };
    }
  })();

  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: BRT_TZ }).format(d);
}

/** Retorna os componentes da data já no fuso de Brasília. */
export function formatBRTParts(value: DateInput) {
  const d = toDate(value) ?? new Date();
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}
