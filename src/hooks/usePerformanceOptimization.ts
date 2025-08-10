// src/hooks/usePerformanceOptimization.ts
import { useRef, useCallback, useMemo, useEffect } from 'react';

// Hook for debouncing expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
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
  const lastRan = useRef<number>();
  const timeout = useRef<NodeJS.Timeout>();

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
  const ref = useRef<{ deps: React.DependencyList; value: T }>();

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

  return ref.current.value;
}

// Hook for intersection observer (lazy loading, infinite scroll)
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);

  React.useEffect(() => {
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
  const lastRenderTime = useRef<number>();
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
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
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
  const requestRef = useRef<number>();

  const animate = useCallback(() => {
    callback();
    if (active) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [callback, active]);

  React.useEffect(() => {
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
import React from 'react';
