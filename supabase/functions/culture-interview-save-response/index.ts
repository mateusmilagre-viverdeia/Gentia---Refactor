import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('culture-interview-save-response');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { 
      sessionId, 
      questionIndex, 
      aiQuestionSpoken, 
      candidateResponse, 
      startSeconds, 
      endSeconds 
    } = body;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!candidateResponse) {
      return new Response(
        JSON.stringify({ error: "candidateResponse is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log.log(`💾 Saving response for session: ${sessionId}, Q${questionIndex}`);

    // Verify session exists and is in progress
    const { data: session, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .select("id, status, questions")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      log.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (session.status !== "in_progress") {
      log.log("⚠️ Session not in progress, status:", session.status);
      return new Response(
        JSON.stringify({ error: "Session is not in progress", status: session.status }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Match aiQuestionSpoken against the canonical question list using a robust
    // Jaccard matcher (with PT-BR stopwords). Positional indexing by questionIndex
    // is unreliable because questionIndex is the AI-turn counter, not the canonical
    // question position.
    const questions = session.questions || [];
    const matched = findCanonicalQuestion(questions, aiQuestionSpoken || "");
    const questionText = matched?.question_text
      || aiQuestionSpoken
      || `Pergunta ${questionIndex + 1}`;
    const valueLabel = matched?.value_label || null;
    const jaccardIndex = matched?.index ?? -1;

    // Single upsert keyed by (session_id, question_index) — backed by unique index.
    log.log(`💾 Upserting response for Q${questionIndex}`);
    const { error: upsertError } = await supabase
      .from("culture_interview_responses")
      .upsert(
        {
          session_id: sessionId,
          question_index: questionIndex,
          question_text: questionText,
          candidate_response: candidateResponse,
          ai_question_spoken: aiQuestionSpoken,
          value_label: valueLabel,
          start_seconds: startSeconds,
          end_seconds: endSeconds,
        },
        { onConflict: "session_id,question_index", ignoreDuplicates: false },
      );

    if (upsertError) {
      log.error("❌ Error upserting response:", upsertError);
      await writeDeadLetter(supabase, sessionId, questionIndex, body, String(upsertError?.message ?? upsertError));
      return new Response(
        JSON.stringify({ success: false, retryable: true, error: "upsert_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update session last_activity_at + coverage tracking.
    // Coverage rule: candidate response must be "real" (>2 words) and we need
    // to associate it to a canonical question index. We try 3 layers:
    //   1. jaccard match (most precise — AI repeated question close to canonical)
    //   2. positional_fallback (uses questionIndex when it's a valid uncovered slot)
    //   3. next_uncovered (first canonical question not yet covered)
    // This fixes the "Pergunta 1 de 35 at 27min" bug: when the AI reformulates a
    // question heavily, jaccard returns -1 and the row is never counted, so the
    // progress bar stays at 0. Evaluator still uses culture_interview_responses
    // (which has ALL real responses via upsert), so score is unaffected.
    const wordCount = String(candidateResponse).trim().split(/\s+/).filter(Boolean).length;
    const isRealResponse = wordCount > 2;

    const { data: freshSession } = await supabase
      .from("culture_interview_sessions")
      .select("coverage_log, questions_total, questions")
      .eq("id", sessionId)
      .single();

    const existingLog = (freshSession?.coverage_log as Array<{ question_index: number }>) || [];
    const coveredSet = new Set(existingLog.map((c) => c.question_index));
    const total = freshSession?.questions_total
      ?? (Array.isArray(freshSession?.questions) ? freshSession.questions.length : 0);

    let effectiveCanonicalIndex = -1;
    let matchSource: "jaccard" | "positional_fallback" | "next_uncovered" | "none" = "none";
    if (isRealResponse) {
      if (jaccardIndex >= 0 && !coveredSet.has(jaccardIndex)) {
        effectiveCanonicalIndex = jaccardIndex;
        matchSource = "jaccard";
      } else if (
        typeof questionIndex === "number" &&
        questionIndex >= 0 &&
        questionIndex < total &&
        !coveredSet.has(questionIndex)
      ) {
        effectiveCanonicalIndex = questionIndex;
        matchSource = "positional_fallback";
      } else {
        for (let i = 0; i < total; i++) {
          if (!coveredSet.has(i)) {
            effectiveCanonicalIndex = i;
            matchSource = "next_uncovered";
            break;
          }
        }
      }
    }

    let newCoveredCount = coveredSet.size;
    let updatedLog = existingLog;
    if (effectiveCanonicalIndex >= 0) {
      updatedLog = [
        ...existingLog,
        {
          question_index: effectiveCanonicalIndex,
          ai_question_text: questionText,
          response_excerpt: String(candidateResponse).slice(0, 200),
          covered_at: new Date().toISOString(),
          match_source: matchSource,
        },
      ];
      newCoveredCount = updatedLog.length;
      log.log(`📊 Coverage: ${newCoveredCount}/${total} (Q#${effectiveCanonicalIndex} via ${matchSource})`);

      // Telemetria: registra qual camada do matcher casou — útil para auditar.
      try {
        const { data: s } = await supabase
          .from("culture_interview_sessions")
          .select("account_id")
          .eq("id", sessionId)
          .maybeSingle();
        const accountId = (s as { account_id?: string } | null)?.account_id;
        if (accountId) {
          await supabase.from("voice_interview_events").insert({
            account_id: accountId,
            session_id: sessionId,
            session_type: "cultural",
            event_type: "coverage_match_source",
            payload: {
              match_source: matchSource,
              canonical_index: effectiveCanonicalIndex,
              question_turn_index: questionIndex,
              jaccard_index: jaccardIndex,
            },
          });
        }
      } catch (_e) { /* não-crítico */ }
    }

    const { error: updateSessionError } = await supabase
      .from("culture_interview_sessions")
      .update({
        last_activity_at: new Date().toISOString(),
        coverage_log: updatedLog,
        questions_covered: newCoveredCount,
        questions_total: total,
      })
      .eq("id", sessionId);

    if (updateSessionError) {
      log.error("⚠️ Error updating session last_activity_at:", updateSessionError);
    }

    // Build "pending questions" payload so the client can reinject coverage
    // into the live Realtime context (P0 mitigation for Marina-style cases
    // where the AI loses count and ends early).
    const coveredIndexes = new Set(updatedLog.map((c: { question_index: number }) => c.question_index));
    const pendingQuestions: Array<{ index: number; question_text: string }> = [];
    const questionsList = (freshSession?.questions as Array<{ question_text?: string }> | null) || [];
    for (let i = 0; i < questionsList.length; i++) {
      if (!coveredIndexes.has(i)) {
        pendingQuestions.push({
          index: i,
          question_text: questionsList[i]?.question_text || `Pergunta ${i + 1}`,
        });
      }
    }

    log.log(
      `✅ Response saved [sessionId=${sessionId} qIndex=${questionIndex} coverageAfter=${newCoveredCount}/${total} pending=${pendingQuestions.length}]`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        questionIndex,
        coverage: {
          covered: newCoveredCount,
          total,
          pendingCount: pendingQuestions.length,
          pendingQuestions: pendingQuestions.slice(0, 5), // só as 5 próximas para não inflar prompt
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log.error("❌ Error:", error);
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

async function writeDeadLetter(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
  body: Record<string, unknown>,
  errorMessage: string,
) {
  try {
    const { data: session } = await supabase
      .from("culture_interview_sessions")
      .select("account_id")
      .eq("id", sessionId)
      .maybeSingle();
    const accountId = (session as { account_id?: string } | null)?.account_id;
    if (!accountId) return;
    await supabase.from("voice_interview_events").insert({
      account_id: accountId,
      session_id: sessionId,
      session_type: "cultural",
      event_type: "response_save_dead_letter",
      payload: {
        questionIndex,
        candidateResponse: body?.candidateResponse ?? null,
        aiQuestionSpoken: body?.aiQuestionSpoken ?? null,
        startSeconds: body?.startSeconds ?? null,
        endSeconds: body?.endSeconds ?? null,
        error: errorMessage,
        source: "server",
      },
    });
  } catch (e) {
    console.error("writeDeadLetter failed", e);
  }
}

// PT-BR stopwords (palavras genéricas que não devem contar como sinal de match)
const PT_STOPWORDS = new Set([
  "que","como","para","com","sem","mais","menos","muito","pouco","bem","mal",
  "voce","você","vocês","voces","seu","sua","seus","suas","meu","minha","meus","minhas",
  "nosso","nossa","nossos","nossas","esse","essa","esses","essas","este","esta","estes","estas",
  "isso","isto","aquilo","onde","quando","quem","qual","quais","porque","por","pois",
  "uma","uns","umas","dos","das","nos","nas","aos","das","pelo","pela","pelos","pelas",
  "atualmente","hoje","agora","então","entao","tudo","nada","algo","alguém","alguem",
  "ser","estar","ter","fazer","poder","ir","vir","dar","dizer","saber","ver","sobre",
  "também","tambem","ainda","sempre","nunca","cada","tão","tao","aqui","ali","lá","la",
  "favor","vamos","vou","gente","tipo","coisa","coisas","conte","conta","fala","falar","diga",
  "obrigado","obrigada","beleza","legal","perfeito","entendi","ótimo","otimo","certo","exato",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !PT_STOPWORDS.has(w));
}

function findCanonicalQuestion(
  questions: Array<{ question_text?: string; value_label?: string }>,
  spoken: string,
): { question_text?: string; value_label?: string; index: number } | null {
  if (!spoken || !questions || questions.length === 0) return null;
  const spokenTokens = new Set(tokenize(spoken));
  if (spokenTokens.size === 0) return null;

  let best: { q: any; idx: number; jaccard: number; overlap: number } | null = null;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qtext = q.question_text || "";
    const qTokens = new Set(tokenize(qtext));
    if (qTokens.size === 0) continue;
    let intersection = 0;
    for (const t of qTokens) if (spokenTokens.has(t)) intersection++;
    const union = qTokens.size + spokenTokens.size - intersection;
    const jaccard = union === 0 ? 0 : intersection / union;
    if (!best || jaccard > best.jaccard) {
      best = { q, idx: i, jaccard, overlap: intersection };
    }
  }
  if (best && best.jaccard >= 0.5 && best.overlap >= 3) return { ...best.q, index: best.idx };
  if (best && best.overlap >= 3 && best.overlap === new Set(tokenize(best.q.question_text || "")).size) {
    return { ...best.q, index: best.idx };
  }
  return null;
}
