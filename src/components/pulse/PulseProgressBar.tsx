import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PulseProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function PulseProgressBar({ current, total, className }: PulseProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isComplete = current >= total;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {isComplete ? 'Concluído!' : `${current} de ${total}`}
        </span>
        <span className="text-sm font-bold text-primary">
          {Math.round(percentage)}%
        </span>
      </div>
      
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            isComplete 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
              : 'bg-gradient-to-r from-primary to-primary/80'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        
        {/* Glow effect */}
        {percentage > 0 && (
          <motion.div
            className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ left: '-2rem' }}
            animate={{ left: `calc(${percentage}% - 2rem)` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: total }, (_, i) => (
          <motion.div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-300',
              i < current 
                ? 'bg-primary' 
                : i === current 
                  ? 'bg-primary/50 ring-2 ring-primary/30' 
                  : 'bg-muted-foreground/30'
            )}
            initial={{ scale: 0.8 }}
            animate={{ 
              scale: i === current ? 1.2 : 1,
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
