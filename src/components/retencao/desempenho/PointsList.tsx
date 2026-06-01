import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import {
  getInitials,
  getQuadrantFromPosition,
  QUADRANT_CONFIG,
} from '@/types/performance-assessment.types';
import type { PerformanceAssessmentPoint } from '@/types/performance-assessment.types';

interface PointsListProps {
  points: PerformanceAssessmentPoint[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
}

export function PointsList({ points, selectedPointId, onSelectPoint }: PointsListProps) {
  // Sort by quadrant priority: promover > decisao > treinar > desligar
  const sortedPoints = [...points].sort((a, b) => {
    const quadrantOrder = { promover: 0, decisao: 1, treinar: 2, desligar: 3 };
    const qA = getQuadrantFromPosition(a.x_position, a.y_position);
    const qB = getQuadrantFromPosition(b.x_position, b.y_position);
    return quadrantOrder[qA] - quadrantOrder[qB];
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Pessoas ({points.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {points.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Clique no gráfico para adicionar pessoas
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-1">
              {sortedPoints.map((point) => {
                const quadrant = getQuadrantFromPosition(point.x_position, point.y_position);
                const config = QUADRANT_CONFIG[quadrant];
                const initials = getInitials(point.first_name, point.last_name);

                return (
                  <button
                    key={point.id}
                    onClick={() => onSelectPoint(point.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg text-left',
                      'hover:bg-muted/50 transition-colors',
                      selectedPointId === point.id && 'bg-muted'
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ backgroundColor: config.color }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {point.first_name} {point.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {config.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
