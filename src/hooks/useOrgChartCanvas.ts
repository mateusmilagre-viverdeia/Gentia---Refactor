import { useState, useCallback, useEffect, RefObject } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface UseOrgChartCanvasOptions {
  containerRef: RefObject<HTMLElement>;
  canvasRef: RefObject<HTMLElement>;
  chartName?: string;
}

interface UseOrgChartCanvasReturn {
  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  // Export
  isExporting: boolean;
  exportToPNG: () => Promise<void>;
  
  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  
  // Keyboard handlers
  handleKeyDown: (nodeId: string, onDelete: () => void) => void;
}

export function useOrgChartCanvas({
  containerRef,
  canvasRef,
  chartName = 'organograma',
}: UseOrgChartCanvasOptions): UseOrgChartCanvasReturn {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Export to PNG using html2canvas
  const exportToPNG = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('Canvas não encontrado');
      return;
    }

    setIsExporting(true);
    try {
      const result = await html2canvas(canvas, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        windowWidth: canvas.scrollWidth,
        windowHeight: canvas.scrollHeight,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${chartName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = result.toDataURL('image/png');
      link.click();

      toast.success('Organograma exportado com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar organograma');
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, chartName]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fullscreen error:', err);
        toast.error('Não foi possível entrar em tela cheia');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, [containerRef]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle keyboard shortcuts for delete
  const handleKeyDown = useCallback((nodeId: string, onDelete: () => void) => {
    const handler = (e: KeyboardEvent) => {
      if (selectedNodeId === nodeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        // Prevent default only if not in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          onDelete();
        }
      }
      
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };

    return handler;
  }, [selectedNodeId]);

  // Global keyboard listener for Escape and Delete
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return {
    selectedNodeId,
    setSelectedNodeId,
    isExporting,
    exportToPNG,
    isFullscreen,
    toggleFullscreen,
    handleKeyDown,
  };
}
