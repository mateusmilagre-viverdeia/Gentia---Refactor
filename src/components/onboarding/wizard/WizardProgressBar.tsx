import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressBarProps {
  progress: number;
  currentPhaseName?: string;
  totalPhases?: number;
  currentPhaseIndex?: number;
  className?: string;
}

export function WizardProgressBar({
  progress,
  currentPhaseName,
  totalPhases = 0,
  currentPhaseIndex = 0,
  className,
}: WizardProgressBarProps) {
  const isComplete = progress >= 100;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress bar */}
      <div className="relative">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-primary to-primary/80'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        
        {/* Progress indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          initial={{ left: 0 }}
          animate={{ left: `calc(${Math.min(progress, 97)}% - 12px)` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shadow-lg',
              isComplete
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {isComplete ? (
              <Check className="h-4 w-4" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Progress info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <motion.span
            key={progress}
            initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
            animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
            className="font-bold text-lg"
          >
            {progress}%
          </motion.span>
          <span className="text-muted-foreground">concluído</span>
        </div>
        
        {currentPhaseName && totalPhases > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">{currentPhaseName}</span>
            <span>•</span>
            <span>Fase {currentPhaseIndex + 1} de {totalPhases}</span>
          </div>
        )}
      </div>

      {/* Phase progress dots */}
      {totalPhases > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPhases }).map((_, index) => {
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;
            
            return (
              <motion.div
                key={index}
                className={cn(
                  'rounded-full transition-all',
                  isCompleted && 'bg-primary',
                  isCurrent && 'bg-primary/50 ring-2 ring-primary ring-offset-2 ring-offset-background',
                  !isCompleted && !isCurrent && 'bg-muted'
                )}
                initial={false}
                animate={{
                  width: isCurrent ? 24 : 8,
                  height: 8,
                }}
                transition={{ duration: 0.3 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
