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
