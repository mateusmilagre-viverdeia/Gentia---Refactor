import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div className="flex items-center gap-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-1 shadow-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomOut}
            disabled={!canZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Diminuir (Ctrl + -)</p>
        </TooltipContent>
      </Tooltip>

      <div className="min-w-[60px] text-center text-sm font-medium tabular-nums">
        {zoomPercentage}%
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onZoomIn}
            disabled={!canZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Aumentar (Ctrl + +)</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onReset}
            disabled={zoomLevel === 1}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Resetar (Ctrl + 0)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
