import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Clock, Trophy, Sparkles, Flame, Target } from "lucide-react";
import { useDISCAssessment } from "@/hooks/useDISCAssessment";
import { DISCSession, DISCQuestion, RESPONSE_SCALE } from "@/types/disc.types";
import { cn } from "@/lib/utils";
import { DISCIntroduction } from "./DISCIntroduction";

interface DISCAssessmentFlowProps {
  session: DISCSession;
  onComplete: () => void;
  onBack: () => void;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get motivational message based on progress
function getMotivationalMessage(progress: number, answeredCount: number, total: number): { message: string; icon: React.ReactNode } {
  if (answeredCount === 0) {
    return { message: "Vamos começar! 🎯", icon: <Target className="h-4 w-4" /> };
  }
  if (answeredCount === total) {
    return { message: "Parabéns! Assessment completo! 🎉", icon: <Trophy className="h-4 w-4" /> };
  }
  if (progress >= 75) {
    return { message: "Reta final! Falta pouco! 🔥", icon: <Flame className="h-4 w-4" /> };
  }
  if (progress >= 50) {
    return { message: "Metade do caminho! Continue assim! ⭐", icon: <Sparkles className="h-4 w-4" /> };
  }
  if (progress >= 25) {
    return { message: "Ótimo progresso! Você está voando! ✨", icon: <Sparkles className="h-4 w-4" /> };
  }
  return { message: "Excelente início! Continue! 🚀", icon: <Target className="h-4 w-4" /> };
}

// Format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function DISCAssessmentFlow({ session, onComplete, onBack }: DISCAssessmentFlowProps) {
  const { questions, startSession, submitResponses, isLoadingQuestions } = useDISCAssessment();
  
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<DISCQuestion[]>([]);

  // Shuffle questions when they load
  useEffect(() => {
    if (questions.length > 0 && shuffledQuestions.length === 0) {
      setShuffledQuestions(shuffleArray(questions));
    }
  }, [questions, shuffledQuestions.length]);

  // Chronometer - only runs when not on intro
  useEffect(() => {
    if (showIntro) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showIntro]);

  // Start session when intro is dismissed
  const handleStartAssessment = () => {
    if (session.status === 'pending') {
      startSession.mutate(session.id);
    }
    setShowIntro(false);
  };

  const currentQuestion = shuffledQuestions[currentIndex];
  const totalQuestions = shuffledQuestions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const answeredCount = Object.keys(responses).length;
  const answeredProgress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0;
  const motivational = getMotivationalMessage(answeredProgress, answeredCount, totalQuestions);

  // Milestone celebrations
  const milestones = [25, 50, 75];
  const reachedMilestone = milestones.find(m => {
    const prevProgress = ((answeredCount - 1) / totalQuestions) * 100;
    return prevProgress < m && answeredProgress >= m;
  });

  const handleSelectScore = (score: number) => {
    if (!currentQuestion) return;
    
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: score
    }));

    // Auto-advance to next question after a brief delay
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 400);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;

    setIsSubmitting(true);
    try {
      const responsesArray = Object.entries(responses).map(([question_id, score]) => ({
        question_id,
        score
      }));

      await submitResponses.mutateAsync({
        sessionId: session.id,
        responses: responsesArray
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting responses:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show intro page
  if (showIntro) {
    return (
      <AppLayout
        title="Assessment DISC"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Assessment DISC", href: "/retencao/assessment-disc" },
          { label: session.participant_name }
        ]}
      >
        <DISCIntroduction 
          session={session} 
          onStart={handleStartAssessment} 
          onBack={onBack} 
        />
      </AppLayout>
    );
  }

  if (isLoadingQuestions || shuffledQuestions.length === 0) {
    return (
      <AppLayout
        title="Assessment DISC"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Assessment DISC", href: "/retencao/assessment-disc" },
          { label: session.participant_name }
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-muted-foreground">Preparando suas perguntas...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <AppLayout
      title={`Assessment: ${session.participant_name}`}
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Assessment DISC", href: "/retencao/assessment-disc" },
        { label: session.participant_name }
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress Header with Timer */}
        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-4">
            {/* Top row: Timer, Question count, Answered */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg font-medium">{formatTime(elapsedTime)}</span>
              </div>
              <div className="text-sm font-medium">
                Pergunta <span className="text-primary">{currentIndex + 1}</span> de {totalQuestions}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">{answeredCount} respondidas</span>
              </div>
            </div>
            
            {/* Progress bar with gradient */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, 
                    hsl(var(--primary)) 0%, 
                    hsl(142.1 76.2% 36.3%) 50%, 
                    hsl(47.9 95.8% 53.1%) 100%)`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${answeredProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {/* Milestone markers */}
              {milestones.map(milestone => (
                <div
                  key={milestone}
                  className="absolute top-0 bottom-0 w-0.5 bg-background/50"
                  style={{ left: `${milestone}%` }}
                />
              ))}
            </div>

            {/* Motivational message */}
            <motion.div 
              key={motivational.message}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mt-4 text-sm font-medium text-primary"
            >
              {motivational.icon}
              <span>{motivational.message}</span>
            </motion.div>

            {/* Percentage */}
            <div className="text-center mt-2">
              <span className="text-2xl font-bold text-primary">{Math.round(answeredProgress)}%</span>
              <span className="text-muted-foreground text-sm ml-1">concluído</span>
            </div>
          </CardContent>
        </Card>

        {/* Question Card - Neutral, no DISC indicators */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl leading-relaxed text-center">
                  {currentQuestion.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {([1, 2, 3, 4, 5] as const).map((score) => {
                    const isSelected = responses[currentQuestion.id] === score;
                    
                    return (
                      <motion.button
                        key={score}
                        onClick={() => handleSelectScore(score)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={cn(
                          "w-full p-4 rounded-lg border-2 text-left transition-all",
                          isSelected 
                            ? "border-primary bg-primary/10 shadow-md" 
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <motion.div 
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all",
                              isSelected 
                                ? "border-primary bg-primary text-primary-foreground" 
                                : "border-muted-foreground/30"
                            )}
                            animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            {isSelected ? <Check className="h-5 w-5" /> : score}
                          </motion.div>
                          <span className={cn(
                            "font-medium text-base",
                            isSelected && "text-primary"
                          )}>
                            {RESPONSE_SCALE[score]}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentIndex === 0 ? () => setShowIntro(true) : handlePrevious}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentIndex === 0 ? 'Voltar' : 'Anterior'}
          </Button>

          <div className="flex items-center gap-1">
            {/* Quick navigation dots - simplified */}
            {Array.from({ length: Math.ceil(totalQuestions / 4) }).map((_, groupIdx) => {
              const startIdx = groupIdx * 4;
              const groupAnswered = shuffledQuestions.slice(startIdx, startIdx + 4).every(q => responses[q.id]);
              const isCurrentGroup = currentIndex >= startIdx && currentIndex < startIdx + 4;
              
              return (
                <div
                  key={groupIdx}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    isCurrentGroup && "w-6 bg-primary",
                    !isCurrentGroup && groupAnswered && "bg-green-500",
                    !isCurrentGroup && !groupAnswered && "bg-muted-foreground/30"
                  )}
                />
              );
            })}
          </div>

          {currentIndex === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  Finalizar
                  <Trophy className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Próxima
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
