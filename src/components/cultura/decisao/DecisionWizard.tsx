import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDecision } from "@/contexts/DecisionContext";
import { DECISION_QUESTIONS } from "@/types/decision.types";
import { DecisionProgress } from "./DecisionProgress";
import { DecisionQuestionCard } from "./DecisionQuestionCard";
import { toast } from "sonner";

export function DecisionWizard() {
  const { 
    session, 
    updateStage, 
    addAnswer, 
    updateAnswer, 
    deleteAnswer,
    getAnswersForQuestion 
  } = useDecision();

  const currentQuestion = session?.stage || 1;
  const question = DECISION_QUESTIONS[currentQuestion - 1];
  const answers = getAnswersForQuestion(currentQuestion);

  const handleNext = async () => {
    if (answers.length === 0) {
      toast.warning("Adicione pelo menos uma resposta para continuar");
      return;
    }

    if (currentQuestion < 7) {
      await updateStage(currentQuestion + 1);
    } else {
      // Go to review
      await updateStage(8);
    }
  };

  const handlePrevious = async () => {
    if (currentQuestion > 1) {
      await updateStage(currentQuestion - 1);
    }
  };

  if (!question) return null;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <DecisionProgress currentStage={currentQuestion} onStageClick={(s) => updateStage(s)} />
      
      <DecisionQuestionCard
        question={question}
        answers={answers}
        onAddAnswer={(text, isSuggestion) => addAnswer(currentQuestion, text, isSuggestion)}
        onUpdateAnswer={updateAnswer}
        onDeleteAnswer={deleteAnswer}
      />

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Button onClick={handleNext} className="bg-black hover:bg-gray-800">
          {currentQuestion < 7 ? (
            <>
              Próxima
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Revisar Respostas
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
