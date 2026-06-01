/**
 * Shared utility for dynamic AI credit consumption.
 * Calculates cost based on actual token usage (or audio/duration for Whisper/Realtime/Embeddings),
 * applies margin, and debits credits. Minimum: 0.1 credits per operation.
 */

// Token-based rates (USD per token) — input/output
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  // Gemini
  'google/gemini-2.5-flash-lite': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  'google/gemini-2.5-flash': { input: 0.30 / 1_000_000, output: 2.50 / 1_000_000 },
  'google/gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 10.00 / 1_000_000 },
  'google/gemini-3-flash-preview': { input: 0.50 / 1_000_000, output: 3.00 / 1_000_000 },
  'google/gemini-3.1-flash-lite-preview': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  'google/gemini-3.1-pro-preview': { input: 1.25 / 1_000_000, output: 10.00 / 1_000_000 },
  'google/gemini-3.1-flash-image-preview': { input: 0.50 / 1_000_000, output: 3.00 / 1_000_000 },
  // OpenAI
  'openai/gpt-5-nano': { input: 0.05 / 1_000_000, output: 0.40 / 1_000_000 },
  'openai/gpt-5-mini': { input: 0.25 / 1_000_000, output: 2.00 / 1_000_000 },
  'openai/gpt-5': { input: 1.25 / 1_000_000, output: 10.00 / 1_000_000 },
  'openai/gpt-5.2': { input: 1.50 / 1_000_000, output: 12.00 / 1_000_000 },
  // Anthropic
  'claude-sonnet-4-5': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'claude-opus-4': { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
  // Perplexity (sonar-pro: includes search cost approximation)
  'perplexity/sonar-pro': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'perplexity/sonar': { input: 1.00 / 1_000_000, output: 1.00 / 1_000_000 },
  // Embeddings (input only, output = 0)
  'openai/text-embedding-3-small': { input: 0.02 / 1_000_000, output: 0 },
  'openai/text-embedding-3-large': { input: 0.13 / 1_000_000, output: 0 },
  'google/text-embedding-004': { input: 0.025 / 1_000_000, output: 0 },
  'google/gemini-embedding-001': { input: 0.025 / 1_000_000, output: 0 },
};

// Duration-based rates (USD per second). Used when aiData not present and durationSeconds is provided.
const DURATION_RATES: Record<string, { perSecond: number }> = {
  // Whisper: $0.006/min ≈ $0.0001/s
  'openai/whisper-1': { perSecond: 0.006 / 60 },
  // OpenAI Realtime gpt-4o (audio in + out blended approximation)
  // Public pricing ~$0.06/min input + $0.24/min output; we use blended $0.30/min ≈ $0.005/s
  'openai/gpt-4o-realtime-preview': { perSecond: 0.30 / 60 },
  'openai/gpt-4o-mini-realtime-preview': { perSecond: 0.10 / 60 },
  // gpt-realtime-mini: blended $10/M input audio + $20/M output audio tokens.
  // At ~10 input tok/s + ~20 output tok/s (OpenAI oficial: 1 tok/100ms in, 1 tok/50ms out) ≈ $0.10/min ≈ $0.00167/s.
  'openai/gpt-realtime-mini': { perSecond: 0.10 / 60 },
};

// Default fallback rates (Gemini 2.5 Flash)
const DEFAULT_RATES = { input: 0.30 / 1_000_000, output: 2.50 / 1_000_000 };

// Realtime audio token rates (USD per token) — gpt-realtime-mini
// Official OpenAI pricing: $10/1M input audio tokens, $20/1M output audio tokens
const REALTIME_AUDIO_RATES: Record<string, { audioInput: number; audioOutput: number; textInput: number; textOutput: number }> = {
  'openai/gpt-realtime-mini': {
    audioInput: 10.00 / 1_000_000,
    audioOutput: 20.00 / 1_000_000,
    textInput: 0.60 / 1_000_000,   // text portion (system prompt + tools)
    textOutput: 2.40 / 1_000_000,
  },
};

interface ConsumeAICreditsParams {
  supabase: any;
  accountId: string;
  /** AI Gateway response JSON with usage.prompt_tokens/completion_tokens. Required for text/embedding models. */
  aiData?: any;
  /** Alternative: explicit duration in seconds (Whisper, Realtime). Used when aiData is not provided. */
  durationSeconds?: number;
  /** Optional override for embedding input tokens when aiData is absent. */
  inputTokens?: number;
  /** Realtime audio token usage (preferred for gpt-realtime-mini). Charges by REAL OpenAI tokens. */
  realtimeAudio?: {
    inputTokens: number;
    outputTokens: number;
    textInputTokens?: number;
    textOutputTokens?: number;
  };
  model?: string;
  /**
   * TABLE-PRICED billing (preferred for voice interviews and any feature with a fixed credit price).
   * When provided, credits = credits_per_use(feature_key) × quantity. The realtime audio / token path
   * is bypassed entirely. Plan-aware: the resolved credit_value_brl is still used for the R$ display
   * in the description, but the credit count comes from the table.
   */
  featureKey?: string;
  /** Quantity multiplier for table-priced billing (e.g. minutes of voice interview). Defaults to 1. */
  quantity?: number;
  referenceId?: string | null;
  referenceType: string;
  description: string;
  userId?: string | null;
}


interface ConsumeResult {
  success: boolean;
  creditsConsumed: number;
  costBrl: number;
  error?: string;
}

export async function consumeAICredits({
  supabase,
  accountId,
  aiData,
  durationSeconds,
  inputTokens,
  realtimeAudio,
  model,
  featureKey,
  quantity,
  referenceId,
  referenceType,
  description,
  userId,
}: ConsumeAICreditsParams): Promise<ConsumeResult> {
  try {
    // Fetch platform credit config (USD->BRL + margin, globally editable)
    const { data: creditConfig } = await supabase
      .from('platform_credit_config')
      .select('usd_to_brl, margin_percent, credit_value_brl')
      .limit(1)
      .single();

    const usdToBrl = Number(creditConfig?.usd_to_brl ?? 5.10);
    const marginMultiplier = 1 + (Number(creditConfig?.margin_percent ?? 100) / 100);
    const globalCreditValueBrl = Number(creditConfig?.credit_value_brl ?? 1.39);

    // Resolve credit_value_brl per account: price_per_credit_cents from active Pro 1-6 package.
    // Fallback to global value if account has no active subscription.
    let creditValueBrl = globalCreditValueBrl;
    let creditValueSource: string = 'global_fallback';
    let packageName: string | null = null;

    try {
      const { data: sub } = await supabase
        .from('org_credit_subscriptions')
        .select('package_id, recruitment_credit_packages!inner(name, price_per_credit_cents)')
        .eq('org_id', accountId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const pkg = sub?.recruitment_credit_packages;
      const cents = pkg?.price_per_credit_cents;
      if (typeof cents === 'number' && cents > 0) {
        creditValueBrl = cents / 100;
        packageName = pkg.name;
        creditValueSource = `package_${(pkg.name || '').toLowerCase().replace(/\s+/g, '_')}`;
      }
    } catch (e) {
      console.warn('[ai-credit-consumption] could not resolve account package, using global fallback:', e);
    }

    let costUSD = 0;
    let costBrl = 0;
    let credits = 0;
    let usageLabel = '';
    let pricingSource = 'hardcoded_tokens';

    // ============================================================
    // PATH 1: TABLE PRICE (preferred for voice interviews and any feature with fixed table price)
    // credits = recruitment_credit_costs.credits_per_use × quantity
    // ============================================================
    if (featureKey) {
      const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
      const { data: feat, error: featErr } = await supabase
        .from('recruitment_credit_costs')
        .select('credits_per_use, usage_unit, is_active')
        .eq('feature_key', featureKey)
        .maybeSingle();

      if (featErr || !feat || feat.is_active === false) {
        console.error(`[ai-credit-consumption] feature_key '${featureKey}' not found or inactive:`, featErr);
        return { success: false, creditsConsumed: 0, costBrl: 0, error: `feature '${featureKey}' não está ativa` };
      }

      const perUse = Number(feat.credits_per_use);
      credits = Math.max(Math.round(perUse * qty * 10) / 10, 0.1);
      costBrl = credits * creditValueBrl;
      costUSD = costBrl / usdToBrl / marginMultiplier;
      usageLabel = `table(${featureKey} × ${qty.toFixed(2)} ${feat.usage_unit || 'unit'} = ${credits} cr)`;
      pricingSource = 'table_price';
    } else {
      // ============================================================
      // PATH 2: DYNAMIC TOKEN/AUDIO/DURATION (legacy, used for non-voice features)
      // ============================================================
      const realtimeRates = model ? REALTIME_AUDIO_RATES[model] : undefined;
      const hasRealAudioTokens = !!realtimeAudio && ((realtimeAudio.inputTokens || 0) > 0 || (realtimeAudio.outputTokens || 0) > 0);

      if (realtimeRates && hasRealAudioTokens) {
        const ai = realtimeAudio!.inputTokens || 0;
        const ao = realtimeAudio!.outputTokens || 0;
        const ti = realtimeAudio!.textInputTokens || 0;
        const to = realtimeAudio!.textOutputTokens || 0;
        costUSD = (ai * realtimeRates.audioInput) +
                  (ao * realtimeRates.audioOutput) +
                  (ti * realtimeRates.textInput) +
                  (to * realtimeRates.textOutput);
        usageLabel = `realtime_audio(in=${ai},out=${ao},text=${ti}+${to})`;
      } else {
        const durationRate = model ? DURATION_RATES[model] : undefined;
        if (durationRate && typeof durationSeconds === 'number' && durationSeconds > 0) {
          costUSD = durationSeconds * durationRate.perSecond;
          usageLabel = `duration=${durationSeconds.toFixed(1)}s`;
        } else {
          const promptTokens = aiData?.usage?.prompt_tokens ?? inputTokens ?? 0;
          const completionTokens = aiData?.usage?.completion_tokens ?? 0;

          if (promptTokens === 0 && completionTokens === 0) {
            console.warn(`[ai-credit-consumption] ${referenceType}: no usage data, charging minimum`);
          }

          const rates = (model && MODEL_RATES[model]) || DEFAULT_RATES;
          costUSD = (promptTokens * rates.input) + (completionTokens * rates.output);
          usageLabel = `tokens(${promptTokens}+${completionTokens})`;
        }
      }

      costBrl = costUSD * usdToBrl * marginMultiplier;
      credits = Math.max(Math.round((costBrl / creditValueBrl) * 10) / 10, 0.1);
    }

    console.log(`[ai-credit-consumption] ${referenceType} (${featureKey || model || 'unknown'}): ${usageLabel}, costUSD=$${costUSD.toFixed(6)}, costBRL=R$${costBrl.toFixed(4)}, credits=${credits}, pricing_source=${pricingSource}, credit_value_source=${creditValueSource}${packageName ? ` (${packageName} @ R$${creditValueBrl.toFixed(2)})` : ` (R$${creditValueBrl.toFixed(2)})`}`);


    // Debit credits
    const { data: result, error } = await supabase.rpc('consume_credits', {
      p_account_id: accountId,
      p_credit_type: 'universal',
      p_amount: credits,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType,
      p_description: `${description} (R$${costBrl.toFixed(2)})`,
      p_user_id: userId || null,
    });

    if (error) {
      console.error('[ai-credit-consumption] RPC error:', error);
      return { success: false, creditsConsumed: 0, costBrl: 0, error: error.message };
    }

    if (result && !result.success) {
      console.warn('[ai-credit-consumption] Insufficient credits:', result);
      // Don't block the operation - just log the failure
      return { success: false, creditsConsumed: 0, costBrl, error: result.message || 'Créditos insuficientes' };
    }

    return { success: true, creditsConsumed: credits, costBrl };
  } catch (err) {
    console.error('[ai-credit-consumption] Error:', err);
    return { success: false, creditsConsumed: 0, costBrl: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Accumulate token usage from multiple AI calls, then consume once.
 */
export function accumulateUsage(existing: { prompt_tokens: number; completion_tokens: number }, aiData: any) {
  return {
    prompt_tokens: existing.prompt_tokens + (aiData.usage?.prompt_tokens || 0),
    completion_tokens: existing.completion_tokens + (aiData.usage?.completion_tokens || 0),
  };
}
