// Persists a per-question response payload that the client could not save through the
// normal save-response endpoint. Public (no JWT) — validates session existence before
// inserting into voice_interview_events with event_type='response_save_dead_letter'.
//
// Detector reads these events and surfaces them as critical anomalies.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_TYPES = new Set(["cultural", "technical", "disc"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "invalid_body" }, 400);

    const { sessionId, sessionType, questionIndex, payload } = body as Record<
      string,
      unknown
    >;

    if (
      typeof sessionId !== "string" ||
      typeof sessionType !== "string" ||
      !ALLOWED_TYPES.has(sessionType) ||
      typeof questionIndex !== "number"
    ) {
      return json({ error: "invalid_fields" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

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
      const { data: archived } = await supabaseAdmin
        .from("interview_attempt_history")
        .select("account_id")
        .eq("original_session_id", sessionId)
        .maybeSingle();
      accountId = archived?.account_id ?? null;
    }

    if (!accountId) {
      return json({ status: "dropped_unknown_session" }, 202);
    }

    const safePayload =
      payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

    const { error } = await supabaseAdmin.from("voice_interview_events").insert({
      account_id: accountId,
      session_id: sessionId,
      session_type: sessionType,
      event_type: "response_save_dead_letter",
      payload: { ...safePayload, questionIndex },
    });

    if (error) {
      console.error("dead_letter_insert_error", error);
      return json({ error: "insert_failed" }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error("interview-response-deadletter_error", e);
    return json({ error: "internal" }, 500);
  }
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
