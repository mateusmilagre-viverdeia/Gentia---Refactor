import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import type { ContentBlock } from "@/lib/parseContentBlocks";

interface HiddenBlocksPanelProps {
  blocks: ContentBlock[];
  onRestore: (blockId: string) => void;
  disabled?: boolean;
}

export function HiddenBlocksPanel({ blocks, onRestore, disabled }: HiddenBlocksPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (blocks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <EyeOff className="h-4 w-4" />
              <span className="text-sm font-medium">
                Seções Ocultas ({blocks.length})
              </span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="space-y-2">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-background border"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span>{block.emoji}</span>
                    <span className="text-muted-foreground">{block.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRestore(block.id)}
                    disabled={disabled}
                    className="text-primary hover:text-primary"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
