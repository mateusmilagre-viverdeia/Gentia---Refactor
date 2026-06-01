// Cria uma sessão de entrevista técnica marcada como is_test=true,
// usando exatamente as mesmas perguntas/skills/JD que um candidato real
// receberia para a vaga selecionada.
//
// SEM cobrança: a sessão é marcada como is_test e technical-interview-complete /
// interview-watchdog fazem early-return antes de debitar créditos ou disparar
// scoring/notificações.
//
// AUTH: super admin OR membro da account dona da vaga.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TechnicalQuestion {
  skill: string;
  skillType: "required" | "desired";
  level: number;
  questionText: string;
  followupSuperficial: string;
  followupExcellent: string;
  isFromBank: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth ──
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const { jobId, testerName } = body as { jobId?: string; testerName?: string };
    if (!jobId) {
      return new Response(JSON.stringify({ error: "JOB_ID_REQUIRED" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Load job + account ──
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("recruitment_jobs")
      .select("id, title, account_id, job_description_id")
      .eq("id", jobId)
      .single();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "JOB_NOT_FOUND" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize: super admin OR member of the job's account
    const { data: isSuperAdminData } = await supabaseAdmin.rpc("is_super_admin", { _user_id: userId });
    if (!isSuperAdminData) {
      const { data: memberRow } = await supabaseAdmin
        .from("account_members")
        .select("user_id")
        .eq("account_id", job.account_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!memberRow) {
        return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Load job description context ──
    let jobDescriptionContext: any = {
      title: job.title,
      mission: null,
      requiredSkills: [],
      desiredSkills: [],
      responsibilities: [],
    };
    if (job.job_description_id) {
      const { data: jd } = await supabaseAdmin
        .from("job_descriptions")
        .select("title, mission, required_skills, desired_skills, responsibilities")
        .eq("id", job.job_description_id)
        .single();
      if (jd) {
        jobDescriptionContext = {
          title: jd.title || job.title,
          mission: jd.mission,
          requiredSkills: jd.required_skills || [],
          desiredSkills: jd.desired_skills || [],
          responsibilities: jd.responsibilities || [],
        };
      }
    }

    // ── Generate technical questions (same logic as send-technical-invitation) ──
    const questions: TechnicalQuestion[] = [];
    for (const skill of (jobDescriptionContext.requiredSkills || []).slice(0, 5)) {
      questions.push({
        skill,
        skillType: "required",
        level: 2,
        questionText: `Explique sua experiência com ${skill} e como você aplica isso no dia a dia.`,
        followupSuperficial: `Pode dar um exemplo mais concreto de quando você utilizou ${skill}?`,
        followupExcellent: `Quais são os desafios avançados que você enfrentou com ${skill}?`,
        isFromBank: false,
      });
    }
    for (const skill of (jobDescriptionContext.desiredSkills || []).slice(0, 3)) {
      questions.push({
        skill,
        skillType: "desired",
        level: 1,
        questionText: `Você tem experiência com ${skill}? Conte-me sobre isso.`,
        followupSuperficial: `Já teve oportunidade de estudar ou usar ${skill} em algum projeto?`,
        followupExcellent: `Como você integraria ${skill} com as outras tecnologias do dia a dia?`,
        isFromBank: false,
      });
    }

    if (questions.length === 0) {
      return new Response(JSON.stringify({
        error: "NO_SKILLS_CONFIGURED",
        message: "Esta vaga não tem skills configuradas na descrição. Cadastre skills obrigatórias ou desejadas antes de simular.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve technical agent from workflow steps ──
    const { data: techStep } = await supabaseAdmin
      .from("recruitment_job_workflow_steps")
      .select("agent_id")
      .eq("job_id", jobId)
      .eq("step_type", "technical")
      .eq("is_active", true)
      .maybeSingle();
    const resolvedAgentId = techStep?.agent_id || null;

    // ── Create a throwaway test candidate ──
    const safeTester = (testerName?.toString().trim() || "Testador").slice(0, 80);
    const fakeEmail = `test+${crypto.randomUUID()}@gentia.test`;
    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("recruitment_candidates")
      .insert({
        account_id: job.account_id,
        first_name: `Teste — ${safeTester}`,
        last_name: "(simulação técnica)",
        email: fakeEmail,
        is_test: true,
      } as any)
      .select("id")
      .single();
    if (candErr || !candidate) {
      console.error("test candidate insert error:", candErr);
      return new Response(JSON.stringify({ error: "CANDIDATE_CREATE_FAILED", message: candErr?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create the test session ──
    const interviewToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("technical_interview_sessions")
      .insert({
        account_id: job.account_id,
        job_id: job.id,
        candidate_id: candidate.id,
        agent_id: resolvedAgentId,
        token: interviewToken,
        status: "pending",
        questions,
        job_description_context: jobDescriptionContext,
        expires_at: expiresAt,
        is_test: true,
        metadata: { simulated_by: userId, tester_name: safeTester },
      } as any)
      .select("id, token")
      .single();
    if (sessErr || !session) {
      console.error("test session insert error:", sessErr);
      await supabaseAdmin.from("recruitment_candidates").delete().eq("id", candidate.id);
      return new Response(JSON.stringify({ error: "SESSION_CREATE_FAILED", message: sessErr?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      token: session.token,
      sessionId: session.id,
      jobTitle: job.title,
      questionsTotal: questions.length,
      skillsTotal: new Set(questions.map((q) => q.skill)).size,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-technical-test-session error:", e);
    return new Response(JSON.stringify({
      error: "INTERNAL_ERROR",
      message: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
