import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, LogOut, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type InterviewGateState =
  | { kind: "ready" }
  | { kind: "starting" }
  | { kind: "loading_identity" }
  | { kind: "application_missing"; hasEmail: boolean; canLink: boolean }
  | { kind: "identity_missing"; hasEmail: boolean; canLink: boolean }
  | { kind: "error"; message: string };

interface Props {
  state: InterviewGateState;
  onRetry?: () => void;
  onLinkCandidate?: () => Promise<void> | void;
}

/**
 * Mensagem clara para o candidato quando o botão de iniciar entrevista
 * não está pronto. Garante que nunca exista botão cinza sem justificativa.
 */
export function InterviewStartGateMessage({ state, onRetry, onLinkCandidate }: Props) {
  const [linking, setLinking] = useState(false);

  if (state.kind === "ready" || state.kind === "starting") return null;

  if (state.kind === "loading_identity") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando seus dados...
      </div>
    );
  }

  const isMissing = state.kind === "identity_missing" || state.kind === "application_missing";
  const canLink = isMissing && state.canLink && !!onLinkCandidate;
  const title = state.kind === "application_missing"
    ? "Sua candidatura ainda não foi registrada nesta vaga"
    : isMissing
    ? "Não conseguimos identificar seu cadastro nesta vaga"
    : "Não conseguimos preparar a entrevista";
  const description = state.kind === "application_missing"
    ? canLink
      ? "Vamos vincular sua candidatura a esta vaga antes de iniciar o teste. Clique para tentar novamente ou recarregue a página."
      : "Recarregue a página; se persistir, saia e entre novamente com o mesmo e-mail usado na candidatura."
    : isMissing
    ? state.hasEmail
      ? canLink
        ? "Isto pode acontecer logo após a etapa ser liberada pelo recrutador. Você pode vincular seu cadastro a esta vaga agora, recarregar a página, ou sair e entrar novamente."
        : "Isto pode acontecer logo após a etapa ser liberada pelo recrutador. Tente recarregar; se persistir, saia e entre novamente com o mesmo e-mail usado na candidatura."
      : "Sua sessão está sem e-mail válido. Saia e entre novamente para que possamos vincular seu cadastro a esta vaga."
    : (state as { kind: "error"; message: string }).message;

  const handleLink = async () => {
    if (!onLinkCandidate) return;
    try {
      setLinking(true);
      await onLinkCandidate();
    } finally {
      setLinking(false);
    }
  };

  return (
    <Alert variant="destructive" className="mt-3">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <div className="flex flex-wrap gap-2">
          {canLink && (
            <Button size="sm" variant="default" onClick={handleLink} disabled={linking}>
              {linking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Vincular meu cadastro a esta vaga
            </Button>
          )}
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={linking}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={linking}
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/candidato/login";
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair e entrar novamente
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
