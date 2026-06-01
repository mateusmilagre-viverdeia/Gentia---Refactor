import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuggestionButtonProps {
  text: string;
  isAdded: boolean;
  onAdd: () => void;
}

export function SuggestionButton({ text, isAdded, onAdd }: SuggestionButtonProps) {
  return (
    <Button
      variant={isAdded ? "secondary" : "outline"}
      className={`
        w-full justify-start text-left h-auto py-3 px-4 
        transition-all duration-200
        ${isAdded 
          ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' 
          : 'hover:bg-muted hover:border-primary/50'
        }
      `}
      onClick={onAdd}
      disabled={isAdded}
    >
      <span className="flex-shrink-0 mr-3">
        {isAdded ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Plus className="w-4 h-4 text-muted-foreground" />
        )}
      </span>
      <span className="text-sm leading-relaxed">{text}</span>
    </Button>
  );
}
