import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { callLLMTool } from '../_shared/llm-tool-call.ts';
import { compressTranscript } from '../_shared/transcript-compress.ts';
import { getEvaluatorTier, shouldCompressTranscript, getMaxTokensForTier } from '../_shared/evaluator-tier.ts';
import { logAIExecution } from '../_shared/ai-logger.ts';
import { evaluateTechnicalV3, inferSeniorityTarget, type SeniorityTarget } from '../_shared/technical-evaluation-v3.ts';
import { computeInterviewDuration } from '../_shared/computeInterviewDuration.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const OPTIMIZATION_VERSION = "v3_balanced_seniority";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SkillEvaluation {
  skill: string;
  skillType: "required" | "desired";
  score: number;
  level: "basic" | "intermediate" | "advanced" | "expert";
  justification: string;
  evidence: string[];
}

interface EvaluationResult {
  skillEvaluations: SkillEvaluation[];
  overallScore: number;
  overallLevel: string;
  strengths: string[];
  gaps: string[];
  recommendation: "recommended" | "conditional" | "not_recommended";
  summary: string;
}

function parseTranscript(transcript: string): Array<{ speaker: string; text: string }> {
  if (!transcript) return [];
  
  const lines = transcript.split('\n').filter(line => line.trim());
  const messages: Array<{ speaker: string; text: string }> = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Entrevistador:') || trimmedLine.startsWith('Entrevistadora:')) {
      const text = trimmedLine.replace(/^(Entrevistador|Entrevistadora):/, '').trim();
      if (text) messages.push({ speaker: 'ai', text });
    } else if (trimmedLine.startsWith('Candidato:')) {
      const text = trimmedLine.replace(/^Candidato:/, '').trim();
      if (text) messages.push({ speaker: 'candidate', text });
    }
  }
  
  return messages;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { sessionId, tokenUsage, fromWatchdog } = body;
    let { transcript, durationSeconds, completedNaturally } = body;

    console.log("📝 Technical interview complete:", sessionId, fromWatchdog ? "(watchdog)" : "");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Test/simulation sessions: roda avaliação completa MAS pula billing,
    // tracking, orchestrator e notificações. Guards aplicados nos pontos exatos.
    const isTestSession = (session as any).is_test === true;
    if (isTestSession) {
      console.log("🧪 Test technical session — rodando avaliação completa, sem billing/tracking/notificações:", sessionId);
    }





    // Fallback to session-stored values when called by watchdog/reprocess
    if (!transcript || transcript.length === 0) {
      transcript = session.transcript || session.partial_transcript || '';
    }
    // Single source of truth for duration: probed audio file → last_activity → client → completed-started.
    durationSeconds = computeInterviewDuration({
      audioDurationSeconds: (session as any).audio_duration_seconds,
      lastActivityAt: session.last_activity_at,
      startedAt: session.started_at,
      completedAt: session.completed_at || new Date().toISOString(),
      clientDurationSeconds: durationSeconds,
    }) ?? 0;
    console.log(`⏱️ Duration resolved: ${durationSeconds}s (audio=${(session as any).audio_duration_seconds ?? 'n/a'}, last_activity=${session.last_activity_at ?? 'n/a'})`);
    const isPartial = fromWatchdog === true || completedNaturally === false;

    if (!transcript || transcript.length < 30) {
      // Nothing to evaluate — mark abandoned and exit gracefully
      await supabase
        .from("technical_interview_sessions")
        .update({
          status: "abandoned",
          abandoned_reason: "no_transcript",
          watchdog_processed_at: new Date().toISOString(),
          audio_status: session.audio_url ? "available" : "missing",
        })
        .eq("id", sessionId);
      return new Response(JSON.stringify({ success: false, reason: "no_transcript" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const questions = session.questions || [];
    const jobContext = session.job_description_context || {};
    const skills = [...new Set(questions.map((q: any) => q.skill))];

    console.log(`📊 Evaluating ${skills.length} skills from ${questions.length} questions`);

    // Parse transcript
    const parsedMessages = parseTranscript(transcript);
    console.log(`📝 Parsed ${parsedMessages.length} messages from transcript`);

    // ========================
    // FETCH ICP LEARNED PATTERNS FOR TECH REFERENCE
    // ========================
    let icpTechContext = '';
    try {
      if (session.job_id) {
        const { data: activeICP } = await supabase
          .from('job_icps')
          .select('learned_patterns, approved_candidates_count')
          .eq('job_id', session.job_id)
          .eq('is_active', true)
          .maybeSingle();

        if (activeICP?.learned_patterns && activeICP.approved_candidates_count > 0) {
          const lp = activeICP.learned_patterns as any;
          const parts: string[] = [];
          parts.push(`\n\n## REFERÊNCIA: PADRÕES TÉCNICOS DE ${activeICP.approved_candidates_count} CANDIDATOS APROVADOS\n`);
          
          if (lp.common_skills?.length > 0) {
            parts.push(`Skills mais frequentes entre aprovados: ${lp.common_skills.map((s: any) => `${s.skill} (${s.frequency}%)`).join(', ')}`);
          }
          if (lp.experience_range) {
            parts.push(`Faixa de experiência dos aprovados: ${lp.experience_range.min}-${lp.experience_range.max} anos (média: ${lp.experience_range.avg})`);
          }
          if (lp.insights?.length > 0) {
            parts.push(`Insights: ${lp.insights.join('; ')}`);
          }
          parts.push(`\nINSTRUÇÃO ADICIONAL: No campo "summary", inclua um parágrafo comparando este candidato com o padrão técnico dos ${activeICP.approved_candidates_count} aprovados anteriores. Destaque se o candidato é forte nas skills mais comuns entre aprovados. Não penalize diferenças, apenas contextualize.`);
          
          icpTechContext = parts.join('\n');
          console.log(`📊 ICP tech patterns loaded for comparison`);
        }
      }
    } catch (err) {
      console.error('⚠️ Error fetching ICP for tech context:', err);
    }

    // Resolve account tier
    const evaluatorTier = await getEvaluatorTier(supabase as any, session.account_id);
    console.log(`⚙️  Evaluator tier: ${evaluatorTier}`);

    const compression = shouldCompressTranscript(evaluatorTier)
      ? compressTranscript(transcript)
      : { compressed: transcript, originalChars: transcript.length, compressedChars: transcript.length, ratio: 1 };
    console.log(`🗜️ Transcript: ${compression.originalChars} → ${compression.compressedChars} chars`);

    // Resolve seniority target (stored on session, fallback inferring from title)
    const seniorityTarget: SeniorityTarget =
      (session.seniority_target as SeniorityTarget) ||
      inferSeniorityTarget(jobContext?.title, jobContext?.mission);

    // Count candidate turns from parsed messages
    const candidateTurns = parsedMessages.filter((m) => m.speaker === "candidate").length;

    console.log(`🤖 Calling AI for technical evaluation V2 (seniority=${seniorityTarget}, turns=${candidateTurns})...`);
    const llmStart = Date.now();
    const techModel = await getConfiguredModel("technical-interview-complete", "google/gemini-3-flash-preview");

    let v2Result;
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
        durationSeconds: durationSeconds || 0,
        candidateTurns,
        seniorityTarget,
        icpTechContext,
        maxTokens: getMaxTokensForTier(evaluatorTier, "technical"),
        jobId: session.job_id,
      });
      v2Result = res.result;
      usage = res.usage;

      logAIExecution(supabase, {
        accountId: session.account_id,
        functionName: "technical-interview-complete",
        operation: "technical_evaluation_v2",
        model: techModel,
        status: "success",
        tokensUsed: usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)),
        durationMs: Date.now() - llmStart,
        optimizationVersion: OPTIMIZATION_VERSION,
        cachedTokens: (usage as any).cached_tokens ?? null,
        compressionRatio: compression.ratio,
        inputSummary: { sessionId, transcript_chars: compression.compressedChars, tier: evaluatorTier, seniorityTarget },
        outputSummary: {
          overallScore: v2Result.overallScore,
          recommendation: v2Result.recommendation,
          eliminators: v2Result.eliminators,
          skills: v2Result.skillEvaluations.length,
        },
      }).catch(() => {});
    } catch (err) {
      console.error("⚠️ V2 evaluation error:", err);
      logAIExecution(supabase, {
        accountId: session.account_id,
        functionName: "technical-interview-complete",
        operation: "technical_evaluation_v2",
        model: techModel,
        status: "error",
        errorMessage: (err as Error).message,
        durationMs: Date.now() - llmStart,
        optimizationVersion: OPTIMIZATION_VERSION,
      }).catch(() => {});
      // Fallback minimal — não derruba o fluxo
      v2Result = {
        skillEvaluations: [],
        overallScore: 0,
        overallLevel: "basic" as const,
        recommendation: "not_recommended" as const,
        strengths: [],
        gaps: ["Falha ao executar avaliação V2"],
        summary: "Erro na avaliação automática.",
        eliminators: ["v2_evaluator_error"],
        seniorityTarget,
        durationSeconds: durationSeconds || 0,
        candidateTurns,
        evaluationVersion: "v2" as const,
      };
    }

    // Adapter to legacy variable used downstream
    const evaluation = {
      skillEvaluations: v2Result.skillEvaluations.map((s) => ({
        skill: s.skill,
        skillType: s.skillType,
        score: s.finalScore,
        level: s.level,
        justification: s.justification,
        evidence: s.evidence,
      })),
      overallScore: v2Result.overallScore,
      overallLevel: v2Result.overallLevel,
      strengths: v2Result.strengths,
      gaps: v2Result.gaps,
      recommendation: v2Result.recommendation,
      summary: v2Result.summary,
    };
    const analysisData: any = { usage };

    console.log(`✅ Evaluation completed. Score: ${evaluation.overallScore}`);


    // Build skill_scores and skill_levels objects
    const skillScores: Record<string, number> = {};
    const skillLevels: Record<string, string> = {};
    
    for (const se of evaluation.skillEvaluations) {
      skillScores[se.skill] = se.score;
      skillLevels[se.skill] = se.level;
    }

    // Save individual responses to technical_interview_responses (com campos V2)
    const responsesToInsert = v2Result.skillEvaluations.map((s, idx) => ({
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

      if (insertError) {
        console.error("⚠️ Error saving responses:", insertError);
      } else {
        console.log(`✅ Saved ${responsesToInsert.length} skill evaluations (V2)`);
      }
    }

    // Update session with results
    const { error: updateError } = await supabase
      .from("technical_interview_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        transcript,
        ai_messages: [{ role: "transcript", content: transcript }],
        skill_scores: skillScores,
        skill_levels: skillLevels,
        overall_score: evaluation.overallScore,
        evaluation_summary: evaluation.summary,
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
        recommendation: evaluation.recommendation,
        completed_naturally: completedNaturally ?? null,
        is_partial_evaluation: isPartial,
        abandoned_reason: isPartial ? (session.abandoned_reason || 'watchdog_partial') : null,
        watchdog_processed_at: fromWatchdog ? new Date().toISOString() : session.watchdog_processed_at,
        audio_status: session.audio_url ? 'available' : 'missing',
        evaluation_version: 'v3',
        seniority_target: seniorityTarget,
        evaluation_audit_trail: {
          eliminators: v2Result.eliminators,
          seniorityTarget: v2Result.seniorityTarget,
          candidateTurns: v2Result.candidateTurns,
          durationSeconds: v2Result.durationSeconds,
          perSkillCaps: v2Result.skillEvaluations.map((s) => ({
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
    } else {
      console.log("✅ Session updated with evaluation results");
    }

    // Tracking + orchestrator: pulado em sessões de teste (orchestrator dispara
    // notificações e avança o funil; tracking só faz sentido em fluxo real).
    if (!isTestSession) {
    // Register tracking event for completed_interview
    if (session.candidate_id && session.account_id) {
      try {
        const { data: candidateData } = await supabase
          .from("recruitment_candidates")
          .select("first_touch_source, first_touch_medium, first_touch_campaign")
          .eq("id", session.candidate_id)
          .single();

        await supabase.from("candidate_tracking_events").insert([{
          account_id: session.account_id,
          candidate_id: session.candidate_id,
          job_id: session.job_id || null,
          event_type: "completed_interview",
          source: candidateData?.first_touch_source || null,
          medium: candidateData?.first_touch_medium || null,
          campaign: candidateData?.first_touch_campaign || null,
          metadata: {
            interview_type: "technical",
            session_id: sessionId,
            score: evaluation.overallScore,
            recommendation: evaluation.recommendation,
          },
        }]);
        console.log("📊 Tracking event registered: completed_interview (technical)");
      } catch (trackingError) {
        console.error("⚠️ Failed to register tracking event:", trackingError);
      }
    }

    // Call orchestrator for auto-advancement
    if (session.candidate_id && session.job_id) {
      console.log("🎯 Calling recruitment orchestrator...");
      try {
        const orchestratorResponse = await supabase.functions.invoke("recruitment-orchestrator", {
          body: {
            candidateId: session.candidate_id,
            jobId: session.job_id,
            accountId: session.account_id,
            completedStepType: "technical",
            sessionId,
            completedNaturally: completedNaturally ?? null,
            attemptNumber: session.attempt_number || 1,
          },
        });

        if (orchestratorResponse.error) {
          console.error("⚠️ Orchestrator error:", orchestratorResponse.error);
        } else {
          console.log("✅ Orchestrator response:", orchestratorResponse.data);
        }
      } catch (orchError) {
        console.error("⚠️ Failed to call orchestrator:", orchError);
      }
    }
    } // end if (!isTestSession) — tracking & orchestrator


    // ========================
    // SAVE TOKEN USAGE METRICS
    // ========================
    if (tokenUsage) {
      try {
        console.log("📊 Saving token usage metrics...");
        
        // OpenAI Realtime pricing - gpt-realtime-mini
        const AUDIO_INPUT_RATE = 10.00 / 1_000_000;  // $10/1M tokens
        const AUDIO_OUTPUT_RATE = 20.00 / 1_000_000; // $20/1M tokens
        const TEXT_INPUT_RATE = 0.30 / 1_000_000;  // $0.30/1M (gemini-3-flash-preview)
        const TEXT_OUTPUT_RATE = 2.50 / 1_000_000; // $2.50/1M
        
        const audioInputTokens = tokenUsage.audioInputTokens || 0;
        const audioOutputTokens = tokenUsage.audioOutputTokens || 0;
        
        // Get text tokens from AI response if available
        const textInputTokens = analysisData?.usage?.prompt_tokens || 0;
        const textOutputTokens = analysisData?.usage?.completion_tokens || 0;
        
        const audioInputCost = audioInputTokens * AUDIO_INPUT_RATE;
        const audioOutputCost = audioOutputTokens * AUDIO_OUTPUT_RATE;
        const textCost = (textInputTokens * TEXT_INPUT_RATE) + (textOutputTokens * TEXT_OUTPUT_RATE);
        const totalCost = audioInputCost + audioOutputCost + textCost;
        
        const { error: usageError } = await supabase
          .from('interview_token_usage')
          .upsert({
            account_id: session.account_id,
            session_id: sessionId,
            session_type: 'technical',
            job_id: session.job_id,
            candidate_id: session.candidate_id || null,
            audio_input_seconds: tokenUsage.audioInputSeconds || 0,
            audio_output_seconds: tokenUsage.audioOutputSeconds || 0,
            audio_input_tokens: audioInputTokens,
            audio_output_tokens: audioOutputTokens,
            text_input_tokens: textInputTokens,
            text_output_tokens: textOutputTokens,
            audio_input_cost_usd: audioInputCost,
            audio_output_cost_usd: audioOutputCost,
            text_cost_usd: textCost,
            total_cost_usd: totalCost,
            duration_seconds: durationSeconds,
            model_audio: 'gpt-realtime-mini',
            model_text: 'google/gemini-3-flash-preview',
          }, { onConflict: 'session_id,session_type' });
        
        if (usageError) {
          console.error("⚠️ Error saving token usage:", usageError);
        } else {
          console.log(`💰 Interview cost saved: $${totalCost.toFixed(4)} USD`);
        }
      } catch (usageErr) {
        console.error("⚠️ Failed to save token usage:", usageErr);
      }
    }

    // ========================
    // CONSUME CREDITS via consumeAICredits (fórmula oficial + margem)
    // Idempotente: se watchdog já cobrou (credits_consumed_at setado), pula.
    //
    // EXCEÇÃO is_test: sessões de simulação rodam a avaliação completa para
    // validar o pipeline mas NÃO cobram créditos. Ver mem://billing/voice-interview-table-pricing.
    // ========================
    if (!isTestSession) {
    try {
      const alreadyCharged = !!(session as any).credits_consumed_at;
      if (alreadyCharged) {
        console.log(`💳 Skipping credit consumption — session already charged at ${(session as any).credits_consumed_at}`);
      } else {
        const minutes = Math.max((durationSeconds || 0) / 60, 0);
        if (minutes <= 0) {
          console.log(`💳 Skipping table-price charge — duration is zero`);
        } else {
          const realtimeResult = await consumeAICredits({
            supabase,
            accountId: session.account_id,
            featureKey: 'technical_interview_realtime',
            quantity: minutes,
            referenceId: sessionId,
            referenceType: 'technical_interview',
            description: `Entrevista técnica por voz - ${minutes.toFixed(1)}min (preço de tabela)`,
            userId: null,
          });
          console.log(`💳 Technical interview (table price): ${realtimeResult.creditsConsumed} créditos (R$${realtimeResult.costBrl.toFixed(2)})`);
        }

        await supabase
          .from('technical_interview_sessions')
          .update({ credits_consumed_at: new Date().toISOString() })
          .eq('id', sessionId);
      }
    } catch (creditErr) {
      console.error("⚠️ Failed to consume credits:", creditErr);
    }
    } else {
      console.log(`🧪 Test session — skipping credit consumption (simulação não cobra créditos)`);
    }




    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        overallScore: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        summary: evaluation.summary,
        skillEvaluations: evaluation.skillEvaluations,
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
