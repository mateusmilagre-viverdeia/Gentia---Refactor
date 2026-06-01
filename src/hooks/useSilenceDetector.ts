import { useEffect, useRef, useState } from "react";

/**
 * Detecta silêncio prolongado em um MediaStream local (microfone).
 * Útil para mostrar feedback ao candidato ("a IA está aguardando você").
 *
 * - Usa Web Audio API (AnalyserNode + RMS).
 * - Não interfere no áudio enviado ao WebRTC; apenas escuta em paralelo.
 * - Considera silêncio quando o RMS fica abaixo de `threshold` por `silenceMs` contínuos.
 */
export function useSilenceDetector(
  stream: MediaStream | null,
  options: { silenceMs?: number; threshold?: number; enabled?: boolean } = {}
) {
  const { silenceMs = 2000, threshold = 0.015, enabled = true } = options;
  const [isSilent, setIsSilent] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !enabled) {
      setIsSilent(false);
      return;
    }

    let cancelled = false;
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx: AudioContext = new AudioCtx();
    audioCtxRef.current = ctx;

    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch {
      return;
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buf = new Float32Array(analyser.fftSize);

    const tick = () => {
      if (cancelled) return;
      analyser.getFloatTimeDomainData(buf);

      // RMS
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);

      const now = performance.now();
      if (rms < threshold) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
        } else if (now - silenceStartRef.current >= silenceMs) {
          if (!isSilent) setIsSilent(true);
        }
      } else {
        silenceStartRef.current = null;
        if (isSilent) setIsSilent(false);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // noop
      }
      ctx.close().catch(() => {
        // noop
      });
      audioCtxRef.current = null;
      silenceStartRef.current = null;
      setIsSilent(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, enabled, silenceMs, threshold]);

  return isSilent;
}
