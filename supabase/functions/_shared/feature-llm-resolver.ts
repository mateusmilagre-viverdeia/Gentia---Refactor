/**
 * Feature → LLM resolver.
 * Lê a tabela `feature_llm_mapping` para descobrir qual modelo deve ser usado
 * em cada feature de IA. Edge functions chamam `resolveFeatureModel(feature_key, fallback)`
 * para permitir trocar o modelo de uma feature sem deploy.
 *
 * Cache em memória por 5 minutos (por instância de edge function).
 */

type Row = { feature_key: string; model_id: string; avg_tokens_input: number | null; avg_tokens_output: number | null };

const CACHE_TTL_MS = 5 * 60 * 1000;
let CACHE: { fetchedAt: number; byKey: Map<string, Row> } | null = null;

async function loadMapping(supabaseAdmin: any): Promise<Map<string, Row>> {
  if (CACHE && Date.now() - CACHE.fetchedAt < CACHE_TTL_MS) return CACHE.byKey;
  const { data, error } = await supabaseAdmin
    .from("feature_llm_mapping")
    .select("feature_key, model_id, avg_tokens_input, avg_tokens_output");
  if (error) {
    console.warn("[feature-llm-resolver] failed to load mapping:", error.message);
    return CACHE?.byKey ?? new Map();
  }
  const byKey = new Map<string, Row>();
  for (const r of (data ?? []) as Row[]) byKey.set(r.feature_key, r);
  CACHE = { fetchedAt: Date.now(), byKey };
  return byKey;
}

export async function resolveFeatureModel(
  supabaseAdmin: any,
  featureKey: string,
  fallbackModel: string,
): Promise<string> {
  try {
    const map = await loadMapping(supabaseAdmin);
    return map.get(featureKey)?.model_id ?? fallbackModel;
  } catch (e) {
    console.warn("[feature-llm-resolver] resolve error:", (e as Error).message);
    return fallbackModel;
  }
}

export async function resolveFeatureConfig(
  supabaseAdmin: any,
  featureKey: string,
): Promise<Row | null> {
  const map = await loadMapping(supabaseAdmin);
  return map.get(featureKey) ?? null;
}

/** Force cache refresh (use in tests or after admin updates). */
export function invalidateFeatureMappingCache() {
  CACHE = null;
}
