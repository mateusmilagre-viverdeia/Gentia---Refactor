import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { logVoiceInterviewEvent } from "@/lib/voiceInterviewTelemetry";
import { 
  Mic, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Phone,
  PhoneOff,
  Code,
  User,
  Bot,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface TechnicalInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  accountId: string;
  candidateId?: string;
  candidateProfileId?: string;
  candidateName: string;
  companyName: string;
  jobTitle: string;
  minThreshold?: number;
  onComplete: (score: number, recommendation: string) => void;
}

type InterviewStage = "intro" | "connecting" | "interviewing" | "processing" | "completed";

export function TechnicalInterviewModal({
  open,
  onOpenChange,
  jobId,
  accountId,
  candidateId,
  candidateProfileId,
  candidateName,
  companyName,
  jobTitle,
  onComplete,
  minThreshold,
}: TechnicalInterviewModalProps) {
  const [stage, setStage] = useState<InterviewStage>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
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
  const transcriptRef = useRef<string>("");
  const activeResponseIdRef = useRef<string | null>(null);

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

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

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

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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
      setTranscript("");
      setElapsedTime(0);
      setScore(null);
      setRecommendation("");
      setSkills([]);
      setInterviewCompletionDetected(false);
      audioChunksRef.current = [];
    }
  }, [open]);

  const cleanupConnection = useCallback(() => {
    console.log("🧹 Cleaning up connection...");
    
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
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }
  }, []);

  const setupAudioRecording = useCallback((micStream: MediaStream, aiAudioElement: HTMLAudioElement) => {
    try {
      console.log("🎙️ Setting up combined audio recording...");
      
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      
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
      
      aiAudioElement.addEventListener('loadedmetadata', connectAIAudio);
      connectAIAudio();
      
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
      
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      
      console.log("✅ Audio recording started");
    } catch (error) {
      console.error("❌ Error setting up audio recording:", error);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startInterview = async () => {
    try {
      setStage("connecting");
      setConnectionStatus("Solicitando permissão do microfone...");
      console.log("🎤 Starting technical interview...");

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
        toast.error("Permissão do microfone negada. Por favor, permita o acesso ao microfone.");
        setStage("intro");
        return;
      }
      
      mediaStreamRef.current = stream;
      console.log("✅ Microphone permission granted");

      setConnectionStatus("Conectando ao servidor...");

      // Get ephemeral token from edge function
      console.log("🔑 Requesting ephemeral token...");
      const tokenResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-interview-session`,
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
            candidateId,
            candidateProfileId,
            candidateName,
            companyName,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("❌ Token error:", errorData);
        toast.error(errorData.message || "Erro ao conectar. Tente novamente.");
        cleanupConnection();
        setStage("intro");
        return;
      }

      const { ephemeralToken, sessionId: newSessionId, skills: skillsList } = await tokenResponse.json();
      console.log("✅ Ephemeral token received");
      console.log("✅ Session ID:", newSessionId);
      console.log("✅ Skills:", skillsList);

      setSessionId(newSessionId);
      setSkills(skillsList || []);

      setConnectionStatus("Estabelecendo conexão de áudio...");

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // Add audio track from microphone
      stream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, stream);
        console.log("✅ Audio track added:", track.label);
      });

      // Handle incoming audio from AI
      pc.ontrack = (event) => {
        console.log("🔊 Received audio track from AI");
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
          audioElementRef.current.play().catch(e => console.error("Audio play error:", e));
          
          // Setup combined audio recording (mic + AI)
          setupAudioRecording(stream, audioElementRef.current);
        }
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
        toast.error("Erro ao conectar com a IA. Tente novamente.");
        cleanupConnection();
        setStage("intro");
        return;
      }

      const answerSdp = await sdpResponse.text();
      console.log("✅ Received SDP answer from OpenAI");

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
      console.log("✅ Remote description set");

      setStage("interviewing");
      startTimeRef.current = Date.now();
      console.log("🎙️ Technical interview started!");

    } catch (error) {
      console.error("❌ Unexpected error starting interview:", error);
      toast.error("Erro ao iniciar a entrevista técnica.");
      setStage("intro");
      cleanupConnection();
    }
  };

  const handleRealtimeEvent = (event: any) => {
    if (event.type !== "response.audio.delta") {
      console.log("📨 Realtime event:", event.type);
    }

    switch (event.type) {
      case "response.created":
        activeResponseIdRef.current = event.response?.id || "active";
        setIsAISpeaking(true);
        break;

      case "response.audio.done":
      case "response.audio_transcript.done":
        setIsAISpeaking(false);
        if (event.transcript) {
          console.log("🤖 AI said:", event.transcript);
          setTranscript(prev => prev + `\nEntrevistador: ${event.transcript}`);
          
          // Check for completion
          const lowerTranscript = event.transcript.toLowerCase();
          const completionPhrases = [
            "pode clicar em encerrar",
            "muito obrigado pela conversa",
            "desejo boa sorte",
            "finalizamos nossa conversa",
          ];
          
          const isComplete = completionPhrases.some(phrase => lowerTranscript.includes(phrase));
          if (isComplete && stageRef.current === "interviewing") {
            console.log("🏁 Interview completion detected!");
            completionDetectedRef.current = true;
            setInterviewCompletionDetected(true);
          }
        }
        break;

      case "response.done":
      case "response.cancelled":
        activeResponseIdRef.current = null;
        setIsAISpeaking(false);
        break;

      case "error":
        if (isBenignRealtimeError(event.error)) {
          console.warn("⚠️ Suppressed benign Realtime error:", event.error);
          activeResponseIdRef.current = null;
          if (sessionIdRef.current) {
            logVoiceInterviewEvent({
              sessionId: sessionIdRef.current,
              sessionType: "technical",
              eventType: "realtime_error_suppressed",
              payload: { code: event.error?.code, message: event.error?.message },
            });
          }
        } else {
          console.error("❌ Realtime error:", event.error);
          toast.error("Erro na conexão: " + (event.error?.message || "Erro desconhecido"));
        }
        break;

      case "input_audio_buffer.speech_started":
        setIsUserSpeaking(true);
        break;

      case "input_audio_buffer.speech_stopped":
        setIsUserSpeaking(false);
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          console.log("👤 User said:", event.transcript);
          setTranscript(prev => prev + `\nCandidato: ${event.transcript}`);
        }
        break;
    }
  };

  // Stop MediaRecorder and wait for the final ondataavailable/onstop flush.
  // Must run BEFORE cleanupConnection() (closes AudioContext) to keep last chunk.
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
      setTimeout(finish, 2000);
      try { r.stop(); } catch { finish(); }
    });

  const uploadAudioBlob = async (sid: string, audioBlob: Blob) => {
    const t0 = Date.now();
    console.log(`📤 Uploading technical audio (${audioBlob.size} bytes)...`);
    logVoiceInterviewEvent({
      sessionId: sid,
      sessionType: "technical",
      eventType: "audio_upload_started",
      payload: { size: audioBlob.size, mimeType: audioBlob.type },
    });

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
        logVoiceInterviewEvent({
          sessionId: sid,
          sessionType: "technical",
          eventType: "audio_upload_failed",
          payload: { status: response.status, errorMessage: errText.slice(0, 500), blobSize: audioBlob.size },
        });
      } else {
        const result = await response.json();
        console.log("✅ Audio uploaded:", result);
        logVoiceInterviewEvent({
          sessionId: sid,
          sessionType: "technical",
          eventType: "audio_upload_succeeded",
          payload: { size: audioBlob.size, durationMs: Date.now() - t0 },
        });
      }
    } catch (error) {
      console.error("❌ Error uploading audio:", error);
      logVoiceInterviewEvent({
        sessionId: sid,
        sessionType: "technical",
        eventType: "audio_upload_failed",
        payload: { errorMessage: error instanceof Error ? error.message : "unknown", blobSize: audioBlob.size },
      });
    }
  };

  const endInterview = async () => {
    if (stageRef.current !== "interviewing" || !sessionIdRef.current) return;

    console.log("🛑 Ending technical interview...");
    setStage("processing");

    const currentSessionId = sessionIdRef.current;
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // 1. Flush recorder BEFORE cleanup
    const audioBlob = await stopRecorderAndFlush();
    console.log(`🎙️ Final technical audio blob: ${audioBlob ? `${audioBlob.size} bytes` : "null"}`);

    // 2. Now tear down WebRTC/AudioContext
    cleanupConnection();

    // 3. Fire-and-forget upload
    if (audioBlob && audioBlob.size > 0) {
      uploadAudioBlob(currentSessionId, audioBlob).catch((e) =>
        console.error("❌ Upload promise rejected:", e),
      );
    } else {
      logVoiceInterviewEvent({
        sessionId: currentSessionId,
        sessionType: "technical",
        eventType: "audio_upload_failed",
        payload: { reason: "empty_blob", blobSize: 0 },
      });
    }


    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-interview-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            sessionId: currentSessionId,
            transcript: transcriptRef.current,
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
        throw new Error("Failed to complete interview");
      }

      const result = await response.json();
      console.log("✅ Interview result:", result);

      setScore(result.overallScore);
      setRecommendation(result.recommendation);
      setStage("completed");
      
      onComplete(result.overallScore, result.recommendation);
    } catch (error) {
      console.error("❌ Error completing interview:", error);
      toast.error("Erro ao processar a entrevista. A avaliação será feita manualmente.");
      onOpenChange(false);
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case "recommended": return { label: "Recomendado", color: "bg-green-500" };
      case "conditional": return { label: "Com Ressalvas", color: "bg-yellow-500" };
      case "not_recommended": return { label: "Não Recomendado", color: "bg-red-500" };
      default: return { label: rec, color: "bg-muted" };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <audio ref={audioElementRef} autoPlay playsInline />
        
        <AnimatePresence mode="wait">
          {/* Intro Stage */}
          {stage === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <DialogTitle>Entrevista Técnica</DialogTitle>
                </div>
                <DialogDescription>
                  Avaliação técnica por voz com IA adaptativa para a vaga de {jobTitle}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    Como funciona
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      A IA fará perguntas técnicas baseadas nas competências da vaga
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      As perguntas se adaptam conforme suas respostas
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Duração estimada: 15-25 minutos
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Fale naturalmente, como em uma conversa técnica
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>Importante:</strong> Certifique-se de estar em um ambiente silencioso 
                    e com boa conexão de internet.
                  </p>
                </div>

                <Button 
                  onClick={startInterview}
                  className="w-full"
                  size="lg"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Iniciar Entrevista Técnica
                </Button>
              </div>
            </motion.div>
          )}

          {/* Connecting Stage */}
          {stage === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 flex flex-col items-center justify-center min-h-[400px]"
            >
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">{connectionStatus}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde enquanto preparamos sua entrevista...
              </p>
            </motion.div>
          )}

          {/* Interviewing Stage */}
          {stage === "interviewing" && (
            <motion.div
              key="interviewing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <Phone className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="font-medium">Entrevista em andamento</span>
                </div>
                <Badge variant="outline">{formatTime(elapsedTime)}</Badge>
              </div>


              {/* Speaking indicators */}
              <div className="flex justify-center gap-8 py-8">
                <div className="text-center">
                  <motion.div
                    animate={{
                      scale: isAISpeaking ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 0.5 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      isAISpeaking ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"
                    }`}
                  >
                    <Bot className={`h-8 w-8 ${isAISpeaking ? "text-primary" : "text-muted-foreground"}`} />
                  </motion.div>
                  <p className="text-sm font-medium">Entrevistador</p>
                  <p className="text-xs text-muted-foreground">
                    {isAISpeaking ? "Falando..." : "Ouvindo"}
                  </p>
                </div>

                <div className="text-center">
                  <motion.div
                    animate={{
                      scale: isUserSpeaking ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ repeat: isUserSpeaking ? Infinity : 0, duration: 0.5 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      isUserSpeaking ? "bg-green-500/20 ring-2 ring-green-500" : "bg-muted"
                    }`}
                  >
                    <User className={`h-8 w-8 ${isUserSpeaking ? "text-green-500" : "text-muted-foreground"}`} />
                  </motion.div>
                  <p className="text-sm font-medium">Você</p>
                  <p className="text-xs text-muted-foreground">
                    {isUserSpeaking ? "Falando..." : "Microfone ativo"}
                  </p>
                </div>
              </div>

              {/* End button */}
              <div className="flex justify-center mt-6">
                <Button
                  onClick={endInterview}
                  variant={interviewCompletionDetected ? "default" : "outline"}
                  size="lg"
                  className={interviewCompletionDetected ? "animate-pulse" : ""}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  {interviewCompletionDetected ? "Clique para encerrar" : "Encerrar entrevista"}
                </Button>
              </div>

              {interviewCompletionDetected && (
                <p className="text-center text-sm text-green-600 mt-2">
                  A IA finalizou. Clique no botão acima para encerrar.
                </p>
              )}
            </motion.div>
          )}

          {/* Processing Stage */}
          {stage === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 flex flex-col items-center justify-center min-h-[400px]"
            >
              <Sparkles className="h-12 w-12 text-primary animate-pulse mb-4" />
              <p className="text-lg font-medium">Analisando suas respostas...</p>
              <p className="text-sm text-muted-foreground mt-2">
                A IA está avaliando suas competências técnicas
              </p>
            </motion.div>
          )}

          {/* Completed Stage */}
          {stage === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Entrevista Concluída!</h3>
                <p className="text-muted-foreground mt-1">
                  Obrigado por participar, {candidateName.split(" ")[0]}!
                </p>
              </div>

              {score !== null && (minThreshold == null || score >= minThreshold) && (
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Score Técnico</span>
                    <span className="text-2xl font-bold">{Math.round(score)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  {recommendation && (
                    <div className="mt-3 flex justify-center">
                      <Badge className={getRecommendationLabel(recommendation).color}>
                        {getRecommendationLabel(recommendation).label}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mb-4">
                Você receberá um retorno sobre os próximos passos em breve.
              </p>

              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
