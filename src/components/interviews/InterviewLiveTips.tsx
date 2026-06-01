import { Lightbulb } from "lucide-react";

/**
 * Card de dicas exibido durante a entrevista de voz ativa
 * (Cultural e Técnica). Sempre visível em mobile e desktop.
 *
 * Apenas frontend / copy. Não toca em VAD, prompt, watchdog, telemetria
 * ou qualquer pilar blindado da arquitetura de voz.
 */
export function InterviewLiveTips() {
  return (
    <div
      role="note"
      className="rounded-lg border border-border bg-muted/40 px-4 py-3"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lightbulb className="h-4 w-4 text-primary" />
        Dicas durante a entrevista
      </div>
      <ul className="text-sm text-foreground/90 space-y-2 mt-2">
        <li>
          <span className="font-medium">Se ela te interromper:</span> diga{" "}
          <span className="italic">
            "Posso voltar para a pergunta anterior? Ainda não terminei."
          </span>
        </li>
        <li>
          <span className="font-medium">
            Se ficar um pequeno silêncio (~3s):
          </span>{" "}
          é normal. Aguarde com calma que ela vai voltar a falar.
        </li>
      </ul>
    </div>
  );
}
