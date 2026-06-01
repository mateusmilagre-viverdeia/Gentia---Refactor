import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Activity, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePulseDaily } from '@/hooks/usePulseDaily';
import {
  PulseProgressBar,
  PulseStreakDisplay,
  PulseEmojiQuestion,
  PulseMultiSelectQuestion,
  PulseCompletionCelebration,
  PulseNoPulseToday,
} from '@/components/pulse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PulseCompanyValue, EmojiOption } from '@/types/pulse.types';

export default function PulseDaily() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const {
    isLoading,
    isSubmitting,
    todayPulse,
    currentIndex,
    currentQuestion,
    progress,
    submitAnswer,
  } = usePulseDaily();

  const [showCelebration, setShowCelebration] = useState(false);
  const [companyValues, setCompanyValues] = useState<PulseCompanyValue[]>([]);

  // Fetch account_id from profile
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setAccountId(data?.account_id || null);
      });
  }, [user?.id]);

  // Fetch company values for multi-select questions
  useEffect(() => {
    if (accountId) {
      supabase
        .from('pulse_company_values')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          setCompanyValues((data || []) as PulseCompanyValue[]);
        });
    }
  }, [accountId]);

  // Show celebration when completed
  useEffect(() => {
    if (todayPulse.isCompleted && progress.current > 0) {
      setShowCelebration(true);
    }
  }, [todayPulse.isCompleted, progress.current]);

  const handleEmojiAnswer = async (value: number, emoji: string) => {
    if (!currentQuestion) return;
    
    // Use culture_question_id for culture questions, otherwise use the standard id
    const currentItem = todayPulse.items[currentIndex];
    const questionId = (currentItem as any)?.is_culture_question 
      ? (currentItem as any).culture_question_id 
      : currentQuestion.id;
    
    if (!questionId) return;
    
    await submitAnswer({
      question_id: questionId,
      numeric_score: value,
      raw_emoji: emoji,
    });
  };

  const handleMultiSelectAnswer = async (selectedKeys: string[]) => {
    if (!currentQuestion) return;
    
    // Use culture_question_id for culture questions
    const currentItem = todayPulse.items[currentIndex];
    const questionId = (currentItem as any)?.is_culture_question 
      ? (currentItem as any).culture_question_id 
      : currentQuestion.id;
    
    if (!questionId) return;
    
    // Calculate a score based on selection (e.g., how many values they see being lived)
    const score = (selectedKeys.length / Math.max(companyValues.length, 1)) * 10;
    
    await submitAnswer({
      question_id: questionId,
      multi_select_values: selectedKeys,
      numeric_score: score,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Activity className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="text-muted-foreground">Carregando pulso...</p>
        </motion.div>
      </div>
    );
  }

  // No pulse for today
  if (!todayPulse.assignment || todayPulse.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/retencao">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Pulso Diário</h1>
          </div>

          <PulseNoPulseToday streak={todayPulse.streak} />
        </div>
      </div>
    );
  }

  // Get emoji options from current question
  const getEmojiOptions = (): EmojiOption[] => {
    const emojiSet = (currentQuestion as any)?.pulse_emoji_sets;
    if (emojiSet?.options) {
      return emojiSet.options as EmojiOption[];
    }
    // Default fallback
    return [
      { value: 0, emoji: '😞', label: 'Muito ruim' },
      { value: 2.5, emoji: '😕', label: 'Ruim' },
      { value: 5, emoji: '😐', label: 'Ok' },
      { value: 7.5, emoji: '🙂', label: 'Bom' },
      { value: 10, emoji: '😄', label: 'Excelente' },
    ];
  };

  // Get culture pillar label
  const getPillarLabel = (pillarType: string): string => {
    const labels: Record<string, string> = {
      mission: 'Missão',
      vision: 'Visão',
      values: 'Valores',
      decision: 'Decisão',
      indicators: 'Indicadores',
      project: 'Projeto',
      energy: 'Energia',
      development: 'Desenvolvimento',
    };
    return labels[pillarType] || pillarType;
  };

  // Check if current question is a culture question
  const currentItem = todayPulse.items[currentIndex];
  const isCultureQuestion = (currentItem as any)?.is_culture_question || (currentQuestion as any)?.is_culture_question;
  const pillarType = (currentQuestion as any)?.pillar_type;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/retencao">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Pulso Diário</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          </div>
          <PulseStreakDisplay streak={todayPulse.streak} compact />
        </div>

        {/* Progress bar */}
        <PulseProgressBar
          current={progress.current}
          total={progress.total}
          className="mb-8"
        />

        {/* Question area */}
        <div className="min-h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!todayPulse.isCompleted && currentQuestion ? (
              currentQuestion.answer_type === 'multi_select' ? (
                <PulseMultiSelectQuestion
                  key={currentQuestion.id}
                  questionText={currentQuestion.question_text}
                  values={companyValues}
                  isAnonymous={currentQuestion.is_anonymous}
                  driverName={currentQuestion.pulse_drivers?.name}
                  onAnswer={handleMultiSelectAnswer}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <div className="w-full">
                  {isCultureQuestion && pillarType && (
                    <div className="flex justify-center mb-4">
                      <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Cultura: {getPillarLabel(pillarType)}
                      </Badge>
                    </div>
                  )}
                  <PulseEmojiQuestion
                    key={currentQuestion.id}
                    questionText={currentQuestion.question_text}
                    options={getEmojiOptions()}
                    isAnonymous={currentQuestion.is_anonymous}
                    driverName={(currentQuestion as any).pulse_drivers?.name}
                    onAnswer={handleEmojiAnswer}
                    isSubmitting={isSubmitting}
                  />
                </div>
              )
            ) : (
              <motion.div
                key="complete"
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="text-xl font-medium text-green-600">
                  ✓ Você já respondeu o pulso de hoje!
                </p>
                <Button asChild className="mt-4">
                  <Link to="/retencao/pulse/history">
                    Ver meu histórico
                  </Link>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Streak display (full, at bottom) */}
        {!todayPulse.isCompleted && (
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <PulseStreakDisplay streak={todayPulse.streak} />
          </motion.div>
        )}
      </div>

      {/* Celebration modal */}
      <AnimatePresence>
        {showCelebration && (
          <PulseCompletionCelebration
            streak={todayPulse.streak}
            pointsEarned={10}
            onClose={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
