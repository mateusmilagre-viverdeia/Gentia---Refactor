import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logVoiceInterviewEvent } from "@/lib/voiceInterviewTelemetry";
import { classifyTranscript } from "@/lib/interviewTranscriptFilter";
import { 
  Mic, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Phone,
  PhoneOff,
  AlertCircle,
  XCircle,
  RotateCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  classifyMicError,
  getBrowserDiagnostics,
  getFriendlyErrorMessage,
  markInterviewFailed,
  type FailureReason,
} from "@/lib/interviewConnectionDiagnostics";
import { InterviewPreflightGate } from "@/components/candidate/InterviewPreflightGate";

interface CultureInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  accountId: string;
  candidateProfileId: string;
  candidateName: string;
  companyName: string;
  onComplete: (score: number, analysis: string) => void;
  minThreshold?: number;
}

interface TranscriptEntry {
  type: 'ai' | 'candidate';
  text: string;
  startSeconds: number;
  endSeconds?: number;
}

type InterviewStage = "intro" | "connecting" | "interviewing" | "processing" | "completed";

export function CultureInterviewModal({
  open,
  onOpenChange,
  jobId,
  accountId,
  candidateProfileId,
  candidateName,
  companyName,
  onComplete,
  minThreshold,
}: CultureInterviewModalProps) {
  const [stage, setStage] = useState<InterviewStage>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [retryInfo, setRetryInfo] = useState<{ canRetry: boolean; attemptNumber: number; maxAttempts: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("Preparando...");
  const [interviewCompletionDetected, setInterviewCompletionDetected] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stageRef = useRef<InterviewStage>(stage);
  const completionDetectedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  
  // NEW: Real interview start time (when AI first speaks)
  const realInterviewStartRef = useRef<number | null>(null);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  // Transcript tracking refs
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([]);
  const currentAITextRef = useRef<string>("");
  const currentAIStartRef = useRef<number | null>(null);
  const currentUserStartRef = useRef<number | null>(null);
  const questionsConfigRef = useRef<any[]>([]);
  const lastAIQuestionRef = useRef<string>("");
  // Snapshot of the AI question that was on the floor when the candidate STARTED
  // speaking. Critical: by the time the candidate's transcription completes, the AI
  // may have already moved on to the next question, so we must NOT use lastAIQuestionRef
  // at completion time — we use the value captured at speech_started.
  const pendingAIQuestionRef = useRef<string>("");
  const pendingAITurnIndexRef = useRef<number>(-1);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const connectionHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const activeResponseIdRef = useRef<string | null>(null);
  // Cooldown pós-fala da IA: evita que eco/tail da própria voz seja capturado.
  const AI_COOLDOWN_MS = 300;
  const aiCooldownUntilRef = useRef<number>(0);
  const isInAICooldown = () => Date.now() < aiCooldownUntilRef.current;

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
  // Dedupe Realtime API events by id to prevent duplicated transcript entries.
  // OpenAI fires multiple events (response.audio_transcript.done, content_part.done,
  // output_item.done) carrying the same transcript for a single AI turn; same for user.
  const processedAIResponseIdsRef = useRef<Set<string>>(new Set());
  const processedUserItemIdsRef = useRef<Set<string>>(new Set());
  // Tracks the actual AI question turn (not the candidate utterance count) for save indexing.
  const aiTurnIndexRef = useRef<number>(-1);

  // Keep refs in sync with state
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    completionDetectedRef.current = interviewCompletionDetected;
  }, [interviewCompletionDetected]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    if (stage === "interviewing") {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stage]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      cleanupConnection();
      setStage("intro");
      setSessionId(null);
      setElapsedTime(0);
      setScore(null);
      setAnalysis("");
      setRetryInfo(null);
      setInterviewCompletionDetected(false);
      realInterviewStartRef.current = null;
      audioChunksRef.current = [];
      transcriptEntriesRef.current = [];
      currentAITextRef.current = "";
      currentAIStartRef.current = null;
      currentUserStartRef.current = null;
      lastAIQuestionRef.current = "";
      pendingAIQuestionRef.current = "";
      pendingAITurnIndexRef.current = -1;
      processedAIResponseIdsRef.current = new Set();
      processedUserItemIdsRef.current = new Set();
      aiTurnIndexRef.current = -1;
    }
  }, [open]);

  const getElapsedSeconds = useCallback(() => {
    return (Date.now() - startTimeRef.current) / 1000;
  }, []);

  const cleanupConnection = useCallback(() => {
    console.log("🧹 Cleaning up connection...");
    
    // Clear heartbeat and health check intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (connectionHealthCheckRef.current) {
      clearInterval(connectionHealthCheckRef.current);
      connectionHealthCheckRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping recorder:", e);
      }
    }
    mediaRecorderRef.current = null;
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing audio context:", e);
      }
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
    // Remove audio element from DOM (critical for proper cleanup)
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
      if (audioElementRef.current.parentNode) {
        audioElementRef.current.parentNode.removeChild(audioElementRef.current);
        console.log("🧹 Elemento de áudio removido do DOM");
      }
      audioElementRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // NEW: Save individual response to database immediately
  // IMPORTANT: aiQuestionSpoken comes from the snapshot taken when the candidate
  // STARTED speaking (pendingAIQuestionRef), not from lastAIQuestionRef which may
  // already point to the next AI question by the time transcription completes.
  const saveResponseToDatabase = useCallback(async (
    entry: TranscriptEntry,
    questionIndex: number,
    aiQuestionSnapshot: string,
  ) => {
    if (!sessionIdRef.current) return;
    
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-save-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            questionIndex,
            aiQuestionSpoken: aiQuestionSnapshot || lastAIQuestionRef.current,
            candidateResponse: entry.text,
            startSeconds: entry.startSeconds,
            endSeconds: entry.endSeconds || getElapsedSeconds(),
          }),
        }
      );
      console.log('✅ Response saved to database');
    } catch (error) {
      console.error('⚠️ Failed to save response (will retry at end):', error);
    }
  }, [getElapsedSeconds]);

  // Build transcript string for processing
  const buildTranscriptForProcessing = useCallback((): string => {
    return transcriptEntriesRef.current
      .sort((a, b) => a.startSeconds - b.startSeconds)
      .map(entry => {
        const prefix = entry.type === 'ai' ? 'Entrevistadora' : 'Candidato';
        return `${prefix}: ${entry.text}`;
      })
      .join('\n');
  }, []);

  // NEW: Send heartbeat to keep session alive
  const sendHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-heartbeat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            partialTranscript: buildTranscriptForProcessing(),
            responsesCount: transcriptEntriesRef.current.filter(e => e.type === 'candidate').length,
          }),
        }
      );
      
      if (!response.ok) {
        console.warn('⚠️ Heartbeat failed - session may be lost');
      }
    } catch (error) {
      console.error('⚠️ Heartbeat error:', error);
    }
  }, [buildTranscriptForProcessing]);

  // NEW: Heartbeat effect - send heartbeat every 30 seconds during interview
  useEffect(() => {
    if (stage !== 'interviewing' || !sessionId) return;
    
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000); // 30 seconds
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [stage, sessionId, sendHeartbeat]);

  // NEW: Connection health check - detect stale connections
  useEffect(() => {
    if (stage !== 'interviewing') return;
    
    connectionHealthCheckRef.current = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      
      // If no events for 60+ seconds, warn user
      if (timeSinceLastEvent > 60000 && timeSinceLastEvent < 180000) {
        console.warn("⚠️ No events received for 60+ seconds");
        toast.warning("Conexão parece instável. Verifique sua internet.");
      }
      
      // If no events for 3+ minutes, auto-end with error
      if (timeSinceLastEvent > 180000) {
        console.error("❌ Connection appears dead - auto-ending interview");
        toast.error("Conexão perdida. Encerrando entrevista...");
        endCall();
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      if (connectionHealthCheckRef.current) {
        clearInterval(connectionHealthCheckRef.current);
        connectionHealthCheckRef.current = null;
      }
    };
  }, [stage]);

  const setupAudioRecording = useCallback((micStream: MediaStream, aiAudioElement: HTMLAudioElement) => {
    try {
      console.log("🎙️ Setting up combined audio recording...");
      
      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      
      // Create destination for combining streams
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;
      
      // Add microphone stream
      const micSource = audioContext.createMediaStreamSource(micStream);
      const micGain = audioContext.createGain();
      micGain.gain.value = 1.0;
      micSource.connect(micGain);
      micGain.connect(destination);
      console.log("✅ Microphone connected to recorder");
      
      // Add AI audio when available
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
      
      // Try to connect AI audio immediately and on updates
      aiAudioElement.addEventListener('loadedmetadata', connectAIAudio);
      connectAIAudio();
      
      // Create MediaRecorder with combined stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const recorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onerror = (event) => {
        console.error("❌ MediaRecorder error:", event);
      };
      
      recorder.start(1000); // Capture in 1-second chunks
      mediaRecorderRef.current = recorder;
      
      console.log("✅ Audio recording started");
    } catch (error) {
      console.error("❌ Error setting up audio recording:", error);
    }
  }, []);

  const startInterview = async () => {
    // Validate candidateProfileId before starting
    if (!candidateProfileId || candidateProfileId === 'undefined') {
      console.error("❌ Invalid candidateProfileId:", candidateProfileId);
      toast.error("Perfil do candidato não encontrado. Por favor, recarregue a página.");
      return;
    }

    try {
      setStage("connecting");
      setConnectionStatus("Solicitando permissão do microfone...");
      console.log("🎤 Starting interview...");

      // === CRITICAL: Create audio element BEFORE WebRTC (like reference code) ===
      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.setAttribute("playsinline", "true");
      audioElement.muted = false;
      audioElement.volume = 1.0;
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
      audioElementRef.current = audioElement;

      console.log("🎧 Elemento de áudio criado e anexado ao DOM");
      console.log("🎧 muted =", audioElement.muted, "volume =", audioElement.volume);

      // Error listener
      audioElement.addEventListener("error", () => {
        console.error("❌ Erro no elemento de áudio:", audioElement.error);
      });

      // Pre-activation (some browsers need this)
      try {
        const prePlay = audioElement.play();
        if (prePlay && typeof prePlay.then === "function") {
          prePlay
            .then(() => console.log("🎧 Pre-play OK - contexto de áudio ativado"))
            .catch(err => console.warn("⚠️ Pre-play falhou (normal):", err.message));
        }
      } catch (e) {
        console.warn("⚠️ Erro no pre-play:", e);
      }
      // === END audio element creation ===

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
        const diag = getBrowserDiagnostics();
        const reason: FailureReason = diag.isInAppBrowser
          ? "webview_blocked"
          : classifyMicError(micError);
        const msg = getFriendlyErrorMessage(reason, diag);
        toast.error(msg, { duration: 10000 });
        // No sessionId yet at this point — telemetry only after we have one.
        setStage("intro");
        return;
      }
      
      mediaStreamRef.current = stream;
      console.log("✅ Microphone permission granted");

      setConnectionStatus("Conectando ao servidor...");

      // Step 1: Get ephemeral token from our edge function
      console.log("🔑 Requesting ephemeral token...");
      let tokenResponse: Response;
      try {
        tokenResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-realtime-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              accountId,
              jobId,
              candidateProfileId,
              candidateName,
              companyName,
            }),
          }
        );
      } catch (networkError) {
        console.error("❌ Network error calling edge function:", networkError);
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
        cleanupConnection();
        setStage("intro");
        return;
      }

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("❌ Token error:", errorData);
        
        if (errorData.error === "NO_QUESTIONS_CONFIGURED") {
          toast.error(errorData.message || "Não há perguntas configuradas para este agente de entrevista.");
          cleanupConnection();
          setStage("intro");
          return;
        }

        if (errorData.error === "INVALID_CANDIDATE_PROFILE") {
          toast.error("Perfil do candidato inválido. Por favor, recarregue a página.");
          cleanupConnection();
          setStage("intro");
          return;
        }
        
        toast.error(errorData.message || "Erro ao conectar com o servidor. Tente novamente.");
        cleanupConnection();
        setStage("intro");
        return;
      }

      const { ephemeralToken, sessionId: newSessionId, questionsCount: qCount, questions } = await tokenResponse.json();
      console.log("✅ Ephemeral token received");
      console.log("✅ Session ID:", newSessionId);
      console.log("✅ Questions count:", qCount);

      setSessionId(newSessionId);
      setQuestionsCount(qCount);
      questionsConfigRef.current = questions || [];

      setConnectionStatus("Estabelecendo conexão de áudio...");

      // Step 2: Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // Add audio track from microphone (with pre-check + telemetry)
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled || audioTracks[0].readyState !== "live") {
        // First-shot recovery: try getUserMedia one more time
        console.warn("⚠️ Mic track inválido na primeira tentativa, refazendo getUserMedia...");
        logVoiceInterviewEvent({
          sessionId: newSessionId,
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
          logVoiceInterviewEvent({
            sessionId: newSessionId,
            sessionType: "cultural",
            eventType: "mic_recovered",
            payload: { afterRetry: true },
          });
        } catch (retryErr) {
          console.error("❌ Mic retry falhou:", retryErr);
        }
      }

      stream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, stream);
        console.log("✅ Audio track added:", track.label, { enabled: track.enabled, muted: track.muted, readyState: track.readyState });
        const settings = track.getSettings ? track.getSettings() : {};
        logVoiceInterviewEvent({
          sessionId: newSessionId,
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
          console.warn("🔇 Mic track muted");
          logVoiceInterviewEvent({
            sessionId: newSessionId,
            sessionType: "cultural",
            eventType: "mic_track_state_change",
            payload: { state: "muted" },
          });
        };
        track.onunmute = () => {
          console.log("🔊 Mic track unmuted");
          logVoiceInterviewEvent({
            sessionId: newSessionId,
            sessionType: "cultural",
            eventType: "mic_track_state_change",
            payload: { state: "unmuted" },
          });
        };
        track.onended = () => {
          console.warn("🛑 Mic track ended");
          logVoiceInterviewEvent({
            sessionId: newSessionId,
            sessionType: "cultural",
            eventType: "mic_track_state_change",
            payload: { state: "ended" },
          });
        };
      });

      // Handle incoming audio from AI
      pc.ontrack = (event) => {
        console.log("🔊 Track recebido:", event.track.kind, "readyState =", event.track.readyState);
        console.log("📊 Stream:", event.streams[0]?.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })));
        
        const audioEl = audioElementRef.current;
        if (!audioEl) {
          console.error("❌ Elemento de áudio não encontrado!");
          return;
        }
        
        audioEl.srcObject = event.streams[0];
        
        // Play with retry logic (like reference code)
        const attemptPlay = (attempt = 1) => {
          audioEl.play()
            .then(() => {
              console.log("✅ Reprodução de áudio iniciada na tentativa", attempt);
            })
            .catch(err => {
              console.warn(`⚠️ Play falhou (tentativa ${attempt}):`, err.message);
              if (attempt < 3) {
                setTimeout(() => attemptPlay(attempt + 1), 500);
              }
            });
        };
        
        attemptPlay();
        
        // Setup recording after AI audio is connected
        setupAudioRecording(stream, audioEl);
      };

      // Connection state monitoring (telemetry)
      pc.onconnectionstatechange = () => {
        console.log("🔗 PC connection state:", pc.connectionState);
        logVoiceInterviewEvent({
          sessionId: newSessionId,
          sessionType: "cultural",
          eventType: "pc_connection_state",
          payload: { state: pc.connectionState },
        });
      };

      // ICE connection monitoring
      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE connection state:", pc.iceConnectionState);
        logVoiceInterviewEvent({
          sessionId: newSessionId,
          sessionType: "cultural",
          eventType: "pc_ice_connection_state",
          payload: { state: pc.iceConnectionState },
        });
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
        safeSendResponseCreate({
          type: "response.create",
          response: { output_modalities: ["audio"] },
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
      };

      dc.onclose = () => {
        console.log("📴 Data channel closed");
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnectionStatus("Conectado!");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.error("❌ Connection failed/disconnected");
          toast.error("Conexão perdida. Tente novamente.");
          cleanupConnection();
          setStage("intro");
        }
      };

      // Create offer
      console.log("📤 Creating SDP offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
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

      // Step 3: Send SDP to OpenAI Realtime API directly using ephemeral token
      // One automatic retry on transient network failure before giving up.
      console.log("📤 Sending SDP to OpenAI Realtime API...");
      let sdpResponse: Response | null = null;
      let lastNetworkError: unknown = null;
      let lastHttpStatus = 0;
      let lastHttpBody = "";

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime-mini", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ephemeralToken}`,
              "Content-Type": "application/sdp",
            },
            body: pc.localDescription?.sdp,
          });
        } catch (sdpError) {
          console.error(`❌ SDP network error (attempt ${attempt}):`, sdpError);
          lastNetworkError = sdpError;
          sdpResponse = null;
          if (attempt < 2) {
            setConnectionStatus("Reconectando com a IA...");
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
          break;
        }

        if (sdpResponse.ok) break;

        lastHttpStatus = sdpResponse.status;
        lastHttpBody = await sdpResponse.text().catch(() => "");
        console.error(`❌ OpenAI SDP error (attempt ${attempt}):`, lastHttpStatus, lastHttpBody);
        // Retry only on 5xx / network-ish failures; bail on 4xx (token issues)
        if (attempt < 2 && lastHttpStatus >= 500) {
          setConnectionStatus("Reconectando com a IA...");
          await new Promise((r) => setTimeout(r, 800));
          sdpResponse = null;
          continue;
        }
        break;
      }

      if (!sdpResponse) {
        const diag = getBrowserDiagnostics();
        const msg = getFriendlyErrorMessage("realtime_network_error", diag);
        toast.error(msg, { duration: 12000 });
        await markInterviewFailed(newSessionId, "cultural", "realtime_network_error", {
          ...diag,
          stage: "sdp_fetch",
          error: String(lastNetworkError),
        });
        cleanupConnection();
        setStage("intro");
        return;
      }

      if (!sdpResponse.ok) {
        const diag = getBrowserDiagnostics();
        const msg = getFriendlyErrorMessage("realtime_sdp_connection_failed", diag);
        toast.error(msg, { duration: 12000 });
        await markInterviewFailed(newSessionId, "cultural", "realtime_sdp_connection_failed", {
          ...diag,
          stage: "sdp_response",
          httpStatus: lastHttpStatus,
          httpBodyPreview: lastHttpBody.slice(0, 500),
        });
        cleanupConnection();
        setStage("intro");
        return;
      }

      const answerSdp = await sdpResponse.text();
      console.log("✅ Received SDP answer from OpenAI, length:", answerSdp.length);
      console.log("📝 SDP answer preview:", answerSdp.substring(0, 300));

      // Set remote description
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
      console.log("✅ Remote description set");

      setStage("interviewing");
      startTimeRef.current = Date.now();
      console.log("🎙️ Interview started!");

    } catch (error) {
      console.error("❌ Unexpected error starting interview:", error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao iniciar a entrevista: ${errorMessage}`);
      setStage("intro");
      cleanupConnection();
    }
  };

  const handleRealtimeEvent = (event: any) => {
    // Log all events for debugging (except frequent ones)
    if (event.type !== "response.audio.delta" && !event.type?.includes("delta")) {
      console.log("📨 Realtime event:", event.type, event);
    }

    switch (event.type) {
      case "session.created":
        console.log("✅ Session created");
        break;

      case "session.updated":
        console.log("✅ Session updated");
        break;

      case "response.created":
        console.log("🤖 Response created");
        activeResponseIdRef.current = event.response?.id || "active";
        setIsAISpeaking(true);
        // Mark start time for AI speaking
        if (currentAIStartRef.current === null) {
          currentAIStartRef.current = getElapsedSeconds();
          currentAITextRef.current = "";
        }
        break;

      case "response.audio_transcript.delta":
        // Accumulate AI transcript
        if (event.delta) {
          currentAITextRef.current += event.delta;
        }
        break;

      case "response.audio.started":
      case "response.audio_transcript.started":
        setIsAISpeaking(true);
        if (currentAIStartRef.current === null) {
          currentAIStartRef.current = getElapsedSeconds();
        }
        // Mark real interview start when AI first speaks
        if (!realInterviewStartRef.current) {
          realInterviewStartRef.current = Date.now();
          console.log("🎬 Real interview started at:", new Date(realInterviewStartRef.current).toISOString());
        }
        break;
      
      case "response.audio.done":
      case "response.audio_transcript.done": {
        setIsAISpeaking(false);
        // Arma cooldown para ignorar tail/eco da própria voz da IA.
        aiCooldownUntilRef.current = Date.now() + AI_COOLDOWN_MS;
        const aiText = event.transcript || currentAITextRef.current;
        const trimmedAI = aiText ? aiText.trim() : "";
        // Dedupe by response_id (same response fires audio.done + audio_transcript.done +
        // content_part.done + output_item.done — all carry the same transcript).
        const aiResponseId = event.response_id || event.item_id || `audio-${trimmedAI}`;
        if (trimmedAI && !processedAIResponseIdsRef.current.has(aiResponseId)) {
          processedAIResponseIdsRef.current.add(aiResponseId);
          aiTurnIndexRef.current += 1;
          console.log("🤖 AI said:", trimmedAI.substring(0, 100) + (trimmedAI.length > 100 ? '...' : ''));

          // Track last AI question for incremental saving
          lastAIQuestionRef.current = trimmedAI;

          transcriptEntriesRef.current.push({
            type: 'ai',
            text: trimmedAI,
            startSeconds: currentAIStartRef.current || getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          });
          console.log(`📊 Transcript entries count: ${transcriptEntriesRef.current.length}`);

          // Update last event time for health check
          lastEventTimeRef.current = Date.now();

          // Check for interview completion
          const lowerTranscript = trimmedAI.toLowerCase();
          const completionPhrases = [
            "até logo", "até mais", "entrevista foi concluída",
            "muito obrigada pela conversa", "muito obrigada pelas suas respostas",
            "foi um prazer conhecê-lo", "foi um prazer conhecê-la",
            "desejo boa sorte", "boa sorte no processo", "boa sorte e até mais",
            "prazer em conhecê-lo", "prazer em conhecê-la",
            "obrigada pela sua participação", "finalizamos nossa conversa",
            "agradeço pela conversa"
          ];

          const isComplete = completionPhrases.some(phrase => lowerTranscript.includes(phrase));
          if (isComplete && stageRef.current === "interviewing") {
            console.log("🏁 Interview completion phrase detected!");
            completionDetectedRef.current = true;
            setInterviewCompletionDetected(true);
          }
        }
        currentAIStartRef.current = null;
        currentAITextRef.current = "";
        break;
      }

      // Backup: ignored if response_id already processed by audio_transcript.done.
      case "response.output_item.done": {
        const aiResponseId = event.response_id || event.item?.id;
        if (!aiResponseId || processedAIResponseIdsRef.current.has(aiResponseId)) break;
        if (event.item?.content && Array.isArray(event.item.content)) {
          for (const content of event.item.content) {
            const text = content.transcript || content.text;
            if (text && text.trim()) {
              processedAIResponseIdsRef.current.add(aiResponseId);
              aiTurnIndexRef.current += 1;
              lastAIQuestionRef.current = text.trim();
              console.log("🤖 [output_item.done] AI said:", text.substring(0, 100));
              transcriptEntriesRef.current.push({
                type: 'ai',
                text: text.trim(),
                startSeconds: currentAIStartRef.current || getElapsedSeconds(),
                endSeconds: getElapsedSeconds(),
              });
              break; // one push per response_id
            }
          }
        }
        break;
      }

      case "response.content_part.done": {
        const aiResponseId = event.response_id || event.item_id;
        if (!aiResponseId || processedAIResponseIdsRef.current.has(aiResponseId)) break;
        const text = event.part?.transcript || event.part?.text;
        if (text && text.trim()) {
          processedAIResponseIdsRef.current.add(aiResponseId);
          aiTurnIndexRef.current += 1;
          lastAIQuestionRef.current = text.trim();
          console.log("🤖 [content_part.done] AI said:", text.substring(0, 100));
          transcriptEntriesRef.current.push({
            type: 'ai',
            text: text.trim(),
            startSeconds: currentAIStartRef.current || getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          });
        }
        break;
      }

      case "response.done":
      case "response.cancelled":
        activeResponseIdRef.current = null;
        setIsAISpeaking(false);
        break;

      case "input_audio_buffer.speech_started":
        // Cooldown pós-IA: ignora abertura de turno do candidato logo após a IA falar.
        if (isInAICooldown()) {
          console.log("🔇 [ai_cooldown] speech_started ignorado");
          if (sessionIdRef.current) {
            logVoiceInterviewEvent({ sessionId: sessionIdRef.current, sessionType: "cultural", eventType: "vad_speech_during_ai", payload: { reason: "cooldown" } });
          }
          break;
        }
        console.log("🎤 User started speaking");
        setIsUserSpeaking(true);
        currentUserStartRef.current = getElapsedSeconds();
        // CRITICAL: snapshot the AI question that's currently on the floor.
        if (lastAIQuestionRef.current) {
          pendingAIQuestionRef.current = lastAIQuestionRef.current;
          pendingAITurnIndexRef.current = aiTurnIndexRef.current;
          console.log(`📌 Snapshot AI question (turn ${pendingAITurnIndexRef.current}):`, pendingAIQuestionRef.current.substring(0, 80));
        }
        break;

      case "input_audio_buffer.speech_stopped":
        console.log("🎤 User stopped speaking");
        setIsUserSpeaking(false);
        break;

      case "conversation.item.input_audio_transcription.completed": {
        const transcript = event.transcript ? event.transcript.trim() : "";
        const userItemId = event.item_id || `transcribed-${transcript}`;
        if (transcript && !processedUserItemIdsRef.current.has(userItemId)) {
          // Cooldown pós-IA: descarta transcrições que chegam logo após a IA terminar.
          if (isInAICooldown()) {
            console.log("🗑️ [cooldown] transcrição descartada:", transcript.substring(0, 60));
            if (sessionIdRef.current) {
              logVoiceInterviewEvent({ sessionId: sessionIdRef.current, sessionType: "cultural", eventType: "transcript_dropped_cooldown", payload: { text: transcript.slice(0, 120) } });
            }
            break;
          }
          // Filtro heurístico de ruído/idioma.
          const dropReason = classifyTranscript(transcript);
          if (dropReason) {
            console.log(`🗑️ [${dropReason}] transcrição descartada:`, transcript.substring(0, 60));
            if (sessionIdRef.current) {
              logVoiceInterviewEvent({
                sessionId: sessionIdRef.current,
                sessionType: "cultural",
                eventType: dropReason === "language" ? "transcript_dropped_language" : "transcript_dropped_noise",
                payload: { text: transcript.slice(0, 120) },
              });
            }
            break;
          }
          processedUserItemIdsRef.current.add(userItemId);
          console.log("👤 User said:", transcript.substring(0, 100));

          const entry: TranscriptEntry = {
            type: 'candidate',
            text: transcript,
            startSeconds: currentUserStartRef.current || getElapsedSeconds(),
            endSeconds: getElapsedSeconds(),
          };
          transcriptEntriesRef.current.push(entry);
          currentUserStartRef.current = null;

          const turnIndex = pendingAITurnIndexRef.current >= 0
            ? pendingAITurnIndexRef.current
            : Math.max(0, aiTurnIndexRef.current);
          const aiQuestionSnapshot = pendingAIQuestionRef.current || lastAIQuestionRef.current;
          saveResponseToDatabase(entry, turnIndex, aiQuestionSnapshot);
        }
        break;
      }

      // Backup: ignored if item_id already processed.
      case "conversation.item.created": {
        if (event.item?.role !== 'user' || !event.item?.content) break;
        const userItemId = event.item.id;
        if (!userItemId || processedUserItemIdsRef.current.has(userItemId)) break;
        for (const content of event.item.content) {
          const text = content.transcript || content.text;
          if (text && text.trim()) {
            processedUserItemIdsRef.current.add(userItemId);
            console.log("👤 [item.created] User said:", text.substring(0, 100));
            const entry: TranscriptEntry = {
              type: 'candidate',
              text: text.trim(),
              startSeconds: currentUserStartRef.current || getElapsedSeconds(),
              endSeconds: getElapsedSeconds(),
            };
            transcriptEntriesRef.current.push(entry);
            const turnIndex = pendingAITurnIndexRef.current >= 0
              ? pendingAITurnIndexRef.current
              : Math.max(0, aiTurnIndexRef.current);
            const aiQuestionSnapshot = pendingAIQuestionRef.current || lastAIQuestionRef.current;
            saveResponseToDatabase(entry, turnIndex, aiQuestionSnapshot);
            break;
          }
        }
        break;
      }

      case "error":
        if (isBenignRealtimeError(event.error)) {
          console.warn("⚠️ Suppressed benign Realtime error:", event.error);
          activeResponseIdRef.current = null;
          if (sessionIdRef.current) {
            logVoiceInterviewEvent({
              sessionId: sessionIdRef.current,
              sessionType: "cultural",
              eventType: "realtime_error_suppressed",
              payload: { code: event.error?.code, message: event.error?.message },
            });
          }
        } else {
          console.error("❌ Realtime error:", event.error);
          toast.error("Erro na conexão: " + (event.error?.message || "Erro desconhecido"));
        }
        break;

      default:
        break;
    }
  };

  // Stop MediaRecorder and wait for the final ondataavailable/onstop flush.
  // CRITICAL: must run BEFORE cleanupConnection(), otherwise the AudioContext
  // is closed and the last chunk is lost (this caused 18+ sessions with audio_url=null).
  const stopRecorderAndFlush = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const r = mediaRecorderRef.current;
      if (!r || r.state === "inactive") {
        const existing = audioChunksRef.current;
        if (existing.length > 0) {
          return resolve(new Blob(existing, { type: "audio/webm" }));
        }
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
      // Safety net: if onstop never fires (browser quirk), resolve after 2s
      setTimeout(finish, 2000);
      try { r.stop(); } catch { finish(); }
    });

  const endCall = async () => {
    console.log("📴 Ending call...");
    console.log(`📊 Final transcript entries count: ${transcriptEntriesRef.current.length}`);

    if (transcriptEntriesRef.current.length < 2) {
      console.warn("⚠️ Very few transcript entries captured:", transcriptEntriesRef.current.length);
    }

    // 1. Flush recorder FIRST (await final chunk) BEFORE killing streams
    const audioBlob = await stopRecorderAndFlush();
    console.log(`🎙️ Final audio blob: ${audioBlob ? `${audioBlob.size} bytes` : "null"}`);

    // 2. Now safe to tear down the WebRTC/AudioContext
    cleanupConnection();

    if (!sessionIdRef.current) {
      console.error("❌ No session ID available - cannot complete interview");
      toast.error("Erro: sessão não encontrada");
      setStage("intro");
      return;
    }

    // 3. Fire-and-forget upload (in parallel with completeInterview)
    if (audioBlob && audioBlob.size > 0) {
      uploadAudioBlob(sessionIdRef.current, audioBlob).catch((e) =>
        console.error("❌ Upload promise rejected:", e),
      );
    } else {
      logVoiceInterviewEvent({
        sessionId: sessionIdRef.current,
        sessionType: "cultural",
        eventType: "audio_upload_failed",
        payload: { reason: "empty_blob", blobSize: 0 },
      });
    }

    completeInterview();
  };

  const uploadAudioBlob = async (sessionId: string, audioBlob: Blob) => {
    const t0 = Date.now();
    console.log(`📤 Uploading audio (${audioBlob.size} bytes)...`);
    logVoiceInterviewEvent({
      sessionId,
      sessionType: "cultural",
      eventType: "audio_upload_started",
      payload: { size: audioBlob.size, mimeType: audioBlob.type },
    });

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "interview.webm");
      formData.append("sessionId", sessionId);

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
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "audio_upload_failed",
          payload: { status: response.status, errorMessage: errText.slice(0, 500), blobSize: audioBlob.size },
        });
      } else {
        const result = await response.json();
        console.log("✅ Audio uploaded:", result);
        logVoiceInterviewEvent({
          sessionId,
          sessionType: "cultural",
          eventType: "audio_upload_succeeded",
          payload: { size: audioBlob.size, durationMs: Date.now() - t0 },
        });
      }
    } catch (error) {
      console.error("❌ Error uploading audio:", error);
      logVoiceInterviewEvent({
        sessionId,
        sessionType: "cultural",
        eventType: "audio_upload_failed",
        payload: { errorMessage: error instanceof Error ? error.message : "unknown", blobSize: audioBlob.size },
      });
    }
  };



  const completeInterview = async () => {
    if (stageRef.current === "processing" || stageRef.current === "completed") {
      console.log("⚠️ Already processing or completed, skipping...");
      return;
    }

    const currentSessionId = sessionIdRef.current;
    const transcriptEntries = transcriptEntriesRef.current;

    if (!currentSessionId) {
      console.error("❌ No session ID available");
      toast.error("Erro: sessão não encontrada");
      setStage("intro");
      return;
    }
    
    try {
      console.log("📊 Processing interview results...", { sessionId: currentSessionId });
      setStage("processing");

      // Use real interview start time if available (when AI first spoke), otherwise fallback to button click time
      const startTime = realInterviewStartRef.current || startTimeRef.current;
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      console.log(`⏱️ Calculated duration: ${durationSeconds}s (using ${realInterviewStartRef.current ? 'real interview start' : 'button click time'})`);
      
      // (Audio upload is now triggered from endCall() before cleanup, not here.)


      // Build structured transcript with timestamps
      const structuredTranscript = buildTranscriptForProcessing();
      
      // Send transcript entries for better Q&A matching
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-interview-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            sessionId: currentSessionId,
            transcript: structuredTranscript,
            transcriptEntries: transcriptEntries,
            durationSeconds,
            completedNaturally: completionDetectedRef.current,
            tokenUsage: {
              audioInputSeconds: durationSeconds * 0.4,
              audioOutputSeconds: durationSeconds * 0.5,
              audioInputTokens: Math.round(durationSeconds * 0.4 * 25),
              audioOutputTokens: Math.round(durationSeconds * 0.5 * 50),
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Complete error:", errorData);
        throw new Error("Failed to complete interview");
      }

      const data = await response.json();
      console.log("✅ Interview completed:", data);
      
      setScore(data.score);
      setAnalysis(data.analysis);
      if (typeof data.canRetry === "boolean") {
        setRetryInfo({
          canRetry: data.canRetry,
          attemptNumber: data.attemptNumber ?? 1,
          maxAttempts: data.maxAttempts ?? 2,
        });
      }
      setStage("completed");
      
      onComplete(data.score, data.analysis);
    } catch (error) {
      console.error("❌ Error completing interview:", error);
      toast.error("Erro ao finalizar a entrevista");
      cleanupConnection();
      setStage("intro");
    }
  };

  const handleRetry = () => {
    // Reseta estado e volta para a tela de intro para o candidato iniciar nova tentativa.
    // O backend já permite (canRetry=true via Auto-Retry Inteligente).
    cleanupConnection();
    setScore(null);
    setAnalysis("");
    setRetryInfo(null);
    setQuestionsCount(0);
    setElapsedTime(0);
    setInterviewCompletionDetected(false);
    completionDetectedRef.current = false;
    realInterviewStartRef.current = null;
    transcriptEntriesRef.current = [];
    setSessionId(null);
    sessionIdRef.current = null;
    setStage("intro");
  };

  const handleClose = () => {
    if (stage === "interviewing" || stage === "connecting") {
      if (confirm("Deseja realmente sair? A entrevista será encerrada.")) {
        cleanupConnection();
        onOpenChange(false);
        setStage("intro");
        setSessionId(null);
      }
    } else if (stage === "completed") {
      onOpenChange(false);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg h-auto max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Audio element is created dynamically in startInterview */}
        
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Matching Cultural
          </DialogTitle>
          <DialogDescription>
            Entrevista de compatibilidade cultural com {companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <AnimatePresence mode="wait">
            {/* Intro Stage */}
            {stage === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center text-center py-4"
              >
                <InterviewPreflightGate>
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Olá, {candidateName}!</h2>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Vamos iniciar uma conversa por voz para conhecer melhor você e seus valores.
                    Basta falar naturalmente!
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left w-full">
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <Mic className="h-4 w-4" />
                      Como funciona:
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Nossa assistente fará perguntas por voz</li>
                      <li>• Responda naturalmente, como numa conversa</li>
                      <li>• A entrevista termina automaticamente</li>
                    </ul>
                  </div>
                  <Button
                    size="lg"
                    onClick={startInterview}
                    className="gap-2 w-full"
                  >
                    <Phone className="h-5 w-5" />
                    Iniciar Conversa
                  </Button>
                </InterviewPreflightGate>
              </motion.div>
            )}

            {/* Connecting Stage */}
            {stage === "connecting" && (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{connectionStatus}</p>
              </motion.div>
            )}

            {/* Interviewing Stage */}
            {stage === "interviewing" && (
              <motion.div
                key="interviewing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8"
              >
                {/* Timer */}
                <div className="text-2xl font-mono mb-6 text-muted-foreground">
                  {formatTime(elapsedTime)}
                </div>

                {/* Voice visualization */}
                <div className="relative mb-8">
                  {/* AI Avatar */}
                  <motion.div
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isAISpeaking 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}
                    animate={isAISpeaking ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 1.5 }}
                  >
                    <Sparkles className="h-10 w-10" />
                  </motion.div>

                  {/* User speaking indicator */}
                  {isUserSpeaking && (
                    <motion.div
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      <Mic className="h-4 w-4 text-white" />
                    </motion.div>
                  )}
                </div>

                {/* Status */}
                <p className="text-sm text-muted-foreground mb-2">
                  {isAISpeaking ? "GENTIA está falando..." : isUserSpeaking ? "Você está falando..." : "Aguardando..."}
                </p>

                {questionsCount > 0 && (
                  <p className="text-xs text-muted-foreground mb-6">
                    {questionsCount} perguntas nesta entrevista
                  </p>
                )}

                {/* End call button */}
                <Button 
                  variant="destructive" 
                  size="lg"
                  onClick={endCall}
                  className="gap-2 rounded-full w-16 h-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Encerrar</p>
              </motion.div>
            )}

            {/* Processing Stage */}
            {stage === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="font-semibold mb-2">Analisando suas respostas...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Nosso algoritmo está calculando sua compatibilidade cultural
                </p>
              </motion.div>
            )}

            {/* Completed Stage — 3 variantes: aprovado / reprovado com retry / reprovado sem retry */}
            {stage === "completed" && (() => {
              const passed = score !== null && (minThreshold == null || score >= minThreshold);
              const canRetry = retryInfo?.canRetry === true;
              const variant: "approved" | "failed_retry" | "failed_final" = passed
                ? "approved"
                : canRetry
                  ? "failed_retry"
                  : "failed_final";

              const iconWrapperClass =
                variant === "approved"
                  ? "bg-green-100"
                  : variant === "failed_retry"
                    ? "bg-amber-100"
                    : "bg-red-100";

              const Icon =
                variant === "approved" ? CheckCircle2 : variant === "failed_retry" ? AlertCircle : XCircle;

              const iconClass =
                variant === "approved"
                  ? "text-green-600"
                  : variant === "failed_retry"
                    ? "text-amber-600"
                    : "text-red-600";

              const title =
                variant === "approved" ? "Entrevista Concluída!" : "Etapa não concluída com sucesso";

              const message =
                variant === "approved"
                  ? "Você avançou nesta etapa. Em breve entraremos em contato com os próximos passos."
                  : variant === "failed_retry"
                    ? "Sua entrevista foi analisada e o resultado ficou abaixo do esperado para esta vaga. Você tem mais 1 tentativa disponível caso queira tentar novamente."
                    : "Agradecemos sua participação. Nesta etapa não atingimos a compatibilidade necessária para avançar nesta vaga. Você receberá um e-mail e/ou WhatsApp com mais detalhes em instantes.";

              return (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8 w-full"
                >
                  <div className={`w-24 h-24 rounded-full ${iconWrapperClass} flex items-center justify-center mb-6`}>
                    <Icon className={`h-12 w-12 ${iconClass}`} />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-center px-4">{title}</h2>

                  {/* Score visível somente quando aprovado (mantém regra de privacidade) */}
                  {variant === "approved" && score !== null && (
                    <div className="mb-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Seu Score de Compatibilidade Cultural</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          score >= 70 ? "bg-green-500" :
                          score >= 40 ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <span className={`text-3xl font-bold ${
                          score >= 70 ? "text-green-600" :
                          score >= 40 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {Math.round(score)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-muted-foreground text-center mb-6 max-w-sm px-4">
                    {message}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Duração: {formatTime(elapsedTime)}
                  </p>

                  {variant === "failed_retry" ? (
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <Button
                        size="lg"
                        onClick={handleRetry}
                        className="gap-2 w-full"
                      >
                        <RotateCw className="h-4 w-4" />
                        Tentar novamente
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="gap-2 w-full"
                      >
                        Fechar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => onOpenChange(false)}
                      className="gap-2 w-full max-w-xs"
                    >
                      Fechar
                    </Button>
                  )}
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
