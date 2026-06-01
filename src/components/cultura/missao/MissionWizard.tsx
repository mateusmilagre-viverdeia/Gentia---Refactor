import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MissionProgress } from "./MissionProgress";
import { MissionQuestionCard } from "./MissionQuestionCard";
import { SegmentSelector } from "./SegmentSelector";
import { useMission } from "@/contexts/MissionContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MISSION_QUESTIONS_V1, MISSION_QUESTIONS_V2 } from "@/data/mission-questions";

export function MissionWizard() {
  const { session, saveAnswer, updateStage, saveSegment } = useMission();
  const [currentQuestion, setCurrentQuestion] = useState(session.stage);
  const [showValidationError, setShowValidationError] = useState(false);
  
  // Ref para armazenar a resposta mais recente (atualização síncrona)
  const answerRef = useRef<string>("");

  // Detectar versão do questionário
  const version = session.questionnaireVersion || 1;
  const totalQuestions = version === 2 ? 9 : 8;

  // Sincronizar currentQuestion quando session.stage muda (ex: ao editar do Review)
  useEffect(() => {
    if (session.stage >= 1 && session.stage <= totalQuestions) {
      setCurrentQuestion(session.stage);
    }
  }, [session.stage, totalQuestions]);

  const currentAnswer = session.answers[currentQuestion] || "";
  
  // Sincronizar ref quando a resposta do contexto muda ou pergunta muda
  useEffect(() => {
    answerRef.current = session.answers[currentQuestion] || "";
  }, [session.answers, currentQuestion]);
  const answeredQuestions = new Set(
    Object.keys(session.answers)
      .map(Number)
      .filter((q) => q >= 1 && q <= totalQuestions && session.answers[q]?.trim())
  );

  // Obter dados da pergunta atual baseado na versão
  const getCurrentQuestionData = () => {
    if (version === 1) {
      return {
        question: MISSION_QUESTIONS_V1[currentQuestion - 1],
        observation: undefined,
        examples: undefined,
        layerTitle: undefined,
        layerNumber: undefined,
        requiresSegment: false,
      };
    }

    const questionData = MISSION_QUESTIONS_V2[currentQuestion - 1];
    
    // Se a pergunta requer segmento, usar a versão específica
    if (questionData.requiresSegment && questionData.segmentVersions && session.segment) {
      const segmentVersion = questionData.segmentVersions[session.segment];
      return {
        question: segmentVersion.question,
        observation: segmentVersion.observation,
        examples: segmentVersion.examples,
        layerTitle: questionData.layerTitle,
        layerNumber: questionData.layer,
        requiresSegment: true,
      };
    }

    return {
      question: questionData.question,
      observation: questionData.observation,
      examples: questionData.examples,
      layerTitle: questionData.layerTitle,
      layerNumber: questionData.layer,
      requiresSegment: questionData.requiresSegment || false,
    };
  };

  const questionData = getCurrentQuestionData();

  // Verificar se precisa mostrar seletor de segmento (Q4 v2 sem segmento selecionado)
  const needsSegmentSelection = version === 2 && 
    currentQuestion === 4 && 
    questionData.requiresSegment && 
    !session.segment;

  const handleAnswerChange = (answer: string) => {
    answerRef.current = answer; // Atualização síncrona imediata
    saveAnswer(currentQuestion, answer);
    setShowValidationError(false);
  };

  const handleSegmentChange = (segment: 'industry' | 'services' | 'product') => {
    saveSegment(segment);
  };

  const handleNext = () => {
    // Se está no seletor de segmento, não precisa validar resposta
    if (needsSegmentSelection) {
      return; // Não pode avançar sem selecionar segmento
    }

    // Usar answerRef.current que tem o valor mais recente (síncrono)
    const latestAnswer = answerRef.current;
    
    if (!latestAnswer.trim()) {
      setShowValidationError(true);
      return;
    }

    if (currentQuestion < totalQuestions) {
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
    // Usar answerRef.current que tem o valor mais recente (síncrono)
    const latestAnswer = answerRef.current;
    
    if (!latestAnswer.trim()) {
      setShowValidationError(true);
      return;
    }

    // Verificar se todas as perguntas foram respondidas
    const questionsToAnswer = Array.from({ length: totalQuestions }, (_, i) => i + 1);
    const allAnswered = questionsToAnswer.every(q => session.answers[q]?.trim());
    if (!allAnswered) {
      setShowValidationError(true);
      return;
    }

    updateStage(14);
  };

  const allQuestionsAnswered = Array.from({ length: totalQuestions }, (_, i) => i + 1).every(
    q => session.answers[q]?.trim()
  );

  // Determinar se é a pergunta de palavras-chave
  const isKeywordQuestion = (version === 1 && currentQuestion === 8) || (version === 2 && currentQuestion === 9);

  return (
    <div className="space-y-6">
      <MissionProgress
        currentQuestion={currentQuestion}
        answeredQuestions={answeredQuestions}
        onQuestionClick={handleQuestionClick}
        totalQuestions={totalQuestions}
      />

      {/* Mostrar seletor de segmento se necessário */}
      {needsSegmentSelection ? (
        <SegmentSelector
          value={session.segment || null}
          onChange={handleSegmentChange}
        />
      ) : (
        <MissionQuestionCard
          questionNumber={currentQuestion}
          question={questionData.question}
          answer={currentAnswer}
          onAnswerChange={handleAnswerChange}
          showValidationError={showValidationError}
          isKeywordQuestion={isKeywordQuestion}
          previousAnswers={isKeywordQuestion ? session.answers : undefined}
          onSelectKeyword={isKeywordQuestion ? (keyword) => {
            const current = session.answers[currentQuestion] || '';
            const separator = current.trim() ? ', ' : '';
            handleAnswerChange(current + separator + keyword);
          } : undefined}
          // V2 props
          observation={questionData.observation}
          examples={questionData.examples}
          totalQuestions={totalQuestions}
          layerTitle={questionData.layerTitle}
          layerNumber={questionData.layerNumber}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-2">
          {currentQuestion < totalQuestions ? (
            <Button 
              onClick={handleNext}
              disabled={needsSegmentSelection && !session.segment}
            >
              {needsSegmentSelection ? 'Continuar' : 'Próxima'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleReview}
              disabled={!allQuestionsAnswered}
              variant={allQuestionsAnswered ? "default" : "secondary"}
            >
              Revisar Respostas
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
