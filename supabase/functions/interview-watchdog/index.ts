// Interview watchdog — runs on cron every 2 min.
//
// Goals:
//  1. Close stuck `in_progress` sessions (cultural and technical) that had no
//     activity in the last 5 minutes — they are effectively abandoned.
//  2. If the session has usable transcript/responses, trigger a partial
//     evaluation so the page never shows an empty state.
//  3. Mark `audio_status` ('available' | 'missing') so UI can show a clear
//     warning instead of silent emptiness.
//  4. Re-trigger evaluation for sessions that finished but have NULL score
//     (likely because the AI evaluator failed mid-call).
//
// Auth: requires `x-cron-secret` header OR service-role bearer token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendEmailViaResend } from "../_shared/resend-email.ts";
// NOTE: consumeAICredits NÃO é importado aqui de propósito — watchdog não cobra direto.

function logEvent(event: string, sessionId: string | null, data: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      fn: 'interview-watchdog',
      event,
      sessionId,
      ...data,
    }));
  } catch (_e) { /* ignore */ }
}

// ============================================================
// BILLING POLICY (NÃO REINTRODUZIR cobrança aqui)
// ------------------------------------------------------------
// O watchdog NÃO debita créditos diretamente. Toda cobrança de entrevista de voz
// (cultural/técnica) segue PREÇO DE TABELA via `featureKey + quantity` em
// `consumeAICredits`, e acontece em UM destes 3 lugares:
//   1. `culture-interview-complete` (fluxo normal)
//   2. `technical-interview-complete` (fluxo normal + watchdog com transcript)
//   3. `reprocess-culture-evaluation` (watchdog cultural com transcript)
//
// Quando não há conteúdo (abandono real / falha técnica), nada é cobrado.
// Idempotência: cada path checa `credits_consumed_at` ou existência prévia em
// `recruitment_usage_log` antes de cobrar.
//
// Ver: mem://billing/voice-interview-table-pricing
// Histórico: cobrança por tokens de áudio (gpt-realtime-mini) foi removida em
// 2026-05 após overcharges no watchdog. NÃO reintroduzir.
// ============================================================


// 5 min sem heartbeat (heartbeat client = 30s → 10 batidas perdidas) = abandono real.
// Page Visibility API no client garante heartbeat imediato ao retornar para a aba.
// Sessões com last_activity_at recente são consideradas retomáveis (não derrubadas).
const STALE_MINUTES = 5;
const MIN_TRANSCRIPT_CHARS = 80;
// Coverage threshold: >= 80% das perguntas → completed (avaliação roda);
// < 80% → abandoned com janela de retomada de 48h.
const COVERAGE_COMPLETE_THRESHOLD = 0.80;
const RESUME_WINDOW_HOURS = 48;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");

  // Auth: aceita x-cron-secret (preferido), service-role bearer, OU anon-key bearer
  // (este último é o padrão de cron usado no projeto — ver sla-monitor).
  // O watchdog não expõe dados sensíveis: apenas executa limpeza idempotente.
  const provided = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const isCron = !!cronSecret && provided === cronSecret;
  const isService = bearer === serviceKey;
  const isAnon = !!anonKey && bearer === anonKey;
  if (!isCron && !isService && !isAnon) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const startedAt = Date.now();
  const summary: Record<string, number> = {
    culture_stale_found: 0, culture_partial_evaluated: 0, culture_abandoned: 0,
    culture_resume_offered: 0, culture_resume_email_sent: 0,
    tech_stale_found: 0, tech_partial_evaluated: 0, tech_abandoned: 0,
    culture_unscored_recovered: 0, tech_unscored_recovered: 0, errors: 0,
  };

  const staleCutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();

  // ============= CULTURE — stuck in_progress =============
  try {
    const { data: stuckCulture } = await supabase
      .from("culture_interview_sessions")
      .select("id, account_id, candidate_id, job_id, token, partial_transcript, audio_url, started_at, last_activity_at, questions, questions_total, questions_covered, credits_consumed_at, metadata, is_test")
      .eq("status", "in_progress")
      // Inclui sessões is_test (simulações) — culture-interview-complete agora
      // roda avaliação completa para elas (guards internos pulam billing/notif).

      .or(`last_activity_at.lt.${staleCutoff},and(last_activity_at.is.null,started_at.lt.${staleCutoff})`)
      .limit(50);

    summary.culture_stale_found = stuckCulture?.length ?? 0;

    for (const s of stuckCulture ?? []) {
      try {
        const { count: respCount } = await supabase
          .from("culture_interview_responses")
          .select("id", { count: "exact", head: true })
          .eq("session_id", s.id);
        const hasResponses = (respCount ?? 0) > 0;
        const transcriptOk = (s.partial_transcript?.length ?? 0) >= MIN_TRANSCRIPT_CHARS;

        // ── Coverage-based decision ──
        const total = (s as any).questions_total ?? (Array.isArray((s as any).questions) ? (s as any).questions.length : 0);
        const covered = (s as any).questions_covered ?? 0;
        const coverageRatio = total > 0 ? covered / total : 0;
        const hasAnyContent = transcriptOk || hasResponses;

        if (hasAnyContent && coverageRatio >= COVERAGE_COMPLETE_THRESHOLD) {
          // ≥80% coberto → completa e dispara avaliação final
          await supabase.from("culture_interview_sessions").update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_naturally: false,
            is_partial_evaluation: covered < total,
            abandoned_reason: "watchdog_stale_partial",
            audio_status: s.audio_url ? "available" : "missing",
            watchdog_processed_at: new Date().toISOString(),
          }).eq("id", s.id);

          const { error: invokeErr } = await supabase.functions.invoke("reprocess-culture-evaluation", {
            body: { sessionId: s.id, _adminBypass: serviceKey },
          });
          if (invokeErr) {
            console.error("culture reprocess failed", s.id, invokeErr);
            summary.errors++;
          } else {
            summary.culture_partial_evaluated++;
          }
        } else if (hasAnyContent && coverageRatio < COVERAGE_COMPLETE_THRESHOLD) {
          // <80% coberto, mas tem algum conteúdo → abandonada com janela de retomada de 48h
          const resumeExpiresAt = new Date(Date.now() + RESUME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
          await supabase.from("culture_interview_sessions").update({
            status: "abandoned",
            completed_at: new Date().toISOString(),
            completed_naturally: false,
            abandoned_reason: "watchdog_stale_partial",
            can_resume: true,
            resume_expires_at: resumeExpiresAt,
            audio_status: s.audio_url ? "available" : "missing",
            watchdog_processed_at: new Date().toISOString(),
          }).eq("id", s.id);
          summary.culture_resume_offered++;

          // Notifica candidato por e-mail (best-effort, não bloqueia)
          try {
            const sent = await sendResumeEmail(supabase, s as any, resumeExpiresAt, covered, total);
            if (sent) summary.culture_resume_email_sent++;
          } catch (mailErr) {
            console.error("resume email failed", s.id, mailErr);
          }
        } else {
          // sem conteúdo nenhum — pode ser abandono real OU falha técnica
          // ──────────────────────────────────────────────────────────────────
          // SAFEGUARD: failure_technical
          // Se a sessão rodou por <60s e não capturou nada, NÃO é abandono —
          // é falha técnica (mic mudo, WebRTC dropou, idioma drift). Nestes
          // casos: status='failed_technical', NÃO cobra crédito, NÃO marca
          // como abandoned (pra UI mostrar banner diferenciado e candidato
          // poder reusar o mesmo link).
          // ──────────────────────────────────────────────────────────────────
          const startedAtMs = s.started_at ? new Date(s.started_at).getTime() : 0;
          const lastActMs = s.last_activity_at ? new Date(s.last_activity_at).getTime() : 0;
          const liveDurationSec = startedAtMs && lastActMs ? Math.floor((lastActMs - startedAtMs) / 1000) : 0;
          const isTechnicalFailure = liveDurationSec > 0 && liveDurationSec < 60;

          if (isTechnicalFailure) {
            await supabase.from("culture_interview_sessions").update({
              status: "failed_technical",
              completed_at: new Date().toISOString(),
              completed_naturally: false,
              abandoned_reason: "watchdog_technical_failure_under_60s",
              audio_status: s.audio_url ? "available" : "missing",
              duration_seconds: liveDurationSec,
              watchdog_processed_at: new Date().toISOString(),
            }).eq("id", s.id);

            if (s.account_id) {
              await supabase.from("voice_interview_events").insert({
                account_id: s.account_id,
                session_id: s.id,
                session_type: "cultural",
                event_type: "failed_technical_no_candidate_audio",
                payload: { wall_seconds: liveDurationSec, source: "watchdog" },
              });
            }
            // Importante: NÃO chamar chargeRealtimeWatchdog pra essa branch.
            continue;
          }

          // Abandono real (rodou >=60s mas sem conteúdo capturável)
          await supabase.from("culture_interview_sessions").update({
            status: "abandoned",
            completed_at: new Date().toISOString(),
            completed_naturally: false,
            abandoned_reason: "watchdog_no_content",
            audio_status: s.audio_url ? "available" : "missing",
            watchdog_processed_at: new Date().toISOString(),
          }).eq("id", s.id);
          summary.culture_abandoned++;

          // P0: pipeline_silent — sessão rodou por >5min (heartbeat presente),
          // mas zero responses E zero transcript indica que o pipeline live de
          // transcrição falhou silenciosamente. Loga telemetria para alerta.
          try {
            if (liveDurationSec >= 300 && s.account_id) {
              await supabase.from("voice_interview_events").insert({
                account_id: s.account_id,
                session_id: s.id,
                session_type: "cultural",
                event_type: "pipeline_silent_detected",
                payload: {
                  live_duration_seconds: liveDurationSec,
                  responses_count: respCount ?? 0,
                  transcript_chars: s.partial_transcript?.length ?? 0,
                  audio_present: !!s.audio_url,
                },
              });
            }
          } catch (_e) { /* não-crítico */ }
        }

        // Política: só cobramos áudio realtime quando há tokens reais da OpenAI.
        // Watchdog NÃO debita créditos. Marca metadata para auditoria.
        try {
          await supabase.from("culture_interview_sessions").update({
            metadata: { ...(s.metadata ?? {}), watchdog_charge_skipped: true, watchdog_charge_skipped_reason: "no_real_audio_tokens" },
          }).eq("id", s.id);
        } catch (_e) { /* não-crítico */ }


      } catch (e) {
        console.error("culture session error", s.id, e);
        summary.errors++;
      }
    }
  } catch (e) {
    console.error("culture sweep error", e);
    summary.errors++;
  }

  // ============= TECHNICAL — stuck in_progress =============
  try {
    const { data: stuckTech } = await supabase
      .from("technical_interview_sessions")
      .select("id, account_id, transcript, partial_transcript, audio_url, started_at, last_activity_at, credits_consumed_at, metadata")
      .eq("status", "in_progress")
      .or(`last_activity_at.lt.${staleCutoff},and(last_activity_at.is.null,started_at.lt.${staleCutoff})`)
      .limit(50);

    summary.tech_stale_found = stuckTech?.length ?? 0;

    for (const s of stuckTech ?? []) {
      try {
        const transcript = s.transcript || s.partial_transcript || "";
        if (transcript.length >= MIN_TRANSCRIPT_CHARS) {
          // Invoke complete with watchdog flag — it handles all the logic
          const { error: invokeErr } = await supabase.functions.invoke("technical-interview-complete", {
            body: { sessionId: s.id, transcript, completedNaturally: false, fromWatchdog: true },
          });
          if (invokeErr) {
            console.error("tech complete failed", s.id, invokeErr);
            summary.errors++;
          } else {
            summary.tech_partial_evaluated++;
          }
        } else {
          await supabase.from("technical_interview_sessions").update({
            status: "abandoned",
            completed_at: new Date().toISOString(),
            completed_naturally: false,
            abandoned_reason: "watchdog_no_content",
            audio_status: s.audio_url ? "available" : "missing",
            watchdog_processed_at: new Date().toISOString(),
          }).eq("id", s.id);
          summary.tech_abandoned++;
          // Política: só cobramos áudio realtime quando há tokens reais da OpenAI.
          // Watchdog NÃO debita créditos.
          try {
            await supabase.from("technical_interview_sessions").update({
              metadata: { ...(s.metadata ?? {}), watchdog_charge_skipped: true, watchdog_charge_skipped_reason: "no_real_audio_tokens" },
            }).eq("id", s.id);
          } catch (_e) { /* não-crítico */ }

        }
      } catch (e) {
        console.error("tech session error", s.id, e);
        summary.errors++;
      }
    }
  } catch (e) {
    console.error("tech sweep error", e);
    summary.errors++;
  }

  // ============= Recover completed-but-unscored sessions =============
  try {
    const { data: cultureUnscored } = await supabase
      .from("culture_interview_sessions")
      .select("id")
      .eq("status", "completed")
      // is_test incluído: simulações também recebem avaliação pós-fato
      .is("matching_score", null)
      .is("watchdog_processed_at", null)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    for (const s of cultureUnscored ?? []) {
      try {
        const { error } = await supabase.functions.invoke("reprocess-culture-evaluation", {
          body: { sessionId: s.id, _adminBypass: serviceKey },
        });
        if (!error) summary.culture_unscored_recovered++;
        await supabase.from("culture_interview_sessions").update({
          watchdog_processed_at: new Date().toISOString(),
        }).eq("id", s.id);
      } catch (e) {
        console.error("culture unscored recover error", s.id, e);
        summary.errors++;
      }
    }

    const { data: techUnscored } = await supabase
      .from("technical_interview_sessions")
      .select("id, transcript, partial_transcript")
      .eq("status", "completed")
      .is("overall_score", null)
      .is("watchdog_processed_at", null)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    for (const s of techUnscored ?? []) {
      try {
        const transcript = s.transcript || s.partial_transcript || "";
        if (transcript.length < MIN_TRANSCRIPT_CHARS) continue;
        const { error } = await supabase.functions.invoke("technical-interview-complete", {
          body: { sessionId: s.id, transcript, completedNaturally: false, fromWatchdog: true },
        });
        if (!error) summary.tech_unscored_recovered++;
      } catch (e) {
        console.error("tech unscored recover error", s.id, e);
        summary.errors++;
      }
    }
  } catch (e) {
    console.error("unscored recovery error", e);
    summary.errors++;
  }

  return json({ ok: true, durationMs: Date.now() - startedAt, summary }, 200);
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Envia e-mail de retomada (best-effort). Retorna true se enviado.
async function sendResumeEmail(
  supabase: any,
  session: { id: string; token: string | null; candidate_id: string | null; account_id: string; job_id: string | null },
  resumeExpiresAt: string,
  covered: number,
  total: number,
): Promise<boolean> {
  if (!session.token || !session.candidate_id) return false;

  const { data: candidate } = await supabase
    .from("recruitment_candidates")
    .select("first_name, last_name, email")
    .eq("id", session.candidate_id)
    .maybeSingle();
  if (!candidate?.email) return false;

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", session.account_id)
    .maybeSingle();
  const { data: job } = session.job_id
    ? await supabase.from("recruitment_jobs").select("title").eq("id", session.job_id).maybeSingle()
    : { data: null };

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://gentia.lovable.app";
  const resumeUrl = `${baseUrl}/interview/${session.token}`;
  const name = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Candidato(a)";
  const companyName = company?.name || "a empresa";
  const jobTitle = job?.title || "a vaga";
  const expiresFmt = new Date(resumeExpiresAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

  const html = `
    <div style="font-family: Segoe UI, Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg,#6366f1,#8b5cf6); padding: 30px; border-radius: 16px 16px 0 0;">
        <h1 style="color:#fff; margin:0; font-size:22px;">Sua entrevista foi interrompida</h1>
      </div>
      <div style="background:#f8fafc; padding:30px; border-radius:0 0 16px 16px; border:1px solid #e2e8f0; border-top:none;">
        <p style="font-size:16px;color:#334155;line-height:1.6;">Olá, ${name}!</p>
        <p style="font-size:16px;color:#334155;line-height:1.6;">
          Sua entrevista de fit cultural para a vaga <strong>${jobTitle}</strong> na <strong>${companyName}</strong>
          foi interrompida (${covered} de ${total} perguntas respondidas).
          Você pode <strong>retomar de onde parou</strong> usando o link abaixo.
        </p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${resumeUrl}" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
            Retomar entrevista
          </a>
        </p>
        <p style="font-size:14px;color:#64748b;">
          O link expira em <strong>${expiresFmt}</strong> (48 horas). Após esse prazo, será necessário pedir um novo convite ao recrutador.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmailViaResend({
    supabase,
    to: candidate.email,
    subject: `Retome sua entrevista — ${jobTitle}`,
    html,
    accountId: session.account_id,
    candidateId: session.candidate_id,
    jobId: session.job_id,
    tags: [{ name: "type", value: "interview_resume_invite" }],
  });
  return !!result.ok;
}
