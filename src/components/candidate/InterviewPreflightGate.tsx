import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  getBrowserDiagnostics,
  type BrowserDiagnostics,
} from "@/lib/interviewConnectionDiagnostics";

interface InterviewPreflightGateProps {
  children: React.ReactNode;
}

/**
 * Blocks the interview UI when the browser environment can't reliably host
 * a WebRTC realtime call:
 *  - in-app WebView (Instagram, LinkedIn, Gmail, TikTok, ...)
 *  - non-secure context (no HTTPS)
 *  - missing mediaDevices / getUserMedia API
 *
 * Catching these BEFORE the candidate clicks "Iniciar Conversa" prevents
 * the orphan in_progress session and the confusing post-click error.
 */
export function InterviewPreflightGate({
  children,
}: InterviewPreflightGateProps) {
  const diag = useMemo<BrowserDiagnostics>(() => getBrowserDiagnostics(), []);
  const [overridden, setOverridden] = useState(false);

  // Lightweight logging so we can see in console (and later, voice_interview_events)
  // when the gate fires.
  useEffect(() => {
    if (diag.isInAppBrowser || !diag.isSecureContext || !diag.hasMediaDevices) {
      console.warn("⚠️ Interview preflight gate triggered", diag);
    }
  }, [diag]);

  const blocked =
    !overridden &&
    (diag.isInAppBrowser || !diag.isSecureContext || !diag.hasMediaDevices);

  if (!blocked) return <>{children}</>;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado! Cole no Chrome ou Safari.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o endereço manualmente.");
    }
  };

  let title = "Navegador não suportado";
  let description =
    "Detectamos um problema no ambiente que vai impedir a gravação de áudio. Resolva o ponto abaixo antes de iniciar a entrevista.";
  let detail = "";

  if (diag.isInAppBrowser) {
    title = `Abra fora do ${diag.inAppName ?? "aplicativo"}`;
    description = `Você está no navegador interno do ${
      diag.inAppName ?? "aplicativo"
    }, que bloqueia o microfone. Copie o link e abra em ${
      diag.isIOS ? "Safari" : "Chrome"
    } para fazer a entrevista.`;
    detail = "Toque nos 3 pontinhos no canto da tela e escolha \"Abrir no navegador\".";
  } else if (!diag.isSecureContext) {
    title = "Conexão sem HTTPS";
    description =
      "Esta página precisa ser acessada via HTTPS para usar o microfone. Verifique o endereço e tente novamente.";
  } else if (!diag.hasMediaDevices) {
    title = "Navegador desatualizado";
    description =
      "Seu navegador não suporta gravação de áudio. Atualize para a versão mais recente do Chrome ou Safari.";
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-6 px-2 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        {diag.isInAppBrowser ? (
          <ShieldAlert className="h-8 w-8 text-destructive" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-destructive" />
        )}
      </div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      {detail && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 mb-4">
          {detail}
        </p>
      )}

      <div className="w-full space-y-2">
        <Button onClick={copyLink} className="w-full gap-2" size="lg">
          <Copy className="h-4 w-4" />
          Copiar link da entrevista
        </Button>
        {diag.isInAppBrowser && (
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full"
          >
            <Button variant="outline" className="w-full gap-2" size="lg">
              <ExternalLink className="h-4 w-4" />
              Tentar abrir em outro navegador
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setOverridden(true)}
        >
          Continuar mesmo assim (não recomendado)
        </Button>
      </div>

      <details className="mt-4 text-left text-xs text-muted-foreground w-full">
        <summary className="cursor-pointer">Detalhes técnicos</summary>
        <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto">
{JSON.stringify(diag, null, 2)}
        </pre>
      </details>
    </div>
  );
}
