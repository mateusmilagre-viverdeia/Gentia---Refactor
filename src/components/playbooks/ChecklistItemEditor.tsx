import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlaybookChecklistItem } from '@/types/playbook.types';
import { GripVertical, Trash2, Check, X, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChecklistItemEditorProps {
  item: PlaybookChecklistItem;
  onUpdate: (updates: Partial<PlaybookChecklistItem>) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

export function ChecklistItemEditor({ item, onUpdate, onDelete }: ChecklistItemEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [loading, setLoading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setLoading(true);
    try {
      await onUpdate({ title: editTitle.trim() });
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(item.title);
    setIsEditing(false);
  };

  const handleToggleRequired = async () => {
    await onUpdate({ is_required: !item.is_required });
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background group hover:bg-muted/50 ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {isEditing ? (
        <>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={loading}>
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </>
      ) : (
        <>
          <span 
            className="flex-1 text-sm cursor-pointer hover:underline"
            onClick={() => setIsEditing(true)}
          >
            {item.title}
          </span>
          
          <button
            onClick={handleToggleRequired}
            className={`p-1 rounded transition-colors ${
              item.is_required 
                ? 'text-amber-500 hover:text-amber-600' 
                : 'text-muted-foreground/50 hover:text-amber-500'
            }`}
            title={item.is_required ? 'Obrigatório' : 'Opcional'}
          >
            <Star className={`h-4 w-4 ${item.is_required ? 'fill-current' : ''}`} />
          </button>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}

interface NewChecklistItemInputProps {
  onAdd: (title: string) => Promise<void>;
}

export function NewChecklistItemInput({ onAdd }: NewChecklistItemInputProps) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onAdd(title.trim());
      setTitle('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="w-6" /> {/* Spacer for alignment with drag handle */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Novo item..."
        className="flex-1 h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
      />
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleAdd} 
        disabled={loading || !title.trim()}
        className="h-8"
      >
        Adicionar
      </Button>
    </div>
  );
}
