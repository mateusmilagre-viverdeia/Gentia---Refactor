import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    console.log("🔍 Validating technical interview token:", token);

    // Fetch session with related data
    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
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
        questions,
        job_description_context,
        overall_score,
        recommendation,
        last_activity_at,
        resume_count
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
    const expiresAt = new Date(session.expires_at);
    
    if (expiresAt < now) {
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
            overallScore: session.overall_score,
            recommendation: session.recommendation,
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
        console.log("⏰ In-progress technical session inactive > 60 min, treating as completed");
        await supabase
          .from("technical_interview_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", session.id);
        return new Response(
          JSON.stringify({
            valid: true,
            session: {
              id: session.id,
              status: "completed",
              overallScore: session.overall_score,
              recommendation: session.recommendation,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("🔄 Tech session in_progress and resumable");
    }

    // Check if cancelled or expired
    if (session.status === "cancelled" || session.status === "expired") {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "SESSION_CANCELLED",
          message: "Esta sessão foi cancelada ou expirou." 
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
        .select("name, email")
        .eq("id", session.candidate_id)
        .single();
      
      if (candidate) {
        candidateName = candidate.name || "Candidato";
        candidateEmail = candidate.email || "";
      }
    }

    // Fetch company details
    let companyName = "Empresa";
    let companyLogo = null;
    
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.account_id)
      .single();
    
    if (company) {
      companyName = company.name;
    }

    // Get job context
    const jobContext = session.job_description_context as any;
    const skills = [
      ...(jobContext?.requiredSkills || []),
      ...(jobContext?.desiredSkills || []),
    ];

    // Resume progress info (skills covered so far)
    let resumeProgress: { covered: number; total: number } | null = null;
    if (session.status === "in_progress") {
      const allQuestions = (session.questions as any[]) || [];
      const totalSkills = new Set(allQuestions.map((q: any) => q.skill)).size || allQuestions.length || 0;
      const { data: prevResponses } = await supabase
        .from("technical_interview_responses")
        .select("skill_name")
        .eq("session_id", session.id)
        .eq("is_followup", false);
      const coveredSkills = new Set((prevResponses || []).map((r: any) => r.skill_name)).size;
      resumeProgress = { covered: coveredSkills, total: totalSkills };
    }

    console.log("✅ Session validated successfully");

    return new Response(
      JSON.stringify({
        valid: true,
        session: {
          id: session.id,
          status: session.status,
          candidateName,
          candidateEmail,
          companyName,
          companyLogo,
          jobTitle: jobContext?.title || "Vaga",
          jobMission: jobContext?.mission || "",
          skills: skills.slice(0, 10), // Limit to 10 skills for display
          questionsCount: (session.questions as any[])?.length || 0,
          expiresAt: session.expires_at,
          startedAt: session.started_at,
          canResume: session.status === "in_progress" && ((session as any).resume_count ?? 0) < 3,
          resumeCount: (session as any).resume_count ?? 0,
          resumeProgress,
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
