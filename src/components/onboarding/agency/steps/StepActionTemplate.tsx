import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, SkipForward, ExternalLink, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface StepActionTemplateProps {
  title: string;
  description: string;
  configurePath?: string;
  configureLabel?: string;
  alreadyDone?: boolean;
  saving?: boolean;
  onMarkDone: () => void;
  onSkip: () => void;
  children?: ReactNode;
}

/**
 * Template comum dos passos do wizard que apenas linkam para uma aba de Configurações.
 * Padrão: explicação + botão "Configurar agora" + "Marcar como concluído" + "Pular".
 */
export function StepActionTemplate({
  title,
  description,
  configurePath,
  configureLabel = "Configurar agora",
  alreadyDone,
  saving,
  onMarkDone,
  onSkip,
  children,
}: StepActionTemplateProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {alreadyDone && (
        <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="flex-1">
            <p className="font-medium">Detectamos que esta etapa já está pronta</p>
            <p className="text-muted-foreground text-xs mt-1">
              Você pode revisar a configuração ou marcar como concluído para seguir.
            </p>
          </div>
        </div>
      )}

      {children}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onSkip} disabled={saving}>
          <SkipForward className="h-4 w-4" />
          Pular
        </Button>

        <div className="flex items-center gap-2">
          {configurePath && (
            <Button variant="outline" asChild disabled={saving}>
              <Link to={configurePath} target="_blank" rel="noopener">
                <ExternalLink className="h-4 w-4" />
                {configureLabel}
              </Link>
            </Button>
          )}
          <Button onClick={onMarkDone} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Marcar como concluído
          </Button>
        </div>
      </div>
    </div>
  );
}
