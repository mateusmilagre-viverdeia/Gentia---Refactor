/**
 * Fire-and-forget telemetry for voice interview sessions.
 * Logs anomalies/events to the `voice_interview_events` table via the
 * `log-interview-event` edge function. Never blocks the UX, never throws.
 *
 * P0 (2026-05-21): Use `text/plain` blob for sendBeacon to avoid CORS preflight
 * (Blob `application/json` triggers OPTIONS, and a preflight whose response is
 * missing Access-Control-Allow-Methods makes the browser silently drop the POST).
 * For critical events, ALSO fire a `fetch keepalive` in parallel so we don't
 * depend on the beacon being actually delivered.
 */

export type VoiceInterviewSessionType = "cultural" | "technical" | "disc";

export type VoiceInterviewEventType =
  | "session_connected"
  | "session_disconnected"
  | "ice_failed"
  | "webrtc_reconnect"
  | "speech_started"
  | "speech_stopped"
  | "ai_response_done"
  | "ai_interrupted"
  | "response_saved"
  | "response_save_failed"
  | "mic_permission_denied"
  | "mic_permission_granted"
  | "data_channel_error"
  | "abnormal_disconnect"
  | "session_completed_client"
  | "culture_premature_end_blocked"
  | "technical_premature_end_blocked"
  | "realtime_error_suppressed"
  | "mic_track_attached"
  | "mic_track_state_change"
  | "mic_track_invalid_precheck"
  | "mic_recovered"
  | "pc_connection_state"
  | "pc_ice_connection_state"
  | "intro_unlocked"
  | "transcript_dropped_cooldown"
  | "transcript_dropped_noise"
  | "transcript_dropped_language"
  | "transcript_dropped_intro_locked"
  | "ai_audio_track_received"
  | "ai_audio_play_attempt"
  | "ai_audio_play_started"
  | "ai_audio_play_failed"
  | "ai_audio_unlock_clicked"
  | "ai_audio_track_unmuted"
  | "ai_audio_track_muted"
  | "set_sink_id_ok"
  | "set_sink_id_failed"
  | "ai_response_started"
  | "ai_response_done"
  | "webrtc_receivers_state"
  | "vad_speech_during_ai"
  | "ai_initiated_opening"
  | "preflight_started"
  | "preflight_inapp_browser_warned"
  | "preflight_skipped_by_user"
  | "speaker_check_pass"
  | "speaker_check_fail"
  | "mic_check_pass"
  | "mic_check_fail"
  | "mic_not_found"
  | "mic_not_readable"
  | "preflight_network_ok"
  | "preflight_network_warn"

  // P0: live pipeline observability
  | "transcription_received"
  | "transcription_pipeline_silent"
  | "coverage_reinjected"
  | "fallback_save_from_item_created"
  | "pipeline_silent_detected"
  | "realtime_session_config"
  | "ai_transcript_captured"
  | "ai_transcript_missing"
  // Conductor v2.1
  | "conductor_double_fire_blocked"
  | "conductor_response_cancelled"
  | "conductor_speculative_hit"
  | "conductor_speculative_miss"
  | "conductor_label_expanded"
  | "conductor_next_turn"
  | "conductor_regression_detected_client"
  | "speculative_skipped_short_burst"
  | "audio_upload_pagehide_attempt"

  // Audio upload lifecycle
  | "audio_upload_started"
  | "audio_upload_succeeded"
  | "audio_upload_failed"
  // Latency diagnostics (gap between user stopping speech and AI starting)
  | "agent_response_latency"
  // Auto-finalize (Bug #1): cliente encerra sozinho quando IA detecta fim + cobertura 100%
  | "auto_finalize_scheduled"
  | "auto_finalize_triggered";


interface LogEventParams {
  sessionId: string;
  sessionType: VoiceInterviewSessionType;
  eventType: VoiceInterviewEventType;
  payload?: Record<string, unknown>;
}

const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-interview-event`;
const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Events where we MUST guarantee delivery (used by watchdog/diagnostics).
// For these we always fire fetch(keepalive) in addition to sendBeacon.
const CRITICAL_EVENTS = new Set<VoiceInterviewEventType>([
  "session_connected",
  "session_disconnected",
  "mic_track_attached",
  "mic_track_invalid_precheck",
  "mic_permission_denied",
  "mic_not_found",
  "mic_not_readable",
  "data_channel_error",
  "abnormal_disconnect",
  "ice_failed",
  "intro_unlocked",
  "transcription_received",
  "transcription_pipeline_silent",
  "pipeline_silent_detected",
  "fallback_save_from_item_created",
  "response_save_failed",
  "session_completed_client",
  "realtime_session_config",
  // P0 audio playback diagnostics — must never be silently dropped
  "ai_audio_track_received",
  "ai_audio_play_attempt",
  "ai_audio_play_started",
  "ai_audio_play_failed",
  "ai_audio_unlock_clicked",
  "ai_audio_track_unmuted",
  "ai_audio_track_muted",
  "set_sink_id_ok",
  "set_sink_id_failed",
  "webrtc_receivers_state",
]);

// In-memory dedupe: suppress identical events fired within DEDUPE_WINDOW_MS.
// React StrictMode in dev double-invokes effects and some WebRTC callbacks
// fire twice — without dedupe the events table fills with pairs.
const DEDUPE_WINDOW_MS = 1500;
const recentFingerprints = new Map<string, number>();

function fingerprintOf(params: LogEventParams): string {
  let payloadHash = "";
  try {
    payloadHash = JSON.stringify(params.payload ?? {});
  } catch {
    payloadHash = "";
  }
  return `${params.sessionId}|${params.eventType}|${payloadHash}`;
}

function isDuplicate(fp: string): boolean {
  const now = Date.now();
  // Opportunistic GC: evict entries older than the window.
  if (recentFingerprints.size > 256) {
    for (const [k, ts] of recentFingerprints) {
      if (now - ts > DEDUPE_WINDOW_MS) recentFingerprints.delete(k);
    }
  }
  const prev = recentFingerprints.get(fp);
  if (prev && now - prev < DEDUPE_WINDOW_MS) return true;
  recentFingerprints.set(fp, now);
  return false;
}

export function logVoiceInterviewEvent(params: LogEventParams): void {
  try {
    // Skip backend logging for pending preflight sessions (no row exists yet,
    // function would drop with 202). Surface in console for debugging.
    if (params.sessionId.startsWith("pending-")) {
      try {
        console.info("[voice-telemetry:pending]", params.eventType, params.payload ?? {});
      } catch {
        /* noop */
      }
      return;
    }

    // Dedupe identical events fired within a short window to avoid
    // StrictMode/double-callback noise reaching the DB.
    if (isDuplicate(fingerprintOf(params))) return;

    const body = JSON.stringify({
      sessionId: params.sessionId,
      sessionType: params.sessionType,
      eventType: params.eventType,
      payload: params.payload ?? {},
      clientTs: new Date().toISOString(),
    });

    const isCritical = CRITICAL_EVENTS.has(params.eventType);

    // Critical events: prefer fetch(keepalive) — it's just as resilient as
    // sendBeacon for unload scenarios and returns a real response, so we
    // don't need to fire both (which was producing duplicate rows).
    if (isCritical) {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey },
        body,
        keepalive: true,
      }).catch(() => {
        /* swallow */
      });
      return;
    }

    // Non-critical: try sendBeacon first, fall back to fetch if unavailable
    // or rejected synchronously.
    let beaconSent = false;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
        beaconSent = navigator.sendBeacon(url, blob);
      } catch {
        beaconSent = false;
      }
    }

    if (!beaconSent) {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey },
        body,
        keepalive: true,
      }).catch(() => {
        /* swallow */
      });
    }
  } catch {
    /* swallow */
  }
}
