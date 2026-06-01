// Cron diário: preenche ai_execution_logs.quality_score com sinais indiretos
// Sinais:
//  - app reprovado/desqualificado após score IA alto (>=80) → 0.3
//  - app avançou no pipeline (hired/offer/cultural_fit/disc/technical/evaluation) → 0.9
//  - sem sinal → null
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const ADVANCED_STATUSES = new Set(["evaluation", "disc", "technical", "cultural_fit", "offer", "hired"]);
const NEGATIVE_STATUSES = new Set(["desqualificado", "rejected"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs, error } = await supabase
    .from("ai_execution_logs")
    .select("id, function_name, operation, output_summary, input_summary, account_id, created_at")
    .is("quality_score", null)
    .in("operation", ["culture_evaluation", "technical_evaluation", "cv_job_match"])
    .gte("created_at", since)
    .limit(1000);

  if (error) {
    console.error("[compute-quality-scores] fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0;
  let skipped = 0;

  for (const log of logs || []) {
    try {
      let candidateId: string | null = null;
      let jobId: string | null = null;
      let aiScore: number | null = null;

      if (log.operation === "cv_job_match") {
        candidateId = (log.input_summary as any)?.candidate_id || null;
        jobId = (log.input_summary as any)?.job_id || null;
        aiScore = (log.output_summary as any)?.match_score ?? null;
      } else {
        const sessionId = (log.input_summary as any)?.sessionId;
        if (!sessionId) { skipped++; continue; }
        const tbl = log.operation === "culture_evaluation"
          ? "culture_interview_sessions"
          : "technical_interview_sessions";
        const scoreField = log.operation === "culture_evaluation" ? "matching_score" : "overall_score";
        const { data: sess } = await supabase
          .from(tbl)
          .select(`candidate_id, job_id, ${scoreField}`)
          .eq("id", sessionId)
          .maybeSingle();
        if (!sess) { skipped++; continue; }
        candidateId = (sess as any).candidate_id;
        jobId = (sess as any).job_id;
        aiScore = Number((sess as any)[scoreField]) || ((log.output_summary as any)?.overallScore ?? null);
      }

      if (!candidateId || !jobId) { skipped++; continue; }

      const { data: app } = await supabase
        .from("recruitment_applications")
        .select("status, updated_at")
        .eq("job_id", jobId)
        .eq("candidate_id", candidateId)
        .maybeSingle();

      if (!app) { skipped++; continue; }

      let qs: number | null = null;
      if (NEGATIVE_STATUSES.has(app.status) && aiScore !== null && aiScore >= 80) {
        qs = 0.3;
      } else if (ADVANCED_STATUSES.has(app.status)) {
        qs = 0.9;
      }

      if (qs === null) { skipped++; continue; }

      await supabase
        .from("ai_execution_logs")
        .update({ quality_score: qs })
        .eq("id", log.id);
      updated++;
    } catch (err) {
      console.error("[compute-quality-scores] log error:", err);
      skipped++;
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: logs?.length || 0, updated, skipped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
