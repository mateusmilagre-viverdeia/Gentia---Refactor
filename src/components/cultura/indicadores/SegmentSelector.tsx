import { SEGMENTS, type Segment } from '@/types/indicators.types';
import { cn } from '@/lib/utils';

interface SegmentSelectorProps {
  selectedSegment: Segment | null;
  onSelect: (segment: Segment) => void;
}

export function SegmentSelector({ selectedSegment, onSelect }: SegmentSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Selecione o segmento da sua empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Os indicadores serão personalizados de acordo com seu segmento
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SEGMENTS.map((segment) => (
          <button
            key={segment.key}
            onClick={() => onSelect(segment.key)}
            className={cn(
              "p-6 rounded-xl border-2 transition-all duration-200 text-left",
              "hover:shadow-md hover:scale-[1.02]",
              selectedSegment === segment.key
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <div className="text-3xl mb-2">{segment.icon}</div>
            <h3 className="font-semibold text-foreground">{segment.label}</h3>
          </button>
        ))}
      </div>
    </div>
  );
}
