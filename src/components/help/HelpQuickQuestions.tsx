import { useLocation } from 'react-router-dom';
import { quickQuestions } from '@/lib/helpKnowledgeBase';
import { getQuickQuestionsForPage } from '@/lib/helpQuickQuestionsByPage';
import { Button } from '@/components/ui/button';

interface HelpQuickQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function HelpQuickQuestions({ onSelect, disabled }: HelpQuickQuestionsProps) {
  const location = useLocation();
  
  // Get contextual questions for the current page, or use defaults
  const contextualQuestions = getQuickQuestionsForPage(location.pathname, location.search);
  const questions = contextualQuestions || quickQuestions;
  
  return (
    <div className="flex flex-wrap gap-2">
      {questions.slice(0, 4).map((q) => (
        <Button
          key={q.id}
          variant="outline"
          size="sm"
          onClick={() => onSelect(q.question)}
          disabled={disabled}
          className="text-xs h-auto py-1.5 px-3 bg-muted/50 hover:bg-muted border-border/50"
        >
          {q.label}
        </Button>
      ))}
    </div>
  );
}
