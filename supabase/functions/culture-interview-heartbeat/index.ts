import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('culture-interview-heartbeat');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { sessionId, partialTranscript, responsesCount } = body;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log.log(`💓 Heartbeat for session: ${sessionId}, responses: ${responsesCount || 0}`);

    // Verify session exists and is in progress
    const { data: session, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      log.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (session.status !== "in_progress") {
      log.log("⚠️ Session not in progress, status:", session.status);
      return new Response(
        JSON.stringify({ error: "Session is not in progress", status: session.status }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update session with heartbeat data
    const updateData: Record<string, unknown> = {
      last_activity_at: new Date().toISOString(),
    };

    // Only update partial_transcript if provided and has content
    if (partialTranscript && partialTranscript.trim().length > 0) {
      updateData.partial_transcript = partialTranscript;
    }

    const { error: updateError } = await supabase
      .from("culture_interview_sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (updateError) {
      log.error("❌ Error updating session:", updateError);
      throw updateError;
    }

    log.log("✅ Heartbeat processed successfully");

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
