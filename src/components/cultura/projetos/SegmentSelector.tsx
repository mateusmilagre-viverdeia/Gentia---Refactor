import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SEGMENTS, Segment } from '@/types/projects.types';

interface SegmentSelectorProps {
  selectedSegment: Segment | null;
  onSelect: (segment: Segment) => void;
}

export function SegmentSelector({ selectedSegment, onSelect }: SegmentSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Qual é o segmento do seu negócio?</h2>
        <p className="text-muted-foreground">
          Isso nos ajudará a recomendar os projetos estratégicos mais relevantes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SEGMENTS.map((segment) => (
          <Card
            key={segment.id}
            className={cn(
              'p-6 cursor-pointer transition-all hover:shadow-md border-2',
              selectedSegment === segment.id
                ? 'border-primary bg-primary/5'
                : 'border-transparent hover:border-muted-foreground/20'
            )}
            onClick={() => onSelect(segment.id)}
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">{segment.icon}</div>
              <h3 className="font-semibold text-lg">{segment.name}</h3>
              <p className="text-sm text-muted-foreground">{segment.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
