import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function logEvent(event: string, sessionId: string | null, data: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      fn: 'validate-interview-session',
      event,
      sessionId,
      ...data,
    }));
  } catch (_e) { /* ignore */ }
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "TOKEN_REQUIRED",
          message: "Token é obrigatório" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔍 Validating culture interview token:", token);

    // Fetch session with related data
    const { data: session, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .select(`
        id,
        account_id,
        job_id,
        candidate_id,
        agent_id,
        token,
        expires_at,
        status,
        started_at,
        completed_at,
        last_activity_at,
        resume_count,
        can_resume,
        resume_expires_at,
        questions_total,
        questions_covered,
        conductor_enabled,
        is_test

      `)
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "SESSION_NOT_FOUND",
          message: "Link inválido ou não encontrado" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    const now = new Date();
    const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
    
    if (expiresAt && expiresAt < now) {
      console.log("⏰ Session expired:", session.expires_at);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "SESSION_EXPIRED",
          message: "Este convite expirou. Solicite um novo link." 
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed
    if (session.status === "completed") {
      console.log("✅ Session already completed");
      return new Response(
        JSON.stringify({ 
          valid: true,
          session: {
            id: session.id,
            status: "completed",
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle in_progress: check if resumable (< 60 min inactivity)
    if (session.status === "in_progress") {
      const startedAt = session.started_at ? new Date(session.started_at) : null;
      const lastActivityAt = (session as any).last_activity_at
        ? new Date((session as any).last_activity_at)
        : startedAt;
      const cutoff = new Date(now.getTime() - 60 * 60 * 1000);

      if (!lastActivityAt || lastActivityAt < cutoff) {
        console.log("⏰ In-progress session inactive > 60 min, treating as completed");
        await supabase
          .from("culture_interview_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        return new Response(
          JSON.stringify({
            valid: true,
            session: {
              id: session.id,
              status: "completed",
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("🔄 Session in_progress and resumable");
    }

    // Handle abandoned + can_resume within 48h window (treat as resumable)
    const canResumeAbandoned =
      session.status === "abandoned" &&
      (session as any).can_resume === true &&
      (session as any).resume_expires_at &&
      new Date((session as any).resume_expires_at) > now;

    // Check if cancelled or expired or definitively abandoned
    if (
      session.status === "cancelled" ||
      session.status === "expired" ||
      (session.status === "abandoned" && !canResumeAbandoned)
    ) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "SESSION_CANCELLED",
          message: "Esta sessão foi cancelada ou expirou.",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch candidate details
    let candidateName = "Candidato";
    let candidateEmail = "";
    
    if (session.candidate_id) {
      const { data: candidate } = await supabase
        .from("recruitment_candidates")
        .select("name, first_name, last_name, email")
        .eq("id", session.candidate_id)
        .single();
      
      if (candidate) {
        candidateName = candidate.name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Candidato";
        candidateEmail = candidate.email || "";
      }
    }

    // Fetch company details
    let companyName = "Empresa";
    
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.account_id)
      .single();
    
    if (company) {
      companyName = company.name;
    }

    // Fetch job details
    let jobTitle = "Vaga";
    
    if (session.job_id) {
      const { data: job } = await supabase
        .from("recruitment_jobs")
        .select("title")
        .eq("id", session.job_id)
        .single();
      
      if (job) {
        jobTitle = job.title;
      }
    }

    // Fetch agent details if available
    let agentName = null;
    
    if (session.agent_id) {
      const { data: agent } = await supabase
        .from("recruitment_agents")
        .select("name")
        .eq("id", session.agent_id)
        .single();
      
      if (agent) {
        agentName = agent.name;
      }
    }

    // Resume progress info (when in_progress OR abandoned-resumable)
    let resumeProgress: { covered: number; total: number } | null = null;
    if (session.status === "in_progress" || canResumeAbandoned) {
      const totalFromSession = (session as any).questions_total ?? 0;
      const coveredFromSession = (session as any).questions_covered ?? 0;
      if (totalFromSession > 0) {
        resumeProgress = { covered: coveredFromSession, total: totalFromSession };
      } else {
        // Fallback: contar responses persistidas
        const { count } = await supabase
          .from("culture_interview_responses")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id);
        resumeProgress = { covered: count ?? 0, total: 5 };
      }
    }

    const finalCanResume =
      (session.status === "in_progress" && ((session as any).resume_count ?? 0) < 3) ||
      canResumeAbandoned;

    logEvent('session_validated', session.id, {
      status: session.status,
      isTest: (session as any).is_test === true,
      canResume: finalCanResume,
      wasAbandoned: canResumeAbandoned,
    });
    console.log("✅ Session validated successfully", { canResumeAbandoned, finalCanResume });

    return new Response(
      JSON.stringify({
        valid: true,
        session: {
          id: session.id,
          status: session.status,
          candidateName,
          candidateEmail,
          companyName,
          jobTitle,
          agentId: session.agent_id,
          agentName,
          expiresAt: session.expires_at,
          startedAt: session.started_at,
          canResume: finalCanResume,
          resumeCount: (session as any).resume_count ?? 0,
          resumeProgress,
          resumeExpiresAt: (session as any).resume_expires_at ?? null,
          wasAbandoned: canResumeAbandoned,
          conductorEnabled: !!(session as any).conductor_enabled,
          isTest: (session as any).is_test === true,

        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error validating session:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
