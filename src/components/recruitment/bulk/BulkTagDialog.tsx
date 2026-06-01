import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Tag, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  mode: "add" | "remove";
  existingTags: string[];
  onConfirm: (tags: string[]) => Promise<void>;
  isLoading?: boolean;
}

const SUGGESTED_TAGS = [
  "Prioritário",
  "Aguardando Documentos",
  "Revisão Pendente",
  "Entrevistar Novamente",
  "Potencial Futuro",
  "Indicação",
  "Experiência Sênior",
  "Experiência Júnior",
  "Disponibilidade Imediata",
  "Negociando Proposta",
];

export function BulkTagDialog({
  open,
  onOpenChange,
  selectedCount,
  mode,
  existingTags,
  onConfirm,
  isLoading = false,
}: BulkTagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTags([]);
      setNewTagInput("");
    }
  }, [open]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addNewTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setNewTagInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewTag();
    }
  };

  const handleConfirm = async () => {
    if (selectedTags.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedTags);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayTags = mode === "remove" ? existingTags : SUGGESTED_TAGS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {mode === "add" ? "Adicionar Tags" : "Remover Tags"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? `Adicione tags a ${selectedCount} candidato(s) selecionado(s).`
              : `Remova tags de ${selectedCount} candidato(s) selecionado(s).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tags selecionadas ({selectedTags.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="cursor-pointer gap-1"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add new tag (only in add mode) */}
          {mode === "add" && (
            <div className="space-y-2">
              <Label htmlFor="new-tag">Criar nova tag</Label>
              <div className="flex gap-2">
                <Input
                  id="new-tag"
                  placeholder="Digite uma nova tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={addNewTag}
                  disabled={!newTagInput.trim() || isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Available tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {mode === "add" ? "Sugestões" : "Tags existentes"}
            </Label>
            <ScrollArea className="h-[180px] rounded-md border p-3">
              {displayTags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tag disponível
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected && "bg-primary"
                        )}
                        onClick={() => toggleTag(tag)}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTags.length === 0 || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                {mode === "add" ? "Adicionar" : "Remover"} {selectedTags.length} tag(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
