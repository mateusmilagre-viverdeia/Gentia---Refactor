import { useState } from "react";
import { Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionQuestion, DecisionAnswer } from "@/types/decision.types";
import { SuggestionButton } from "./SuggestionButton";
import { AnswerItem } from "./AnswerItem";

interface DecisionQuestionCardProps {
  question: DecisionQuestion;
  answers: DecisionAnswer[];
  onAddAnswer: (text: string, isSuggestion: boolean) => void;
  onUpdateAnswer: (answerId: string, newText: string) => void;
  onDeleteAnswer: (answerId: string) => void;
}

export function DecisionQuestionCard({
  question,
  answers,
  onAddAnswer,
  onUpdateAnswer,
  onDeleteAnswer
}: DecisionQuestionCardProps) {
  const [customAnswer, setCustomAnswer] = useState("");

  const handleAddCustom = () => {
    if (customAnswer.trim()) {
      onAddAnswer(customAnswer.trim(), false);
      setCustomAnswer("");
    }
  };

  const addedSuggestions = answers
    .filter(a => a.is_suggestion)
    .map(a => a.answer_text);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            {question.number}
          </div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Pergunta {question.number} de 7
          </span>
        </div>
        <CardTitle className="text-xl leading-relaxed">
          {question.question}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Suggestions */}
        {question.suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4" />
              <span>Sugestões (clique para adicionar)</span>
            </div>
            <div className="space-y-2">
              {question.suggestions.map((suggestion, index) => (
                <SuggestionButton
                  key={index}
                  text={suggestion}
                  isAdded={addedSuggestions.includes(suggestion)}
                  onAdd={() => onAddAnswer(suggestion, true)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current answers */}
        {answers.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">
              Suas respostas ({answers.length})
            </div>
            <div className="space-y-2">
              {answers.map((answer) => (
                <AnswerItem
                  key={answer.id}
                  answer={answer}
                  onUpdate={(newText) => onUpdateAnswer(answer.id, newText)}
                  onDelete={() => onDeleteAnswer(answer.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom answer input */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Adicionar resposta personalizada
          </div>
          <div className="flex gap-2">
            <Input
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customAnswer.trim()) {
                  handleAddCustom();
                }
              }}
            />
            <Button 
              onClick={handleAddCustom} 
              disabled={!customAnswer.trim()}
              className="px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
