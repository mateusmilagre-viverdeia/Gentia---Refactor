import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, Sparkles, Lightbulb, User } from "lucide-react";
import { EventItem, ItemSource } from "@/types/event.types";

interface EventItemRowProps {
  item: EventItem;
  onUpdate: (itemId: string, newText: string) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

const sourceIcons: Record<ItemSource, React.ReactNode> = {
  ai: <Sparkles className="h-4 w-4 text-purple-500" />,
  suggestion: <Lightbulb className="h-4 w-4 text-amber-500" />,
  custom: <User className="h-4 w-4 text-blue-500" />
};

const sourceLabels: Record<ItemSource, string> = {
  ai: 'IA',
  suggestion: 'Sugestão',
  custom: 'Personalizado'
};

export function EventItemRow({ item, onUpdate, onDelete }: EventItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.item_text);

  const handleSave = async () => {
    if (editText.trim()) {
      await onUpdate(item.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(item.item_text);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button size="icon" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2" title={sourceLabels[item.source]}>
        {sourceIcons[item.source]}
      </div>
      <span className="flex-1">{item.item_text}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
