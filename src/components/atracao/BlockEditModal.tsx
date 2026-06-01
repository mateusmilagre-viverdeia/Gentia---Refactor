import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Edit2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ContentBlock } from "@/lib/parseContentBlocks";

interface BlockEditModalProps {
  block: ContentBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (blockId: string, newTitle: string, newContent: string, newEmoji: string) => void;
  saving?: boolean;
}

export function BlockEditModal({
  block,
  open,
  onOpenChange,
  onSave,
  saving = false,
}: BlockEditModalProps) {
  const [emoji, setEmoji] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Initialize form when block changes
  useEffect(() => {
    if (block) {
      setEmoji(block.emoji ?? "");

      // Strip any leading emoji + numbering from the displayed title
      const cleanTitle = block.title
        .replace(/^\p{Extended_Pictographic}(?:\uFE0F)?\s*/u, "")
        .replace(/^\d+\.\s*/, "")
        .trim();
      setTitle(cleanTitle);

      // Extract content without the marker line (if any) and the header line
      const lines = block.content.split("\n");
      let startIdx = 0;
      // Skip marker line
      if (lines[startIdx] && /<!--\s*block:/i.test(lines[startIdx])) startIdx++;
      // Skip header line ("## ..." or any first non-empty line that contains numbering/emoji)
      while (startIdx < lines.length && lines[startIdx].trim() === "") startIdx++;
      if (lines[startIdx] && /^#{1,3}\s+/.test(lines[startIdx])) startIdx++;
      const body = lines.slice(startIdx).join("\n").trim();
      setContent(body);
    }
  }, [block]);

  if (!block) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(block.id, title.trim(), content.trim(), emoji.trim());
  };

  // Preview of how it will look
  const previewMarkdown = content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {emoji && <span className="text-xl">{emoji}</span>}
            <span>Editar Seção {block.number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Emoji + Title inputs */}
          <div className="space-y-2">
            <Label htmlFor="block-title">Título da Seção</Label>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Emoji da seção (opcional)"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="✨"
                className="w-16 text-center text-lg"
                maxLength={4}
                disabled={saving}
              />
              <span className="text-muted-foreground">{block.number}.</span>
              <Input
                id="block-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da seção..."
                className="flex-1"
                disabled={saving}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode deixar o campo de emoji vazio para remover o ícone.
            </p>
          </div>

          {/* Content tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Pré-visualizar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 min-h-0 mt-2">
              <div className="space-y-2 h-full">
                <Label htmlFor="block-content">Conteúdo (Markdown)</Label>
                <Textarea
                  id="block-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Digite o conteúdo da seção em Markdown..."
                  className="resize-none h-[300px] font-mono text-sm"
                  disabled={saving}
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
              <div className="space-y-2 h-full">
                <Label>Pré-visualização</Label>
                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/20">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                      {emoji && <span>{emoji}</span>}
                      <span>{block.number}. {title || "Título da seção"}</span>
                    </h2>
                    <ReactMarkdown>{previewMarkdown || "*Conteúdo vazio*"}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
