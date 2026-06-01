import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

interface EventAISuggestionProps {
  text: string;
  onAdd: () => void;
}

export function EventAISuggestion({ text, onAdd }: EventAISuggestionProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
        <Sparkles className="h-4 w-4" />
      </div>
      <span className="flex-1 text-sm">{text}</span>
      <Button 
        size="sm" 
        variant="ghost" 
        className="shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4 mr-1" />
        Adicionar
      </Button>
    </div>
  );
}
