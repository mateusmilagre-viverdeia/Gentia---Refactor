import { Lightbulb } from "lucide-react";

/**
 * Bloco compacto de 2 dicas mostrado nas telas de introdução das
 * entrevistas de voz (Cultural e Técnica), calibrando a expectativa
 * do candidato antes de iniciar.
 *
 * Apenas frontend / copy. Não toca em VAD, prompt, watchdog ou backend.
 */
export function InterviewIntroTips() {
  return (
    <div
      role="note"
      className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Lightbulb className="h-4 w-4 text-primary" />
        Duas dicas importantes
      </h4>
      <ul className="text-sm text-foreground/90 space-y-2 list-disc list-inside marker:text-primary">
        <li>
          Se a entrevistadora avançar antes de você terminar, diga:{" "}
          <span className="italic">
            "Posso voltar para a pergunta anterior? Ainda não terminei."
          </span>
        </li>
        <li>
          Se ficar um pequeno silêncio (~3s) após sua resposta, é normal.
          Aguarde com calma que ela vai voltar a falar.
        </li>
      </ul>
    </div>
  );
}
