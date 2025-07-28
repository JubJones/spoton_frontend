import { useEffect, useState, useCallback, useRef } from 'react';
import { statusHandler, PerformanceMetrics, SystemAlert } from '../services/statusHandler';
import { healthCheck, HealthCheckResult } from '../services/healthCheck';
import { websocketClient } from '../services/websocket';

export interface PerformanceThresholds {
  fpsWarning: number;
  fpsError: number;
  latencyWarning: number;
  latencyError: number;
  memoryWarning: number;
  memoryError: number;
  frameDropsWarning: number;
  frameDropsError: number;
}

export interface PerformanceMonitorConfig {
  enableAlerts: boolean;
  alertThresholds: PerformanceThresholds;
  historyLength: number;
  updateInterval: number;
}

export interface PerformanceMonitorReturn {
  currentMetrics: PerformanceMetrics;
  performanceHistory: PerformanceMetrics[];
  healthStatus: HealthCheckResult | null;
  alerts: SystemAlert[];
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  isHealthy: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  clearHistory: () => void;
  exportMetrics: () => string;
}

const defaultConfig: PerformanceMonitorConfig = {
  enableAlerts: true,
  alertThresholds: {
    fpsWarning: 20,
    fpsError: 10,
    latencyWarning: 200,
    latencyError: 500,
    memoryWarning: 80,
    memoryError: 90,
    frameDropsWarning: 5,
    frameDropsError: 10,
  },
  historyLength: 100,
  updateInterval: 1000,
};

export const usePerformanceMonitor = (
  config: Partial<PerformanceMonitorConfig> = {}
): PerformanceMonitorReturn => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    latency: 0,
    frameDrops: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    gpuUsage: 0,
    networkBandwidth: 0,
    timestamp: new Date().toISOString(),
  });

  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'critical'>('excellent');
  const [isMonitoring, setIsMonitoring] = useState(false);

  const monitoringInterval = useRef<number | null>(null);
  const metricsHandlerRef = useRef<((metrics: PerformanceMetrics) => void) | null>(null);
  const alertHandlerRef = useRef<((alert: SystemAlert) => void) | null>(null);
  const healthHandlerRef = useRef<((result: HealthCheckResult) => void) | null>(null);

  // Initialize handlers
  useEffect(() => {
    // Performance metrics handler
    metricsHandlerRef.current = (metrics: PerformanceMetrics) => {
      setCurrentMetrics(metrics);
      
      // Add to history
      setPerformanceHistory(prev => {
        const newHistory = [...prev, metrics];
        if (newHistory.length > finalConfig.historyLength) {
          newHistory.shift();
        }
        return newHistory;
      });

      // Check thresholds and generate alerts if needed
      if (finalConfig.enableAlerts) {
        checkPerformanceThresholds(metrics);
      }
    };

    // Alert handler
    alertHandlerRef.current = (alert: SystemAlert) => {
      setAlerts(prev => {
        const existing = prev.find(a => a.id === alert.id);
        if (existing) {
          return prev.map(a => a.id === alert.id ? alert : a);
        }
        return [...prev, alert];
      });
    };

    // Health check handler
    healthHandlerRef.current = (result: HealthCheckResult) => {
      setHealthStatus(result);
    };

    // Register handlers
    statusHandler.onPerformanceMetrics(metricsHandlerRef.current);
    statusHandler.onAlert(alertHandlerRef.current);
    healthCheck.onHealthCheck(healthHandlerRef.current);

    return () => {
      // Cleanup handlers
      if (metricsHandlerRef.current) {
        statusHandler.offPerformanceMetrics(metricsHandlerRef.current);
      }
      if (alertHandlerRef.current) {
        statusHandler.offAlert(alertHandlerRef.current);
      }
      if (healthHandlerRef.current) {
        healthCheck.offHealthCheck(healthHandlerRef.current);
      }
    };
  }, [finalConfig]);

  // Check performance thresholds
  const checkPerformanceThresholds = useCallback((metrics: PerformanceMetrics) => {
    const { alertThresholds } = finalConfig;
    const now = new Date().toISOString();

    // Create alert objects and add to local state
    const alerts: SystemAlert[] = [];

    // Check FPS
    if (metrics.fps <= alertThresholds.fpsError) {
      alerts.push({
        id: 'performance-fps-error',
        type: 'error',
        message: `FPS critically low: ${metrics.fps}`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    } else if (metrics.fps <= alertThresholds.fpsWarning) {
      alerts.push({
        id: 'performance-fps-warning',
        type: 'warning',
        message: `FPS low: ${metrics.fps}`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    }

    // Check latency
    if (metrics.latency >= alertThresholds.latencyError) {
      alerts.push({
        id: 'performance-latency-error',
        type: 'error',
        message: `High latency: ${metrics.latency}ms`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    } else if (metrics.latency >= alertThresholds.latencyWarning) {
      alerts.push({
        id: 'performance-latency-warning',
        type: 'warning',
        message: `Latency elevated: ${metrics.latency}ms`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    }

    // Check memory usage
    if (metrics.memoryUsage >= alertThresholds.memoryError) {
      alerts.push({
        id: 'performance-memory-error',
        type: 'critical',
        message: `Memory usage critical: ${metrics.memoryUsage}%`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    } else if (metrics.memoryUsage >= alertThresholds.memoryWarning) {
      alerts.push({
        id: 'performance-memory-warning',
        type: 'warning',
        message: `Memory usage high: ${metrics.memoryUsage}%`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    }

    // Check frame drops
    if (metrics.frameDrops >= alertThresholds.frameDropsError) {
      alerts.push({
        id: 'performance-framedrops-error',
        type: 'error',
        message: `High frame drops: ${metrics.frameDrops}`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    } else if (metrics.frameDrops >= alertThresholds.frameDropsWarning) {
      alerts.push({
        id: 'performance-framedrops-warning',
        type: 'warning',
        message: `Frame drops detected: ${metrics.frameDrops}`,
        timestamp: now,
        source: 'Performance Monitor',
        resolved: false,
      });
    }

    // Add alerts to state
    alerts.forEach(alert => {
      if (alertHandlerRef.current) {
        alertHandlerRef.current(alert);
      }
    });
  }, [finalConfig]);

  // Update connection quality
  useEffect(() => {
    const updateConnectionQuality = () => {
      const quality = websocketClient.getConnectionQuality();
      setConnectionQuality(quality);
    };

    const interval = setInterval(updateConnectionQuality, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    healthCheck.start();

    // Start periodic updates
    monitoringInterval.current = window.setInterval(() => {
      // Force update of current metrics
      const systemStatus = statusHandler.getCurrentStatus();
      if (systemStatus) {
        const metrics: PerformanceMetrics = {
          fps: systemStatus.processingFps,
          latency: statusHandler.getConnectionMetrics().latency,
          frameDrops: 0, // This would come from frame handler
          memoryUsage: systemStatus.memoryUsage,
          cpuUsage: 0, // This would come from system monitoring
          gpuUsage: systemStatus.gpuUtilization,
          networkBandwidth: statusHandler.getConnectionMetrics().bandwidth,
          timestamp: new Date().toISOString(),
        };

        if (metricsHandlerRef.current) {
          metricsHandlerRef.current(metrics);
        }
      }
    }, finalConfig.updateInterval);
  }, [isMonitoring, finalConfig.updateInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    healthCheck.stop();

    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
  }, [isMonitoring]);

  // Clear history
  const clearHistory = useCallback(() => {
    setPerformanceHistory([]);
    setAlerts([]);
  }, []);

  // Export metrics
  const exportMetrics = useCallback(() => {
    const data = {
      currentMetrics,
      performanceHistory,
      healthStatus,
      alerts,
      connectionQuality,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }, [currentMetrics, performanceHistory, healthStatus, alerts, connectionQuality]);

  // Calculate if system is healthy
  const isHealthy = healthStatus?.overall === 'healthy' && 
                   connectionQuality !== 'critical' &&
                   alerts.filter(a => !a.resolved && (a.type === 'error' || a.type === 'critical')).length === 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
    };
  }, []);

  return {
    currentMetrics,
    performanceHistory,
    healthStatus,
    alerts,
    connectionQuality,
    isHealthy,
    startMonitoring,
    stopMonitoring,
    clearHistory,
    exportMetrics,
  };
};