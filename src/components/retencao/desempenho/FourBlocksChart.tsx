import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PointMarker } from './PointMarker';
import { PointForm } from './PointForm';
import type { PerformanceAssessmentPoint } from '@/types/performance-assessment.types';

interface FourBlocksChartProps {
  points: PerformanceAssessmentPoint[];
  onAddPoint: (firstName: string, lastName: string, x: number, y: number, notes?: string) => void;
  onUpdatePoint: (id: string, updates: Partial<PerformanceAssessmentPoint>) => void;
  onDeletePoint: (id: string) => void;
  selectedPointId?: string | null;
  onSelectPoint: (id: string | null) => void;
}

// Scale markers for 1-5
const SCALE_MARKERS = [1, 2, 3, 4, 5];

export function FourBlocksChart({
  points,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint,
  selectedPointId,
  onSelectPoint,
}: FourBlocksChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingPoint, setEditingPoint] = useState<PerformanceAssessmentPoint | null>(null);

  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;

    // Ignore if clicked on a point
    if ((e.target as HTMLElement).closest('[data-point]')) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp between 2 and 98 to avoid edge placement
    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(98, y));

    setClickPosition({ x: clampedX, y: clampedY });
    setEditingPoint(null);
    setFormMode('add');
    setFormOpen(true);
  };

  const handlePointClick = (point: PerformanceAssessmentPoint) => {
    onSelectPoint(point.id);
    setEditingPoint(point);
    setClickPosition(null);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!chartRef.current) return;

    const pointId = e.dataTransfer.getData('pointId');
    if (!pointId) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(98, y));

    onUpdatePoint(pointId, { x_position: clampedX, y_position: clampedY });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSavePoint = (firstName: string, lastName: string, notes: string) => {
    if (formMode === 'add' && clickPosition) {
      onAddPoint(firstName, lastName, clickPosition.x, clickPosition.y, notes || undefined);
    } else if (formMode === 'edit' && editingPoint) {
      onUpdatePoint(editingPoint.id, {
        first_name: firstName,
        last_name: lastName,
        notes: notes || null,
      });
    }
    onSelectPoint(null);
  };

  const handleDeletePoint = () => {
    if (editingPoint) {
      onDeletePoint(editingPoint.id);
      onSelectPoint(null);
    }
  };

  return (
    <>
      {/* Main container with dark blue frame */}
      <div className="bg-[hsl(220,40%,20%)] p-4 rounded-lg max-w-[700px] mx-auto">
        {/* Y-Axis label band (left side) */}
        <div className="flex">
          <div className="flex flex-col items-center justify-center w-10 mr-2">
            <div className="bg-[hsl(220,60%,35%)] rounded px-1 py-2 h-full flex items-center">
              <span 
                className="text-white text-[10px] font-semibold whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Desempenho (Rank de Colaboradores)
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            {/* Y-Axis high/low labels with scale */}
            <div className="flex">
              <div className="w-8 flex flex-col justify-between text-[10px] text-white/80 font-medium pr-1">
                <span>Alto</span>
                {/* Scale numbers for Y axis (5 to 1 top to bottom) */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  {[...SCALE_MARKERS].reverse().map((n) => (
                    <span key={n} className="text-center text-white/60">{n}</span>
                  ))}
                </div>
                <span>Baixo</span>
              </div>
              
              {/* Chart area */}
              <div className="flex-1">
                <div
                  ref={chartRef}
                  className={cn(
                    'relative w-full aspect-square',
                    'overflow-hidden cursor-crosshair',
                    'bg-gray-200 rounded'
                  )}
                  onClick={handleChartClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Vertical center line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400" />
                    {/* Horizontal center line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-400" />
                    
                    {/* Grid scale lines (20%, 40%, 60%, 80%) */}
                    {[20, 40, 60, 80].map((pos) => (
                      <div key={`v-${pos}`}>
                        <div 
                          className="absolute top-0 bottom-0 w-px bg-gray-300"
                          style={{ left: `${pos}%` }}
                        />
                        <div 
                          className="absolute left-0 right-0 h-px bg-gray-300"
                          style={{ top: `${100 - pos}%` }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Quadrant labels */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top-left: Avaliar cada caso */}
                    <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 text-center px-2">
                      <span className="text-gray-600 text-xs font-medium leading-tight block">
                        Avaliar cada caso
                        <br />
                        <span className="text-[10px]">(estômago)</span>
                      </span>
                    </div>
                    {/* Top-right: Delegar Desafios */}
                    <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 text-center px-2">
                      <span className="text-gray-600 text-xs font-medium">Delegar Desafios</span>
                    </div>
                    {/* Bottom-left: Desligar */}
                    <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 text-center px-2">
                      <span className="text-gray-600 text-xs font-medium">Desligar</span>
                    </div>
                    {/* Bottom-right: Desenvolver */}
                    <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 text-center px-2">
                      <span className="text-gray-600 text-xs font-medium">Desenvolver</span>
                    </div>
                  </div>

                  {/* Points */}
                  {points.map((point) => (
                    <div key={point.id} data-point>
                      <PointMarker
                        point={point}
                        isSelected={selectedPointId === point.id}
                        onClick={() => handlePointClick(point)}
                      />
                    </div>
                  ))}
                </div>
                
                {/* X-Axis scale numbers */}
                <div className="flex justify-between px-2 mt-1">
                  {SCALE_MARKERS.map((n) => (
                    <span key={n} className="text-[10px] text-white/60">{n}</span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* X-Axis label band (bottom) */}
            <div className="mt-2">
              <div className="bg-[hsl(220,60%,35%)] rounded px-3 py-1.5 flex justify-between items-center">
                <span className="text-white text-[10px] font-medium">Incompatíveis</span>
                <span className="text-white text-xs font-semibold">Valores (Conheça cada colaborador)</span>
                <span className="text-white text-[10px] font-medium">Compatíveis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PointForm
        open={formOpen}
        onOpenChange={setFormOpen}
        point={editingPoint}
        position={clickPosition || undefined}
        onSave={handleSavePoint}
        onDelete={formMode === 'edit' ? handleDeletePoint : undefined}
        mode={formMode}
      />
    </>
  );
}
