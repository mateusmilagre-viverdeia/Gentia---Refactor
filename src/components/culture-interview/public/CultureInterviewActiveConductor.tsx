// Conductor v2 — slim WebRTC client. Backend dictates each phrase via
// /interview-conductor. The Realtime model only speaks what we send via
// response.create.instructions. No fixed question list in the system prompt,
// no client-side coverage, no hallucination by construction.
//
// Linked plan: .lovable/plan.md "Conductor v2".
// Backend contract: supabase/functions/interview-conductor/index.ts
// Protected pillars: mem://architecture/voice-interview-resilience-principles
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Mic, Clock, PhoneOff, Bot, Loader2, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { logVoiceInterviewEvent } from "@/lib/voiceInterviewTelemetry";
import { toast } from "sonner";
import { InterviewLiveTips } from "@/components/interviews/InterviewLiveTips";
import { classifyTranscript } from "@/lib/interviewTranscriptFilter";

interface Props {
  sessionId: string;
  ephemeralToken: string;
  companyName: string;
  jobTitle: string;
  candidateName?: string;
  onComplete: (
    transcript: string,
    durationSeconds: number,
    transcriptEntries?: Array<{ type: string; text: string; startSeconds: number; endSeconds?: number }>,
    completedNaturally?: boolean,
    tokenUsage?: { audioInputTokens: number; audioOutputTokens: number; textInputTokens: number; textOutputTokens: number },
  ) => void;
  onError: (error: string) => void;
}

const FN_URL = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-conductor/${path}`;
const APIKEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface NextTurnResp {
  action: "speak" | "end";
  say: string;
  turnId: string;
  questionIndex: number;
  isFollowup: boolean;
  phase: string;
  coverage: { covered: number; total: number };
}

export function CultureInterviewActiveConductor({
  sessionId,
  ephemeralToken,
  companyName,
  jobTitle,
  candidateName,
  onComplete,
  onError,
}: Props) {
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Conectando...");
  const [isConnected, setIsConnected] = useState(false);
  const [coverage, setCoverage] = useState<{ covered: number; total: number }>({ covered: 0, total: 0 });
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio recording (mic + AI mixed) — feeds culture-interview-upload-audio
  // so QA, watchdog and reevaluation have the raw audio. Mirrors the pattern
  // in CultureInterviewActive (classic) and the candidate Modal.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderStartedRef = useRef(false);

  // Conductor turn state
  const currentTurnRef = useRef<NextTurnResp | null>(null);
  const userTurnStartSecRef = useRef<number | null>(null);
  const userTurnTextRef = useRef<string>("");
  const transcriptEntriesRef = useRef<Array<{ type: "ai" | "candidate"; text: string; startSeconds: number; endSeconds?: number }>>([]);
  const tokenUsageRef = useRef({ audioInputTokens: 0, audioOutputTokens: 0, textInputTokens: 0, textOutputTokens: 0 });
  const endedRef = useRef(false);
  // Quantas vezes já tentamos descartar um `action: "end"` com cobertura
  // incompleta. Bound em 3 para evitar loop caso o backend insista.
  const incompleteEndRetriesRef = useRef(0);
  // Maior questionIndex já visto (fora de followup). Usado para detectar
  // regressão do conductor e abortar como fim em vez de entrar em loop.
  const maxQuestionIndexRef = useRef<number>(-1);


  // v2.1: double-fire guards + active response tracking + speculative prefetch
  const nextTurnInFlightRef = useRef(false);
  const lastTurnIdRef = useRef<string | null>(null);
  const aiResponseActiveRef = useRef(false);
  const speculativeTurnRef = useRef<NextTurnResp | null>(null);

  // Latency diagnostics: timestamp when user stops speaking, to measure
  // gap until AI response actually starts streaming audio.
  const userSpeechStoppedAtRef = useRef<number | null>(null);
  const lastUserTranscriptLenRef = useRef<number>(0);

  const elapsedSec = () => Math.floor((Date.now() - startTimeRef.current) / 1000);

  // ───────── conductor api ─────────
  const callConductor = useCallback(
    async <T,>(path: string, body: Record<string, unknown>): Promise<T | null> => {
      try {
        const res = await fetch(FN_URL(path), {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: APIKEY },
          body: JSON.stringify({ sessionId, ...body }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn(`[conductor] ${path} failed`, res.status, json);
          return null;
        }
        return json as T;
      } catch (e) {
        console.warn(`[conductor] ${path} threw`, e);
        return null;
      }
    },
    [sessionId],
  );

  // ───────── audio recording (mic + AI mixed) ─────────
  const setupAudioRecording = useCallback((micStream: MediaStream, aiAudioElement: HTMLAudioElement) => {
    if (recorderStartedRef.current) return;
    try {
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;

      const micSource = audioContext.createMediaStreamSource(micStream);
      const micGain = audioContext.createGain();
      micGain.gain.value = 1.0;
      micSource.connect(micGain);
      micGain.connect(destination);

      const connectAIAudio = () => {
        if (aiAudioElement.srcObject) {
          try {
            const aiStream = aiAudioElement.srcObject as MediaStream;
            const aiSource = audioContext.createMediaStreamSource(aiStream);
            const aiGain = audioContext.createGain();
            aiGain.gain.value = 1.0;
            aiSource.connect(aiGain);
            aiGain.connect(destination);
          } catch (e) {
            console.warn("[conductor] could not connect AI audio to recorder:", e);
          }
        }
      };
      aiAudioElement.addEventListener("loadedmetadata", connectAIAudio);
      connectAIAudio();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(destination.stream, { mimeType, audioBitsPerSecond: 128000 });
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = (event) => {
        console.error("[conductor] MediaRecorder error:", event);
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "audio_upload_failed", payload: { reason: "recorder_error" } });
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recorderStartedRef.current = true;
    } catch (error) {
      console.error("[conductor] error setting up audio recording:", error);
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: "audio_upload_failed",
        payload: { reason: "recorder_setup_error", errorMessage: error instanceof Error ? error.message : String(error) },
      });
    }
  }, [sessionId]);

  const stopRecorderAndFlush = useCallback((): Promise<Blob | null> =>
    new Promise((resolve) => {
      const r = mediaRecorderRef.current;
      if (!r || r.state === "inactive") {
        const existing = audioChunksRef.current;
        if (existing.length > 0) return resolve(new Blob(existing, { type: "audio/webm" }));
        return resolve(null);
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(blob.size > 0 ? blob : null);
      };
      r.onstop = finish;
      setTimeout(finish, 2000);
      try { r.stop(); } catch { finish(); }
    }), []);

  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch { /* noop */ }
    }
    audioContextRef.current = null;
    destinationRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const uploadAudioBlob = useCallback(async (sid: string, audioBlob: Blob) => {
    const t0 = Date.now();
    logVoiceInterviewEvent({
      sessionId: sid,
      sessionType: "cultural",
      eventType: "audio_upload_started",
      payload: { size: audioBlob.size, mimeType: audioBlob.type },
    });
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "interview.webm");
      formData.append("sessionId", sid);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-upload-audio`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        },
      );
      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error("[conductor] audio upload failed:", response.status, errText);
        logVoiceInterviewEvent({
          sessionId: sid,
          sessionType: "cultural",
          eventType: "audio_upload_failed",
          payload: { status: response.status, errorMessage: errText.slice(0, 500), blobSize: audioBlob.size },
        });
      } else {
        logVoiceInterviewEvent({
          sessionId: sid,
          sessionType: "cultural",
          eventType: "audio_upload_succeeded",
          payload: { size: audioBlob.size, durationMs: Date.now() - t0 },
        });
      }
    } catch (error) {
      console.error("[conductor] error uploading audio:", error);
      logVoiceInterviewEvent({
        sessionId: sid,
        sessionType: "cultural",
        eventType: "audio_upload_failed",
        payload: { errorMessage: error instanceof Error ? error.message : "unknown", blobSize: audioBlob.size },
      });
    }
  }, []);



  // Deterministic AI speech: push the exact phrase as a system item, then a
  // minimal response.create. Cancel any in-flight response first so we never
  // collide with "conversation already has active response".
  const sendResponseCreate = useCallback((say: string, turn?: NextTurnResp | null) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    try {
      if (aiResponseActiveRef.current) {
        dc.send(JSON.stringify({ type: "response.cancel" }));
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "conductor_response_cancelled",
        });
      }
      // Positional context — reinforces that this is a structured script.
      // The model should NOT verbalize this header; the prompt fixo already
      // forbids any text outside the literal phrase.
      let header = "[ROTEIRO ESTRUTURADO]";
      if (turn) {
        const total = turn.coverage?.total ?? 0;
        if (turn.phase === "asking" || turn.phase === "followup") {
          const pos = (turn.questionIndex ?? 0) + 1;
          const tag = turn.isFollowup ? " — follow-up" : "";
          header = `[ROTEIRO ESTRUTURADO — Pergunta ${pos} de ${total}${tag}. Este número é referência INTERNA, NÃO verbalize.]`;
        } else if (turn.phase === "opening" || turn.phase === "awaiting_start") {
          header = "[ROTEIRO ESTRUTURADO — Abertura. Não verbalize esta marcação.]";
        } else if (turn.phase === "closing") {
          header = "[ROTEIRO ESTRUTURADO — Encerramento. Não verbalize esta marcação.]";
        }
      }
      const text = `${header}\nDiga AGORA, em português do Brasil, EXATAMENTE esta frase e nada mais — sem prefácio, sem comentário, sem complemento, sem exemplo: "${say.replace(/"/g, "'")}"`;
      dc.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text }],
        },
      }));
      dc.send(JSON.stringify({
        type: "response.create",
        response: { output_modalities: ["audio"] },
      }));
      aiResponseActiveRef.current = true;
    } catch (e) {
      console.warn("[conductor] dc.send failed", e);
    }
  }, [sessionId]);

  const runNextTurn = useCallback(async () => {
    if (endedRef.current) return;
    if (nextTurnInFlightRef.current) {
      logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "conductor_double_fire_blocked" });
      return;
    }
    nextTurnInFlightRef.current = true;
    try {
      // Speculative hit: use prefetched turn if available.
      let r: NextTurnResp | null = null;
      const spec = speculativeTurnRef.current;
      if (spec) {
        speculativeTurnRef.current = null;
        // Convert speculative → real by calling for the actual turn (which
        // also writes state). The speculative phrase should match.
        r = await callConductor<NextTurnResp>("next-turn", {});
        if (r && spec.say === r.say && spec.phase === r.phase) {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "conductor_speculative_hit" });
        } else {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "conductor_speculative_miss" });
        }
      } else {
        r = await callConductor<NextTurnResp>("next-turn", {});
      }
      if (!r) return;
      if (lastTurnIdRef.current && lastTurnIdRef.current === r.turnId) {
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "conductor_double_fire_blocked", payload: { reason: "dup_turn_id" } });
        return;
      }
      lastTurnIdRef.current = r.turnId;
      currentTurnRef.current = r;
      setCoverage(r.coverage);

      // ── Observabilidade de regressão de questionIndex ──
      // O servidor pode legitimamente devolver um índice menor (candidato
      // pediu para voltar, coverage gate reabriu pendência, reformulação).
      // Apenas logamos para telemetria; NÃO alteramos r.action.
      if (
        r.action === "speak" &&
        !r.isFollowup &&
        r.phase !== "closing" &&
        r.phase !== "opening" &&
        r.phase !== "awaiting_start" &&
        maxQuestionIndexRef.current >= 0 &&
        r.questionIndex < maxQuestionIndexRef.current
      ) {
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "conductor_regression_detected_client",
          payload: {
            previousMax: maxQuestionIndexRef.current,
            received: r.questionIndex,
            phase: r.phase,
            coverage: r.coverage,
            note: "logged_only_no_force_end",
          },
        });
      } else if (r.action === "speak" && !r.isFollowup && r.questionIndex >= 0) {
        if (r.questionIndex > maxQuestionIndexRef.current) {
          maxQuestionIndexRef.current = r.questionIndex;
        }
      }


      // Log do turno emitido para a timeline de debug e detector de anomalias.
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: "conductor_next_turn",
        payload: {
          action: r.action,
          phase: r.phase,
          questionIndex: r.questionIndex,
          isFollowup: r.isFollowup,
          coverage: r.coverage,
          turnId: r.turnId,
        },
      });

      if (r.action === "end") {
        // ── Guard contra encerramento precoce ──

        // Se o backend pediu para encerrar mas a cobertura ainda não está
        // completa, NÃO finaliza: loga warning e pede o próximo turno de novo.
        // O conductor agora tem gate de cobertura — esse caminho só deve
        // disparar em edge cases ou sessões antigas. Bound em 3 retries.
        const cov = r.coverage || { covered: 0, total: 0 };
        if (cov.total > 0 && cov.covered < cov.total && incompleteEndRetriesRef.current < 3) {
          incompleteEndRetriesRef.current += 1;
          console.warn("[conductor] ignored premature end", {
            covered: cov.covered, total: cov.total, retry: incompleteEndRetriesRef.current,
          });
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "culture_premature_end_blocked",
            payload: { coverage: cov, retry: incompleteEndRetriesRef.current },
          });
          // Libera a flight flag e re-tenta — backend deve retornar a próxima pendente.
          nextTurnInFlightRef.current = false;
          setTimeout(() => { void runNextTurn(); }, 400);
          return;
        }
        endedRef.current = true;
        const total = elapsedSec();
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "session_completed_client",
          payload: { reason: "conductor_end", coverage: r.coverage },
        });
        setTimeout(async () => {
          // 1. Flush recorder BEFORE tearing down audio graph.
          const blob = await stopRecorderAndFlush();
          // 2. Tear down PC/streams.
          try { dcRef.current?.close(); } catch {/*noop*/}
          try { pcRef.current?.close(); } catch {/*noop*/}
          try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {/*noop*/}
          closeAudioContext();
          // 3. Fire-and-forget upload so onComplete isn't blocked.
          if (blob && blob.size > 0) {
            void uploadAudioBlob(sessionId, blob).catch((e) => console.error("[conductor] upload promise rejected:", e));
          }
          const fullTranscript = transcriptEntriesRef.current
            .map((e) => `${e.type === "ai" ? "Entrevistador" : "Candidato"}: ${e.text}`)
            .join("\n");
          onComplete(fullTranscript, total, transcriptEntriesRef.current, true, tokenUsageRef.current);
        }, 800);
        return;
      }
      if (r.action === "speak") {
        transcriptEntriesRef.current.push({
          type: "ai",
          text: r.say,
          startSeconds: elapsedSec(),
        });
        sendResponseCreate(r.say, r);
      }
    } finally {
      nextTurnInFlightRef.current = false;
    }
  }, [callConductor, closeAudioContext, onComplete, sendResponseCreate, sessionId, stopRecorderAndFlush, uploadAudioBlob]);

  const commitAndAdvance = useCallback(async (transcript: string, startSec: number, endSec: number) => {
    const turn = currentTurnRef.current;
    if (!turn) return;
    transcriptEntriesRef.current.push({
      type: "candidate",
      text: transcript,
      startSeconds: startSec,
      endSeconds: endSec,
    });
    const r = await callConductor<{ ok: boolean; coverage?: { covered: number; total: number } }>("commit-turn", {
      turnId: turn.turnId,
      candidateTranscript: transcript,
      startSec,
      endSec,
    });
    if (r?.coverage) setCoverage(r.coverage);
    await runNextTurn();
  }, [callConductor, runNextTurn]);

  // ───────── realtime event handler ─────────
  const handleRealtimeEvent = useCallback((evt: { type: string; [k: string]: unknown }) => {
    switch (evt.type) {
      case "input_audio_buffer.speech_started":
        setIsUserSpeaking(true);
        userTurnStartSecRef.current = elapsedSec();
        userTurnTextRef.current = "";
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "speech_started" });
        break;
      case "input_audio_buffer.speech_stopped": {
        setIsUserSpeaking(false);
        userSpeechStoppedAtRef.current = Date.now();
        const burstSec =
          userTurnStartSecRef.current !== null
            ? Math.max(0, elapsedSec() - userTurnStartSecRef.current)
            : 0;
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "speech_stopped",
          payload: { burst_sec: Number(burstSec.toFixed(2)) },
        });
        // Speculative prefetch: warm up the next turn in parallel with
        // transcription so we cut ~300-600ms of round-trip latency.
        // Only when the burst was long enough to plausibly be a real answer —
        // avoids "queimar" o conductor com respiros/ruídos curtos do VAD.
        if (
          burstSec >= 0.8 &&
          !speculativeTurnRef.current &&
          !endedRef.current
        ) {
          void callConductor<NextTurnResp>("next-turn", { speculative: true }).then((r) => {
            if (r) speculativeTurnRef.current = r;
          });
        } else if (burstSec < 0.8) {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "speculative_skipped_short_burst",
            payload: { burst_sec: Number(burstSec.toFixed(2)) },
          });
        }
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        const transcript = String((evt as { transcript?: string }).transcript || "").trim();
        const startSec = userTurnStartSecRef.current ?? Math.max(0, elapsedSec() - 4);
        const endSec = elapsedSec();
        userTurnTextRef.current = transcript;
        userTurnStartSecRef.current = null;
        lastUserTranscriptLenRef.current = transcript.length;
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "transcription_received",
          payload: { len: transcript.length, startSec, endSec },
        });
        if (!transcript) return;

        // Filtro anti-ruído: descarta hallucinations curtas do Whisper
        // (ex.: "ok", "thanks", "ah", "again") e transcrições fora do PT-BR,
        // que de outra forma disparariam commitAndAdvance e fariam o conductor
        // pular perguntas sem o candidato ter falado. Mesma lógica já usada
        // em CultureInterviewActive e TechnicalInterviewActive.
        const phase = currentTurnRef.current?.phase;
        const dropReason = classifyTranscript(transcript, {
          awaitingConfirmation: phase === "opening" || phase === "awaiting_start",
        });
        if (dropReason) {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "transcript_dropped_noise",
            payload: {
              len: transcript.length,
              reason: dropReason,
              sample: transcript.slice(0, 60),
              phase: phase ?? null,
            },
          });
          // Descarta também o turno especulativo já prefetchado para não
          // consumir a próxima pergunta na próxima rodada legítima.
          speculativeTurnRef.current = null;
          return;
        }

        void commitAndAdvance(transcript, startSec, endSec);
        break;
      }
      case "response.created":
        setIsAISpeaking(true);
        aiResponseActiveRef.current = true;
        if (userSpeechStoppedAtRef.current) {
          const gapMs = Date.now() - userSpeechStoppedAtRef.current;
          const turn = currentTurnRef.current;
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "agent_response_latency",
            payload: {
              gap_ms: gapMs,
              transcript_len: lastUserTranscriptLenRef.current,
              question_index: turn?.questionIndex ?? null,
              phase: turn?.phase ?? null,
            },
          });
          userSpeechStoppedAtRef.current = null;
        }
        break;
      case "response.done": {
        setIsAISpeaking(false);
        aiResponseActiveRef.current = false;
        const usage = (evt as { response?: { usage?: Record<string, unknown> } })?.response?.usage;
        if (usage && typeof usage === "object") {
          const u = usage as Record<string, number | { audio_tokens?: number; text_tokens?: number } | undefined>;
          const inp = (u.input_token_details as { audio_tokens?: number; text_tokens?: number } | undefined) || {};
          const out = (u.output_token_details as { audio_tokens?: number; text_tokens?: number } | undefined) || {};
          tokenUsageRef.current.audioInputTokens += Number(inp.audio_tokens || 0);
          tokenUsageRef.current.textInputTokens += Number(inp.text_tokens || 0);
          tokenUsageRef.current.audioOutputTokens += Number(out.audio_tokens || 0);
          tokenUsageRef.current.textOutputTokens += Number(out.text_tokens || 0);
        }
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "ai_response_done" });
        break;
      }
      case "error":
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "realtime_error_suppressed",
          payload: { error: evt },
        });
        break;
      default:
        break;
    }
  }, [callConductor, commitAndAdvance, sessionId]);

  // ───────── connect WebRTC ─────────
  const connect = useCallback(async () => {
    try {
      setConnectionStatus("Permitindo microfone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;
      logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_permission_granted" });

      setConnectionStatus("Estabelecendo conexão...");
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;
      try { pc.addTransceiver("audio", { direction: "recvonly" }); } catch {/*noop*/}

      stream.getAudioTracks().forEach((t) => {
        pc.addTrack(t, stream);
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "mic_track_attached",
          payload: { label: t.label, enabled: t.enabled, readyState: t.readyState },
        });
      });

      pc.ontrack = (event) => {
        const audioEl = audioElRef.current;
        if (!audioEl) return;
        audioEl.srcObject = event.streams[0] || new MediaStream([event.track]);
        audioEl.muted = false;
        audioEl.volume = 1.0;
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "ai_audio_track_received",
          payload: { kind: event.track.kind },
        });
        // Start combined mic + AI recording as soon as the AI audio track lands.
        if (micStreamRef.current) {
          setupAudioRecording(micStreamRef.current, audioEl);
        }
        audioEl.play()
          .then(() => {
            setNeedsAudioUnlock(false);
            logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "ai_audio_play_started" });
          })
          .catch((err) => {
            setNeedsAudioUnlock(true);
            logVoiceInterviewEvent({
              sessionId,
              sessionType: "cultural",
              eventType: "ai_audio_play_failed",
              payload: { error: String(err?.message || err) },
            });
          });
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = async () => {
        setIsConnected(true);
        setConnectionStatus("Conectado");
        startTimeRef.current = Date.now();
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "session_connected" });
        // Kick off the conductor loop.
        await runNextTurn();
      };
      dc.onmessage = (ev) => {
        try { handleRealtimeEvent(JSON.parse(ev.data)); } catch {/*noop*/}
      };
      dc.onerror = (e) => {
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "data_channel_error", payload: { error: String(e) } });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "abnormal_disconnect",
            payload: { state: pc.connectionState },
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        setTimeout(resolve, 5000);
      });

      const sdpResp = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime-mini", {
        method: "POST",
        headers: { Authorization: `Bearer ${ephemeralToken}`, "Content-Type": "application/sdp" },
        body: pc.localDescription?.sdp,
      });
      if (!sdpResp.ok) {
        onError("Erro ao conectar com a IA. Tente novamente.");
        return;
      }
      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/permission|denied|notallowed/i.test(msg)) {
        onError("Permissão do microfone negada. Permita o acesso e tente novamente.");
      } else {
        onError(`Erro ao iniciar a entrevista: ${msg}`);
      }
    }
  }, [ephemeralToken, handleRealtimeEvent, onError, runNextTurn, sessionId, setupAudioRecording]);

  useEffect(() => {
    void connect();

    // ── Pagehide fallback ──
    // Se o usuário fechar/recarregar a aba antes do encerramento normal, faz
    // best-effort para preservar o áudio: força requestData() no recorder e
    // envia os chunks acumulados via sendBeacon (que sobrevive ao unload).
    const handlePageHide = () => {
      try {
        const r = mediaRecorderRef.current;
        if (r && r.state === "recording") {
          try { r.requestData(); } catch {/*noop*/}
          try { r.stop(); } catch {/*noop*/}
        }
        const chunks = audioChunksRef.current;
        if (chunks && chunks.length > 0 && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          const blob = new Blob(chunks, { type: "audio/webm" });
          if (blob.size > 0) {
            const fd = new FormData();
            fd.append("audio", blob, "interview.webm");
            fd.append("sessionId", sessionId);
            fd.append("source", "pagehide");
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-upload-audio`;
            try {
              navigator.sendBeacon(url, fd);
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "cultural",
                eventType: "audio_upload_pagehide_attempt",
                payload: { size: blob.size },
              });
            } catch {/*noop*/}
          }
        }
      } catch {/*noop*/}
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      // Best-effort recorder stop on unmount (no upload — page is going away).
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {/*noop*/}
      try {
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }
      } catch {/*noop*/}
      try { dcRef.current?.close(); } catch {/*noop*/}
      try { pcRef.current?.close(); } catch {/*noop*/}
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {/*noop*/}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedTime(elapsedSec()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleEndClick = () => setConfirmEndOpen(true);
  const handleConfirmEnd = () => {
    setConfirmEndOpen(false);
    if (endedRef.current) return;
    endedRef.current = true;
    setIsEnding(true);

    // 1. Stop the visible timer IMMEDIATELY so UX never feels frozen.
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const total = elapsedSec();
    const fullTranscript = transcriptEntriesRef.current
      .map((e) => `${e.type === "ai" ? "Entrevistador" : "Candidato"}: ${e.text}`)
      .join("\n");

    // 2. Fire-and-forget: abort + recorder flush + upload run in the background.
    //    onComplete must not wait on the network — it already has everything
    //    needed (transcript + duration + token usage in memory).
    void (async () => {
      try {
        await callConductor<{ ok: boolean }>("abort", { reason: "user_clicked_end" });
      } catch { /* noop */ }
      let blob: Blob | null = null;
      try { blob = await stopRecorderAndFlush(); } catch { /* noop */ }
      try { dcRef.current?.close(); } catch {/*noop*/}
      try { pcRef.current?.close(); } catch {/*noop*/}
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {/*noop*/}
      closeAudioContext();
      if (blob && blob.size > 0) {
        void uploadAudioBlob(sessionId, blob).catch((e) => console.error("[conductor] upload promise rejected:", e));
      }
    })();

    // 3. Hand off to the parent NOW. The parent will navigate away; any
    //    background work above either finishes or gets killed by unmount —
    //    either way the user no longer sees a stuck timer.
    onComplete(
      fullTranscript,
      total,
      transcriptEntriesRef.current,
      false,
      tokenUsageRef.current,
    );
  };

  const handleAudioUnlock = () => {
    const el = audioElRef.current;
    if (!el) return;
    el.play()
      .then(() => {
        setNeedsAudioUnlock(false);
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "ai_audio_unlock_clicked" });
      })
      .catch(() => toast.error("Não foi possível liberar o áudio. Verifique o volume."));
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const pct = coverage.total > 0 ? Math.min(100, Math.round((coverage.covered / coverage.total) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 flex items-center justify-center">
      <audio ref={audioElRef} autoPlay playsInline className="hidden" />

      <Card className="w-full max-w-2xl shadow-xl border-border/50">
        <CardContent className="p-8 space-y-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Building2 className="h-4 w-4" />
                <span>{companyName}</span>
                <span className="opacity-50">·</span>
                <span>{jobTitle}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {candidateName ? `Olá, ${candidateName.split(" ")[0]}` : "Entrevista cultural"}
              </h1>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              {fmt(elapsedTime)}
            </Badge>
          </header>

          <div className="rounded-xl border border-border/60 bg-card/50 p-6">
            <div className="flex items-center justify-center gap-12 py-4">
              <motion.div
                animate={{ scale: isAISpeaking ? [1, 1.08, 1] : 1, opacity: isAISpeaking ? 1 : 0.55 }}
                transition={{ duration: 1.2, repeat: isAISpeaking ? Infinity : 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {isAISpeaking ? "Falando..." : "Entrevistador"}
                </span>
              </motion.div>
              <motion.div
                animate={{ scale: isUserSpeaking ? [1, 1.08, 1] : 1, opacity: isUserSpeaking ? 1 : 0.55 }}
                transition={{ duration: 0.9, repeat: isUserSpeaking ? Infinity : 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Mic className="h-7 w-7 text-emerald-600" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {isUserSpeaking ? "Ouvindo você..." : "Você"}
                </span>
              </motion.div>
            </div>

            {!isConnected && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {connectionStatus}
              </div>
            )}

            {needsAudioUnlock && (
              <div className="flex justify-center mt-4">
                <Button onClick={handleAudioUnlock} size="sm" variant="secondary" className="gap-2">
                  <Volume2 className="h-4 w-4" />
                  Tocar áudio
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>
                {coverage.covered} / {coverage.total > 0 ? coverage.total : "—"}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          <InterviewLiveTips />





          <div className="flex justify-center pt-2">
            <Button
              onClick={handleEndClick}
              variant="destructive"
              size="lg"
              disabled={!isConnected || isEnding}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              {isEnding ? "Encerrando..." : "Encerrar entrevista"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a entrevista agora?</AlertDialogTitle>
            <AlertDialogDescription>
              Se você ainda não respondeu a todas as perguntas, sua entrevista pode ser
              considerada incompleta. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar entrevista</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEnd}>Encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
