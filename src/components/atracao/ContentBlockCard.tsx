import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ContentBlock } from "@/lib/parseContentBlocks";

interface ContentBlockCardProps {
  block: ContentBlock;
  onRefine?: (blockId: string) => void;
  onEdit?: (blockId: string) => void;
  disabled?: boolean;
  showRefineButton?: boolean;
  showEditButton?: boolean;
}

export function ContentBlockCard({ 
  block, 
  onRefine, 
  onEdit,
  disabled, 
  showRefineButton = true,
  showEditButton = false 
}: ContentBlockCardProps) {
  // Remove the title from content to avoid duplication (title is shown in header)
  const contentWithoutTitle = block.content
    .split('\n')
    .slice(1)
    .join('\n')
    .trim();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xl">{block.emoji}</span>
          <h3 className="font-semibold text-lg">
            {block.number}. {block.title.replace(/^[🌟🚀🎬⚠️🤝🎁🎯]\s*\d+\.\s*/, '')}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {showEditButton && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(block.id)}
              disabled={disabled}
              className="h-8"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
          {showRefineButton && onRefine && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRefine(block.id)}
              disabled={disabled}
              className="h-8"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Refinar com IA
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="prose prose-lg max-w-none dark:prose-invert 
                       prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-6
                       prose-p:mb-[2em] prose-p:leading-relaxed
                       prose-li:my-2 prose-li:leading-relaxed
                       prose-ul:my-6 prose-ol:my-6 prose-ul:space-y-2
                       prose-strong:text-foreground prose-strong:font-semibold
                       [&_br]:block [&_br]:content-[''] [&_br]:mb-[1em]">
          <ReactMarkdown>{contentWithoutTitle}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
