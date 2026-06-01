import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MiniMapProps {
  canvasRef: React.RefObject<HTMLElement>;
  scrollContainerRef: React.RefObject<HTMLElement>;
  className?: string;
}

export function MiniMap({ canvasRef, scrollContainerRef, className }: MiniMapProps) {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const [viewportRect, setViewportRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const MINIMAP_WIDTH = 180;
  const MINIMAP_HEIGHT = 120;

  const updateViewport = useCallback(() => {
    const canvas = canvasRef.current;
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (!canvas || !scrollContainer) return;

    const canvasWidth = canvas.scrollWidth;
    const canvasHeight = canvas.scrollHeight;
    const containerWidth = scrollContainer.clientWidth;
    const containerHeight = scrollContainer.clientHeight;
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollTop = scrollContainer.scrollTop;

    // Calculate scale to fit canvas in minimap
    const scaleX = MINIMAP_WIDTH / canvasWidth;
    const scaleY = MINIMAP_HEIGHT / canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    setCanvasSize({
      width: canvasWidth * scale,
      height: canvasHeight * scale,
    });

    setViewportRect({
      x: scrollLeft * scale,
      y: scrollTop * scale,
      width: containerWidth * scale,
      height: containerHeight * scale,
    });
  }, [canvasRef, scrollContainerRef]);

  useEffect(() => {
    updateViewport();

    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateViewport);
      return () => scrollContainer.removeEventListener('scroll', updateViewport);
    }
  }, [updateViewport, scrollContainerRef]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateViewport);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [canvasRef, updateViewport]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!miniMapRef.current || !canvasRef.current) return;

    const rect = miniMapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvas = canvasRef.current;
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const scaleX = MINIMAP_WIDTH / canvas.scrollWidth;
    const scaleY = MINIMAP_HEIGHT / canvas.scrollHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Center viewport at clicked position
    const scrollX = (x / scale) - (scrollContainer.clientWidth / 2);
    const scrollY = (y / scale) - (scrollContainer.clientHeight / 2);

    scrollContainer.scrollTo({
      left: Math.max(0, scrollX),
      top: Math.max(0, scrollY),
      behavior: 'smooth'
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    handleClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleClick(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div
      ref={miniMapRef}
      className={cn(
        "absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur border rounded-lg shadow-lg overflow-hidden cursor-pointer",
        className
      )}
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Canvas representation */}
      <div
        className="absolute bg-muted/30"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          left: (MINIMAP_WIDTH - canvasSize.width) / 2,
          top: (MINIMAP_HEIGHT - canvasSize.height) / 2,
        }}
      >
        {/* Simplified node representation - just show structure indicators */}
        <div className="w-full h-full flex items-start justify-center pt-2">
          <div className="w-4 h-2 bg-primary/40 rounded-sm" />
        </div>
      </div>

      {/* Viewport indicator */}
      <div
        className={cn(
          "absolute border-2 border-primary bg-primary/10 rounded transition-all",
          isDragging && "border-primary/70"
        )}
        style={{
          left: Math.max(0, (MINIMAP_WIDTH - canvasSize.width) / 2 + viewportRect.x),
          top: Math.max(0, (MINIMAP_HEIGHT - canvasSize.height) / 2 + viewportRect.y),
          width: Math.min(viewportRect.width, MINIMAP_WIDTH),
          height: Math.min(viewportRect.height, MINIMAP_HEIGHT),
        }}
      />

      {/* Label */}
      <div className="absolute bottom-1 right-1.5 text-[9px] text-muted-foreground/70 select-none">
        Mapa
      </div>
    </div>
  );
}
