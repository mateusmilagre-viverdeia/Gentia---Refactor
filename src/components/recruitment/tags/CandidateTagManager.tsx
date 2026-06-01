import { useState } from "react";
import { useCandidateTags } from "@/hooks/useCandidateTags";
import { TagBadge } from "./TagBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Tag } from "lucide-react";

interface CandidateTagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  currentTags: string[];
}

export function CandidateTagManager({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  currentTags,
}: CandidateTagManagerProps) {
  const { allTags, addTag, removeTag, getTagSuggestions } = useCandidateTags();
  const [inputValue, setInputValue] = useState("");

  const suggestions = getTagSuggestions(inputValue).filter(
    (tag) => !currentTags.includes(tag)
  );

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || currentTags.includes(trimmedTag)) return;
    addTag.mutate({ candidateId, tag: trimmedTag });
    setInputValue("");
  };

  const handleRemoveTag = (tag: string) => {
    removeTag.mutate({ candidateId, tag });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags de {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Tags */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Tags atuais
            </label>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {currentTags.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Nenhuma tag adicionada
                </span>
              ) : (
                currentTags.map((tag) => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    size="md"
                    onRemove={() => handleRemoveTag(tag)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Add Tag Input */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Adicionar tag
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite para buscar ou criar..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={() => handleAddTag(inputValue)}
                disabled={!inputValue.trim() || addTag.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Sugestões
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="transition-transform hover:scale-105"
                  >
                    <TagBadge tag={tag} size="md" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Available Tags (when no search) */}
          {!inputValue && allTags.filter((t) => !currentTags.includes(t)).length > 0 && suggestions.length === 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Tags disponíveis
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allTags
                  .filter((t) => !currentTags.includes(t))
                  .slice(0, 15)
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className="transition-transform hover:scale-105"
                    >
                      <TagBadge tag={tag} size="md" />
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
