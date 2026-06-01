import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CultureCodeSlide, CultureCodeStructure } from '@/types/culture-code.types';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SlideListProps {
  slides: CultureCodeSlide[];
  structure: CultureCodeStructure | null;
  selectedSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: (afterSlideId: string) => void;
  onReorderSlides?: (newOrder: string[]) => void;
}

interface SortableSlideItemProps {
  slide: CultureCodeSlide;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableSlideItem({ slide, isSelected, onSelect }: SortableSlideItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 w-full rounded-md transition-colors text-sm group",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted/50",
        isDragging && "shadow-lg bg-background border"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      
      <button
        onClick={onSelect}
        className="flex items-center gap-2 flex-1 p-2 pl-0 text-left"
      >
        <span className="text-xs text-muted-foreground w-5">
          {slide.slideNumber}
        </span>
        <span className="truncate flex-1">
          {slide.title || 'Sem título'}
        </span>
        {slide.type === 'value' && (
          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
            V
          </span>
        )}
        {slide.type === 'pillar' && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
            P
          </span>
        )}
        {slide.isCustom && (
          <span className="text-xs">✨</span>
        )}
      </button>
    </div>
  );
}

export function SlideList({ 
  slides, 
  structure,
  selectedSlideId, 
  onSelectSlide,
  onAddSlide,
  onReorderSlides,
}: SlideListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(structure?.sections.map(s => s.id) || [])
  );

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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Group slides by section
  const slidesBySection = slides.reduce((acc, slide) => {
    if (!acc[slide.sectionId]) {
      acc[slide.sectionId] = [];
    }
    acc[slide.sectionId].push(slide);
    return acc;
  }, {} as Record<string, CultureCodeSlide[]>);

  // Get section order from structure
  const sectionOrder = structure?.sections.map(s => s.id) || Object.keys(slidesBySection);

  const handleDragEnd = (event: DragEndEvent, sectionSlides: CultureCodeSlide[]) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sectionSlides.findIndex(s => s.id === active.id);
      const newIndex = sectionSlides.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Get the new order within this section
        const reorderedSection = arrayMove(sectionSlides, oldIndex, newIndex);

        // Build the complete new order
        const newOrder: string[] = [];
        sectionOrder.forEach(secId => {
          const secSlides = slidesBySection[secId] || [];
          if (secId === sectionSlides[0]?.sectionId) {
            // Use reordered slides for this section
            reorderedSection.forEach(s => newOrder.push(s.id));
          } else {
            // Keep original order for other sections
            secSlides.forEach(s => newOrder.push(s.id));
          }
        });

        onReorderSlides?.(newOrder);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">SLIDES</h3>
        <p className="text-xs text-muted-foreground">{slides.length} slides • Arraste para reordenar</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sectionOrder.map(sectionId => {
            const sectionSlides = slidesBySection[sectionId] || [];
            const section = structure?.sections.find(s => s.id === sectionId);
            const isExpanded = expandedSections.has(sectionId);

            return (
              <div key={sectionId}>
                <button
                  onClick={() => toggleSection(sectionId)}
                  className="flex items-center gap-1 w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {section?.name || sectionId}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {sectionSlides.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-2 space-y-0.5">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, sectionSlides)}
                    >
                      <SortableContext
                        items={sectionSlides.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sectionSlides.map(slide => (
                          <SortableSlideItem
                            key={slide.id}
                            slide={slide}
                            isSelected={selectedSlideId === slide.id}
                            onSelect={() => onSelectSlide(slide.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    
                    {sectionSlides.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground ml-2"
                        onClick={() => onAddSlide(sectionSlides[sectionSlides.length - 1].id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar slide
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
