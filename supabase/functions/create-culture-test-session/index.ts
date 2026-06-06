// Cria uma sessão de entrevista cultural marcada como is_test=true,
// usando exatamente as mesmas perguntas (values_questions_items) que um
// candidato real receberia para a vaga selecionada.
//
// SEM cobrança: a sessão é marcada como is_test e culture-interview-complete /
// interview-watchdog fazem early-return antes de debitar créditos ou disparar
// scoring/notificações.
//
// AUTH: membro da account dona da vaga (super admin coberto pela mesma checagem
// via is_super_admin OR is_account_member).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { filterFactualQuestions } from "../_shared/factualQuestionFilter.ts";
import { resolveCulturalAgentId } from "../_shared/resolveCulturalAgent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      .select("id, title, account_id")
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

    // ── Load canonical cultural questions for this account ──
    const { data: vqSession } = await supabaseAdmin
      .from("values_questions_sessions")
      .select("id")
      .eq("account_id", job.account_id)
      .maybeSingle();

    let questions: Array<{ id: string; position: number; question_text: string; value_label: string | null; requires_thinking_time: boolean }> = [];
    if (vqSession?.id) {
      const { data: qs } = await supabaseAdmin
        .from("values_questions_items")
        .select("id, stage_number, value_label, question_text, position, requires_thinking_time")
        .eq("session_id", vqSession.id)
        .order("stage_number", { ascending: true })
        .order("position", { ascending: true });
      const rawQs = (qs || []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        value_label: q.value_label,
        requires_thinking_time: !!q.requires_thinking_time,
      }));
      // Remove perguntas biográficas/factuais — mesma proteção aplicada no
      // start-culture-session / send-interview-invite para o fluxo de produção.
      const { kept, removed } = filterFactualQuestions(rawQs, (q) => q.question_text);
      if (removed.length > 0) {
        console.log("[factualFilter] create-culture-test-session removed", {
          removedCount: removed.length,
          removedTexts: removed.map((r) => r.question_text),
        });
      }
      questions = kept.map((q, i) => ({
        id: q.id,
        position: i + 1,
        question_text: q.question_text,
        value_label: q.value_label,
        requires_thinking_time: q.requires_thinking_time,
      }));
    }


    if (questions.length === 0) {
      return new Response(JSON.stringify({
        error: "NO_QUESTIONS_CONFIGURED",
        message: "Esta conta não tem perguntas de valores configuradas. Configure em Atração & Contratação → Perguntas de Valores antes de simular.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create a throwaway test candidate ──
    const safeTester = (testerName?.toString().trim() || "Testador").slice(0, 80);
    const fakeEmail = `test+${crypto.randomUUID()}@gentia.test`;
    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("recruitment_candidates")
      .insert({
        account_id: job.account_id,
        first_name: `Teste — ${safeTester}`,
        last_name: "(simulação)",
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

    // ── Resolve cultural agent_id (Fase 2) ──
    const resolvedAgent = await resolveCulturalAgentId(supabaseAdmin, {
      jobId: job.id,
      accountId: job.account_id,
    });
    console.log("[create-culture-test-session] agent resolved", {
      job_id: job.id,
      account_id: job.account_id,
      level: resolvedAgent.level,
      source: resolvedAgent.source,
      agent_id: resolvedAgent.agentId,
    });

    // ── Create the test session ──
    const interviewToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("culture_interview_sessions")
      .insert({
        account_id: job.account_id,
        job_id: job.id,
        candidate_id: candidate.id,
        agent_id: resolvedAgent.agentId,
        token: interviewToken,
        status: "pending",
        questions,
        questions_total: questions.length,
        questions_covered: 0,
        expires_at: expiresAt,
        is_test: true,
        conductor_enabled: true,
        metadata: { simulated_by: userId, tester_name: safeTester },
      } as any)
      .select("id, token")
      .single();
    if (sessErr || !session) {
      console.error("test session insert error:", sessErr);
      // best-effort cleanup of orphan candidate
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-culture-test-session error:", e);
    return new Response(JSON.stringify({
      error: "INTERNAL_ERROR",
      message: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
