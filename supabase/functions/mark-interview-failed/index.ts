// Marks a voice interview session as failed when the audio/WebRTC connection
// could not be established. Public endpoint (no JWT) — service role.
// Used by the candidate-side client when getUserMedia, the realtime token,
// or the SDP exchange fail BEFORE any answer is recorded, so the session
// does not stay stuck as "in_progress" waiting for the watchdog.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TYPES = new Set(["cultural", "technical", "disc"]);

const ALLOWED_REASONS = new Set([
  "mic_permission_denied",
  "mic_not_found",
  "mic_not_readable",
  "webview_blocked",
  "token_request_failed",
  "realtime_sdp_connection_failed",
  "realtime_network_error",
  "ice_connection_failed",
  "unknown_connection_error",
]);

const tableMap: Record<string, string> = {
  cultural: "culture_interview_sessions",
  technical: "technical_interview_sessions",
  disc: "candidate_disc_sessions",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "invalid_body" }, 400);
    }

    const { sessionId, sessionType, reason, diagnostics } = body as Record<
      string,
      unknown
    >;

    if (
      typeof sessionId !== "string" ||
      typeof sessionType !== "string" ||
      typeof reason !== "string" ||
      !ALLOWED_TYPES.has(sessionType) ||
      !ALLOWED_REASONS.has(reason)
    ) {
      return json({ error: "invalid_fields" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const table = tableMap[sessionType];

    const { data: session } = await admin
      .from(table)
      .select("id, status, account_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      return json({ ok: false, error: "session_not_found" }, 404);
    }

    // Only abandon sessions that are still in progress / pending — don't
    // overwrite completed/abandoned sessions.
    if (session.status !== "in_progress" && session.status !== "pending") {
      return json({ ok: true, skipped: true, status: session.status }, 200);
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await admin
      .from(table)
      .update({
        status: "abandoned",
        abandoned_reason: reason,
        completed_at: nowIso,
        watchdog_processed_at: nowIso,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("mark_failed_update_error", updateError);
      return json({ error: "update_failed" }, 500);
    }

    // Best-effort telemetry
    try {
      await admin.from("voice_interview_events").insert({
        account_id: session.account_id,
        session_id: sessionId,
        session_type: sessionType,
        event_type: "abnormal_disconnect",
        payload: {
          reason,
          diagnostics: diagnostics && typeof diagnostics === "object"
            ? diagnostics
            : null,
        },
        client_ts: nowIso,
      });
    } catch (e) {
      console.warn("telemetry_insert_warning", e);
    }

    return json({ ok: true, reason }, 200);
  } catch (e) {
    console.error("mark-interview-failed_error", e);
    return json({ error: "internal" }, 500);
  }
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
