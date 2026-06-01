// Resolves the LLM optimization tier for a given account.
// Used by the 3 evaluator functions (cultural, technical, CV match) to
// decide whether to apply Phase 1 optimizations (compression + tool calling
// with tight max_tokens) or fall back to a more conservative path.
//
// Tiers:
//   - 'optimized'    (default) → Phase 1 active: compression + tool calling + tight max_tokens
//   - 'stable'       → safer path: skip compression, looser max_tokens (rollback for premium accounts)
//   - 'experimental' → reserved for future phases; today behaves like 'optimized'
//
// The tier is read from public.account_settings.evaluator_optimization_tier.

export type EvaluatorTier = "stable" | "optimized" | "experimental";

interface SupabaseLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { evaluator_optimization_tier?: string } | null; error: unknown }>;
      };
    };
  };
}

export async function getEvaluatorTier(
  supabase: SupabaseLike,
  accountId: string | null | undefined
): Promise<EvaluatorTier> {
  if (!accountId) return "optimized";
  try {
    const { data } = await supabase
      .from("account_settings")
      .select("evaluator_optimization_tier")
      .eq("account_id", accountId)
      .maybeSingle();
    const t = data?.evaluator_optimization_tier as EvaluatorTier | undefined;
    if (t === "stable" || t === "optimized" || t === "experimental") return t;
  } catch (_e) {
    // Fall through to default on any read error.
  }
  return "optimized";
}

/**
 * Resolves whether to apply Phase 1 transcript compression.
 * 'stable' tier disables compression to preserve raw context.
 */
export function shouldCompressTranscript(tier: EvaluatorTier): boolean {
  return tier !== "stable";
}

/**
 * Returns the recommended max_tokens cap for a given tier and function.
 * 'stable' tier uses looser caps to avoid truncation risk.
 */
export function getMaxTokensForTier(
  tier: EvaluatorTier,
  fn: "cultural" | "technical" | "cv-match"
): number {
  if (tier === "stable") {
    if (fn === "cultural") return 4000;
    if (fn === "technical") return 2800;
    return 2000; // cv-match
  }
  // optimized / experimental
  if (fn === "cultural") return 2500;
  if (fn === "technical") return 1800;
  return 1200; // cv-match
}
