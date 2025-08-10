// src/utils/monitoring.ts
/**
 * Production monitoring and health check utilities for SpotOn frontend
 * Provides comprehensive monitoring capabilities for system health, performance, and errors
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  metadata: {
    version: string;
    environment: string;
    buildTime: string;
  };
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  memoryUsage: number;
  cpuUsage?: number;
}

export interface ErrorMetrics {
  errorCount: number;
  errorTypes: Record<string, number>;
  criticalErrors: number;
  lastError?: {
    message: string;
    stack?: string;
    timestamp: string;
    userAgent: string;
    url: string;
  };
}

/**
 * Production monitoring service for system health and performance
 */
export class MonitoringService {
  private readonly apiBaseUrl: string;
  private readonly wsBaseUrl: string;
  private readonly environment: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private errorCount = 0;
  private errorTypes: Record<string, number> = {};
  private criticalErrors: string[] = ['ChunkLoadError', 'NetworkError', 'SecurityError'];

  constructor(
    apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3847',
    wsBaseUrl: string = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3847',
    environment: string = import.meta.env.VITE_ENVIRONMENT || 'development'
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.wsBaseUrl = wsBaseUrl;
    this.environment = environment;
  }

  /**
   * Initialize monitoring services
   */
  public initialize(): void {
    if (this.environment === 'production' || this.environment === 'staging') {
      this.setupPerformanceMonitoring();
      this.setupErrorMonitoring();
      this.startHealthChecks();
      console.log('🔍 Monitoring initialized for', this.environment);
    }
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    const checks: HealthCheck[] = [];

    // API Health Check
    try {
      const apiStartTime = performance.now();
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const apiResponseTime = performance.now() - apiStartTime;
      
      if (response.ok) {
        const healthData = await response.json();
        checks.push({
          name: 'API Connection',
          status: healthData.status === 'healthy' ? 'healthy' : 'degraded',
          responseTime: apiResponseTime,
          metadata: healthData
        });
      } else {
        checks.push({
          name: 'API Connection',
          status: 'unhealthy',
          responseTime: apiResponseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      checks.push({
        name: 'API Connection',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown API error'
      });
    }

    // WebSocket Health Check
    checks.push(await this.checkWebSocketHealth());

    // Browser Features Check
    checks.push(this.checkBrowserFeatures());

    // Memory Usage Check
    checks.push(this.checkMemoryUsage());

    // Local Storage Check
    checks.push(this.checkLocalStorage());

    // Network Connectivity Check
    checks.push(await this.checkNetworkConnectivity());

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      metadata: {
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        environment: this.environment,
        buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString()
      }
    };
  }

  /**
   * Check WebSocket connectivity
   */
  private async checkWebSocketHealth(): Promise<HealthCheck> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const ws = new WebSocket(`${this.wsBaseUrl}/ws/health`);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          name: 'WebSocket Connection',
          status: 'unhealthy',
          error: 'Connection timeout after 5 seconds'
        });
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        const responseTime = performance.now() - startTime;
        ws.close();
        resolve({
          name: 'WebSocket Connection',
          status: 'healthy',
          responseTime
        });
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        resolve({
          name: 'WebSocket Connection',
          status: 'unhealthy',
          error: 'WebSocket connection failed'
        });
      };
    });
  }

  /**
   * Check browser feature compatibility
   */
  private checkBrowserFeatures(): HealthCheck {
    const requiredFeatures = [
      'WebSocket',
      'fetch',
      'localStorage',
      'sessionStorage',
      'requestAnimationFrame',
      'addEventListener'
    ];

    const missingFeatures: string[] = [];
    
    requiredFeatures.forEach(feature => {
      if (!(feature in window)) {
        missingFeatures.push(feature);
      }
    });

    // Check for modern JavaScript features
    try {
      // Test for ES6+ features
      eval('const test = () => {}; async function asyncTest() {}; class TestClass {}');
    } catch (error) {
      missingFeatures.push('ES6+ support');
    }

    return {
      name: 'Browser Compatibility',
      status: missingFeatures.length === 0 ? 'healthy' : 'degraded',
      error: missingFeatures.length > 0 ? `Missing features: ${missingFeatures.join(', ')}` : undefined,
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled
      }
    };
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): HealthCheck {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
      
      const usagePercent = (usedMB / limitMB) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usagePercent > 90) status = 'unhealthy';
      else if (usagePercent > 75) status = 'degraded';

      return {
        name: 'Memory Usage',
        status,
        metadata: {
          used: `${usedMB}MB`,
          total: `${totalMB}MB`,
          limit: `${limitMB}MB`,
          usagePercent: `${usagePercent.toFixed(1)}%`
        }
      };
    }

    return {
      name: 'Memory Usage',
      status: 'degraded',
      error: 'Memory API not available'
    };
  }

  /**
   * Check local storage functionality
   */
  private checkLocalStorage(): HealthCheck {
    try {
      const testKey = '__spoton_health_check__';
      const testValue = Date.now().toString();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved === testValue) {
        return {
          name: 'Local Storage',
          status: 'healthy'
        };
      } else {
        return {
          name: 'Local Storage',
          status: 'degraded',
          error: 'Local storage read/write test failed'
        };
      }
    } catch (error) {
      return {
        name: 'Local Storage',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Local storage access failed'
      };
    }
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<HealthCheck> {
    if (!('connection' in navigator)) {
      return {
        name: 'Network Connectivity',
        status: 'degraded',
        error: 'Network Information API not available'
      };
    }

    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || 'unknown';
    const downlink = connection?.downlink || 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (downlink < 1) status = 'unhealthy';
    else if (downlink < 5 || effectiveType === 'slow-2g' || effectiveType === '2g') status = 'degraded';

    return {
      name: 'Network Connectivity',
      status,
      metadata: {
        effectiveType,
        downlink: `${downlink}Mbps`,
        rtt: connection?.rtt || 'unknown',
        saveData: connection?.saveData || false
      }
    };
  }

  /**
   * Determine overall system status from individual checks
   */
  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 1) return 'degraded';
    if (degradedCount === 1) return 'degraded';
    return 'healthy';
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.reportPerformanceMetrics(entry as PerformanceNavigationTiming);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    }

    // Monitor Web Vitals
    this.monitorWebVitals();
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        console.log('LCP:', lastEntry.startTime);
        this.reportMetric('lcp', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Fallback for browsers that don't support LCP
        console.warn('LCP monitoring not supported');
      }
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log('FID:', entry.processingStart - entry.startTime);
          this.reportMetric('fid', entry.processingStart - entry.startTime);
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID monitoring not supported');
      }
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    if ('PerformanceObserver' in window) {
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
        this.reportMetric('cls', clsValue);
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }
    }
  }

  /**
   * Setup error monitoring
   */
  private setupErrorMonitoring(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        type: 'promise'
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          message: `Resource failed to load: ${(event.target as any)?.src || (event.target as any)?.href}`,
          type: 'resource'
        });
      }
    }, true);
  }

  /**
   * Handle and report errors
   */
  private handleError(error: {
    message: string;
    stack?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    type: string;
  }): void {
    this.errorCount++;
    this.errorTypes[error.type] = (this.errorTypes[error.type] || 0) + 1;

    // Log error details
    console.error('SpotOn Error:', error);

    // Report critical errors immediately
    if (this.criticalErrors.some(critical => error.message.includes(critical))) {
      this.reportCriticalError(error);
    }

    // Store recent error for health checks
    (window as any).__spoton_last_error__ = {
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Initial health check
    this.performHealthCheck().then(result => {
      console.log('Initial health check:', result);
    });

    // Periodic health checks every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthResult = await this.performHealthCheck();
        
        if (healthResult.status === 'unhealthy') {
          console.warn('System unhealthy:', healthResult);
          this.reportSystemIssue(healthResult);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Report performance metrics
   */
  private reportPerformanceMetrics(timing: PerformanceNavigationTiming): void {
    const metrics: PerformanceMetrics = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      firstContentfulPaint: 0, // Will be updated by paint observer
      largestContentfulPaint: 0, // Will be updated by LCP observer
      firstInputDelay: 0, // Will be updated by FID observer
      cumulativeLayoutShift: 0, // Will be updated by CLS observer
      memoryUsage: ('memory' in performance) ? (performance as any).memory.usedJSHeapSize : 0
    };

    console.log('Performance Metrics:', metrics);
    this.sendMetrics('performance', metrics);
  }

  /**
   * Report individual metric
   */
  private reportMetric(name: string, value: number): void {
    console.log(`Metric ${name}:`, value);
    this.sendMetrics('web-vital', { [name]: value });
  }

  /**
   * Report critical errors
   */
  private reportCriticalError(error: any): void {
    console.error('Critical Error Detected:', error);
    // In production, send to monitoring service
    this.sendAlert('critical-error', error);
  }

  /**
   * Report system issues
   */
  private reportSystemIssue(healthResult: HealthCheckResult): void {
    console.warn('System Issue Detected:', healthResult);
    // In production, send to monitoring service
    this.sendAlert('system-unhealthy', healthResult);
  }

  /**
   * Send metrics to monitoring service (placeholder)
   */
  private sendMetrics(type: string, data: any): void {
    if (this.environment === 'production') {
      // Send to monitoring service (e.g., DataDog, New Relic, custom endpoint)
      // fetch('/api/metrics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type, data, timestamp: Date.now() })
      // }).catch(console.error);
    }
  }

  /**
   * Send alerts to monitoring service (placeholder)
   */
  private sendAlert(type: string, data: any): void {
    if (this.environment === 'production') {
      // Send to alerting service (e.g., PagerDuty, Slack, custom endpoint)
      // fetch('/api/alerts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type, data, timestamp: Date.now() })
      // }).catch(console.error);
    }
  }

  /**
   * Get current error metrics
   */
  public getErrorMetrics(): ErrorMetrics {
    return {
      errorCount: this.errorCount,
      errorTypes: { ...this.errorTypes },
      criticalErrors: Object.keys(this.errorTypes).filter(type => 
        this.criticalErrors.some(critical => type.includes(critical))
      ).reduce((sum, type) => sum + this.errorTypes[type], 0),
      lastError: (window as any).__spoton_last_error__
    };
  }

  /**
   * Cleanup monitoring resources
   */
  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// Initialize monitoring on module load
if (typeof window !== 'undefined') {
  monitoring.initialize();
}