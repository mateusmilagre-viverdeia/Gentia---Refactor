import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, Sparkles, ArrowRight, X } from "lucide-react";
import { TourRole } from "./tourSteps";

interface PulseOnboardingWelcomeProps {
  isOpen: boolean;
  role: TourRole;
  onStartTour: () => void;
  onSkip: () => void;
}

export const PulseOnboardingWelcome = ({
  isOpen,
  role,
  onStartTour,
  onSkip,
}: PulseOnboardingWelcomeProps) => {
  const getRoleDescription = () => {
    switch (role) {
      case "admin":
        return "Como administrador, você tem acesso a todas as funcionalidades do Pulse, incluindo configurações e métricas completas.";
      case "leader":
        return "Como líder, você pode acompanhar as métricas da sua equipe e criar planos de ação.";
      default:
        return "Responda perguntas diárias rápidas e acompanhe sua evolução ao longo do tempo.";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Animated header */}
            <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative">
                  <Activity className="h-16 w-16 text-primary" />
                  <motion.div
                    animate={{
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Decorative circles */}
              <motion.div
                animate={{
                  x: [0, 20, 0],
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-4 left-4 h-20 w-20 rounded-full bg-primary/5"
              />
              <motion.div
                animate={{
                  x: [0, -15, 0],
                  y: [0, 15, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute bottom-4 right-8 h-12 w-12 rounded-full bg-primary/10"
              />
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Bem-vindo ao Pulse!</h2>
                <p className="text-muted-foreground text-sm">
                  {getRoleDescription()}
                </p>
              </div>

              {/* Features list */}
              <div className="space-y-3 py-2">
                <FeatureItem
                  emoji="📊"
                  title="Perguntas Diárias"
                  description="Responda com emojis em menos de 1 minuto"
                />
                <FeatureItem
                  emoji="🔥"
                  title="Gamificação"
                  description="Ganhe pontos e mantenha sua sequência"
                />
                <FeatureItem
                  emoji="📈"
                  title="Acompanhe sua Evolução"
                  description="Visualize seu histórico e tendências"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={onStartTour}
                  className="w-full gap-2"
                  size="lg"
                >
                  Iniciar Tour
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={onSkip}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  Pular por agora
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const FeatureItem = ({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3">
    <span className="text-xl">{emoji}</span>
    <div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);
