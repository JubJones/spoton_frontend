// Performance Monitoring Service - Comprehensive Performance Analysis and Optimization
// src/services/performanceMonitoringService.ts

import { dataCacheService } from './dataCacheService';
import { statePersistenceService } from './statePersistenceService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PerformanceMetrics {
  id: string;
  timestamp: number;
  category: 'render' | 'network' | 'cache' | 'websocket' | 'memory' | 'user-interaction';
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  reportId: string;
  generatedAt: number;
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalOperations: number;
    averageResponseTime: number;
    successRate: number;
    errorCount: number;
    slowestOperation: PerformanceMetrics | null;
    fastestOperation: PerformanceMetrics | null;
  };
  categoryBreakdown: Record<
    string,
    {
      count: number;
      averageDuration: number;
      successRate: number;
      p95Duration: number;
      p99Duration: number;
    }
  >;
  recommendations: string[];
  criticalIssues: string[];
}

export interface MemoryUsageSnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface NetworkPerformanceMetrics {
  timestamp: number;
  requestUrl: string;
  method: string;
  duration: number;
  statusCode: number;
  responseSize: number;
  fromCache: boolean;
  connectionType: string;
}

export interface RenderPerformanceMetrics {
  timestamp: number;
  componentName: string;
  renderDuration: number;
  updateType: 'mount' | 'update' | 'unmount';
  propsChanged: boolean;
  stateChanged: boolean;
  rerenderCount: number;
}

export interface WebSocketPerformanceMetrics {
  timestamp: number;
  messageType: string;
  messageSize: number;
  processingDuration: number;
  queueTime?: number;
  connectionId: string;
}

export interface PerformanceBudget {
  category: string;
  operation: string;
  targetDuration: number;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  category: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: string;
  relatedMetrics: string[];
}

// ============================================================================
// Performance Monitoring Service
// ============================================================================

export class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private memorySnapshots: MemoryUsageSnapshot[] = [];
  private networkMetrics: NetworkPerformanceMetrics[] = [];
  private renderMetrics: RenderPerformanceMetrics[] = [];
  private wsMetrics: WebSocketPerformanceMetrics[] = [];

  private maxMetricsHistory = 10000;
  private maxMemorySnapshots = 1000;
  private reportingInterval = 60000; // 1 minute
  private memoryMonitoringInterval = 10000; // 10 seconds

  private performanceObserver: PerformanceObserver | null = null;
  private reportingTimer: NodeJS.Timeout | null = null;
  private memoryTimer: NodeJS.Timeout | null = null;

  private performanceBudgets: PerformanceBudget[] = [
    {
      category: 'render',
      operation: 'component-update',
      targetDuration: 16,
      warningThreshold: 32,
      criticalThreshold: 100,
      enabled: true,
    },
    {
      category: 'network',
      operation: 'api-request',
      targetDuration: 200,
      warningThreshold: 500,
      criticalThreshold: 2000,
      enabled: true,
    },
    {
      category: 'cache',
      operation: 'cache-read',
      targetDuration: 5,
      warningThreshold: 10,
      criticalThreshold: 50,
      enabled: true,
    },
    {
      category: 'websocket',
      operation: 'message-processing',
      targetDuration: 10,
      warningThreshold: 50,
      criticalThreshold: 200,
      enabled: true,
    },
  ];

  constructor() {
    this.initialize();
  }

  // ========================================================================
  // Initialization and Setup
  // ========================================================================

  private async initialize(): Promise<void> {
    // Set up native performance monitoring
    this.setupPerformanceObserver();

    // Set up memory monitoring
    this.startMemoryMonitoring();

    // Set up periodic reporting
    this.startPeriodicReporting();

    // Restore previous session data
    await this.restoreSessionData();

    // Set up navigation performance monitoring
    this.setupNavigationMonitoring();
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.processPerformanceEntry(entry);
          });
        });

        // Observe navigation timing
        this.performanceObserver.observe({ entryTypes: ['navigation'] });

        // Observe resource timing
        this.performanceObserver.observe({ entryTypes: ['resource'] });

        // Observe user timing (custom marks and measures)
        this.performanceObserver.observe({ entryTypes: ['measure'] });

        // Observe long tasks (if supported)
        if ('PerformanceObserver' in window) {
          try {
            this.performanceObserver.observe({ entryTypes: ['longtask'] });
          } catch {
            console.info('Long task monitoring not supported');
          }
        }
      } catch (error) {
        console.warn('Performance Observer setup failed:', error);
      }
    }
  }

  private setupNavigationMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationTiming = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          this.recordMetric({
            category: 'render',
            operation: 'page-load',
            duration: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
            success: true,
            metadata: {
              domContentLoaded:
                navigationTiming.domContentLoadedEventEnd -
                navigationTiming.domContentLoadedEventStart,
              domInteractive: navigationTiming.domInteractive - navigationTiming.fetchStart,
              firstPaint: this.getFirstPaintTime(),
              firstContentfulPaint: this.getFirstContentfulPaintTime(),
            },
          });
        }
      }, 100);
    });

    // Monitor visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordMetric({
        category: 'user-interaction',
        operation: 'visibility-change',
        duration: 0,
        success: true,
        metadata: { hidden: document.hidden },
      });
    });
  }

  private startMemoryMonitoring(): void {
    this.memoryTimer = setInterval(() => {
      this.captureMemorySnapshot();
    }, this.memoryMonitoringInterval);
  }

  private startPeriodicReporting(): void {
    this.reportingTimer = setInterval(() => {
      this.generateAndStoreReport();
    }, this.reportingInterval);
  }

  // ========================================================================
  // Metric Recording Methods
  // ========================================================================

  /**
   * Record a performance metric
   */
  recordMetric(params: {
    category: PerformanceMetrics['category'];
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): string {
    const metric: PerformanceMetrics = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      ...params,
    };

    this.metrics.push(metric);

    // Maintain maximum history
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check against performance budgets
    this.checkPerformanceBudgets(metric);

    return metric.id;
  }

  /**
   * Record network performance
   */
  recordNetworkMetric(params: {
    requestUrl: string;
    method: string;
    duration: number;
    statusCode: number;
    responseSize: number;
    fromCache?: boolean;
  }): void {
    const networkMetric: NetworkPerformanceMetrics = {
      timestamp: Date.now(),
      connectionType: this.getConnectionType(),
      fromCache: false,
      ...params,
    };

    this.networkMetrics.push(networkMetric);

    // Also record as general metric
    this.recordMetric({
      category: 'network',
      operation: 'http-request',
      duration: params.duration,
      success: params.statusCode >= 200 && params.statusCode < 400,
      metadata: {
        url: params.requestUrl,
        method: params.method,
        statusCode: params.statusCode,
        responseSize: params.responseSize,
        fromCache: params.fromCache,
      },
    });
  }

  /**
   * Record render performance
   */
  recordRenderMetric(params: {
    componentName: string;
    renderDuration: number;
    updateType: RenderPerformanceMetrics['updateType'];
    propsChanged?: boolean;
    stateChanged?: boolean;
  }): void {
    const renderMetric: RenderPerformanceMetrics = {
      timestamp: Date.now(),
      propsChanged: false,
      stateChanged: false,
      rerenderCount: 1,
      ...params,
    };

    this.renderMetrics.push(renderMetric);

    // Record as general metric
    this.recordMetric({
      category: 'render',
      operation: 'component-render',
      duration: params.renderDuration,
      success: true,
      metadata: {
        componentName: params.componentName,
        updateType: params.updateType,
        propsChanged: params.propsChanged,
        stateChanged: params.stateChanged,
      },
    });
  }

  /**
   * Record WebSocket performance
   */
  recordWebSocketMetric(params: {
    messageType: string;
    messageSize: number;
    processingDuration: number;
    queueTime?: number;
    connectionId: string;
  }): void {
    const wsMetric: WebSocketPerformanceMetrics = {
      timestamp: Date.now(),
      ...params,
    };

    this.wsMetrics.push(wsMetric);

    // Record as general metric
    this.recordMetric({
      category: 'websocket',
      operation: 'message-processing',
      duration: params.processingDuration,
      success: true,
      metadata: {
        messageType: params.messageType,
        messageSize: params.messageSize,
        queueTime: params.queueTime,
        connectionId: params.connectionId,
      },
    });
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    category: PerformanceMetrics['category'],
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number; metricId: string }> {
    const startTime = performance.now();
    let success = true;
    let result: T;

    try {
      result = await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      const metricId = this.recordMetric({
        category,
        operation,
        duration,
        success,
        metadata: {
          ...metadata,
          error: success ? undefined : 'Function execution failed',
        },
      });

      if (success) {
        return { result: result!, duration, metricId };
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Function execution failed');
  }

  // ========================================================================
  // Memory Monitoring
  // ========================================================================

  private captureMemorySnapshot(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const snapshot: MemoryUsageSnapshot = {
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        trend: this.calculateMemoryTrend(memory.usedJSHeapSize),
      };

      this.memorySnapshots.push(snapshot);

      // Maintain maximum snapshots
      if (this.memorySnapshots.length > this.maxMemorySnapshots) {
        this.memorySnapshots = this.memorySnapshots.slice(-this.maxMemorySnapshots);
      }

      // Check for memory issues
      this.checkMemoryHealth(snapshot);
    }
  }

  private calculateMemoryTrend(currentUsage: number): MemoryUsageSnapshot['trend'] {
    if (this.memorySnapshots.length < 5) return 'stable';

    const recentSnapshots = this.memorySnapshots.slice(-5);
    const averageUsage =
      recentSnapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / recentSnapshots.length;

    const threshold = averageUsage * 0.05; // 5% threshold

    if (currentUsage > averageUsage + threshold) {
      return 'increasing';
    } else if (currentUsage < averageUsage - threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private checkMemoryHealth(snapshot: MemoryUsageSnapshot): void {
    if (snapshot.usagePercentage > 90) {
      console.error('Critical memory usage detected:', snapshot);
      this.recordMetric({
        category: 'memory',
        operation: 'memory-warning',
        duration: 0,
        success: false,
        metadata: { usagePercentage: snapshot.usagePercentage, level: 'critical' },
      });
    } else if (snapshot.usagePercentage > 75) {
      console.warn('High memory usage detected:', snapshot);
      this.recordMetric({
        category: 'memory',
        operation: 'memory-warning',
        duration: 0,
        success: true,
        metadata: { usagePercentage: snapshot.usagePercentage, level: 'warning' },
      });
    }
  }

  // ========================================================================
  // Performance Budget Management
  // ========================================================================

  private checkPerformanceBudgets(metric: PerformanceMetrics): void {
    const relevantBudgets = this.performanceBudgets.filter(
      (budget) =>
        budget.enabled &&
        budget.category === metric.category &&
        budget.operation === metric.operation
    );

    relevantBudgets.forEach((budget) => {
      if (metric.duration > budget.criticalThreshold) {
        console.error(
          `Critical performance budget exceeded for ${budget.category}:${budget.operation}`,
          {
            actual: metric.duration,
            target: budget.targetDuration,
            threshold: budget.criticalThreshold,
          }
        );

        this.recordMetric({
          category: 'user-interaction',
          operation: 'budget-violation',
          duration: 0,
          success: false,
          metadata: {
            violationType: 'critical',
            originalMetric: metric.id,
            budget: budget,
          },
        });
      } else if (metric.duration > budget.warningThreshold) {
        console.warn(`Performance budget warning for ${budget.category}:${budget.operation}`, {
          actual: metric.duration,
          target: budget.targetDuration,
          threshold: budget.warningThreshold,
        });
      }
    });
  }

  // ========================================================================
  // Report Generation
  // ========================================================================

  /**
   * Generate comprehensive performance report
   */
  generateReport(timeRange?: { start: number; end: number }): PerformanceReport {
    const now = Date.now();
    const range = timeRange || {
      start: now - 24 * 60 * 60 * 1000, // Last 24 hours
      end: now,
    };

    const relevantMetrics = this.metrics.filter(
      (metric) => metric.timestamp >= range.start && metric.timestamp <= range.end
    );

    const report: PerformanceReport = {
      reportId: this.generateReportId(),
      generatedAt: now,
      timeRange: range,
      summary: this.calculateSummary(relevantMetrics),
      categoryBreakdown: this.calculateCategoryBreakdown(relevantMetrics),
      recommendations: this.generateRecommendations(relevantMetrics),
      criticalIssues: this.identifyCriticalIssues(relevantMetrics),
    };

    return report;
  }

  private calculateSummary(metrics: PerformanceMetrics[]): PerformanceReport['summary'] {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorCount: 0,
        slowestOperation: null,
        fastestOperation: null,
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const successfulOperations = metrics.filter((m) => m.success);
    const sortedByDuration = [...metrics].sort((a, b) => b.duration - a.duration);

    return {
      totalOperations: metrics.length,
      averageResponseTime: totalDuration / metrics.length,
      successRate: successfulOperations.length / metrics.length,
      errorCount: metrics.length - successfulOperations.length,
      slowestOperation: sortedByDuration[0] || null,
      fastestOperation: sortedByDuration[sortedByDuration.length - 1] || null,
    };
  }

  private calculateCategoryBreakdown(
    metrics: PerformanceMetrics[]
  ): PerformanceReport['categoryBreakdown'] {
    const breakdown: PerformanceReport['categoryBreakdown'] = {};

    const categories = [...new Set(metrics.map((m) => m.category))];

    categories.forEach((category) => {
      const categoryMetrics = metrics.filter((m) => m.category === category);
      const durations = categoryMetrics.map((m) => m.duration).sort((a, b) => a - b);
      const successfulMetrics = categoryMetrics.filter((m) => m.success);

      breakdown[category] = {
        count: categoryMetrics.length,
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
        successRate: successfulMetrics.length / categoryMetrics.length || 0,
        p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
        p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
      };
    });

    return breakdown;
  }

  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];

    // Analyze render performance
    const renderMetrics = metrics.filter((m) => m.category === 'render');
    if (renderMetrics.some((m) => m.duration > 50)) {
      recommendations.push(
        'Consider optimizing React components with React.memo() or useMemo() for expensive renders'
      );
    }

    // Analyze network performance
    const networkMetrics = metrics.filter((m) => m.category === 'network');
    const slowNetworkRequests = networkMetrics.filter((m) => m.duration > 1000);
    if (slowNetworkRequests.length > networkMetrics.length * 0.1) {
      recommendations.push(
        'Consider implementing request caching or optimizing API response sizes'
      );
    }

    // Analyze cache performance
    const cacheMetrics = metrics.filter((m) => m.category === 'cache');
    const slowCacheOperations = cacheMetrics.filter((m) => m.duration > 20);
    if (slowCacheOperations.length > 0) {
      recommendations.push(
        'Cache operations are slower than expected, consider optimizing data structures'
      );
    }

    // Analyze memory usage
    const recentMemorySnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
    if (recentMemorySnapshot && recentMemorySnapshot.usagePercentage > 70) {
      recommendations.push(
        'High memory usage detected, consider implementing data cleanup strategies'
      );
    }

    return recommendations;
  }

  private identifyCriticalIssues(metrics: PerformanceMetrics[]): string[] {
    const issues: string[] = [];

    // Identify critical performance issues
    const criticalMetrics = metrics.filter((m) => {
      const budget = this.performanceBudgets.find(
        (b) => b.category === m.category && b.operation === m.operation
      );
      return budget && m.duration > budget.criticalThreshold;
    });

    if (criticalMetrics.length > 0) {
      issues.push(`${criticalMetrics.length} operations exceeded critical performance thresholds`);
    }

    // Check error rates
    const errorRate = metrics.filter((m) => !m.success).length / metrics.length;
    if (errorRate > 0.05) {
      // More than 5% error rate
      issues.push(`High error rate detected: ${(errorRate * 100).toFixed(1)}%`);
    }

    // Check memory leaks
    const memoryTrend = this.memorySnapshots.slice(-10);
    const increasingTrend = memoryTrend.filter((s) => s.trend === 'increasing').length;
    if (increasingTrend > 7) {
      // More than 70% increasing trend
      issues.push('Potential memory leak detected: consistently increasing memory usage');
    }

    return issues;
  }

  // ========================================================================
  // Optimization Suggestions
  // ========================================================================

  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const recentMetrics = this.metrics.slice(-1000); // Last 1000 metrics

    // Component render optimization
    const renderMetrics = recentMetrics.filter((m) => m.category === 'render');
    const slowRenders = renderMetrics.filter((m) => m.duration > 30);
    if (slowRenders.length > 0) {
      suggestions.push({
        id: 'render-optimization-1',
        category: 'high',
        title: 'Optimize Component Rendering',
        description: `${slowRenders.length} components are rendering slowly (>30ms)`,
        impact: 'Improved UI responsiveness and reduced frame drops',
        implementation: 'Add React.memo(), useMemo(), or useCallback() to expensive components',
        estimatedImprovement: '20-50% reduction in render times',
        relatedMetrics: ['render', 'user-interaction'],
      });
    }

    // Network optimization
    const networkMetrics = recentMetrics.filter((m) => m.category === 'network');
    const slowRequests = networkMetrics.filter((m) => m.duration > 500);
    if (slowRequests.length > networkMetrics.length * 0.2) {
      suggestions.push({
        id: 'network-optimization-1',
        category: 'medium',
        title: 'Implement Request Optimization',
        description: 'Many network requests are taking longer than 500ms',
        impact: 'Faster data loading and improved user experience',
        implementation: 'Add request caching, compression, or API response optimization',
        estimatedImprovement: '30-60% faster API responses',
        relatedMetrics: ['network', 'cache'],
      });
    }

    // Memory optimization
    const recentMemorySnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
    if (recentMemorySnapshot && recentMemorySnapshot.usagePercentage > 60) {
      suggestions.push({
        id: 'memory-optimization-1',
        category: 'critical',
        title: 'Reduce Memory Usage',
        description: `Memory usage is at ${recentMemorySnapshot.usagePercentage.toFixed(1)}% of limit`,
        impact: 'Prevent browser crashes and improve stability',
        implementation: 'Implement data cleanup, reduce cache sizes, or optimize data structures',
        estimatedImprovement: '20-40% reduction in memory usage',
        relatedMetrics: ['memory', 'cache'],
      });
    }

    return suggestions;
  }

  // ========================================================================
  // Data Persistence and Recovery
  // ========================================================================

  private async generateAndStoreReport(): Promise<void> {
    try {
      const report = this.generateReport();

      // Store report in cache for quick access
      await dataCacheService.set(`performance-report-${report.reportId}`, report, {
        priority: 2,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        tags: ['performance-report', 'monitoring'],
      });

      // Store summary metrics for long-term tracking
      await statePersistenceService.saveState(
        'performance-summary',
        {
          reportId: report.reportId,
          timestamp: report.generatedAt,
          summary: report.summary,
          criticalIssues: report.criticalIssues,
        },
        {
          compression: true,
          ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        }
      );

      console.debug('Performance report generated and stored:', report.reportId);
    } catch (error) {
      console.error('Failed to generate and store performance report:', error);
    }
  }

  private async restoreSessionData(): Promise<void> {
    try {
      // Restore recent performance summaries
      const performanceSummary = await statePersistenceService.loadState('performance-summary');
      if (performanceSummary) {
        console.log('Restored performance summary from previous session');
      }
    } catch (error) {
      console.warn('Failed to restore performance session data:', error);
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      this.recordMetric({
        category: 'render',
        operation: 'navigation',
        duration: navEntry.duration,
        success: true,
        metadata: {
          type: navEntry.type,
          redirectCount: navEntry.redirectCount,
        },
      });
    } else if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;
      this.recordNetworkMetric({
        requestUrl: resourceEntry.name,
        method: 'GET', // Resource timing doesn't provide method
        duration: resourceEntry.duration,
        statusCode: 200, // Assume success if loaded
        responseSize: resourceEntry.transferSize || 0,
        fromCache: resourceEntry.transferSize === 0,
      });
    } else if (entry.entryType === 'measure') {
      // Custom performance marks
      this.recordMetric({
        category: 'user-interaction',
        operation: entry.name,
        duration: entry.duration,
        success: true,
        metadata: { entryType: 'measure' },
      });
    } else if (entry.entryType === 'longtask') {
      // Long tasks indicate blocking operations
      this.recordMetric({
        category: 'render',
        operation: 'long-task',
        duration: entry.duration,
        success: false,
        metadata: { blockingTime: entry.duration },
      });
    }
  }

  private getFirstPaintTime(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }

  private getFirstContentfulPaintTime(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    return fcp?.startTime;
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private generateMetricId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get current performance metrics
   */
  getMetrics(category?: PerformanceMetrics['category'], limit = 100): PerformanceMetrics[] {
    const filteredMetrics = category
      ? this.metrics.filter((m) => m.category === category)
      : this.metrics;

    return filteredMetrics.slice(-limit);
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryUsageSnapshot | null {
    return this.memorySnapshots[this.memorySnapshots.length - 1] || null;
  }

  /**
   * Get performance budgets
   */
  getPerformanceBudgets(): PerformanceBudget[] {
    return [...this.performanceBudgets];
  }

  /**
   * Update performance budget
   */
  updatePerformanceBudget(
    category: string,
    operation: string,
    budget: Partial<PerformanceBudget>
  ): void {
    const index = this.performanceBudgets.findIndex(
      (b) => b.category === category && b.operation === operation
    );

    if (index >= 0) {
      this.performanceBudgets[index] = { ...this.performanceBudgets[index], ...budget };
    } else {
      this.performanceBudgets.push({
        category,
        operation,
        targetDuration: 100,
        warningThreshold: 200,
        criticalThreshold: 500,
        enabled: true,
        ...budget,
      });
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.memorySnapshots = [];
    this.networkMetrics = [];
    this.renderMetrics = [];
    this.wsMetrics = [];
  }

  /**
   * Shutdown monitoring
   */
  shutdown(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }

    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }
  }

  /**
   * Export performance data
   */
  async exportData(): Promise<string> {
    const exportData = {
      timestamp: Date.now(),
      metrics: this.metrics,
      memorySnapshots: this.memorySnapshots,
      performanceBudgets: this.performanceBudgets,
      report: this.generateReport(),
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// ============================================================================
// Global Service Instance
// ============================================================================

export const performanceMonitoringService = new PerformanceMonitoringService();

// ============================================================================
// React Hook Integration
// ============================================================================

/**
 * React hook for component performance monitoring
 */
export function usePerformanceMonitoring(componentName: string) {
  const recordRender = (updateType: 'mount' | 'update' | 'unmount', duration: number) => {
    performanceMonitoringService.recordRenderMetric({
      componentName,
      renderDuration: duration,
      updateType,
    });
  };

  const timeRender = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    const result = await performanceMonitoringService.timeFunction(
      'render',
      'component-render',
      fn,
      { componentName }
    );
    return result.result;
  };

  return { recordRender, timeRender };
}

/**
 * Performance decorator for functions
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  category: PerformanceMetrics['category'],
  operation: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const result = await performanceMonitoringService.timeFunction(category, operation, () =>
      fn(...args)
    );
    return result.result;
  }) as T;
}

export default PerformanceMonitoringService;
