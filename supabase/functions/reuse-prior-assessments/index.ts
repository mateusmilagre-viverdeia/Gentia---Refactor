// Edge Function: reuse-prior-assessments
// Quando um candidato aplica para uma nova vaga, reaproveita Cultural/DISC já completos
// (mesmo candidato, mesma empresa) clonando a sessão para a nova job_id.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CULTURAL_VALIDITY_DAYS = 180;
const DISC_VALIDITY_DAYS = 365;

interface Payload {
  candidate_id: string;
  account_id: string;
  job_id: string;
  candidate_profile_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body: Payload = await req.json();
    if (!body.candidate_id || !body.account_id || !body.job_id) {
      return new Response(JSON.stringify({ error: "missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = { cultural_reused: false, disc_reused: false };

    // ===================== CULTURAL =====================
    // Skip if já existe sessão para essa vaga
    const { data: existingCulture } = await supabase
      .from("culture_interview_sessions")
      .select("id, status")
      .eq("account_id", body.account_id)
      .eq("job_id", body.job_id)
      .eq("candidate_id", body.candidate_id)
      .maybeSingle();

    if (!existingCulture) {
      const cutoffCultural = new Date(Date.now() - CULTURAL_VALIDITY_DAYS * 86400000).toISOString();
      const { data: priorCulture } = await supabase
        .from("culture_interview_sessions")
        .select("*")
        .eq("account_id", body.account_id)
        .eq("candidate_id", body.candidate_id)
        .eq("status", "completed")
        .not("matching_score", "is", null)
        .gte("completed_at", cutoffCultural)
        .neq("job_id", body.job_id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priorCulture) {
        const { id: _id, created_at: _c, updated_at: _u, started_at: _s, email_sent_at: _e, email_resend_count: _er, token: _t, ...rest } = priorCulture as any;
        const { error: insErr } = await supabase
          .from("culture_interview_sessions")
          .insert({
            ...rest,
            job_id: body.job_id,
            reused_from_session_id: priorCulture.id,
            email_resend_count: 0,
            email_sent_at: null,
          });
        if (!insErr) result.cultural_reused = true;
        else console.warn("[reuse] cultural insert failed:", insErr);
      }
    }

    // ===================== DISC =====================
    const { data: existingDisc } = await supabase
      .from("candidate_disc_sessions")
      .select("id, status")
      .eq("account_id", body.account_id)
      .eq("job_id", body.job_id)
      .eq("candidate_id", body.candidate_id)
      .maybeSingle();

    if (!existingDisc) {
      const cutoffDisc = new Date(Date.now() - DISC_VALIDITY_DAYS * 86400000).toISOString();
      const { data: priorDisc } = await supabase
        .from("candidate_disc_sessions")
        .select("*, candidate_disc_results(*)")
        .eq("account_id", body.account_id)
        .eq("candidate_id", body.candidate_id)
        .eq("status", "completed")
        .gte("completed_at", cutoffDisc)
        .neq("job_id", body.job_id)
        .order("completed_at", { ascending: false })
        .limit(5);

      // Pick the most recent one that has a result row
      const candidateSession = (priorDisc || []).find((s: any) =>
        Array.isArray(s.candidate_disc_results) && s.candidate_disc_results.length > 0
      );

      if (candidateSession) {
        const priorResults = candidateSession.candidate_disc_results;
        const { id: oldSessionId, created_at: _c, started_at: _s, completed_at: _cc, token: _t, expires_at: _ex, candidate_disc_results: _r, ...rest } = candidateSession;

        // Generate fresh token + expiry for the cloned session
        const newToken = crypto.randomUUID().replace(/-/g, "");
        const newExpiry = new Date(Date.now() + 30 * 86400000).toISOString();

        const { data: newSession, error: insErr } = await supabase
          .from("candidate_disc_sessions")
          .insert({
            ...rest,
            job_id: body.job_id,
            reused_from_session_id: oldSessionId,
            token: newToken,
            expires_at: newExpiry,
            started_at: candidateSession.started_at,
            completed_at: candidateSession.completed_at,
            status: "completed",
          })
          .select("id")
          .single();

        if (!insErr && newSession) {
          // Clone the result row(s) for this new session
          const resultsToInsert = priorResults.map((r: any) => {
            const { id: _rid, session_id: _sid, created_at: _rc, ...rrest } = r;
            return { ...rrest, session_id: newSession.id };
          });
          const { error: resErr } = await supabase.from("candidate_disc_results").insert(resultsToInsert);
          if (!resErr) result.disc_reused = true;
          else console.warn("[reuse] disc results insert failed:", resErr);
        } else {
          console.warn("[reuse] disc session insert failed:", insErr);
        }
      }
    }

    console.log("[reuse-prior-assessments]", { ...body, ...result });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[reuse-prior-assessments] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
