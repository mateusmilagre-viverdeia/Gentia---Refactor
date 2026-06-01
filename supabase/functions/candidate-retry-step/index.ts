import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const { applicationId, jobId } = await req.json();
    if (!applicationId || !jobId) {
      return json({ error: "Missing required fields: applicationId, jobId" }, 400);
    }

    // Load application
    const { data: application, error: appError } = await supabaseAdmin
      .from("recruitment_applications")
      .select("id, account_id, status, candidate_id, job_id")
      .eq("id", applicationId)
      .single();

    if (appError || !application) return json({ error: "Application not found" }, 404);
    if (application.job_id !== jobId) return json({ error: "Job mismatch" }, 400);

    // Validate ownership: recruitment_candidate.email must match auth user email
    const { data: candidate } = await supabaseAdmin
      .from("recruitment_candidates")
      .select("id, email")
      .eq("id", application.candidate_id)
      .maybeSingle();

    if (!candidate) return json({ error: "Candidate not found" }, 404);
    const userEmail = (user.email || "").toLowerCase();
    const candEmail = (candidate.email || "").toLowerCase();
    if (!userEmail || !candEmail || userEmail !== candEmail) {
      return json({ error: "forbidden", reason: "not_owner" }, 403);
    }

    // Validate state
    if (!["desqualificado", "rejected"].includes(application.status)) {
      return json({ error: "invalid_state", reason: "not_disqualified" }, 409);
    }

    const accountId = application.account_id;
    const candidateId = application.candidate_id;

    // Resolve candidate_profile_id (via user_id) for OR-filter
    const { data: profile } = await supabaseAdmin
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const candidateProfileId = profile?.id ?? null;

    const fetchLatest = async (table: string) => {
      const filters: string[] = [`candidate_id.eq.${candidateId}`];
      if (candidateProfileId) filters.push(`candidate_profile_id.eq.${candidateProfileId}`);
      const { data } = await supabaseAdmin
        .from(table)
        .select("id, attempt_number, completed_naturally, status, completed_at, created_at, archived_at")
        .eq("job_id", jobId)
        .or(filters.join(","))
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    };

    const [culturalSession, discSession, techSession] = await Promise.all([
      fetchLatest("culture_interview_sessions"),
      fetchLatest("candidate_disc_sessions"),
      fetchLatest("technical_interview_sessions"),
    ]);

    const candidates: Array<{ stepType: "cultural" | "disc" | "technical"; session: any }> = [];
    if (culturalSession) candidates.push({ stepType: "cultural", session: culturalSession });
    if (discSession) candidates.push({ stepType: "disc", session: discSession });
    if (techSession) candidates.push({ stepType: "technical", session: techSession });

    // Pick the most recent session that is eligible for retry
    candidates.sort((a, b) => {
      const da = new Date(a.session.created_at || 0).getTime();
      const db = new Date(b.session.created_at || 0).getTime();
      return db - da;
    });

    let chosen: { stepType: "cultural" | "disc" | "technical"; session: any } | null = null;
    for (const c of candidates) {
      const s = c.session;
      const cn = s?.completed_naturally;
      const isAbandoned =
        cn === false ||
        cn == null ||
        (typeof s?.status === "string" && s.status !== "completed" && !s?.completed_at);
      if (isAbandoned) {
        chosen = c;
        break;
      }
      if (cn === true && (s?.attempt_number || 1) <= 1) {
        chosen = c;
        break;
      }
    }

    if (!chosen) return json({ error: "not_eligible", reason: "max_attempts" }, 403);

    const stepType = chosen.stepType;
    const stepStatusMap = { cultural: "cultural_fit", disc: "disc", technical: "technical" };
    const targetStatus = stepStatusMap[stepType];

    let deletedCount = 0;

    if (stepType === "cultural") {
      const { data: sessions } = await supabaseAdmin
        .from("culture_interview_sessions")
        .select("id, account_id, candidate_id, candidate_profile_id, job_id, status, matching_score, matching_analysis, attempt_number, started_at, completed_at, completed_naturally")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId);

      if (sessions && sessions.length > 0) {
        const archive = sessions.map((s: any) => ({
          account_id: s.account_id || accountId,
          candidate_id: s.candidate_id,
          candidate_profile_id: s.candidate_profile_id,
          job_id: s.job_id,
          session_type: "cultural",
          attempt_number: s.attempt_number || 1,
          score: s.matching_score,
          status: s.status,
          completed_naturally: s.completed_naturally,
          summary: { matching_analysis: s.matching_analysis ? String(s.matching_analysis).substring(0, 2000) : null },
          original_session_id: s.id,
          started_at: s.started_at,
          completed_at: s.completed_at,
        }));
        await supabaseAdmin.from("interview_attempt_history").insert(archive);
        // Soft-archive: preserve transcript/responses for diagnosis (no hard delete)
        const { data: archivedRows } = await supabaseAdmin
          .from("culture_interview_sessions")
          .update({ archived_at: new Date().toISOString() })
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .is("archived_at", null)
          .select("id");
        deletedCount = archivedRows?.length || 0;
      }
    } else if (stepType === "disc") {
      const { data: sessions } = await supabaseAdmin
        .from("candidate_disc_sessions")
        .select("id, account_id, candidate_id, candidate_profile_id, job_id, status, attempt_number, started_at, completed_at")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);
        const { data: results } = await supabaseAdmin
          .from("candidate_disc_results")
          .select("session_id, primary_profile, secondary_profile, d_score, i_score, s_score, c_score, match_score, intensity, is_balanced")
          .in("session_id", sessionIds);
        const resultsMap: Record<string, any> = {};
        results?.forEach((r: any) => { resultsMap[r.session_id] = r; });

        const archive = sessions.map((s: any) => {
          const r = resultsMap[s.id];
          return {
            account_id: s.account_id || accountId,
            candidate_id: s.candidate_id,
            candidate_profile_id: s.candidate_profile_id,
            job_id: s.job_id,
            session_type: "disc",
            attempt_number: s.attempt_number || 1,
            score: r?.match_score ?? null,
            status: s.status,
            completed_naturally: null,
            summary: r ? {
              primary_profile: r.primary_profile,
              secondary_profile: r.secondary_profile,
              d_score: r.d_score, i_score: r.i_score, s_score: r.s_score, c_score: r.c_score,
              intensity: r.intensity, is_balanced: r.is_balanced,
            } : {},
            original_session_id: s.id,
            started_at: s.started_at,
            completed_at: s.completed_at,
          };
        });
        await supabaseAdmin.from("interview_attempt_history").insert(archive);
        // Soft-archive: keep DISC results & responses for diagnosis
        await supabaseAdmin
          .from("candidate_disc_sessions")
          .update({ archived_at: new Date().toISOString() })
          .in("id", sessionIds)
          .is("archived_at", null);
        deletedCount = sessions.length;
      }
    } else if (stepType === "technical") {
      const { data: sessions } = await supabaseAdmin
        .from("technical_interview_sessions")
        .select("id, account_id, candidate_id, candidate_profile_id, job_id, status, overall_score, recommendation, evaluation_summary, strengths, gaps, attempt_number, started_at, completed_at, completed_naturally")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);
        const archive = sessions.map((s: any) => ({
          account_id: s.account_id || accountId,
          candidate_id: s.candidate_id,
          candidate_profile_id: s.candidate_profile_id,
          job_id: s.job_id,
          session_type: "technical",
          attempt_number: s.attempt_number || 1,
          score: s.overall_score,
          status: s.status,
          completed_naturally: s.completed_naturally,
          recommendation: s.recommendation,
          summary: {
            evaluation_summary: s.evaluation_summary ? String(s.evaluation_summary).substring(0, 2000) : null,
            strengths: s.strengths || [],
            gaps: s.gaps || [],
          },
          original_session_id: s.id,
          started_at: s.started_at,
          completed_at: s.completed_at,
        }));
        await supabaseAdmin.from("interview_attempt_history").insert(archive);
        // Soft-archive: keep technical responses for diagnosis
        await supabaseAdmin
          .from("technical_interview_sessions")
          .update({ archived_at: new Date().toISOString() })
          .in("id", sessionIds)
          .is("archived_at", null);
        deletedCount = sessions.length;
      }
    }

    await supabaseAdmin
      .from("recruitment_applications")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        update_source: "candidate_retry_step",
      })
      .eq("id", applicationId);

    await supabaseAdmin.from("candidate_tracking_events").insert({
      account_id: accountId,
      candidate_id: candidateId,
      job_id: jobId,
      application_id: applicationId,
      event_type: "step_reset",
      metadata: {
        step_type: stepType,
        reset_by: user.id,
        reset_by_role: "candidate",
        previous_status: application.status,
        new_status: targetStatus,
        deleted_sessions: deletedCount,
      },
    });

    console.log(`✅ Candidate ${user.id} self-retry ${stepType} on job ${jobId} (deleted ${deletedCount})`);

    return json({ success: true, stepType, newStatus: targetStatus, deletedSessions: deletedCount });
  } catch (err) {
    console.error("candidate-retry-step error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
