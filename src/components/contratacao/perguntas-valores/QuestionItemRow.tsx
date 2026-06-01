import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Check, X, GripVertical, Brain } from 'lucide-react';
import { ValuesQuestionItem } from '@/types/values-questions.types';
import { cn } from '@/lib/utils';

interface QuestionItemRowProps {
  item: ValuesQuestionItem;
  index: number;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggleThinkingTime?: (id: string, value: boolean) => void;
  showDragHandle?: boolean;
  showValueLabel?: boolean;
}

export function QuestionItemRow({ 
  item, 
  index, 
  onUpdate, 
  onDelete,
  onToggleThinkingTime,
  showDragHandle = false,
  showValueLabel = false
}: QuestionItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.question_text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(item.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(item.question_text);
    setIsEditing(false);
  };

  const getSourceBadge = () => {
    switch (item.source) {
      case 'ai':
        return <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">IA</span>;
      case 'custom':
        return <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Custom</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg group">
      {showDragHandle && (
        <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      <span className="text-sm text-muted-foreground w-6 flex-shrink-0">
        {index + 1}.
      </span>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
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
          <Button size="icon" variant="ghost" onClick={handleSave}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 flex items-center gap-2">
            {showValueLabel && item.value_label && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                {item.value_label}
              </span>
            )}
            <span className="text-sm">{item.question_text}</span>
            {getSourceBadge()}
            {item.requires_thinking_time && (
              <span
                className="text-xs font-medium text-accent-foreground bg-accent px-2 py-0.5 rounded inline-flex items-center gap-1"
                title="Pergunta marcada como reflexão profunda — a IA aguardará silêncio extra."
              >
                <Brain className="h-3 w-3" /> Reflexão
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onToggleThinkingTime && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-8 w-8",
                  item.requires_thinking_time && "text-accent-foreground bg-accent opacity-100"
                )}
                title={item.requires_thinking_time
                  ? "Desmarcar reflexão profunda"
                  : "Marcar como reflexão profunda (IA aguarda mais tempo)"}
                onClick={() => onToggleThinkingTime(item.id, !item.requires_thinking_time)}
              >
                <Brain className="h-4 w-4" />
              </Button>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
