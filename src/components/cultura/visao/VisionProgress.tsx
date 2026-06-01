import { cn } from "@/lib/utils";

interface VisionProgressProps {
  currentQuestion: number;
  answeredQuestions: number[];
  onQuestionClick: (questionNumber: number) => void;
}

export function VisionProgress({
  currentQuestion,
  answeredQuestions,
  onQuestionClick,
}: VisionProgressProps) {
  const totalQuestions = 10;
  
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((questionNum, index) => {
          const isAnswered = answeredQuestions.includes(questionNum);
          const isCurrent = questionNum === currentQuestion;
          const isClickable = isAnswered || questionNum <= currentQuestion;
          
          return (
            <div key={questionNum} className="flex items-center">
              <button
                onClick={() => isClickable && onQuestionClick(questionNum)}
                disabled={!isClickable}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all",
                  isCurrent && "border-black bg-black text-white scale-110",
                  isAnswered && !isCurrent && "border-black bg-black text-white",
                  !isAnswered && !isCurrent && "border-gray-300 bg-white text-gray-400",
                  isClickable && !isCurrent && "hover:scale-105 cursor-pointer",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              >
                {questionNum}
              </button>
              
              {index < totalQuestions - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    isAnswered ? "bg-black" : "bg-gray-300"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="text-center mt-4 text-sm text-gray-600">
        Pergunta {currentQuestion} de {totalQuestions}
      </div>
    </div>
  );
}
