import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ContentBlock } from "@/lib/parseContentBlocks";
import { getBlockQuickActions } from "@/lib/parseContentBlocks";

interface BlockRefineModalProps {
  block: ContentBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefine: (blockId: string, message: string) => Promise<void>;
  generating: boolean;
}

export function BlockRefineModal({
  block,
  open,
  onOpenChange,
  onRefine,
  generating,
}: BlockRefineModalProps) {
  const [inputValue, setInputValue] = useState("");

  if (!block) return null;

  const quickActions = getBlockQuickActions(block.id);

  const handleSend = async () => {
    if (!inputValue.trim() || generating) return;
    const message = inputValue.trim();
    setInputValue("");
    await onRefine(block.id, message);
    onOpenChange(false);
  };

  const handleQuickAction = async (prompt: string) => {
    await onRefine(block.id, prompt);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Remove title from content for preview
  const contentWithoutTitle = block.content
    .split("\n")
    .slice(1)
    .join("\n")
    .trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{block.emoji}</span>
            Refinar: {block.title.replace(/^[🌟🚀🎬⚠️🤝🎁🎯]\s*\d+\.\s*/, "")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Current content preview */}
          <div className="flex-1 min-h-0">
            <p className="text-sm text-muted-foreground mb-2">Conteúdo atual:</p>
            <ScrollArea className="h-48 border rounded-md p-3 bg-muted/20">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{contentWithoutTitle}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>

          {/* Quick actions */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Ações rápidas:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={generating}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom request input */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Ou descreva o que deseja ajustar:
            </p>
            <div className="flex gap-2">
              <Textarea
                placeholder="Ex: Adicione mais emoção, reduza o texto, mencione nossa cultura..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none"
                rows={2}
                disabled={generating}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || generating}
                className="h-auto"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
