import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { compressTranscript } from '../_shared/transcript-compress.ts';
import { getEvaluatorTier, shouldCompressTranscript, getMaxTokensForTier } from '../_shared/evaluator-tier.ts';
import { logAIExecution } from '../_shared/ai-logger.ts';
import { evaluateTechnicalV3, inferSeniorityTarget, type SeniorityTarget } from '../_shared/technical-evaluation-v3.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseTranscript(transcript: string): Array<{ speaker: string; text: string }> {
  if (!transcript) return [];
  const messages: Array<{ speaker: string; text: string }> = [];
  for (const line of transcript.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith('Entrevistador:') || line.startsWith('Entrevistadora:')) {
      const text = line.replace(/^(Entrevistador|Entrevistadora):/, '').trim();
      if (text) messages.push({ speaker: 'ai', text });
    } else if (line.startsWith('Candidato:')) {
      const text = line.replace(/^Candidato:/, '').trim();
      if (text) messages.push({ speaker: 'candidate', text });
    }
  }
  return messages;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    const body = await req.json();
    const { sessionId, _adminBypass } = body || {};
    const isAdminBypass = _adminBypass === supabaseServiceKey;

    let user: any = null;
    if (!isServiceRole && !isAdminBypass) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = data.user;
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔄 Reprocessing technical session: ${sessionId}`);

    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = session.account_id;

    if (!isServiceRole && !isAdminBypass && user) {
      const [{ data: membership }, { data: superAdmin }, { data: canEdit }] = await Promise.all([
        supabase
          .from("account_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("account_id", accountId)
          .maybeSingle(),
        supabase.rpc("is_super_admin", { _user_id: user.id }),
        supabase.rpc("can_edit_client_project", { _user_id: user.id, _account_id: accountId }),
      ]);

      const hasAccountRole = !!membership && ["owner", "admin", "admin_rh"].includes(membership.role);
      const allowed = hasAccountRole || superAdmin === true || canEdit === true;

      if (!allowed) {
        return new Response(JSON.stringify({
          error: "permission_denied",
          message: "Você não tem permissão para reprocessar esta avaliação.",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const transcript = session.transcript || session.partial_transcript || '';
    if (!transcript || transcript.length < 30) {
      return new Response(JSON.stringify({
        error: "no_transcript",
        message: "Sessão sem transcrição para reavaliar.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const questions = (session.questions as any[]) || [];
    const jobContext = session.job_description_context || {};
    const durationSeconds = session.duration_seconds || 0;

    const parsedMessages = parseTranscript(transcript);
    const candidateTurns = parsedMessages.filter((m) => m.speaker === "candidate").length;

    // Resolve seniority + ICP context (best-effort)
    const seniorityTarget: SeniorityTarget =
      (session.seniority_target as SeniorityTarget) ||
      inferSeniorityTarget((jobContext as any)?.title, (jobContext as any)?.mission);

    let icpTechContext = '';
    try {
      if (session.job_id) {
        const { data: activeICP } = await supabase
          .from('job_icps')
          .select('learned_patterns, approved_candidates_count')
          .eq('job_id', session.job_id)
          .eq('is_active', true)
          .maybeSingle();
        if (activeICP?.learned_patterns && (activeICP.approved_candidates_count ?? 0) > 0) {
          const lp = activeICP.learned_patterns as any;
          const parts: string[] = [];
          parts.push(`\n\n## REFERÊNCIA: PADRÕES TÉCNICOS DE ${activeICP.approved_candidates_count} CANDIDATOS APROVADOS\n`);
          if (lp.common_skills?.length > 0) parts.push(`Skills mais frequentes: ${lp.common_skills.map((s: any) => `${s.skill} (${s.frequency}%)`).join(', ')}`);
          if (lp.insights?.length > 0) parts.push(`Insights: ${lp.insights.join('; ')}`);
          icpTechContext = parts.join('\n');
        }
      }
    } catch (e) {
      console.error("⚠️ ICP fetch error:", e);
    }

    const evaluatorTier = await getEvaluatorTier(supabase as any, accountId);
    const compression = shouldCompressTranscript(evaluatorTier)
      ? compressTranscript(transcript)
      : { compressed: transcript, originalChars: transcript.length, compressedChars: transcript.length, ratio: 1 };

    const techModel = await getConfiguredModel("reprocess-technical-evaluation", "google/gemini-3-flash-preview");

    console.log(`🤖 Calling V3 evaluator (seniority=${seniorityTarget}, turns=${candidateTurns}, duration=${durationSeconds}s)`);
    const llmStart = Date.now();

    let v3Result;
    let usage: any = {};
    try {
      const res = await evaluateTechnicalV3({
        model: techModel,
        questions: questions.map((q: any) => ({
          skill: q.skill,
          skillType: q.skillType || "required",
          level: q.level || 1,
          questionText: q.questionText,
          expectedKeywords: q.expectedKeywords || [],
          excellentAnswerExample: q.excellentAnswerExample || null,
        })),
        jobContext,
        transcript: compression.compressed,
        durationSeconds,
        candidateTurns,
        seniorityTarget,
        icpTechContext,
        maxTokens: getMaxTokensForTier(evaluatorTier, "technical"),
        jobId: session.job_id,
      });
      v3Result = res.result;
      usage = res.usage || {};

      logAIExecution(supabase, {
        accountId,
        functionName: "reprocess-technical-evaluation",
        operation: "technical_evaluation_v3_reprocess",
        model: techModel,
        status: "success",
        tokensUsed: usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)),
        durationMs: Date.now() - llmStart,
        optimizationVersion: "v3_balanced_seniority_reprocess",
        compressionRatio: compression.ratio,
        inputSummary: { sessionId, seniorityTarget, transcript_chars: compression.compressedChars },
        outputSummary: {
          overallScore: v3Result.overallScore,
          recommendation: v3Result.recommendation,
          eliminators: v3Result.eliminators,
        },
      }).catch(() => {});
    } catch (err) {
      logAIExecution(supabase, {
        accountId,
        functionName: "reprocess-technical-evaluation",
        operation: "technical_evaluation_v3_reprocess",
        model: techModel,
        status: "error",
        errorMessage: (err as Error).message,
        durationMs: Date.now() - llmStart,
      }).catch(() => {});
      return new Response(JSON.stringify({
        error: "evaluation_failed",
        message: (err as Error).message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build skill_scores and skill_levels
    const skillScores: Record<string, number> = {};
    const skillLevels: Record<string, string> = {};
    for (const s of v3Result.skillEvaluations) {
      skillScores[s.skill] = s.finalScore;
      skillLevels[s.skill] = s.level;
    }

    // Delete-then-insert responses (clean replacement)
    const { error: deleteError } = await supabase
      .from("technical_interview_responses")
      .delete()
      .eq("session_id", sessionId);
    if (deleteError) console.error("⚠️ Error deleting old responses:", deleteError);

    const responsesToInsert = v3Result.skillEvaluations.map((s, idx) => ({
      session_id: sessionId,
      skill_name: s.skill,
      skill_type: s.skillType,
      question_index: idx,
      question_text: questions.find((q: any) => q.skill === s.skill)?.questionText || `Pergunta sobre ${s.skill}`,
      question_level: questions.find((q: any) => q.skill === s.skill)?.level || 1,
      candidate_response: s.evidence.join('; '),
      response_quality: s.level === 'expert' ? 'excellent'
                      : s.level === 'advanced' ? 'correct'
                      : s.level === 'intermediate' ? 'partial'
                      : 'incorrect',
      score: s.finalScore,
      ai_analysis: s.justification,
      max_level_reached: s.maxLevelReached,
      max_level_passed: s.maxLevelPassed,
      ceiling_detected: s.ceilingDetected,
      ceiling_signal: s.ceilingSignal,
      seniority_assessed: s.seniorityAssessed,
      evidence_count: s.evidenceCount,
      scenario_handled: s.scenarioHandled,
      keyword_coverage: s.keywordCoverage,
    }));

    if (responsesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("technical_interview_responses")
        .insert(responsesToInsert);
      if (insertError) console.error("⚠️ Error inserting responses:", insertError);
    }

    const { error: updateError } = await supabase
      .from("technical_interview_sessions")
      .update({
        skill_scores: skillScores,
        skill_levels: skillLevels,
        overall_score: v3Result.overallScore,
        evaluation_summary: v3Result.summary,
        strengths: v3Result.strengths,
        gaps: v3Result.gaps,
        recommendation: v3Result.recommendation,
        evaluation_version: 'v3',
        seniority_target: seniorityTarget,
        evaluation_audit_trail: {
          eliminators: v3Result.eliminators,
          seniorityTarget: v3Result.seniorityTarget,
          candidateTurns: v3Result.candidateTurns,
          durationSeconds: v3Result.durationSeconds,
          reprocessedAt: new Date().toISOString(),
          reprocessedBy: user?.id || 'service_role',
          perSkillCaps: v3Result.skillEvaluations.map((s) => ({
            skill: s.skill,
            rawScore: s.rawScore,
            finalScore: s.finalScore,
            maxLevelPassed: s.maxLevelPassed,
            ceilingSignal: s.ceilingSignal,
            capsApplied: s.capsApplied,
            redFlags: s.redFlags,
          })),
        },
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("❌ Error updating session:", updateError);
      return new Response(JSON.stringify({
        error: "update_failed",
        message: updateError.message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`✅ Reprocess complete. New score: ${v3Result.overallScore}, recommendation: ${v3Result.recommendation}`);

    return new Response(JSON.stringify({
      success: true,
      score: v3Result.overallScore,
      recommendation: v3Result.recommendation,
      skillsCount: v3Result.skillEvaluations.length,
      eliminators: v3Result.eliminators,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: (err as Error).message,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
