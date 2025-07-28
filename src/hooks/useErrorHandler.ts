import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketClient } from '../services/websocket';
import { trackingHandler } from '../services/trackingHandler';
import { statusHandler } from '../services/statusHandler';
import { healthCheck } from '../services/healthCheck';

export interface ErrorInfo {
  id: string;
  type: 'connection' | 'frame' | 'tracking' | 'health' | 'system' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  source: string;
  resolved: boolean;
  retryCount?: number;
  lastRetry?: string;
}

export interface ErrorHandlerConfig {
  maxErrors: number;
  retryAttempts: number;
  retryDelay: number;
  autoRetry: boolean;
  logErrors: boolean;
  reportCriticalErrors: boolean;
}

export interface ErrorHandlerReturn {
  errors: ErrorInfo[];
  currentError: ErrorInfo | null;
  errorCount: number;
  criticalErrorCount: number;
  hasUnresolvedErrors: boolean;
  resolveError: (id: string) => void;
  retryError: (id: string) => Promise<boolean>;
  clearErrors: () => void;
  exportErrors: () => string;
}

const defaultConfig: ErrorHandlerConfig = {
  maxErrors: 100,
  retryAttempts: 3,
  retryDelay: 1000,
  autoRetry: true,
  logErrors: true,
  reportCriticalErrors: true,
};

export const useErrorHandler = (
  config: Partial<ErrorHandlerConfig> = {}
): ErrorHandlerReturn => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  
  const errorHandlers = useRef<Map<string, (error: Error, context?: any) => void>>(new Map());
  const retryTimers = useRef<Map<string, number>>(new Map());

  // Add error
  const addError = useCallback((
    type: ErrorInfo['type'],
    severity: ErrorInfo['severity'],
    message: string,
    source: string,
    details?: Record<string, unknown>
  ) => {
    const errorId = `${type}-${source}-${Date.now()}`;
    const error: ErrorInfo = {
      id: errorId,
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      source,
      resolved: false,
      retryCount: 0,
    };

    setErrors(prev => {
      const newErrors = [...prev, error];
      
      // Limit error history
      if (newErrors.length > finalConfig.maxErrors) {
        newErrors.shift();
      }
      
      return newErrors;
    });

    // Set as current error if critical
    if (severity === 'critical') {
      setCurrentError(error);
    }

    // Log error if enabled
    if (finalConfig.logErrors) {
      console.error(`[${severity.toUpperCase()}] ${source}: ${message}`, details);
    }

    // Auto-retry if enabled and retryable
    if (finalConfig.autoRetry && severity !== 'critical' && type !== 'system') {
      setTimeout(() => {
        retryError(errorId);
      }, finalConfig.retryDelay);
    }

    return errorId;
  }, [finalConfig]);

  // Initialize error handlers
  useEffect(() => {
    // WebSocket connection errors
    const handleWebSocketError = (error: Error) => {
      addError('connection', 'high', `WebSocket error: ${error.message}`, 'WebSocket', {
        error: error.message,
        stack: error.stack,
      });
    };

    // Frame processing errors
    const handleFrameError = (error: Error) => {
      addError('frame', 'medium', `Frame processing error: ${error.message}`, 'Frame Handler', {
        error: error.message,
        stack: error.stack,
      });
    };

    // Tracking errors
    const handleTrackingError = (error: Error, personId?: number) => {
      addError('tracking', 'medium', `Tracking error: ${error.message}`, 'Tracking Handler', {
        error: error.message,
        stack: error.stack,
        personId,
      });
    };

    // System status errors
    const handleStatusError = (error: Error) => {
      addError('system', 'high', `System error: ${error.message}`, 'Status Handler', {
        error: error.message,
        stack: error.stack,
      });
    };

    // Health check errors (implicit through health check results)
    const handleHealthError = (result: any) => {
      if (result.overall === 'unhealthy') {
        const failedServices = Object.entries(result.services)
          .filter(([_, service]: [string, any]) => service.status === 'down')
          .map(([name]) => name);

        if (failedServices.length > 0) {
          addError('health', 'critical', `Critical services down: ${failedServices.join(', ')}`, 'Health Check', {
            failedServices,
            result,
          });
        }
      } else if (result.overall === 'degraded') {
        addError('health', 'medium', 'System performance degraded', 'Health Check', {
          result,
        });
      }
    };

    // Register error handlers
    errorHandlers.current.set('websocket', handleWebSocketError);
    errorHandlers.current.set('frame', handleFrameError);
    errorHandlers.current.set('tracking', handleTrackingError);
    errorHandlers.current.set('status', handleStatusError);
    errorHandlers.current.set('health', handleHealthError);

    // Register with services
    trackingHandler.onError(handleTrackingError);
    statusHandler.onError(handleStatusError);
    healthCheck.onHealthCheck(handleHealthError);

    // Global error handler
    const handleGlobalError = (event: ErrorEvent) => {
      addError('system', 'high', `Global error: ${event.message}`, 'Global Handler', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.message,
        stack: event.error?.stack,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addError('system', 'high', `Unhandled promise rejection: ${event.reason}`, 'Promise Handler', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      // Cleanup
      trackingHandler.offError(handleTrackingError);
      statusHandler.offError(handleStatusError);
      healthCheck.offHealthCheck(handleHealthError);
      
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      
      // Clear retry timers
      retryTimers.current.forEach(timer => clearTimeout(timer));
      retryTimers.current.clear();
    };
  }, [addError]);

  // Resolve error
  const resolveError = useCallback((id: string) => {
    setErrors(prev => 
      prev.map(error => 
        error.id === id ? { ...error, resolved: true } : error
      )
    );

    // Clear current error if it's the one being resolved
    setCurrentError(prev => prev?.id === id ? null : prev);

    // Clear retry timer if exists
    const timer = retryTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      retryTimers.current.delete(id);
    }
  }, []);

  // Retry error
  const retryError = useCallback(async (id: string): Promise<boolean> => {
    const error = errors.find(e => e.id === id);
    if (!error || error.resolved) {
      return false;
    }

    if ((error.retryCount || 0) >= finalConfig.retryAttempts) {
      return false;
    }

    try {
      let success = false;

      // Attempt to resolve based on error type
      switch (error.type) {
        case 'connection':
          try {
            await websocketClient.connect();
            success = true;
          } catch (e) {
            success = false;
          }
          break;

        case 'health':
          try {
            const result = await healthCheck.checkNow();
            success = result.overall !== 'unhealthy';
          } catch (e) {
            success = false;
          }
          break;

        case 'frame':
        case 'tracking':
        case 'system':
          // These typically require manual intervention
          success = false;
          break;

        default:
          success = false;
      }

      // Update error with retry attempt
      setErrors(prev => 
        prev.map(e => 
          e.id === id ? {
            ...e,
            retryCount: (e.retryCount || 0) + 1,
            lastRetry: new Date().toISOString(),
            resolved: success,
          } : e
        )
      );

      if (success) {
        resolveError(id);
      } else {
        // Schedule next retry if attempts remain
        const nextRetryCount = (error.retryCount || 0) + 1;
        if (nextRetryCount < finalConfig.retryAttempts) {
          const timer = window.setTimeout(() => {
            retryError(id);
          }, finalConfig.retryDelay * Math.pow(2, nextRetryCount)); // Exponential backoff
          
          retryTimers.current.set(id, timer);
        }
      }

      return success;
    } catch (e) {
      console.error('Error during retry:', e);
      return false;
    }
  }, [errors, finalConfig, resolveError]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
    setCurrentError(null);
    
    // Clear all retry timers
    retryTimers.current.forEach(timer => clearTimeout(timer));
    retryTimers.current.clear();
  }, []);

  // Export errors
  const exportErrors = useCallback(() => {
    const data = {
      errors,
      currentError,
      errorCount: errors.length,
      criticalErrorCount: errors.filter(e => e.severity === 'critical').length,
      unresolvedErrorCount: errors.filter(e => !e.resolved).length,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }, [errors, currentError]);

  // Computed values
  const errorCount = errors.length;
  const criticalErrorCount = errors.filter(e => e.severity === 'critical').length;
  const hasUnresolvedErrors = errors.some(e => !e.resolved);

  return {
    errors,
    currentError,
    errorCount,
    criticalErrorCount,
    hasUnresolvedErrors,
    resolveError,
    retryError,
    clearErrors,
    exportErrors,
  };
};