/**
 * Resolve the effective DISC state for a candidate from session data.
 * 
 * Rules:
 * - Session must be "completed" AND have a non-null match_score to count as completed.
 * - If session is "completed" but match_score is null, it's "evaluating" (not completed).
 * - When multiple sessions exist, prefer the most recent one with a valid score.
 */

export interface DiscSessionData {
  status: string;
  created_at?: string;
  candidate_disc_results?: { match_score: number | null } | { match_score: number | null }[] | null;
}

export interface EffectiveDISCState {
  completed: boolean;
  evaluating: boolean; // session completed but no score yet
  score: number | null;
}

/**
 * Extract match_score from the nested candidate_disc_results which may be
 * an array (from .select with one-to-many) or an object (one-to-one).
 */
export function extractMatchScore(results: any): number | null {
  if (!results) return null;
  if (Array.isArray(results)) {
    // Pick the first non-null match_score
    for (const r of results) {
      if (r?.match_score != null) return r.match_score;
    }
    return null;
  }
  return results.match_score ?? null;
}

/**
 * Resolve effective DISC state from a single session object.
 */
export function resolveDiscState(session: DiscSessionData | null | undefined): EffectiveDISCState {
  if (!session || session.status !== "completed") {
    return { completed: false, evaluating: false, score: null };
  }
  const score = extractMatchScore(session.candidate_disc_results);
  if (score == null) {
    return { completed: false, evaluating: true, score: null };
  }
  return { completed: true, evaluating: false, score };
}

/**
 * Resolve effective DISC state from multiple sessions (picks the best one).
 */
export function resolveDiscStateFromMultiple(sessions: DiscSessionData[]): EffectiveDISCState {
  // Sort by created_at descending
  const sorted = [...sessions].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });

  // First try to find a completed session with valid score
  for (const s of sorted) {
    if (s.status === "completed") {
      const score = extractMatchScore(s.candidate_disc_results);
      if (score != null) {
        return { completed: true, evaluating: false, score };
      }
    }
  }

  // Check if any completed session exists (but without score = evaluating)
  const hasCompletedNoScore = sorted.some(s => s.status === "completed");
  if (hasCompletedNoScore) {
    return { completed: false, evaluating: true, score: null };
  }

  return { completed: false, evaluating: false, score: null };
}
