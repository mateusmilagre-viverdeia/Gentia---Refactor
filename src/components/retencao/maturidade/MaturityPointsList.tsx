import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, Sparkles } from 'lucide-react';
import {
  getInitials,
  getMaturityLevelFromPosition,
  MATURITY_CONFIG,
} from '@/types/team-maturity.types';
import type { TeamMaturityPoint } from '@/types/team-maturity.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MaturityPointsListProps {
  points: TeamMaturityPoint[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  onAnalyzePerson?: (point: TeamMaturityPoint) => void;
  isAnalyzing?: boolean;
}

export function MaturityPointsList({ 
  points, 
  selectedPointId, 
  onSelectPoint,
  onAnalyzePerson,
  isAnalyzing,
}: MaturityPointsListProps) {
  // Sort by maturity level: M4 > M3 > M1 > M2
  const sortedPoints = [...points].sort((a, b) => {
    const levelOrder = { M4: 0, M3: 1, M1: 2, M2: 3 };
    const lA = getMaturityLevelFromPosition(a.x_position, a.y_position);
    const lB = getMaturityLevelFromPosition(b.x_position, b.y_position);
    return levelOrder[lA] - levelOrder[lB];
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
                const level = getMaturityLevelFromPosition(point.x_position, point.y_position);
                const config = MATURITY_CONFIG[level];
                const initials = getInitials(point.first_name, point.last_name);

                return (
                  <div
                    key={point.id}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg',
                      'hover:bg-muted/50 transition-colors',
                      selectedPointId === point.id && 'bg-muted'
                    )}
                  >
                    <button
                      onClick={() => onSelectPoint(point.id)}
                      className="flex items-center gap-3 flex-1 text-left"
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
                          {config.level} - {config.label}
                        </p>
                      </div>
                    </button>
                    
                    {onAnalyzePerson && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => onAnalyzePerson(point)}
                              disabled={isAnalyzing}
                            >
                              <Sparkles className="h-4 w-4 text-amber-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Analisar com IA</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
