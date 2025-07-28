import { ReactNode } from 'react';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  renderTime: number;
  componentCount: number;
  dataProcessingTime: number;
  cacheHitRate: number;
  bundleSize: number;
  loadTime: number;
}

export interface PerformanceThresholds {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  renderTime: number;
  cacheHitRate: number;
  maxComponentCount: number;
  maxBundleSize: number;
  maxLoadTime: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'memory' | 'cpu' | 'network' | 'render' | 'cache' | 'bundle' | 'component';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  solution: string;
  estimatedImprovement: number;
  priority: number;
  autoFixAvailable: boolean;
  timestamp: string;
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  strategy: 'lru' | 'fifo' | 'lfu';
  compression: boolean;
  persistence: boolean;
}

export interface PerformanceConfig {
  enableOptimizations: boolean;
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  enableCodeSplitting: boolean;
  enableImageOptimization: boolean;
  enableMemoryOptimization: boolean;
  enableRenderOptimization: boolean;
  thresholds: PerformanceThresholds;
  cache: CacheConfig;
  monitoring: {
    enabled: boolean;
    sampleRate: number;
    reportInterval: number;
  };
}

class PerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private recommendations: OptimizationRecommendation[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private memoryTracker: any = null;
  private renderTracker: any = null;
  private isOptimizing = false;
  private cache = new Map<string, any>();
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableOptimizations: true,
      enableVirtualization: true,
      enableLazyLoading: true,
      enableCodeSplitting: true,
      enableImageOptimization: true,
      enableMemoryOptimization: true,
      enableRenderOptimization: true,
      thresholds: {
        fps: 30,
        memoryUsage: 80,
        cpuUsage: 70,
        networkLatency: 1000,
        renderTime: 16,
        cacheHitRate: 0.8,
        maxComponentCount: 1000,
        maxBundleSize: 5 * 1024 * 1024, // 5MB
        maxLoadTime: 3000
      },
      cache: {
        enabled: true,
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 300000, // 5 minutes
        strategy: 'lru',
        compression: true,
        persistence: false
      },
      monitoring: {
        enabled: true,
        sampleRate: 0.1,
        reportInterval: 30000
      },
      ...config
    };

    this.metrics = {
      fps: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      renderTime: 0,
      componentCount: 0,
      dataProcessingTime: 0,
      cacheHitRate: 0,
      bundleSize: 0,
      loadTime: 0
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.config.monitoring.enabled) {
      this.startPerformanceMonitoring();
      this.startMemoryTracking();
      this.startRenderTracking();
    }

    if (this.config.enableOptimizations) {
      this.applyOptimizations();
    }
  }

  private startPerformanceMonitoring(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint', 'largest-contentful-paint'] 
      });
    }

    // Monitor FPS
    this.startFPSMonitoring();

    // Monitor network latency
    this.startNetworkMonitoring();
  }

  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const trackFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        this.metrics.fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        if (this.metrics.fps < this.config.thresholds.fps) {
          this.generateRecommendation('fps', 'low', 'Low FPS detected');
        }
      }

      requestAnimationFrame(trackFPS);
    };

    requestAnimationFrame(trackFPS);
  }

  private startMemoryTracking(): void {
    if ('memory' in performance) {
      this.memoryTracker = setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (this.metrics.memoryUsage > this.config.thresholds.memoryUsage) {
          this.generateRecommendation('memory', 'high', 'High memory usage detected');
        }
      }, this.config.monitoring.reportInterval);
    }
  }

  private startRenderTracking(): void {
    // Track render performance
    this.renderTracker = setInterval(() => {
      this.measureRenderTime();
    }, this.config.monitoring.reportInterval);
  }

  private startNetworkMonitoring(): void {
    // Monitor network performance
    const connection = (navigator as any).connection;
    if (connection) {
      this.metrics.networkLatency = connection.rtt || 0;
    }
  }

  private measureRenderTime(): void {
    performance.mark('render-start');
    
    // Measure component render time
    requestAnimationFrame(() => {
      performance.mark('render-end');
      performance.measure('render-time', 'render-start', 'render-end');
      
      const measure = performance.getEntriesByName('render-time')[0];
      if (measure) {
        this.metrics.renderTime = measure.duration;
        
        if (this.metrics.renderTime > this.config.thresholds.renderTime) {
          this.generateRecommendation('render', 'medium', 'Slow render time detected');
        }
      }
    });
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      switch (entry.entryType) {
        case 'navigation':
          const nav = entry as PerformanceNavigationTiming;
          this.metrics.loadTime = nav.loadEventEnd - nav.navigationStart;
          break;
        case 'resource':
          const resource = entry as PerformanceResourceTiming;
          if (resource.name.includes('.js') || resource.name.includes('.css')) {
            this.metrics.bundleSize += resource.transferSize || 0;
          }
          break;
        case 'largest-contentful-paint':
          // Track LCP for performance
          break;
      }
    });
  }

  private applyOptimizations(): void {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;

    // Apply memory optimizations
    if (this.config.enableMemoryOptimization) {
      this.optimizeMemory();
    }

    // Apply render optimizations
    if (this.config.enableRenderOptimization) {
      this.optimizeRendering();
    }

    // Apply image optimizations
    if (this.config.enableImageOptimization) {
      this.optimizeImages();
    }

    // Apply cache optimizations
    if (this.config.cache.enabled) {
      this.optimizeCache();
    }

    this.isOptimizing = false;
  }

  private optimizeMemory(): void {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Clear expired cache entries
    this.cleanupCache();

    // Optimize event listeners
    this.optimizeEventListeners();
  }

  private optimizeRendering(): void {
    // Implement virtual scrolling for large lists
    if (this.config.enableVirtualization) {
      this.implementVirtualScrolling();
    }

    // Optimize DOM updates
    this.optimizeDOMUpdates();

    // Implement component memoization
    this.implementMemoization();
  }

  private optimizeImages(): void {
    // Implement lazy loading for images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  private optimizeCache(): void {
    // Implement cache cleanup based on strategy
    const cacheSize = this.getCacheSize();
    
    if (cacheSize > this.config.cache.maxSize) {
      this.cleanupCache();
    }

    // Update cache hit rate
    this.metrics.cacheHitRate = this.cacheMetrics.totalRequests > 0 
      ? this.cacheMetrics.hits / this.cacheMetrics.totalRequests 
      : 0;
  }

  private implementVirtualScrolling(): void {
    // Virtual scrolling implementation for large datasets
    const virtualScrollElements = document.querySelectorAll('[data-virtual-scroll]');
    
    virtualScrollElements.forEach(element => {
      // Implement virtual scrolling logic
      this.setupVirtualScrolling(element);
    });
  }

  private setupVirtualScrolling(element: Element): void {
    // Virtual scrolling setup
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Load visible items
          this.loadVisibleItems(entry.target);
        } else {
          // Unload invisible items
          this.unloadInvisibleItems(entry.target);
        }
      });
    });

    const children = element.querySelectorAll('[data-virtual-item]');
    children.forEach(child => observer.observe(child));
  }

  private loadVisibleItems(element: Element): void {
    // Load visible items implementation
    const items = element.querySelectorAll('[data-virtual-item]');
    items.forEach(item => {
      if (!item.hasAttribute('data-loaded')) {
        // Load item content
        this.loadItemContent(item);
        item.setAttribute('data-loaded', 'true');
      }
    });
  }

  private unloadInvisibleItems(element: Element): void {
    // Unload invisible items to save memory
    const items = element.querySelectorAll('[data-virtual-item][data-loaded]');
    items.forEach(item => {
      // Unload item content
      this.unloadItemContent(item);
      item.removeAttribute('data-loaded');
    });
  }

  private loadItemContent(item: Element): void {
    // Load item content implementation
    const content = item.getAttribute('data-content');
    if (content) {
      item.innerHTML = content;
    }
  }

  private unloadItemContent(item: Element): void {
    // Unload item content implementation
    item.innerHTML = '';
  }

  private optimizeDOMUpdates(): void {
    // Batch DOM updates
    const updates: (() => void)[] = [];
    
    const flushUpdates = () => {
      if (updates.length > 0) {
        requestAnimationFrame(() => {
          updates.forEach(update => update());
          updates.length = 0;
        });
      }
    };

    // Debounce DOM updates
    let updateTimeout: NodeJS.Timeout;
    const scheduleUpdate = (update: () => void) => {
      updates.push(update);
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(flushUpdates, 16); // ~60fps
    };

    // Expose scheduling function
    (window as any).scheduleUpdate = scheduleUpdate;
  }

  private implementMemoization(): void {
    // Component memoization implementation
    const memoizedComponents = new Map<string, any>();
    
    const memoize = (component: any, props: any) => {
      const key = JSON.stringify(props);
      
      if (memoizedComponents.has(key)) {
        this.cacheMetrics.hits++;
        return memoizedComponents.get(key);
      }
      
      this.cacheMetrics.misses++;
      const result = component(props);
      memoizedComponents.set(key, result);
      
      return result;
    };

    // Expose memoization function
    (window as any).memoize = memoize;
  }

  private optimizeEventListeners(): void {
    // Event listener optimization
    const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel'];
    
    passiveEvents.forEach(eventType => {
      const originalAddEventListener = Element.prototype.addEventListener;
      Element.prototype.addEventListener = function(type, listener, options) {
        if (passiveEvents.includes(type)) {
          const opts = typeof options === 'object' ? { ...options, passive: true } : { passive: true };
          originalAddEventListener.call(this, type, listener, opts);
        } else {
          originalAddEventListener.call(this, type, listener, options);
        }
      };
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    this.cache.forEach((entry, key) => {
      if (entry.timestamp + this.config.cache.ttl < now) {
        expiredKeys.push(key);
      }
    });

    // Remove expired entries
    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    // Apply cache strategy if still over limit
    if (this.getCacheSize() > this.config.cache.maxSize) {
      this.applyCacheStrategy();
    }
  }

  private applyCacheStrategy(): void {
    const entries = Array.from(this.cache.entries());
    
    switch (this.config.cache.strategy) {
      case 'lru':
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu':
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'fifo':
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        break;
    }

    // Remove entries until under limit
    while (this.getCacheSize() > this.config.cache.maxSize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.cache.delete(key);
    }
  }

  private getCacheSize(): number {
    let size = 0;
    this.cache.forEach(entry => {
      size += JSON.stringify(entry).length;
    });
    return size;
  }

  private generateRecommendation(
    type: OptimizationRecommendation['type'],
    severity: OptimizationRecommendation['severity'],
    title: string
  ): void {
    const recommendation: OptimizationRecommendation = {
      id: Date.now().toString(),
      type,
      severity,
      title,
      description: this.getRecommendationDescription(type, severity),
      impact: this.getRecommendationImpact(type, severity),
      solution: this.getRecommendationSolution(type, severity),
      estimatedImprovement: this.getEstimatedImprovement(type, severity),
      priority: this.getRecommendationPriority(severity),
      autoFixAvailable: this.isAutoFixAvailable(type),
      timestamp: new Date().toISOString()
    };

    this.recommendations.push(recommendation);
    
    // Auto-fix if available and enabled
    if (recommendation.autoFixAvailable && this.config.enableOptimizations) {
      this.applyAutoFix(recommendation);
    }
  }

  private getRecommendationDescription(type: string, severity: string): string {
    const descriptions = {
      fps: 'Frame rate is below optimal threshold, causing stuttering',
      memory: 'Memory usage is high, may cause performance degradation',
      render: 'Render time is slow, affecting user experience',
      cache: 'Cache hit rate is low, affecting performance',
      network: 'Network latency is high, affecting responsiveness'
    };
    return descriptions[type as keyof typeof descriptions] || 'Performance issue detected';
  }

  private getRecommendationImpact(type: string, severity: string): string {
    const impacts = {
      fps: 'Stuttering animations and poor user experience',
      memory: 'Potential memory leaks and crashes',
      render: 'Slow UI responsiveness and poor UX',
      cache: 'Increased load times and network usage',
      network: 'Delayed responses and poor connectivity'
    };
    return impacts[type as keyof typeof impacts] || 'Performance degradation';
  }

  private getRecommendationSolution(type: string, severity: string): string {
    const solutions = {
      fps: 'Optimize animations, reduce DOM updates, implement virtual scrolling',
      memory: 'Clear unused references, optimize images, implement lazy loading',
      render: 'Memoize components, optimize re-renders, use React.memo',
      cache: 'Implement better caching strategy, increase cache size',
      network: 'Optimize API calls, implement request batching, use CDN'
    };
    return solutions[type as keyof typeof solutions] || 'Apply performance optimizations';
  }

  private getEstimatedImprovement(type: string, severity: string): number {
    const improvements = {
      fps: { low: 10, medium: 20, high: 40, critical: 60 },
      memory: { low: 15, medium: 30, high: 50, critical: 70 },
      render: { low: 20, medium: 35, high: 55, critical: 80 },
      cache: { low: 25, medium: 40, high: 60, critical: 85 },
      network: { low: 30, medium: 45, high: 65, critical: 90 }
    };
    return improvements[type as keyof typeof improvements]?.[severity as keyof typeof improvements.fps] || 20;
  }

  private getRecommendationPriority(severity: string): number {
    const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
    return priorities[severity as keyof typeof priorities] || 1;
  }

  private isAutoFixAvailable(type: string): boolean {
    const autoFixTypes = ['memory', 'cache', 'render'];
    return autoFixTypes.includes(type);
  }

  private applyAutoFix(recommendation: OptimizationRecommendation): void {
    switch (recommendation.type) {
      case 'memory':
        this.optimizeMemory();
        break;
      case 'cache':
        this.optimizeCache();
        break;
      case 'render':
        this.optimizeRendering();
        break;
    }
  }

  // Public API
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations];
  }

  public getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    return {
      hits: this.cacheMetrics.hits,
      misses: this.cacheMetrics.misses,
      hitRate: this.metrics.cacheHitRate,
      size: this.getCacheSize()
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.cacheMetrics = { hits: 0, misses: 0, totalRequests: 0 };
  }

  public updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.applyOptimizations();
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  public forceOptimization(): void {
    this.applyOptimizations();
  }

  public getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    if (this.metrics.fps < this.config.thresholds.fps) {
      issues.push('Low FPS');
      score -= 20;
    }

    if (this.metrics.memoryUsage > this.config.thresholds.memoryUsage) {
      issues.push('High memory usage');
      score -= 25;
    }

    if (this.metrics.renderTime > this.config.thresholds.renderTime) {
      issues.push('Slow render time');
      score -= 15;
    }

    if (this.metrics.cacheHitRate < this.config.thresholds.cacheHitRate) {
      issues.push('Low cache hit rate');
      score -= 10;
    }

    if (this.metrics.networkLatency > this.config.thresholds.networkLatency) {
      issues.push('High network latency');
      score -= 15;
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (score >= 80) overall = 'healthy';
    else if (score >= 60) overall = 'degraded';
    else overall = 'unhealthy';

    return { overall, issues, score };
  }

  public destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryTracker) {
      clearInterval(this.memoryTracker);
    }
    
    if (this.renderTracker) {
      clearInterval(this.renderTracker);
    }
    
    this.clearCache();
  }
}

// Export service instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export class for custom instances
export { PerformanceOptimizer };