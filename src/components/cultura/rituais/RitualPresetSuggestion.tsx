import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RitualDuration, RitualComplexity, RitualFormat } from "@/types/ritual.types";

interface RitualPresetSuggestionProps {
  suggestion: string;
  duration?: RitualDuration | null;
  complexity?: RitualComplexity | null;
  format?: RitualFormat | null;
  onAdd: () => void;
}

const durationLabels: Record<RitualDuration, { label: string; className: string }> = {
  rapido: { label: '⏱ Rápido', className: 'bg-green-50 text-green-700 border-green-200' },
  medio: { label: '⏱ Médio', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  longo: { label: '⏱ Longo', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const complexityLabels: Record<RitualComplexity, { label: string; className: string }> = {
  facil: { label: '✓ Fácil', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  complexo: { label: '⚡ Complexo', className: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const formatLabels: Record<RitualFormat, { label: string; className: string }> = {
  sincrono: { label: '👥 Síncrono', className: 'border border-gray-300 text-gray-600 bg-white' },
  assincrono: { label: '📱 Assíncrono', className: 'border border-gray-300 text-gray-600 bg-white' },
};

export function RitualPresetSuggestion({ suggestion, duration, complexity, format, onAdd }: RitualPresetSuggestionProps) {
  const hasMetadata = duration || complexity || format;

  return (
    <Button
      variant="outline"
      className="justify-start text-left h-auto py-2 px-3 hover:bg-gray-50 group flex-col items-start gap-1"
      onClick={onAdd}
    >
      <div className="flex items-center w-full">
        <span className="flex-1 text-sm">{suggestion}</span>
        <Plus className="h-4 w-4 ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      
      {hasMetadata && (
        <div className="flex flex-wrap gap-1 mt-1">
          {duration && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${durationLabels[duration].className}`}>
              {durationLabels[duration].label}
            </span>
          )}
          {complexity && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${complexityLabels[complexity].className}`}>
              {complexityLabels[complexity].label}
            </span>
          )}
          {format && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${formatLabels[format].className}`}>
              {formatLabels[format].label}
            </span>
          )}
        </div>
      )}
    </Button>
  );
}
