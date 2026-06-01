import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Flame, Trophy, Calendar } from 'lucide-react';
import type { PulseUserStreak } from '@/types/pulse.types';

interface PulseStreakDisplayProps {
  streak: PulseUserStreak | null;
  className?: string;
  compact?: boolean;
}

export function PulseStreakDisplay({ streak, className, compact = false }: PulseStreakDisplayProps) {
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalResponses = streak?.total_responses || 0;

  // Determine flame color based on streak (expanded milestones)
  const getFlameColor = () => {
    if (currentStreak >= 365) return 'text-amber-400'; // Lendário
    if (currentStreak >= 180) return 'text-violet-500'; // Platinum
    if (currentStreak >= 90) return 'text-yellow-400'; // Gold
    if (currentStreak >= 60) return 'text-purple-500';
    if (currentStreak >= 30) return 'text-blue-500';
    if (currentStreak >= 14) return 'text-orange-500';
    if (currentStreak >= 7) return 'text-green-500';
    return 'text-red-500';
  };

  // Get next milestone info
  const getNextMilestone = () => {
    const milestones = [
      { days: 7, emoji: '🥉', label: '7 dias' },
      { days: 14, emoji: '⚡', label: '14 dias' },
      { days: 30, emoji: '💎', label: '30 dias' },
      { days: 60, emoji: '🔥', label: '60 dias' },
      { days: 90, emoji: '🌟', label: '90 dias' },
      { days: 180, emoji: '🏆', label: '180 dias' },
      { days: 365, emoji: '👑', label: '365 dias' },
    ];
    
    const nextMilestone = milestones.find(m => m.days > currentStreak);
    if (!nextMilestone) return { achieved: true, emoji: '👑', label: 'Lendário!' };
    
    const prevMilestone = milestones.filter(m => m.days <= currentStreak).pop();
    const startDays = prevMilestone?.days || 0;
    const progress = ((currentStreak - startDays) / (nextMilestone.days - startDays)) * 100;
    
    return {
      achieved: false,
      daysLeft: nextMilestone.days - currentStreak,
      emoji: nextMilestone.emoji,
      label: nextMilestone.label,
      progress,
    };
  };

  const nextMilestone = getNextMilestone();

  if (compact) {
    return (
      <motion.div 
        className={cn('flex items-center gap-2 text-sm', className)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          animate={{ 
            scale: currentStreak > 0 ? [1, 1.2, 1] : 1,
          }}
          transition={{ 
            repeat: currentStreak > 0 ? Infinity : 0, 
            duration: 2,
            ease: 'easeInOut',
          }}
        >
          <Flame className={cn('h-5 w-5', getFlameColor())} />
        </motion.div>
        <span className="font-bold">{currentStreak}</span>
        <span className="text-muted-foreground">dias</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={cn('bg-card border rounded-xl p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <motion.div
            className={cn(
              'p-3 rounded-full',
              currentStreak >= 7 
                ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20' 
                : 'bg-muted'
            )}
            animate={{ 
              scale: currentStreak > 0 ? [1, 1.05, 1] : 1,
            }}
            transition={{ 
              repeat: currentStreak > 0 ? Infinity : 0, 
              duration: 2,
              ease: 'easeInOut',
            }}
          >
            <Flame className={cn('h-8 w-8', getFlameColor())} />
          </motion.div>
          <div>
            <motion.p 
              className="text-3xl font-bold"
              key={currentStreak}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {currentStreak}
            </motion.p>
            <p className="text-sm text-muted-foreground">
              {currentStreak === 1 ? 'dia consecutivo' : 'dias consecutivos'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <Trophy className="h-4 w-4" />
              <span className="font-bold">{longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Recorde</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <Calendar className="h-4 w-4" />
              <span className="font-bold">{totalResponses}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Streak milestones - expanded */}
      {currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Próxima conquista</span>
            <span className="font-medium">
              {nextMilestone.achieved 
                ? `${nextMilestone.emoji} ${nextMilestone.label}`
                : `${nextMilestone.daysLeft} dias para ${nextMilestone.emoji}`}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: nextMilestone.achieved 
                  ? '100%' 
                  : `${nextMilestone.progress}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {/* Milestone badges row */}
          <div className="mt-3 flex items-center justify-between">
            {[7, 14, 30, 60, 90, 180, 365].map((days, index) => {
              const achieved = currentStreak >= days;
              const emojis = ['🥉', '⚡', '💎', '🔥', '🌟', '🏆', '👑'];
              return (
                <motion.div
                  key={days}
                  className={cn(
                    'flex flex-col items-center text-xs',
                    achieved ? 'opacity-100' : 'opacity-40'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: achieved ? 1 : 0.8 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <span className={cn('text-base', achieved && 'animate-bounce')}>{emojis[index]}</span>
                  <span className="text-[10px] text-muted-foreground">{days}d</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
