import { websocketClient } from './websocket';
import { frameHandler } from './frameHandler';
import { frameSynchronizer } from './frameSynchronizer';
import { performanceMonitor } from './performanceMonitor';
import { healthCheck } from './healthCheck';

export interface ErrorReport {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  timestamp: string;
  component: string;
  context: Record<string, unknown>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
  recovered: boolean;
  recoveryAction?: string;
  occurrences: number;
}

export type ErrorType = 
  | 'connection_error'
  | 'frame_processing_error'
  | 'synchronization_error'
  | 'performance_error'
  | 'validation_error'
  | 'timeout_error'
  | 'memory_error'
  | 'network_error'
  | 'parsing_error'
  | 'critical_system_error';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RecoveryAction {
  type: string;
  description: string;
  execute: () => Promise<boolean>;
  cooldown: number;
  maxAttempts: number;
}

export interface ErrorHandlerConfig {
  maxErrorReports: number;
  enableAutomaticRecovery: boolean;
  retryIntervals: number[];
  circuitBreakerThreshold: number;
  reportingEndpoint?: string;
  enableErrorReporting: boolean;
  performanceThresholds: {
    errorRate: number;
    recoveryTime: number;
  };
}

export type ErrorHandler = (error: ErrorReport) => void;
export type RecoveryHandler = (success: boolean, action: string) => void;

class ErrorHandlerService {
  private config: ErrorHandlerConfig;
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorHandlers: ErrorHandler[] = [];
  private recoveryHandlers: RecoveryHandler[] = [];
  private circuitBreakerStates: Map<string, CircuitBreakerState> = new Map();
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private lastRecoveryAttempts: Map<string, number> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      maxErrorReports: 1000,
      enableAutomaticRecovery: true,
      retryIntervals: [1000, 3000, 10000, 30000],
      circuitBreakerThreshold: 5,
      enableErrorReporting: true,
      performanceThresholds: {
        errorRate: 0.1, // 10% error rate threshold
        recoveryTime: 30000, // 30 seconds recovery time threshold
      },
      ...config,
    };

    this.initializeRecoveryActions();
    this.setupServiceErrorHandling();
  }

  // Initialize recovery actions
  private initializeRecoveryActions(): void {
    this.recoveryActions.set('websocket_reconnect', {
      type: 'websocket_reconnect',
      description: 'Reconnect WebSocket connection',
      execute: async () => {
        try {
          await websocketClient.connect();
          return true;
        } catch (error) {
          console.error('WebSocket reconnection failed:', error);
          return false;
        }
      },
      cooldown: 5000,
      maxAttempts: 3,
    });

    this.recoveryActions.set('frame_handler_reset', {
      type: 'frame_handler_reset',
      description: 'Reset frame handler and cleanup resources',
      execute: async () => {
        try {
          frameHandler.cleanup();
          return true;
        } catch (error) {
          console.error('Frame handler reset failed:', error);
          return false;
        }
      },
      cooldown: 3000,
      maxAttempts: 2,
    });

    this.recoveryActions.set('synchronizer_reset', {
      type: 'synchronizer_reset',
      description: 'Reset frame synchronizer',
      execute: async () => {
        try {
          frameSynchronizer.stop();
          frameSynchronizer.reset();
          frameSynchronizer.start();
          return true;
        } catch (error) {
          console.error('Synchronizer reset failed:', error);
          return false;
        }
      },
      cooldown: 2000,
      maxAttempts: 3,
    });

    this.recoveryActions.set('performance_monitor_reset', {
      type: 'performance_monitor_reset',
      description: 'Reset performance monitoring',
      execute: async () => {
        try {
          performanceMonitor.stop();
          performanceMonitor.reset();
          performanceMonitor.start();
          return true;
        } catch (error) {
          console.error('Performance monitor reset failed:', error);
          return false;
        }
      },
      cooldown: 1000,
      maxAttempts: 2,
    });

    this.recoveryActions.set('health_check_restart', {
      type: 'health_check_restart',
      description: 'Restart health check monitoring',
      execute: async () => {
        try {
          healthCheck.stop();
          healthCheck.reset();
          healthCheck.start();
          return true;
        } catch (error) {
          console.error('Health check restart failed:', error);
          return false;
        }
      },
      cooldown: 5000,
      maxAttempts: 2,
    });

    this.recoveryActions.set('memory_cleanup', {
      type: 'memory_cleanup',
      description: 'Force garbage collection and cleanup',
      execute: async () => {
        try {
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
          
          // Cleanup frame handler resources
          frameHandler.cleanup();
          
          // Reset performance monitor
          performanceMonitor.reset();
          
          return true;
        } catch (error) {
          console.error('Memory cleanup failed:', error);
          return false;
        }
      },
      cooldown: 10000,
      maxAttempts: 1,
    });

    this.recoveryActions.set('full_system_restart', {
      type: 'full_system_restart',
      description: 'Restart entire real-time system',
      execute: async () => {
        try {
          // Stop all services
          performanceMonitor.stop();
          frameSynchronizer.stop();
          healthCheck.stop();
          websocketClient.disconnect();
          
          // Cleanup resources
          frameHandler.cleanup();
          performanceMonitor.reset();
          frameSynchronizer.reset();
          healthCheck.reset();
          
          // Wait for cleanup
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Restart services
          await websocketClient.connect();
          healthCheck.start();
          frameSynchronizer.start();
          performanceMonitor.start();
          
          return true;
        } catch (error) {
          console.error('Full system restart failed:', error);
          return false;
        }
      },
      cooldown: 60000,
      maxAttempts: 1,
    });
  }

  // Setup error handling for all services
  private setupServiceErrorHandling(): void {
    // WebSocket error handling
    websocketClient.onError((error) => {
      this.handleError({
        type: 'connection_error',
        severity: 'high',
        message: error.message,
        component: 'websocket',
        context: { 
          status: websocketClient.getStatus(),
          quality: websocketClient.getConnectionQuality(),
        },
        stackTrace: error.stack,
      });
    });

    // Frame handler error handling
    frameHandler.onError((error, frameIndex) => {
      this.handleError({
        type: 'frame_processing_error',
        severity: 'medium',
        message: error.message,
        component: 'frame_handler',
        context: {
          frameIndex,
          statistics: frameHandler.getStatistics(),
        },
        stackTrace: error.stack,
      });
    });

    // Frame synchronizer error handling
    frameSynchronizer.onError((error) => {
      this.handleError({
        type: 'synchronization_error',
        severity: 'medium',
        message: error.message,
        component: 'frame_synchronizer',
        context: {
          statistics: frameSynchronizer.getStatistics(),
          syncQuality: frameSynchronizer.getSyncQuality(),
        },
        stackTrace: error.stack,
      });
    });

    // Performance monitor alerts
    performanceMonitor.onAlert((alert) => {
      if (alert.severity === 'critical') {
        this.handleError({
          type: 'performance_error',
          severity: 'critical',
          message: alert.message,
          component: 'performance_monitor',
          context: {
            alertType: alert.type,
            value: alert.value,
            threshold: alert.threshold,
            cameraId: alert.cameraId,
          },
        });
      }
    });

    // Health check error handling
    healthCheck.onHealthChange((service, oldStatus, newStatus) => {
      if (newStatus === 'down') {
        this.handleError({
          type: 'network_error',
          severity: 'high',
          message: `Service ${service} is down`,
          component: 'health_check',
          context: {
            service,
            oldStatus,
            newStatus,
            currentHealth: healthCheck.getCurrentHealth(),
          },
        });
      }
    });

    // Global error handling
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'critical_system_error',
        severity: 'critical',
        message: event.message,
        component: 'global',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        stackTrace: event.error?.stack,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'critical_system_error',
        severity: 'high',
        message: event.reason?.message || 'Unhandled promise rejection',
        component: 'global',
        context: {
          reason: event.reason,
        },
        stackTrace: event.reason?.stack,
      });
    });
  }

  // Handle error with recovery
  handleError(errorInfo: Omit<ErrorReport, 'id' | 'timestamp' | 'recovered' | 'recoveryAction' | 'occurrences' | 'userAgent' | 'url'>): void {
    const errorId = this.generateErrorId(errorInfo);
    const timestamp = new Date().toISOString();
    
    // Check if this error already exists
    const existingError = this.errorReports.get(errorId);
    if (existingError) {
      existingError.occurrences++;
      existingError.timestamp = timestamp;
    } else {
      const errorReport: ErrorReport = {
        id: errorId,
        timestamp,
        recovered: false,
        occurrences: 1,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...errorInfo,
      };
      
      this.errorReports.set(errorId, errorReport);
      
      // Manage error report limit
      if (this.errorReports.size > this.config.maxErrorReports) {
        const oldestKey = this.errorReports.keys().next().value;
        this.errorReports.delete(oldestKey);
      }
    }
    
    const currentError = this.errorReports.get(errorId)!;
    
    // Check circuit breaker
    if (this.shouldTriggerCircuitBreaker(currentError)) {
      this.triggerCircuitBreaker(currentError);
    }
    
    // Attempt recovery if enabled
    if (this.config.enableAutomaticRecovery && !currentError.recovered) {
      this.attemptRecovery(currentError);
    }
    
    // Notify error handlers
    this.notifyErrorHandlers(currentError);
    
    // Report error if enabled
    if (this.config.enableErrorReporting) {
      this.reportError(currentError);
    }
  }

  // Generate unique error ID
  private generateErrorId(errorInfo: Omit<ErrorReport, 'id' | 'timestamp' | 'recovered' | 'recoveryAction' | 'occurrences' | 'userAgent' | 'url'>): string {
    const hash = this.simpleHash(
      errorInfo.type + 
      errorInfo.component + 
      errorInfo.message.substring(0, 100)
    );
    return `${errorInfo.type}_${errorInfo.component}_${hash}`;
  }

  // Simple hash function
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Check if circuit breaker should trigger
  private shouldTriggerCircuitBreaker(error: ErrorReport): boolean {
    const breakerState = this.circuitBreakerStates.get(error.component);
    if (!breakerState) {
      this.circuitBreakerStates.set(error.component, {
        state: 'closed',
        failureCount: 1,
        lastFailureTime: Date.now(),
      });
      return false;
    }

    breakerState.failureCount++;
    breakerState.lastFailureTime = Date.now();
    
    return breakerState.failureCount >= this.config.circuitBreakerThreshold;
  }

  // Trigger circuit breaker
  private triggerCircuitBreaker(error: ErrorReport): void {
    const breakerState = this.circuitBreakerStates.get(error.component);
    if (breakerState) {
      breakerState.state = 'open';
      
      // Set timeout to half-open state
      setTimeout(() => {
        if (breakerState.state === 'open') {
          breakerState.state = 'half-open';
        }
      }, 60000); // 1 minute timeout
    }
  }

  // Attempt error recovery
  private async attemptRecovery(error: ErrorReport): Promise<void> {
    const recoveryAction = this.selectRecoveryAction(error);
    if (!recoveryAction) {
      return;
    }

    const lastAttempt = this.lastRecoveryAttempts.get(recoveryAction.type) || 0;
    const now = Date.now();
    
    // Check cooldown
    if (now - lastAttempt < recoveryAction.cooldown) {
      return;
    }

    // Check max attempts
    const attemptCount = this.getAttemptCount(recoveryAction.type);
    if (attemptCount >= recoveryAction.maxAttempts) {
      return;
    }

    this.lastRecoveryAttempts.set(recoveryAction.type, now);
    
    try {
      const success = await recoveryAction.execute();
      
      if (success) {
        error.recovered = true;
        error.recoveryAction = recoveryAction.type;
        
        // Reset circuit breaker on successful recovery
        const breakerState = this.circuitBreakerStates.get(error.component);
        if (breakerState) {
          breakerState.state = 'closed';
          breakerState.failureCount = 0;
        }
      }
      
      this.notifyRecoveryHandlers(success, recoveryAction.type);
      
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      this.notifyRecoveryHandlers(false, recoveryAction.type);
    }
  }

  // Select appropriate recovery action
  private selectRecoveryAction(error: ErrorReport): RecoveryAction | null {
    switch (error.type) {
      case 'connection_error':
        return this.recoveryActions.get('websocket_reconnect') || null;
      
      case 'frame_processing_error':
        return this.recoveryActions.get('frame_handler_reset') || null;
      
      case 'synchronization_error':
        return this.recoveryActions.get('synchronizer_reset') || null;
      
      case 'performance_error':
        if (error.severity === 'critical') {
          return this.recoveryActions.get('memory_cleanup') || null;
        }
        return this.recoveryActions.get('performance_monitor_reset') || null;
      
      case 'network_error':
        return this.recoveryActions.get('health_check_restart') || null;
      
      case 'critical_system_error':
        return this.recoveryActions.get('full_system_restart') || null;
      
      default:
        return null;
    }
  }

  // Get attempt count for recovery action
  private getAttemptCount(actionType: string): number {
    return Array.from(this.errorReports.values())
      .filter(error => error.recoveryAction === actionType)
      .length;
  }

  // Notify error handlers
  private notifyErrorHandlers(error: ErrorReport): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in error handler:', e);
      }
    });
  }

  // Notify recovery handlers
  private notifyRecoveryHandlers(success: boolean, action: string): void {
    this.recoveryHandlers.forEach(handler => {
      try {
        handler(success, action);
      } catch (e) {
        console.error('Error in recovery handler:', e);
      }
    });
  }

  // Report error to external service
  private async reportError(error: ErrorReport): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return;
    }

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...error,
          sessionId: this.getSessionId(),
          buildVersion: this.getBuildVersion(),
        }),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  // Get session ID
  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }

  // Get build version
  private getBuildVersion(): string {
    return process.env.REACT_APP_VERSION || 'unknown';
  }

  // Public API
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: ErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  onRecovery(handler: RecoveryHandler): void {
    this.recoveryHandlers.push(handler);
  }

  offRecovery(handler: RecoveryHandler): void {
    const index = this.recoveryHandlers.indexOf(handler);
    if (index > -1) {
      this.recoveryHandlers.splice(index, 1);
    }
  }

  // Get error reports
  getErrorReports(): ErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  // Get error statistics
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoveryRate: number;
    averageRecoveryTime: number;
  } {
    const reports = this.getErrorReports();
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let recoveredCount = 0;
    let totalRecoveryTime = 0;

    reports.forEach(report => {
      errorsByType[report.type] = (errorsByType[report.type] || 0) + 1;
      errorsBySeverity[report.severity] = (errorsBySeverity[report.severity] || 0) + 1;
      
      if (report.recovered) {
        recoveredCount++;
        // Calculate recovery time if possible
        // This is a simplified calculation
        totalRecoveryTime += 5000; // Assume 5 seconds average recovery time
      }
    });

    return {
      totalErrors: reports.length,
      errorsByType,
      errorsBySeverity,
      recoveryRate: reports.length > 0 ? recoveredCount / reports.length : 0,
      averageRecoveryTime: recoveredCount > 0 ? totalRecoveryTime / recoveredCount : 0,
    };
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    this.circuitBreakerStates.forEach((state, component) => {
      status[component] = { ...state };
    });
    return status;
  }

  // Clear error reports
  clearErrorReports(): void {
    this.errorReports.clear();
  }

  // Update configuration
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get configuration
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  // Manual recovery trigger
  async triggerRecovery(actionType: string): Promise<boolean> {
    const action = this.recoveryActions.get(actionType);
    if (!action) {
      return false;
    }

    try {
      const success = await action.execute();
      this.notifyRecoveryHandlers(success, actionType);
      return success;
    } catch (error) {
      console.error('Manual recovery failed:', error);
      this.notifyRecoveryHandlers(false, actionType);
      return false;
    }
  }

  // Get health status
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    activeErrors: number;
    criticalErrors: number;
  } {
    const reports = this.getErrorReports();
    const recent = reports.filter(r => 
      Date.now() - new Date(r.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    const criticalErrors = recent.filter(r => r.severity === 'critical').length;
    const activeErrors = recent.filter(r => !r.recovered).length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (criticalErrors > 0) {
      overall = 'unhealthy';
    } else if (activeErrors > 5) {
      overall = 'degraded';
    }

    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};
    const componentErrors = new Map<string, number>();
    
    recent.forEach(report => {
      const count = componentErrors.get(report.component) || 0;
      componentErrors.set(report.component, count + 1);
    });
    
    componentErrors.forEach((count, component) => {
      if (count >= 3) {
        components[component] = 'unhealthy';
      } else if (count >= 1) {
        components[component] = 'degraded';
      } else {
        components[component] = 'healthy';
      }
    });

    return {
      overall,
      components,
      activeErrors,
      criticalErrors,
    };
  }
}

// Circuit breaker state interface
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
}

// Export service instance
export const errorHandler = new ErrorHandlerService();

// Export service class for custom instances
export { ErrorHandlerService };