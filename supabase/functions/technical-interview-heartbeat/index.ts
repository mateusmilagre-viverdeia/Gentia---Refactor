import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { sessionId, partialTranscript } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.status !== "in_progress") {
      return new Response(
        JSON.stringify({ error: "Session is not in progress", status: session.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updateData: Record<string, unknown> = {
      last_activity_at: new Date().toISOString(),
    };
    if (partialTranscript && partialTranscript.trim().length > 0) {
      updateData.partial_transcript = partialTranscript;
    }

    const { error: updateError } = await supabase
      .from("technical_interview_sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
