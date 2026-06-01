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
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSilenceDetector } from "@/hooks/useSilenceDetector";
import { WaitingIndicator } from "@/components/interviews/WaitingIndicator";
import { StartSpeakingAlert } from "@/components/interviews/StartSpeakingAlert";
import { InterviewLiveTips } from "@/components/interviews/InterviewLiveTips";
import { logVoiceInterviewEvent } from "@/lib/voiceInterviewTelemetry";
import { classifyTranscript } from "@/lib/interviewTranscriptFilter";
import { useTechnicalInterviewCoverage } from "@/hooks/useTechnicalInterviewCoverage";

interface TranscriptEntry {
  type: "ai" | "candidate";
  text: string;
  startSeconds: number;
  endSeconds?: number;
}

interface TechnicalInterviewActiveProps {
  sessionId: string;
  ephemeralToken: string;
  companyName: string;
  jobTitle: string;
  skills: string[];
  onComplete: (
    transcript: string,
    durationSeconds: number,
    completedNaturally?: boolean,
    transcriptEntries?: TranscriptEntry[],
    tokenUsage?: { audioInputTokens: number; audioOutputTokens: number; textInputTokens: number; textOutputTokens: number },
  ) => void;
  onError: (error: string) => void;
}

export function TechnicalInterviewActive({
  sessionId,
  ephemeralToken,
  companyName,
  jobTitle,
  skills,
  onComplete,
  onError,
}: TechnicalInterviewActiveProps) {
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<string>("Conectando...");
  const [isConnected, setIsConnected] = useState(false);
  const [interviewCompletionDetected, setInterviewCompletionDetected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  // Trava visual do intro: some assim que detectamos a primeira fala válida do candidato.
  // Apenas UI — não interfere em VAD, coverage, watchdog ou prompt.
  const [candidateHasSpoken, setCandidateHasSpoken] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  // Server-tracked coverage (skills cobertas vs total)
  const coverage = useTechnicalInterviewCoverage(sessionId, 5000);
  const coverageRef = useRef(coverage);
  useEffect(() => { coverageRef.current = coverage; }, [coverage]);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>("");
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeResponseIdRef = useRef<string | null>(null);

  // Latency diagnostics: timestamp of user's speech_stopped → measure
  // gap until AI begins responding. Mirrors the cultural conductor.
  const userSpeechStoppedAtRef = useRef<number | null>(null);
  const lastUserTranscriptLenRef = useRef<number>(0);

  // Audio recording (mic + AI mixed) — needed for QA, watchdog audio_url,
  // and any re-evaluation. Without this, audio_url stays null on public sessions.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderStartedRef = useRef<boolean>(false);

  // Cooldown após a IA terminar de falar: ignoramos speech_started / transcrições
  // que aparecem no rabicho do áudio da própria IA (eco / tail).
  const aiSpeakingRef = useRef<boolean>(false);
  const aiCooldownUntilRef = useRef<number>(0);

  // Transcript estruturado com timestamps (paridade com cultural).
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([]);
  const currentAITextRef = useRef<string>("");
  const currentAIStartRef = useRef<number | null>(null);
  const currentUserStartRef = useRef<number | null>(null);

  // Acumulador de tokens reais retornados pela OpenAI Realtime (response.done.usage).
  const tokenUsageRef = useRef({
    audioInputTokens: 0,
    audioOutputTokens: 0,
    textInputTokens: 0,
    textOutputTokens: 0,
  });

  const getElapsedSeconds = useCallback(
    () => Math.floor((Date.now() - startTimeRef.current) / 1000),
    [],
  );

  const pushTranscriptEntry = (entry: TranscriptEntry) => {
    // Dedup contra últimos 3 (mesmo padrão da cultural).
    const recent = transcriptEntriesRef.current.slice(-3);
    const dup = recent.some((e) => e.type === entry.type && e.text === entry.text);
    if (!dup) transcriptEntriesRef.current.push(entry);
  };

  const safeSendResponseCreate = (payload: Record<string, unknown> = { type: "response.create", response: { output_modalities: ["audio"] } }) => {
    try {
      dataChannelRef.current?.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn("Failed to send response.create:", e);
      return false;
    }
  };

  const isBenignRealtimeError = (err: any) => {
    const code = err?.code || err?.type || "";
    const msg = (err?.message || "").toLowerCase();
    return (
      code === "conversation_already_has_active_response" ||
      code === "response_cancel_not_active" ||
      msg.includes("active response in progress") ||
      msg.includes("no active response found")
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

  // Quando a IA termina de falar, limpamos o buffer de input do Realtime.
  // Sem isso, o áudio que entrou no mic ENQUANTO a IA falava (eco/voz dela)
  // fica preso no buffer, a VAD nunca fecha o turno e a IA fica muda. Mesmo
  // fix aplicado em CultureInterviewActive.
  useEffect(() => {
    if (!isAISpeaking && dataChannelRef.current?.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
      } catch {
        // não-crítico
      }
    }
  }, [isAISpeaking]);

  // Heartbeat — mantém last_activity_at atualizado para o watchdog não
  // marcar a sessão como abandonada durante a entrevista.
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-interview-heartbeat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            sessionId,
            partialTranscript: transcriptRef.current,
          }),
        },
      );
    } catch (error) {
      console.error("⚠️ Heartbeat error:", error);
    }
  }, [sessionId]);

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

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection();

    // Heartbeat a cada 30s (mesmo intervalo da entrevista cultural)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
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

  // Page Visibility — heartbeat imediato ao voltar para a aba,
  // evita falso abandono no watchdog.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sendHeartbeat]);

  const setupAudioRecording = useCallback((micStream: MediaStream, aiAudioElement: HTMLAudioElement) => {
    if (recorderStartedRef.current) return;
    try {
      console.log("🎙️ Setting up combined audio recording (technical public)...");
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
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "audio_upload_failed", payload: { reason: "recorder_error" } });
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recorderStartedRef.current = true;
      console.log("✅ Audio recording started");
    } catch (error) {
      console.error("❌ Error setting up audio recording:", error);
      logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "audio_upload_failed", payload: { reason: "recorder_setup_error", errorMessage: error instanceof Error ? error.message : String(error) } });
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
    console.log(`📤 Uploading technical audio (${audioBlob.size} bytes)...`);
    logVoiceInterviewEvent({ sessionId: sid, sessionType: "technical", eventType: "audio_upload_started", payload: { size: audioBlob.size, mimeType: audioBlob.type } });
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "interview.webm");
      formData.append("sessionId", sid);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-interview-upload-audio`,
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
        logVoiceInterviewEvent({ sessionId: sid, sessionType: "technical", eventType: "audio_upload_failed", payload: { status: response.status, errorMessage: errText.slice(0, 500), blobSize: audioBlob.size } });
      } else {
        const result = await response.json().catch(() => ({}));
        console.log("✅ Audio uploaded:", result);
        logVoiceInterviewEvent({ sessionId: sid, sessionType: "technical", eventType: "audio_upload_succeeded", payload: { size: audioBlob.size, durationMs: Date.now() - t0 } });
      }
    } catch (error) {
      console.error("❌ Error uploading audio:", error);
      logVoiceInterviewEvent({ sessionId: sid, sessionType: "technical", eventType: "audio_upload_failed", payload: { errorMessage: error instanceof Error ? error.message : "unknown", blobSize: audioBlob.size } });
    }
  }, []);

  const cleanupConnection = useCallback(() => {
    console.log("🧹 Cleaning up connection...");
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
    if (audioElementRef.current) {
      try { audioElementRef.current.pause(); } catch { /* noop */ }
      try { audioElementRef.current.srcObject = null; } catch { /* noop */ }
      console.log("🧹 Elemento de áudio resetado (mantido no DOM)");
    }
  }, []);

  const initializeConnection = async () => {
    try {
      setConnectionStatus("Solicitando permissão do microfone...");

      // O elemento <audio> agora é declarado no JSX. Aqui só validamos o ref
      // e setamos atributos. NÃO chamamos play() sem srcObject — em alguns
      // paths do Chrome/macOS com Bluetooth, isso bloqueia o próximo play().
      const audioElement = audioElementRef.current;
      if (audioElement) {
        audioElement.autoplay = true;
        audioElement.setAttribute("playsinline", "true");
        audioElement.muted = false;
        audioElement.volume = 1.0;
        audioElement.addEventListener("error", () => {
          console.error("❌ Erro no elemento de áudio:", audioElement.error);
        });
        console.log("🎧 Elemento de áudio pronto (JSX)");
      } else {
        console.warn("⚠️ audioElementRef ainda não montado — JSX deve incluir <audio ref={audioElementRef} autoPlay playsInline className='sr-only' />");
      }



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
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "mic_permission_denied", payload: { error: String(micError) } });
        onError("Permissão do microfone negada. Por favor, permita o acesso ao microfone.");
        return;
      }

      mediaStreamRef.current = stream;
      setLocalStream(stream);
      console.log("✅ Microphone permission granted");
      logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "mic_permission_granted" });

      setConnectionStatus("Estabelecendo conexão de áudio...");

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // CRITICAL: força m-line de áudio recvonly no offer ANTES de addTrack
      // para garantir que a OpenAI sempre anexe a faixa TTS de saída e
      // `pc.ontrack` dispare. Sem isso, em algumas negociações o candidato
      // não escuta o entrevistador.
      try {
        pc.addTransceiver("audio", { direction: "recvonly" });
      } catch (e) {
        console.warn("⚠️ addTransceiver(recvonly) falhou:", e);
      }

      // Pre-check mic track (paridade com cultural — retry uma vez se inválido)
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled || audioTracks[0].readyState !== "live") {
        console.warn("⚠️ Mic track inválido, refazendo getUserMedia...");
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "technical",
          eventType: "mic_track_invalid_precheck",
          payload: {
            tracks: audioTracks.length,
            firstEnabled: audioTracks[0]?.enabled,
            firstMuted: audioTracks[0]?.muted,
            firstReadyState: audioTracks[0]?.readyState,
          },
        });
        try {
          stream.getTracks().forEach((t) => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          mediaStreamRef.current = stream;
          setLocalStream(stream);
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "mic_recovered", payload: { afterRetry: true } });
        } catch (retryErr) {
          console.error("❌ Mic retry falhou:", retryErr);
        }
      }

      // Add audio track from microphone (com telemetria detalhada)
      stream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, stream);
        console.log("✅ Audio track added:", track.label, { enabled: track.enabled, muted: track.muted, readyState: track.readyState });
        const settings = track.getSettings ? track.getSettings() : {};
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "technical",
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
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "mic_track_state_change", payload: { state: "muted" } });
        };
        track.onunmute = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "mic_track_state_change", payload: { state: "unmuted" } });
        };
        track.onended = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "mic_track_state_change", payload: { state: "ended" } });
        };
      });

      // Handle incoming audio from AI — telemetria + retry + onunmute + setSinkId
      pc.ontrack = (event) => {
        console.log("🔊 Track recebido:", event.track.kind, "readyState =", event.track.readyState);
        const streamTracks = event.streams[0]?.getTracks?.() || [];
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "technical",
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
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        audioEl.srcObject = remoteStream;
        audioEl.muted = false;
        audioEl.volume = 1.0;

        // Kick off combined recording (mic + AI) — needed so audio_url is populated.
        if (mediaStreamRef.current && !recorderStartedRef.current) {
          setupAudioRecording(mediaStreamRef.current, audioEl);
        }

        // Defensivo Bluetooth (AirPods): força sink default.
        const anyEl = audioEl as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
        if (typeof anyEl.setSinkId === "function") {
          anyEl.setSinkId("default")
            .then(() => logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "set_sink_id_ok", payload: { sinkId: "default" } }))
            .catch((err) => logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "set_sink_id_failed", payload: { error: String(err?.message || err) } }));
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

        const attemptPlay = (attempt = 1, reason: string = "ontrack") => {
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "technical",
            eventType: "ai_audio_play_attempt",
            payload: { attempt, reason, ...snapshotEl() },
          });
          audioEl.play()
            .then(() => {
              console.log("✅ Reprodução de áudio iniciada na tentativa", attempt, "reason=", reason);
              setNeedsAudioUnlock(false);
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "technical",
                eventType: "ai_audio_play_started",
                payload: { attempt, reason, ...snapshotEl() },
              });
            })
            .catch((err) => {
              console.warn(`⚠️ Play falhou (tentativa ${attempt}, reason=${reason}):`, err.message);
              setNeedsAudioUnlock(true);
              logVoiceInterviewEvent({
                sessionId,
                sessionType: "technical",
                eventType: "ai_audio_play_failed",
                payload: { attempt, reason, error: String(err?.message || err), name: String(err?.name || ""), ...snapshotEl() },
              });
              if (attempt < 3) setTimeout(() => attemptPlay(attempt + 1, reason), 500);
            });
        };

        event.track.onunmute = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "ai_audio_track_unmuted", payload: snapshotEl() });
          attemptPlay(1, "track_unmute");
        };
        event.track.onmute = () => {
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "ai_audio_track_muted", payload: snapshotEl() });
        };

        attemptPlay(1, "ontrack");
      };


      // Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log("✅ Data channel open - sending response.create");
        safeSendResponseCreate({ type: "response.create", response: { output_modalities: ["audio"] } });
        setConnectionStatus("Conectado!");
        setIsConnected(true);
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "session_connected" });
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
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "data_channel_error", payload: { error: String(error) } });
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
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "abnormal_disconnect", payload: { state: pc.connectionState } });
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
      console.log("✅ Received SDP answer from OpenAI");

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
      console.log("✅ Remote description set");

      startTimeRef.current = Date.now();
      console.log("🎙️ Technical interview started!");

    } catch (error) {
      console.error("❌ Unexpected error:", error);
      onError("Erro ao iniciar a entrevista. Por favor, recarregue a página.");
    }
  };

  const handleRealtimeEvent = (event: any) => {
    if (event.type !== "response.audio.delta") {
      console.log("📨 Realtime event:", event.type);
    }

    if (event.type === "response.cancelled" || event.type === "output_audio_buffer.cleared") {
      logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "ai_interrupted", payload: { eventType: event.type } });
    }

    switch (event.type) {
      case "response.created":
        activeResponseIdRef.current = event.response?.id || "active";
        aiSpeakingRef.current = true;
        setIsAISpeaking(true);
        if (currentAIStartRef.current === null) {
          currentAIStartRef.current = getElapsedSeconds();
          currentAITextRef.current = "";
        }
        if (userSpeechStoppedAtRef.current) {
          const gapMs = Date.now() - userSpeechStoppedAtRef.current;
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "technical",
            eventType: "agent_response_latency",
            payload: {
              gap_ms: gapMs,
              transcript_len: lastUserTranscriptLenRef.current,
            },
          });
          userSpeechStoppedAtRef.current = null;
        }
        break;

      case "response.audio.delta":
        aiSpeakingRef.current = true;
        break;

      case "response.audio.started":
      case "response.audio_transcript.started":
      case "output_audio_buffer.started":
        // output_audio_buffer.started é o sinal AUTORITATIVO: dispara quando o
        // áudio começa a tocar de fato via WebRTC (não quando o modelo terminou
        // de gerar). Mantém os outros eventos como fallback.
        aiSpeakingRef.current = true;
        setIsAISpeaking(true);
        if (currentAIStartRef.current === null) {
          currentAIStartRef.current = getElapsedSeconds();
        }
        break;

      case "output_audio_buffer.stopped":
        // Sinal AUTORITATIVO de fim de fala da IA — evita "Sua vez" enquanto
        // o áudio ainda está terminando de tocar.
        aiSpeakingRef.current = false;
        aiCooldownUntilRef.current = Date.now() + 300;
        setIsAISpeaking(false);
        break;

      case "response.audio_transcript.delta":
        if (event.delta) currentAITextRef.current += event.delta;
        break;

      case "response.audio.done":
      case "response.audio_transcript.done": {
        // NÃO flipa mais isAISpeaking aqui — modelo terminou de gerar mas
        // o áudio ainda toca via WebRTC. Flip real em output_audio_buffer.stopped.
        const aiText = event.transcript || currentAITextRef.current;
        if (aiText && aiText.trim()) {
          console.log("🤖 AI said:", aiText.substring(0, 100) + (aiText.length > 100 ? "..." : ""));
          setTranscript(prev => prev + `\nEntrevistador: ${aiText}`);

          pushTranscriptEntry({
            type: "ai",
            text: aiText.trim(),
            startSeconds: currentAIStartRef.current ?? getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          });
          console.log(`📊 Transcript entries: ${transcriptEntriesRef.current.length}`);

          // Check for completion (paridade com cultural — lista expandida)
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

      // Backup: capture complete output items (paridade com cultural)
      case "response.output_item.done":
        if (event.item?.content && Array.isArray(event.item.content)) {
          for (const content of event.item.content) {
            const text = content.transcript || content.text;
            if (text && text.trim()) {
              pushTranscriptEntry({
                type: "ai",
                text: text.trim(),
                startSeconds: currentAIStartRef.current ?? getElapsedSeconds(),
                endSeconds: getElapsedSeconds(),
              });
            }
          }
        }
        break;

      // Backup: capture content parts
      case "response.content_part.done":
        if (event.part?.transcript || event.part?.text) {
          const text = event.part.transcript || event.part.text;
          if (text && text.trim()) {
            pushTranscriptEntry({
              type: "ai",
              text: text.trim(),
              startSeconds: currentAIStartRef.current ?? getElapsedSeconds(),
              endSeconds: getElapsedSeconds(),
            });
          }
        }
        break;

      case "response.done":
      case "response.cancelled": {
        activeResponseIdRef.current = null;
        aiSpeakingRef.current = false;
        aiCooldownUntilRef.current = Date.now() + 300;
        setIsAISpeaking(false);
        const usage = (event as any)?.response?.usage;
        if (usage) {
          tokenUsageRef.current.audioInputTokens  += usage.input_token_details?.audio_tokens ?? 0;
          tokenUsageRef.current.audioOutputTokens += usage.output_token_details?.audio_tokens ?? 0;
          tokenUsageRef.current.textInputTokens   += usage.input_token_details?.text_tokens ?? 0;
          tokenUsageRef.current.textOutputTokens  += usage.output_token_details?.text_tokens ?? 0;
        }
        break;
      }

      case "error":
        if (isBenignRealtimeError(event.error)) {
          console.warn("⚠️ Suppressed benign Realtime error:", event.error);
          activeResponseIdRef.current = null;
          logVoiceInterviewEvent({
            sessionId,
            sessionType: "technical",
            eventType: "realtime_error_suppressed",
            payload: { code: event.error?.code, message: event.error?.message },
          });
        } else {
          console.error("❌ Realtime error:", event.error);
          toast.error("Erro na conexão: " + (event.error?.message || "Erro desconhecido"));
        }
        break;

      case "input_audio_buffer.speech_started":
        // Cooldown: ignora speech_started disparado pelo tail/eco da própria IA.
        if (aiSpeakingRef.current) {
          console.log("🔇 [ai_speaking] speech_started ignorado");
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "vad_speech_during_ai", payload: { reason: "ai_still_speaking" } });
          return;
        }
        if (Date.now() < aiCooldownUntilRef.current) {
          console.log("🔇 [ai_cooldown] speech_started ignorado");
          logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "vad_speech_during_ai", payload: { reason: "cooldown" } });
          return;
        }
        setIsUserSpeaking(true);
        currentUserStartRef.current = getElapsedSeconds();
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "speech_started" });
        break;

      case "input_audio_buffer.speech_stopped":
        setIsUserSpeaking(false);
        userSpeechStoppedAtRef.current = Date.now();
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "speech_stopped" });
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          const userText: string = event.transcript;
          lastUserTranscriptLenRef.current = userText.length;

          // Descarta transcrição que chegou dentro do cooldown da IA (tail/eco).
          if (Date.now() < aiCooldownUntilRef.current) {
            console.log("🗑️ [cooldown] transcrição descartada:", userText.substring(0, 60));
            logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "transcript_dropped_cooldown", payload: { text: userText.slice(0, 120) } });
            return;
          }

          // Filtro de ruído / idioma não-latino / palavras-fantasma curtas.
          const dropReason = classifyTranscript(userText);
          if (dropReason === "language") {
            console.log("🗑️ [filter:language] descartada:", userText.substring(0, 60));
            logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "transcript_dropped_language", payload: { text: userText.slice(0, 120) } });
            return;
          }
          if (dropReason === "noise") {
            console.log("🗑️ [filter:noise] descartada:", userText.substring(0, 60));
            logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "transcript_dropped_noise", payload: { text: userText.slice(0, 120) } });
            return;
          }

          console.log("👤 User said:", userText);
          setTranscript(prev => prev + `\nCandidato: ${userText}`);
          if (!candidateHasSpoken) setCandidateHasSpoken(true);

          pushTranscriptEntry({
            type: "candidate",
            text: userText.trim(),
            startSeconds: currentUserStartRef.current ?? getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          });
          currentUserStartRef.current = null;
        }
        break;

      // Backup: capture user conversation items
      case "conversation.item.created":
        if (event.item?.role === "user" && event.item?.content) {
          for (const content of event.item.content) {
            const text = content.transcript || content.text;
            if (text && text.trim()) {
              pushTranscriptEntry({
                type: "candidate",
                text: text.trim(),
                startSeconds: currentUserStartRef.current ?? getElapsedSeconds(),
                endSeconds: getElapsedSeconds(),
              });
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

  const finalizeAndComplete = () => {
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "session_completed_client", payload: { durationSeconds, completionDetected: interviewCompletionDetected } });

    // 1. Stop the visible timer IMMEDIATELY so UX never feels frozen.
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 2. Fire-and-forget: flush recorder + cleanup + upload run in the
    //    background. onComplete must not block on the network.
    void (async () => {
      let audioBlob: Blob | null = null;
      try { audioBlob = await stopRecorderAndFlush(); } catch { /* noop */ }
      console.log(`🎙️ Final technical audio blob: ${audioBlob ? `${audioBlob.size} bytes` : "null"}`);
      try { cleanupConnection(); } catch { /* noop */ }
      if (audioBlob && audioBlob.size > 0) {
        uploadAudioBlob(sessionId, audioBlob).catch((e) => console.error("❌ Upload promise rejected:", e));
      } else {
        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "audio_upload_failed", payload: { reason: "empty_blob", blobSize: 0 } });
      }
    })();

    // 3. Hand off to the parent NOW with everything already in memory.
    onComplete(
      transcriptRef.current,
      durationSeconds,
      interviewCompletionDetected,
      transcriptEntriesRef.current,
      { ...tokenUsageRef.current },
    );
  };

  const handleEndInterview = () => {
    const cov = coverageRef.current;
    const incomplete = cov && cov.total > 0 && cov.covered < cov.total;
    if (incomplete) {
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "technical",
        eventType: "technical_premature_end_blocked",
        payload: { covered: cov!.covered, total: cov!.total },
      });
      setConfirmEndOpen(true);
      return;
    }
    finalizeAndComplete();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Audio element é criado dinamicamente em initializeConnection */}

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
              {/* Turn-state chip: deixa explícito de quem é a vez (paridade com cultural) */}
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

      {/* Elemento <audio> para o stream remoto da IA. Declarado no JSX
          (sem display:none, sem appendChild manual) para autoplay confiável. */}
      <audio ref={audioElementRef} autoPlay playsInline className="sr-only" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Banner inicial: orienta o candidato a falar antes da IA começar */}
            <StartSpeakingAlert
              visible={isConnected && !candidateHasSpoken && !needsAudioUnlock}
              subtitle="O entrevistador técnico está aguardando sua confirmação por voz para começar."
            />

            {/* Fallback de autoplay bloqueado: candidato precisa de um clique para liberar o áudio */}
            {needsAudioUnlock && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Não estamos conseguindo tocar a voz do entrevistador automaticamente. Toque no botão abaixo para ativar.
                </p>
                <Button
                  onClick={() => {
                    const el = audioElementRef.current;
                    if (!el) return;
                    el.muted = false;
                    el.volume = 1.0;
                    logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "ai_audio_unlock_clicked" });
                    const anyEl = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
                    if (typeof anyEl.setSinkId === "function") {
                      anyEl.setSinkId("default").catch(() => { /* noop */ });
                    }
                    el.play()
                      .then(() => {
                        setNeedsAudioUnlock(false);
                        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "ai_audio_play_started", payload: { source: "user_unlock" } });
                      })
                      .catch((err) => {
                        logVoiceInterviewEvent({ sessionId, sessionType: "technical", eventType: "ai_audio_play_failed", payload: { source: "user_unlock", error: String(err?.message || err), name: String(err?.name || "") } });
                      });
                  }}
                  className="gap-2"
                >
                  <Volume2 className="h-4 w-4" />
                  Tocar a voz do entrevistador
                </Button>
              </div>
            )}




            {/* Coverage / Progress Banner — ocultado temporariamente:
                a heurística atual (regex por turnos do candidato) infla a
                contagem quando a IA faz follow-ups na mesma skill, causando
                UX confuso ("Skill 4 de 4 / 75%" ainda na 1ª pergunta).
                Métrica continua sendo coletada e usada para gate de
                encerramento prematuro / auto-complete por canEnd; só a
                exibição visual está desligada até trocarmos a fonte por
                tool call autoritativa do agente. */}

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
                  ✓ O entrevistador finalizou - clique em encerrar
                </p>
              )}
              {/* Texto e variante neutros enquanto a métrica de cobertura
                  visível está desligada — evita expor "faltam N skills"
                  com base na heurística inflada. */}
              <Button
                variant={interviewCompletionDetected ? "default" : "outline"}
                onClick={handleEndInterview}
                className="gap-2"
              >
                <PhoneOff className="h-4 w-4" />
                Encerrar Entrevista
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
              Tem certeza que deseja encerrar agora? A entrevistadora pode ainda
              ter perguntas importantes para te fazer. Se quiser, volte e continue
              respondendo — você pode encerrar a qualquer momento.
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

