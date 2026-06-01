import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCelebration } from "@/hooks/useCelebration";
import type { Badge } from "@/types/gamification.types";

// Confetti particle component
const ConfettiParticle = ({ 
  color, 
  delay, 
  duration,
  startX,
  startY,
}: { 
  color: string; 
  delay: number; 
  duration: number;
  startX: number;
  startY: number;
}) => {
  const endX = startX + (Math.random() - 0.5) * 400;
  const endY = startY + Math.random() * 600 + 200;
  const rotation = Math.random() * 720 - 360;
  
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ 
        backgroundColor: color,
        left: '50%',
        top: '30%',
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        opacity: 1, 
        scale: 0,
        rotate: 0,
      }}
      animate={{ 
        x: endX, 
        y: endY, 
        opacity: [1, 1, 0], 
        scale: [0, 1.2, 0.8],
        rotate: rotation,
      }}
      transition={{ 
        duration, 
        delay,
        ease: "easeOut",
      }}
    />
  );
};

// Tier configurations
const TIER_CONFIG: Record<Badge['tier'], { 
  colors: string[]; 
  particleCount: number;
  glowColor: string;
  bgGradient: string;
}> = {
  bronze: {
    colors: ['#CD7F32', '#B87333', '#8B4513', '#D2691E', '#A0522D'],
    particleCount: 25,
    glowColor: 'rgba(205, 127, 50, 0.5)',
    bgGradient: 'from-amber-900/30 to-amber-700/20',
  },
  silver: {
    colors: ['#C0C0C0', '#A8A8A8', '#D3D3D3', '#B8B8B8', '#E8E8E8'],
    particleCount: 35,
    glowColor: 'rgba(192, 192, 192, 0.5)',
    bgGradient: 'from-slate-500/30 to-slate-400/20',
  },
  gold: {
    colors: ['#FFD700', '#FFA500', '#FFDF00', '#FFB800', '#FFC700'],
    particleCount: 45,
    glowColor: 'rgba(255, 215, 0, 0.6)',
    bgGradient: 'from-yellow-500/30 to-yellow-400/20',
  },
  platinum: {
    colors: ['#E5E4E2', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
    particleCount: 60,
    glowColor: 'rgba(139, 92, 246, 0.6)',
    bgGradient: 'from-purple-600/30 to-cyan-400/20',
  },
};

const TIER_LABELS: Record<Badge['tier'], string> = {
  bronze: 'BRONZE',
  silver: 'PRATA',
  gold: 'OURO',
  platinum: 'PLATINA',
};

export function BadgeCelebration() {
  const { celebratingBadge, dismissCelebration, dismissAll, queue } = useCelebration();
  const [particles, setParticles] = useState<{ id: number; color: string; delay: number; duration: number; startX: number; startY: number }[]>([]);

  const queueLength = queue.length;
  const totalRemaining = queueLength + (celebratingBadge ? 1 : 0);

  const generateParticles = useCallback((tier: Badge['tier']) => {
    const config = TIER_CONFIG[tier];
    const newParticles = Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      delay: Math.random() * 0.3,
      duration: 1.5 + Math.random() * 1,
      startX: (Math.random() - 0.5) * 100,
      startY: (Math.random() - 0.5) * 50,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (celebratingBadge) {
      generateParticles(celebratingBadge.tier);
    }
  }, [celebratingBadge, generateParticles]);

  if (!celebratingBadge) return null;

  const config = TIER_CONFIG[celebratingBadge.tier];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismissCelebration}
      >
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <ConfettiParticle
              key={particle.id}
              color={particle.color}
              delay={particle.delay}
              duration={particle.duration}
              startX={particle.startX}
              startY={particle.startY}
            />
          ))}
        </div>

        {/* Badge Card */}
        <motion.div
          className={`relative bg-gradient-to-br ${config.bgGradient} backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md mx-4 text-center`}
          style={{
            boxShadow: `0 0 60px ${config.glowColor}, 0 0 120px ${config.glowColor}`,
          }}
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: "spring", duration: 0.6 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Trophy icon */}
          <motion.div
            className="text-4xl mb-2"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            🏆
          </motion.div>

          <motion.h2
            className="text-xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Conquista Desbloqueada!
          </motion.h2>

          {/* Badge icon with glow */}
          <motion.div
            className="relative inline-block mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            <div
              className="text-7xl p-4 rounded-full"
              style={{
                background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
              }}
            >
              {celebratingBadge.icon}
            </div>
            
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: config.colors[0] }}
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.8, 0, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          </motion.div>

          {/* Badge name */}
          <motion.h3
            className="text-2xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {celebratingBadge.name}
          </motion.h3>

          {/* Description */}
          <motion.p
            className="text-white/80 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {celebratingBadge.description}
          </motion.p>

          {/* Tier and points */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: config.colors[0] }}
            >
              {TIER_LABELS[celebratingBadge.tier]}
            </span>
            <span className="text-white/90 font-semibold">
              +{celebratingBadge.points} pts
            </span>
          </motion.div>

          {/* Queue indicator */}
          {queueLength > 0 && (
            <motion.p
              className="text-white/60 text-sm mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
            >
              +{queueLength} conquista{queueLength > 1 ? 's' : ''} na fila
            </motion.p>
          )}

          {/* Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Button
              onClick={dismissCelebration}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              {queueLength > 0 ? 'Próxima' : 'Continuar'}
            </Button>
            
            {totalRemaining > 1 && (
              <Button
                onClick={dismissAll}
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Fechar Todas ({totalRemaining})
              </Button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
