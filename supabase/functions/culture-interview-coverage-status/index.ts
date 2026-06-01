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
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("sessionId");
    if (!sessionId && (req.method === "POST")) {
      const body = await req.json().catch(() => ({}));
      sessionId = body?.sessionId ?? null;
    }
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error } = await supabase
      .from("culture_interview_sessions")
      .select("id, status, questions, questions_total, questions_covered, coverage_log")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = (session.questions as Array<{ question_text?: string; value_label?: string }>) || [];
    const total = session.questions_total ?? questions.length;
    const covered = session.questions_covered ?? 0;
    const coverageLog = (session.coverage_log as Array<{ question_index: number }>) || [];
    const coveredIdx = new Set(coverageLog.map((c) => c.question_index));
    const missing = questions
      .map((q, i) => ({ index: i, question: q.question_text || `Pergunta ${i + 1}`, value_label: q.value_label || null }))
      .filter((q) => !coveredIdx.has(q.index));

    return new Response(
      JSON.stringify({
        sessionId,
        status: session.status,
        total,
        covered,
        missing,
        canEnd: covered >= total,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
