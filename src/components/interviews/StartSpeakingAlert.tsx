import { Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StartSpeakingAlertProps {
  /** Mostra o alerta enquanto o intro está travado aguardando voz do candidato */
  visible: boolean;
  /** Frase exata que o candidato deve falar */
  phrase?: string;
  /** Subtexto contextual (Cultural vs Técnica) */
  subtitle?: string;
}

/**
 * Banner visual em destaque exibido no início da entrevista de voz,
 * orientando o candidato a falar para que a IA comece de fato.
 *
 * Apenas frontend — não altera prompt, VAD, coverage, watchdog ou
 * qualquer outro pilar blindado. Reforça visualmente a lógica de
 * `intro_locked` que já existe no backend de voz.
 */
export function StartSpeakingAlert({
  visible,
  phrase = "Estou pronto, pode começar",
  subtitle = "A entrevistadora está aguardando sua confirmação por voz para iniciar as perguntas.",
}: StartSpeakingAlertProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
          className="rounded-lg border-2 border-destructive/50 bg-destructive/10 px-4 py-3 sm:px-5 sm:py-4"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                <Mic className="h-5 w-5 text-destructive" />
              </motion.div>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-destructive sm:text-base">
                Fale agora para começar
              </p>
              <p className="text-sm text-foreground">
                Diga em voz alta:{" "}
                <span className="font-semibold">&ldquo;{phrase}&rdquo;</span>
              </p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
