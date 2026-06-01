import { motion, AnimatePresence } from "framer-motion";

interface WaitingIndicatorProps {
  visible: boolean;
}

/**
 * Pílula discreta e acolhedora que aparece quando o candidato fica em silêncio
 * e a IA também não está falando. Reforça que ele tem tempo para pensar.
 */
export function WaitingIndicator({ visible }: WaitingIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.25 }}
          className="flex justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <span className="flex items-center gap-1" aria-hidden>
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              />
            </span>
            <span>A IA está aguardando você terminar — pode pensar com calma</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
