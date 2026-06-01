import { motion } from 'framer-motion';
import { Calendar, Clock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PulseStreakDisplay } from './PulseStreakDisplay';
import type { PulseUserStreak } from '@/types/pulse.types';

interface PulseNoPulseTodayProps {
  streak: PulseUserStreak | null;
  message?: string;
}

export function PulseNoPulseToday({ streak, message }: PulseNoPulseTodayProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="p-6 bg-muted/50 rounded-full mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <Calendar className="h-16 w-16 text-muted-foreground" />
      </motion.div>

      <motion.h2
        className="text-2xl font-bold mb-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Sem pulso para hoje
      </motion.h2>

      <motion.p
        className="text-muted-foreground text-center mb-8 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {message || 'As perguntas do dia ainda não foram geradas. Volte mais tarde ou aguarde o RH configurar.'}
      </motion.p>

      {/* Streak info */}
      {streak && (
        <motion.div
          className="w-full max-w-md mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <PulseStreakDisplay streak={streak} />
        </motion.div>
      )}

      {/* Tips */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>O pulso é renovado diariamente</span>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span>Ative notificações para não perder</span>
        </div>
      </motion.div>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Button variant="outline" asChild>
          <Link to="/retencao">
            Voltar para Retenção
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
