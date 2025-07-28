import { performanceOptimizer } from './performanceOptimizer';
import { securityService } from './securityService';
import { errorHandler } from './errorHandler';

export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean;
  enablePerformanceMonitoring: boolean;
  enableSecurityMonitoring: boolean;
  enableUserActivityMonitoring: boolean;
  enableBusinessMetrics: boolean;
  enableAlerts: boolean;
  enableReporting: boolean;
  sampleRate: number;
  reportingInterval: number;
  retentionPeriod: number;
  alertThresholds: AlertThresholds;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  enableRemoteLogging: boolean;
  remoteLoggingEndpoint?: string;
  enableLocalStorage: boolean;
  maxLocalStorageSize: number;
}

export interface AlertThresholds {
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  securityViolations: number;
  failedLogins: number;
  sessionTimeouts: number;
}

export interface MetricData {
  id: string;
  type: 'performance' | 'security' | 'user_activity' | 'business' | 'system' | 'error';
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  category: string;
  context?: Record<string, any>;
  stackTrace?: string;
  sessionId?: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  correlationId?: string;
}

export interface Alert {
  id: string;
  type: 'threshold' | 'anomaly' | 'security' | 'error' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  threshold?: number;
  currentValue?: number;
  metric?: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  realTime: {
    activeUsers: number;
    requestsPerSecond: number;
    errorRate: number;
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  business: {
    totalDetections: number;
    activeDetections: number;
    uniquePersons: number;
    averageConfidence: number;
    cameraStatus: Record<string, 'online' | 'offline' | 'degraded'>;
  };
  security: {
    totalViolations: number;
    recentViolations: number;
    lockedAccounts: number;
    activeSessions: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  performance: {
    fps: number;
    latency: number;
    renderTime: number;
    cacheHitRate: number;
    bundleSize: number;
  };
}

class MonitoringService {
  private config: MonitoringConfig;
  private metrics: MetricData[] = [];
  private logs: LogEntry[] = [];
  private alerts: Alert[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private correlationIdCounter = 0;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      enablePerformanceMonitoring: true,
      enableSecurityMonitoring: true,
      enableUserActivityMonitoring: true,
      enableBusinessMetrics: true,
      enableAlerts: true,
      enableReporting: true,
      sampleRate: 0.1,
      reportingInterval: 30000, // 30 seconds
      retentionPeriod: 86400000, // 24 hours
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 1000, // 1 second
        memoryUsage: 80, // 80%
        cpuUsage: 70, // 70%
        diskUsage: 85, // 85%
        securityViolations: 10,
        failedLogins: 20,
        sessionTimeouts: 100
      },
      logLevel: 'info',
      enableRemoteLogging: false,
      enableLocalStorage: true,
      maxLocalStorageSize: 10 * 1024 * 1024, // 10MB
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    this.loadStoredData();
    this.startMonitoring();
    this.setupEventListeners();
  }

  private loadStoredData(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const stored = localStorage.getItem('spoton-monitoring-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = data.metrics || [];
        this.logs = data.logs || [];
        this.alerts = data.alerts || [];
      }
    } catch (error) {
      this.log('error', 'Failed to load stored monitoring data', { error });
    }
  }

  private saveData(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const data = {
        metrics: this.metrics.slice(-1000), // Keep last 1000 metrics
        logs: this.logs.slice(-500), // Keep last 500 logs
        alerts: this.alerts.slice(-100) // Keep last 100 alerts
      };

      const serialized = JSON.stringify(data);
      if (serialized.length > this.config.maxLocalStorageSize) {
        // Reduce data if too large
        data.metrics = this.metrics.slice(-500);
        data.logs = this.logs.slice(-250);
        data.alerts = this.alerts.slice(-50);
      }

      localStorage.setItem('spoton-monitoring-data', JSON.stringify(data));
    } catch (error) {
      this.log('error', 'Failed to save monitoring data', { error });
    }
  }

  private startMonitoring(): void {
    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }

    if (this.config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    if (this.config.enableSecurityMonitoring) {
      this.startSecurityMonitoring();
    }

    if (this.config.enableUserActivityMonitoring) {
      this.startUserActivityMonitoring();
    }

    if (this.config.enableBusinessMetrics) {
      this.startBusinessMetricsMonitoring();
    }

    // Start cleanup and reporting timers
    this.startCleanupTimer();
    this.startReportingTimer();
  }

  private startRealTimeMonitoring(): void {
    const timer = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Every 5 seconds

    this.timers.set('realtime', timer);
  }

  private startPerformanceMonitoring(): void {
    const timer = setInterval(() => {
      const metrics = performanceOptimizer.getMetrics();
      
      this.recordMetric({
        type: 'performance',
        name: 'fps',
        value: metrics.fps,
        unit: 'fps',
        tags: { component: 'renderer' }
      });

      this.recordMetric({
        type: 'performance',
        name: 'memory_usage',
        value: metrics.memoryUsage,
        unit: 'percent',
        tags: { component: 'memory' }
      });

      this.recordMetric({
        type: 'performance',
        name: 'render_time',
        value: metrics.renderTime,
        unit: 'ms',
        tags: { component: 'renderer' }
      });

      this.recordMetric({
        type: 'performance',
        name: 'cache_hit_rate',
        value: metrics.cacheHitRate,
        unit: 'percent',
        tags: { component: 'cache' }
      });

      // Check thresholds
      this.checkPerformanceThresholds(metrics);
    }, 10000); // Every 10 seconds

    this.timers.set('performance', timer);
  }

  private startSecurityMonitoring(): void {
    const timer = setInterval(() => {
      const stats = securityService.getSecurityStats();
      
      this.recordMetric({
        type: 'security',
        name: 'total_violations',
        value: stats.totalViolations,
        unit: 'count',
        tags: { component: 'security' }
      });

      this.recordMetric({
        type: 'security',
        name: 'recent_violations',
        value: stats.recentViolations,
        unit: 'count',
        tags: { component: 'security', timeframe: '1h' }
      });

      this.recordMetric({
        type: 'security',
        name: 'active_sessions',
        value: stats.activeSessions,
        unit: 'count',
        tags: { component: 'authentication' }
      });

      this.recordMetric({
        type: 'security',
        name: 'locked_accounts',
        value: stats.lockedAccounts,
        unit: 'count',
        tags: { component: 'authentication' }
      });

      // Check security thresholds
      this.checkSecurityThresholds(stats);
    }, 15000); // Every 15 seconds

    this.timers.set('security', timer);
  }

  private startUserActivityMonitoring(): void {
    // Monitor user interactions
    const events = ['click', 'scroll', 'resize', 'focus', 'blur'];
    
    events.forEach(event => {
      window.addEventListener(event, () => {
        if (Math.random() < this.config.sampleRate) {
          this.recordMetric({
            type: 'user_activity',
            name: event,
            value: 1,
            unit: 'count',
            tags: { event_type: event }
          });
        }
      });
    });

    // Monitor page views
    this.recordMetric({
      type: 'user_activity',
      name: 'page_view',
      value: 1,
      unit: 'count',
      tags: { 
        page: window.location.pathname,
        referrer: document.referrer
      }
    });
  }

  private startBusinessMetricsMonitoring(): void {
    const timer = setInterval(() => {
      // These would be populated with actual business metrics
      this.recordMetric({
        type: 'business',
        name: 'active_detections',
        value: Math.floor(Math.random() * 100),
        unit: 'count',
        tags: { component: 'detection' }
      });

      this.recordMetric({
        type: 'business',
        name: 'camera_uptime',
        value: 95 + Math.random() * 5,
        unit: 'percent',
        tags: { component: 'camera' }
      });
    }, 30000); // Every 30 seconds

    this.timers.set('business', timer);
  }

  private startCleanupTimer(): void {
    const timer = setInterval(() => {
      this.cleanupOldData();
    }, 300000); // Every 5 minutes

    this.timers.set('cleanup', timer);
  }

  private startReportingTimer(): void {
    if (!this.config.enableReporting) return;

    const timer = setInterval(() => {
      this.generateReport();
    }, this.config.reportingInterval);

    this.timers.set('reporting', timer);
  }

  private setupEventListeners(): void {
    // Monitor errors
    window.addEventListener('error', (event) => {
      this.log('error', 'JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Monitor navigation
    window.addEventListener('beforeunload', () => {
      this.recordMetric({
        type: 'user_activity',
        name: 'page_unload',
        value: 1,
        unit: 'count',
        tags: { page: window.location.pathname }
      });
    });

    // Monitor visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordMetric({
        type: 'user_activity',
        name: 'visibility_change',
        value: 1,
        unit: 'count',
        tags: { 
          visible: document.visibilityState === 'visible' ? 'true' : 'false'
        }
      });
    });
  }

  private collectSystemMetrics(): void {
    // Collect browser/system metrics
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      this.recordMetric({
        type: 'system',
        name: 'heap_used',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        tags: { component: 'memory' }
      });

      this.recordMetric({
        type: 'system',
        name: 'heap_total',
        value: memory.totalJSHeapSize,
        unit: 'bytes',
        tags: { component: 'memory' }
      });

      this.recordMetric({
        type: 'system',
        name: 'heap_limit',
        value: memory.jsHeapSizeLimit,
        unit: 'bytes',
        tags: { component: 'memory' }
      });
    }

    // Collect connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.recordMetric({
        type: 'system',
        name: 'connection_speed',
        value: connection.downlink || 0,
        unit: 'mbps',
        tags: { component: 'network' }
      });

      this.recordMetric({
        type: 'system',
        name: 'connection_rtt',
        value: connection.rtt || 0,
        unit: 'ms',
        tags: { component: 'network' }
      });
    }
  }

  private checkPerformanceThresholds(metrics: any): void {
    const thresholds = this.config.alertThresholds;

    if (metrics.memoryUsage > thresholds.memoryUsage) {
      this.createAlert({
        type: 'threshold',
        severity: 'high',
        title: 'High Memory Usage',
        description: `Memory usage is ${metrics.memoryUsage.toFixed(1)}%, exceeding threshold of ${thresholds.memoryUsage}%`,
        threshold: thresholds.memoryUsage,
        currentValue: metrics.memoryUsage,
        metric: 'memory_usage',
        tags: { component: 'performance' }
      });
    }

    if (metrics.renderTime > thresholds.responseTime) {
      this.createAlert({
        type: 'threshold',
        severity: 'medium',
        title: 'Slow Render Time',
        description: `Render time is ${metrics.renderTime.toFixed(1)}ms, exceeding threshold of ${thresholds.responseTime}ms`,
        threshold: thresholds.responseTime,
        currentValue: metrics.renderTime,
        metric: 'render_time',
        tags: { component: 'performance' }
      });
    }
  }

  private checkSecurityThresholds(stats: any): void {
    const thresholds = this.config.alertThresholds;

    if (stats.recentViolations > thresholds.securityViolations) {
      this.createAlert({
        type: 'security',
        severity: 'high',
        title: 'High Security Violations',
        description: `${stats.recentViolations} security violations in the last hour, exceeding threshold of ${thresholds.securityViolations}`,
        threshold: thresholds.securityViolations,
        currentValue: stats.recentViolations,
        metric: 'security_violations',
        tags: { component: 'security' }
      });
    }

    if (stats.lockedAccounts > thresholds.failedLogins) {
      this.createAlert({
        type: 'security',
        severity: 'medium',
        title: 'High Number of Locked Accounts',
        description: `${stats.lockedAccounts} accounts are currently locked, exceeding threshold of ${thresholds.failedLogins}`,
        threshold: thresholds.failedLogins,
        currentValue: stats.lockedAccounts,
        metric: 'locked_accounts',
        tags: { component: 'security' }
      });
    }
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;

    // Clean up old metrics
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);

    // Clean up old logs
    this.logs = this.logs.filter(log => log.timestamp > cutoff);

    // Clean up resolved alerts older than 24 hours
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || (alert.resolvedAt && alert.resolvedAt > cutoff)
    );

    this.saveData();
  }

  private generateReport(): void {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour ago

    const recentMetrics = this.metrics.filter(m => m.timestamp > hourAgo);
    const recentLogs = this.logs.filter(l => l.timestamp > hourAgo);
    const activeAlerts = this.alerts.filter(a => !a.resolved);

    const report = {
      timestamp: now,
      period: '1h',
      metrics: {
        total: recentMetrics.length,
        byType: this.groupBy(recentMetrics, 'type'),
        byName: this.groupBy(recentMetrics, 'name')
      },
      logs: {
        total: recentLogs.length,
        byLevel: this.groupBy(recentLogs, 'level'),
        byCategory: this.groupBy(recentLogs, 'category')
      },
      alerts: {
        total: activeAlerts.length,
        bySeverity: this.groupBy(activeAlerts, 'severity'),
        byType: this.groupBy(activeAlerts, 'type')
      }
    };

    this.log('info', 'Generated monitoring report', report);

    // Send to remote endpoint if configured
    if (this.config.enableRemoteLogging && this.config.remoteLoggingEndpoint) {
      this.sendToRemote(report);
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private sendToRemote(data: any): void {
    if (!this.config.remoteLoggingEndpoint) return;

    fetch(this.config.remoteLoggingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(error => {
      this.log('error', 'Failed to send data to remote endpoint', { error });
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${++this.correlationIdCounter}`;
  }

  // Public API
  public recordMetric(metric: Omit<MetricData, 'id' | 'timestamp'>): void {
    const fullMetric: MetricData = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);

    // Keep metrics array manageable
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }

    this.saveData();
  }

  public log(level: LogEntry['level'], message: string, context?: Record<string, any>): void {
    const logLevels = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevelIndex = logLevels.indexOf(this.config.logLevel);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex < configLevelIndex) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      category: context?.category || 'general',
      context,
      stackTrace: level === 'error' || level === 'critical' ? new Error().stack : undefined,
      sessionId: context?.sessionId,
      userId: context?.userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      correlationId: this.generateCorrelationId()
    };

    this.logs.push(entry);

    // Keep logs array manageable
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }

    // Console output for development
    if (level === 'error' || level === 'critical') {
      console.error(`[${level.toUpperCase()}] ${message}`, context);
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] ${message}`, context);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }

    this.saveData();
  }

  public createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const fullAlert: Alert = {
      id: this.generateId(),
      timestamp: Date.now(),
      resolved: false,
      ...alert
    };

    this.alerts.push(fullAlert);

    this.log('warn', `Alert created: ${alert.title}`, {
      alertId: fullAlert.id,
      severity: alert.severity,
      type: alert.type
    });

    this.saveData();
  }

  public resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;

    this.log('info', `Alert resolved: ${alert.title}`, {
      alertId,
      resolvedBy
    });

    this.saveData();
    return true;
  }

  public getMetrics(filters?: {
    type?: string;
    name?: string;
    timeRange?: { start: number; end: number };
    tags?: Record<string, string>;
  }): MetricData[] {
    let filtered = [...this.metrics];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(m => m.type === filters.type);
      }

      if (filters.name) {
        filtered = filtered.filter(m => m.name === filters.name);
      }

      if (filters.timeRange) {
        filtered = filtered.filter(m => 
          m.timestamp >= filters.timeRange!.start && 
          m.timestamp <= filters.timeRange!.end
        );
      }

      if (filters.tags) {
        filtered = filtered.filter(m => {
          return Object.entries(filters.tags!).every(([key, value]) => 
            m.tags[key] === value
          );
        });
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getLogs(filters?: {
    level?: string;
    category?: string;
    timeRange?: { start: number; end: number };
    correlationId?: string;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filters) {
      if (filters.level) {
        filtered = filtered.filter(l => l.level === filters.level);
      }

      if (filters.category) {
        filtered = filtered.filter(l => l.category === filters.category);
      }

      if (filters.timeRange) {
        filtered = filtered.filter(l => 
          l.timestamp >= filters.timeRange!.start && 
          l.timestamp <= filters.timeRange!.end
        );
      }

      if (filters.correlationId) {
        filtered = filtered.filter(l => l.correlationId === filters.correlationId);
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getAlerts(includeResolved = false): Alert[] {
    const alerts = includeResolved ? this.alerts : this.alerts.filter(a => !a.resolved);
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getDashboardMetrics(): DashboardMetrics {
    const now = Date.now();
    const hourAgo = now - 3600000;

    const recentMetrics = this.metrics.filter(m => m.timestamp > hourAgo);
    const perfMetrics = performanceOptimizer.getMetrics();
    const securityStats = securityService.getSecurityStats();

    return {
      realTime: {
        activeUsers: this.getLatestMetricValue(recentMetrics, 'active_users') || 0,
        requestsPerSecond: this.getLatestMetricValue(recentMetrics, 'requests_per_second') || 0,
        errorRate: this.getLatestMetricValue(recentMetrics, 'error_rate') || 0,
        averageResponseTime: this.getLatestMetricValue(recentMetrics, 'response_time') || 0,
        memoryUsage: perfMetrics.memoryUsage,
        cpuUsage: perfMetrics.cpuUsage
      },
      business: {
        totalDetections: this.getLatestMetricValue(recentMetrics, 'total_detections') || 0,
        activeDetections: this.getLatestMetricValue(recentMetrics, 'active_detections') || 0,
        uniquePersons: this.getLatestMetricValue(recentMetrics, 'unique_persons') || 0,
        averageConfidence: this.getLatestMetricValue(recentMetrics, 'average_confidence') || 0,
        cameraStatus: {
          camera1: 'online',
          camera2: 'online',
          camera3: 'degraded',
          camera4: 'online'
        }
      },
      security: {
        totalViolations: securityStats.totalViolations,
        recentViolations: securityStats.recentViolations,
        lockedAccounts: securityStats.lockedAccounts,
        activeSessions: securityStats.activeSessions,
        threatLevel: securityStats.recentViolations > 20 ? 'high' : 
                    securityStats.recentViolations > 10 ? 'medium' : 'low'
      },
      performance: {
        fps: perfMetrics.fps,
        latency: perfMetrics.networkLatency,
        renderTime: perfMetrics.renderTime,
        cacheHitRate: perfMetrics.cacheHitRate,
        bundleSize: perfMetrics.bundleSize
      }
    };
  }

  private getLatestMetricValue(metrics: MetricData[], name: string): number | null {
    const metric = metrics
      .filter(m => m.name === name)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return metric ? metric.value : null;
  }

  public getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    issues: string[];
  } {
    const issues: string[] = [];
    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};

    // Check performance health
    const perfMetrics = performanceOptimizer.getMetrics();
    if (perfMetrics.memoryUsage > 80) {
      issues.push('High memory usage');
      components.performance = 'degraded';
    } else if (perfMetrics.memoryUsage > 90) {
      issues.push('Critical memory usage');
      components.performance = 'unhealthy';
    } else {
      components.performance = 'healthy';
    }

    // Check security health
    const securityStats = securityService.getSecurityStats();
    if (securityStats.recentViolations > 50) {
      issues.push('High security violations');
      components.security = 'unhealthy';
    } else if (securityStats.recentViolations > 20) {
      issues.push('Elevated security violations');
      components.security = 'degraded';
    } else {
      components.security = 'healthy';
    }

    // Check active alerts
    const activeAlerts = this.getAlerts(false);
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} critical alerts`);
    }

    // Overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) overall = 'healthy';
    else if (issues.length <= 2) overall = 'degraded';
    else overall = 'unhealthy';

    return { overall, components, issues };
  }

  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  public exportData(): any {
    return {
      metrics: this.metrics,
      logs: this.logs,
      alerts: this.alerts,
      config: this.config,
      timestamp: Date.now()
    };
  }

  public clearData(): void {
    this.metrics = [];
    this.logs = [];
    this.alerts = [];
    this.saveData();
  }

  public destroy(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    this.saveData();
  }
}

// Export service instance
export const monitoringService = new MonitoringService();

// Export class for custom instances
export { MonitoringService };