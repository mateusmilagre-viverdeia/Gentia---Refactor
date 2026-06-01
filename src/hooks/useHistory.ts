import { useState, useCallback, useRef } from 'react';

interface UseHistoryOptions<T> {
  maxHistory?: number;
}

interface UseHistoryReturn<T> {
  push: (state: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

export function useHistory<T>(options: UseHistoryOptions<T> = {}): UseHistoryReturn<T> {
  const { maxHistory = 50 } = options;
  
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [, forceUpdate] = useState(0);

  const push = useCallback((state: T) => {
    pastRef.current = [...pastRef.current, state].slice(-maxHistory);
    futureRef.current = []; // Clear redo stack on new action
    forceUpdate(n => n + 1);
  }, [maxHistory]);

  const undo = useCallback((): T | null => {
    if (pastRef.current.length === 0) return null;
    
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    forceUpdate(n => n + 1);
    
    return previous;
  }, []);

  const redo = useCallback((): T | null => {
    if (futureRef.current.length === 0) return null;
    
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    forceUpdate(n => n + 1);
    
    return next;
  }, []);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    forceUpdate(n => n + 1);
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clear,
  };
}
