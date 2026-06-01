import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Lock, Eye, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PulseCompanyValue } from '@/types/pulse.types';

interface PulseMultiSelectQuestionProps {
  questionText: string;
  values: PulseCompanyValue[];
  isAnonymous: boolean;
  driverName?: string;
  onAnswer: (selectedKeys: string[]) => void;
  isSubmitting?: boolean;
  minSelect?: number;
  maxSelect?: number;
}

export function PulseMultiSelectQuestion({
  questionText,
  values,
  isAnonymous,
  driverName,
  onAnswer,
  isSubmitting = false,
  minSelect = 1,
  maxSelect = 3,
}: PulseMultiSelectQuestionProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const toggleValue = (key: string) => {
    if (isSubmitting) return;
    
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < maxSelect) {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedKeys.size >= minSelect) {
      onAnswer(Array.from(selectedKeys));
    }
  };

  const canSubmit = selectedKeys.size >= minSelect;

  return (
    <motion.div
      className="flex flex-col items-center w-full max-w-lg"
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
        className="text-xl md:text-2xl font-semibold text-center mb-2 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {questionText}
      </motion.h2>

      {/* Selection hint */}
      <motion.p 
        className="text-sm text-muted-foreground mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Selecione {minSelect === maxSelect ? minSelect : `até ${maxSelect}`} {maxSelect === 1 ? 'opção' : 'opções'}
      </motion.p>

      {/* Values grid */}
      <div className="grid grid-cols-2 gap-3 w-full mb-6">
        {values.map((value, index) => {
          const isSelected = selectedKeys.has(value.key);
          return (
            <motion.button
              key={value.key}
              onClick={() => toggleValue(value.key)}
              disabled={isSubmitting || (!isSelected && selectedKeys.size >= maxSelect)}
              className={cn(
                'relative flex items-center gap-3 p-4 rounded-xl',
                'border-2 transition-all duration-200',
                'text-left',
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50',
                (!isSelected && selectedKeys.size >= maxSelect) && 'opacity-50 cursor-not-allowed',
                isSubmitting && 'cursor-not-allowed'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Checkbox indicator */}
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0',
                isSelected 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : 'border-muted-foreground/30'
              )}>
                {isSelected && <Check className="h-4 w-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {value.emoji && <span className="text-lg">{value.emoji}</span>}
                  <span className="font-medium truncate">{value.name}</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Submit button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          size="lg"
          className="px-8"
        >
          {isSubmitting ? (
            <>Enviando...</>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar ({selectedKeys.size})
            </>
          )}
        </Button>
      </motion.div>

      {!canSubmit && selectedKeys.size === 0 && (
        <motion.p 
          className="mt-3 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Selecione pelo menos {minSelect} {minSelect === 1 ? 'valor' : 'valores'}
        </motion.p>
      )}
    </motion.div>
  );
}
