import { useState, useMemo } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ContentBlock } from "@/lib/parseContentBlocks";

// Define the section configuration
const SECTION_CONFIG: Record<string, { emoji: string; title: string; dbKey: string }> = {
  opening: { emoji: "✨", title: "Abertura Inicial", dbKey: "show_opening_section" },
  about: { emoji: "🌟", title: "Quem Somos", dbKey: "show_about_section" },
  moment: { emoji: "🚀", title: "Nosso Momento", dbKey: "show_moment_section" },
  dayToDay: { emoji: "🎬", title: "O Que É Trabalhar Aqui", dbKey: "show_benefits_section" },
  fit: { emoji: "🤝", title: "Nosso Santo Vai Bater Se...", dbKey: "show_fit_section" },
  challenges: { emoji: "⚠️", title: "Transparência Radical", dbKey: "show_challenges_section" },
  offerings: { emoji: "🎁", title: "O Que Você Encontra Aqui", dbKey: "show_offerings_section" },
  cta: { emoji: "🎯", title: "Topa o Desafio?", dbKey: "show_cta_section" },
};

const DEFAULT_ORDER = ["opening", "about", "moment", "dayToDay", "fit", "challenges", "offerings", "cta"];

interface SortableSectionItemProps {
  id: string;
  emoji: string;
  title: string;
  onHide: () => void;
  disabled?: boolean;
}

function SortableSectionItem({ id, emoji, title, onHide, disabled }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 bg-card border rounded-lg transition-all",
        isDragging && "opacity-50 shadow-lg scale-[1.02]",
        !disabled && "hover:border-primary/50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "touch-none text-muted-foreground cursor-grab active:cursor-grabbing",
          "opacity-50 group-hover:opacity-100 transition-opacity",
          disabled && "cursor-not-allowed opacity-30"
        )}
        disabled={disabled}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="text-xl">{emoji}</span>
      <span className="flex-1 text-sm font-medium">{title}</span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onHide}
        disabled={disabled}
        title="Ocultar seção"
      >
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

interface HiddenSectionItemProps {
  id: string;
  emoji: string;
  title: string;
  onRestore: () => void;
  disabled?: boolean;
}

function HiddenSectionItem({ emoji, title, onRestore, disabled }: HiddenSectionItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 border border-dashed rounded-lg">
      <Eye className="h-4 w-4 text-muted-foreground opacity-50" />
      <span className="text-lg opacity-50">{emoji}</span>
      <span className="flex-1 text-sm text-muted-foreground">{title}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRestore}
        disabled={disabled}
        className="h-7 text-xs"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Restaurar
      </Button>
    </div>
  );
}

export interface SellingSectionsEditorProps {
  order: string[];
  hiddenSections: Record<string, boolean>;
  onOrderChange: (newOrder: string[]) => void;
  onVisibilityChange: (sectionKey: string, visible: boolean) => void;
  disabled?: boolean;
  availableBlocks?: ContentBlock[];
}

export function SellingSectionsEditor({
  order,
  hiddenSections,
  onOrderChange,
  onVisibilityChange,
  disabled = false,
  availableBlocks,
}: SellingSectionsEditorProps) {
  const [isHiddenPanelOpen, setIsHiddenPanelOpen] = useState(false);

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

  // Use provided order or default
  const currentOrder = order.length > 0 ? order : DEFAULT_ORDER;

  // Separate visible and hidden sections based on the order and visibility
  const { visibleSections, hiddenSectionsList } = useMemo(() => {
    const visible: string[] = [];
    const hidden: string[] = [];

    currentOrder.forEach((sectionId) => {
      if (SECTION_CONFIG[sectionId]) {
        if (hiddenSections[SECTION_CONFIG[sectionId].dbKey] === false) {
          hidden.push(sectionId);
        } else {
          visible.push(sectionId);
        }
      }
    });

    return { visibleSections: visible, hiddenSectionsList: hidden };
  }, [currentOrder, hiddenSections]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visibleSections.indexOf(active.id as string);
      const newIndex = visibleSections.indexOf(over.id as string);

      const newVisibleOrder = arrayMove(visibleSections, oldIndex, newIndex);

      // Reconstruct full order preserving hidden sections at their positions
      const newFullOrder = [...newVisibleOrder, ...hiddenSectionsList];
      onOrderChange(newFullOrder);
    }
  }

  function handleHideSection(sectionId: string) {
    const config = SECTION_CONFIG[sectionId];
    if (config) {
      onVisibilityChange(config.dbKey, false);
    }
  }

  function handleRestoreSection(sectionId: string) {
    const config = SECTION_CONFIG[sectionId];
    if (config) {
      onVisibilityChange(config.dbKey, true);
    }
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        Arraste as seções para reordenar. Clique no ícone de olho para ocultar uma seção.
      </p>

      {/* Visible Sections - Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleSections}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {visibleSections.map((sectionId) => {
              const config = SECTION_CONFIG[sectionId];
              if (!config) return null;

              return (
                <SortableSectionItem
                  key={sectionId}
                  id={sectionId}
                  emoji={config.emoji}
                  title={config.title}
                  onHide={() => handleHideSection(sectionId)}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hidden Sections Panel */}
      {hiddenSectionsList.length > 0 && (
        <Collapsible open={isHiddenPanelOpen} onOpenChange={setIsHiddenPanelOpen}>
          <Card className="border-dashed">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Seções Ocultas ({hiddenSectionsList.length})
                  </span>
                </div>
                {isHiddenPanelOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-2">
                {hiddenSectionsList.map((sectionId) => {
                  const config = SECTION_CONFIG[sectionId];
                  if (!config) return null;

                  return (
                    <HiddenSectionItem
                      key={sectionId}
                      id={sectionId}
                      emoji={config.emoji}
                      title={config.title}
                      onRestore={() => handleRestoreSection(sectionId)}
                      disabled={disabled}
                    />
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Values Section - Special (not part of selling content) */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-3">Outras Seções (não reordenáveis)</p>
        <div className="flex items-center gap-3 p-3 bg-muted/30 border rounded-lg">
          <span className="text-xl">💎</span>
          <span className="flex-1 text-sm font-medium">Valores da Empresa</span>
          <span className="text-xs text-muted-foreground">(do módulo Cultura)</span>
        </div>
      </div>
    </div>
  );
}
