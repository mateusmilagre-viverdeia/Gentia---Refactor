import { useEffect, useRef, useState } from "react";

interface UseMicLevelMeterOptions {
  stream: MediaStream | null;
  enabled: boolean;
}

/**
 * Mede o nível de áudio (RMS normalizado 0..1) de um MediaStream em tempo real.
 *
 * Retorna:
 * - level: RMS instantâneo (suavizado, 0..1)
 * - peak: maior nível observado desde o último reset
 * - noiseFloor: média do RMS bruto durante os primeiros ~500ms (linha de base de ruído)
 * - variance: variância do RMS na janela recente (fala tem variância alta; ruído constante baixa)
 * - sustainedMs: tempo acumulado (ms) com RMS bruto >= SUSTAIN_THRESHOLD, com janela de tolerância
 *   para pequenas pausas (não zera ao primeiro silêncio)
 * - resetPeak(): zera todas as métricas para recomeçar a medição
 */
const NOISE_FLOOR_WINDOW_MS = 500;
const VARIANCE_WINDOW_SAMPLES = 60; // ~1s a 60fps
const SUSTAIN_THRESHOLD = 0.033; // RMS bruto; equivale a ~0.10 após compressão x3
const SUSTAIN_RESET_AFTER_MS = 2000; // silêncio >2s reseta a contagem

export function useMicLevelMeter({ stream, enabled }: UseMicLevelMeterOptions) {
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [noiseFloor, setNoiseFloor] = useState(0);
  const [variance, setVariance] = useState(0);
  const [sustainedMs, setSustainedMs] = useState(0);

  const peakRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Buffers de medição
  const noiseSumRef = useRef(0);
  const noiseCountRef = useRef(0);
  const noiseFloorRef = useRef(0);
  const startTsRef = useRef(0);
  const lastTickTsRef = useRef(0);
  const lastSpeechTsRef = useRef(0);
  const sustainedMsRef = useRef(0);
  const recentRmsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled || !stream) {
      setLevel(0);
      return;
    }

    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    // Safari/iOS e às vezes Chrome criam o AudioContext suspenso.
    // Sem resume(), getFloatTimeDomainData devolve só zeros e o teste nunca passa.
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    ctxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;

    const buffer = new Float32Array(analyser.fftSize);

    // Reset estado de medição
    peakRef.current = 0;
    noiseSumRef.current = 0;
    noiseCountRef.current = 0;
    noiseFloorRef.current = 0;
    sustainedMsRef.current = 0;
    recentRmsRef.current = [];
    startTsRef.current = performance.now();
    lastTickTsRef.current = startTsRef.current;
    lastSpeechTsRef.current = 0;
    setPeak(0);
    setNoiseFloor(0);
    setVariance(0);
    setSustainedMs(0);

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);
      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i++) {
        sumSquares += buffer[i] * buffer[i];
      }
      const rawRms = Math.sqrt(sumSquares / buffer.length); // 0..~1
      // Compressão suave para escala visual mais legível
      const normalized = Math.min(1, rawRms * 3);
      setLevel(normalized);

      const now = performance.now();
      const elapsed = now - startTsRef.current;
      const dt = now - lastTickTsRef.current;
      lastTickTsRef.current = now;

      // Calibração de noise floor (primeiros 500ms)
      if (elapsed <= NOISE_FLOOR_WINDOW_MS) {
        noiseSumRef.current += rawRms;
        noiseCountRef.current += 1;
        if (elapsed >= NOISE_FLOOR_WINDOW_MS - 16) {
          const floor = noiseCountRef.current > 0 ? noiseSumRef.current / noiseCountRef.current : 0;
          noiseFloorRef.current = floor;
          setNoiseFloor(floor);
        }
      } else {
        // Sustentação: conta tempo com sinal acima do threshold + acima do ruído
        const dynamicThreshold = Math.max(SUSTAIN_THRESHOLD, noiseFloorRef.current * 2.5);
        if (rawRms >= dynamicThreshold) {
          sustainedMsRef.current += dt;
          lastSpeechTsRef.current = now;
          setSustainedMs(sustainedMsRef.current);
        } else if (
          lastSpeechTsRef.current > 0 &&
          now - lastSpeechTsRef.current > SUSTAIN_RESET_AFTER_MS
        ) {
          // Silêncio prolongado: reseta sustentação (candidato parou de falar)
          if (sustainedMsRef.current > 0) {
            sustainedMsRef.current = 0;
            setSustainedMs(0);
          }
        }

        // Variância em janela deslizante
        recentRmsRef.current.push(rawRms);
        if (recentRmsRef.current.length > VARIANCE_WINDOW_SAMPLES) {
          recentRmsRef.current.shift();
        }
        if (recentRmsRef.current.length >= 10) {
          const arr = recentRmsRef.current;
          const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
          const v = arr.reduce((s, x) => s + (x - mean) * (x - mean), 0) / arr.length;
          setVariance(v);
        }
      }

      if (normalized > peakRef.current) {
        peakRef.current = normalized;
        setPeak(normalized);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* noop */
      }
      void ctx.close().catch(() => {});
      ctxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, enabled]);

  const resetPeak = () => {
    peakRef.current = 0;
    noiseSumRef.current = 0;
    noiseCountRef.current = 0;
    noiseFloorRef.current = 0;
    sustainedMsRef.current = 0;
    recentRmsRef.current = [];
    lastSpeechTsRef.current = 0;
    setPeak(0);
    setNoiseFloor(0);
    setVariance(0);
    setSustainedMs(0);
  };

  return { level, peak, noiseFloor, variance, sustainedMs, resetPeak };
}
