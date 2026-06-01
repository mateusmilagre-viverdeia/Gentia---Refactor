import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecisionAnswer } from "@/types/decision.types";

interface AnswerItemProps {
  answer: DecisionAnswer;
  onUpdate: (newText: string) => void;
  onDelete: () => void;
}

export function AnswerItem({ answer, onUpdate, onDelete }: AnswerItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(answer.answer_text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(answer.answer_text);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" onClick={handleSave} className="text-primary">
          <Check className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-background border rounded-lg group hover:border-primary/30 transition-colors">
      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      <span className="flex-1 text-sm leading-relaxed">{answer.answer_text}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
