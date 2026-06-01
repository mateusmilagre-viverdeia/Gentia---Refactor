import { Card, CardContent } from "@/components/ui/card";
import { Check, Plus, Sparkles } from "lucide-react";
import { RitualDuration, RitualComplexity, RitualFormat } from "@/types/ritual.types";

interface RitualSuggestionCardProps {
  text: string;
  isSelected: boolean;
  isAI?: boolean;
  duration?: RitualDuration | null;
  complexity?: RitualComplexity | null;
  format?: RitualFormat | null;
  onToggle: () => void;
}

const durationLabels: Record<string, string> = {
  rapido: '⏱ Rápido',
  medio: '⏱ Médio',
  longo: '⏱ Longo',
};

const complexityLabels: Record<string, string> = {
  facil: '✓ Fácil',
  complexo: '⚡ Complexo',
};

const formatLabels: Record<string, string> = {
  sincrono: '👥 Síncrono',
  assincrono: '📱 Assíncrono',
};

export function RitualSuggestionCard({
  text,
  isSelected,
  isAI,
  duration,
  complexity,
  format,
  onToggle,
}: RitualSuggestionCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md h-full ${
        isSelected
          ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 ring-1 ring-green-300'
          : isAI
          ? 'border-purple-200 hover:border-purple-400 bg-purple-50/30 dark:bg-purple-950/10'
          : 'hover:border-muted-foreground/30'
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          {isAI && !isSelected && (
            <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
          )}
          {isSelected ? (
            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center shrink-0 group-hover:border-muted-foreground/40">
              <Plus className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <p className="text-sm leading-relaxed flex-1">{text}</p>
        {(duration || complexity || format) && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
            {duration && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {durationLabels[duration]}
              </span>
            )}
            {complexity && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {complexityLabels[complexity]}
              </span>
            )}
            {format && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {formatLabels[format]}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
