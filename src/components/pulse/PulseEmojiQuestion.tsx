import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye } from 'lucide-react';
import type { EmojiOption } from '@/types/pulse.types';

interface PulseEmojiQuestionProps {
  questionText: string;
  options: EmojiOption[];
  isAnonymous: boolean;
  driverName?: string;
  onAnswer: (value: number, emoji: string) => void;
  isSubmitting?: boolean;
}

export function PulseEmojiQuestion({
  questionText,
  options,
  isAnonymous,
  driverName,
  onAnswer,
  isSubmitting = false,
}: PulseEmojiQuestionProps) {
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const handleSelect = (option: EmojiOption) => {
    if (isSubmitting) return;
    setSelectedValue(option.value);
    
    // Small delay for animation
    setTimeout(() => {
      onAnswer(option.value, option.emoji);
    }, 300);
  };

  const displayValue = hoveredValue ?? selectedValue;
  const displayOption = options.find(o => o.value === displayValue);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Driver badge */}
      {driverName && (
        <motion.div 
          className="mb-4 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {driverName}
        </motion.div>
      )}

      {/* Anonymous indicator */}
      <motion.div 
        className={cn(
          'mb-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs',
          isAnonymous 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {isAnonymous ? (
          <>
            <Lock className="h-3 w-3" />
            <span>Resposta anônima</span>
          </>
        ) : (
          <>
            <Eye className="h-3 w-3" />
            <span>Resposta identificada</span>
          </>
        )}
      </motion.div>

      {/* Question */}
      <motion.h2 
        className="text-xl md:text-2xl font-semibold text-center mb-8 max-w-md leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {questionText}
      </motion.h2>

      {/* Emoji options */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mb-6">
        {options.map((option, index) => (
          <motion.button
            key={option.value}
            onClick={() => handleSelect(option)}
            onMouseEnter={() => setHoveredValue(option.value)}
            onMouseLeave={() => setHoveredValue(null)}
            disabled={isSubmitting}
            className={cn(
              'relative flex items-center justify-center',
              'w-14 h-14 md:w-20 md:h-20 rounded-2xl',
              'text-3xl md:text-5xl',
              'transition-all duration-200',
              'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
              selectedValue === option.value 
                ? 'bg-primary/10 ring-2 ring-primary scale-110' 
                : 'bg-card border',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            whileHover={{ scale: selectedValue === option.value ? 1.1 : 1.15 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="select-none">{option.emoji}</span>
            
            {/* Selection indicator */}
            <AnimatePresence>
              {selectedValue === option.value && (
                <motion.div
                  className="absolute -bottom-1 left-1/2 w-2 h-2 bg-primary rounded-full"
                  initial={{ scale: 0, x: '-50%' }}
                  animate={{ scale: 1, x: '-50%' }}
                  exit={{ scale: 0 }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Label display */}
      <AnimatePresence mode="wait">
        {displayOption && (
          <motion.div
            key={displayOption.value}
            className="h-8 flex items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-lg font-medium text-muted-foreground">
              {displayOption.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {!displayOption && (
        <div className="h-8 flex items-center">
          <span className="text-sm text-muted-foreground/50">
            Toque para responder
          </span>
        </div>
      )}
    </motion.div>
  );
}
