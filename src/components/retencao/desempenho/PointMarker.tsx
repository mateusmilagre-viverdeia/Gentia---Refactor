import { cn } from '@/lib/utils';
import {
  getInitials,
  getQuadrantFromPosition,
  QUADRANT_CONFIG,
} from '@/types/performance-assessment.types';
import type { PerformanceAssessmentPoint } from '@/types/performance-assessment.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PointMarkerProps {
  point: PerformanceAssessmentPoint;
  isSelected?: boolean;
  onClick: () => void;
  onDragEnd?: (x: number, y: number) => void;
}

export function PointMarker({ point, isSelected, onClick, onDragEnd }: PointMarkerProps) {
  const quadrant = getQuadrantFromPosition(point.x_position, point.y_position);
  const config = QUADRANT_CONFIG[quadrant];
  const initials = getInitials(point.first_name, point.last_name);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('pointId', point.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'absolute w-10 h-10 rounded-full flex items-center justify-center',
              'text-white font-semibold text-sm cursor-pointer shadow-lg',
              'hover:scale-110 transition-all duration-200 select-none',
              'border-2 border-white',
              'bg-[hsl(220,60%,30%)]',
              isSelected && 'ring-2 ring-offset-2 ring-white scale-110'
            )}
            style={{
              left: `${point.x_position}%`,
              top: `${100 - point.y_position}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isSelected ? 10 : 1,
            }}
            onClick={onClick}
            draggable
            onDragStart={handleDragStart}
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold">
              {point.first_name} {point.last_name}
            </p>
            <p className="text-muted-foreground text-xs">{config.label}</p>
            {point.notes && (
              <p className="mt-1 text-xs italic border-t pt-1">{point.notes}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
