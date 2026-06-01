import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { candidateId, jobId, stepType, applicationId } = await req.json();

    if (!candidateId || !jobId || !stepType || !applicationId) {
      return new Response(JSON.stringify({ error: "Missing required fields: candidateId, jobId, stepType, applicationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSteps = ["cultural", "disc", "technical"];
    if (!validSteps.includes(stepType)) {
      return new Response(JSON.stringify({ error: `Invalid stepType. Must be one of: ${validSteps.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get application to find account_id
    const { data: application, error: appError } = await supabaseAdmin
      .from("recruitment_applications")
      .select("id, account_id, status, candidate_id")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = application.account_id;

    // Check user is member with admin role
    const { data: membership } = await supabaseAdmin
      .from("account_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .eq("is_active", true)
      .single();

    let actorRole = membership?.role || null;

    if (!membership || !["owner", "admin", "admin_rh"].includes(membership.role)) {
      const { data: canEdit } = await supabaseAdmin.rpc("can_edit_client_project", {
        _user_id: user.id,
        _account_id: accountId,
      });

      if (!canEdit) {
        return new Response(JSON.stringify({ error: "Insufficient permissions. Required: owner, admin, admin_rh, or EP consultant" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actorRole = "consultant";
    }

    // Step-specific status mapping
    const stepStatusMap: Record<string, string> = {
      cultural: "cultural_fit",
      disc: "disc",
      technical: "technical",
    };

    const targetStatus = stepStatusMap[stepType];

    // Determine next attempt_number from existing sessions before deleting
    let nextAttemptNumber = 1;
    if (stepType === "cultural") {
      const { data: existingSessions } = await supabaseAdmin
        .from("culture_interview_sessions")
        .select("attempt_number")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("attempt_number", { ascending: false })
        .limit(1);
      nextAttemptNumber = (existingSessions?.[0]?.attempt_number || 1) + 1;
    } else if (stepType === "disc") {
      const { data: existingSessions } = await supabaseAdmin
        .from("candidate_disc_sessions")
        .select("attempt_number")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("attempt_number", { ascending: false })
        .limit(1);
      nextAttemptNumber = (existingSessions?.[0]?.attempt_number || 1) + 1;
    } else if (stepType === "technical") {
      const { data: existingSessions } = await supabaseAdmin
        .from("technical_interview_sessions")
        .select("attempt_number")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("attempt_number", { ascending: false })
        .limit(1);
      nextAttemptNumber = (existingSessions?.[0]?.attempt_number || 1) + 1;
    }

    let deletedCount = 0;

    // ========== ARCHIVE BEFORE DELETE ==========
    if (stepType === "cultural") {
      // Fetch full session data before deleting
      const { data: sessions } = await supabaseAdmin
        .from("culture_interview_sessions")
        .select("id, account_id, candidate_id, candidate_profile_id, job_id, status, matching_score, matching_analysis, attempt_number, started_at, completed_at, completed_naturally")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId);

      if (sessions && sessions.length > 0) {
        // Archive each session
        const archiveRecords = sessions.map((s: any) => ({
          account_id: s.account_id || accountId,
          candidate_id: s.candidate_id,
          candidate_profile_id: s.candidate_profile_id,
          job_id: s.job_id,
          session_type: "cultural",
          attempt_number: s.attempt_number || 1,
          score: s.matching_score,
          status: s.status,
          completed_naturally: s.completed_naturally,
          summary: {
            matching_analysis: s.matching_analysis ? s.matching_analysis.substring(0, 2000) : null,
          },
          original_session_id: s.id,
          started_at: s.started_at,
          completed_at: s.completed_at,
        }));

        await supabaseAdmin.from("interview_attempt_history").insert(archiveRecords);

        // Soft-archive: preserve transcript/responses
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
      // Fetch DISC sessions with results before deleting
      const { data: sessions } = await supabaseAdmin
        .from("candidate_disc_sessions")
        .select("id, account_id, candidate_id, candidate_profile_id, job_id, status, attempt_number, started_at, completed_at")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);

        // Fetch results for archiving
        const { data: results } = await supabaseAdmin
          .from("candidate_disc_results")
          .select("session_id, primary_profile, secondary_profile, d_score, i_score, s_score, c_score, match_score, intensity, is_balanced")
          .in("session_id", sessionIds);

        const resultsMap: Record<string, any> = {};
        results?.forEach((r: any) => { resultsMap[r.session_id] = r; });

        // Archive
        const archiveRecords = sessions.map((s: any) => {
          const result = resultsMap[s.id];
          return {
            account_id: s.account_id || accountId,
            candidate_id: s.candidate_id,
            candidate_profile_id: s.candidate_profile_id,
            job_id: s.job_id,
            session_type: "disc",
            attempt_number: s.attempt_number || 1,
            score: result?.match_score ?? null,
            status: s.status,
            completed_naturally: null,
            summary: result ? {
              primary_profile: result.primary_profile,
              secondary_profile: result.secondary_profile,
              d_score: result.d_score,
              i_score: result.i_score,
              s_score: result.s_score,
              c_score: result.c_score,
              intensity: result.intensity,
              is_balanced: result.is_balanced,
            } : {},
            original_session_id: s.id,
            started_at: s.started_at,
            completed_at: s.completed_at,
          };
        });

        await supabaseAdmin.from("interview_attempt_history").insert(archiveRecords);

        // Soft-archive: keep results & responses
        await supabaseAdmin
          .from("candidate_disc_sessions")
          .update({ archived_at: new Date().toISOString() })
          .in("id", sessionIds)
          .is("archived_at", null);

        deletedCount = sessions.length;
      }
    } else if (stepType === "technical") {
      // Fetch technical sessions before deleting
      const { data: sessions } = await supabaseAdmin
        .from("technical_interview_sessions")
        .select("id, account_id, candidate_id, candidate_profile_id, job_id, status, overall_score, recommendation, evaluation_summary, strengths, gaps, attempt_number, started_at, completed_at, completed_naturally")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);

        // Archive
        const archiveRecords = sessions.map((s: any) => ({
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
            evaluation_summary: s.evaluation_summary ? s.evaluation_summary.substring(0, 2000) : null,
            strengths: s.strengths || [],
            gaps: s.gaps || [],
          },
          original_session_id: s.id,
          started_at: s.started_at,
          completed_at: s.completed_at,
        }));

        await supabaseAdmin.from("interview_attempt_history").insert(archiveRecords);

        // Soft-archive: keep responses
        await supabaseAdmin
          .from("technical_interview_sessions")
          .update({ archived_at: new Date().toISOString() })
          .in("id", sessionIds)
          .is("archived_at", null);

        deletedCount = sessions.length;
      }
    }

    // Update application status back to the step
    await supabaseAdmin
      .from("recruitment_applications")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        update_source: "reset_candidate_step",
      })
      .eq("id", applicationId);

    // Log audit event
    await supabaseAdmin
      .from("candidate_tracking_events")
      .insert({
        account_id: accountId,
        candidate_id: candidateId,
        job_id: jobId,
        application_id: applicationId,
        event_type: "step_reset",
        metadata: {
          step_type: stepType,
          reset_by: user.id,
          reset_by_role: actorRole,
          previous_status: application.status,
          new_status: targetStatus,
          deleted_sessions: deletedCount,
          next_attempt_number: nextAttemptNumber,
        },
      });

    console.log(`✅ Reset step '${stepType}' for candidate ${candidateId} on job ${jobId}. Archived & deleted ${deletedCount} session(s).`);

    return new Response(
      JSON.stringify({
        success: true,
        stepType,
        newStatus: targetStatus,
        deletedSessions: deletedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Error in reset-candidate-step:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
