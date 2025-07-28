export interface PerformanceMetrics {
  fps: number;
  latency: number;
  frameDrops: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  renderTime: number;
  cameraMetrics: Record<string, CameraPerformanceMetrics>;
}

export interface CameraPerformanceMetrics {
  fps: number;
  frameDrops: number;
  averageLatency: number;
  processingTime: number;
  dataTransferred: number;
  lastFrameTime: number;
  isActive: boolean;
}

export interface PerformanceThresholds {
  fps: {
    good: number;
    warning: number;
    critical: number;
  };
  latency: {
    good: number;
    warning: number;
    critical: number;
  };
  frameDrops: {
    good: number;
    warning: number;
    critical: number;
  };
  memoryUsage: {
    good: number;
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  type: 'fps' | 'latency' | 'frameDrops' | 'memory' | 'network' | 'camera';
  severity: 'good' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  cameraId?: string;
}

export interface PerformanceConfig {
  monitoringInterval: number;
  metricsHistorySize: number;
  enableAlerts: boolean;
  enableDetailedMetrics: boolean;
  thresholds: PerformanceThresholds;
}

export type PerformanceHandler = (metrics: PerformanceMetrics) => void;
export type PerformanceAlertHandler = (alert: PerformanceAlert) => void;

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics = {
    fps: 0,
    latency: 0,
    frameDrops: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    renderTime: 0,
    cameraMetrics: {},
  };
  private metricsHistory: PerformanceMetrics[] = [];
  private performanceHandlers: PerformanceHandler[] = [];
  private alertHandlers: PerformanceAlertHandler[] = [];
  private monitoringInterval: number | null = null;
  private isRunning = false;

  // Performance tracking variables
  private frameTimestamps: number[] = [];
  private renderTimestamps: number[] = [];
  private lastFrameTime = 0;
  private totalFrames = 0;
  private totalFrameDrops = 0;
  private latencyMeasurements: number[] = [];
  private networkRequests: Map<string, number> = new Map();
  private cameraStats: Map<string, CameraPerformanceMetrics> = new Map();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      monitoringInterval: 1000, // 1 second
      metricsHistorySize: 60,   // Keep 60 seconds of history
      enableAlerts: true,
      enableDetailedMetrics: true,
      thresholds: {
        fps: { good: 25, warning: 15, critical: 10 },
        latency: { good: 100, warning: 300, critical: 1000 },
        frameDrops: { good: 5, warning: 15, critical: 30 },
        memoryUsage: { good: 100, warning: 200, critical: 500 }, // MB
      },
      ...config,
    };
  }

  // Start performance monitoring
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.initializeMetrics();
    this.scheduleMetricsCollection();
  }

  // Stop performance monitoring
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Initialize metrics
  private initializeMetrics(): void {
    this.metrics = {
      fps: 0,
      latency: 0,
      frameDrops: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      renderTime: 0,
      cameraMetrics: {},
    };
    
    this.frameTimestamps = [];
    this.renderTimestamps = [];
    this.latencyMeasurements = [];
    this.totalFrames = 0;
    this.totalFrameDrops = 0;
    this.cameraStats.clear();
  }

  // Schedule metrics collection
  private scheduleMetricsCollection(): void {
    if (!this.isRunning) return;

    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
  }

  // Collect performance metrics
  private collectMetrics(): void {
    try {
      // Update FPS
      this.updateFPS();
      
      // Update latency
      this.updateLatency();
      
      // Update frame drops
      this.updateFrameDrops();
      
      // Update memory usage
      this.updateMemoryUsage();
      
      // Update CPU usage (if available)
      this.updateCPUUsage();
      
      // Update network latency
      this.updateNetworkLatency();
      
      // Update render time
      this.updateRenderTime();
      
      // Update camera metrics
      this.updateCameraMetrics();
      
      // Add to history
      this.addToHistory();
      
      // Check for alerts
      if (this.config.enableAlerts) {
        this.checkForAlerts();
      }
      
      // Notify handlers
      this.notifyPerformanceHandlers();
      
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  // Update FPS calculation
  private updateFPS(): void {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Filter timestamps to last second
    this.frameTimestamps = this.frameTimestamps.filter(timestamp => timestamp > oneSecondAgo);
    
    this.metrics.fps = this.frameTimestamps.length;
  }

  // Update latency calculation
  private updateLatency(): void {
    if (this.latencyMeasurements.length === 0) {
      this.metrics.latency = 0;
      return;
    }
    
    const average = this.latencyMeasurements.reduce((sum, val) => sum + val, 0) / this.latencyMeasurements.length;
    this.metrics.latency = average;
    
    // Keep only recent measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements = this.latencyMeasurements.slice(-50);
    }
  }

  // Update frame drops calculation
  private updateFrameDrops(): void {
    this.metrics.frameDrops = this.totalFrameDrops;
  }

  // Update memory usage
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
    } else {
      // Fallback estimation
      this.metrics.memoryUsage = this.estimateMemoryUsage();
    }
  }

  // Estimate memory usage fallback
  private estimateMemoryUsage(): number {
    // Simple estimation based on metrics history size and camera count
    const baseUsage = 50; // Base usage in MB
    const historyUsage = this.metricsHistory.length * 0.1; // 0.1 MB per history entry
    const cameraUsage = Object.keys(this.metrics.cameraMetrics).length * 10; // 10 MB per camera
    
    return baseUsage + historyUsage + cameraUsage;
  }

  // Update CPU usage (limited browser support)
  private updateCPUUsage(): void {
    // This is a simplified estimation since true CPU usage isn't available in browsers
    const renderingLoad = Math.min(this.metrics.renderTime / 16.67, 1); // Based on 60fps target
    const frameProcessingLoad = Math.min(this.metrics.fps / 30, 1); // Based on 30fps target
    
    this.metrics.cpuUsage = (renderingLoad + frameProcessingLoad) / 2 * 100;
  }

  // Update network latency
  private updateNetworkLatency(): void {
    if (this.networkRequests.size === 0) {
      this.metrics.networkLatency = 0;
      return;
    }
    
    const latencies = Array.from(this.networkRequests.values());
    const average = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    this.metrics.networkLatency = average;
  }

  // Update render time
  private updateRenderTime(): void {
    if (this.renderTimestamps.length === 0) {
      this.metrics.renderTime = 0;
      return;
    }
    
    const recent = this.renderTimestamps.slice(-10); // Last 10 renders
    const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    this.metrics.renderTime = average;
  }

  // Update camera metrics
  private updateCameraMetrics(): void {
    const cameraMetrics: Record<string, CameraPerformanceMetrics> = {};
    
    this.cameraStats.forEach((stats, cameraId) => {
      cameraMetrics[cameraId] = { ...stats };
    });
    
    this.metrics.cameraMetrics = cameraMetrics;
  }

  // Add metrics to history
  private addToHistory(): void {
    const currentMetrics = { ...this.metrics };
    this.metricsHistory.push(currentMetrics);
    
    // Keep only recent history
    if (this.metricsHistory.length > this.config.metricsHistorySize) {
      this.metricsHistory.shift();
    }
  }

  // Check for performance alerts
  private checkForAlerts(): void {
    const { thresholds } = this.config;
    
    // Check FPS
    this.checkMetricThreshold('fps', this.metrics.fps, thresholds.fps, 'FPS dropped', true);
    
    // Check latency
    this.checkMetricThreshold('latency', this.metrics.latency, thresholds.latency, 'High latency detected', false);
    
    // Check frame drops
    this.checkMetricThreshold('frameDrops', this.metrics.frameDrops, thresholds.frameDrops, 'Frame drops detected', false);
    
    // Check memory usage
    this.checkMetricThreshold('memory', this.metrics.memoryUsage, thresholds.memoryUsage, 'High memory usage', false);
    
    // Check camera metrics
    Object.entries(this.metrics.cameraMetrics).forEach(([cameraId, metrics]) => {
      this.checkCameraMetrics(cameraId, metrics);
    });
  }

  // Check metric against threshold
  private checkMetricThreshold(
    type: 'fps' | 'latency' | 'frameDrops' | 'memory',
    value: number,
    threshold: { good: number; warning: number; critical: number },
    message: string,
    lowerIsBetter: boolean
  ): void {
    let severity: 'good' | 'warning' | 'critical' = 'good';
    let thresholdValue = threshold.good;
    
    if (lowerIsBetter) {
      if (value < threshold.critical) {
        severity = 'critical';
        thresholdValue = threshold.critical;
      } else if (value < threshold.warning) {
        severity = 'warning';
        thresholdValue = threshold.warning;
      }
    } else {
      if (value > threshold.critical) {
        severity = 'critical';
        thresholdValue = threshold.critical;
      } else if (value > threshold.warning) {
        severity = 'warning';
        thresholdValue = threshold.warning;
      }
    }
    
    if (severity !== 'good') {
      this.createAlert(type, severity, message, value, thresholdValue);
    }
  }

  // Check camera-specific metrics
  private checkCameraMetrics(cameraId: string, metrics: CameraPerformanceMetrics): void {
    // Check camera FPS
    if (metrics.fps < this.config.thresholds.fps.warning) {
      const severity = metrics.fps < this.config.thresholds.fps.critical ? 'critical' : 'warning';
      this.createAlert('camera', severity, `Camera ${cameraId} FPS dropped`, metrics.fps, this.config.thresholds.fps.warning, cameraId);
    }
    
    // Check camera latency
    if (metrics.averageLatency > this.config.thresholds.latency.warning) {
      const severity = metrics.averageLatency > this.config.thresholds.latency.critical ? 'critical' : 'warning';
      this.createAlert('camera', severity, `Camera ${cameraId} high latency`, metrics.averageLatency, this.config.thresholds.latency.warning, cameraId);
    }
  }

  // Create performance alert
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number,
    cameraId?: string
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      cameraId,
    };
    
    this.notifyAlertHandlers(alert);
  }

  // Notify handlers
  private notifyPerformanceHandlers(): void {
    this.performanceHandlers.forEach(handler => {
      try {
        handler(this.metrics);
      } catch (error) {
        console.error('Error in performance handler:', error);
      }
    });
  }

  private notifyAlertHandlers(alert: PerformanceAlert): void {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Error in alert handler:', error);
      }
    });
  }

  // Public API methods for tracking

  // Track frame rendering
  trackFrame(cameraId?: string): void {
    const now = Date.now();
    this.frameTimestamps.push(now);
    this.totalFrames++;
    this.lastFrameTime = now;
    
    if (cameraId) {
      this.updateCameraStats(cameraId, 'frame');
    }
  }

  // Track frame drop
  trackFrameDrop(cameraId?: string): void {
    this.totalFrameDrops++;
    
    if (cameraId) {
      this.updateCameraStats(cameraId, 'drop');
    }
  }

  // Track render time
  trackRenderTime(renderTime: number): void {
    this.renderTimestamps.push(renderTime);
    
    // Keep only recent render times
    if (this.renderTimestamps.length > 100) {
      this.renderTimestamps = this.renderTimestamps.slice(-50);
    }
  }

  // Track latency
  trackLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
  }

  // Track network request
  trackNetworkRequest(requestId: string, startTime: number): void {
    const latency = Date.now() - startTime;
    this.networkRequests.set(requestId, latency);
    
    // Clean up old requests
    if (this.networkRequests.size > 100) {
      const entries = Array.from(this.networkRequests.entries());
      const toKeep = entries.slice(-50);
      this.networkRequests.clear();
      toKeep.forEach(([id, latency]) => {
        this.networkRequests.set(id, latency);
      });
    }
  }

  // Update camera statistics
  private updateCameraStats(cameraId: string, event: 'frame' | 'drop'): void {
    if (!this.cameraStats.has(cameraId)) {
      this.cameraStats.set(cameraId, {
        fps: 0,
        frameDrops: 0,
        averageLatency: 0,
        processingTime: 0,
        dataTransferred: 0,
        lastFrameTime: 0,
        isActive: true,
      });
    }
    
    const stats = this.cameraStats.get(cameraId)!;
    
    if (event === 'frame') {
      stats.lastFrameTime = Date.now();
      stats.isActive = true;
    } else if (event === 'drop') {
      stats.frameDrops++;
    }
  }

  // Public API
  onMetrics(handler: PerformanceHandler): void {
    this.performanceHandlers.push(handler);
  }

  offMetrics(handler: PerformanceHandler): void {
    const index = this.performanceHandlers.indexOf(handler);
    if (index > -1) {
      this.performanceHandlers.splice(index, 1);
    }
  }

  onAlert(handler: PerformanceAlertHandler): void {
    this.alertHandlers.push(handler);
  }

  offAlert(handler: PerformanceAlertHandler): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get metrics history
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  // Get performance summary
  getPerformanceSummary(): {
    overall: 'excellent' | 'good' | 'poor' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check FPS
    if (this.metrics.fps < this.config.thresholds.fps.critical) {
      issues.push(`Critical FPS: ${this.metrics.fps.toFixed(1)} fps`);
      recommendations.push('Consider reducing video quality or camera count');
    } else if (this.metrics.fps < this.config.thresholds.fps.warning) {
      issues.push(`Low FPS: ${this.metrics.fps.toFixed(1)} fps`);
      recommendations.push('Monitor system resources');
    }
    
    // Check latency
    if (this.metrics.latency > this.config.thresholds.latency.critical) {
      issues.push(`High latency: ${this.metrics.latency.toFixed(0)}ms`);
      recommendations.push('Check network connection');
    } else if (this.metrics.latency > this.config.thresholds.latency.warning) {
      issues.push(`Elevated latency: ${this.metrics.latency.toFixed(0)}ms`);
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > this.config.thresholds.memoryUsage.critical) {
      issues.push(`High memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`);
      recommendations.push('Restart application or reduce buffer sizes');
    } else if (this.metrics.memoryUsage > this.config.thresholds.memoryUsage.warning) {
      issues.push(`Elevated memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`);
    }
    
    // Check frame drops
    if (this.metrics.frameDrops > this.config.thresholds.frameDrops.critical) {
      issues.push(`High frame drops: ${this.metrics.frameDrops}`);
      recommendations.push('Reduce video quality or check system performance');
    } else if (this.metrics.frameDrops > this.config.thresholds.frameDrops.warning) {
      issues.push(`Frame drops detected: ${this.metrics.frameDrops}`);
    }
    
    // Determine overall status
    let overall: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';
    
    if (issues.some(issue => issue.includes('Critical'))) {
      overall = 'critical';
    } else if (issues.some(issue => issue.includes('High'))) {
      overall = 'poor';
    } else if (issues.length > 0) {
      overall = 'good';
    }
    
    return { overall, issues, recommendations };
  }

  // Update configuration
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Get configuration
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  // Reset performance monitor
  reset(): void {
    this.initializeMetrics();
    this.metricsHistory = [];
    this.networkRequests.clear();
  }
}

// Export service instance
export const performanceMonitor = new PerformanceMonitor();

// Export service class for custom instances
export { PerformanceMonitor };