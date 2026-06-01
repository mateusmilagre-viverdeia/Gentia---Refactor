import { useEffect } from 'react';

const CACHE_VERSION = '1.0.1';
const CACHE_VERSION_KEY = 'cache_version';

export function useCacheVersion() {
  useEffect(() => {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    
    if (storedVersion !== CACHE_VERSION) {
      console.log('[CacheVersion] Outdated cache detected, clearing...');
      
      // Clear all localStorage except cache_version
      const keysToPreserve = [CACHE_VERSION_KEY];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Set new cache version
      localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      
      // Reload to apply clean state
      window.location.reload();
    }
  }, []);
}
