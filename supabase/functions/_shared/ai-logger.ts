// Shared AI execution logger — persists every AI call to ai_execution_logs table
// Import in edge functions: import { logAIExecution } from '../_shared/ai-logger.ts';

interface AILogParams {
  accountId: string;
  functionName: string;
  operation: string;
  model?: string;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  status: 'success' | 'error' | 'timeout' | 'fallback';
  errorMessage?: string;
  durationMs?: number;
  tokensUsed?: number;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
  /** Optimization version, e.g. v0_baseline | v1_tooling_cache | v2_two_stage. */
  optimizationVersion?: string;
  /** Tokens served from prompt cache (Gemini context caching). */
  cachedTokens?: number;
  /** Compression ratio applied to transcript before LLM call (0..1). */
  compressionRatio?: number;
  /** Optional QA score (0..100), filled later by reviewers/auto checks. */
  qualityScore?: number;
}

// Cost per 1K tokens (USD) — approximate
const MODEL_COST_PER_1K: Record<string, number> = {
  'google/gemini-2.5-flash': 0.0001,
  'google/gemini-2.5-flash-lite': 0.00005,
  'google/gemini-2.5-pro': 0.00025,
  'openai/gpt-5-mini': 0.0003,
  'openai/gpt-5': 0.001,
};

function estimateCost(model: string | undefined, tokensUsed: number | undefined): number | null {
  if (!model || !tokensUsed) return null;
  const rate = MODEL_COST_PER_1K[model] ?? 0.0002;
  return Math.round((tokensUsed / 1000) * rate * 1000000) / 1000000;
}

export async function logAIExecution(
  supabase: any,
  params: AILogParams
): Promise<void> {
  try {
    const tokens = params.tokensUsed ?? undefined;
    const cost = params.estimatedCost ?? estimateCost(params.model, tokens);

    await supabase.from('ai_execution_logs').insert({
      account_id: params.accountId,
      function_name: params.functionName,
      operation: params.operation,
      model: params.model || null,
      input_summary: params.inputSummary || {},
      output_summary: params.outputSummary || {},
      status: params.status,
      error_message: params.errorMessage || null,
      duration_ms: params.durationMs || null,
      tokens_used: tokens || null,
      estimated_cost: cost,
      metadata: params.metadata || {},
      optimization_version: params.optimizationVersion || 'v0_baseline',
      cached_tokens: params.cachedTokens ?? null,
      compression_ratio: params.compressionRatio ?? null,
      quality_score: params.qualityScore ?? null,
    });
  } catch (err) {
    // Never let logging break the main flow
    console.error('[ai-logger] Failed to persist log:', err);
  }
}

// Helper to extract token count from OpenAI-compatible response
export function extractTokensFromResponse(aiData: any): number | undefined {
  return aiData?.usage?.total_tokens ?? undefined;
}
