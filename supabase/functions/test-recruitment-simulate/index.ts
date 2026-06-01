// Test recruitment E2E simulation v2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_CANDIDATE = {
  first_name: "Guilherme",
  last_name: "Filho",
  email: "gg@ecpmais.com.br",
  phone: "+5581999788881",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function checkCommunications(supabase: any, candidateId: string, jobId: string, since: string) {
  const { data: logs } = await supabase
    .from("recruitment_communications_log")
    .select("channel, status, message_type, error_message, created_at")
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const comms = logs || [];
  const whatsappLogs = comms.filter((l: any) => l.channel === "whatsapp");
  const emailLogs = comms.filter((l: any) => l.channel === "email");

  return {
    whatsapp: {
      sent: whatsappLogs.some((l: any) => l.status === "sent" || l.status === "delivered"),
      skipped: whatsappLogs.some((l: any) => l.status === "skipped"),
      count: whatsappLogs.length,
      details: whatsappLogs,
    },
    email: {
      sent: emailLogs.some((l: any) => l.status === "sent" || l.status === "delivered" || l.status === "queued"),
      count: emailLogs.length,
      details: emailLogs,
    },
    all: comms,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, jobId, accountId, candidateId, applicationId, forceAllSteps } = body;

    // Helper: ensure workflow steps exist for all 3 types when forceAllSteps
    async function ensureWorkflowSteps(jId: string) {
      if (!forceAllSteps) return [];
      const { data: existing } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("step_type")
        .eq("job_id", jId)
        .eq("is_active", true);
      const existingTypes = (existing || []).map((s: any) => s.step_type);
      const allTypes = ["screening", "cultural", "disc", "technical"];
      const missing = allTypes.filter((t) => !existingTypes.includes(t));
      const createdIds: string[] = [];
      for (const stepType of missing) {
        const pos = stepType === "screening" ? 0 : stepType === "cultural" ? 1 : stepType === "disc" ? 2 : 3;
        const thresholdConfig = stepType === "screening"
          ? {
              questions: [
                { id: "q_test_1", category: "custom", text: "Você tem disponibilidade para início imediato?", required: true },
                { id: "q_test_2", category: "custom", text: "Você possui experiência na área desta vaga?", required: true },
              ],
            }
          : { min_score: 70 };
        const { data: created } = await supabase
          .from("recruitment_job_workflow_steps")
          .insert({
            job_id: jId,
            step_type: stepType,
            position: pos,
            is_active: true,
            threshold_config: thresholdConfig,
          })
          .select("id")
          .single();
        if (created) createdIds.push(created.id);
      }
      return createdIds;
    }

    // Helper: remove temporarily created workflow steps
    async function cleanupTempSteps(ids: string[]) {
      if (ids.length === 0) return;
      for (const id of ids) {
        await supabase.from("recruitment_job_workflow_steps").delete().eq("id", id);
      }
    }

    // Helper: cleanup old idempotency hashes for this candidate/job so orchestrator re-processes
    async function cleanupIdempotencyHashes(cId: string, jId: string) {
      await supabase
        .from("recruitment_communications_log")
        .delete()
        .eq("candidate_id", cId)
        .eq("job_id", jId)
        .eq("channel", "system")
        .like("message_type", "auto_%");
      console.log("🧹 Cleaned up old idempotency hashes for re-execution");
    }

    const jsonResponse = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ─── SETUP ──────────────────────────────────────────────────────
    if (action === "setup") {
      let candidate: any;
      const { data: existing } = await supabase
        .from("recruitment_candidates")
        .select("id, first_name, last_name, email, phone")
        .eq("account_id", accountId)
        .eq("email", TEST_CANDIDATE.email)
        .maybeSingle();

      if (existing) {
        candidate = existing;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("recruitment_candidates")
          .insert({
            account_id: accountId,
            first_name: TEST_CANDIDATE.first_name,
            last_name: TEST_CANDIDATE.last_name,
            email: TEST_CANDIDATE.email,
            phone: TEST_CANDIDATE.phone,
            source: "test",
          })
          .select("id, first_name, last_name, email, phone")
          .single();
        if (createErr) throw createErr;
        candidate = created;
      }

      // Idempotent setup: avoid duplicate key on (candidate_id, job_id)
      const { data: app, error: appErr } = await supabase
        .from("recruitment_applications")
        .upsert(
          {
            account_id: accountId,
            job_id: jobId,
            candidate_id: candidate.id,
            status: "new",
            source: "test-e2e",
          },
          {
            onConflict: "candidate_id,job_id",
            ignoreDuplicates: false,
          }
        )
        .select("id")
        .single();

      if (appErr) throw appErr;

      // Fetch workflow steps for the job
      const { data: wfSteps } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("step_type, position, is_active")
        .eq("job_id", jobId)
        .eq("is_active", true)
        .order("position");

      const activeSteps = (wfSteps || []).map((s: any) => s.step_type);
      const stepsToRun = forceAllSteps ? ["screening", "cultural", "disc", "technical"] : (activeSteps.length > 0 ? activeSteps : ["screening", "cultural", "disc", "technical"]);

      return jsonResponse({
        success: true,
        candidateId: candidate.id,
        applicationId: app.id,
        candidateName: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
        candidateEmail: candidate.email,
        candidatePhone: candidate.phone,
        stepsToRun,
        forceAllSteps: !!forceAllSteps,
      });
    }

    // ─── SIMULATE SCREENING ─────────────────────────────────────────
    if (action === "simulate-screening") {
      const beforeTs = new Date().toISOString();
      await cleanupIdempotencyHashes(candidateId, jobId);
      const tempStepIds = await ensureWorkflowSteps(jobId);

      // Get screening questions from workflow step
      const { data: screeningStep } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("threshold_config")
        .eq("job_id", jobId)
        .eq("step_type", "screening")
        .eq("is_active", true)
        .maybeSingle();

      const questions = (screeningStep?.threshold_config as any)?.questions || [
        { id: "q_default_1", category: "custom", text: "Pergunta genérica 1?", required: true },
        { id: "q_default_2", category: "custom", text: "Pergunta genérica 2?", required: true },
      ];

      // Simulate all answers as true (approved)
      const answeredQuestions = questions.map((q: any) => ({
        ...q,
        answer: true,
        passed: true,
      }));

      const screeningResult = await supabase.functions.invoke("screening-evaluate", {
        body: {
          applicationId,
          candidateId,
          jobId,
          accountId,
          questions: answeredQuestions,
          passed: true,
        },
      });

      await delay(3000);
      const communications = await checkCommunications(supabase, candidateId, jobId, beforeTs);

      await cleanupTempSteps(tempStepIds);

      return jsonResponse({
        success: true,
        screeningPassed: true,
        questionsCount: questions.length,
        orchestratorStatus: screeningResult.error ? "error" : "ok",
        orchestratorData: screeningResult.data,
        orchestratorError: screeningResult.error?.message,
        communications,
      });
    }

    // ─── SIMULATE CULTURAL ──────────────────────────────────────────
    if (action === "simulate-cultural") {
      const beforeTs = new Date().toISOString();
      await cleanupIdempotencyHashes(candidateId, jobId);
      const tempStepIds = await ensureWorkflowSteps(jobId);

      const { data: session, error: sessErr } = await supabase
        .from("culture_interview_sessions")
        .insert({
          account_id: accountId,
          job_id: jobId,
          candidate_id: candidateId,
          status: "completed",
          matching_score: 85,
          questions: [
            { question: "Teste Q1", answer: "Resposta teste 1" },
            { question: "Teste Q2", answer: "Resposta teste 2" },
          ],
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr) throw sessErr;

      const orchRes = await supabase.functions.invoke("recruitment-orchestrator", {
        body: { candidateId, jobId, accountId, completedStepType: "cultural", sessionId: session.id },
      });

      // Wait for async communications to be processed
      await delay(5000);
      const communications = await checkCommunications(supabase, candidateId, jobId, beforeTs);

      await cleanupTempSteps(tempStepIds);

      return jsonResponse({
        success: true,
        sessionId: session.id,
        orchestratorStatus: orchRes.error ? "error" : "ok",
        orchestratorData: orchRes.data,
        orchestratorError: orchRes.error?.message,
        communications,
      });
    }

    // ─── SIMULATE DISC ──────────────────────────────────────────────
    if (action === "simulate-disc") {
      const beforeTs = new Date().toISOString();
      await cleanupIdempotencyHashes(candidateId, jobId);
      const discToken = crypto.randomUUID();
      const tempStepIds = await ensureWorkflowSteps(jobId);

      // Query job's DISC profile to generate scores above eliminators/targets
      let dNorm = 80, iNorm = 75, sNorm = 70, cNorm = 72;
      const { data: discProfile } = await supabase
        .from("recruitment_disc_profiles")
        .select("settings")
        .eq("job_id", jobId)
        .maybeSingle();

      if (discProfile?.settings) {
        const s = discProfile.settings as Record<string, unknown>;
        const targets = s.targets as Record<string, number> | undefined;
        const eliminators = s.eliminators as Record<string, number> | undefined;
        const tolerance = (s.tolerance as number) || 10;
        // Ensure scores are above eliminators and close to targets
        if (targets) {
          dNorm = Math.max(dNorm, (targets.d || 0) + tolerance);
          iNorm = Math.max(iNorm, (targets.i || 0) + tolerance);
          sNorm = Math.max(sNorm, (targets.s || 0) + tolerance);
          cNorm = Math.max(cNorm, (targets.c || 0) + tolerance);
        }
        if (eliminators) {
          dNorm = Math.max(dNorm, (eliminators.d || 0) + 10);
          iNorm = Math.max(iNorm, (eliminators.i || 0) + 10);
          sNorm = Math.max(sNorm, (eliminators.s || 0) + 10);
          cNorm = Math.max(cNorm, (eliminators.c || 0) + 10);
        }
        // Cap at 100
        dNorm = Math.min(dNorm, 100);
        iNorm = Math.min(iNorm, 100);
        sNorm = Math.min(sNorm, 100);
        cNorm = Math.min(cNorm, 100);
      }

      const { data: session, error: sessErr } = await supabase
        .from("candidate_disc_sessions")
        .insert({
          account_id: accountId,
          job_id: jobId,
          candidate_id: candidateId,
          status: "completed",
          token: discToken,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr) throw sessErr;

      const { error: resErr } = await supabase
        .from("candidate_disc_results")
        .insert({
          session_id: session.id,
          d_score: Math.round(dNorm * 0.45), i_score: Math.round(iNorm * 0.38),
          s_score: Math.round(sNorm * 0.32), c_score: Math.round(cNorm * 0.22),
          d_normalized: dNorm, i_normalized: iNorm, s_normalized: sNorm, c_normalized: cNorm,
          primary_profile: "D",
          secondary_profile: "I",
          intensity: "alta",
          is_balanced: false,
          match_score: 78,
        });
      if (resErr) throw resErr;

      const orchRes = await supabase.functions.invoke("recruitment-orchestrator", {
        body: { candidateId, jobId, accountId, completedStepType: "disc", sessionId: session.id },
      });

      await delay(5000);
      const communications = await checkCommunications(supabase, candidateId, jobId, beforeTs);

      await cleanupTempSteps(tempStepIds);

      return jsonResponse({
        success: true,
        sessionId: session.id,
        orchestratorStatus: orchRes.error ? "error" : "ok",
        orchestratorData: orchRes.data,
        orchestratorError: orchRes.error?.message,
        communications,
      });
    }

    // ─── SIMULATE TECHNICAL ─────────────────────────────────────────
    if (action === "simulate-technical") {
      const beforeTs = new Date().toISOString();
      await cleanupIdempotencyHashes(candidateId, jobId);
      const techToken = crypto.randomUUID();
      const tempStepIds = await ensureWorkflowSteps(jobId);

      const { data: session, error: sessErr } = await supabase
        .from("technical_interview_sessions")
        .insert({
          account_id: accountId,
          job_id: jobId,
          candidate_id: candidateId,
          status: "completed",
          token: techToken,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          overall_score: 80,
          questions: [
            { question: "Teste técnico Q1", answer: "Resposta técnica 1", score: 80 },
          ],
        })
        .select("id")
        .single();
      if (sessErr) throw sessErr;

      const orchRes = await supabase.functions.invoke("recruitment-orchestrator", {
        body: { candidateId, jobId, accountId, completedStepType: "technical", sessionId: session.id },
      });

      await delay(5000);
      const communications = await checkCommunications(supabase, candidateId, jobId, beforeTs);

      await cleanupTempSteps(tempStepIds);

      return jsonResponse({
        success: true,
        sessionId: session.id,
        orchestratorStatus: orchRes.error ? "error" : "ok",
        orchestratorData: orchRes.data,
        orchestratorError: orchRes.error?.message,
        communications,
      });
    }

    // ─── CHECK COMMUNICATIONS ───────────────────────────────────────
    if (action === "check-communications") {
      const since = body.since || new Date(Date.now() - 3600000).toISOString();
      const communications = await checkCommunications(supabase, candidateId, jobId, since);
      return jsonResponse({ success: true, communications });
    }

    // ─── SIMULATE CULTURAL FULL (Real Pipeline) ─────────────────────
    if (action === "simulate-cultural-full") {
      const beforeTs = new Date().toISOString();
      await cleanupIdempotencyHashes(candidateId, jobId);
      const tempStepIds = await ensureWorkflowSteps(jobId);

      // 1. Create session in_progress (as the real frontend would)
      const { data: session, error: sessErr } = await supabase
        .from("culture_interview_sessions")
        .insert({
          account_id: accountId,
          job_id: jobId,
          candidate_id: candidateId,
          status: "in_progress",
          questions: [
            { question: "Conte sobre uma situação em que precisou adaptar-se rapidamente.", value: "Adaptabilidade" },
            { question: "Como você lida com conflitos na equipe?", value: "Colaboração" },
            { question: "Descreva um momento em que tomou uma decisão difícil.", value: "Liderança" },
            { question: "Como você se mantém motivado em projetos longos?", value: "Resiliência" },
          ],
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr) throw sessErr;

      // 2. Call culture-interview-complete with realistic transcriptEntries
      const mockTranscript: Array<{ type: string; text: string; startSeconds: number }> = [
        { type: "ai", text: "Olá! Bem-vindo à entrevista cultural. Conte sobre uma situação em que precisou adaptar-se rapidamente.", startSeconds: 0 },
        { type: "candidate", text: "Claro! Na minha empresa anterior, tivemos uma mudança repentina de tecnologia. Eu organizei workshops internos para capacitar a equipe e em duas semanas já estávamos operando normalmente. Foi desafiador mas gratificante.", startSeconds: 8 },
        { type: "ai", text: "Muito bom! Como você lida com conflitos na equipe?", startSeconds: 45 },
        { type: "candidate", text: "Eu sempre busco entender os dois lados primeiro. Chamo as pessoas para uma conversa aberta, sem julgamentos, e foco na solução. Acredito que transparência é a chave para resolver qualquer conflito.", startSeconds: 52 },
        { type: "ai", text: "Excelente abordagem. Descreva um momento em que tomou uma decisão difícil.", startSeconds: 90 },
        { type: "candidate", text: "Tive que decidir entre manter um projeto que já tinha investimento considerável ou pivotar para uma nova direção baseada em feedback de clientes. Optei pelo pivô e foi a melhor decisão, aumentamos a retenção em 40%.", startSeconds: 97 },
        { type: "ai", text: "Impressionante! Como você se mantém motivado em projetos longos?", startSeconds: 140 },
        { type: "candidate", text: "Eu quebro o projeto em marcos menores e celebro cada conquista com a equipe. Também mantenho o foco no impacto final que estamos criando. Isso me ajuda a manter a energia mesmo em fases mais difíceis.", startSeconds: 148 },
      ];

      const completeResult = await supabase.functions.invoke("culture-interview-complete", {
        body: {
          sessionId: session.id,
          transcriptEntries: mockTranscript,
          durationSeconds: 200,
        },
      });

      // 3. Wait for processing
      await delay(5000);

      // 4. Verify the results
      const { data: updatedSession } = await supabase
        .from("culture_interview_sessions")
        .select("status, matching_score, matching_analysis, candidate_id")
        .eq("id", session.id)
        .single();

      const { data: responses } = await supabase
        .from("culture_interview_responses")
        .select("id, question_index, start_seconds, candidate_response")
        .eq("session_id", session.id)
        .order("question_index");

      const checks = {
        sessionCompleted: updatedSession?.status === "completed",
        candidateLinked: !!updatedSession?.candidate_id,
        scoreAboveZero: (updatedSession?.matching_score || 0) > 0,
        scoreValue: updatedSession?.matching_score,
        analysisPresent: !!updatedSession?.matching_analysis && updatedSession.matching_analysis.length > 10,
        responsesCount: responses?.length || 0,
        responsesHaveTimestamps: (responses || []).every((r: any) => r.start_seconds !== null && r.start_seconds > 0 || r.question_index === 0),
        responsesHaveContent: (responses || []).every((r: any) => r.candidate_response && r.candidate_response.length > 0),
        pipelineError: completeResult.error?.message || null,
      };

      const allPassed = checks.sessionCompleted && checks.candidateLinked && checks.scoreAboveZero && checks.analysisPresent && checks.responsesCount >= 3 && checks.responsesHaveTimestamps && checks.responsesHaveContent && !checks.pipelineError;

      // If pipeline worked, also call orchestrator
      if (allPassed) {
        await supabase.functions.invoke("recruitment-orchestrator", {
          body: { candidateId, jobId, accountId, completedStepType: "cultural", sessionId: session.id },
        });
        await delay(3000);
      }

      const communications = await checkCommunications(supabase, candidateId, jobId, beforeTs);
      await cleanupTempSteps(tempStepIds);

      return jsonResponse({
        success: allPassed,
        sessionId: session.id,
        pipelineChecks: checks,
        allChecksPassed: allPassed,
        orchestratorStatus: allPassed ? "ok" : "skipped",
        communications,
      });
    }

    // ─── VERIFY DATA INTEGRITY ──────────────────────────────────────
    if (action === "verify-data-integrity") {
      const { stepType, sessionId } = body;
      const checks: Record<string, { passed: boolean; detail: string }> = {};

      if (stepType === "screening" || !stepType) {
        const { data: screening } = await supabase
          .from("recruitment_screening_results")
          .select("id, passed, questions")
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        checks["screening_exists"] = { passed: !!screening, detail: screening ? `ID: ${screening.id}, passed: ${screening.passed}` : "Nenhum resultado encontrado" };
      }

      if (stepType === "cultural" || !stepType) {
        const { data: cultural } = await supabase
          .from("culture_interview_sessions")
          .select("id, status, matching_score, candidate_id, matching_analysis")
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        checks["cultural_session_exists"] = { passed: !!cultural, detail: cultural ? `Status: ${cultural.status}` : "Nenhuma sessão" };
        checks["cultural_candidate_linked"] = { passed: !!cultural?.candidate_id, detail: cultural?.candidate_id || "NULL" };
        checks["cultural_score_above_zero"] = { passed: (cultural?.matching_score || 0) > 0, detail: `Score: ${cultural?.matching_score || 0}` };
        checks["cultural_analysis_present"] = { passed: !!cultural?.matching_analysis, detail: cultural?.matching_analysis ? `${cultural.matching_analysis.substring(0, 60)}...` : "Vazio" };

        if (cultural) {
          const { data: responses } = await supabase
            .from("culture_interview_responses")
            .select("id, start_seconds")
            .eq("session_id", cultural.id);
          checks["cultural_responses_exist"] = { passed: (responses?.length || 0) > 0, detail: `${responses?.length || 0} respostas` };
          checks["cultural_responses_timestamps"] = {
            passed: (responses || []).some((r: any) => r.start_seconds !== null),
            detail: `${(responses || []).filter((r: any) => r.start_seconds !== null).length}/${responses?.length || 0} com timestamps`,
          };
        }
      }

      if (stepType === "disc" || !stepType) {
        const { data: disc } = await supabase
          .from("candidate_disc_sessions")
          .select("id, status")
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (disc) {
          const { data: discResult } = await supabase
            .from("candidate_disc_results")
            .select("d_score, i_score, s_score, c_score, match_score")
            .eq("session_id", disc.id)
            .maybeSingle();
          checks["disc_session_exists"] = { passed: true, detail: `Status: ${disc.status}` };
          checks["disc_results_exist"] = { passed: !!discResult, detail: discResult ? `D:${discResult.d_score} I:${discResult.i_score} S:${discResult.s_score} C:${discResult.c_score}` : "Sem resultados" };
          checks["disc_score_above_zero"] = { passed: (discResult?.match_score || 0) > 0, detail: `Match: ${discResult?.match_score || 0}` };
        } else {
          checks["disc_session_exists"] = { passed: false, detail: "Nenhuma sessão" };
        }
      }

      if (stepType === "technical" || !stepType) {
        const { data: tech } = await supabase
          .from("technical_interview_sessions")
          .select("id, status, overall_score, candidate_id")
          .eq("candidate_id", candidateId)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        checks["technical_session_exists"] = { passed: !!tech, detail: tech ? `Status: ${tech.status}` : "Nenhuma sessão" };
        checks["technical_score_above_zero"] = { passed: (tech?.overall_score || 0) > 0, detail: `Score: ${tech?.overall_score || 0}` };
        checks["technical_candidate_linked"] = { passed: !!tech?.candidate_id, detail: tech?.candidate_id || "NULL" };
      }

      // Application status check
      const { data: app } = await supabase
        .from("recruitment_applications")
        .select("status")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .maybeSingle();
      checks["application_status"] = { passed: !!app, detail: `Status: ${app?.status || "não encontrada"}` };

      const allPassed = Object.values(checks).every((c) => c.passed);

      return jsonResponse({ success: true, checks, allPassed });
    }

    // ─── CLEANUP ────────────────────────────────────────────────────
    if (action === "cleanup") {
      if (candidateId && jobId) {
        await supabase.from("recruitment_screening_results").delete().eq("candidate_id", candidateId).eq("job_id", jobId);
        await supabase.from("culture_interview_sessions").delete().eq("candidate_id", candidateId).eq("job_id", jobId);
        await supabase.from("candidate_disc_sessions").delete().eq("candidate_id", candidateId).eq("job_id", jobId);
        await supabase.from("technical_interview_sessions").delete().eq("candidate_id", candidateId).eq("job_id", jobId);
        await supabase.from("recruitment_communications_log").delete().eq("candidate_id", candidateId).eq("job_id", jobId);
      }
      if (applicationId) {
        await supabase.from("recruitment_applications").delete().eq("id", applicationId);
      }
      return jsonResponse({ success: true, message: "Dados de teste removidos" });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("test-recruitment-simulate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
