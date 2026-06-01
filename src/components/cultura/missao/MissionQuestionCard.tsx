import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, X, Lightbulb, ChevronDown } from "lucide-react";
import { KeywordSuggestions } from "../shared/KeywordSuggestions";
import { Badge } from "@/components/ui/badge";

interface MissionQuestionCardProps {
  questionNumber: number;
  question: string;
  description?: string;
  answer: string;
  onAnswerChange: (answer: string) => void;
  maxLength?: number;
  showValidationError?: boolean;
  isKeywordQuestion?: boolean;
  previousAnswers?: Record<number, string>;
  onSelectKeyword?: (keyword: string) => void;
  // V2 props
  observation?: string;
  examples?: string[];
  totalQuestions?: number;
  layerTitle?: string;
  layerNumber?: number;
}

export function MissionQuestionCard({
  questionNumber,
  question,
  description,
  answer,
  onAnswerChange,
  maxLength = 1000,
  showValidationError = false,
  isKeywordQuestion = false,
  previousAnswers,
  onSelectKeyword,
  observation,
  examples,
  totalQuestions = 8,
  layerTitle,
  layerNumber,
}: MissionQuestionCardProps) {
  const [localAnswer, setLocalAnswer] = useState(answer);
  const [isTipOpen, setIsTipOpen] = useState(false);
  
  useEffect(() => {
    setLocalAnswer(answer);
  }, [answer]);

  const handleChange = (value: string) => {
    if (value.length <= maxLength) {
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
    if (newValue.length <= maxLength) {
      setLocalAnswer(newValue);
      onAnswerChange(newValue);
    }
  };

  const remainingChars = maxLength - localAnswer.length;
  const isNearLimit = remainingChars < 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-xl">
                Pergunta {questionNumber} de {totalQuestions}
              </CardTitle>
              {layerTitle && layerNumber && (
                <Badge variant="outline" className="text-xs">
                  Camada {layerNumber}: {layerTitle}
                </Badge>
              )}
            </div>
            <CardDescription className="text-base font-medium text-foreground">
              {question}
            </CardDescription>
            {description && (
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            )}
          </div>
          {localAnswer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Observação expansível (V2) */}
        {observation && (
          <Collapsible open={isTipOpen} onOpenChange={setIsTipOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground mt-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Ver dica para esta pergunta</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isTipOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900 space-y-3">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {observation}
                </p>
                {examples && examples.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Exemplos:</p>
                    <ul className="space-y-1">
                      {examples.map((example, index) => (
                        <li key={index} className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isKeywordQuestion && previousAnswers && (
          <KeywordSuggestions
            answers={previousAnswers}
            pillarType="mission"
            onSelectKeyword={onSelectKeyword || handleKeywordSelect}
            currentAnswer={localAnswer}
          />
        )}

        <Textarea
          value={localAnswer}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Digite sua resposta aqui..."
          className="min-h-[200px] resize-none"
          maxLength={maxLength}
        />
        
        <div className="flex items-center justify-between text-sm">
          <div className={`${isNearLimit ? "text-orange-500" : "text-muted-foreground"}`}>
            {remainingChars} caracteres restantes
          </div>
          
          {showValidationError && !localAnswer && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Resposta obrigatória</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
