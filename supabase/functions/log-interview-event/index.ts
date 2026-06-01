// Logs client-side telemetry events for voice interview sessions.
// Public endpoint (no JWT) — validates session existence and ownership server-side.
// Uses service role to bypass RLS; data is account-scoped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// LOCAL CORS headers (do NOT import npm:@supabase/supabase-js@2/cors — it does not
// declare Access-Control-Allow-Methods, which causes browsers to abort sendBeacon
// POSTs after a successful preflight, leaving telemetry completely silent in prod).
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_EVENTS = new Set([
  "session_connected",
  "session_disconnected",
  "ice_failed",
  "webrtc_reconnect",
  "speech_started",
  "speech_stopped",
  "ai_response_done",
  "ai_interrupted",
  "response_saved",
  "response_save_failed",
  "mic_permission_denied",
  "mic_permission_granted",
  "mic_not_found",
  "mic_not_readable",
  "webview_blocked",
  "token_request_failed",
  "sdp_connection_failed",
  "realtime_network_error",
  "data_channel_error",
  "abnormal_disconnect",
  "session_completed_client",
  "culture_premature_end_blocked",
  "realtime_error_suppressed",
  "mic_track_attached",
  "mic_track_state_change",
  "mic_track_invalid_precheck",
  "mic_recovered",
  "pc_connection_state",
  "pc_ice_connection_state",
  "intro_unlocked",
  "transcript_dropped_cooldown",
  "transcript_dropped_noise",
  "transcript_dropped_language",
  "transcript_dropped_intro_locked",
  "ai_audio_track_received",
  "ai_audio_play_attempt",
  "ai_audio_play_started",
  "ai_audio_play_failed",
  "ai_audio_unlock_clicked",
  "ai_audio_track_unmuted",
  "ai_audio_track_muted",
  "set_sink_id_ok",
  "set_sink_id_failed",
  "ai_response_started",
  "ai_response_done",
  "webrtc_receivers_state",
  "vad_speech_during_ai",
  "ai_initiated_opening",
  "technical_premature_end_blocked",
  "preflight_started",
  "preflight_inapp_browser_warned",
  "preflight_skipped_by_user",
  "speaker_check_pass",
  "speaker_check_fail",
  "mic_check_pass",
  "mic_check_fail",
  // P0: live pipeline observability
  "transcription_received",
  "transcription_pipeline_silent",
  "coverage_reinjected",
  "fallback_save_from_item_created",
  "pipeline_silent_detected",
  // P0: realtime session config dump (start-culture/technical/disc)
  "realtime_session_config",
  // Observabilidade do transcript da IA por turno (alimenta ai_question_spoken).
  "ai_transcript_captured",
  "ai_transcript_missing",
  // Audio upload lifecycle (cultural + technical interviews)
  "audio_upload_started",
  "audio_upload_succeeded",
  "audio_upload_failed",
]);

const ALLOWED_TYPES = new Set(["cultural", "technical", "disc"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Accept JSON regardless of content-type (sendBeacon often uses text/plain
    // to avoid CORS preflight). Read as text then JSON.parse.
    const raw = await req.text();
    let body: Record<string, unknown> | null = null;
    try {
      body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      body = null;
    }
    if (!body || typeof body !== "object") {
      return json({ error: "invalid_body" }, 400);
    }

    const { sessionId, sessionType, eventType, payload, clientTs } = body as Record<
      string,
      unknown
    >;

    if (
      typeof sessionId !== "string" ||
      typeof sessionType !== "string" ||
      typeof eventType !== "string" ||
      !ALLOWED_TYPES.has(sessionType) ||
      !ALLOWED_EVENTS.has(eventType)
    ) {
      console.warn("invalid_fields", { sessionType, eventType });
      return json({ error: "invalid_fields" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Resolve account_id by looking up the session in its respective table.
    const tableMap: Record<string, string> = {
      cultural: "culture_interview_sessions",
      technical: "technical_interview_sessions",
      disc: "candidate_disc_sessions",
    };
    const table = tableMap[sessionType];

    let accountId: string | null = null;
    const { data: active } = await supabaseAdmin
      .from(table)
      .select("account_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (active?.account_id) {
      accountId = active.account_id;
    } else {
      // Maybe already archived — fall back to interview_attempt_history.
      const { data: archived } = await supabaseAdmin
        .from("interview_attempt_history")
        .select("account_id")
        .eq("original_session_id", sessionId)
        .maybeSingle();
      accountId = archived?.account_id ?? null;
    }

    if (!accountId) {
      // Don't 404 — telemetry is best-effort. Schema requires NOT NULL account_id,
      // so drop silently with 202.
      return json({ status: "dropped_unknown_session" }, 202);
    }

    const safePayload =
      payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

    const { error: insertError } = await supabaseAdmin
      .from("voice_interview_events")
      .insert({
        account_id: accountId,
        session_id: sessionId,
        session_type: sessionType,
        event_type: eventType,
        payload: safePayload,
        client_ts:
          typeof clientTs === "string" && !Number.isNaN(Date.parse(clientTs))
            ? clientTs
            : new Date().toISOString(),
      });

    if (insertError) {
      console.error("voice_event_insert_error", insertError);
      return json({ error: "insert_failed" }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error("log-interview-event_error", e);
    return json({ error: "internal" }, 500);
  }
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
