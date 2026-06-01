import { useRef, useCallback } from 'react';

export interface InterviewSessionMetrics {
  audioInputSeconds: number;
  audioOutputSeconds: number;
  audioInputTokens: number;
  audioOutputTokens: number;
  speechStartTime: number | null;
  audioOutputChunks: number;
}

/**
 * Hook to collect real-time audio metrics during WebRTC interviews
 * Used to track token consumption for cost analysis
 */
export function useInterviewMetrics() {
  const metricsRef = useRef<InterviewSessionMetrics>({
    audioInputSeconds: 0,
    audioOutputSeconds: 0,
    audioInputTokens: 0,
    audioOutputTokens: 0,
    speechStartTime: null,
    audioOutputChunks: 0,
  });

  /**
   * Call when user starts speaking (speech_started event)
   */
  const onSpeechStarted = useCallback(() => {
    metricsRef.current.speechStartTime = Date.now();
  }, []);

  /**
   * Call when user stops speaking (speech_stopped event)
   * Estimates tokens based on audio duration (~25 tokens/sec for input)
   */
  const onSpeechStopped = useCallback(() => {
    if (metricsRef.current.speechStartTime) {
      const durationMs = Date.now() - metricsRef.current.speechStartTime;
      const durationSec = durationMs / 1000;
      metricsRef.current.audioInputSeconds += durationSec;
      // OpenAI Realtime oficial: ~1 token / 100ms de áudio do usuário → ~10 tokens/seg
      metricsRef.current.audioInputTokens += Math.round(durationSec * 10);
      metricsRef.current.speechStartTime = null;
    }
  }, []);

  /**
   * Call when receiving audio output from AI (audio.delta event)
   * @param base64AudioChunk - The base64 encoded audio chunk from OpenAI
   */
  const onAudioOutput = useCallback((base64AudioChunk?: string) => {
    metricsRef.current.audioOutputChunks++;
    
    if (base64AudioChunk) {
      try {
        // Calculate audio duration from base64 chunk
        // OpenAI Realtime uses 24kHz, 16-bit PCM audio
        const binaryLength = atob(base64AudioChunk).length;
        const secondsOfAudio = binaryLength / (24000 * 2); // 24kHz * 2 bytes per sample
        metricsRef.current.audioOutputSeconds += secondsOfAudio;
        // OpenAI Realtime oficial: ~1 token / 50ms de áudio da IA → ~20 tokens/seg
        metricsRef.current.audioOutputTokens += Math.round(secondsOfAudio * 20);
      } catch (e) {
        // If decoding fails, estimate based on typical chunk size
        metricsRef.current.audioOutputSeconds += 0.1; // ~100ms per chunk typical
        metricsRef.current.audioOutputTokens += 5;
      }
    } else {
      // Fallback estimate per chunk
      metricsRef.current.audioOutputSeconds += 0.1;
      metricsRef.current.audioOutputTokens += 5;
    }
  }, []);

  /**
   * Call when receiving response.done with official usage stats from OpenAI.
   *
   * IMPORTANT: We do NOT overwrite the accumulated audioInputTokens /
   * audioOutputTokens with `usage.input_tokens` / `usage.output_tokens`.
   *
   * OpenAI's cumulative token counters mix audio + text + cached tokens and
   * historically inflated our measurement (root cause of the 240-minute
   * billing bug). Server-side billing now uses probed audio file duration
   * (ground truth) as the primary source — see
   * `_shared/computeInterviewDuration.ts`. Tokens stay here purely as a
   * local observability accumulator.
   *
   * If we ever need OpenAI's cumulative counts for cost analysis, read them
   * directly from `ai_execution_logs.metadata` server-side instead of
   * overwriting client state.
   */
  const onResponseDone = useCallback((_usage?: { input_tokens?: number; output_tokens?: number }) => {
    // no-op: see explanation above
  }, []);

  /**
   * Reset metrics for a new session
   */
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      audioInputSeconds: 0,
      audioOutputSeconds: 0,
      audioInputTokens: 0,
      audioOutputTokens: 0,
      speechStartTime: null,
      audioOutputChunks: 0,
    };
  }, []);

  /**
   * Get current metrics snapshot
   */
  const getMetrics = useCallback((): InterviewSessionMetrics => {
    return { ...metricsRef.current };
  }, []);

  return {
    onSpeechStarted,
    onSpeechStopped,
    onAudioOutput,
    onResponseDone,
    resetMetrics,
    getMetrics,
    metricsRef,
  };
}
