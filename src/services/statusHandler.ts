import { WebSocketMessage, SystemStatusMessage } from './websocket';

export interface SystemStatusData {
  camerasActive: number;
  processingFps: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  memoryUsage: number;
  gpuUtilization: number;
  lastUpdated: string;
  services: ServiceStatus[];
  alerts: SystemAlert[];
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number;
  lastCheck: string;
  responseTime: number;
  errorCount: number;
  details?: Record<string, unknown>;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  source: string;
  resolved: boolean;
  details?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  fps: number;
  latency: number;
  frameDrops: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage: number;
  networkBandwidth: number;
  timestamp: string;
}

export interface ConnectionMetrics {
  quality: 'excellent' | 'good' | 'poor' | 'critical';
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  reconnections: number;
  lastReconnect?: string;
}

export type SystemStatusHandler = (status: SystemStatusData) => void;
export type ServiceStatusHandler = (service: ServiceStatus) => void;
export type AlertHandler = (alert: SystemAlert) => void;
export type PerformanceMetricsHandler = (metrics: PerformanceMetrics) => void;
export type StatusErrorHandler = (error: Error) => void;

class SystemStatusHandlerService {
  private statusHandlers: SystemStatusHandler[] = [];
  private serviceHandlers: ServiceStatusHandler[] = [];
  private alertHandlers: AlertHandler[] = [];
  private metricsHandlers: PerformanceMetricsHandler[] = [];
  private errorHandlers: StatusErrorHandler[] = [];

  private currentStatus: SystemStatusData = this.initializeStatus();
  private performanceHistory: PerformanceMetrics[] = [];
  private connectionMetrics: ConnectionMetrics = this.initializeConnectionMetrics();
  private alerts: Map<string, SystemAlert> = new Map();
  
  private readonly maxPerformanceHistory = 100;
  private readonly maxAlerts = 50;
  private readonly alertRetentionTime = 24 * 60 * 60 * 1000; // 24 hours

  // Process WebSocket system status message
  async processSystemStatusMessage(message: WebSocketMessage): Promise<void> {
    if (message.type !== 'system_status') {
      return;
    }

    try {
      const statusMessage = message as SystemStatusMessage;
      const statusData = this.processSystemStatusData(statusMessage.data);
      
      // Update current status
      this.updateCurrentStatus(statusData);
      
      // Update performance metrics
      this.updatePerformanceMetrics(statusData);
      
      // Check for alerts
      this.checkForAlerts(statusData);
      
      // Notify handlers
      this.notifyStatusHandlers(statusData);
      
    } catch (error) {
      this.handleStatusError(error as Error);
    }
  }

  // Process system status data from WebSocket message
  private processSystemStatusData(data: SystemStatusMessage['data']): SystemStatusData {
    const services: ServiceStatus[] = [
      {
        name: 'Detection Service',
        status: data.processing_fps > 0 ? 'healthy' : 'degraded',
        uptime: 0, // This would come from actual service data
        lastCheck: data.last_updated,
        responseTime: 0,
        errorCount: 0,
      },
      {
        name: 'Tracking Service',
        status: data.cameras_active > 0 ? 'healthy' : 'unhealthy',
        uptime: 0,
        lastCheck: data.last_updated,
        responseTime: 0,
        errorCount: 0,
      },
      {
        name: 'WebSocket Service',
        status: 'healthy', // We're receiving messages, so it's healthy
        uptime: 0,
        lastCheck: data.last_updated,
        responseTime: 0,
        errorCount: 0,
      },
    ];

    return {
      camerasActive: data.cameras_active,
      processingFps: data.processing_fps,
      connectionQuality: data.connection_quality,
      memoryUsage: data.memory_usage,
      gpuUtilization: data.gpu_utilization,
      lastUpdated: data.last_updated,
      services,
      alerts: Array.from(this.alerts.values()),
    };
  }

  // Update current status
  private updateCurrentStatus(statusData: SystemStatusData): void {
    this.currentStatus = statusData;
    
    // Update connection metrics
    this.updateConnectionMetrics(statusData);
    
    // Notify service handlers
    statusData.services.forEach(service => {
      this.notifyServiceHandlers(service);
    });
  }

  // Update performance metrics
  private updatePerformanceMetrics(statusData: SystemStatusData): void {
    const metrics: PerformanceMetrics = {
      fps: statusData.processingFps,
      latency: this.connectionMetrics.latency,
      frameDrops: 0, // This would come from frame handler
      memoryUsage: statusData.memoryUsage,
      cpuUsage: 0, // This would come from system monitoring
      gpuUsage: statusData.gpuUtilization,
      networkBandwidth: this.connectionMetrics.bandwidth,
      timestamp: statusData.lastUpdated,
    };

    // Add to history
    this.performanceHistory.push(metrics);
    
    // Limit history size
    if (this.performanceHistory.length > this.maxPerformanceHistory) {
      this.performanceHistory.shift();
    }
    
    // Notify metrics handlers
    this.notifyMetricsHandlers(metrics);
  }

  // Update connection metrics
  private updateConnectionMetrics(statusData: SystemStatusData): void {
    const now = Date.now();
    
    // Calculate latency based on message timestamp
    const messageTime = new Date(statusData.lastUpdated).getTime();
    const latency = now - messageTime;
    
    // Update connection quality based on various factors
    let quality: ConnectionMetrics['quality'] = 'excellent';
    
    if (latency > 1000 || statusData.processingFps < 10) {
      quality = 'critical';
    } else if (latency > 500 || statusData.processingFps < 20) {
      quality = 'poor';
    } else if (latency > 200 || statusData.processingFps < 25) {
      quality = 'good';
    }
    
    this.connectionMetrics = {
      ...this.connectionMetrics,
      quality,
      latency,
      // Other metrics would be updated from actual network measurements
    };
  }

  // Check for alerts
  private checkForAlerts(statusData: SystemStatusData): void {
    const now = new Date().toISOString();
    
    // Check for high memory usage
    if (statusData.memoryUsage > 90) {
      this.createAlert('high-memory', 'critical', 'High memory usage detected', 'System Monitor', now);
    } else if (statusData.memoryUsage > 80) {
      this.createAlert('high-memory', 'warning', 'Memory usage is high', 'System Monitor', now);
    } else {
      this.resolveAlert('high-memory');
    }
    
    // Check for low FPS
    if (statusData.processingFps < 10) {
      this.createAlert('low-fps', 'error', 'Processing FPS is critically low', 'Performance Monitor', now);
    } else if (statusData.processingFps < 20) {
      this.createAlert('low-fps', 'warning', 'Processing FPS is low', 'Performance Monitor', now);
    } else {
      this.resolveAlert('low-fps');
    }
    
    // Check for camera issues
    if (statusData.camerasActive === 0) {
      this.createAlert('no-cameras', 'critical', 'No cameras are active', 'Camera Monitor', now);
    } else if (statusData.camerasActive < 4) {
      this.createAlert('some-cameras-down', 'warning', 'Some cameras are inactive', 'Camera Monitor', now);
    } else {
      this.resolveAlert('no-cameras');
      this.resolveAlert('some-cameras-down');
    }
    
    // Check for poor connection quality
    if (statusData.connectionQuality === 'critical') {
      this.createAlert('poor-connection', 'error', 'Connection quality is critical', 'Network Monitor', now);
    } else if (statusData.connectionQuality === 'poor') {
      this.createAlert('poor-connection', 'warning', 'Connection quality is poor', 'Network Monitor', now);
    } else {
      this.resolveAlert('poor-connection');
    }
    
    // Clean up old alerts
    this.cleanupOldAlerts();
  }

  // Create or update alert
  private createAlert(id: string, type: SystemAlert['type'], message: string, source: string, timestamp: string): void {
    const existingAlert = this.alerts.get(id);
    
    if (existingAlert && !existingAlert.resolved) {
      // Update existing alert
      existingAlert.message = message;
      existingAlert.type = type;
      existingAlert.timestamp = timestamp;
    } else {
      // Create new alert
      const alert: SystemAlert = {
        id,
        type,
        message,
        timestamp,
        source,
        resolved: false,
      };
      
      this.alerts.set(id, alert);
      this.notifyAlertHandlers(alert);
    }
  }

  // Resolve alert
  private resolveAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.timestamp = new Date().toISOString();
      this.notifyAlertHandlers(alert);
    }
  }

  // Clean up old alerts
  private cleanupOldAlerts(): void {
    const now = Date.now();
    const alertsToRemove: string[] = [];
    
    this.alerts.forEach((alert, id) => {
      const alertTime = new Date(alert.timestamp).getTime();
      if (alert.resolved && now - alertTime > this.alertRetentionTime) {
        alertsToRemove.push(id);
      }
    });
    
    alertsToRemove.forEach(id => {
      this.alerts.delete(id);
    });
    
    // Also limit total alerts
    if (this.alerts.size > this.maxAlerts) {
      const sortedAlerts = Array.from(this.alerts.entries())
        .sort(([, a], [, b]) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const alertsToRemove = sortedAlerts.slice(0, this.alerts.size - this.maxAlerts);
      alertsToRemove.forEach(([id]) => {
        this.alerts.delete(id);
      });
    }
  }

  // Initialize status
  private initializeStatus(): SystemStatusData {
    return {
      camerasActive: 0,
      processingFps: 0,
      connectionQuality: 'excellent',
      memoryUsage: 0,
      gpuUtilization: 0,
      lastUpdated: new Date().toISOString(),
      services: [],
      alerts: [],
    };
  }

  // Initialize connection metrics
  private initializeConnectionMetrics(): ConnectionMetrics {
    return {
      quality: 'excellent',
      latency: 0,
      jitter: 0,
      packetLoss: 0,
      bandwidth: 0,
      reconnections: 0,
    };
  }

  // Notify handlers
  private notifyStatusHandlers(status: SystemStatusData): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in status handler:', error);
      }
    });
  }

  private notifyServiceHandlers(service: ServiceStatus): void {
    this.serviceHandlers.forEach(handler => {
      try {
        handler(service);
      } catch (error) {
        console.error('Error in service handler:', error);
      }
    });
  }

  private notifyAlertHandlers(alert: SystemAlert): void {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Error in alert handler:', error);
      }
    });
  }

  private notifyMetricsHandlers(metrics: PerformanceMetrics): void {
    this.metricsHandlers.forEach(handler => {
      try {
        handler(metrics);
      } catch (error) {
        console.error('Error in metrics handler:', error);
      }
    });
  }

  // Handle errors
  private handleStatusError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in status error handler:', e);
      }
    });
  }

  // Public API
  onSystemStatus(handler: SystemStatusHandler): void {
    this.statusHandlers.push(handler);
  }

  offSystemStatus(handler: SystemStatusHandler): void {
    const index = this.statusHandlers.indexOf(handler);
    if (index > -1) {
      this.statusHandlers.splice(index, 1);
    }
  }

  onServiceStatus(handler: ServiceStatusHandler): void {
    this.serviceHandlers.push(handler);
  }

  offServiceStatus(handler: ServiceStatusHandler): void {
    const index = this.serviceHandlers.indexOf(handler);
    if (index > -1) {
      this.serviceHandlers.splice(index, 1);
    }
  }

  onAlert(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
  }

  offAlert(handler: AlertHandler): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  onPerformanceMetrics(handler: PerformanceMetricsHandler): void {
    this.metricsHandlers.push(handler);
  }

  offPerformanceMetrics(handler: PerformanceMetricsHandler): void {
    const index = this.metricsHandlers.indexOf(handler);
    if (index > -1) {
      this.metricsHandlers.splice(index, 1);
    }
  }

  onError(handler: StatusErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: StatusErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  // Data access
  getCurrentStatus(): SystemStatusData {
    return { ...this.currentStatus };
  }

  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  getAlerts(): SystemAlert[] {
    return Array.from(this.alerts.values());
  }

  getUnresolvedAlerts(): SystemAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Alert management
  acknowledgeAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.details = { ...alert.details, acknowledged: true };
      this.notifyAlertHandlers(alert);
    }
  }

  dismissAlert(id: string): void {
    this.alerts.delete(id);
  }

  // Cleanup
  cleanup(): void {
    this.currentStatus = this.initializeStatus();
    this.performanceHistory.splice(0);
    this.connectionMetrics = this.initializeConnectionMetrics();
    this.alerts.clear();
  }
}

// Export service instance
export const statusHandler = new SystemStatusHandlerService();

// Export service class for custom instances
export { SystemStatusHandlerService };