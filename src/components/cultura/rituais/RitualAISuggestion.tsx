import { Button } from "@/components/ui/button";
import { Sparkles, Plus } from "lucide-react";

interface RitualAISuggestionProps {
  suggestion: string;
  onAdd: () => void;
}

export function RitualAISuggestion({ suggestion, onAdd }: RitualAISuggestionProps) {
  return (
    <Button
      variant="outline"
      className="justify-start text-left h-auto py-3 px-4 border-purple-200 hover:border-purple-400 hover:bg-purple-50 group w-full"
      onClick={onAdd}
    >
      <Sparkles className="h-4 w-4 mr-3 text-purple-500 shrink-0" />
      <span className="flex-1 text-sm whitespace-normal break-words text-left overflow-hidden">{suggestion}</span>
      <Plus className="h-4 w-4 ml-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Button>
  );
}
