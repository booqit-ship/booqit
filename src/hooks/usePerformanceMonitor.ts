
import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const startTime = performance.now();

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Only log if render time is significant (> 16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`Performance: ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }

    // Store metrics for potential analysis
    const metrics: PerformanceMetrics = {
      componentName,
      renderTime,
      timestamp: Date.now()
    };

    // Store in sessionStorage for debugging (limit to last 100 entries)
    try {
      const existing = JSON.parse(sessionStorage.getItem('performance-metrics') || '[]');
      const updated = [...existing, metrics].slice(-100);
      sessionStorage.setItem('performance-metrics', JSON.stringify(updated));
    } catch (error) {
      // Ignore storage errors
    }
  }, [componentName, startTime]);

  const measureOperation = useCallback((operationName: string, operation: () => void | Promise<void>) => {
    const start = performance.now();
    
    const finish = () => {
      const end = performance.now();
      const duration = end - start;
      
      if (duration > 100) { // Log operations taking > 100ms
        console.warn(`Performance: ${componentName}.${operationName} took ${duration.toFixed(2)}ms`);
      }
    };

    try {
      const result = operation();
      if (result instanceof Promise) {
        return result.finally(finish);
      } else {
        finish();
        return result;
      }
    } catch (error) {
      finish();
      throw error;
    }
  }, [componentName]);

  return { measureOperation };
};

export const getPerformanceMetrics = (): PerformanceMetrics[] => {
  try {
    return JSON.parse(sessionStorage.getItem('performance-metrics') || '[]');
  } catch {
    return [];
  }
};

export const clearPerformanceMetrics = (): void => {
  try {
    sessionStorage.removeItem('performance-metrics');
  } catch {
    // Ignore errors
  }
};
