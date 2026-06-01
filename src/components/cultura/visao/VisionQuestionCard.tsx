import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { KeywordSuggestions } from "../shared/KeywordSuggestions";

interface VisionQuestionCardProps {
  questionNumber: number;
  question: string;
  answer: string;
  onAnswerChange: (answer: string) => void;
  characterLimit?: number;
  showValidationError?: boolean;
  isKeywordQuestion?: boolean;
  previousAnswers?: Record<number, string>;
  onSelectKeyword?: (keyword: string) => void;
}

export function VisionQuestionCard({
  questionNumber,
  question,
  answer,
  onAnswerChange,
  characterLimit = 1000,
  showValidationError = false,
  isKeywordQuestion = false,
  previousAnswers,
  onSelectKeyword,
}: VisionQuestionCardProps) {
  const [localAnswer, setLocalAnswer] = useState(answer);
  
  useEffect(() => {
    setLocalAnswer(answer);
  }, [answer]);
  
  const handleChange = (value: string) => {
    if (value.length <= characterLimit) {
      setLocalAnswer(value);
      onAnswerChange(value);
    }
  };
  
  const handleClear = () => {
    setLocalAnswer("");
    onAnswerChange("");
  };

  const handleKeywordSelect = (keyword: string) => {
    const separator = localAnswer.trim() ? ", " : "";
    const newValue = localAnswer + separator + keyword;
    if (newValue.length <= characterLimit) {
      setLocalAnswer(newValue);
      onAnswerChange(newValue);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Label htmlFor={`question-${questionNumber}`} className="text-lg font-semibold">
            {question}
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Pergunta {questionNumber} de 10
          </p>
        </div>
        
        {localAnswer && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="ml-4"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isKeywordQuestion && previousAnswers && (
        <KeywordSuggestions
          answers={previousAnswers}
          pillarType="vision"
          onSelectKeyword={onSelectKeyword || handleKeywordSelect}
          currentAnswer={localAnswer}
        />
      )}
      
      <div className="relative">
        <Textarea
          id={`question-${questionNumber}`}
          value={localAnswer}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Digite sua resposta aqui..."
          className={`min-h-[200px] resize-none ${
            showValidationError && !localAnswer.trim()
              ? "border-red-500 focus:border-red-500"
              : ""
          }`}
        />
        
        <div className="flex items-center justify-between mt-2">
          <div>
            {showValidationError && !localAnswer.trim() && (
              <p className="text-sm text-red-500">
                Por favor, responda esta pergunta antes de avançar.
              </p>
            )}
          </div>
          
          <p className="text-sm text-gray-600">
            {localAnswer.length}/{characterLimit}
          </p>
        </div>
      </div>
    </div>
  );
}
