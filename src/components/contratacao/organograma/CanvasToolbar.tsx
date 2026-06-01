import { Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Locate, RefreshCw, Hand, MousePointer2, Link2, Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { OrgChartSelector } from './OrgChartSelector';
import type { CanvasMode } from '@/hooks/useCanvasMode';
import type { OrgChart } from '@/types/org-chart.types';

interface CanvasToolbarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onExportPNG: () => void;
  isExporting: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onFitToScreen?: () => void;
  onAutoOrganize?: () => void;
  isAutoOrganizing?: boolean;
  canvasMode?: CanvasMode;
  onCanvasModeChange?: (mode: CanvasMode) => void;
  onAddRoot?: () => void;
  // Fullscreen-only controls
  charts?: OrgChart[];
  selectedChart?: OrgChart | null;
  onSelectChart?: (chart: OrgChart) => void;
  onCreateNewChart?: () => void;
  onEditChart?: () => void;
  onDeleteChart?: () => void;
}

export function CanvasToolbar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  onExportPNG,
  isExporting,
  isFullscreen,
  onToggleFullscreen,
  onFitToScreen,
  onAutoOrganize,
  isAutoOrganizing = false,
  canvasMode = 'selection',
  onCanvasModeChange,
  onAddRoot,
  charts,
  selectedChart,
  onSelectChart,
  onCreateNewChart,
  onEditChart,
  onDeleteChart,
}: CanvasToolbarProps) {
  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div className="flex items-center gap-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-1 shadow-sm flex-wrap">
      {/* Fullscreen-only: Chart selector */}
      {isFullscreen && charts && onSelectChart && onCreateNewChart && (
        <>
          <div className="px-1">
            <OrgChartSelector
              charts={charts}
              selectedChart={selectedChart || null}
              onSelect={onSelectChart}
              onCreateNew={onCreateNewChart}
            />
          </div>
          {selectedChart && onEditChart && onDeleteChart && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditChart}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Editar organograma</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDeleteChart}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Excluir organograma</p></TooltipContent>
              </Tooltip>
            </>
          )}
          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Add Root Node */}
      {onAddRoot && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddRoot}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Adicionar cargo raiz</p></TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Mode Toggle */}
      {onCanvasModeChange && (
        <>
          <ToggleGroup
            type="single"
            value={canvasMode}
            onValueChange={(value) => value && onCanvasModeChange(value as CanvasMode)}
            className="gap-0"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="selection" className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <MousePointer2 className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Modo Seleção</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="navigation" className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <Hand className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Modo Navegação (arrastar para mover)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="connection" className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <Link2 className="h-4 w-4" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Modo Conexão (clique em 2 cargos para conectar)</p></TooltipContent>
            </Tooltip>
          </ToggleGroup>

          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Zoom Controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut} disabled={!canZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Diminuir (Ctrl + -)</p></TooltipContent>
      </Tooltip>

      <div className="min-w-[60px] text-center text-sm font-medium tabular-nums">
        {zoomPercentage}%
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn} disabled={!canZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Aumentar (Ctrl + +)</p></TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onResetZoom} disabled={zoomLevel === 1}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Resetar zoom (Ctrl + 0)</p></TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Fit to Screen */}
      {onFitToScreen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToScreen}>
              <Locate className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Ajustar à tela</p></TooltipContent>
        </Tooltip>
      )}

      {/* Auto Organize */}
      {onAutoOrganize && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAutoOrganize} disabled={isAutoOrganizing}>
              <RefreshCw className={`h-4 w-4 ${isAutoOrganizing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>{isAutoOrganizing ? 'Organizando...' : 'Auto-organizar layout'}</p></TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Export PNG */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExportPNG} disabled={isExporting}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>{isExporting ? 'Exportando...' : 'Exportar como PNG'}</p></TooltipContent>
      </Tooltip>

      {/* Fullscreen Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>{isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}</p></TooltipContent>
      </Tooltip>
    </div>
  );
}
