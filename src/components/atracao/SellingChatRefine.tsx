import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Check, RefreshCw, History, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { SellingCompanyVersion } from "@/types/selling-company.types";
import { cn } from "@/lib/utils";
import { parseContentBlocks, type ContentBlock } from "@/lib/parseContentBlocks";
import { SortableBlockCard } from "./SortableBlockCard";
import { HiddenBlocksPanel } from "./HiddenBlocksPanel";
import { BlockRefineModal } from "./BlockRefineModal";
import { BlockEditModal } from "./BlockEditModal";

interface SellingChatRefineProps {
  versions: SellingCompanyVersion[];
  generating: boolean;
  onRefineBlock: (blockId: string, message: string) => Promise<unknown>;
  onEditBlock?: (blockId: string, newTitle: string, newContent: string, newEmoji?: string) => Promise<unknown>;
  onApprove: (versionId: string, orderedBlockIds: string[], hiddenBlockIds: string[]) => void;
  onBack: () => void;
  onGenerateNew: () => void;
}

export function SellingChatRefine({
  versions,
  generating,
  onRefineBlock,
  onEditBlock,
  onApprove,
  onBack,
  onGenerateNew,
}: SellingChatRefineProps) {
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SellingCompanyVersion | null>(null);
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // State for ordering and hiding
  const [blockOrder, setBlockOrder] = useState<string[]>([]);
  const [hiddenBlocks, setHiddenBlocks] = useState<Set<string>>(new Set());

  const currentVersion = selectedVersion || versions[0];
  const blocks = useMemo(() => 
    currentVersion ? parseContentBlocks(currentVersion.content) : [],
    [currentVersion]
  );

  // Initialize block order when blocks change
  useEffect(() => {
    if (blocks.length > 0 && blockOrder.length === 0) {
      setBlockOrder(blocks.map(b => b.id));
    }
  }, [blocks, blockOrder.length]);

  // Reset order when version changes
  useEffect(() => {
    if (currentVersion) {
      const newBlocks = parseContentBlocks(currentVersion.content);
      setBlockOrder(newBlocks.map(b => b.id));
      setHiddenBlocks(new Set());
    }
  }, [currentVersion?.id]);

  // Ordered and filtered blocks
  const orderedBlocks = useMemo(() => {
    const blockMap = new Map(blocks.map(b => [b.id, b]));
    return blockOrder
      .map(id => blockMap.get(id))
      .filter((b): b is ContentBlock => b !== undefined);
  }, [blocks, blockOrder]);

  const visibleBlocks = useMemo(() => 
    orderedBlocks.filter(b => !hiddenBlocks.has(b.id)),
    [orderedBlocks, hiddenBlocks]
  );

  const hiddenBlocksList = useMemo(() => 
    orderedBlocks.filter(b => hiddenBlocks.has(b.id)),
    [orderedBlocks, hiddenBlocks]
  );

  const selectedBlock = blocks.find(b => b.id === refiningBlockId) || null;
  const editingBlock = blocks.find(b => b.id === editingBlockId) || null;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlockOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleHideBlock = (blockId: string) => {
    setHiddenBlocks(prev => new Set([...prev, blockId]));
  };

  const handleRestoreBlock = (blockId: string) => {
    setHiddenBlocks(prev => {
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
  };

  const handleOpenRefineModal = (blockId: string) => {
    setRefiningBlockId(blockId);
  };

  const handleOpenEditModal = (blockId: string) => {
    setEditingBlockId(blockId);
  };

  const handleRefineBlock = async (blockId: string, message: string) => {
    await onRefineBlock(blockId, message);
    setRefiningBlockId(null);
  };

  const handleEditBlock = async (blockId: string, newTitle: string, newContent: string, newEmoji: string) => {
    if (!onEditBlock) return;
    setSaving(true);
    try {
      await onEditBlock(blockId, newTitle, newContent, newEmoji);
      setEditingBlockId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = () => {
    if (!currentVersion) return;
    onApprove(
      currentVersion.id,
      blockOrder.filter(id => !hiddenBlocks.has(id)),
      Array.from(hiddenBlocks)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-lg">Refinar Conteúdo</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-4 w-4 mr-1" />
            Versões ({versions.length})
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={onGenerateNew} disabled={generating}>
            <RefreshCw className={cn("h-4 w-4 mr-2", generating && "animate-spin")} />
            Nova versão
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!currentVersion || generating || visibleBlocks.length === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Aprovar
          </Button>
        </div>
      </div>

      {/* Version selector */}
      {showVersions && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-2">Versões anteriores:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVersion(v);
                    setShowVersions(false);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-sm hover:bg-muted",
                    currentVersion?.id === v.id && "bg-muted"
                  )}
                >
                  Versão {versions.length - i} - {new Date(v.created_at).toLocaleString('pt-BR')}
                  {v.approved && ' ✅'}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        Arraste para reordenar • Clique no ícone 👁️ para ocultar seções
      </p>

      {/* Loading state */}
      {generating && (
        <Card className="border-primary/50">
          <CardContent className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Refinando bloco...</span>
          </CardContent>
        </Card>
      )}

      {/* Content Blocks with DnD */}
      {currentVersion ? (
        <div className="pl-10">
          <ScrollArea className="h-[calc(100vh-420px)]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleBlocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 pr-4">
                  {visibleBlocks.map((block) => (
                    <SortableBlockCard
                      key={block.id}
                      block={block}
                      onRefine={handleOpenRefineModal}
                      onEdit={handleOpenEditModal}
                      onHide={handleHideBlock}
                      disabled={generating || saving}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>

          {/* Hidden Blocks Panel */}
          <div className="mt-4 pr-4">
            <HiddenBlocksPanel
              blocks={hiddenBlocksList}
              onRestore={handleRestoreBlock}
              disabled={generating || saving}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum conteúdo gerado ainda.</p>
          </CardContent>
        </Card>
      )}

      {/* Refine Modal (AI) */}
      <BlockRefineModal
        block={selectedBlock}
        open={!!refiningBlockId}
        onOpenChange={(open) => !open && setRefiningBlockId(null)}
        onRefine={handleRefineBlock}
        generating={generating}
      />

      {/* Edit Modal (Manual) */}
      <BlockEditModal
        block={editingBlock}
        open={!!editingBlockId}
        onOpenChange={(open) => !open && setEditingBlockId(null)}
        onSave={handleEditBlock}
        saving={saving}
      />
    </div>
  );
}
