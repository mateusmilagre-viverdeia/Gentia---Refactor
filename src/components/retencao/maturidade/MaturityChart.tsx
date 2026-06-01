import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { MaturityPointMarker } from './MaturityPointMarker';
import { MaturityPointForm } from './MaturityPointForm';
import { MATURITY_CONFIG } from '@/types/team-maturity.types';
import type { TeamMaturityPoint } from '@/types/team-maturity.types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MaturityChartProps {
  points: TeamMaturityPoint[];
  onAddPoint: (firstName: string, lastName: string, x: number, y: number, notes?: string) => void;
  onUpdatePoint: (id: string, updates: Partial<TeamMaturityPoint>) => void;
  onDeletePoint: (id: string) => void;
  selectedPointId?: string | null;
  onSelectPoint: (id: string | null) => void;
}

const SCALE_MARKERS = [1, 2, 3, 4, 5];

export function MaturityChart({
  points,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint,
  selectedPointId,
  onSelectPoint,
}: MaturityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingPoint, setEditingPoint] = useState<TeamMaturityPoint | null>(null);

  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;
    if ((e.target as HTMLElement).closest('[data-point]')) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(98, y));

    setClickPosition({ x: clampedX, y: clampedY });
    setEditingPoint(null);
    setFormMode('add');
    setFormOpen(true);
  };

  const handlePointClick = (point: TeamMaturityPoint) => {
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
      <div className="bg-[hsl(220,40%,20%)] p-4 rounded-lg max-w-[700px] mx-auto relative">
        {/* Info button */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
              aria-label="Informações sobre o gráfico"
            >
              <Info className="w-4 h-4 text-[hsl(220,40%,20%)]" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">📊 Como usar este gráfico</h4>
              
              <div>
                <p className="font-medium text-foreground mb-1">Eixo Vertical — Comportamento de Suporte:</p>
                <ul className="text-muted-foreground text-xs space-y-1 pl-3">
                  <li>• <strong>Alto:</strong> A pessoa precisa de muito suporte emocional e encorajamento</li>
                  <li>• <strong>Baixo:</strong> A pessoa é autossuficiente emocionalmente</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium text-foreground mb-1">Eixo Horizontal — Comportamento Diretivo:</p>
                <ul className="text-muted-foreground text-xs space-y-1 pl-3">
                  <li>• <strong>Alto:</strong> A pessoa precisa de muitas instruções e acompanhamento</li>
                  <li>• <strong>Baixo:</strong> A pessoa trabalha de forma autônoma</li>
                </ul>
              </div>
              
              <p className="text-xs text-muted-foreground border-t pt-2">
                💡 <strong>Dica:</strong> Clique em qualquer ponto do gráfico para adicionar uma pessoa. Arraste para reposicionar.
              </p>
            </div>
          </PopoverContent>
        </Popover>
        {/* Y-Axis label band (left side) */}
        <div className="flex">
          <div className="flex flex-col items-center justify-center w-10 mr-2">
            <div className="bg-[hsl(220,60%,35%)] rounded px-1 py-2 h-full flex items-center">
              <span 
                className="text-white text-[10px] font-semibold whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Comportamento de Suporte
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            {/* Y-Axis high/low labels with scale */}
            <div className="flex">
              <div className="w-8 flex flex-col justify-between text-[10px] text-white/80 font-medium pr-1">
                <span>Alta</span>
                <div className="flex-1 flex flex-col justify-between py-1">
                  {[...SCALE_MARKERS].reverse().map((n) => (
                    <span key={n} className="text-center text-white/60">{n}</span>
                  ))}
                </div>
                <span>Baixa</span>
              </div>
              
              {/* Chart area */}
              <div className="flex-1">
                <div
                  ref={chartRef}
                  className={cn(
                    'relative w-full aspect-square',
                    'overflow-hidden cursor-crosshair',
                    'rounded'
                  )}
                  onClick={handleChartClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {/* Quadrant backgrounds */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {/* Top-left: M3 - Baixo diretivo + Alto suporte */}
                    <div className="bg-white border-r border-b border-gray-300 flex items-center justify-center">
                      <div className="text-center px-2 pointer-events-none">
                        <span className="text-gray-900 text-sm font-bold block">M3</span>
                        <span className="text-gray-700 text-xs font-medium block">Adolescente</span>
                        <span className="text-gray-500 text-[9px] block mt-1">Dar suporte. M3 decide.</span>
                      </div>
                    </div>
                    {/* Top-right: M2 - Alto diretivo + Alto suporte */}
                    <div className="bg-white border-b border-gray-300 flex items-center justify-center">
                      <div className="text-center px-2 pointer-events-none">
                        <span className="text-gray-900 text-sm font-bold block">M2</span>
                        <span className="text-gray-700 text-xs font-medium block">Criança</span>
                        <span className="text-gray-500 text-[9px] block mt-1">Dar direção e suporte.</span>
                      </div>
                    </div>
                    {/* Bottom-left: M4 - Baixo diretivo + Baixo suporte */}
                    <div className="bg-white border-r border-gray-300 flex items-center justify-center">
                      <div className="text-center px-2 pointer-events-none">
                        <span className="text-gray-900 text-sm font-bold block">M4</span>
                        <span className="text-gray-700 text-xs font-medium block">Adulto</span>
                        <span className="text-gray-500 text-[9px] block mt-1">Delegar e desafiar.</span>
                      </div>
                    </div>
                    {/* Bottom-right: M1 - Alto diretivo + Baixo suporte */}
                    <div className="bg-white flex items-center justify-center">
                      <div className="text-center px-2 pointer-events-none">
                        <span className="text-gray-900 text-sm font-bold block">M1</span>
                        <span className="text-gray-700 text-xs font-medium block">Bebê</span>
                        <span className="text-gray-500 text-[9px] block mt-1">O Líder decide. Dar direção.</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Center lines */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-600/50" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600/50" />
                    
                    {/* Grid scale lines */}
                    {[20, 40, 60, 80].map((pos) => (
                      <div key={`grid-${pos}`}>
                        <div 
                          className="absolute top-0 bottom-0 w-px bg-gray-500/30"
                          style={{ left: `${pos}%` }}
                        />
                        <div 
                          className="absolute left-0 right-0 h-px bg-gray-500/30"
                          style={{ top: `${100 - pos}%` }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Points */}
                  {points.map((point) => (
                    <div key={point.id} data-point>
                      <MaturityPointMarker
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
                <span className="text-white text-[10px] font-medium">Baixo</span>
                <span className="text-white text-xs font-semibold">Comportamento Diretivo</span>
                <span className="text-white text-[10px] font-medium">Alto</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MaturityPointForm
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
