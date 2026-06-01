import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RitualSuggestionCard } from "./RitualSuggestionCard";
import { RitualSuggestion } from "@/types/ritual.types";

interface CarouselItem {
  id: string;
  text: string;
  isAI?: boolean;
  duration?: RitualSuggestion['duration'];
  complexity?: RitualSuggestion['complexity'];
  format?: RitualSuggestion['format'];
}

interface RitualSuggestionCarouselProps {
  items: CarouselItem[];
  selectedTexts: Set<string>;
  onToggle: (text: string, isAI: boolean) => void;
  title: string;
  emptyMessage?: string;
  pageSize?: number;
}

export function RitualSuggestionCarousel({
  items,
  selectedTexts,
  onToggle,
  title,
  emptyMessage = "Nenhuma sugestão disponível",
  pageSize = 6,
}: RitualSuggestionCarouselProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(items.length / pageSize);
  const startIdx = page * pageSize;
  const visibleItems = items.slice(startIdx, startIdx + pageSize);

  if (items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[40px] text-center">
              {page + 1}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleItems.map(item => (
          <RitualSuggestionCard
            key={item.id}
            text={item.text}
            isSelected={selectedTexts.has(item.text.toLowerCase())}
            isAI={item.isAI}
            duration={item.duration}
            complexity={item.complexity}
            format={item.format}
            onToggle={() => onToggle(item.text, !!item.isAI)}
          />
        ))}
      </div>
    </div>
  );
}
