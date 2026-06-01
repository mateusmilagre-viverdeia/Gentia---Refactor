import { useState, useCallback, useEffect, RefObject } from 'react';

interface UseOrgChartZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  defaultZoom?: number;
}

interface UseOrgChartZoomReturn {
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (level: number) => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  fitToScreen: () => void;
}

export function useOrgChartZoom(
  containerRef: RefObject<HTMLElement>,
  canvasRef?: RefObject<HTMLElement>,
  options: UseOrgChartZoomOptions = {}
): UseOrgChartZoomReturn {
  const {
    minZoom = 0.1,
    maxZoom = 2,
    zoomStep = 0.1,
    defaultZoom = 1,
  } = options;

  const [zoomLevel, setZoomLevel] = useState(defaultZoom);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + zoomStep, maxZoom));
  }, [zoomStep, maxZoom]);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - zoomStep, minZoom));
  }, [zoomStep, minZoom]);

  const resetZoom = useCallback(() => {
    setZoomLevel(defaultZoom);
  }, [defaultZoom]);

  const setZoom = useCallback(
    (level: number) => {
      setZoomLevel(Math.max(minZoom, Math.min(level, maxZoom)));
    },
    [minZoom, maxZoom]
  );

  // Fit to screen - calculate optimal zoom to show all content
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef?.current;
    
    if (!container || !canvas) {
      // If no canvas ref, just reset to default
      setZoomLevel(defaultZoom);
      return;
    }

    // Get container visible size
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width - 32; // padding
    const containerHeight = containerRect.height - 32;

    // Get canvas actual size (before transform)
    const canvasWidth = canvas.scrollWidth;
    const canvasHeight = canvas.scrollHeight;

    if (canvasWidth === 0 || canvasHeight === 0) {
      setZoomLevel(defaultZoom);
      return;
    }

    // Calculate zoom to fit both width and height
    const zoomX = containerWidth / canvasWidth;
    const zoomY = containerHeight / canvasHeight;
    
    // Use the smaller zoom to ensure content fits
    const optimalZoom = Math.min(zoomX, zoomY, maxZoom);
    const clampedZoom = Math.max(minZoom, Math.min(optimalZoom, maxZoom));
    
    setZoomLevel(clampedZoom);
  }, [containerRef, canvasRef, defaultZoom, minZoom, maxZoom]);

  // Handle Ctrl + Mouse Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        setZoomLevel((prev) => Math.max(minZoom, Math.min(prev + delta, maxZoom)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, zoomStep, minZoom, maxZoom]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    canZoomIn: zoomLevel < maxZoom,
    canZoomOut: zoomLevel > minZoom,
    fitToScreen,
  };
}
