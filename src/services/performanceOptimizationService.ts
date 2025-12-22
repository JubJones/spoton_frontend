// Performance Optimization Service - Phase 11 Data Management & Performance
// src/services/performanceOptimizationService.ts

import React from 'react';
import { APP_CONFIG, PERFORMANCE_LIMITS } from '../config/app';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  jsHeapSizeLimit?: number;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  operations: number;
}

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: MemoryUsage;
  networkLatency: number;
  renderTime: number;
  webSocketLatency: number;
  cacheMetrics: CacheMetrics;
  timestamp: number;
}

interface OptimizationConfig {
  enableMemoryManagement: boolean;
  enableDataCompression: boolean;
  enableLazyLoading: boolean;
  enablePerformanceMonitoring: boolean;
  memoryThreshold: number; // Percentage (0-100)
  cacheCleanupInterval: number; // milliseconds
  maxCacheSize: number; // bytes
  compressionThreshold: number; // bytes
}

// =============================================================================
// Performance Optimization Service
// =============================================================================

class PerformanceOptimizationService {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private memoryCache = new Map<string, { data: any; timestamp: number; size: number }>();
  private performanceObserver?: PerformanceObserver;
  private cleanupInterval?: NodeJS.Timeout;
  private frameRateCounter = 0;
  private frameRateTimer?: NodeJS.Timeout;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      enableMemoryManagement: true,
      enableDataCompression: true,
      enableLazyLoading: true,
      enablePerformanceMonitoring: APP_CONFIG.ENABLE_PERFORMANCE_MONITORING,
      memoryThreshold: 85, // 85% memory usage threshold
      cacheCleanupInterval: PERFORMANCE_LIMITS.CACHE_CLEANUP_INTERVAL_MS,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      compressionThreshold: 1024, // 1KB
      ...config,
    };

    this.metrics = {
      frameRate: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      networkLatency: 0,
      renderTime: 0,
      webSocketLatency: 0,
      cacheMetrics: {
        hitRate: 0,
        missRate: 0,
        size: 0,
        maxSize: this.config.maxCacheSize,
        evictions: 0,
        operations: 0,
      },
      timestamp: Date.now(),
    };

    this.initialize();
  }

  // =============================================================================
  // Initialization and Setup
  // =============================================================================

  private initialize(): void {
    if (this.config.enablePerformanceMonitoring) {
      this.setupPerformanceObserver();
      this.startFrameRateMonitoring();
    }

    if (this.config.enableMemoryManagement) {
      this.startMemoryMonitoring();
    }

    if (this.config.cacheCleanupInterval > 0) {
      this.startCacheCleanup();
    }

    console.log('🚀 Performance Optimization Service initialized', this.config);
  }

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.networkLatency = navEntry.responseEnd - navEntry.requestStart;
          } else if (entry.entryType === 'measure') {
            if (entry.name.includes('render')) {
              this.metrics.renderTime = entry.duration;
            } else if (entry.name.includes('websocket')) {
              this.metrics.webSocketLatency = entry.duration;
            }
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'measure', 'mark'] });
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  private startFrameRateMonitoring(): void {
    const measureFrameRate = () => {
      this.frameRateCounter++;
      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);

    this.frameRateTimer = setInterval(() => {
      this.metrics.frameRate = this.frameRateCounter;
      this.frameRateCounter = 0;
    }, 1000);
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.updateMemoryMetrics();

      if (this.metrics.memoryUsage.percentage > this.config.memoryThreshold) {
        console.warn(`🚨 High memory usage: ${this.metrics.memoryUsage.percentage.toFixed(1)}%`);
        this.performMemoryCleanup();
      }
    }, 5000); // Check every 5 seconds
  }

  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCacheCleanup();
    }, this.config.cacheCleanupInterval);
  }

  // =============================================================================
  // Memory Management
  // =============================================================================

  private updateMemoryMetrics(): void {
    if (typeof (performance as any).memory !== 'undefined') {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: memInfo.usedJSHeapSize || 0,
        total: memInfo.totalJSHeapSize || 0,
        jsHeapSizeLimit: memInfo.jsHeapSizeLimit || 0,
        percentage: memInfo.totalJSHeapSize > 0
          ? (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100
          : 0,
      };
    } else {
      // Estimate memory usage for browsers without performance.memory
      this.metrics.memoryUsage = {
        used: this.estimateMemoryUsage(),
        total: 0,
        percentage: 0,
      };
    }

    this.metrics.timestamp = Date.now();
  }

  private estimateMemoryUsage(): number {
    // Rough estimation based on cache size and DOM nodes
    const cacheSize = Array.from(this.memoryCache.values())
      .reduce((total, item) => total + item.size, 0);

    const domNodes = document.querySelectorAll('*').length;
    const estimatedDomSize = domNodes * 100; // Rough estimate: 100 bytes per DOM node

    return cacheSize + estimatedDomSize;
  }

  private performMemoryCleanup(): void {
    console.log('🧹 Performing memory cleanup');

    // Clear least recently used cache entries
    const cacheEntries = Array.from(this.memoryCache.entries());
    const sortedByAge = cacheEntries
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest 50% of cache entries
    const toRemove = Math.floor(sortedByAge.length * 0.5);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(sortedByAge[i][0]);
    }

    // Trigger garbage collection if available
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    // Update metrics
    this.updateCacheMetrics();
  }

  // =============================================================================
  // Data Compression
  // =============================================================================

  public compressData(data: any): string | ArrayBuffer {
    if (!this.config.enableDataCompression) {
      return JSON.stringify(data);
    }

    const jsonString = JSON.stringify(data);

    // Only compress if data is larger than threshold
    if (jsonString.length < this.config.compressionThreshold) {
      return jsonString;
    }

    try {
      // Use CompressionStream if available (modern browsers)
      /* if (typeof CompressionStream !== 'undefined') {
        // return this.compressWithStream(jsonString); // Async not supported in sync method
      } */

      // Fallback: Simple string compression
      return this.compressString(jsonString);
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error);
      return jsonString;
    }
  }

  private async compressWithStream(data: string): Promise<ArrayBuffer> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new TextEncoder().encode(data));
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }

  private compressString(data: string): string {
    // Simple run-length encoding for demonstration
    // In production, consider using a proper compression library like pako
    return data.replace(/(.)\1+/g, (match, char) => {
      return match.length > 3 ? `${char}${match.length}` : match;
    });
  }

  public decompressData(compressedData: string | ArrayBuffer): any {
    try {
      if (compressedData instanceof ArrayBuffer) {
        // Handle ArrayBuffer decompression
        const decompressed = this.decompressArrayBuffer(compressedData);
        return JSON.parse(decompressed);
      } else {
        // Handle string decompression
        const decompressed = this.decompressString(compressedData as string);
        return JSON.parse(decompressed);
      }
    } catch (error) {
      console.warn('Decompression failed:', error);
      // Try to parse as regular JSON
      return JSON.parse(compressedData as string);
    }
  }

  private decompressArrayBuffer(data: ArrayBuffer): string {
    // Placeholder for ArrayBuffer decompression
    return new TextDecoder().decode(data);
  }

  private decompressString(data: string): string {
    // Reverse the simple run-length encoding
    return data.replace(/(.)\d+/g, (match, char) => {
      const count = parseInt(match.slice(1));
      return char.repeat(count);
    });
  }

  // =============================================================================
  // Caching Optimization
  // =============================================================================

  public cacheData(key: string, data: any, ttl: number = 300000): void {
    const size = this.estimateSize(data);
    const currentCacheSize = this.getCurrentCacheSize();

    // Check if cache is getting too large
    if (currentCacheSize + size > this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    // Compress data if enabled and large enough
    const processedData = this.config.enableDataCompression && size > this.config.compressionThreshold
      ? this.compressData(data)
      : data;

    this.memoryCache.set(key, {
      data: processedData,
      timestamp: Date.now(),
      size: this.estimateSize(processedData),
    });

    // Set TTL cleanup
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttl);

    this.updateCacheMetrics();
  }

  public getCachedData(key: string): any | null {
    const cached = this.memoryCache.get(key);

    if (!cached) {
      this.metrics.cacheMetrics.operations++;
      return null;
    }

    // Update timestamp for LRU
    cached.timestamp = Date.now();

    this.metrics.cacheMetrics.operations++;
    this.updateCacheMetrics();

    // Decompress if needed
    if (this.config.enableDataCompression &&
      (typeof cached.data === 'string' || cached.data instanceof ArrayBuffer)) {
      try {
        return this.decompressData(cached.data);
      } catch (error) {
        return cached.data;
      }
    }

    return cached.data;
  }

  private evictLeastRecentlyUsed(): void {
    const entries = Array.from(this.memoryCache.entries());
    const sorted = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest 25% of entries
    const toRemove = Math.floor(sorted.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(sorted[i][0]);
      this.metrics.cacheMetrics.evictions++;
    }
  }

  private performCacheCleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > maxAge) {
        this.memoryCache.delete(key);
        this.metrics.cacheMetrics.evictions++;
      }
    }

    console.log(`🧹 Cache cleanup completed. Removed expired entries.`);
    this.updateCacheMetrics();
  }

  private getCurrentCacheSize(): number {
    return Array.from(this.memoryCache.values())
      .reduce((total, item) => total + item.size, 0);
  }

  private estimateSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }

    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  private updateCacheMetrics(): void {
    const total = this.metrics.cacheMetrics.operations;
    const hits = total > 0 ? this.memoryCache.size : 0;

    this.metrics.cacheMetrics = {
      ...this.metrics.cacheMetrics,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      missRate: total > 0 ? ((total - hits) / total) * 100 : 0,
      size: this.getCurrentCacheSize(),
    };
  }

  // =============================================================================
  // Performance Monitoring
  // =============================================================================

  public getMetrics(): PerformanceMetrics {
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }

  public startPerformanceMeasure(name: string): void {
    if (this.config.enablePerformanceMonitoring && typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  public endPerformanceMeasure(name: string): number {
    if (this.config.enablePerformanceMonitoring && typeof performance !== 'undefined') {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);

        const entries = performance.getEntriesByName(name);
        return entries.length > 0 ? entries[entries.length - 1].duration : 0;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
        return 0;
      }
    }
    return 0;
  }

  public measureWebSocketLatency(sendTime: number): void {
    const latency = Date.now() - sendTime;
    this.metrics.webSocketLatency = latency;
  }

  public reportPerformanceData(): void {
    const metrics = this.getMetrics();
    console.log('📊 Performance Report:', {
      frameRate: `${metrics.frameRate} FPS`,
      memoryUsage: `${metrics.memoryUsage.percentage.toFixed(1)}%`,
      cacheHitRate: `${metrics.cacheMetrics.hitRate.toFixed(1)}%`,
      networkLatency: `${metrics.networkLatency.toFixed(1)}ms`,
      renderTime: `${metrics.renderTime.toFixed(1)}ms`,
      webSocketLatency: `${metrics.webSocketLatency.toFixed(1)}ms`,
    });
  }

  // =============================================================================
  // Lazy Loading Utilities
  // =============================================================================

  public createLazyLoader<T>(
    loadFn: () => Promise<T>,
    options: { ttl?: number; preload?: boolean } = {}
  ): () => Promise<T> {
    let cached: T | null = null;
    let loading: Promise<T> | null = null;
    let lastLoaded = 0;

    const ttl = options.ttl || 300000; // 5 minutes default

    return async (): Promise<T> => {
      const now = Date.now();

      // Return cached if still valid
      if (cached && (now - lastLoaded) < ttl) {
        return cached;
      }

      // Return existing loading promise if in progress
      if (loading) {
        return loading;
      }

      // Start new loading
      loading = loadFn().then((result) => {
        cached = result;
        lastLoaded = now;
        loading = null;
        return result;
      }).catch((error) => {
        loading = null;
        throw error;
      });

      return loading;
    };
  }

  // =============================================================================
  // Cleanup and Disposal
  // =============================================================================

  public dispose(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.frameRateTimer) {
      clearInterval(this.frameRateTimer);
    }

    this.memoryCache.clear();
    console.log('🧹 Performance Optimization Service disposed');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const performanceOptimizationService = new PerformanceOptimizationService();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a performance-optimized component wrapper
 */
export function withPerformanceOptimization<T extends React.ComponentType<any>>(
  Component: T,
  options: {
    enableLazyLoading?: boolean;
    cacheProps?: boolean;
    measureRender?: boolean;
  } = {}
): T {
  return React.memo(React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const measureName = `${Component.name || 'Component'}-render`;

    React.useEffect(() => {
      if (options.measureRender) {
        performanceOptimizationService.startPerformanceMeasure(measureName);

        return () => {
          performanceOptimizationService.endPerformanceMeasure(measureName);
        };
      }
    });

    return React.createElement(Component, { ...props, ref } as any);
  })) as unknown as T;
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>(
    performanceOptimizationService.getMetrics()
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceOptimizationService.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

/**
 * Hook for lazy loading data
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: { ttl?: number; preload?: boolean } = {}
): { data: T | null; loading: boolean; error: Error | null; reload: () => void } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const lazyLoader = React.useMemo(
    () => performanceOptimizationService.createLazyLoader(loadFn, options),
    deps
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await lazyLoader();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [lazyLoader]);

  React.useEffect(() => {
    if (options.preload || deps.length === 0) {
      load();
    }
  }, deps);

  return { data, loading, error, reload: load };
}

export default performanceOptimizationService;