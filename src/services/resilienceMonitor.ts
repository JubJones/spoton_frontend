import { errorHandler, ErrorReport } from './errorHandler';
import { recoveryCoordinator, RecoverySession } from './recoveryCoordinator';
import { performanceMonitor } from './performanceMonitor';
import { healthCheck } from './healthCheck';
import { websocketClient } from './websocket';
import { frameSynchronizer } from './frameSynchronizer';

export interface ResilienceStatus {
  overall: 'excellent' | 'good' | 'degraded' | 'poor' | 'critical';
  score: number; // 0-100
  components: ComponentStatus[];
  trends: ResilienceTrends;
  recommendations: string[];
  lastUpdated: string;
}

export interface ComponentStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  score: number;
  metrics: ComponentMetrics;
  errors: number;
  uptime: number;
  lastError?: string;
}

export interface ComponentMetrics {
  availability: number;
  performance: number;
  reliability: number;
  recoverability: number;
}

export interface ResilienceTrends {
  errorRate: TrendData;
  recoveryRate: TrendData;
  performance: TrendData;
  availability: TrendData;
}

export interface TrendData {
  current: number;
  previous: number;
  trend: 'improving' | 'stable' | 'degrading';
  change: number;
}

export interface ResilienceAlert {
  id: string;
  type: 'system' | 'component' | 'performance' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component?: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, unknown>;
}

export interface ResilienceConfig {
  monitoringInterval: number;
  alertThresholds: AlertThresholds;
  trendCalculationWindow: number;
  enablePredictiveAnalysis: boolean;
  enableAutomaticReporting: boolean;
  retentionPeriod: number;
}

export interface AlertThresholds {
  errorRate: number;
  recoveryTime: number;
  performanceScore: number;
  availabilityScore: number;
  componentScore: number;
}

export type ResilienceStatusHandler = (status: ResilienceStatus) => void;
export type ResilienceAlertHandler = (alert: ResilienceAlert) => void;

class ResilienceMonitorService {
  private config: ResilienceConfig;
  private currentStatus: ResilienceStatus;
  private statusHistory: ResilienceStatus[] = [];
  private activeAlerts: Map<string, ResilienceAlert> = new Map();
  private alertHistory: ResilienceAlert[] = [];
  private statusHandlers: ResilienceStatusHandler[] = [];
  private alertHandlers: ResilienceAlertHandler[] = [];
  private monitoringInterval: number | null = null;
  private isRunning = false;

  // Component tracking
  private componentStartTimes: Map<string, number> = new Map();
  private componentErrors: Map<string, number> = new Map();
  private componentMetricsHistory: Map<string, ComponentMetrics[]> = new Map();

  constructor(config: Partial<ResilienceConfig> = {}) {
    this.config = {
      monitoringInterval: 5000, // 5 seconds
      alertThresholds: {
        errorRate: 0.1, // 10%
        recoveryTime: 30000, // 30 seconds
        performanceScore: 60,
        availabilityScore: 95,
        componentScore: 70,
      },
      trendCalculationWindow: 12, // 12 data points (1 minute with 5s interval)
      enablePredictiveAnalysis: true,
      enableAutomaticReporting: false,
      retentionPeriod: 86400000, // 24 hours
      ...config,
    };

    this.currentStatus = this.initializeStatus();
    this.setupEventHandlers();
  }

  // Initialize status
  private initializeStatus(): ResilienceStatus {
    return {
      overall: 'excellent',
      score: 100,
      components: [],
      trends: {
        errorRate: { current: 0, previous: 0, trend: 'stable', change: 0 },
        recoveryRate: { current: 0, previous: 0, trend: 'stable', change: 0 },
        performance: { current: 100, previous: 100, trend: 'stable', change: 0 },
        availability: { current: 100, previous: 100, trend: 'stable', change: 0 },
      },
      recommendations: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    // Error handler events
    errorHandler.onError((error) => {
      this.handleComponentError(error);
    });

    // Recovery coordinator events
    recoveryCoordinator.onComplete((session, success) => {
      this.handleRecoveryComplete(session, success);
    });

    // Performance monitor events
    performanceMonitor.onAlert((alert) => {
      if (alert.severity === 'critical') {
        this.createAlert({
          type: 'performance',
          severity: 'high',
          message: alert.message,
          component: alert.cameraId || 'performance_monitor',
          metadata: { alert },
        });
      }
    });

    // Health check events
    healthCheck.onHealthChange((service, oldStatus, newStatus) => {
      if (newStatus === 'down') {
        this.createAlert({
          type: 'component',
          severity: 'high',
          message: `Service ${service} is down`,
          component: service,
          metadata: { oldStatus, newStatus },
        });
      }
    });
  }

  // Start monitoring
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.initializeComponentTracking();
    this.scheduleMonitoring();
  }

  // Stop monitoring
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Initialize component tracking
  private initializeComponentTracking(): void {
    const components = [
      'websocket',
      'frame_handler',
      'frame_synchronizer',
      'performance_monitor',
      'health_check',
      'error_handler',
      'recovery_coordinator',
    ];

    const startTime = Date.now();
    components.forEach(component => {
      this.componentStartTimes.set(component, startTime);
      this.componentErrors.set(component, 0);
      this.componentMetricsHistory.set(component, []);
    });
  }

  // Schedule monitoring
  private scheduleMonitoring(): void {
    if (!this.isRunning) return;

    this.monitoringInterval = window.setInterval(() => {
      this.updateStatus();
    }, this.config.monitoringInterval);
  }

  // Update status
  private updateStatus(): void {
    try {
      const components = this.calculateComponentStatuses();
      const trends = this.calculateTrends();
      const overallScore = this.calculateOverallScore(components);
      const overall = this.determineOverallStatus(overallScore);
      const recommendations = this.generateRecommendations(components, trends);

      this.currentStatus = {
        overall,
        score: overallScore,
        components,
        trends,
        recommendations,
        lastUpdated: new Date().toISOString(),
      };

      // Add to history
      this.addToHistory();

      // Check for alerts
      this.checkForAlerts();

      // Notify handlers
      this.notifyStatusHandlers();

    } catch (error) {
      console.error('Error updating resilience status:', error);
    }
  }

  // Calculate component statuses
  private calculateComponentStatuses(): ComponentStatus[] {
    const components: ComponentStatus[] = [];

    // WebSocket component
    components.push({
      name: 'websocket',
      status: this.getWebSocketStatus(),
      score: this.calculateWebSocketScore(),
      metrics: this.calculateWebSocketMetrics(),
      errors: this.componentErrors.get('websocket') || 0,
      uptime: this.calculateUptime('websocket'),
      lastError: this.getLastError('websocket'),
    });

    // Frame handler component
    components.push({
      name: 'frame_handler',
      status: this.getFrameHandlerStatus(),
      score: this.calculateFrameHandlerScore(),
      metrics: this.calculateFrameHandlerMetrics(),
      errors: this.componentErrors.get('frame_handler') || 0,
      uptime: this.calculateUptime('frame_handler'),
      lastError: this.getLastError('frame_handler'),
    });

    // Frame synchronizer component
    components.push({
      name: 'frame_synchronizer',
      status: this.getFrameSynchronizerStatus(),
      score: this.calculateFrameSynchronizerScore(),
      metrics: this.calculateFrameSynchronizerMetrics(),
      errors: this.componentErrors.get('frame_synchronizer') || 0,
      uptime: this.calculateUptime('frame_synchronizer'),
      lastError: this.getLastError('frame_synchronizer'),
    });

    // Performance monitor component
    components.push({
      name: 'performance_monitor',
      status: this.getPerformanceMonitorStatus(),
      score: this.calculatePerformanceMonitorScore(),
      metrics: this.calculatePerformanceMonitorMetrics(),
      errors: this.componentErrors.get('performance_monitor') || 0,
      uptime: this.calculateUptime('performance_monitor'),
      lastError: this.getLastError('performance_monitor'),
    });

    // Health check component
    components.push({
      name: 'health_check',
      status: this.getHealthCheckStatus(),
      score: this.calculateHealthCheckScore(),
      metrics: this.calculateHealthCheckMetrics(),
      errors: this.componentErrors.get('health_check') || 0,
      uptime: this.calculateUptime('health_check'),
      lastError: this.getLastError('health_check'),
    });

    return components;
  }

  // WebSocket status methods
  private getWebSocketStatus(): ComponentStatus['status'] {
    const wsStatus = websocketClient.getStatus();
    switch (wsStatus) {
      case 'connected': return 'healthy';
      case 'connecting': return 'warning';
      case 'disconnected': return 'offline';
      case 'error': return 'error';
      default: return 'offline';
    }
  }

  private calculateWebSocketScore(): number {
    const status = websocketClient.getStatus();
    const quality = websocketClient.getConnectionQuality();
    const metrics = websocketClient.getPerformanceMetrics();
    
    let score = 0;
    
    // Connection status (40%)
    if (status === 'connected') score += 40;
    else if (status === 'connecting') score += 20;
    
    // Connection quality (30%)
    switch (quality) {
      case 'excellent': score += 30; break;
      case 'good': score += 25; break;
      case 'poor': score += 15; break;
      case 'critical': score += 5; break;
    }
    
    // Performance metrics (30%)
    if (metrics.latency < 100) score += 30;
    else if (metrics.latency < 300) score += 25;
    else if (metrics.latency < 1000) score += 15;
    else score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateWebSocketMetrics(): ComponentMetrics {
    const isConnected = websocketClient.isConnected();
    const quality = websocketClient.getConnectionQuality();
    const metrics = websocketClient.getPerformanceMetrics();
    
    return {
      availability: isConnected ? 100 : 0,
      performance: this.mapQualityToScore(quality),
      reliability: isConnected ? Math.max(0, 100 - metrics.latency / 10) : 0,
      recoverability: 85, // WebSocket has good reconnection logic
    };
  }

  // Frame handler status methods
  private getFrameHandlerStatus(): ComponentStatus['status'] {
    const stats = frameHandler.getStatistics();
    const errorRate = stats.droppedFrames / Math.max(1, stats.processedFrames);
    
    if (errorRate > 0.2) return 'error';
    if (errorRate > 0.1) return 'warning';
    return 'healthy';
  }

  private calculateFrameHandlerScore(): number {
    const stats = frameHandler.getStatistics();
    const errorRate = stats.droppedFrames / Math.max(1, stats.processedFrames);
    const fps = stats.fps;
    
    let score = 100;
    
    // Error rate penalty
    score -= errorRate * 200; // 20% error rate = 40 point penalty
    
    // FPS bonus/penalty
    if (fps >= 25) score += 0;
    else if (fps >= 15) score -= 10;
    else if (fps >= 10) score -= 25;
    else score -= 50;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateFrameHandlerMetrics(): ComponentMetrics {
    const stats = frameHandler.getStatistics();
    const errorRate = stats.droppedFrames / Math.max(1, stats.processedFrames);
    const fps = stats.fps;
    
    return {
      availability: stats.processedFrames > 0 ? 100 : 0,
      performance: Math.max(0, 100 - errorRate * 100),
      reliability: Math.max(0, 100 - errorRate * 200),
      recoverability: 70, // Frame handler has basic recovery capabilities
    };
  }

  // Frame synchronizer status methods
  private getFrameSynchronizerStatus(): ComponentStatus['status'] {
    const quality = frameSynchronizer.getSyncQuality();
    
    switch (quality.overall) {
      case 'excellent': return 'healthy';
      case 'good': return 'healthy';
      case 'poor': return 'warning';
      case 'critical': return 'error';
      default: return 'offline';
    }
  }

  private calculateFrameSynchronizerScore(): number {
    const quality = frameSynchronizer.getSyncQuality();
    const stats = frameSynchronizer.getStatistics();
    
    let score = 0;
    
    // Sync quality (50%)
    switch (quality.overall) {
      case 'excellent': score += 50; break;
      case 'good': score += 40; break;
      case 'poor': score += 20; break;
      case 'critical': score += 10; break;
    }
    
    // Sync accuracy (30%)
    score += quality.accuracy * 30;
    
    // Active cameras ratio (20%)
    const cameraRatio = quality.totalCameras > 0 ? 
      quality.activeCameras / quality.totalCameras : 0;
    score += cameraRatio * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateFrameSynchronizerMetrics(): ComponentMetrics {
    const quality = frameSynchronizer.getSyncQuality();
    const stats = frameSynchronizer.getStatistics();
    
    return {
      availability: quality.totalCameras > 0 ? 100 : 0,
      performance: quality.accuracy * 100,
      reliability: (quality.activeCameras / Math.max(1, quality.totalCameras)) * 100,
      recoverability: 80, // Frame synchronizer has good reset capabilities
    };
  }

  // Performance monitor status methods
  private getPerformanceMonitorStatus(): ComponentStatus['status'] {
    const summary = performanceMonitor.getPerformanceSummary();
    
    switch (summary.overall) {
      case 'excellent': return 'healthy';
      case 'good': return 'healthy';
      case 'poor': return 'warning';
      case 'critical': return 'error';
      default: return 'offline';
    }
  }

  private calculatePerformanceMonitorScore(): number {
    const summary = performanceMonitor.getPerformanceSummary();
    const metrics = performanceMonitor.getCurrentMetrics();
    
    let score = 0;
    
    // Overall performance (50%)
    switch (summary.overall) {
      case 'excellent': score += 50; break;
      case 'good': score += 40; break;
      case 'poor': score += 20; break;
      case 'critical': score += 10; break;
    }
    
    // FPS (25%)
    if (metrics.fps >= 25) score += 25;
    else if (metrics.fps >= 15) score += 20;
    else if (metrics.fps >= 10) score += 10;
    else score += 5;
    
    // Latency (25%)
    if (metrics.latency < 100) score += 25;
    else if (metrics.latency < 300) score += 20;
    else if (metrics.latency < 1000) score += 10;
    else score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculatePerformanceMonitorMetrics(): ComponentMetrics {
    const summary = performanceMonitor.getPerformanceSummary();
    const metrics = performanceMonitor.getCurrentMetrics();
    
    return {
      availability: 100, // Performance monitor is always available
      performance: this.mapPerformanceToScore(summary.overall),
      reliability: Math.max(0, 100 - summary.issues.length * 10),
      recoverability: 90, // Performance monitor has excellent recovery
    };
  }

  // Health check status methods
  private getHealthCheckStatus(): ComponentStatus['status'] {
    const health = healthCheck.getCurrentHealth();
    
    if (!health) return 'offline';
    
    switch (health.overall) {
      case 'healthy': return 'healthy';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'offline';
    }
  }

  private calculateHealthCheckScore(): number {
    const health = healthCheck.getCurrentHealth();
    
    if (!health) return 0;
    
    let score = 0;
    
    // Overall health (60%)
    switch (health.overall) {
      case 'healthy': score += 60; break;
      case 'degraded': score += 40; break;
      case 'unhealthy': score += 20; break;
    }
    
    // Service health (40%)
    const services = Object.values(health.services);
    const healthyServices = services.filter(s => s.status === 'up').length;
    const serviceRatio = services.length > 0 ? healthyServices / services.length : 0;
    score += serviceRatio * 40;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateHealthCheckMetrics(): ComponentMetrics {
    const health = healthCheck.getCurrentHealth();
    
    if (!health) {
      return {
        availability: 0,
        performance: 0,
        reliability: 0,
        recoverability: 60,
      };
    }
    
    const services = Object.values(health.services);
    const healthyServices = services.filter(s => s.status === 'up').length;
    const serviceRatio = services.length > 0 ? healthyServices / services.length : 0;
    
    return {
      availability: serviceRatio * 100,
      performance: health.responseTime < 1000 ? 100 : Math.max(0, 100 - health.responseTime / 100),
      reliability: serviceRatio * 100,
      recoverability: 75, // Health check has good recovery capabilities
    };
  }

  // Helper methods
  private mapQualityToScore(quality: string): number {
    switch (quality) {
      case 'excellent': return 100;
      case 'good': return 80;
      case 'poor': return 50;
      case 'critical': return 20;
      default: return 0;
    }
  }

  private mapPerformanceToScore(performance: string): number {
    switch (performance) {
      case 'excellent': return 100;
      case 'good': return 80;
      case 'poor': return 50;
      case 'critical': return 20;
      default: return 0;
    }
  }

  private calculateUptime(component: string): number {
    const startTime = this.componentStartTimes.get(component);
    if (!startTime) return 0;
    
    return Date.now() - startTime;
  }

  private getLastError(component: string): string | undefined {
    const errors = errorHandler.getErrorReports()
      .filter(error => error.component === component)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return errors.length > 0 ? errors[0].message : undefined;
  }

  // Calculate trends
  private calculateTrends(): ResilienceTrends {
    const recentHistory = this.statusHistory.slice(-this.config.trendCalculationWindow);
    
    if (recentHistory.length < 2) {
      return this.currentStatus.trends;
    }
    
    const latest = recentHistory[recentHistory.length - 1];
    const previous = recentHistory[recentHistory.length - 2];
    
    return {
      errorRate: this.calculateTrendData(
        this.calculateErrorRate(latest),
        this.calculateErrorRate(previous)
      ),
      recoveryRate: this.calculateTrendData(
        this.calculateRecoveryRate(latest),
        this.calculateRecoveryRate(previous)
      ),
      performance: this.calculateTrendData(
        latest.score,
        previous.score
      ),
      availability: this.calculateTrendData(
        this.calculateAvailability(latest),
        this.calculateAvailability(previous)
      ),
    };
  }

  private calculateTrendData(current: number, previous: number): TrendData {
    const change = current - previous;
    const trend = change > 0.5 ? 'improving' : change < -0.5 ? 'degrading' : 'stable';
    
    return {
      current,
      previous,
      trend,
      change,
    };
  }

  private calculateErrorRate(status: ResilienceStatus): number {
    const totalErrors = status.components.reduce((sum, comp) => sum + comp.errors, 0);
    return totalErrors;
  }

  private calculateRecoveryRate(status: ResilienceStatus): number {
    const stats = recoveryCoordinator.getRecoveryStatistics();
    return stats.successRate * 100;
  }

  private calculateAvailability(status: ResilienceStatus): number {
    const availabilities = status.components.map(comp => comp.metrics.availability);
    return availabilities.length > 0 ? 
      availabilities.reduce((sum, val) => sum + val, 0) / availabilities.length : 0;
  }

  // Calculate overall score
  private calculateOverallScore(components: ComponentStatus[]): number {
    if (components.length === 0) return 0;
    
    const weights = {
      websocket: 0.25,
      frame_handler: 0.2,
      frame_synchronizer: 0.2,
      performance_monitor: 0.15,
      health_check: 0.2,
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    components.forEach(component => {
      const weight = weights[component.name as keyof typeof weights] || 0.1;
      weightedSum += component.score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Determine overall status
  private determineOverallStatus(score: number): ResilienceStatus['overall'] {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 60) return 'degraded';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  // Generate recommendations
  private generateRecommendations(components: ComponentStatus[], trends: ResilienceTrends): string[] {
    const recommendations: string[] = [];
    
    // Component-specific recommendations
    components.forEach(component => {
      if (component.status === 'error') {
        recommendations.push(`Immediate attention required for ${component.name}`);
      } else if (component.status === 'warning') {
        recommendations.push(`Monitor ${component.name} closely`);
      }
      
      if (component.score < 70) {
        recommendations.push(`Consider optimizing ${component.name} performance`);
      }
    });
    
    // Trend-based recommendations
    if (trends.errorRate.trend === 'degrading') {
      recommendations.push('Error rate is increasing - investigate root causes');
    }
    
    if (trends.performance.trend === 'degrading') {
      recommendations.push('Performance is declining - consider system optimization');
    }
    
    if (trends.availability.trend === 'degrading') {
      recommendations.push('Availability is decreasing - check service health');
    }
    
    // Recovery-based recommendations
    const recoveryStats = recoveryCoordinator.getRecoveryStatistics();
    if (recoveryStats.successRate < 0.8) {
      recommendations.push('Recovery success rate is low - review recovery procedures');
    }
    
    return recommendations;
  }

  // Add to history
  private addToHistory(): void {
    this.statusHistory.push({ ...this.currentStatus });
    
    // Keep only recent history
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.statusHistory = this.statusHistory.filter(status => 
      new Date(status.lastUpdated).getTime() > cutoff
    );
  }

  // Handle component error
  private handleComponentError(error: ErrorReport): void {
    const currentCount = this.componentErrors.get(error.component) || 0;
    this.componentErrors.set(error.component, currentCount + 1);
  }

  // Handle recovery complete
  private handleRecoveryComplete(session: RecoverySession, success: boolean): void {
    if (success) {
      // Reset error count for recovered components
      this.componentErrors.set(session.planId, 0);
    }
  }

  // Check for alerts
  private checkForAlerts(): void {
    const { alertThresholds } = this.config;
    
    // Check overall score
    if (this.currentStatus.score < alertThresholds.componentScore) {
      this.createAlert({
        type: 'system',
        severity: 'high',
        message: `Overall resilience score is low: ${this.currentStatus.score.toFixed(1)}`,
        metadata: { score: this.currentStatus.score },
      });
    }
    
    // Check component scores
    this.currentStatus.components.forEach(component => {
      if (component.score < alertThresholds.componentScore) {
        this.createAlert({
          type: 'component',
          severity: 'medium',
          message: `Component ${component.name} score is low: ${component.score.toFixed(1)}`,
          component: component.name,
          metadata: { score: component.score, metrics: component.metrics },
        });
      }
    });
    
    // Check trends
    if (this.currentStatus.trends.performance.trend === 'degrading' &&
        this.currentStatus.trends.performance.change < -10) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        message: 'Performance trend is degrading significantly',
        metadata: { trend: this.currentStatus.trends.performance },
      });
    }
  }

  // Create alert
  private createAlert(alertInfo: Omit<ResilienceAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): void {
    const alert: ResilienceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      ...alertInfo,
    };
    
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    
    // Keep alert history manageable
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }
    
    this.notifyAlertHandlers(alert);
  }

  // Generate alert ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Notify handlers
  private notifyStatusHandlers(): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(this.currentStatus);
      } catch (error) {
        console.error('Status handler error:', error);
      }
    });
  }

  private notifyAlertHandlers(alert: ResilienceAlert): void {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    });
  }

  // Public API
  onStatus(handler: ResilienceStatusHandler): void {
    this.statusHandlers.push(handler);
  }

  offStatus(handler: ResilienceStatusHandler): void {
    const index = this.statusHandlers.indexOf(handler);
    if (index > -1) {
      this.statusHandlers.splice(index, 1);
    }
  }

  onAlert(handler: ResilienceAlertHandler): void {
    this.alertHandlers.push(handler);
  }

  offAlert(handler: ResilienceAlertHandler): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  // Get current status
  getCurrentStatus(): ResilienceStatus {
    return { ...this.currentStatus };
  }

  // Get status history
  getStatusHistory(): ResilienceStatus[] {
    return [...this.statusHistory];
  }

  // Get active alerts
  getActiveAlerts(): ResilienceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  // Get alert history
  getAlertHistory(): ResilienceAlert[] {
    return [...this.alertHistory];
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.acknowledged = true;
      this.activeAlerts.delete(alertId);
      return true;
    }
    return false;
  }

  // Update configuration
  updateConfig(config: Partial<ResilienceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Get configuration
  getConfig(): ResilienceConfig {
    return { ...this.config };
  }

  // Force status update
  forceUpdate(): void {
    this.updateStatus();
  }

  // Get component details
  getComponentDetails(componentName: string): ComponentStatus | null {
    return this.currentStatus.components.find(comp => comp.name === componentName) || null;
  }

  // Get system health summary
  getHealthSummary(): {
    status: string;
    score: number;
    criticalIssues: number;
    activeRecoveries: number;
    uptime: number;
    lastIncident: string | null;
  } {
    const criticalAlerts = this.getActiveAlerts().filter(alert => alert.severity === 'critical');
    const activeSessions = recoveryCoordinator.getActiveSessions();
    
    const uptimeStart = Math.min(...Array.from(this.componentStartTimes.values()));
    const uptime = Date.now() - uptimeStart;
    
    const recentErrors = errorHandler.getErrorReports()
      .filter(error => error.severity === 'critical')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return {
      status: this.currentStatus.overall,
      score: this.currentStatus.score,
      criticalIssues: criticalAlerts.length,
      activeRecoveries: activeSessions.length,
      uptime,
      lastIncident: recentErrors.length > 0 ? recentErrors[0].timestamp : null,
    };
  }
}

// Export service instance
export const resilienceMonitor = new ResilienceMonitorService();

// Export service class for custom instances
export { ResilienceMonitorService };