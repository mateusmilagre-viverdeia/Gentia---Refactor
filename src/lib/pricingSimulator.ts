/**
 * Simulador 100% client-side de cobrança de feature.
 * Calcula créditos consumidos, R$ cobrado do cliente, custo LLM real e margem.
 */
import {
  ALL_MODELS,
  findModel,
  tokenCostUsd,
  usdPerMinute,
  type ModelPricing,
} from './pricingCalculator';

export interface SimulatorPlan {
  id: string;
  name: string;
  /** R$ por crédito do plano (Pro 1–6) ou fallback global. */
  creditValueBrl: number;
  /** Quantos créditos vêm no plano por mês. */
  monthlyCredits?: number;
  /** Preço do plano por mês (R$). */
  monthlyPriceBrl?: number;
}

export interface SimulatorFeature {
  feature_key: string;
  description: string;
  /** Créditos por unidade (cr/min ou cr/uso). Vem de `recruitment_credit_costs.credits_per_use`. */
  creditsPerUse: number;
  /** Unidade ('minuto', 'per_use', etc.). */
  usageUnit: string;
  /** Modelo LLM mapeado (vem de feature_llm_mapping). */
  model?: ModelPricing | null;
  /** Tokens médios — para features não-voz. */
  avgTokensInput?: number | null;
  avgTokensOutput?: number | null;
}

export interface SimulationInput {
  plan: SimulatorPlan;
  feature: SimulatorFeature;
  /** Quantidade (minutos para voz, número de usos para LLM). */
  quantity: number;
  /** Cotação USD→BRL e margem (vêm de platform_credit_config). */
  usdToBrl: number;
  marginPercent: number;
}

export interface SimulationResult {
  credits: number;
  /** R$ que será debitado do cliente (créditos × R$/crédito do plano). */
  brlCharged: number;
  /** Custo bruto em USD pago ao provedor LLM. */
  realCostUsd: number;
  /** Custo bruto em R$ (USD × câmbio, SEM margem). */
  realCostBrl: number;
  /** Lucro bruto (brlCharged - realCostBrl). */
  marginBrl: number;
  /** % de margem sobre o custo. (brlCharged / realCostBrl - 1) × 100. */
  marginPct: number | null;
  /** R$/unidade cobrado (R$/min para voz, R$/uso para LLM). */
  brlPerUnit: number;
  /** Texto humano explicando o cálculo. */
  breakdown: string;
}

export function simulateFeatureCost(input: SimulationInput): SimulationResult {
  const { plan, feature, quantity, usdToBrl, marginPercent } = input;
  const qty = Math.max(quantity, 0);

  // 1) créditos consumidos = tabela
  const credits = Math.max(Math.round(feature.creditsPerUse * qty * 10) / 10, 0.1);

  // 2) R$ cobrado do cliente = créditos × R$/crédito do plano
  const brlCharged = credits * plan.creditValueBrl;

  // 3) Custo LLM real
  let realCostUsd = 0;
  let breakdown = `${feature.description}\n`;
  breakdown += `  Tabela: ${qty} ${feature.usageUnit} × ${feature.creditsPerUse} cr = ${credits} cr\n`;
  breakdown += `  Cobrado: ${credits} cr × R$ ${plan.creditValueBrl.toFixed(3)} (${plan.name}) = R$ ${brlCharged.toFixed(2)}\n`;

  if (feature.model) {
    if (feature.model.category === 'realtime_audio') {
      // Voz: usdPerMinute × minutos
      const perMin = usdPerMinute(feature.model);
      realCostUsd = perMin * qty;
      breakdown += `  Custo real: ${qty.toFixed(1)}min × $${perMin.toFixed(4)}/min (${feature.model.model}) = $${realCostUsd.toFixed(4)}\n`;
    } else if (feature.model.category === 'duration' || feature.model.category === 'whisper') {
      realCostUsd = feature.model.inputUsdPer1M * qty;
      breakdown += `  Custo real: ${qty.toFixed(1)}min × $${feature.model.inputUsdPer1M.toFixed(4)}/min (${feature.model.model}) = $${realCostUsd.toFixed(4)}\n`;
    } else {
      // Texto/embedding: tokens médios × qty
      const avgIn = (feature.avgTokensInput || 0) * qty;
      const avgOut = (feature.avgTokensOutput || 0) * qty;
      realCostUsd = tokenCostUsd(feature.model, avgIn, avgOut);
      breakdown += `  Custo real: ${avgIn.toFixed(0)} tok in + ${avgOut.toFixed(0)} tok out (${feature.model.model}) = $${realCostUsd.toFixed(4)}\n`;
    }
  } else {
    breakdown += `  Custo real: modelo não mapeado — sem dado de LLM\n`;
  }

  const realCostBrl = realCostUsd * usdToBrl;
  const marginBrl = brlCharged - realCostBrl;
  const marginPct = realCostBrl > 0 ? (marginBrl / realCostBrl) * 100 : null;
  const brlPerUnit = qty > 0 ? brlCharged / qty : 0;

  breakdown += `  Custo BRL: $${realCostUsd.toFixed(4)} × ${usdToBrl.toFixed(2)} = R$ ${realCostBrl.toFixed(2)}\n`;
  breakdown += `  Margem: R$ ${marginBrl.toFixed(2)} (${marginPct !== null ? marginPct.toFixed(0) + '%' : '—'})\n`;
  breakdown += `  Margem-alvo da plataforma: ${marginPercent}%`;

  return {
    credits,
    brlCharged,
    realCostUsd,
    realCostBrl,
    marginBrl,
    marginPct,
    brlPerUnit,
    breakdown,
  };
}

/** Helper: monta SimulatorFeature combinando credit_cost + mapping. */
export function buildSimulatorFeature(args: {
  feature_key: string;
  description?: string | null;
  credits_per_use: number;
  usage_unit: string;
  mapping?: { model_id: string; avg_tokens_input?: number | null; avg_tokens_output?: number | null } | null;
}): SimulatorFeature {
  const model = args.mapping?.model_id ? findModel(args.mapping.model_id) : null;
  return {
    feature_key: args.feature_key,
    description: args.description || args.feature_key,
    creditsPerUse: args.credits_per_use,
    usageUnit: args.usage_unit,
    model: model ?? null,
    avgTokensInput: args.mapping?.avg_tokens_input ?? null,
    avgTokensOutput: args.mapping?.avg_tokens_output ?? null,
  };
}

export const SELECTABLE_MODELS = ALL_MODELS.filter(m => m.category !== 'duration');
