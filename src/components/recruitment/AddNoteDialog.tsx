import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { useRecruitmentNotes } from "@/hooks/useRecruitmentNotes";

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName?: string;
  applicationId?: string;
}

export function AddNoteDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  applicationId,
}: AddNoteDialogProps) {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { addNote, isAdding } = useRecruitmentNotes(candidateId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    addNote(
      {
        candidateId,
        content: content.trim(),
        isPrivate,
        applicationId,
      },
      {
        onSuccess: () => {
          setContent("");
          setIsPrivate(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Nota</DialogTitle>
          <DialogDescription>
            {candidateName
              ? `Adicione uma nota interna sobre ${candidateName}.`
              : "Adicione uma nota interna sobre este candidato."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-content">Conteúdo</Label>
              <Textarea
                id="note-content"
                placeholder="Digite sua nota aqui..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-private"
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked === true)}
              />
              <Label
                htmlFor="is-private"
                className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer"
              >
                <Lock className="h-3 w-3" />
                Nota privada (visível apenas para você)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!content.trim() || isAdding}>
              {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Nota
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
