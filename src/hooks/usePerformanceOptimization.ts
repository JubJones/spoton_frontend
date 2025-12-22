// src/hooks/usePerformanceOptimization.ts
import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';

// Hook for debouncing expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttling high-frequency events
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastRan = useRef<number | undefined>(undefined);
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (!lastRan.current || now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        clearTimeout(timeout.current);
        timeout.current = setTimeout(
          () => {
            callback(...args);
            lastRan.current = Date.now();
          },
          delay - (now - lastRan.current)
        );
      }
    }) as T,
    [callback, delay]
  );
}

// Hook for memoizing expensive calculations with custom equality
export function useMemoWithComparison<T>(
  factory: () => T,
  deps: React.DependencyList,
  compare?: (a: T, b: T) => boolean
): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(undefined);

  const depsChanged =
    !ref.current ||
    deps.length !== ref.current.deps.length ||
    deps.some((dep, index) => dep !== ref.current!.deps[index]);

  if (depsChanged) {
    const newValue = factory();

    if (!ref.current || !compare || !compare(ref.current.value, newValue)) {
      ref.current = { deps: [...deps], value: newValue };
    }
  }

  return ref.current!.value;
}

// Hook for intersection observer (lazy loading, infinite scroll)
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      const isIntersectingNow = entry.isIntersecting;
      setIsIntersecting(isIntersectingNow);

      if (isIntersectingNow && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [targetRef, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Hook for tracking component render performance
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number | undefined>(undefined);
  const totalRenderTime = useRef(0);

  useEffect(() => {
    const now = performance.now();
    renderCount.current += 1;

    if (lastRenderTime.current) {
      const renderDuration = now - lastRenderTime.current;
      totalRenderTime.current += renderDuration;

      if (process.env.NODE_ENV === 'development') {
        // Log slow renders
        if (renderDuration > 16) {
          // More than one frame at 60fps
          console.warn(`Slow render detected in ${componentName}: ${renderDuration.toFixed(2)}ms`);
        }
      }
    }

    lastRenderTime.current = now;
  });

  const getPerformanceMetrics = useCallback(() => {
    return {
      renderCount: renderCount.current,
      averageRenderTime:
        renderCount.current > 1 ? totalRenderTime.current / (renderCount.current - 1) : 0,
      totalRenderTime: totalRenderTime.current,
    };
  }, []);

  return getPerformanceMetrics;
}

// Hook for efficient list updates (avoiding full re-renders)
export function useStableList<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string | number
) {
  const prevItems = useRef<T[]>([]);
  const prevKeys = useRef<(string | number)[]>([]);

  const stableItems = useMemo(() => {
    const newKeys = items.map(keyExtractor);
    const prevKeySet = new Set(prevKeys.current);
    const newKeySet = new Set(newKeys);

    // If keys haven't changed, return previous items to maintain references
    if (prevKeys.current.length === newKeys.length && newKeys.every((key) => prevKeySet.has(key))) {
      return prevItems.current;
    }

    // Update refs and return new items
    prevItems.current = items;
    prevKeys.current = newKeys;

    return items;
  }, [items, keyExtractor]);

  return stableItems;
}

// Hook for managing component visibility based on viewport
export function useViewportVisibility(threshold = 0.1) {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.intersectionRatio > threshold);
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return { elementRef, isVisible };
}

// Hook for efficient frame-based animations
export function useAnimationFrame(callback: () => void, active = true) {
  const requestRef = useRef<number | undefined>(undefined);

  const animate = useCallback(() => {
    callback();
    if (active) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [callback, active]);

  useEffect(() => {
    if (active) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [active, animate]);

  const stopAnimation = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  }, []);

  return stopAnimation;
}

// React import fix


// =============================================================================
// Phase 11: Advanced Performance Monitoring and Optimization
// =============================================================================

import { performanceOptimizationService } from '../services/performanceOptimizationService';
import { APP_CONFIG } from '../config/app';

interface AdvancedPerformanceState {
  isOptimized: boolean;
  memoryUsage: number; // percentage
  frameRate: number;
  cacheHitRate: number;
  networkLatency: number;
  lastUpdate: number;
}

interface PerformanceActions {
  startMeasurement: (name: string) => void;
  endMeasurement: (name: string) => number;
  cacheData: (key: string, data: any, ttl?: number) => void;
  getCachedData: (key: string) => any | null;
  clearCache: () => void;
  optimizeComponent: (componentName: string) => void;
  reportPerformance: () => void;
}

/**
 * Phase 11: Advanced Performance Optimization Hook
 * Integrates with performanceOptimizationService for comprehensive monitoring
 */
export function useAdvancedPerformance(options?: {
  enableAutoOptimization?: boolean;
  memoryThreshold?: number;
  updateInterval?: number;
}): [AdvancedPerformanceState, PerformanceActions] {

  const config = {
    enableAutoOptimization: false, // Disabled by default to prevent infinite loops
    memoryThreshold: 85,
    updateInterval: 5000, // Increased interval to reduce frequency
    ...options,
  };

  const [performanceState, setPerformanceState] = useState<AdvancedPerformanceState>({
    isOptimized: true,
    memoryUsage: 0,
    frameRate: 60,
    cacheHitRate: 0,
    networkLatency: 0,
    lastUpdate: Date.now(),
  });

  const componentMetrics = useRef(new Map<string, { renders: number; avgTime: number }>());
  const lastOptimizationTime = useRef(0);
  const optimizationInProgress = useRef(false);
  const consecutiveOptimizations = useRef(0);

  // Monitor performance metrics
  useEffect(() => {
    if (!APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
      return;
    }

    const updateMetrics = () => {
      // Skip if optimization is currently in progress to prevent cascading
      if (optimizationInProgress.current) {
        return;
      }

      const metrics = performanceOptimizationService.getMetrics();

      setPerformanceState(prevState => {
        // Only update if metrics have meaningfully changed to prevent infinite loops
        const significantChange =
          Math.abs(prevState.memoryUsage - metrics.memoryUsage.percentage) > 5 ||
          Math.abs(prevState.frameRate - metrics.frameRate) > 5 ||
          Date.now() - prevState.lastUpdate > 5000; // Force update every 5 seconds

        if (!significantChange) {
          return prevState;
        }

        return {
          isOptimized: metrics.memoryUsage.percentage < config.memoryThreshold,
          memoryUsage: metrics.memoryUsage.percentage,
          frameRate: metrics.frameRate,
          cacheHitRate: metrics.cacheMetrics.hitRate,
          networkLatency: metrics.networkLatency,
          lastUpdate: Date.now(),
        };
      });

      // Auto-optimization with enhanced throttling
      if (config.enableAutoOptimization && !optimizationInProgress.current) {
        const now = Date.now();
        const timeSinceLastOptimization = now - lastOptimizationTime.current;

        // Progressive throttling: longer delays after consecutive optimizations
        const minDelayMs = Math.min(10000 + (consecutiveOptimizations.current * 5000), 60000);

        // Only trigger optimization if enough time has passed and we haven't had too many consecutive optimizations
        if (timeSinceLastOptimization > minDelayMs && consecutiveOptimizations.current < 3) {
          if (metrics.memoryUsage.percentage > config.memoryThreshold) {
            console.log('🚨 High memory usage detected, triggering optimization');
            performOptimization();
            lastOptimizationTime.current = now;
            consecutiveOptimizations.current++;
          } else if (metrics.frameRate < 30) {
            console.log('🚨 Low frame rate detected, reducing rendering complexity');
            optimizeRendering();
            lastOptimizationTime.current = now;
            consecutiveOptimizations.current++;
          } else {
            // Reset consecutive count if metrics are good
            consecutiveOptimizations.current = 0;
          }
        } else if (timeSinceLastOptimization > 60000) {
          // Reset consecutive count after 1 minute
          consecutiveOptimizations.current = 0;
        }
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, config.updateInterval);
    return () => clearInterval(interval);
  }, [config.enableAutoOptimization, config.memoryThreshold, config.updateInterval]);

  // Performance actions
  const startMeasurement = useCallback((name: string) => {
    if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
      performanceOptimizationService.startPerformanceMeasure(name);
    }
  }, []);

  const endMeasurement = useCallback((name: string): number => {
    if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
      return performanceOptimizationService.endPerformanceMeasure(name);
    }
    return 0;
  }, []);

  const cacheData = useCallback((key: string, data: any, ttl?: number) => {
    performanceOptimizationService.cacheData(key, data, ttl);
  }, []);

  const getCachedData = useCallback((key: string): any | null => {
    return performanceOptimizationService.getCachedData(key);
  }, []);

  const clearCache = useCallback(() => {
    console.log('🧹 Clearing performance cache');
    // Cache clearing would be implemented in the service
  }, []);

  const optimizeComponent = useCallback((componentName: string) => {
    const existing = componentMetrics.current.get(componentName) || { renders: 0, avgTime: 0 };
    existing.renders++;
    componentMetrics.current.set(componentName, existing);

    if (existing.renders > 10 && existing.avgTime > 16) {
      console.warn(`⚠️ Component ${componentName} may need optimization:`, existing);
    }
  }, []);

  const reportPerformance = useCallback(() => {
    performanceOptimizationService.reportPerformanceData();
  }, []);

  // Internal optimization methods
  const performOptimization = useCallback(async () => {
    if (optimizationInProgress.current) {
      return; // Prevent overlapping optimizations
    }

    optimizationInProgress.current = true;

    try {
      // Clear cache first
      clearCache();

      // Wait a bit for cache clearing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger garbage collection if available
      if (typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

      // Wait for GC to complete
      await new Promise(resolve => setTimeout(resolve, 500));

    } finally {
      // Always reset the flag after a delay to ensure operations complete
      setTimeout(() => {
        optimizationInProgress.current = false;
      }, 1000);
    }
  }, [clearCache]);

  const optimizeRendering = useCallback(() => {
    document.documentElement.style.setProperty('--animation-duration', '0ms');
    setTimeout(() => {
      document.documentElement.style.removeProperty('--animation-duration');
    }, 5000);
  }, []);

  const actions: PerformanceActions = {
    startMeasurement,
    endMeasurement,
    cacheData,
    getCachedData,
    clearCache,
    optimizeComponent,
    reportPerformance,
  };

  return [performanceState, actions];
}

/**
 * Phase 11: WebSocket Performance Monitoring Hook
 */
export function useWebSocketPerformance() {
  const [, { startMeasurement, endMeasurement, cacheData, getCachedData }] = useAdvancedPerformance({
    enableAutoOptimization: false // Prevent optimization loops
  });

  const measureLatency = useCallback((sendTime: number) => {
    const latency = Date.now() - sendTime;
    performanceOptimizationService.measureWebSocketLatency(sendTime);
    return latency;
  }, []);

  const cacheMessage = useCallback((messageId: string, message: any) => {
    cacheData(`ws-message-${messageId}`, message, 30000);
  }, [cacheData]);

  const getCachedMessage = useCallback((messageId: string) => {
    return getCachedData(`ws-message-${messageId}`);
  }, [getCachedData]);

  return {
    measureLatency,
    cacheMessage,
    getCachedMessage,
    startMeasurement,
    endMeasurement,
  };
}

/**
 * Phase 11: Tracking Data Performance Hook
 */
export function useTrackingDataPerformance() {
  const [performanceState, { startMeasurement, endMeasurement, cacheData }] = useAdvancedPerformance({
    enableAutoOptimization: false // Prevent optimization loops
  });

  const optimizeTrackingUpdate = useCallback((trackingData: any) => {
    startMeasurement('tracking-update-processing');

    const processedData = {
      ...trackingData,
      timestamp: Date.now(),
    };

    cacheData(`tracking-${trackingData.global_frame_index}`, processedData, 60000);

    const duration = endMeasurement('tracking-update-processing');

    return {
      data: processedData,
      processingTime: duration,
      shouldThrottle: duration > 50,
    };
  }, [startMeasurement, endMeasurement, cacheData]);

  return {
    optimizeTrackingUpdate,
    performanceState,
  };
}
