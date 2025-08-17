// Backend Integration Hook - Critical Pre-Phase 15 Requirements
// src/hooks/useBackendIntegration.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { backendIntegrationService } from '../services/backendIntegrationService';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface BackendConnectionStatus {
  api: 'connected' | 'disconnected' | 'error' | 'unknown';
  websocket: 'connected' | 'disconnected' | 'error' | 'unknown';
  health: 'healthy' | 'degraded' | 'error' | 'unknown';
  lastChecked: number;
  latency: {
    api: number;
    websocket: number;
  };
  errors: string[];
}

interface BackendValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  status: BackendConnectionStatus;
}

interface UseBackendIntegrationOptions {
  autoValidate?: boolean;
  autoMonitoring?: boolean;
  monitoringInterval?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

interface UseBackendIntegrationReturn {
  // Connection status
  isConnected: boolean;
  isValidating: boolean;
  connectionStatus: BackendConnectionStatus | null;
  
  // Validation results
  validationResult: BackendValidationResult | null;
  lastValidation: number;
  
  // Control methods
  validateIntegration: () => Promise<BackendValidationResult>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  retryConnection: () => Promise<void>;
  
  // Utility methods
  getIntegrationReport: () => string;
  isBackendReady: () => boolean;
  getLatencyMetrics: () => { api: number; websocket: number };
  
  // Status helpers
  hasErrors: boolean;
  hasWarnings: boolean;
  isHealthy: boolean;
}

const DEFAULT_OPTIONS: UseBackendIntegrationOptions = {
  autoValidate: true,
  autoMonitoring: false,
  monitoringInterval: 30000, // 30 seconds
  retryOnFailure: true,
  maxRetries: 3,
};

// =============================================================================
// Backend Integration Hook
// =============================================================================

/**
 * Hook for managing backend integration validation and monitoring
 */
export function useBackendIntegration(
  options: UseBackendIntegrationOptions = DEFAULT_OPTIONS
): UseBackendIntegrationReturn {
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const [isValidating, setIsValidating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus | null>(null);
  const [validationResult, setValidationResult] = useState<BackendValidationResult | null>(null);
  const [lastValidation, setLastValidation] = useState(0);
  
  // Refs
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const isInitializedRef = useRef(false);

  // =============================================================================
  // Validation Functions
  // =============================================================================

  const validateIntegration = useCallback(async (): Promise<BackendValidationResult> => {
    console.log('🔍 Starting backend integration validation...');
    setIsValidating(true);

    try {
      const result = await backendIntegrationService.validateBackendIntegration();
      
      setValidationResult(result);
      setConnectionStatus(result.status);
      setLastValidation(Date.now());
      
      if (result.isValid) {
        console.log('✅ Backend integration validation successful');
        retryCountRef.current = 0; // Reset retry count on success
      } else {
        console.warn('⚠️ Backend integration validation failed:', result.issues);
        
        // Auto-retry on failure if enabled
        if (opts.retryOnFailure && retryCountRef.current < (opts.maxRetries || 3)) {
          retryCountRef.current++;
          console.log(`🔄 Retrying validation (${retryCountRef.current}/${opts.maxRetries})`);
          
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.min(2000 * Math.pow(2, retryCountRef.current - 1), 10000);
          setTimeout(() => {
            validateIntegration();
          }, delay);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Backend validation error:', error);
      
      const errorResult: BackendValidationResult = {
        isValid: false,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: ['Check network connection and backend service status'],
        status: {
          api: 'error',
          websocket: 'error',
          health: 'error',
          lastChecked: Date.now(),
          latency: { api: 0, websocket: 0 },
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        },
      };
      
      setValidationResult(errorResult);
      setConnectionStatus(errorResult.status);
      setLastValidation(Date.now());
      
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [opts.retryOnFailure, opts.maxRetries]);

  // =============================================================================
  // Monitoring Functions
  // =============================================================================

  const startMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    console.log(`🔄 Starting backend monitoring (${opts.monitoringInterval}ms interval)`);
    
    // Start backend service health monitoring
    backendIntegrationService.startHealthMonitoring(opts.monitoringInterval);
    
    // Set up local monitoring to sync status
    monitoringIntervalRef.current = setInterval(() => {
      const currentStatus = backendIntegrationService.getConnectionStatus();
      setConnectionStatus(currentStatus);
      
      // Trigger re-validation if connection is lost
      if (currentStatus.api === 'error' || currentStatus.health === 'error') {
        console.warn('⚠️ Connection lost, triggering re-validation');
        validateIntegration();
      }
    }, opts.monitoringInterval);
  }, [opts.monitoringInterval, validateIntegration]);

  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = undefined;
    }
    
    backendIntegrationService.stopHealthMonitoring();
    console.log('🛑 Backend monitoring stopped');
  }, []);

  // =============================================================================
  // Control Functions
  // =============================================================================

  const retryConnection = useCallback(async (): Promise<void> => {
    console.log('🔄 Manually retrying backend connection...');
    retryCountRef.current = 0; // Reset retry count
    await validateIntegration();
  }, [validateIntegration]);

  // =============================================================================
  // Utility Functions
  // =============================================================================

  const getIntegrationReport = useCallback((): string => {
    return backendIntegrationService.generateIntegrationReport();
  }, []);

  const isBackendReady = useCallback((): boolean => {
    return backendIntegrationService.isBackendReady();
  }, []);

  const getLatencyMetrics = useCallback((): { api: number; websocket: number } => {
    return backendIntegrationService.getLatencyMetrics();
  }, []);

  // =============================================================================
  // Effects
  // =============================================================================

  // Initialize validation on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      if (opts.autoValidate) {
        console.log('🚀 Auto-validating backend integration on mount');
        validateIntegration();
      }
      
      if (opts.autoMonitoring) {
        console.log('🔄 Auto-starting backend monitoring');
        startMonitoring();
      }
    }
  }, [opts.autoValidate, opts.autoMonitoring, validateIntegration, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
      backendIntegrationService.dispose();
    };
  }, [stopMonitoring]);

  // =============================================================================
  // Derived State
  // =============================================================================

  const isConnected = connectionStatus?.api === 'connected' && connectionStatus?.health === 'healthy';
  const hasErrors = (validationResult?.issues.length ?? 0) > 0;
  const hasWarnings = (validationResult?.warnings.length ?? 0) > 0;
  const isHealthy = validationResult?.isValid === true && isConnected;

  // =============================================================================
  // Return Interface
  // =============================================================================

  return {
    // Connection status
    isConnected,
    isValidating,
    connectionStatus,
    
    // Validation results
    validationResult,
    lastValidation,
    
    // Control methods
    validateIntegration,
    startMonitoring,
    stopMonitoring,
    retryConnection,
    
    // Utility methods
    getIntegrationReport,
    isBackendReady,
    getLatencyMetrics,
    
    // Status helpers
    hasErrors,
    hasWarnings,
    isHealthy,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Simple backend connectivity hook
 */
export function useBackendConnectivity() {
  const { isConnected, connectionStatus, validateIntegration } = useBackendIntegration({
    autoValidate: true,
    autoMonitoring: false,
  });

  return {
    isConnected,
    latency: connectionStatus?.latency.api ?? 0,
    refresh: validateIntegration,
  };
}

/**
 * Backend health monitoring hook with alerts
 */
export function useBackendHealthMonitoring(onHealthChange?: (isHealthy: boolean) => void) {
  const integration = useBackendIntegration({
    autoValidate: true,
    autoMonitoring: true,
    monitoringInterval: 15000, // Check every 15s
  });

  // Health change notifications
  useEffect(() => {
    if (onHealthChange) {
      onHealthChange(integration.isHealthy);
    }
  }, [integration.isHealthy, onHealthChange]);

  return {
    isHealthy: integration.isHealthy,
    connectionStatus: integration.connectionStatus,
    issues: integration.validationResult?.issues ?? [],
    warnings: integration.validationResult?.warnings ?? [],
    retryConnection: integration.retryConnection,
  };
}

/**
 * Backend integration status for UI display
 */
export function useBackendStatus() {
  const { isConnected, connectionStatus, validationResult, isValidating } = useBackendIntegration({
    autoValidate: true,
    autoMonitoring: true,
  });

  const status = connectionStatus;
  const latency = status?.latency ?? { api: 0, websocket: 0 };
  
  // Determine status color and message
  let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
  let statusMessage = 'Unknown';
  
  if (isValidating) {
    statusColor = 'yellow';
    statusMessage = 'Validating...';
  } else if (isConnected) {
    statusColor = 'green';
    statusMessage = `Connected (${latency.api}ms)`;
  } else if (status?.api === 'error') {
    statusColor = 'red';
    statusMessage = 'Connection Error';
  } else if (status?.health === 'error') {
    statusColor = 'red';
    statusMessage = 'Backend Unhealthy';
  } else {
    statusColor = 'gray';
    statusMessage = 'Disconnected';
  }

  return {
    isConnected,
    statusColor,
    statusMessage,
    latency,
    issues: validationResult?.issues ?? [],
    warnings: validationResult?.warnings ?? [],
    lastCheck: status?.lastChecked ?? 0,
  };
}

export default useBackendIntegration;