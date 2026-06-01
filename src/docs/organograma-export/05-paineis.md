# Fase 5: Painéis

## 📋 O que contém
- `NotesPanel` - Painel lateral para anotações
- `TagsPanel` - Painel lateral para gerenciar tags coloridas

---

## 1. NotesPanel

**Arquivo: `src/components/organograma/NotesPanel.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeTitle: string;
  notes: string;
  onSave: (notes: string) => void;
}

export function NotesPanel({
  open,
  onOpenChange,
  nodeTitle,
  notes,
  onSave,
}: NotesPanelProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const debouncedNotes = useDebounce(localNotes, 500);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (debouncedNotes !== notes) {
      onSave(debouncedNotes);
    }
  }, [debouncedNotes, notes, onSave]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Anotações
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{nodeTitle}</p>
        </SheetHeader>
        <div className="mt-6">
          <Textarea
            placeholder="Escreva suas anotações aqui..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            className="min-h-[300px] resize-none"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            As anotações são salvas automaticamente.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 2. TagsPanel

**Arquivo: `src/components/organograma/TagsPanel.tsx`**

```typescript
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export interface NodeTag {
  text: string;
  color: string;
}

const TAG_COLORS = [
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Cinza' },
];

interface TagsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeTitle: string;
  tags: NodeTag[];
  onSave: (tags: NodeTag[]) => void;
}

export function TagsPanel({
  open,
  onOpenChange,
  nodeTitle,
  tags,
  onSave,
}: TagsPanelProps) {
  const [newTagText, setNewTagText] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);

  const handleAddTag = () => {
    if (!newTagText.trim()) return;
    
    const newTag: NodeTag = {
      text: newTagText.trim(),
      color: selectedColor,
    };
    
    onSave([...tags, newTag]);
    setNewTagText('');
  };

  const handleRemoveTag = (index: number) => {
    const updatedTags = tags.filter((_, i) => i !== index);
    onSave(updatedTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🏷️ Tags
          </SheetTitle>
          <SheetDescription>{nodeTitle}</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Add new tag */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto da tag</Label>
              <Input
                placeholder="Ex: Urgente, Líder, Novo..."
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={20}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            
            <Button
              onClick={handleAddTag}
              disabled={!newTagText.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tag
            </Button>
          </div>
          
          {/* Current tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags atuais</Label>
              <div className="space-y-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-medium">{tag.text}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveTag(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## ✅ Checklist da Fase 5

- [ ] Criar `NotesPanel.tsx`
- [ ] Criar `TagsPanel.tsx`

---

## 📦 Componentes Shadcn Necessários

```bash
npx shadcn@latest add sheet
```

---

## 🔜 Próxima Fase
Fase 6: Canvas e Página (`06-canvas-e-pagina.md`)
