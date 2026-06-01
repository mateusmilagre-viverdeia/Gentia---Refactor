import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flame, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { PulseUserStreak } from '@/types/pulse.types';

interface PulseCompletionCelebrationProps {
  streak: PulseUserStreak | null;
  pointsEarned?: number;
  onClose?: () => void;
}

const confettiColors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b'];

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: confettiColors[i % confettiColors.length],
            left: `${Math.random() * 100}%`,
            top: -20,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: [1, 1, 0],
            rotate: Math.random() * 720 - 360,
            x: Math.random() * 200 - 100,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function PulseCompletionCelebration({
  streak,
  pointsEarned = 10,
  onClose,
}: PulseCompletionCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const currentStreak = streak?.current_streak || 1;

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Determine celebration level
  const isNewRecord = streak && streak.current_streak > streak.longest_streak;
  const isMilestone = [7, 14, 30, 60, 90].includes(currentStreak);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {showConfetti && <Confetti />}

      <motion.div
        className="relative bg-card border rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        {/* Success icon */}
        <motion.div
          className="mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <div className="relative inline-flex items-center justify-center">
            <motion.div
              className="absolute inset-0 bg-green-500/20 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: 2 }}
            />
            <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          className="text-2xl md:text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isMilestone ? '🎉 Incrível!' : isNewRecord ? '🏆 Novo Recorde!' : 'Pulso Registrado!'}
        </motion.h2>

        <motion.p
          className="text-muted-foreground mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Sua resposta foi enviada com sucesso
        </motion.p>

        {/* Stats */}
        <motion.div
          className="flex items-center justify-center gap-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Streak */}
          <div className="text-center">
            <motion.div
              className={cn(
                'flex items-center justify-center gap-2 text-3xl font-bold',
                currentStreak >= 7 ? 'text-orange-500' : 'text-foreground'
              )}
              animate={currentStreak >= 7 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Flame className={cn(
                'h-8 w-8',
                currentStreak >= 30 ? 'text-purple-500' :
                currentStreak >= 14 ? 'text-orange-500' :
                currentStreak >= 7 ? 'text-yellow-500' : 'text-red-500'
              )} />
              <span>{currentStreak}</span>
            </motion.div>
            <p className="text-sm text-muted-foreground">
              {currentStreak === 1 ? 'dia' : 'dias'} consecutivos
            </p>
          </div>

          {/* Points */}
          <div className="text-center">
            <motion.div
              className="flex items-center justify-center gap-2 text-3xl font-bold text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
            >
              <Star className="h-8 w-8 fill-current" />
              <span>+{pointsEarned}</span>
            </motion.div>
            <p className="text-sm text-muted-foreground">pontos</p>
          </div>
        </motion.div>

        {/* Milestone badge */}
        <AnimatePresence>
          {isMilestone && (
            <motion.div
              className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <span className="text-2xl">
                {currentStreak >= 90 ? '👑' : 
                 currentStreak >= 30 ? '🏆' : 
                 currentStreak >= 14 ? '🥈' : '🥉'}
              </span>
              <span className="font-semibold">
                Conquista: {currentStreak} dias!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button asChild size="lg" className="w-full">
            <Link to="/retencao/pulse/history">
              Ver meu histórico
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          
          <Button variant="ghost" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </motion.div>

        {/* Motivational message */}
        <motion.p
          className="mt-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {currentStreak >= 30 
            ? 'Você é uma inspiração para o time! 🌟'
            : currentStreak >= 7 
              ? 'Continue assim! Você está formando um hábito incrível.'
              : 'Cada resposta faz diferença. Obrigado!'}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
