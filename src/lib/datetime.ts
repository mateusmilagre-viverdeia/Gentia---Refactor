/**
 * Helpers de data/hora padronizados para o fuso de Brasília (America/Sao_Paulo).
 *
 * REGRA: nunca use `format` do `date-fns` direto em componentes para exibir
 * datas. Sempre use `formatBRT` / `formatBRTRelative` daqui, para garantir
 * que todos os usuários vejam horários no fuso de Brasília independentemente
 * do fuso do navegador.
 *
 * Armazenamento continua em UTC (timestamptz no Postgres). Esses helpers
 * só afetam EXIBIÇÃO e filtros de intervalo.
 */
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { formatDistanceToNow, formatDistanceToNowStrict, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const BRT_TZ = "America/Sao_Paulo";

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formata uma data no fuso de Brasília usando padrões do date-fns.
 * Aceita Date, string ISO, timestamp ou null/undefined (retorna fallback).
 */
export function formatBRT(
  value: DateInput,
  pattern = "dd/MM/yyyy HH:mm",
  fallback = "—"
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return formatInTimeZone(d, BRT_TZ, pattern, { locale: ptBR });
}

/** Atalho para data curta (dd/MM/yyyy). */
export function formatBRTDate(value: DateInput, fallback = "—") {
  return formatBRT(value, "dd/MM/yyyy", fallback);
}

/** Atalho para data+hora curta (dd/MM HH:mm). */
export function formatBRTShort(value: DateInput, fallback = "—") {
  return formatBRT(value, "dd/MM HH:mm", fallback);
}

/** Atalho para data longa por extenso ("12 de março de 2025"). */
export function formatBRTLong(value: DateInput, fallback = "—") {
  return formatBRT(value, "dd 'de' MMMM 'de' yyyy", fallback);
}

/** Distância relativa em pt-BR ("há 3 horas"). */
export function formatBRTRelative(value: DateInput, fallback = "—") {
  const d = toDate(value);
  if (!d) return fallback;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function formatBRTRelativeStrict(value: DateInput, fallback = "—") {
  const d = toDate(value);
  if (!d) return fallback;
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: ptBR });
}

/**
 * "Agora" no calendário de Brasília como um Date.
 * Útil para comparações lógicas como "é hoje?".
 */
export function nowBRT(): Date {
  return toZonedTime(new Date(), BRT_TZ);
}

/**
 * Converte uma data (qualquer fuso) para o início do dia em Brasília,
 * retornando o instante UTC equivalente. Use em filtros tipo "últimos 30 dias".
 */
export function startOfDayBRT(value: DateInput): Date {
  const d = toDate(value) ?? new Date();
  const zoned = toZonedTime(d, BRT_TZ);
  const localStart = startOfDay(zoned);
  return fromZonedTime(localStart, BRT_TZ);
}

/** Fim do dia em Brasília (instante UTC equivalente). */
export function endOfDayBRT(value: DateInput): Date {
  const d = toDate(value) ?? new Date();
  const zoned = toZonedTime(d, BRT_TZ);
  const localEnd = endOfDay(zoned);
  return fromZonedTime(localEnd, BRT_TZ);
}

/**
 * Converte um Date para um instante UTC interpretando-o como wall-clock
 * de Brasília. Útil para inputs do tipo date-only.
 */
export function brtWallClockToUtc(value: DateInput): Date | null {
  const d = toDate(value);
  if (!d) return null;
  return fromZonedTime(d, BRT_TZ);
}

export { ptBR };
