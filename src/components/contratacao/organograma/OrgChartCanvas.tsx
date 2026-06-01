import { useState, useRef, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrgChartNodeComponent } from './OrgChartNode';
import { NodeForm } from './NodeForm';
import { CanvasToolbar } from './CanvasToolbar';
import { HelpText } from './HelpText';
import { MiniMap } from './MiniMap';
import { ConnectionLines } from './ConnectionLines';
import { useOrgChartZoom } from '@/hooks/useOrgChartZoom';
import { useOrgChartCanvas } from '@/hooks/useOrgChartCanvas';
import { useCanvasMode } from '@/hooks/useCanvasMode';
import { useOrgChartConnections } from '@/hooks/useOrgChartConnections';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { OrgChartNode, OrgChartNodeWithChildren, NodePerson, VacancyStatus, OrgChart } from '@/types/org-chart.types';

interface OrgChartCanvasProps {
  tree: OrgChartNodeWithChildren[];
  chartId: string | null;
  chartName?: string;
  onAddNode: (title: string, parentId: string | null, personName?: string, roles?: string[], personAvatar?: string, people?: NodePerson[], vacancyStatus?: VacancyStatus) => Promise<OrgChartNode | undefined>;
  onUpdateNode: (nodeId: string, updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'person_avatar' | 'roles' | 'notes' | 'tags' | 'people' | 'vacancy_status'>>) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, newParentId: string | null) => Promise<void>;
  allNodes?: OrgChartNode[];
  // Fullscreen chart management props
  charts?: OrgChart[];
  selectedChart?: OrgChart | null;
  onSelectChart?: (chart: OrgChart) => void;
  onCreateNewChart?: () => void;
  onEditChart?: () => void;
  onDeleteChart?: () => void;
}

export function OrgChartCanvas({
  tree,
  chartId,
  chartName = 'organograma',
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onMoveNode,
  allNodes = [],
  charts,
  selectedChart,
  onSelectChart,
  onCreateNewChart,
  onEditChart,
  onDeleteChart,
}: OrgChartCanvasProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgChartNodeWithChildren | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { zoomLevel, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, fitToScreen } = useOrgChartZoom(containerRef, canvasRef);
  
  const {
    selectedNodeId,
    setSelectedNodeId,
    isExporting,
    exportToPNG,
    isFullscreen,
    toggleFullscreen,
  } = useOrgChartCanvas({
    containerRef: fullscreenContainerRef,
    canvasRef,
    chartName,
  });

  const {
    mode: canvasMode,
    setMode: setCanvasMode,
    isNavigationMode,
    isConnectionMode,
    connectionSource,
    setConnectionSource,
  } = useCanvasMode();

  const { 
    connections, 
    addConnection, 
    deleteConnection 
  } = useOrgChartConnections(chartId);

  // Auto-fit on mount and when tree changes (only in non-fullscreen)
  useEffect(() => {
    if (isFullscreen) return;
    const timer = setTimeout(() => {
      fitToScreen();
    }, 300);
    return () => clearTimeout(timer);
  }, [tree, fitToScreen, isFullscreen]);

  const [isAutoOrganizing, setIsAutoOrganizing] = useState(false);

  const handleAutoOrganize = () => {
    setIsAutoOrganizing(true);
    setTimeout(() => {
      fitToScreen();
      if (scrollContainerRef.current) {
        const el = scrollContainerRef.current;
        el.scrollTo({
          left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2),
          top: Math.max(0, (el.scrollHeight - el.clientHeight) / 2),
          behavior: 'smooth'
        });
      }
      setIsAutoOrganizing(false);
    }, 300);
  };

  // Handle keyboard delete for selected node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNodeId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const findNode = (nodes: OrgChartNodeWithChildren[]): OrgChartNodeWithChildren | undefined => {
          for (const node of nodes) {
            if (node.id === selectedNodeId) return node;
            const found = findNode(node.children);
            if (found) return found;
          }
          return undefined;
        };
        const node = findNode(tree);
        if (node) {
          setSelectedNodeId(null);
          onDeleteNode(node.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, tree, onDeleteNode, setSelectedNodeId]);

  const handleAddRoot = () => {
    setEditingNode(null);
    setParentIdForNew(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingNode(null);
    setParentIdForNew(parentId);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEdit = (node: OrgChartNodeWithChildren) => {
    setEditingNode(node);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (title: string, personName?: string, roles?: string[], personAvatar?: string, people?: NodePerson[], vacancyStatus?: VacancyStatus) => {
    await onAddNode(title, parentIdForNew, personName, roles, personAvatar, people, vacancyStatus);
    setIsFormOpen(false);
  };

  const handleFormUpdate = (updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'person_avatar' | 'roles' | 'people' | 'vacancy_status'>>) => {
    if (editingNode) {
      onUpdateNode(editingNode.id, updates);
      setIsFormOpen(false);
    }
  };

  const handleNodeSelect = async (nodeId: string) => {
    if (isConnectionMode) {
      if (!connectionSource) {
        setConnectionSource(nodeId);
        toast.info('Cargo de origem selecionado. Clique no cargo de destino.');
      } else if (connectionSource !== nodeId) {
        await addConnection(connectionSource, nodeId, 'dashed');
        setConnectionSource(null);
        setCanvasMode('selection');
      }
      return;
    }
    setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId);
  };

  // Handle escape key to cancel connection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConnectionMode) {
        setConnectionSource(null);
        setCanvasMode('selection');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnectionMode, setCanvasMode, setConnectionSource]);

  // Get the portal container for dialogs in fullscreen
  const portalContainer = isFullscreen ? fullscreenContainerRef.current : undefined;

  if (tree.length === 0) {
    return (
      <>
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-xl">Comece seu organograma</CardTitle>
            <CardDescription>
              Adicione o primeiro cargo (geralmente o CEO ou fundador)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAddRoot}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cargo Raiz
            </Button>
          </CardContent>
        </Card>

        <NodeForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleFormSubmit}
          mode="create"
        />
      </>
    );
  }

  return (
    <div 
      ref={fullscreenContainerRef}
      className={cn(
        "relative flex flex-col w-full",
        isFullscreen && "bg-background p-4 h-screen"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <HelpText 
          mode={canvasMode}
          selectedNodeId={selectedNodeId}
          connectionSource={connectionSource}
        />
        <CanvasToolbar
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onExportPNG={exportToPNG}
          isExporting={isExporting}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onFitToScreen={fitToScreen}
          onAutoOrganize={handleAutoOrganize}
          isAutoOrganizing={isAutoOrganizing}
          canvasMode={canvasMode}
          onCanvasModeChange={setCanvasMode}
          onAddRoot={handleAddRoot}
          charts={charts}
          selectedChart={selectedChart}
          onSelectChart={onSelectChart}
          onCreateNewChart={onCreateNewChart}
          onEditChart={onEditChart}
          onDeleteChart={onDeleteChart}
        />
      </div>

      {/* Canvas area — self-contained with internal scroll */}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "flex-1 w-full border rounded-lg relative",
          isFullscreen ? "overflow-auto" : "overflow-hidden",
          isFullscreen ? "h-[calc(100vh-80px)]" : "h-[calc(100vh-280px)]",
          isNavigationMode && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={(e) => {
          if (!isNavigationMode) return;
          const el = scrollContainerRef.current;
          if (!el) return;
          
          const startX = e.clientX;
          const startY = e.clientY;
          const startScrollLeft = el.scrollLeft;
          const startScrollTop = el.scrollTop;
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            el.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
            el.scrollTop = startScrollTop - (moveEvent.clientY - startY);
          };
          
          const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
          };
          
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div ref={containerRef}>
          <div 
            ref={canvasRef}
            className={cn(
              "relative p-8 flex flex-col items-center transition-transform duration-200 ease-out bg-background",
              isFullscreen && "min-w-max",
              isConnectionMode && "cursor-crosshair"
            )}
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isConnectionMode && !isNavigationMode) {
                setSelectedNodeId(null);
              }
            }}
          >
            <ConnectionLines
              connections={connections}
              canvasRef={canvasRef}
              onDeleteConnection={deleteConnection}
              zoomLevel={zoomLevel}
            />
            {tree.map((rootNode) => (
              <OrgChartNodeComponent
                key={rootNode.id}
                node={rootNode}
                onEdit={handleEdit}
                onAddChild={handleAddChild}
                onDelete={onDeleteNode}
                onUpdateNotes={(nodeId, notes) => onUpdateNode(nodeId, { notes })}
                onUpdateTags={(nodeId, tags) => onUpdateNode(nodeId, { tags })}
                selectedNodeId={selectedNodeId}
                onSelect={handleNodeSelect}
                onMoveNode={onMoveNode}
                isRoot
              />
            ))}
          </div>
        </div>
      </div>

      {/* MiniMap */}
      <MiniMap
        canvasRef={canvasRef}
        scrollContainerRef={scrollContainerRef as any}
      />

      <NodeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        onUpdate={handleFormUpdate}
        editingNode={editingNode}
        mode={formMode}
        allNodes={allNodes}
        onMoveNode={onMoveNode}
        portalContainer={portalContainer}
      />
    </div>
  );
}
