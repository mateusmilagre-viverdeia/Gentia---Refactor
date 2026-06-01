import { useState, useCallback } from 'react';

export type CanvasMode = 'navigation' | 'selection' | 'connection';

export interface UseCanvasModeReturn {
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
  isNavigationMode: boolean;
  isSelectionMode: boolean;
  isConnectionMode: boolean;
  connectionSource: string | null;
  setConnectionSource: (id: string | null) => void;
  toggleMode: (targetMode: CanvasMode) => void;
}

export function useCanvasMode(): UseCanvasModeReturn {
  const [mode, setModeState] = useState<CanvasMode>('selection');
  const [connectionSource, setConnectionSource] = useState<string | null>(null);

  const setMode = useCallback((newMode: CanvasMode) => {
    setModeState(newMode);
    // Reset connection source when leaving connection mode
    if (newMode !== 'connection') {
      setConnectionSource(null);
    }
  }, []);

  const toggleMode = useCallback((targetMode: CanvasMode) => {
    setModeState(current => current === targetMode ? 'selection' : targetMode);
    if (targetMode !== 'connection') {
      setConnectionSource(null);
    }
  }, []);

  return {
    mode,
    setMode,
    isNavigationMode: mode === 'navigation',
    isSelectionMode: mode === 'selection',
    isConnectionMode: mode === 'connection',
    connectionSource,
    setConnectionSource,
    toggleMode,
  };
}
