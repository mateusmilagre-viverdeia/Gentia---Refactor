import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EventPresetSuggestionProps {
  text: string;
  onAdd: () => void;
  disabled?: boolean;
}

export function EventPresetSuggestion({ text, onAdd, disabled }: EventPresetSuggestionProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-left h-auto py-2 px-3 justify-start"
      onClick={onAdd}
      disabled={disabled}
    >
      <Plus className="h-4 w-4 mr-2 shrink-0" />
      <span className="truncate">{text}</span>
    </Button>
  );
}
