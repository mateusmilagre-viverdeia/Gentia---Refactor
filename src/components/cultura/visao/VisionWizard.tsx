import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisionProgress } from "./VisionProgress";
import { VisionQuestionCard } from "./VisionQuestionCard";
import { useVision } from "@/contexts/VisionContext";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const VISION_QUESTIONS = [
  "Qual é o segmento de negócio em que você está inserido?",
  "O que sua empresa faz?",
  "Esse segmento é um business de quê?",
  "Quem é o público-alvo da sua empresa?",
  "Onde você vê sua empresa em 3 a 5 anos?",
  "Para qual direção deseja apontar seus esforços?",
  "Como você medirá o sucesso da sua empresa?",
  "Se você saísse na capa da Forbes, qual seria a matéria?",
  "Quando imagina sua empresa alcançando a visão, qual imagem vem à mente?",
  "Das respostas acima, quais palavras-chave se repetem e têm mais significado?",
];

export function VisionWizard() {
  const { session, saveAnswer, updateStage } = useVision();
  const [currentQuestion, setCurrentQuestion] = useState(session.stage);
  const [showValidationError, setShowValidationError] = useState(false);

  // Sincronizar currentQuestion quando session.stage muda (ex: ao editar do Review)
  useEffect(() => {
    if (session.stage >= 1 && session.stage <= 10) {
      setCurrentQuestion(session.stage);
    }
  }, [session.stage]);
  
  const handleAnswerChange = (answer: string) => {
    saveAnswer(currentQuestion, answer);
    setShowValidationError(false);
  };
  
  const handleNext = () => {
    const currentAnswer = session.answers[currentQuestion]?.trim();
    
    if (!currentAnswer) {
      setShowValidationError(true);
      toast.error("Por favor, responda a pergunta antes de avançar.");
      return;
    }
    
    if (currentQuestion < 10) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      updateStage(nextQuestion);
      setShowValidationError(false);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestion > 1) {
      const prevQuestion = currentQuestion - 1;
      setCurrentQuestion(prevQuestion);
      updateStage(prevQuestion);
      setShowValidationError(false);
    }
  };
  
  const handleQuestionClick = (questionNumber: number) => {
    setCurrentQuestion(questionNumber);
    updateStage(questionNumber);
    setShowValidationError(false);
  };
  
  const handleReview = () => {
    const allAnswered = VISION_QUESTIONS.every((_, index) => {
      const questionNum = index + 1;
      return session.answers[questionNum]?.trim();
    });
    
    if (!allAnswered) {
      toast.error("Por favor, responda todas as 10 perguntas antes de revisar.");
      return;
    }
    
    updateStage(11); // Stage 11 = Review
  };
  
  const answeredQuestions = Object.keys(session.answers)
    .map(Number)
    .filter(num => session.answers[num]?.trim());
  
  const allQuestionsAnswered = answeredQuestions.length === 10;
  
  return (
    <div className="space-y-6">
      <VisionProgress
        currentQuestion={currentQuestion}
        answeredQuestions={answeredQuestions}
        onQuestionClick={handleQuestionClick}
      />
      
      <Card>
        <CardContent className="p-6">
          <VisionQuestionCard
            questionNumber={currentQuestion}
            question={VISION_QUESTIONS[currentQuestion - 1]}
            answer={session.answers[currentQuestion] || ""}
            onAnswerChange={handleAnswerChange}
            showValidationError={showValidationError}
            isKeywordQuestion={currentQuestion === 10}
            previousAnswers={currentQuestion === 10 ? session.answers : undefined}
            onSelectKeyword={currentQuestion === 10 ? (keyword) => {
              const current = session.answers[10] || '';
              const separator = current.trim() ? ', ' : '';
              handleAnswerChange(current + separator + keyword);
            } : undefined}
          />
          
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-2">
              {allQuestionsAnswered && (
                <Button
                  onClick={handleReview}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Revisar Respostas
                </Button>
              )}
              
              {currentQuestion < 10 && (
                <Button onClick={handleNext}>
                  Avançar
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
