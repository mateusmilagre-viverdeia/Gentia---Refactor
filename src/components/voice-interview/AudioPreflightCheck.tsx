import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Volume2, CheckCircle2, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { useMicLevelMeter } from "@/hooks/useMicLevelMeter";
import {
  getBrowserDiagnostics,
  classifyMicError,
  getFriendlyErrorMessage,
} from "@/lib/interviewConnectionDiagnostics";
import {
  logVoiceInterviewEvent,
  type VoiceInterviewSessionType,
} from "@/lib/voiceInterviewTelemetry";

interface AudioPreflightCheckProps {
  sessionId: string;
  sessionType: VoiceInterviewSessionType;
  onReady: () => void;
  onCancel?: () => void;
}

type Step = "warn_inapp" | "speaker" | "mic" | "ready";

// Critérios de aprovação (em RMS bruto, antes da compressão x3)
// Afrouxados para evitar falso negativo com microfones que aplicam noise
// suppression/AGC agressivos (headsets bluetooth, AirPods, Chrome).
const MIN_PEAK_RAW = 0.025;
const REQUIRED_SUSTAINED_MS = 1500;
const MIN_TEST_DURATION_MS = 2000;
const MAX_TEST_DURATION_MS = 10000;
const MIN_VARIANCE = 0.00015;
const NOISE_FLOOR_CALIBRATION_MS = 500;

export function AudioPreflightCheck({
  sessionId,
  sessionType,
  onReady,
  onCancel,
}: AudioPreflightCheckProps) {
  const diag = useRef(getBrowserDiagnostics()).current;
  const [step, setStep] = useState<Step>(diag.isInAppBrowser ? "warn_inapp" : "speaker");
  const [speakerPlaying, setSpeakerPlaying] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micAttempts, setMicAttempts] = useState(0);
  const [micTesting, setMicTesting] = useState(false);
  const [micPassed, setMicPassed] = useState(false);
  const [testStartedAt, setTestStartedAt] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const finalizedRef = useRef(false);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);
  const networkCheckedRef = useRef(false);

  // STUN/WebRTC connectivity probe (silent, runs once on mount).
  // Detecta firewalls corporativos/VPN/proxy que bloqueiam UDP — causa comum
  // de entrevistas que "conectam" mas nunca trocam áudio.
  useEffect(() => {
    if (networkCheckedRef.current) return;
    networkCheckedRef.current = true;

    let pc: RTCPeerConnection | null = null;
    let timeoutId: number | null = null;
    let gotSrflx = false;
    let gotHost = false;

    const finish = (result: "ok" | "no_srflx" | "no_candidates" | "error", detail?: string) => {
      if (timeoutId) window.clearTimeout(timeoutId);
      try {
        pc?.close();
      } catch {
        /* noop */
      }
      logVoiceInterviewEvent({
        sessionId,
        sessionType,
        eventType: result === "ok" ? "preflight_network_ok" : "preflight_network_warn",
        payload: { result, detail, gotSrflx, gotHost },
      });
      if (result === "no_srflx" || result === "no_candidates") {
        setNetworkWarning(
          "Sua rede pode estar bloqueando chamadas em tempo real (firewall corporativo, VPN ou proxy). " +
            "Se possível, conecte-se a outra rede (4G/5G ou Wi-Fi residencial) antes de iniciar."
        );
      }
    };

    try {
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pc.createDataChannel("probe");
      pc.onicecandidate = (e) => {
        const c = e.candidate;
        if (!c) {
          // Coleta finalizada
          if (gotSrflx) finish("ok");
          else if (gotHost) finish("no_srflx");
          else finish("no_candidates");
          return;
        }
        const s = c.candidate || "";
        if (s.includes(" typ srflx")) gotSrflx = true;
        else if (s.includes(" typ host")) gotHost = true;
      };
      pc.createOffer()
        .then((offer) => pc!.setLocalDescription(offer))
        .catch((err) => finish("error", err instanceof Error ? err.message : "offer_failed"));
      timeoutId = window.setTimeout(() => {
        if (gotSrflx) finish("ok");
        else if (gotHost) finish("no_srflx");
        else finish("no_candidates");
      }, 5000);
    } catch (err) {
      finish("error", err instanceof Error ? err.message : "pc_failed");
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      try {
        pc?.close();
      } catch {
        /* noop */
      }
    };
  }, [sessionId, sessionType]);


  const { level, peak, noiseFloor, variance, sustainedMs, resetPeak } = useMicLevelMeter({
    stream: micStream,
    enabled: micTesting,
  });

  // Tick a cada 250ms para reavaliar critérios mesmo em silêncio (timeout)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!micTesting) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [micTesting]);

  useEffect(() => {
    if (step === "warn_inapp") {
      logVoiceInterviewEvent({
        sessionId,
        sessionType,
        eventType: "preflight_inapp_browser_warned",
        payload: { inAppName: diag.inAppName },
      });
    } else if (step === "speaker") {
      logVoiceInterviewEvent({ sessionId, sessionType, eventType: "preflight_started" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Avaliação contínua dos critérios de aprovação
  useEffect(() => {
    if (!micTesting || !testStartedAt || finalizedRef.current) return;
    const elapsed = Date.now() - testStartedAt;

    const dynamicPeakThreshold = Math.max(MIN_PEAK_RAW, noiseFloor * 4);
    // peak vem normalizado (x3); comparamos em escala bruta
    const peakRaw = peak / 3;

    const peakOk = peakRaw >= dynamicPeakThreshold;
    const sustainOk = sustainedMs >= REQUIRED_SUSTAINED_MS;
    const varianceOk = variance >= MIN_VARIANCE;
    const durationOk = elapsed >= MIN_TEST_DURATION_MS;

    if (peakOk && sustainOk && varianceOk && durationOk) {
      finalizedRef.current = true;
      logVoiceInterviewEvent({
        sessionId,
        sessionType,
        eventType: "mic_check_pass",
        payload: {
          peakRms: Number(peakRaw.toFixed(4)),
          noiseFloor: Number(noiseFloor.toFixed(4)),
          variance: Number(variance.toFixed(5)),
          sustainedMs: Math.round(sustainedMs),
          totalTestMs: elapsed,
          attempts: micAttempts + 1,
        },
      });
      // Pequeno delay para o usuário ver a barra ativa no momento do sucesso
      setMicPassed(true);
      setTimeout(() => {
        setMicTesting(false);
        stopMicStream();
      }, 400);
      return;
    }

    // Timeout duro
    if (elapsed >= MAX_TEST_DURATION_MS) {
      finalizedRef.current = true;
      let reason: string;
      if (peakRaw < noiseFloor * 2) reason = "no_signal";
      else if (!varianceOk && peakOk) reason = "constant_noise";
      else if (peakOk && !sustainOk) reason = "signal_too_short";
      else if (!peakOk && peakRaw > 0) reason = "signal_too_low";
      else reason = "no_signal";

      const friendly =
        reason === "no_signal"
          ? "Não detectamos áudio do seu microfone. Verifique se ele está conectado e sem mudo."
          : reason === "constant_noise"
            ? "Detectamos apenas ruído de fundo, não fala. Mude para um ambiente mais silencioso e tente novamente."
            : reason === "signal_too_short"
              ? "Você precisa falar por pelo menos 1,5 segundo sem pausar. Tente novamente."
              : "O volume captado está muito baixo. Aproxime-se do microfone e fale mais alto.";

      setMicTesting(false);
      setMicAttempts((n) => n + 1);
      setMicError(friendly);
      logVoiceInterviewEvent({
        sessionId,
        sessionType,
        eventType: "mic_check_fail",
        payload: {
          peakRms: Number(peakRaw.toFixed(4)),
          noiseFloor: Number(noiseFloor.toFixed(4)),
          variance: Number(variance.toFixed(5)),
          sustainedMs: Math.round(sustainedMs),
          totalTestMs: elapsed,
          attempts: micAttempts + 1,
          reason,
        },
      });
      stopMicStream();
    }
  }, [peak, sustainedMs, variance, noiseFloor, micTesting, testStartedAt, micAttempts, sessionId, sessionType]);

  function stopMicStream() {
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      setMicStream(null);
    }
  }

  function playBeep() {
    try {
      const AudioCtx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.0);
      setSpeakerPlaying(true);
      setTimeout(() => {
        setSpeakerPlaying(false);
        void ctx.close().catch(() => {});
        audioCtxRef.current = null;
      }, 1100);
    } catch {
      setSpeakerPlaying(false);
    }
  }

  function handleSpeakerOk() {
    logVoiceInterviewEvent({ sessionId, sessionType, eventType: "speaker_check_pass" });
    setStep("mic");
  }

  function handleSpeakerFail() {
    logVoiceInterviewEvent({ sessionId, sessionType, eventType: "speaker_check_fail" });
    // Não bloqueia — segue para o teste de mic
    setStep("mic");
  }

  async function handleStartMicTest() {
    setMicError(null);
    setMicPassed(false);
    finalizedRef.current = false;
    resetPeak();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setMicStream(stream);
      setMicTesting(true);
      setTestStartedAt(Date.now());
    } catch (err) {
      const reason = classifyMicError(err);
      setMicError(getFriendlyErrorMessage(reason, diag));
      logVoiceInterviewEvent({
        sessionId,
        sessionType,
        eventType:
          reason === "mic_permission_denied"
            ? "mic_permission_denied"
            : reason === "mic_not_found"
              ? "mic_not_found"
              : "mic_not_readable",
        payload: { errorName: err instanceof Error ? err.name : "unknown" },
      });
      setMicAttempts((n) => n + 1);
    }
  }

  function handleSkip() {
    stopMicStream();
    logVoiceInterviewEvent({
      sessionId,
      sessionType,
      eventType: "preflight_skipped_by_user",
      payload: {
        peakRms: Number((peak / 3).toFixed(4)),
        noiseFloor: Number(noiseFloor.toFixed(4)),
        sustainedMs: Math.round(sustainedMs),
        attempts: micAttempts,
      },
    });
    onReady();
  }

  function handleProceed() {
    stopMicStream();
    onReady();
  }

  // Estado derivado para UI
  const elapsedMs = testStartedAt ? Date.now() - testStartedAt : 0;
  const isCalibrating = micTesting && elapsedMs < NOISE_FLOOR_CALIBRATION_MS;
  const sustainPct = Math.min(100, (sustainedMs / REQUIRED_SUSTAINED_MS) * 100);
  const sustainSec = (sustainedMs / 1000).toFixed(1);

  // Step: aviso de in-app browser
  if (step === "warn_inapp") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-5">
            <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-amber-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Abra em outro navegador</h2>
              <p className="text-sm text-muted-foreground">
                Detectamos que você está no navegador interno do{" "}
                <strong>{diag.inAppName ?? "aplicativo"}</strong>. Esse navegador costuma
                bloquear o microfone e pode fazer a entrevista falhar.
              </p>
              <p className="text-sm text-muted-foreground">
                Toque nos 3 pontinhos no topo da tela e escolha{" "}
                <strong>"Abrir no Chrome"</strong> ou <strong>"Abrir no Safari"</strong>.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setStep("speaker")}>
              Continuar mesmo assim
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">Teste rápido de áudio</h2>
            <p className="text-sm text-muted-foreground">
              Em menos de 20s validamos seu som e microfone para evitar problemas durante a
              entrevista.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 text-xs">
            <div
              className={`flex items-center gap-1.5 ${
                step === "speaker" ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                  step === "speaker"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step === "mic" ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
              </div>
              Áudio
            </div>
            <div className="h-px w-8 bg-border" />
            <div
              className={`flex items-center gap-1.5 ${
                step === "mic" ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                  step === "mic"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              Microfone
            </div>
          </div>

          {networkWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-200">{networkWarning}</p>
            </div>
          )}

          {step === "speaker" && (

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-center">
                <Volume2 className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm">
                  Suba o volume do seu dispositivo e toque em <strong>"Tocar som"</strong>.
                  Você deve ouvir um bip curto.
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={playBeep}
                  disabled={speakerPlaying}
                >
                  {speakerPlaying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Tocando...
                    </>
                  ) : (
                    "Tocar som"
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleSpeakerFail}>
                  Não ouvi
                </Button>
                <Button onClick={handleSpeakerOk}>Ouvi, prosseguir</Button>
              </div>
            </div>
          )}

          {step === "mic" && (
            <div className="space-y-4">
              {/* Instrução clara antes do teste */}
              {!micTesting && !micPassed && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-medium">
                    Fale algo por <strong>cerca de 2 segundos</strong> sem pausar.
                  </p>
                  <p className="text-muted-foreground">
                    Sugestão: diga seu nome completo e a cidade onde mora.
                  </p>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-center">
                  <Mic className="h-5 w-5 text-primary shrink-0" />
                  <span>
                    {micPassed
                      ? "Microfone validado!"
                      : isCalibrating
                        ? "Calibrando ambiente, fique em silêncio..."
                        : micTesting
                          ? sustainedMs > 500
                            ? "Continue falando..."
                            : "Comece a falar agora"
                          : "Quando estiver pronto, clique abaixo e comece a falar."}
                  </span>
                </div>

                {/* Barra de volume (nível instantâneo) */}
                <div className="space-y-1">
                  <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        micPassed ? "bg-green-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.round(level * 100)}%` }}
                    />
                    {/* Marcador do piso de ruído */}
                    {noiseFloor > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-muted-foreground/60"
                        style={{ left: `${Math.min(100, noiseFloor * 3 * 100)}%` }}
                        title="Piso de ruído"
                      />
                    )}
                    {/* Marcador do pico */}
                    {peak > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-foreground/70"
                        style={{ left: `${Math.min(100, peak * 100)}%` }}
                        title="Pico"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Silêncio</span>
                    <span>Volume da sua voz</span>
                    <span>Alto</span>
                  </div>
                </div>

                {/* Contador de sustentação */}
                {micTesting && !isCalibrating && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fala sustentada</span>
                      <span className="font-mono font-medium">
                        {sustainSec}s / 1.5s
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-[width] duration-100"
                        style={{ width: `${sustainPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {micError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">{micError}</p>
                </div>
              )}

              {micPassed ? (
                <Button className="w-full" onClick={handleProceed}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Iniciar entrevista
                </Button>
              ) : micTesting ? (
                <Button className="w-full" disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isCalibrating ? "Calibrando..." : "Ouvindo... fale agora"}
                </Button>
              ) : (
                <Button className="w-full" onClick={handleStartMicTest}>
                  <Mic className="h-4 w-4 mr-2" />
                  {micAttempts === 0 ? "Estou pronto, iniciar teste" : "Tentar novamente"}
                </Button>
              )}

              {/* Saída segura: já na 1ª falha (ou enquanto testa há +6s) liberamos
                  pular o teste para não travar candidatos com mic funcionando. */}
              {(micAttempts >= 1 || (micTesting && elapsedMs > 6000)) && !micPassed && (
                <button
                  onClick={handleSkip}
                  className="w-full text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Meu microfone está funcionando — iniciar entrevista mesmo assim
                </button>
              )}
            </div>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="block w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
