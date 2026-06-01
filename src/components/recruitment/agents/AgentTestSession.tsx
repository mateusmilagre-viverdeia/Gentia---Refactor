import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, PhoneOff, Bot, User, Loader2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  ephemeralToken: string;
  agentName: string;
  agentType: string;
  companyName: string;
  onEnd: () => void;
}

/**
 * Componente de demonstração de agente — usa WebRTC direto com OpenAI Realtime
 * (mesmo padrão de CultureInterviewActive), porém sem persistir nada no banco.
 */
export function AgentTestSession({ ephemeralToken, agentName, agentType, companyName, onEnd }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [status, setStatus] = useState("Conectando...");
  const [transcript, setTranscript] = useState<Array<{ who: "ai" | "you"; text: string }>>([]);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef(Date.now());
  const aiBufRef = useRef("");
  const youBufRef = useRef("");

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const cleanup = useCallback(() => {
    dcRef.current?.close(); dcRef.current = null;
    pcRef.current?.close(); pcRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
      audioElRef.current.parentNode?.removeChild(audioElRef.current);
      audioElRef.current = null;
    }
  }, []);

  const handleEnd = useCallback(() => {
    cleanup();
    onEnd();
  }, [cleanup, onEnd]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // audio element
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.setAttribute("playsinline", "true");
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
        audioElRef.current = audioEl;

        setStatus("Solicitando microfone...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        setStatus("Conectando à IA...");
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.ontrack = (e) => { if (audioElRef.current) audioElRef.current.srcObject = e.streams[0]; };
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.addEventListener("open", () => {
          setIsConnected(true);
          setStatus("Conectado");
        });
        dc.addEventListener("message", (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "response.audio.delta" || msg.type === "response.output_audio.delta") {
              setIsAISpeaking(true);
            } else if (msg.type === "response.done" || msg.type === "response.audio.done" || msg.type === "response.output_audio.done") {
              setIsAISpeaking(false);
              if (aiBufRef.current.trim()) {
                setTranscript(prev => [...prev, { who: "ai", text: aiBufRef.current.trim() }]);
                aiBufRef.current = "";
              }
            } else if (msg.type === "response.audio_transcript.delta" || msg.type === "response.output_audio_transcript.delta") {
              aiBufRef.current += msg.delta || "";
            } else if (msg.type === "conversation.item.input_audio_transcription.completed") {
              const t = (msg.transcript || "").trim();
              if (t) setTranscript(prev => [...prev, { who: "you", text: t }]);
            }
          } catch {}
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls?model=gpt-realtime-mini", {
          method: "POST",
          body: offer.sdp,
          headers: {
            "Authorization": `Bearer ${ephemeralToken}`,
            "Content-Type": "application/sdp",
          },
        });
        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        console.error("AgentTestSession error:", err);
        setStatus("Erro ao conectar. Recarregue a página.");
      }
    })();

    return () => { cancelled = true; cleanup(); };
  }, [ephemeralToken, cleanup]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold">{agentName}</span>
                <Badge variant="secondary">{agentType}</Badge>
                <Badge variant="outline" className="bg-warning/10">DEMO</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{companyName} · {status}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {mins}:{secs}
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 py-6 border rounded-lg bg-muted/20">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={isAISpeaking ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 0.8 }}
                className={`h-16 w-16 rounded-full flex items-center justify-center ${isAISpeaking ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <Bot className="h-8 w-8" />
              </motion.div>
              <span className="text-xs">Agente {isAISpeaking ? "falando" : "ouvindo"}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isConnected ? "bg-success/20" : "bg-muted"}`}>
                <Mic className="h-8 w-8" />
              </div>
              <span className="text-xs">Você</span>
            </div>
          </div>

          {!isConnected && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {status}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleEnd}>
              <PhoneOff className="h-4 w-4 mr-2" /> Encerrar teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {transcript.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Transcrição ao vivo</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {transcript.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${t.who === "you" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${t.who === "you" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="flex items-center gap-1 mb-1 opacity-80 text-xs">
                        {t.who === "you" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        {t.who === "you" ? "Você" : "Agente"}
                      </div>
                      {t.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
