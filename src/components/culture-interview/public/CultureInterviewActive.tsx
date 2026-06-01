import { useState, useRef, useCallback, useEffect } from "react";
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
import { 
  Building2, 
  Mic, 
  Clock, 
  PhoneOff,
  User,
  Bot,
  Loader2,
  AlertTriangle,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSilenceDetector } from "@/hooks/useSilenceDetector";
import { WaitingIndicator } from "@/components/interviews/WaitingIndicator";
import { StartSpeakingAlert } from "@/components/interviews/StartSpeakingAlert";
import { InterviewLiveTips } from "@/components/interviews/InterviewLiveTips";
import { logVoiceInterviewEvent } from "@/lib/voiceInterviewTelemetry";
import { saveInterviewResponse } from "@/lib/interviewSaveResponse";
import { useCultureInterviewCoverage } from "@/hooks/useCultureInterviewCoverage";
import { classifyTranscript } from "@/lib/interviewTranscriptFilter";
import { toast } from "sonner";

interface CultureInterviewActiveProps {
  sessionId: string;
  ephemeralToken: string;
  companyName: string;
  jobTitle: string;
  candidateName?: string;
  aiInitiatesConversation?: boolean;
  onComplete: (transcript: string, durationSeconds: number, transcriptEntries?: Array<{ type: string; text: string; startSeconds: number; endSeconds?: number }>, completedNaturally?: boolean, tokenUsage?: { audioInputTokens: number; audioOutputTokens: number; textInputTokens: number; textOutputTokens: number }) => void;
  onError: (error: string) => void;
}

export function CultureInterviewActive({
  sessionId,
  ephemeralToken,
  companyName,
  jobTitle,
  candidateName,
  aiInitiatesConversation = true,
  onComplete,
  onError,
}: CultureInterviewActiveProps) {
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<string>("Conectando...");
  const [isConnected, setIsConnected] = useState(false);
  const [interviewCompletionDetected, setInterviewCompletionDetected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  // Server-tracked coverage (questions actually covered vs total)
  const coverage = useCultureInterviewCoverage(sessionId, 5000);
  const coverageRef = useRef(coverage);
  useEffect(() => { coverageRef.current = coverage; }, [coverage]);
  const prematureBlockToastedRef = useRef(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  // Audio recording (mic + AI mixed) — needed for QA, watchdog audio_url,
  // and any re-evaluation. Without this, audio_url stays null on public sessions.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderStartedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>("");
  const lastAIQuestionRef = useRef<string>("");
  // Acumulador de tokens reais retornados pela OpenAI Realtime (response.done.usage).
  // Usado para cobrar o custo REAL em vez de estimativa por minuto.
  const tokenUsageRef = useRef({
    audioInputTokens: 0,
    audioOutputTokens: 0,
    textInputTokens: 0,
    textOutputTokens: 0,
  });
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const connectionHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const questionIndexCounterRef = useRef<number>(0);
  const transcriptEntriesRef = useRef<Array<{ type: string; text: string; startSeconds: number; endSeconds?: number }>>([]);
  const currentAITextRef = useRef<string>("");
  const currentAIStartRef = useRef<number | null>(null);
  const currentUserStartRef = useRef<number | null>(null);
  const activeResponseIdRef = useRef<string | null>(null);
  // Strong mute via RTCRtpSender.replaceTrack — corta o áudio enviado ao Realtime
  // de verdade (não só `track.enabled = false`). Evita falsos positivos de VAD
  // por ruído ambiente e auto-interrupção da própria voz da IA.
  const micSenderRef = useRef<RTCRtpSender | null>(null);
  const originalMicTrackRef = useRef<MediaStreamTrack | null>(null);
  // Fase da introdução: enquanto verdadeira, mic fica mutado de verdade e
  // transcrições/respostas do candidato não são processadas. Só libera após
  // a IA perguntar "Tudo certo pra começar?" e o candidato responder afirmativamente.
  const introLockedRef = useRef<boolean>(true);
  const awaitingConfirmationRef = useRef<boolean>(false);
  const [introLocked, setIntroLocked] = useState<boolean>(true);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  // Cooldown após a IA terminar de falar: ignoramos speech_started / transcrições
  // do candidato durante essa janela, para evitar que o tail/eco da própria voz
  // da IA seja interpretado como início de fala do candidato.
  const AI_COOLDOWN_MS = 300;
  const aiCooldownUntilRef = useRef<number>(0);
  const isInAICooldown = () => Date.now() < aiCooldownUntilRef.current;
  // P0: timestamp da PRIMEIRA fala da IA (response.created enquanto introLocked)
  // — usado para o timeout absoluto de 30s que destrava o intro mesmo se a IA
  // não disser nenhuma das 5 frases de confirmação ("Tudo certo pra começar?" etc).
  const aiOpeningAtRef = useRef<number | null>(null);
  const INTRO_TIMEOUT_MS = 30_000;

  // Send response.create on the data channel. Do NOT block on activeResponseIdRef:
  // OpenAI Realtime already rejects with conversation_already_has_active_response when needed,
  // and the old client-side gate was causing legit responses to be silently dropped.
  const safeSendResponseCreate = (payload: Record<string, unknown> = { type: "response.create", response: { output_modalities: ["audio"] } }) => {
    try {
      dataChannelRef.current?.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn("Failed to send response.create:", e);
      return false;
    }
  };

  // Known-benign Realtime errors we should not surface to the candidate
  const isBenignRealtimeError = (err: any) => {
    const code = err?.code || err?.type || "";
    const msg = (err?.message || "").toLowerCase();
    const param = (err?.param || "").toLowerCase();
    return (
      code === "conversation_already_has_active_response" ||
      code === "response_cancel_not_active" ||
      msg.includes("active response in progress") ||
      msg.includes("no active response found") ||
      // session.update parcial rejeitado pelo servidor — sessão segue viva, não assustar candidato
      param === "session.type" ||
      param === "session.instructions_append" ||
      msg.includes("missing required parameter: 'session.type'") ||
      msg.includes("unknown parameter: 'session.instructions_append'") ||
      (msg.includes("unknown parameter") && msg.includes("session."))
    );
  };

  // Keep transcript ref in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Silence detector — mostra indicador de "IA aguardando" quando candidato pausa
  const isCandidateSilent = useSilenceDetector(localStream, {
    silenceMs: 2000,
    threshold: 0.015,
    enabled: isConnected && !isAISpeaking,
  });
  const showWaitingIndicator = isCandidateSilent && !isAISpeaking && isConnected;

  // IMPORTANTE: NÃO cortamos mais o áudio enviado ao Realtime durante a
  // introdução/fala da IA. Cortar com replaceTrack(null) / track.enabled=false
  // deixava o WebRTC sem áudio real chegando ao VAD e a entrevista travava
  // logo após a pergunta de confirmação. Em vez disso, a proteção contra
  // falsos positivos é feita de forma puramente LÓGICA no handler de eventos:
  // enquanto introLockedRef estiver true e awaitingConfirmationRef false,
  // qualquer speech_started / transcription do candidato é ignorado.
  //
  // Mantemos apenas um efeito leve para limpar o buffer de input quando a IA
  // termina de falar, evitando capturar o tail/eco da própria voz da IA.
  useEffect(() => {
    if (!isAISpeaking) {
      aiCooldownUntilRef.current = Date.now() + AI_COOLDOWN_MS;
      try { dataChannelRef.current?.send(JSON.stringify({ type: "input_audio_buffer.clear" })); } catch {}
    }
  }, [isAISpeaking]);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);


  // NOTA: a config de VAD/turn_detection é fixada no token criado em
  // `start-culture-session` (audio.input.turn_detection com interrupt_response=false
  // durante toda a sessão). Não tentamos mais alterar via session.update no
  // cliente porque a Realtime API rejeita o caminho `session.turn_detection`
  // (Unknown parameter), o que gerava ruído de erro e podia atrapalhar o fluxo.
  // O gate de intro é puramente local (introLockedRef / awaitingConfirmationRef).


  // Initialize connection on mount.
  // P0: startedRef guard evita double-mount (StrictMode/remount) que estava
  // abrindo 2 PeerConnections em paralelo — consumindo crédito Realtime em
  // dobro e embaralhando estado do gate de intro.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) {
      console.log("⏭️ initializeConnection skipped (already started)");
      return;
    }
    startedRef.current = true;
    initializeConnection();
    
    // Setup heartbeat
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
    
    return () => {
      cleanupConnection();
    };
  }, []);

  // Beforeunload protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Page Visibility — força heartbeat imediato ao voltar para a aba,
  // evitando falso positivo de abandono pelo watchdog.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // P0: detector de pipeline silencioso. Se após 90s da entrevista ter saído
  // do intro_locked nenhuma transcrição.completed chegou, logamos telemetria
  // e tentamos reafirmar a config de transcription no Realtime. Roda 1x.
  useEffect(() => {
    const id = setInterval(() => {
      if (introLockedRef.current) return;
      if (firstTranscriptionAtRef.current) return;
      if (pipelineSilentLoggedRef.current) return;
      // 90s desde a saída do intro = sem transcrição live
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed < 90) return;
      pipelineSilentLoggedRef.current = true;
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: "transcription_pipeline_silent",
        payload: { elapsedSeconds: elapsed },
      });
      try {
        dataChannelRef.current?.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              audio: {
                input: {
                  transcription: { model: "gpt-4o-mini-transcribe" },
                },
              },
            },
          }),
        );
      } catch (e) {
        console.warn("Failed to reaffirm transcription config:", e);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [sessionId]);

  // P0: TIMEOUT ABSOLUTO do intro. Se passaram 30s desde ai_initiated_opening
  // e o intro ainda está locked (IA não disse frase-chave + candidato não falou),
  // destrava sozinho. Garante que nenhuma sessão fique presa no gate de intro.
  useEffect(() => {
    const id = setInterval(() => {
      if (!introLockedRef.current) return;
      if (!aiOpeningAtRef.current) return;
      const elapsed = Date.now() - aiOpeningAtRef.current;
      if (elapsed < INTRO_TIMEOUT_MS) return;
      introLockedRef.current = false;
      awaitingConfirmationRef.current = false;
      setIntroLocked(false);
      setAwaitingConfirmation(false);
      console.log(`🔓 Intro auto-unlocked por TIMEOUT (${Math.floor(elapsed/1000)}s)`);
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: "intro_unlocked",
        payload: { reason: "timeout", elapsedMs: elapsed },
      });
      // Cutuca a IA para fazer a primeira pergunta real.
      try {
        safeSendResponseCreate({ type: "response.create", response: { output_modalities: ["audio"] } });
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [sessionId]);





  const setupAudioRecording = useCallback((micStream: MediaStream, aiAudioElement: HTMLAudioElement) => {
    if (recorderStartedRef.current) return;
    try {
      console.log("🎙️ Setting up combined audio recording (cultural public)...");
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
            console.log("✅ AI audio connected to recorder");
          } catch (e) {
            console.warn("Could not connect AI audio:", e);
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
        console.error("❌ MediaRecorder error:", event);
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "audio_upload_failed", payload: { reason: "recorder_error" } });
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recorderStartedRef.current = true;
      console.log("✅ Audio recording started");
    } catch (error) {
      console.error("❌ Error setting up audio recording:", error);
      logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "audio_upload_failed", payload: { reason: "recorder_setup_error", errorMessage: error instanceof Error ? error.message : String(error) } });
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

  const uploadAudioBlob = useCallback(async (sid: string, audioBlob: Blob) => {
    const t0 = Date.now();
    console.log(`📤 Uploading cultural audio (${audioBlob.size} bytes)...`);
    logVoiceInterviewEvent({ sessionId: sid, sessionType: "cultural", eventType: "audio_upload_started", payload: { size: audioBlob.size, mimeType: audioBlob.type } });
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
        console.error("❌ Audio upload failed:", response.status, errText);
        logVoiceInterviewEvent({ sessionId: sid, sessionType: "cultural", eventType: "audio_upload_failed", payload: { status: response.status, errorMessage: errText.slice(0, 500), blobSize: audioBlob.size } });
      } else {
        const result = await response.json().catch(() => ({}));
        console.log("✅ Audio uploaded:", result);
        logVoiceInterviewEvent({ sessionId: sid, sessionType: "cultural", eventType: "audio_upload_succeeded", payload: { size: audioBlob.size, durationMs: Date.now() - t0 } });
      }
    } catch (error) {
      console.error("❌ Error uploading audio:", error);
      logVoiceInterviewEvent({ sessionId: sid, sessionType: "cultural", eventType: "audio_upload_failed", payload: { errorMessage: error instanceof Error ? error.message : "unknown", blobSize: audioBlob.size } });
    }
  }, []);

  const cleanupConnection = useCallback(() => {
    console.log("🧹 Cleaning up connection...");
    
    // Clear intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (connectionHealthCheckRef.current) {
      clearInterval(connectionHealthCheckRef.current);
      connectionHealthCheckRef.current = null;
    }

    // Stop recorder (final flush happens in stopRecorderAndFlush before this).
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
    mediaRecorderRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch { /* noop */ }
    }
    audioContextRef.current = null;
    destinationRef.current = null;
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setLocalStream(null);
    // Reset audio element (declared in JSX, do NOT remove from DOM — that would
    // void any future autoplay grant in this tab and break a retry attempt).
    if (audioElementRef.current) {
      try { audioElementRef.current.pause(); } catch { /* noop */ }
      try { audioElementRef.current.srcObject = null; } catch { /* noop */ }
      console.log("🧹 Elemento de áudio resetado (mantido no DOM)");
    }
  }, []);

  // P0: ref para rastrear se já recebemos qualquer transcrição live (detector
  // de pipeline silencioso). Se passar muito tempo sem nenhuma, disparamos
  // telemetria e tentamos reafirmar transcription no Realtime.
  const firstTranscriptionAtRef = useRef<number | null>(null);
  const pipelineSilentLoggedRef = useRef(false);

  // Hardened save with retry + dead-letter (see src/lib/interviewSaveResponse.ts).
  // Após sucesso, reinjeta cobertura no contexto da IA via session.update — isso
  // mantém o modelo ciente de "X de N perguntas cobertas" durante a chamada,
  // evitando o bug Marina (IA encerrou antes da última pergunta porque perdeu
  // a noção de progresso).
  const saveResponseToDatabase = useCallback(
    async (candidateResponse: string, questionIndex: number) => {
      const aiQuestionSpoken = lastAIQuestionRef.current;
      // Observabilidade: confirma se o transcript da IA foi capturado antes do
      // save. Se for nulo/vazio em runs reais, é sinal de que
      // `response.audio_transcript.done` não está chegando (e o evaluator
      // perde contexto da pergunta).
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: aiQuestionSpoken && aiQuestionSpoken.trim().length > 0
          ? "ai_transcript_captured"
          : "ai_transcript_missing",
        payload: {
          questionIndex,
          aiQuestionLen: aiQuestionSpoken ? aiQuestionSpoken.length : 0,
        },
      });
      const result = await saveInterviewResponse({
        sessionId,
        sessionType: "cultural",
        questionIndex,
        candidateResponse,
        aiQuestionSpoken,
        startSeconds: Math.floor(elapsedTime),
        endSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      });
      if (result.ok) {
        console.log(`✅ Response saved (Q${questionIndex}, attempts=${result.attempts})`);

        // Reinjeta cobertura autoritativa no contexto da IA.
        const cov = result.coverage;
        if (cov && cov.total > 0 && dataChannelRef.current?.readyState === "open") {
          try {
            const pendingPreview = cov.pendingQuestions
              .slice(0, 3)
              .map((q) => `• ${q.question_text}`)
              .join("\n");
            const reminder =
              cov.pendingCount === 0
                ? `LEMBRETE DE COBERTURA: você já cobriu TODAS as ${cov.total} perguntas. Agora pode passar ao bloco de ENCERRAMENTO conforme o script.`
                : `LEMBRETE DE COBERTURA (CRÍTICO): você cobriu ${cov.covered} de ${cov.total} perguntas. Faltam ${cov.pendingCount}. DESPEDIDAS PROIBIDAS até cobrir todas. Próximas pendentes:\n${pendingPreview}`;

            // Reinjeção de cobertura via system message (caminho compatível com a Realtime API atual).
            // NÃO usamos mais `session.update` com `instructions_append` — não existe nessa API e gerava
            // toast destrutivo ("Unknown parameter: 'session.instructions_append'").
            dataChannelRef.current.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "system",
                  content: [{ type: "input_text", text: reminder }],
                },
              }),
            );
            logVoiceInterviewEvent({
              sessionId,
              sessionType: "cultural",
              eventType: "coverage_reinjected",
              payload: {
                covered: cov.covered,
                total: cov.total,
                pendingCount: cov.pendingCount,
              },
            });
          } catch (e) {
            console.warn("Failed to reinject coverage:", e);
          }
        }
      } else {
        console.error(
          `⚠️ Response save FAILED after ${result.attempts} attempts (Q${questionIndex})`,
          result.error,
        );
      }
    },
    [sessionId, elapsedTime],
  );

  // NEW: Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-heartbeat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            sessionId,
            partialTranscript: transcriptRef.current,
            responsesCount: (transcriptRef.current.match(/Candidato:/g) || []).length,
          }),
        }
      );
    } catch (error) {
      console.error('⚠️ Heartbeat error:', error);
    }
  }, [sessionId]);

  const initializeConnection = async () => {
    try {
      setConnectionStatus("Solicitando permissão do microfone...");

      // O elemento <audio> agora é declarado no JSX (com autoPlay + playsInline,
      // sem display:none). Aqui só validamos que o ref existe e garantimos os
      // atributos. NÃO chamamos play() "a seco" antes de termos srcObject —
      // isso, em alguns paths do Chrome/macOS com Bluetooth (AirPods),
      // marca o elemento como "autoplay failed" e bloqueia o próximo play().
      const audioElement = audioElementRef.current;
      if (audioElement) {
        audioElement.autoplay = true;
        audioElement.setAttribute("playsinline", "true");
        audioElement.muted = false;
        audioElement.volume = 1.0;
        audioElement.addEventListener("error", () => {
          console.error("❌ Erro no elemento de áudio:", audioElement.error);
        });
        console.log("🎧 Elemento de áudio pronto (JSX). muted =", audioElement.muted, "volume =", audioElement.volume);
      } else {
        console.warn("⚠️ audioElementRef ainda não montado — JSX deve incluir <audio ref={audioElementRef} autoPlay playsInline className='sr-only' />");
      }
      // === END audio element setup ===
      

      
      // Request microphone permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (micError) {
        console.error("❌ Microphone permission error:", micError);
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_permission_denied", payload: { error: String(micError) } });
        onError("Permissão do microfone negada. Por favor, permita o acesso ao microfone.");
        return;
      }
      
      mediaStreamRef.current = stream;
      setLocalStream(stream);
      console.log("✅ Microphone permission granted");
      logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_permission_granted" });

      setConnectionStatus("Estabelecendo conexão de áudio...");

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // CRITICAL: força uma m-line de áudio recvonly no SDP offer ANTES de
      // addTrack para garantir que a OpenAI sempre anexe a faixa TTS de saída
      // e `pc.ontrack` dispare. Sem isso, em algumas negociações o servidor
      // não envia áudio de volta e o candidato não escuta a entrevistadora.
      try {
        pc.addTransceiver("audio", { direction: "recvonly" });
      } catch (e) {
        console.warn("⚠️ addTransceiver(recvonly) falhou:", e);
      }

      // Add audio track from microphone (with pre-check + telemetry)
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled || audioTracks[0].readyState !== "live") {
        console.warn("⚠️ Mic track inválido, refazendo getUserMedia...");
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "mic_track_invalid_precheck",
          payload: {
            tracks: audioTracks.length,
            firstEnabled: audioTracks[0]?.enabled,
            firstMuted: audioTracks[0]?.muted,
            firstReadyState: audioTracks[0]?.readyState,
          },
        });
        try {
          stream.getTracks().forEach(t => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          mediaStreamRef.current = stream;
          setLocalStream(stream);
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_recovered", payload: { afterRetry: true } });
        } catch (retryErr) {
          console.error("❌ Mic retry falhou:", retryErr);
        }
      }

      stream.getAudioTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        if (!micSenderRef.current) {
          micSenderRef.current = sender;
          originalMicTrackRef.current = track;
        }
        console.log("✅ Audio track added:", track.label, { enabled: track.enabled, muted: track.muted, readyState: track.readyState });
        const settings = track.getSettings ? track.getSettings() : {};
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "mic_track_attached",
          payload: {
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            deviceId: (settings as MediaTrackSettings).deviceId,
            sampleRate: (settings as MediaTrackSettings).sampleRate,
          },
        });
        track.onmute = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_track_state_change", payload: { state: "muted" } });
        };
        track.onunmute = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_track_state_change", payload: { state: "unmuted" } });
        };
        track.onended = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "mic_track_state_change", payload: { state: "ended" } });
        };
      });

      // Handle incoming audio from AI
      pc.ontrack = (event) => {
        console.log("🔊 Track recebido:", event.track.kind, "readyState =", event.track.readyState);
        const streamTracks = event.streams[0]?.getTracks?.() || [];
        console.log("📊 Stream:", streamTracks.map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })));

        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "ai_audio_track_received",
          payload: {
            kind: event.track.kind,
            readyState: event.track.readyState,
            hasStream: !!event.streams[0],
            streamTracks: streamTracks.length,
          },
        });

        const audioEl = audioElementRef.current;
        if (!audioEl) {
          console.error("❌ Elemento de áudio não encontrado!");
          return;
        }

        // Fallback: se o stream remoto vier vazio, monta um MediaStream com o track recebido.
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        audioEl.srcObject = remoteStream;
        audioEl.muted = false;
        audioEl.volume = 1.0;

        // Kick off combined recording (mic + AI) — needed so audio_url is populated.
        if (mediaStreamRef.current && !recorderStartedRef.current) {
          setupAudioRecording(mediaStreamRef.current, audioEl);
        }

        // Defensivo p/ Bluetooth (AirPods etc.): força o sink para o default
        // de saída. Em alguns casos o Chrome roteia para um sink suspenso quando
        // o mesmo dispositivo está sendo usado como input (getUserMedia).
        const anyEl = audioEl as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
        if (typeof anyEl.setSinkId === "function") {
          anyEl.setSinkId("default")
            .then(() => {
              logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "set_sink_id_ok", payload: { sinkId: "default" } });
            })
            .catch((err) => {
              logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "set_sink_id_failed", payload: { error: String(err?.message || err) } });
            });
        }

        const snapshotEl = () => ({
          paused: audioEl.paused,
          muted: audioEl.muted,
          volume: audioEl.volume,
          readyState: audioEl.readyState,
          hasSrcObject: !!audioEl.srcObject,
          trackEnabled: event.track.enabled,
          trackMuted: event.track.muted,
          trackReadyState: event.track.readyState,
        });

        // Play with retry logic — mostra fallback já na 1ª falha (não na 3ª)
        // para o candidato não ficar olhando perguntas pularem sem ouvir nada.
        const attemptPlay = (attempt = 1, reason: string = "ontrack") => {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "ai_audio_play_attempt",
            payload: { attempt, reason, ...snapshotEl() },
          });
          audioEl.play()
            .then(() => {
              console.log("✅ Reprodução de áudio iniciada na tentativa", attempt, "reason=", reason);
              setNeedsAudioUnlock(false);
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "cultural",
                eventType: "ai_audio_play_started",
                payload: { attempt, reason, ...snapshotEl() },
              });
            })
            .catch(err => {
              console.warn(`⚠️ Play falhou (tentativa ${attempt}, reason=${reason}):`, err?.message);
              // Mostrar o botão fallback IMEDIATAMENTE para o candidato poder agir.
              // O retry interno continua em paralelo; se um play() der certo,
              // setNeedsAudioUnlock(false) acima esconde o botão automaticamente.
              setNeedsAudioUnlock(true);
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "cultural",
                eventType: "ai_audio_play_failed",
                payload: {
                  attempt,
                  reason,
                  error: String(err?.message || err),
                  name: String(err?.name || ""),
                  ...snapshotEl(),
                },
              });
              if (attempt < 3) {
                setTimeout(() => attemptPlay(attempt + 1, reason), 500);
              }
            });
        };

        // Track WebRTC remota costuma chegar muted:true até o 1º pacote RTP.
        // Reagir ao onunmute garante novo attempt quando o áudio realmente flui
        // (cobre AirPods/Bluetooth acordando tarde).
        event.track.onunmute = () => {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "ai_audio_track_unmuted",
            payload: snapshotEl(),
          });
          attemptPlay(1, "track_unmute");
        };
        event.track.onmute = () => {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "ai_audio_track_muted",
            payload: snapshotEl(),
          });
        };

        attemptPlay(1, "ontrack");
      };



      // ICE connection monitoring
      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "ice_failed", payload: { state: pc.iceConnectionState } });
        }
        if (pc.iceConnectionState === "disconnected") {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "webrtc_reconnect", payload: { state: pc.iceConnectionState } });
        }
      };

      pc.onicecandidateerror = (event: any) => {
        console.error("❌ ICE candidate error:", event.errorCode, event.errorText);
      };

      pc.onicegatheringstatechange = () => {
        console.log("🧊 ICE gathering state:", pc.iceGatheringState);
      };

      // Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log("✅ Data channel open - sending response.create");
        // VAD/turn_detection já vem configurado no token (start-culture-session)
        // com interrupt_response=false. NÃO enviar session.update com
        // turn_detection — a Realtime API rejeita esse caminho.



        const firstName = (candidateName || "").trim().split(/\s+/)[0];
        const useExperiment = aiInitiatesConversation && !!firstName;
        if (useExperiment) {
          const openingInstructions =
            `Cumprimente ${firstName} pelo nome de forma calorosa e breve, ` +
            `diga que você vai conduzir a entrevista cultural para a vaga de ` +
            `${jobTitle} na ${companyName}, e em seguida leia em voz alta as ` +
            `instruções de início: (1) pode pensar com calma antes de responder; ` +
            `(2) se você interromper sem querer, peça desculpa e devolva o turno; ` +
            `(3) sinais de fim de resposta como "é isso" ou "pode ir"; ` +
            `(4) a entrevista só termina quando você disser que terminou; ` +
            `(5) o candidato precisa estar em um lugar silencioso. ` +
            `Ao terminar, pergunte "Tudo certo pra começar?" e aguarde a resposta.`;
          safeSendResponseCreate({
            type: "response.create",
            response: {
              output_modalities: ["audio"],
              instructions: openingInstructions,
            },
          });
        } else {
          safeSendResponseCreate({ type: "response.create", response: { output_modalities: ["audio"] } });
        }
        setConnectionStatus("Conectado!");
        setIsConnected(true);
        // P0: marca o início da abertura da IA para o timeout absoluto de 30s.
        if (!aiOpeningAtRef.current) {
          aiOpeningAtRef.current = Date.now();
        }
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "session_connected" });
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "ai_initiated_opening",
          payload: { enabled: useExperiment, hasCandidateName: !!firstName },
        });
      };

      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch (e) {
          console.error("Error parsing realtime event:", e);
        }
      };

      dc.onerror = (error) => {
        console.error("❌ Data channel error:", error);
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "data_channel_error", payload: { error: String(error) } });
      };

      dc.onclose = () => {
        console.log("📴 Data channel closed");
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnectionStatus("Conectado!");
          setIsConnected(true);
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.error("❌ Connection failed/disconnected");
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "abnormal_disconnect", payload: { state: pc.connectionState } });
          onError("Conexão perdida. Por favor, recarregue a página.");
        }
      };

      // Create offer
      console.log("📤 Creating SDP offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
          setTimeout(resolve, 5000);
        }
      });
      console.log("✅ ICE gathering complete");

      setConnectionStatus("Conectando com a IA...");

      // Send SDP to OpenAI
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime-mini", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
        body: pc.localDescription?.sdp,
      });

      if (!sdpResponse.ok) {
        console.error("❌ OpenAI SDP error:", sdpResponse.status);
        onError("Erro ao conectar com a IA. Tente novamente.");
        return;
      }

      const answerSdp = await sdpResponse.text();
      console.log("✅ Received SDP answer from OpenAI, length:", answerSdp.length);
      console.log("📝 SDP answer preview:", answerSdp.substring(0, 300));

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
      console.log("✅ Remote description set");

      // Auditoria: confirma se a OpenAI realmente anexou faixa de áudio inbound.
      try {
        const receivers = pc.getReceivers().map(r => ({
          kind: r.track?.kind,
          readyState: r.track?.readyState,
          muted: (r.track as MediaStreamTrack | null)?.muted,
        }));
        console.log("🔍 RTCPeerConnection receivers:", receivers);
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "webrtc_receivers_state",
          payload: { receivers, sdpAnswerHasAudio: /m=audio /.test(answerSdp) },
        });
      } catch (e) {
        console.warn("⚠️ Falha ao auditar receivers:", e);
      }

      startTimeRef.current = Date.now();
      console.log("🎙️ Culture interview started!");

    } catch (error) {
      console.error("❌ Unexpected error:", error);
      onError("Erro ao iniciar a entrevista. Por favor, recarregue a página.");
    }
  };

  const getElapsedSeconds = useCallback(() => {
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  const handleRealtimeEvent = (event: any) => {
    if (event.type !== "response.audio.delta" && !event.type?.includes("delta")) {
      console.log("📨 Realtime event:", event.type);
    }

    // Anomaly signals
    if (event.type === "response.cancelled" || event.type === "output_audio_buffer.cleared") {
      logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "ai_interrupted", payload: { eventType: event.type } });
    }

    switch (event.type) {
      case "response.created":
        activeResponseIdRef.current = event.response?.id || "active";
        setIsAISpeaking(true);
        if (currentAIStartRef.current === null) {
          currentAIStartRef.current = getElapsedSeconds();
          currentAITextRef.current = "";
        }
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "ai_response_started",
          payload: { responseId: event.response?.id, introLocked: introLockedRef.current },
        });
        break;

      case "response.audio_transcript.delta":
        if (event.delta) {
          currentAITextRef.current += event.delta;
        }
        break;

      case "response.audio.started":
      case "response.audio_transcript.started":
      case "output_audio_buffer.started":
        // output_audio_buffer.started é o sinal AUTORITATIVO: dispara quando o
        // áudio começa a tocar de fato via WebRTC (não quando o modelo terminou
        // de gerar). Mantém os outros eventos como fallback.
        setIsAISpeaking(true);
        if (currentAIStartRef.current === null) {
          currentAIStartRef.current = getElapsedSeconds();
        }
        break;

      case "output_audio_buffer.stopped":
        // Sinal AUTORITATIVO de fim de fala da IA — só dispara quando o áudio
        // realmente parou de tocar. Evita o badge "Sua vez" enquanto a IA
        // ainda está terminando de falar.
        setIsAISpeaking(false);
        break;

      case "response.audio.done":
      case "response.audio_transcript.done": {
        // NÃO flipa mais isAISpeaking aqui — esses eventos disparam quando o
        // MODELO terminou de gerar, mas o áudio ainda toca por 1-3s via WebRTC.
        // O flip real é em output_audio_buffer.stopped acima.
        const aiText = event.transcript || currentAITextRef.current;
        if (aiText && aiText.trim()) {
          console.log("🤖 AI said:", aiText.substring(0, 100) + (aiText.length > 100 ? '...' : ''));
          lastAIQuestionRef.current = aiText.trim();
          setTranscript(prev => prev + `\nEntrevistadora: ${aiText}`);

          transcriptEntriesRef.current.push({
            type: 'ai',
            text: aiText.trim(),
            startSeconds: currentAIStartRef.current || getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          });
          console.log(`📊 Transcript entries count: ${transcriptEntriesRef.current.length}`);
          lastEventTimeRef.current = Date.now();

          // Detecta pergunta de confirmação da abertura — arma a flag para
          // liberar o intro apenas após resposta verbal afirmativa do candidato.
          if (introLockedRef.current) {
            const low = aiText.toLowerCase();
            if (
              low.includes("tudo certo pra começar") ||
              low.includes("tudo certo para começar") ||
              low.includes("pronto para começar") ||
              low.includes("pronto pra começar") ||
              low.includes("podemos começar")
            ) {
              awaitingConfirmationRef.current = true;
              setAwaitingConfirmation(true);
              console.log("🔒 Intro: aguardando confirmação verbal do candidato.");
            }
          }

          
          // Check for completion
          const lowerTranscript = aiText.toLowerCase();
          const completionPhrases = [
            "pode clicar em encerrar",
            "muito obrigado pela conversa",
            "muito obrigada pela conversa",
            "muito obrigada pelas suas respostas",
            "desejo boa sorte",
            "boa sorte no processo",
            "finalizamos nossa conversa",
            "encerrar a entrevista",
            "foi um prazer conhecê-lo",
            "foi um prazer conhecê-la",
            "agradeço pela conversa",
          ];
          
          const isComplete = completionPhrases.some(phrase => lowerTranscript.includes(phrase));
          if (isComplete) {
            console.log("🏁 Interview completion detected!");
            setInterviewCompletionDetected(true);
          }
        }
        currentAIStartRef.current = null;
        currentAITextRef.current = "";
        break;
      }

      // Backup: capture complete output items
      case "response.output_item.done":
        if (event.item?.content && Array.isArray(event.item.content)) {
          for (const content of event.item.content) {
            const text = content.transcript || content.text;
            if (text && text.trim()) {
              const recentEntries = transcriptEntriesRef.current.slice(-3);
              const isDuplicate = recentEntries.some(e => e.type === 'ai' && e.text === text.trim());
              if (!isDuplicate) {
                console.log("🤖 [output_item.done] AI said:", text.substring(0, 100));
                transcriptEntriesRef.current.push({
                  type: 'ai',
                  text: text.trim(),
                  startSeconds: currentAIStartRef.current || getElapsedSeconds(),
                  endSeconds: getElapsedSeconds(),
                });
              }
            }
          }
        }
        break;

      // Backup: capture content parts
      case "response.content_part.done":
        if (event.part?.transcript || event.part?.text) {
          const text = event.part.transcript || event.part.text;
          if (text && text.trim()) {
            const recentEntries = transcriptEntriesRef.current.slice(-3);
            const isDuplicate = recentEntries.some(e => e.type === 'ai' && e.text === text.trim());
            if (!isDuplicate) {
              console.log("🤖 [content_part.done] AI said:", text.substring(0, 100));
              transcriptEntriesRef.current.push({
                type: 'ai',
                text: text.trim(),
                startSeconds: currentAIStartRef.current || getElapsedSeconds(),
                endSeconds: getElapsedSeconds(),
              });
            }
          }
        }
        break;

      case "response.done":
      case "response.cancelled": {
        activeResponseIdRef.current = null;
        setIsAISpeaking(false);
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "ai_response_done",
          payload: {
            type: event.type,
            status: (event as any)?.response?.status,
            statusDetails: (event as any)?.response?.status_details,
          },
        });
        // Captura tokens REAIS de áudio retornados pela OpenAI Realtime API.
        const usage = (event as any)?.response?.usage;
        if (usage) {
          tokenUsageRef.current.audioInputTokens  += usage.input_token_details?.audio_tokens ?? 0;
          tokenUsageRef.current.audioOutputTokens += usage.output_token_details?.audio_tokens ?? 0;
          tokenUsageRef.current.textInputTokens   += usage.input_token_details?.text_tokens ?? 0;
          tokenUsageRef.current.textOutputTokens  += usage.output_token_details?.text_tokens ?? 0;
        }
        // P0: AUTO-ARMAR awaitingConfirmation. Independente do que a IA disse,
        // se ela terminou de falar e ainda estamos em introLocked, qualquer fala
        // do candidato logo a seguir deve destravar. Isso elimina a dependência
        // de string-matching ("Tudo certo pra começar?" etc) que falhou no
        // teste real (32 transcrições descartadas em silêncio).
        if (introLockedRef.current && !awaitingConfirmationRef.current) {
          setTimeout(() => {
            if (introLockedRef.current && !awaitingConfirmationRef.current) {
              awaitingConfirmationRef.current = true;
              setAwaitingConfirmation(true);
              console.log("🔓 Intro auto-armed após response.done (aguardando candidato)");
            }
          }, AI_COOLDOWN_MS + 200);
        }
        break;
      }

      case "error":
        if (isBenignRealtimeError(event.error)) {
          console.warn("⚠️ Suppressed benign Realtime error:", event.error);
          activeResponseIdRef.current = null;
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "realtime_error_suppressed",
            payload: { code: event.error?.code, message: event.error?.message },
          });
        } else {
          console.error("❌ Realtime error:", event.error);
          toast.error("Erro na conexão: " + (event.error?.message || "Erro desconhecido"));
        }
        break;

      case "input_audio_buffer.speech_started":
        // Durante o intro_locked não tratamos como turno do candidato — é ruído/falso positivo.
        if (introLockedRef.current && !awaitingConfirmationRef.current) {
          console.log("🔇 [intro_locked] speech_started ignorado");
          break;
        }
        // Cooldown: ignora speech_started disparado pelo tail/eco da própria IA.
        if (isInAICooldown()) {
          console.log("🔇 [ai_cooldown] speech_started ignorado");
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "vad_speech_during_ai", payload: { reason: "cooldown" } });
          break;
        }
        if (isAISpeaking) {
          logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "vad_speech_during_ai", payload: { reason: "ai_still_speaking" } });
        }
        setIsUserSpeaking(true);
        currentUserStartRef.current = getElapsedSeconds();
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "speech_started", payload: { at: currentUserStartRef.current } });
        break;

      case "input_audio_buffer.speech_stopped":
        if (introLockedRef.current && !awaitingConfirmationRef.current) {
          console.log("🔇 [intro_locked] speech_stopped ignorado");
          break;
        }
        setIsUserSpeaking(false);
        logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "speech_stopped", payload: { at: getElapsedSeconds() } });
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript && event.transcript.trim()) {
          const userText = event.transcript.trim();
          console.log("👤 User said:", userText.substring(0, 100));

          // P0: registra que o pipeline de transcrição ESTÁ vivo (antes de qualquer filtro).
          if (!firstTranscriptionAtRef.current) {
            firstTranscriptionAtRef.current = Date.now();
          }
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "cultural",
            eventType: "transcription_received",
            payload: { length: userText.length, atSec: getElapsedSeconds() },
          });

          // Cooldown pós-IA: descarta transcrições que chegam logo após a IA
          // terminar de falar (provavelmente eco/tail mal interpretado).
          if (isInAICooldown()) {
            console.log("🗑️ [cooldown] transcrição descartada:", userText.substring(0, 60));
            logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "transcript_dropped_cooldown", payload: { text: userText.slice(0, 120), cooldownRemainingMs: aiCooldownUntilRef.current - Date.now() } });
            break;
          }

          // Filtro de ruído/idioma (heurística compartilhada com o modal logado).
          const dropReason = classifyTranscript(userText, { awaitingConfirmation: awaitingConfirmationRef.current });
          if (dropReason === "language") {
            console.log("🗑️ [language] transcrição descartada:", userText.substring(0, 60));
            logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "transcript_dropped_language", payload: { text: userText.slice(0, 120) } });
            break;
          }
          if (dropReason === "noise") {
            console.log("🗑️ [noise] transcrição descartada:", userText.substring(0, 60));
            logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "transcript_dropped_noise", payload: { text: userText.slice(0, 120), wordCount: userText.split(/\s+/).length } });
            break;
          }

          // Intro locked: só aceitamos resposta se estamos aguardando confirmação verbal.
          if (introLockedRef.current) {
            // P0: SEMPRE anexa ao partial_transcript local (heartbeat manda
            // para o DB a cada 30s). Rede de segurança: se o gate falhar, o
            // Whisper-recovery e o avaliador ainda têm material bruto.
            setTranscript(prev => prev + `\nCandidato: ${userText}`);

            if (!awaitingConfirmationRef.current) {
              console.log("🔇 [intro_locked] transcrição descartada (não há pergunta de confirmação ativa)");
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "cultural",
                eventType: "transcript_dropped_intro_locked",
                payload: {
                  text: userText.slice(0, 120),
                  awaitingConfirmation: false,
                  elapsedSinceAIOpeningMs: aiOpeningAtRef.current ? Date.now() - aiOpeningAtRef.current : null,
                },
              });
              // P0: AUTO-UNLOCK por comportamento. Se chegou transcrição do
              // candidato e ainda estamos em introLocked, destrava sozinho —
              // é sinal forte que a IA já fez a abertura, mesmo que response.done
              // tenha falhado ou nenhuma frase-chave tenha sido detectada.
              const elapsed = aiOpeningAtRef.current ? Date.now() - aiOpeningAtRef.current : 0;
              if (elapsed > 3000 && userText.length >= 5) {
                introLockedRef.current = false;
                setIntroLocked(false);
                console.log("🔓 Intro auto-unlocked por transcrição do candidato:", userText.substring(0, 60));
                logVoiceInterviewEvent({
                  sessionId,
                  sessionType: "cultural",
                  eventType: "intro_unlocked",
                  payload: { reason: "candidate_spoke_after_ai", elapsedMs: elapsed },
                });
                setTimeout(() => {
                  safeSendResponseCreate({ type: "response.create", response: { output_modalities: ["audio"] } });
                }, 300);
              }
              break;
            }
            const low = userText.toLowerCase();
            const negative = /\b(não|nao|espera|pera|ainda não|ainda nao|um momento|aguarda)\b/.test(low);
            if (!negative) {
              // Aceita qualquer resposta não-negativa como confirmação para destravar.
              introLockedRef.current = false;
              awaitingConfirmationRef.current = false;
              setIntroLocked(false);
              setAwaitingConfirmation(false);
              console.log("🔓 Intro liberado por resposta verbal do candidato:", userText.substring(0, 60));
              logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "intro_unlocked", payload: { reason: "verbal_confirmation" } });
              // Força a IA a avançar para a primeira pergunta real.
              setTimeout(() => {
                safeSendResponseCreate({ type: "response.create", response: { output_modalities: ["audio"] } });
              }, 300);
            } else {
              console.log("🔇 [intro_locked] resposta negativa — aguardando candidato confirmar.");
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "cultural",
                eventType: "transcript_dropped_intro_locked",
                payload: { text: userText.slice(0, 120), awaitingConfirmation: true, reason: "negative" },
              });
            }
            // Em qualquer caso, NÃO salvamos esta resposta como pergunta de avaliação.
            break;
          }

          setTranscript(prev => prev + `\nCandidato: ${event.transcript}`);

          transcriptEntriesRef.current.push({
            type: 'candidate',
            text: userText,
            startSeconds: currentUserStartRef.current || getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          });
          console.log(`📊 Transcript entries count: ${transcriptEntriesRef.current.length}`);
          lastEventTimeRef.current = Date.now();
          currentUserStartRef.current = null;

          // Save response to database with incremental counter
          const questionIndex = questionIndexCounterRef.current;
          questionIndexCounterRef.current += 1;
          saveResponseToDatabase(event.transcript, questionIndex);
        }
        break;

      // Backup: capture user conversation items.
      // P0: também usa como SEGUNDA VIA de save-response — se o pipeline de
      // transcrição.completed silenciar (caso Marina), pelo menos as respostas
      // capturadas via item.created vão ser persistidas no banco.
      case "conversation.item.created":
        if (event.item?.role === 'user' && event.item?.content) {
          for (const content of event.item.content) {
            const text = content.transcript || content.text;
            if (text && text.trim()) {
              const cleanText = text.trim();
              const recentEntries = transcriptEntriesRef.current.slice(-3);
              const isDuplicate = recentEntries.some(e => e.type === 'candidate' && e.text === cleanText);
              if (!isDuplicate) {
                console.log("👤 [item.created] User said:", cleanText.substring(0, 100));
                transcriptEntriesRef.current.push({
                  type: 'candidate',
                  text: cleanText,
                  startSeconds: currentUserStartRef.current || getElapsedSeconds(),
                  endSeconds: getElapsedSeconds(),
                });

                // Fallback save: se já se passaram >30s sem nenhuma transcrição
                // .completed E não estamos em intro, persiste daqui como rede de segurança.
                const noLiveTranscription =
                  !firstTranscriptionAtRef.current ||
                  Date.now() - firstTranscriptionAtRef.current > 30000;
                if (
                  !introLockedRef.current &&
                  noLiveTranscription &&
                  cleanText.split(/\s+/).length > 2
                ) {
                  const qi = questionIndexCounterRef.current;
                  questionIndexCounterRef.current += 1;
                  logVoiceInterviewEvent({
                    sessionId,
                    sessionType: "cultural",
                    eventType: "fallback_save_from_item_created",
                    payload: { questionIndex: qi, length: cleanText.length },
                  });
                  saveResponseToDatabase(cleanText, qi);
                }
              }
            }
          }
        }
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Bug #1 fix: guard contra dupla finalização (auto + clique manual).
  const finalizingRef = useRef(false);

  const finalizeAndComplete = async () => {
    if (finalizingRef.current) {
      console.log("⚠️ finalizeAndComplete já em execução, ignorando chamada duplicada.");
      return;
    }
    finalizingRef.current = true;
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "session_completed_client", payload: { durationSeconds, completionDetected: interviewCompletionDetected } });

    // 1. Flush recorder BEFORE cleanup (cleanup closes AudioContext).
    const audioBlob = await stopRecorderAndFlush();
    console.log(`🎙️ Final cultural audio blob: ${audioBlob ? `${audioBlob.size} bytes` : "null"}`);

    // 2. Teardown WebRTC/AudioContext.
    cleanupConnection();

    // 3. Fire-and-forget upload — don't block onComplete.
    if (audioBlob && audioBlob.size > 0) {
      uploadAudioBlob(sessionId, audioBlob).catch((e) => console.error("❌ Upload promise rejected:", e));
    } else {
      logVoiceInterviewEvent({ sessionId, sessionType: "cultural", eventType: "audio_upload_failed", payload: { reason: "empty_blob", blobSize: 0 } });
    }

    onComplete(transcriptRef.current, durationSeconds, transcriptEntriesRef.current, interviewCompletionDetected, { ...tokenUsageRef.current });
  };

  const handleEndInterview = () => {
    const cov = coverageRef.current;
    const incomplete = cov && cov.total > 0 && cov.covered < cov.total;
    if (incomplete) {
      setConfirmEndOpen(true);
      return;
    }
    finalizeAndComplete();
  };

  // Bug #1 fix: auto-finalização quando a IA encerra a entrevista (frase de despedida
  // detectada) E a cobertura está 100% E a IA terminou de falar. Antes esperava o
  // candidato clicar manualmente em "Encerrar"; quem fechava a aba ficava preso até o
  // watchdog (5+ min). Damos 4s após o último áudio da IA para o último response salvar.
  const autoFinalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoFinalizing, setAutoFinalizing] = useState(false);
  useEffect(() => {
    const canEnd = coverage?.canEnd === true;
    if (!interviewCompletionDetected || !canEnd || isAISpeaking || finalizingRef.current) {
      if (autoFinalizeTimerRef.current) {
        clearTimeout(autoFinalizeTimerRef.current);
        autoFinalizeTimerRef.current = null;
        setAutoFinalizing(false);
      }
      return;
    }
    if (autoFinalizeTimerRef.current) return;
    setAutoFinalizing(true);
    logVoiceInterviewEvent({
      sessionId,
      sessionType: "cultural",
      eventType: "auto_finalize_scheduled",
      payload: { delayMs: 4000, covered: coverage?.covered, total: coverage?.total },
    });
    autoFinalizeTimerRef.current = setTimeout(() => {
      autoFinalizeTimerRef.current = null;
      if (finalizingRef.current) return;
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: "auto_finalize_triggered",
        payload: {},
      });
      void finalizeAndComplete();
    }, 4000);
    return () => {
      if (autoFinalizeTimerRef.current) {
        clearTimeout(autoFinalizeTimerRef.current);
        autoFinalizeTimerRef.current = null;
      }
    };
  }, [interviewCompletionDetected, coverage?.canEnd, coverage?.covered, coverage?.total, isAISpeaking, sessionId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Audio element is created dynamically in initializeConnection */}
      
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{companyName}</p>
                <p className="text-xs text-muted-foreground">{jobTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Turn-state chip: deixa explícito de quem é a vez */}
              {isConnected && (
                <Badge
                  variant="secondary"
                  className={`gap-1.5 ${
                    isAISpeaking
                      ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/15"
                  }`}
                  aria-live="polite"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isAISpeaking ? "bg-destructive animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {isAISpeaking ? "IA falando" : "Sua vez"}
                </Badge>
              )}
              <Badge variant={isConnected ? "secondary" : "outline"} className="gap-1">
                {isConnected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Conectado
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {connectionStatus}
                  </>
                )}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(elapsedTime)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Elemento <audio> para o stream remoto da IA. Declarado no JSX para
          permanecer ligado ao layout do React (sem display:none, sem
          appendChild manual). Indispensável para autoplay confiável. */}
      <audio ref={audioElementRef} autoPlay playsInline className="sr-only" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Banner inicial: orienta o candidato a falar para destravar o intro */}
            <StartSpeakingAlert
              visible={isConnected && introLocked && !needsAudioUnlock}
              subtitle="A entrevistadora está aguardando sua confirmação por voz para iniciar as perguntas de cultura."
            />

            {/* Fallback de autoplay bloqueado: candidato precisa de um clique para liberar o áudio */}
            {needsAudioUnlock && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Não estamos conseguindo tocar a voz da entrevistadora automaticamente. Toque no botão abaixo para ativar.
                </p>
                <Button
                  onClick={() => {
                    const el = audioElementRef.current;
                    if (!el) return;
                    el.muted = false;
                    el.volume = 1.0;
                    logVoiceInterviewEvent({
                      sessionId,
                      sessionType: "cultural",
                      eventType: "ai_audio_unlock_clicked",
                    });
                    const anyEl = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
                    if (typeof anyEl.setSinkId === "function") {
                      anyEl.setSinkId("default").catch(() => { /* noop */ });
                    }
                    el.play()
                      .then(() => {
                        setNeedsAudioUnlock(false);
                        logVoiceInterviewEvent({
                          sessionId,
                          sessionType: "cultural",
                          eventType: "ai_audio_play_started",
                          payload: { source: "user_unlock" },
                        });
                      })
                      .catch((err) => {
                        logVoiceInterviewEvent({
                          sessionId,
                          sessionType: "cultural",
                          eventType: "ai_audio_play_failed",
                          payload: { source: "user_unlock", error: String(err?.message || err), name: String(err?.name || "") },
                        });
                      });
                  }}
                  className="gap-2"
                >
                  <Volume2 className="h-4 w-4" />
                  Tocar a voz da entrevistadora
                </Button>
              </div>
            )}



            {/* Coverage / Progress Banner */}
            {coverage && coverage.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Pergunta {Math.min(coverage.covered + 1, coverage.total)} de {coverage.total}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round((coverage.covered / coverage.total) * 100)}%
                  </span>
                </div>
                <Progress value={(coverage.covered / coverage.total) * 100} className="h-2" />
                {elapsedTime > 25 * 60 && coverage.covered / coverage.total < 0.7 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Ainda faltam {coverage.total - coverage.covered} perguntas. Continue respondendo.
                  </p>
                )}
              </div>
            )}

            {/* Visual Indicators */}
            <div className="flex items-center justify-center gap-8">
              {/* AI Indicator */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={isAISpeaking ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className={`p-4 rounded-full ${
                    isAISpeaking 
                      ? "bg-primary/20 ring-4 ring-primary/30" 
                      : "bg-muted"
                  }`}
                >
                  <Bot className={`h-8 w-8 ${isAISpeaking ? "text-primary" : "text-muted-foreground"}`} />
                </motion.div>
                <span className="text-sm text-muted-foreground">
                  {isAISpeaking ? "Falando..." : "IA"}
                </span>
              </div>

              {/* Connection Line */}
              <div className="flex-1 max-w-24 h-1 bg-muted rounded-full overflow-hidden">
                <AnimatePresence>
                  {(isAISpeaking || isUserSpeaking) && (
                    <motion.div
                      initial={{ x: isAISpeaking ? "-100%" : "100%" }}
                      animate={{ x: isAISpeaking ? "100%" : "-100%" }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="h-full w-1/2 bg-primary rounded-full"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* User Indicator */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={isUserSpeaking ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className={`p-4 rounded-full ${
                    isUserSpeaking 
                      ? "bg-green-500/20 ring-4 ring-green-500/30" 
                      : "bg-muted"
                  }`}
                >
                  {isUserSpeaking ? (
                    <Mic className="h-8 w-8 text-green-500" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </motion.div>
                <span className="text-sm text-muted-foreground">
                  {isUserSpeaking ? "Você está falando" : "Você"}
                </span>
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center">
              {isAISpeaking && (
                <p className="text-muted-foreground animate-pulse">
                  O entrevistador está falando...
                </p>
              )}
              {!isAISpeaking && !isUserSpeaking && isConnected && (
                <p className="text-muted-foreground">
                  Aguardando... Fale quando quiser responder
                </p>
              )}
            </div>

            {/* Indicador de espera durante pausas do candidato */}
            <WaitingIndicator visible={showWaitingIndicator} />

            {/* Dicas curtas: pedir para voltar à pergunta + aguardar ~3s em silêncio */}
            <InterviewLiveTips />

            {/* End Interview Button */}
            <div className="pt-4 border-t flex flex-col items-center gap-2">
              {interviewCompletionDetected && coverage?.canEnd && (
                <p className="text-sm text-green-600 dark:text-green-400 animate-pulse">
                  {autoFinalizing
                    ? "✓ Encerrando automaticamente..."
                    : "✓ O entrevistador finalizou - clique em encerrar"}
                </p>
              )}
              {coverage && coverage.total > 0 && coverage.covered < coverage.total && (
                <p className="text-xs text-muted-foreground text-center">
                  Faltam {coverage.total - coverage.covered} pergunta{coverage.total - coverage.covered === 1 ? "" : "s"} para concluir
                </p>
              )}
              <Button
                variant={
                  coverage && coverage.total > 0 && coverage.covered < coverage.total
                    ? "destructive"
                    : (interviewCompletionDetected ? "default" : "outline")
                }
                onClick={handleEndInterview}
                className="gap-2"
              >
                <PhoneOff className="h-4 w-4" />
                {coverage && coverage.total > 0 && coverage.covered < coverage.total
                  ? `Encerrar mesmo assim (faltam ${coverage.total - coverage.covered})`
                  : "Encerrar Entrevista"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar antes do fim?</AlertDialogTitle>
            <AlertDialogDescription>
              Você ainda tem {coverage ? coverage.total - coverage.covered : 0} pergunta(s) para responder.
              Encerrar agora pode reduzir significativamente seu score de fit cultural.
              Tem certeza que deseja encerrar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar entrevista</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmEndOpen(false); finalizeAndComplete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Encerrar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

