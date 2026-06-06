import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DebugTimelineEvent {
  ts: string;
  kind: "session" | "response" | "anomaly" | "event";
  label: string;
  detail?: string;
  payload?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}


export interface InterviewDebugData {
  session: any;
  responses: any[];
  anomalies: any[];
  questions: any[];
  total: number;
  covered: number;
  missing: Array<{ index: number; question: string }>;
  timeline: DebugTimelineEvent[];
  job?: { id: string; title: string | null } | null;
  candidate?: { id: string; full_name: string | null; email: string | null } | null;
}

export function useInterviewDebugData(sessionId?: string) {
  return useQuery({
    queryKey: ["interview-debug", sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InterviewDebugData> => {
      const { data: session, error: sErr } = await supabase
        .from("culture_interview_sessions")
        .select("*")
        .eq("id", sessionId!)
        .single();
      if (sErr) throw sErr;

      const [{ data: responses }, { data: anomalies }, { data: voiceEvents }] = await Promise.all([
        supabase
          .from("culture_interview_responses")
          .select("*")
          .eq("session_id", sessionId!)
          .order("question_index", { ascending: true }),
        supabase
          .from("voice_interview_anomalies")
          .select("*")
          .eq("session_id", sessionId!)
          .order("created_at", { ascending: true }),
        supabase
          .from("voice_interview_events")
          .select("event_type, payload, created_at")
          .eq("session_id", sessionId!)
          .order("created_at", { ascending: true }),
      ]);


      let job: any = null;
      let candidate: any = null;
      if (session.job_id) {
        const { data } = await supabase
          .from("recruitment_jobs")
          .select("id, title")
          .eq("id", session.job_id)
          .maybeSingle();
        job = data;
      }
      if (session.candidate_id) {
        const { data } = await supabase
          .from("recruitment_candidates")
          .select("id, full_name, email")
          .eq("id", session.candidate_id)
          .maybeSingle();
        candidate = data;
      }

      const questions = (session.questions as any[]) || [];
      const total = (session as any).questions_total ?? questions.length;
      const coverageLog =
        ((session as any).coverage_log as Array<{ question_index: number }>) || [];
      const coveredIdx = new Set(coverageLog.map((c) => c.question_index));
      (responses ?? []).forEach((r: any) => coveredIdx.add(r.question_index));
      const covered = coveredIdx.size;
      const missing = questions
        .map((q: any, i: number) => ({
          index: i,
          question: q.question_text || `Pergunta ${i + 1}`,
        }))
        .filter((q) => !coveredIdx.has(q.index));

      // Build timeline
      const timeline: DebugTimelineEvent[] = [];
      if (session.started_at) {
        timeline.push({
          ts: session.started_at,
          kind: "session",
          label: "Sessão iniciada",
        });
      }
      (responses ?? []).forEach((r: any) => {
        timeline.push({
          ts: r.created_at,
          kind: "response",
          label: `Resposta P${r.question_index + 1}`,
          detail: r.question_text,
        });
      });
      const meta = (session.metadata as Record<string, any>) || {};
      if (meta.early_end_attempted_at) {
        timeline.push({
          ts: meta.early_end_attempted_at,
          kind: "session",
          label: "Tentativa de encerramento precoce (bloqueada)",
          payload: meta.early_end_attempt_coverage,
        });
      }
      if (meta.partial_coverage?.forced_at) {
        timeline.push({
          ts: meta.partial_coverage.forced_at,
          kind: "session",
          label: "Encerramento forçado (cobertura parcial)",
          payload: meta.partial_coverage,
        });
      }
      (anomalies ?? []).forEach((a: any) => {
        timeline.push({
          ts: a.created_at,
          kind: "anomaly",
          label: `Anomalia: ${a.rule_code}`,
          detail: a.description,
          payload: a.metrics,
          severity: a.severity,
        });
      });

      // Eventos do orquestrador: inclui conductor_next_turn e marca regressões
      // de questionIndex (next_turn voltou para uma pergunta anterior).
      let lastConductorQi = -1;
      let lastConductorPhase = "";
      (voiceEvents ?? []).forEach((e: any) => {
        const p = (e.payload ?? {}) as Record<string, any>;
        const eventType = String(e.event_type);
        const interesting =
          eventType === "conductor_next_turn" ||
          eventType === "conductor_regression_detected_client" ||
          eventType === "culture_premature_end_blocked" ||
          eventType === "audio_upload_failed" ||
          eventType === "audio_upload_pagehide_attempt" ||
          eventType === "response_save_dead_letter" ||
          eventType === "abnormal_disconnect";
        if (!interesting) return;

        let severity: "info" | "warning" | "critical" = "info";
        let label = eventType;
        let detail: string | undefined;

        if (eventType === "conductor_next_turn") {
          const qi = Number(p.questionIndex ?? -1);
          const phase = String(p.phase ?? "");
          const isFollowup = Boolean(p.isFollowup);
          label = `Conductor: ${p.action ?? "?"} · ${phase} · Q${qi + 1}${isFollowup ? " (follow-up)" : ""}`;
          if (
            !isFollowup &&
            lastConductorQi >= 0 &&
            qi < lastConductorQi &&
            phase !== "closing" &&
            lastConductorPhase !== "closing"
          ) {
            severity = "critical";
            detail = `Regressão: voltou de Q${lastConductorQi + 1} para Q${qi + 1}`;
          }
          lastConductorQi = qi;
          lastConductorPhase = phase;
        } else if (eventType === "conductor_regression_detected_client") {
          severity = "critical";
          label = "Regressão de pergunta detectada (cliente forçou fim)";
          detail = `de Q${(p.previousMax ?? 0) + 1} para Q${(p.received ?? 0) + 1}`;
        } else if (eventType === "culture_premature_end_blocked") {
          severity = "warning";
          label = "Encerramento precoce bloqueado";
        } else if (eventType === "audio_upload_failed") {
          severity = "critical";
          label = "Upload de áudio falhou";
        } else if (eventType === "audio_upload_pagehide_attempt") {
          severity = "warning";
          label = "Upload de áudio via pagehide (best-effort)";
        } else if (eventType === "abnormal_disconnect") {
          severity = "warning";
          label = "Desconexão anormal";
        } else if (eventType === "response_save_dead_letter") {
          severity = "critical";
          label = "Resposta caiu em dead-letter";
        }

        timeline.push({
          ts: e.created_at,
          kind: "event",
          label,
          detail,
          payload: p,
          severity,
        });
      });

      if (session.completed_at) {
        timeline.push({
          ts: session.completed_at,
          kind: "session",
          label: `Finalizada (status: ${session.status})`,
        });
      }
      timeline.sort((a, b) => +new Date(a.ts) - +new Date(b.ts));

      return {
        session,
        responses: responses ?? [],
        anomalies: anomalies ?? [],
        questions,
        total,
        covered,
        missing,
        timeline,
        job,
        candidate,
      };
    },
  });
}
