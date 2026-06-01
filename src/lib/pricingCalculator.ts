/**
 * Shared pricing calculator.
 *
 * MODEL TOKEN PRICES ARE HARDCODED HERE (mirrors `supabase/functions/_shared/ai-credit-consumption.ts`).
 * To change a model price, update BOTH this file and the edge function file via PR/code review.
 * Reason: token rates rarely change, and a typo here breaks billing for every account.
 *
 * `lastReviewedAt` (YYYY-MM-DD) deve ser atualizado a cada revisão manual contra a tabela oficial do provedor.
 * O cron `monitor-llm-pricing` lê esses valores e dispara alerta se o provedor publicou número diferente.
 *
 * Variables that ARE editable by super admin (via UI):
 *   - usd_to_brl (platform_credit_config)
 *   - margin_percent (platform_credit_config)
 *   - price_per_credit_cents per Pro 1-6 package (recruitment_credit_packages)
 *   - model assigned to each feature (feature_llm_mapping)
 */

export type ModelCategory = 'realtime_audio' | 'text' | 'embedding' | 'whisper' | 'duration';

export interface ModelPricing {
  model: string;
  category: ModelCategory;
  /** USD per 1M tokens (input). For duration/whisper models: USD per minute (input field reused). */
  inputUsdPer1M: number;
  /** USD per 1M tokens (output). 0 for embedding/duration models. */
  outputUsdPer1M: number;
  /** Optional notes shown in admin UI. */
  notes?: string;
  /** Last manual review against provider's public pricing page (YYYY-MM-DD). */
  lastReviewedAt?: string;
  /** Provider's public pricing page (used by `monitor-llm-pricing` cron). */
  providerPricingUrl?: string;
}

const OPENAI_PRICING_URL = 'https://platform.openai.com/docs/pricing';
const GEMINI_PRICING_URL = 'https://ai.google.dev/pricing';
const ANTHROPIC_PRICING_URL = 'https://www.anthropic.com/pricing';
const PERPLEXITY_PRICING_URL = 'https://docs.perplexity.ai/guides/pricing';
const DEFAULT_REVIEW_DATE = '2025-12-01';

/** Token-based models (text + embeddings). Mirrors MODEL_RATES in edge function. */
export const TOKEN_MODELS: ModelPricing[] = [
  // Gemini
  { model: 'google/gemini-2.5-flash-lite', category: 'text', inputUsdPer1M: 0.10, outputUsdPer1M: 0.40, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-2.5-flash', category: 'text', inputUsdPer1M: 0.30, outputUsdPer1M: 2.50, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-2.5-pro', category: 'text', inputUsdPer1M: 1.25, outputUsdPer1M: 10.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-3-flash-preview', category: 'text', inputUsdPer1M: 0.50, outputUsdPer1M: 3.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-3.1-flash-lite-preview', category: 'text', inputUsdPer1M: 0.10, outputUsdPer1M: 0.40, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-3.1-pro-preview', category: 'text', inputUsdPer1M: 1.25, outputUsdPer1M: 10.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-3.1-flash-image-preview', category: 'text', inputUsdPer1M: 0.50, outputUsdPer1M: 3.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  // OpenAI
  { model: 'openai/gpt-5-nano', category: 'text', inputUsdPer1M: 0.05, outputUsdPer1M: 0.40, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/gpt-5-mini', category: 'text', inputUsdPer1M: 0.25, outputUsdPer1M: 2.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/gpt-5', category: 'text', inputUsdPer1M: 1.25, outputUsdPer1M: 10.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/gpt-5.2', category: 'text', inputUsdPer1M: 1.50, outputUsdPer1M: 12.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  // Anthropic
  { model: 'claude-sonnet-4-5', category: 'text', inputUsdPer1M: 3.00, outputUsdPer1M: 15.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: ANTHROPIC_PRICING_URL },
  { model: 'claude-opus-4', category: 'text', inputUsdPer1M: 15.00, outputUsdPer1M: 75.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: ANTHROPIC_PRICING_URL },
  // Perplexity
  { model: 'perplexity/sonar-pro', category: 'text', inputUsdPer1M: 3.00, outputUsdPer1M: 15.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: PERPLEXITY_PRICING_URL },
  { model: 'perplexity/sonar', category: 'text', inputUsdPer1M: 1.00, outputUsdPer1M: 1.00, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: PERPLEXITY_PRICING_URL },
  // Embeddings
  { model: 'openai/text-embedding-3-small', category: 'embedding', inputUsdPer1M: 0.02, outputUsdPer1M: 0, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/text-embedding-3-large', category: 'embedding', inputUsdPer1M: 0.13, outputUsdPer1M: 0, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'google/text-embedding-004', category: 'embedding', inputUsdPer1M: 0.025, outputUsdPer1M: 0, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
  { model: 'google/gemini-embedding-001', category: 'embedding', inputUsdPer1M: 0.025, outputUsdPer1M: 0, lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: GEMINI_PRICING_URL },
];

/** Realtime audio models — billed per audio token. Mirrors REALTIME_AUDIO_RATES. */
export const REALTIME_AUDIO_MODELS: ModelPricing[] = [
  {
    model: 'openai/gpt-realtime-mini',
    category: 'realtime_audio',
    inputUsdPer1M: 10.00,
    outputUsdPer1M: 20.00,
    notes: 'Áudio: $10/$20 por 1M tokens. Texto (system prompt + tools): $0,60/$2,40 por 1M.',
    lastReviewedAt: DEFAULT_REVIEW_DATE,
    providerPricingUrl: OPENAI_PRICING_URL,
  },
];

/** Duration-based fallback rates (USD per minute). Used only when token telemetry is missing. */
export const DURATION_MODELS: ModelPricing[] = [
  { model: 'openai/whisper-1', category: 'whisper', inputUsdPer1M: 0.006, outputUsdPer1M: 0, notes: 'USD/min (transcrição).', lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/gpt-4o-realtime-preview', category: 'duration', inputUsdPer1M: 0.30, outputUsdPer1M: 0, notes: 'USD/min (fallback se sem tokens).', lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/gpt-4o-mini-realtime-preview', category: 'duration', inputUsdPer1M: 0.10, outputUsdPer1M: 0, notes: 'USD/min (fallback).', lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
  { model: 'openai/gpt-realtime-mini', category: 'duration', inputUsdPer1M: 0.10, outputUsdPer1M: 0, notes: 'USD/min (fallback: ~10 tok/s in + ~20 tok/s out blended).', lastReviewedAt: DEFAULT_REVIEW_DATE, providerPricingUrl: OPENAI_PRICING_URL },
];

export const ALL_MODELS: ModelPricing[] = [...REALTIME_AUDIO_MODELS, ...TOKEN_MODELS, ...DURATION_MODELS];

/** Lookup helper used by simulator + admin UI. */
export function findModel(modelId: string, category?: ModelCategory): ModelPricing | undefined {
  return ALL_MODELS.find(m => m.model === modelId && (!category || m.category === category));
}

export interface PricingConfig {
  usdToBrl: number;
  marginPercent: number;
  /** R$ por crédito (do pacote Pro da conta, ou fallback global). */
  creditValueBrl: number;
}

/**
 * Estimate cost (in credits) of a gpt-realtime-mini voice interview of N minutes.
 * Assumes ~10 input audio tok/s + ~20 output audio tok/s blended (real OpenAI averages: 1 tok / 100ms in, 1 tok / 50ms out).
 */
export function estimateVoiceInterviewCredits(minutes: number, config: PricingConfig): {
  costUsd: number;
  costBrl: number;
  credits: number;
} {
  const seconds = minutes * 60;
  const inputTokens = seconds * 10;
  const outputTokens = seconds * 20;
  const rates = REALTIME_AUDIO_MODELS[0]; // gpt-realtime-mini
  const costUsd =
    (inputTokens * rates.inputUsdPer1M / 1_000_000) +
    (outputTokens * rates.outputUsdPer1M / 1_000_000);
  const costBrl = costUsd * config.usdToBrl * (1 + config.marginPercent / 100);
  const credits = Math.max(Math.round((costBrl / config.creditValueBrl) * 10) / 10, 0.1);
  return { costUsd, costBrl, credits };
}

/**
 * Inverse: how many minutes of voice interview a given credit budget buys.
 */
export function estimateMinutesPerCredits(credits: number, config: PricingConfig): number {
  if (credits <= 0) return 0;
  let lo = 0, hi = 10000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const { credits: c } = estimateVoiceInterviewCredits(mid, config);
    if (c > credits) hi = mid; else lo = mid;
  }
  return Math.round(lo);
}

/** USD/min displayed for a model in the admin read-only table. */
export function usdPerMinute(m: ModelPricing): number {
  if (m.category === 'realtime_audio') {
    return (10 * 60 * m.inputUsdPer1M / 1_000_000) + (20 * 60 * m.outputUsdPer1M / 1_000_000);
  }
  if (m.category === 'duration' || m.category === 'whisper') {
    return m.inputUsdPer1M; // already per minute
  }
  return 0;
}

/** Compute real LLM cost (USD) for a token-based feature using avg tokens. */
export function tokenCostUsd(m: ModelPricing, avgIn: number, avgOut: number): number {
  return (avgIn * m.inputUsdPer1M / 1_000_000) + (avgOut * m.outputUsdPer1M / 1_000_000);
}

/** Days since YYYY-MM-DD review date. */
export function daysSinceReview(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00Z').getTime();
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86400000);
}
