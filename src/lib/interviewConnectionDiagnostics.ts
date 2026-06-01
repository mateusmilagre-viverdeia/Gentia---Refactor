// Helpers for diagnosing and reporting voice interview connection failures
// (microphone / WebRTC / OpenAI Realtime).

export type FailureReason =
  | "mic_permission_denied"
  | "mic_not_found"
  | "mic_not_readable"
  | "webview_blocked"
  | "token_request_failed"
  | "realtime_sdp_connection_failed"
  | "realtime_network_error"
  | "ice_connection_failed"
  | "unknown_connection_error";

export interface BrowserDiagnostics {
  userAgent: string;
  isInAppBrowser: boolean;
  inAppName: string | null;
  isIOS: boolean;
  isAndroid: boolean;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
}

export function getBrowserDiagnostics(): BrowserDiagnostics {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const lower = ua.toLowerCase();

  const inApps: Array<{ key: string; name: string }> = [
    { key: "instagram", name: "Instagram" },
    { key: "fbav", name: "Facebook" },
    { key: "fban", name: "Facebook" },
    { key: "linkedinapp", name: "LinkedIn" },
    { key: "tiktok", name: "TikTok" },
    { key: "musical_ly", name: "TikTok" },
    { key: "line/", name: "LINE" },
    { key: "micromessenger", name: "WeChat" },
    { key: "snapchat", name: "Snapchat" },
    { key: "twitter", name: "Twitter/X" },
    { key: "gsa/", name: "Google App" },
    // Gmail in-app webview (iOS) — best-effort.
    { key: "gmail", name: "Gmail" },
  ];

  let inAppName: string | null = null;
  for (const app of inApps) {
    if (lower.includes(app.key)) {
      inAppName = app.name;
      break;
    }
  }

  return {
    userAgent: ua,
    isInAppBrowser: inAppName !== null,
    inAppName,
    isIOS: /iphone|ipad|ipod/i.test(ua),
    isAndroid: /android/i.test(ua),
    isSecureContext:
      typeof window !== "undefined" ? !!window.isSecureContext : false,
    hasMediaDevices:
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function",
  };
}

export function classifyMicError(err: unknown): FailureReason {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return "mic_permission_denied";
    }
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
      return "mic_not_found";
    }
    if (err.name === "NotReadableError" || err.name === "AbortError") {
      return "mic_not_readable";
    }
  }
  return "mic_permission_denied";
}

export function getFriendlyErrorMessage(
  reason: FailureReason,
  diag: BrowserDiagnostics,
): string {
  if (diag.isInAppBrowser) {
    return `Detectamos que você abriu a entrevista dentro do ${
      diag.inAppName ?? "aplicativo"
    }. Esse navegador interno costuma bloquear o microfone. Toque nos 3 pontinhos e escolha "Abrir no Chrome" ou "Abrir no Safari", e tente novamente.`;
  }
  switch (reason) {
    case "mic_permission_denied":
      return "Permissão do microfone negada. Toque no cadeado ao lado do endereço, libere o microfone e tente novamente.";
    case "mic_not_found":
      return "Nenhum microfone foi encontrado. Conecte um microfone ou fone com microfone e tente novamente.";
    case "mic_not_readable":
      return "Seu microfone está em uso por outro aplicativo (WhatsApp, Zoom, Meet, etc). Feche os outros apps e tente novamente.";
    case "token_request_failed":
      return "Não foi possível preparar a entrevista no servidor. Verifique sua internet e tente novamente.";
    case "realtime_sdp_connection_failed":
    case "realtime_network_error":
    case "ice_connection_failed":
      return "Não conseguimos estabelecer a conexão de áudio com a IA. Isso pode ser bloqueio da rede (Wi‑Fi corporativo/VPN). Tente outra rede ou use dados móveis.";
    case "webview_blocked":
      return "Esse navegador embutido bloqueia o microfone. Abra o link em Chrome ou Safari.";
    default:
      return "Não foi possível iniciar a entrevista. Verifique sua internet e tente novamente.";
  }
}

export async function markInterviewFailed(
  sessionId: string,
  sessionType: "cultural" | "technical" | "disc",
  reason: FailureReason,
  diagnostics?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-interview-failed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ sessionId, sessionType, reason, diagnostics }),
      },
    );
  } catch (e) {
    console.warn("mark-interview-failed call failed:", e);
  }
}
