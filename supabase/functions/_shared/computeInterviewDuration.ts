/**
 * Compute the most reliable duration in seconds for a voice interview session.
 *
 * Priority order (highest precision first):
 *   1. audioDurationSeconds (probed from the uploaded WebM file)
 *      → physical ground truth: the actual length of the recorded audio.
 *   2. lastActivityAt − startedAt
 *      → the candidate's active window, updated per speech turn.
 *        Reliable to within a few seconds.
 *   3. clientDurationSeconds (>0)
 *      → value reported by the client at completion, when nothing better exists.
 *   4. completedAt − startedAt
 *      → last-resort fallback (capped at 4h to discard zombie sessions).
 *
 * Token-based audio seconds are intentionally NOT used here — OpenAI's
 * `usage.input_tokens` mixes text + audio + cached tokens, and the front-end
 * conversion has historically been unreliable. Tokens stay in
 * `ai_execution_logs.metadata` for raw OpenAI cost observability only.
 *
 * All values:
 *   - ignored if not strictly > 0
 *   - capped at 1.5 hours (5400s) to discard zombie sessions
 *
 * Returns null only if no source produces a plausible number.
 */
export interface DurationInputs {
  /** Real WebM audio duration in seconds, probed server-side after upload. */
  audioDurationSeconds?: number | null;
  lastActivityAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  clientDurationSeconds?: number | null;
}

const MAX_DURATION_SECONDS = 90 * 60; // 1.5h
const MIN_DURATION_SECONDS = 1;

function toMs(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function clamp(seconds: number | null | undefined): number | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  if (seconds < MIN_DURATION_SECONDS) return null;
  if (seconds > MAX_DURATION_SECONDS) return MAX_DURATION_SECONDS;
  return Math.round(seconds);
}

export function computeInterviewDuration(inputs: DurationInputs): number | null {
  // 1. Probed audio file duration — ground truth
  const fromAudio = clamp(inputs.audioDurationSeconds);
  if (fromAudio) return fromAudio;

  // 2. last_activity_at − started_at (active window)
  const startedMs = toMs(inputs.startedAt);
  const lastActivityMs = toMs(inputs.lastActivityAt);
  if (startedMs && lastActivityMs && lastActivityMs > startedMs) {
    const fromActivity = clamp((lastActivityMs - startedMs) / 1000);
    if (fromActivity) return fromActivity;
  }

  // 3. client-reported duration
  const fromClient = clamp(inputs.clientDurationSeconds);
  if (fromClient) return fromClient;

  // 4. completed_at − started_at (last resort, capped)
  const completedMs = toMs(inputs.completedAt);
  if (startedMs && completedMs && completedMs > startedMs) {
    const fromCompleted = clamp((completedMs - startedMs) / 1000);
    if (fromCompleted) return fromCompleted;
  }

  return null;
}
