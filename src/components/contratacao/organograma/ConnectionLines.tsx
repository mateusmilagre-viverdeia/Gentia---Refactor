import { useEffect, useState, useCallback, RefObject } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrgChartConnection } from '@/hooks/useOrgChartConnections';

interface ConnectionLinesProps {
  connections: OrgChartConnection[];
  canvasRef: RefObject<HTMLDivElement>;
  onDeleteConnection: (connectionId: string) => void;
  zoomLevel: number;
}

interface LinePosition {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  color: string | null;
  label: string | null;
}

export function ConnectionLines({ 
  connections, 
  canvasRef, 
  onDeleteConnection,
  zoomLevel 
}: ConnectionLinesProps) {
  const [linePositions, setLinePositions] = useState<LinePosition[]>([]);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  const calculatePositions = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const positions: LinePosition[] = [];

    for (const conn of connections) {
      const sourceEl = canvas.querySelector(`[data-node-id="${conn.source_node_id}"]`);
      const targetEl = canvas.querySelector(`[data-node-id="${conn.target_node_id}"]`);

      if (!sourceEl || !targetEl) continue;

      const canvasRect = canvas.getBoundingClientRect();
      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      // Calculate center points relative to canvas
      const x1 = (sourceRect.left + sourceRect.width / 2 - canvasRect.left) / zoomLevel;
      const y1 = (sourceRect.top + sourceRect.height / 2 - canvasRect.top) / zoomLevel;
      const x2 = (targetRect.left + targetRect.width / 2 - canvasRect.left) / zoomLevel;
      const y2 = (targetRect.top + targetRect.height / 2 - canvasRect.top) / zoomLevel;

      positions.push({
        id: conn.id,
        x1,
        y1,
        x2,
        y2,
        midX: (x1 + x2) / 2,
        midY: (y1 + y2) / 2,
        lineStyle: conn.line_style,
        color: conn.color,
        label: conn.label,
      });
    }

    setLinePositions(positions);
  }, [connections, canvasRef, zoomLevel]);

  useEffect(() => {
    calculatePositions();
    
    // Recalculate on scroll and resize
    const observer = new ResizeObserver(calculatePositions);
    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    // Also recalculate on any DOM changes within canvas
    const mutationObserver = new MutationObserver(calculatePositions);
    if (canvasRef.current) {
      mutationObserver.observe(canvasRef.current, { 
        childList: true, 
        subtree: true,
        attributes: true 
      });
    }

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [calculatePositions, canvasRef]);

  // Recalculate when connections change
  useEffect(() => {
    const timer = setTimeout(calculatePositions, 100);
    return () => clearTimeout(timer);
  }, [connections, calculatePositions]);

  if (linePositions.length === 0) return null;

  const getStrokeDasharray = (style: 'solid' | 'dashed' | 'dotted') => {
    switch (style) {
      case 'dashed': return '8,4';
      case 'dotted': return '2,4';
      default: return 'none';
    }
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ 
        width: '100%', 
        height: '100%',
        zIndex: 5,
      }}
    >
      {linePositions.map((line) => (
        <g key={line.id}>
          {/* Main connection line */}
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color || 'hsl(var(--primary))'}
            strokeWidth={hoveredConnection === line.id ? 3 : 2}
            strokeDasharray={getStrokeDasharray(line.lineStyle)}
            className="transition-all duration-200"
            style={{ pointerEvents: 'stroke' }}
            onMouseEnter={() => setHoveredConnection(line.id)}
            onMouseLeave={() => setHoveredConnection(null)}
          />
          
          {/* Invisible wider line for easier hover */}
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="transparent"
            strokeWidth={12}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredConnection(line.id)}
            onMouseLeave={() => setHoveredConnection(null)}
          />

          {/* Delete button at midpoint */}
          {hoveredConnection === line.id && (
            <foreignObject
              x={line.midX - 12}
              y={line.midY - 12}
              width={24}
              height={24}
              style={{ pointerEvents: 'auto' }}
            >
              <Button
                variant="destructive"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConnection(line.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </foreignObject>
          )}

          {/* Optional label */}
          {line.label && (
            <text
              x={line.midX}
              y={line.midY - 10}
              textAnchor="middle"
              className="text-xs fill-muted-foreground"
            >
              {line.label}
            </text>
          )}

          {/* Direction indicator (arrow) */}
          <circle
            cx={line.x2}
            cy={line.y2}
            r={4}
            fill={line.color || 'hsl(var(--primary))'}
            className={cn(
              "transition-opacity duration-200",
              hoveredConnection === line.id ? "opacity-100" : "opacity-50"
            )}
          />
        </g>
      ))}
    </svg>
  );
}
