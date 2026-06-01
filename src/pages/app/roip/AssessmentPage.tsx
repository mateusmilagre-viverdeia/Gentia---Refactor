import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAssessmentStore, QUESTIONS } from '@/store/assessmentStore';
import { ArrowLeft, CheckCircle, Check } from 'lucide-react';
import { useROIPPersistence } from '@/hooks/useROIPPersistence';
import { toast } from '@/hooks/use-toast';

interface AssessmentPageProps {
  onComplete: () => void;
  onBack: () => void;
}

export const AssessmentPage = ({ onComplete, onBack }: AssessmentPageProps) => {
  const { answers, setAnswer, calculateScores, roipAssessmentId } = useAssessmentStore();
  const { saveProgress } = useROIPPersistence();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentQuestion = QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;
  const currentAnswer = answers.find(a => a.questionId === currentQuestion.id)?.value;

  const ratingOptions = [
    { value: 1, label: 'Não existe' },
    { value: 2, label: 'Tentamos implementar' },
    { value: 3, label: 'Não é satisfatório' },
    { value: 4, label: 'É satisfatório' },
    { value: 5, label: 'Ponto muito forte' },
  ];

  const handleAnswerSelect = async (value: number) => {
    if (isProcessing || !roipAssessmentId) return;

    setIsProcessing(true);
    setAnswer(currentQuestion.id, value);

    setIsSaving(true);
    try {
      await saveProgress(roipAssessmentId);
    } catch (error) {
      console.error('[AssessmentPage] Auto-save failed:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a resposta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }

    setTimeout(() => {
      if (isLastQuestion) {
        const scores = calculateScores();
        const allAnswers = useAssessmentStore.getState().answers;
        if (allAnswers.length < 20) {
          toast({
            title: "Assessment incompleto",
            description: "Por favor, responda todas as 20 perguntas.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
        onComplete();
      } else {
        setDirection(1);
        setCurrentIndex(prev => prev + 1);
        setIsProcessing(false);
      }
    }, 300);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  return (
    <div className="py-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Questão {currentIndex + 1} de {QUESTIONS.length}</span>
            <div className="flex items-center gap-2">
              {isSaving && <span className="text-primary animate-pulse">Salvando...</span>}
              {!isSaving && currentAnswer && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Salvo
                </span>
              )}
              <span>{Math.round(progress)}% completo</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    {currentQuestion.pilar}
                  </span>
                  <h2 className="text-xl font-semibold text-foreground">
                    {currentQuestion.text}
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswerSelect(option.value)}
                    disabled={isProcessing}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      currentAnswer === option.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentAnswer === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {option.value}
                        </span>
                        <span className="font-medium text-foreground">{option.label}</span>
                      </div>
                      {currentAnswer === option.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <Button variant="ghost" onClick={handlePrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {currentIndex === 0 ? 'Voltar' : 'Anterior'}
        </Button>
      </div>
    </div>
  );
};
