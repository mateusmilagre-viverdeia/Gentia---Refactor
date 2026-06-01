// Hardened response saver for voice interviews.
// - Up to 3 attempts with backoff (400ms, 1.2s, 3s)
// - Treats !response.ok as failure
// - On final failure: persists to localStorage AND fires a durable dead-letter event
//
// Used by CultureInterviewActive (technical interview saves the full transcript at the end,
// not per-question, so it does not need this helper today).

import { logVoiceInterviewEvent } from "./voiceInterviewTelemetry";

export interface SaveInterviewResponseInput {
  sessionId: string;
  sessionType: "cultural" | "technical";
  questionIndex: number;
  candidateResponse: string;
  aiQuestionSpoken: string | null;
  startSeconds: number;
  endSeconds: number;
}

export interface SaveInterviewResponseCoverage {
  covered: number;
  total: number;
  pendingCount: number;
  pendingQuestions: Array<{ index: number; question_text: string }>;
}

export interface SaveInterviewResponseResult {
  ok: boolean;
  attempts: number;
  status?: number;
  error?: string;
  coverage?: SaveInterviewResponseCoverage;
}

const FUNCTION_BY_TYPE: Record<"cultural" | "technical", string> = {
  cultural: "culture-interview-save-response",
  technical: "technical-interview-save-response",
};

const BACKOFFS_MS = [400, 1200, 3000];
const PENDING_KEY_PREFIX = "pendingInterviewResponses:";

function pendingKey(sessionId: string) {
  return `${PENDING_KEY_PREFIX}${sessionId}`;
}

function persistLocally(input: SaveInterviewResponseInput) {
  try {
    const key = pendingKey(input.sessionId);
    const raw = localStorage.getItem(key);
    const arr: SaveInterviewResponseInput[] = raw ? JSON.parse(raw) : [];
    arr.push(input);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // best-effort
  }
}

async function deadLetter(input: SaveInterviewResponseInput, errorInfo: string) {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-response-deadletter`;
    const blob = new Blob(
      [
        JSON.stringify({
          sessionId: input.sessionId,
          sessionType: input.sessionType,
          questionIndex: input.questionIndex,
          payload: {
            candidateResponse: input.candidateResponse,
            aiQuestionSpoken: input.aiQuestionSpoken,
            startSeconds: input.startSeconds,
            endSeconds: input.endSeconds,
            error: errorInfo,
            clientTs: new Date().toISOString(),
          },
        }),
      ],
      { type: "application/json" },
    );
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(url, blob);
    } else {
      // Fallback: fire-and-forget POST
      void fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: await blob.text(),
        keepalive: true,
      });
    }
  } catch (e) {
    console.warn("dead-letter failed", e);
  }
}

export async function saveInterviewResponse(
  input: SaveInterviewResponseInput,
): Promise<SaveInterviewResponseResult> {
  const fnName = FUNCTION_BY_TYPE[input.sessionType];
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`;
  const body = JSON.stringify({
    sessionId: input.sessionId,
    questionIndex: input.questionIndex,
    aiQuestionSpoken: input.aiQuestionSpoken,
    candidateResponse: input.candidateResponse,
    startSeconds: input.startSeconds,
    endSeconds: input.endSeconds,
  });

  let lastError = "";
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= BACKOFFS_MS.length + 1; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body,
      });
      lastStatus = res.status;

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && typeof json === "object" && "error" in json && json.error) {
          lastError = String((json as { error: unknown }).error);
        } else {
          logVoiceInterviewEvent({
            sessionId: input.sessionId,
            sessionType: input.sessionType,
            eventType: "response_saved",
            payload: { questionIndex: input.questionIndex, attempts: attempt },
          });
          const coverage = (json as { coverage?: SaveInterviewResponseCoverage })?.coverage;
          return { ok: true, attempts: attempt, status: res.status, coverage };
        }
      } else {
        lastError = `http_${res.status}`;
        // 4xx (except 429) are not retryable
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }

    const wait = BACKOFFS_MS[attempt - 1];
    if (wait) await new Promise((r) => setTimeout(r, wait));
  }

  // Final failure
  console.error("⚠️ saveInterviewResponse final failure", { lastError, lastStatus });
  persistLocally(input);
  await deadLetter(input, lastError);
  logVoiceInterviewEvent({
    sessionId: input.sessionId,
    sessionType: input.sessionType,
    eventType: "response_save_failed",
    payload: {
      questionIndex: input.questionIndex,
      attempts: BACKOFFS_MS.length + 1,
      error: lastError,
      status: lastStatus ?? null,
    },
  });
  return { ok: false, attempts: BACKOFFS_MS.length + 1, status: lastStatus, error: lastError };
}
