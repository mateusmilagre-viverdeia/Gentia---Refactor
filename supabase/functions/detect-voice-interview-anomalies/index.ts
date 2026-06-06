// Heuristic anomaly detector for voice interview sessions.
// Two modes:
//   1) Targeted: POST { sessionId, sessionType } — analyses a single session (called
//      by culture-interview-complete / technical-interview-complete after wrap-up).
//   2) Sweep:    POST {} with x-cron-secret header — scans last 24h sessions and
//      writes anomalies for any that match heuristic rules.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface SessionMeta {
  id: string;
  account_id: string;
  candidate_id: string | null;
  candidate_profile_id: string | null;
  job_id: string | null;
  agent_id: string | null;
  duration_seconds: number | null;
  matching_score: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  matching_analysis: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = (body as Record<string, unknown>)?.sessionId as string | undefined;
    const sessionTypeBody = (body as Record<string, unknown>)?.sessionType as string | undefined;

    if (sessionId && sessionTypeBody) {
      // Targeted mode
      const result = await analyseOne(supabaseAdmin, sessionId, sessionTypeBody);
      return json({ mode: "targeted", ...result }, 200);
    }

    // Sweep mode — require cron secret
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (!cronSecret || provided !== cronSecret) {
      return json({ error: "unauthorized" }, 401);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const types: Array<"cultural" | "technical"> = ["cultural", "technical"];
    const summary: Record<string, number> = { scanned: 0, anomalies_created: 0 };

    for (const t of types) {
      const table =
        t === "cultural" ? "culture_interview_sessions" : "technical_interview_sessions";
      const { data: sessions } = await supabaseAdmin
        .from(table)
        .select(
          "id, account_id, candidate_id, candidate_profile_id, job_id, agent_id, duration_seconds, status, started_at, completed_at, archived_at, matching_score, matching_analysis, overall_score",
        )
        .gte("created_at", since);
      if (!sessions) continue;
      for (const s of sessions) {
        summary.scanned++;
        const norm: SessionMeta = {
          ...s,
          matching_score: (s as any).matching_score ?? (s as any).overall_score ?? null,
          matching_analysis: (s as any).matching_analysis ?? null,
        } as SessionMeta;
        const created = await detectAndStore(supabaseAdmin, norm, t);
        summary.anomalies_created += created;
      }
    }

    return json({ mode: "sweep", ...summary }, 200);
  } catch (e) {
    console.error("detect-voice-interview-anomalies_error", e);
    return json({ error: "internal", message: String(e) }, 500);
  }
});

async function analyseOne(
  supabaseAdmin: ReturnType<typeof createClient>,
  sessionId: string,
  sessionType: string,
) {
  const tableMap: Record<string, string> = {
    cultural: "culture_interview_sessions",
    technical: "technical_interview_sessions",
  };
  const table = tableMap[sessionType];
  if (!table) return { error: "unsupported_type" };

  const { data: session } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    // Maybe archived
    const { data: archived } = await supabaseAdmin
      .from("interview_attempt_history")
      .select("*")
      .eq("original_session_id", sessionId)
      .maybeSingle();
    if (!archived) return { error: "session_not_found" };
    const norm: SessionMeta = {
      id: sessionId,
      account_id: archived.account_id,
      candidate_id: archived.candidate_id,
      candidate_profile_id: archived.candidate_profile_id,
      job_id: archived.job_id,
      agent_id: null,
      duration_seconds: archived.completed_at && archived.started_at
        ? Math.floor(
            (new Date(archived.completed_at).getTime() -
              new Date(archived.started_at).getTime()) /
              1000,
          )
        : null,
      matching_score: archived.score,
      status: archived.status,
      started_at: archived.started_at,
      completed_at: archived.completed_at,
      archived_at: archived.archived_at,
      matching_analysis: null,
    };
    const created = await detectAndStore(supabaseAdmin, norm, sessionType as any);
    return { anomalies_created: created };
  }
  const norm: SessionMeta = {
    ...session,
    matching_score: (session as any).matching_score ?? (session as any).overall_score ?? null,
    matching_analysis: (session as any).matching_analysis ?? null,
  } as SessionMeta;
  const created = await detectAndStore(supabaseAdmin, norm, sessionType as any);
  return { anomalies_created: created };
}

async function detectAndStore(
  supabaseAdmin: ReturnType<typeof createClient>,
  s: SessionMeta,
  sessionType: "cultural" | "technical" | "disc",
): Promise<number> {
  // Gather signals
  const [responsesRes, eventsRes, tokenRes] = await Promise.all([
    sessionType === "cultural"
      ? supabaseAdmin.from("culture_interview_responses").select("id", { count: "exact", head: true }).eq("session_id", s.id)
      : sessionType === "technical"
      ? supabaseAdmin.from("technical_interview_responses").select("id", { count: "exact", head: true }).eq("session_id", s.id)
      : Promise.resolve({ count: 0 }),
    supabaseAdmin
      .from("voice_interview_events")
      .select("event_type, payload, created_at")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("interview_token_usage")
      .select("audio_input_seconds, audio_output_seconds, duration_seconds")
      .eq("session_id", s.id)
      .maybeSingle(),
  ]);

  const responsesCount = (responsesRes as any)?.count ?? 0;
  const events = (eventsRes.data as Array<{ event_type: string; payload: any; created_at: string }>) ?? [];
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;


  const audioInput = Number((tokenRes.data as any)?.audio_input_seconds ?? 0);
  const audioOutput = Number((tokenRes.data as any)?.audio_output_seconds ?? 0);
  const tokenDuration = Number((tokenRes.data as any)?.duration_seconds ?? 0);
  const duration = Number(s.duration_seconds ?? tokenDuration ?? 0);

  const findings: Array<{
    severity: "info" | "warning" | "critical";
    rule_code: string;
    description: string;
    suggestion: string | null;
    metrics: Record<string, unknown>;
  }> = [];

  // Rule 1: real conversation but zero responses persisted (Bruna case)
  if (
    responsesCount === 0 &&
    duration >= 60 &&
    (s.status === "completed" || s.status === "in_progress" || s.archived_at)
  ) {
    findings.push({
      severity: "critical",
      rule_code: "no_responses_persisted",
      description:
        "Sessão durou " +
        Math.round(duration) +
        "s sem nenhuma resposta gravada. Possível bug de persistência ou IA travada.",
      suggestion: "Reabrir tentativa do candidato e investigar logs de save-response.",
      metrics: { responsesCount, duration, audioInput, audioOutput },
    });
  }

  // Rule 2: AI talked but candidate barely spoke
  if (audioOutput >= 60 && audioInput > 0 && audioInput < 20) {
    findings.push({
      severity: "warning",
      rule_code: "low_candidate_audio",
      description:
        "IA falou " +
        Math.round(audioOutput) +
        "s mas candidato só falou " +
        Math.round(audioInput) +
        "s. Possível problema de microfone ou candidato desistiu.",
      suggestion: "Confirmar com o candidato se o microfone funcionou; oferecer nova tentativa.",
      metrics: { audioInput, audioOutput },
    });
  }

  // Rule 3: many AI interruptions
  if ((counts.ai_interrupted ?? 0) >= 5) {
    findings.push({
      severity: "warning",
      rule_code: "frequent_ai_interruptions",
      description:
        "IA interrompida " + counts.ai_interrupted + " vezes — VAD instável ou ruído de fundo.",
      suggestion: "Revisar configuração de turn-detection do agente.",
      metrics: { interruptions: counts.ai_interrupted },
    });
  }

  // Rule 4: WebRTC reconnects
  if ((counts.webrtc_reconnect ?? 0) >= 2 || (counts.ice_failed ?? 0) >= 1) {
    findings.push({
      severity: "warning",
      rule_code: "connection_instability",
      description:
        "Instabilidade de conexão (reconnects=" +
        (counts.webrtc_reconnect ?? 0) +
        ", ice_failed=" +
        (counts.ice_failed ?? 0) +
        ").",
      suggestion: "Verificar qualidade da rede do candidato.",
      metrics: {
        reconnects: counts.webrtc_reconnect ?? 0,
        ice_failed: counts.ice_failed ?? 0,
      },
    });
  }

  // Rule 5: response save failures recorded
  if ((counts.response_save_failed ?? 0) > 0) {
    findings.push({
      severity: "critical",
      rule_code: "response_save_failures",
      description:
        counts.response_save_failed + " falha(s) de salvamento de resposta detectadas.",
      suggestion: "Investigar logs do edge function culture-interview-save-response.",
      metrics: { failures: counts.response_save_failed },
    });
  }

  // Rule 6: abnormal disconnect before completion
  if (
    (counts.abnormal_disconnect ?? 0) > 0 &&
    s.status !== "completed"
  ) {
    findings.push({
      severity: "warning",
      rule_code: "abnormal_disconnect",
      description: "Sessão desconectou de forma anormal sem completar.",
      suggestion: "Oferecer nova tentativa ao candidato.",
      metrics: { disconnects: counts.abnormal_disconnect },
    });
  }

  // Rule 7: response dead-lettered (transcript preservado fora da tabela oficial)
  if ((counts.response_save_dead_letter ?? 0) > 0) {
    findings.push({
      severity: "critical",
      rule_code: "response_dead_lettered",
      description:
        counts.response_save_dead_letter +
        " resposta(s) preservada(s) em dead-letter — transcript não chegou na tabela de respostas.",
      suggestion:
        "Recuperar payloads em voice_interview_events (event_type=response_save_dead_letter) e oferecer nova tentativa ao candidato.",
      metrics: { dead_lettered: counts.response_save_dead_letter },
    });
  }

  // Rule 8: conductor regression — next_turn voltou para um questionIndex
  // menor que o anterior (wrap-around / loop). Bug crítico do orquestrador.
  if (sessionType === "cultural") {
    const turnEvents = events.filter(
      (e) => e.event_type === "conductor_next_turn" || e.event_type === "conductor_turn_emitted",
    );
    let regressions = 0;
    let lastQi = -1;
    let lastPhase = "";
    const samples: Array<{ from: number; to: number; phase: string }> = [];
    for (const e of turnEvents) {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      const qi = Number(p.questionIndex ?? p.question_index ?? -1);
      const phase = String(p.phase ?? "");
      const isFollowup = Boolean(p.isFollowup ?? p.is_followup);
      if (qi < 0) continue;
      if (
        lastQi >= 0 &&
        qi < lastQi &&
        !isFollowup &&
        lastPhase !== "closing" &&
        phase !== "closing"
      ) {
        regressions++;
        if (samples.length < 5) samples.push({ from: lastQi, to: qi, phase });
      }
      lastQi = qi;
      lastPhase = phase;
    }
    if (regressions > 0) {
      findings.push({
        severity: "critical",
        rule_code: "conductor_regression",
        description:
          regressions +
          " regressão(ões) de questionIndex no conductor (next_turn voltou para uma pergunta anterior). Possível loop/wrap-around.",
        suggestion:
          "Revisar interview-conductor: garantir que coverage>=total força phase=closing e que questionIndex nunca diminui fora de followup.",
        metrics: { regressions, samples },
      });
    }
  }



  if (findings.length === 0) return 0;

  let created = 0;
  for (const f of findings) {
    const { error } = await supabaseAdmin
      .from("voice_interview_anomalies")
      .upsert(
        {
          account_id: s.account_id,
          session_id: s.id,
          session_type: sessionType,
          candidate_id: s.candidate_id,
          candidate_profile_id: s.candidate_profile_id,
          job_id: s.job_id,
          agent_id: s.agent_id,
          severity: f.severity,
          rule_code: f.rule_code,
          description: f.description,
          suggestion: f.suggestion,
          metrics: f.metrics,
        },
        { onConflict: "session_id,rule_code", ignoreDuplicates: true },
      );
    if (!error) created++;
    else console.error("anomaly_insert_error", error, f.rule_code);
  }
  return created;
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
