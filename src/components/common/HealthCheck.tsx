// src/components/common/HealthCheck.tsx
/**
 * Health Check component for monitoring system status and connectivity
 * Provides visual feedback on system health and connection status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { monitoring, HealthCheckResult, HealthCheck as HealthCheckType } from '../../utils/monitoring';

interface HealthCheckProps {
  /** Whether to show detailed health information */
  showDetails?: boolean;
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** CSS class name for styling */
  className?: string;
  /** Whether to automatically run health checks */
  autoCheck?: boolean;
  /** Callback when health status changes */
  onHealthChange?: (status: 'healthy' | 'degraded' | 'unhealthy') => void;
}

interface HealthStatusColors {
  healthy: string;
  degraded: string;
  unhealthy: string;
}

const statusColors: HealthStatusColors = {
  healthy: 'text-green-600 bg-green-50 border-green-200',
  degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  unhealthy: 'text-red-600 bg-red-50 border-red-200',
};

const statusIcons = {
  healthy: '✅',
  degraded: '⚠️',
  unhealthy: '❌',
};

/**
 * Health Check Component
 * Displays system health status with optional detailed breakdown
 */
export const HealthCheck: React.FC<HealthCheckProps> = ({
  showDetails = false,
  updateInterval = 30000, // 30 seconds
  className = '',
  autoCheck = true,
  onHealthChange,
}) => {
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Perform health check
  const performHealthCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await monitoring.performHealthCheck();
      setHealthResult(result);
      setLastUpdate(new Date());
      
      // Notify parent component of status change
      onHealthChange?.(result.status);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthResult({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: [{
          name: 'Health Check',
          status: 'unhealthy',
          error: 'Failed to perform health check'
        }],
        metadata: {
          version: '1.0.0',
          environment: 'unknown',
          buildTime: new Date().toISOString()
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [onHealthChange]);

  // Auto health check effect
  useEffect(() => {
    if (autoCheck) {
      // Initial health check
      performHealthCheck();

      // Set up interval for periodic checks
      const interval = setInterval(performHealthCheck, updateInterval);

      return () => clearInterval(interval);
    }
  }, [autoCheck, updateInterval, performHealthCheck]);

  // Manual health check trigger
  const handleManualCheck = () => {
    if (!isLoading) {
      performHealthCheck();
    }
  };

  // Format time ago
  const getTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Render individual health check
  const renderHealthCheck = (check: HealthCheckType) => {
    const statusClass = statusColors[check.status];
    const icon = statusIcons[check.status];

    return (
      <div key={check.name} className={`p-3 rounded-lg border ${statusClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg" role="img" aria-label={check.status}>
              {icon}
            </span>
            <span className="font-medium">{check.name}</span>
          </div>
          {check.responseTime && (
            <span className="text-sm opacity-75">
              {Math.round(check.responseTime)}ms
            </span>
          )}
        </div>
        
        {check.error && (
          <div className="mt-2 text-sm opacity-80">
            <strong>Error:</strong> {check.error}
          </div>
        )}
        
        {check.metadata && Object.keys(check.metadata).length > 0 && (
          <div className="mt-2 text-sm opacity-80">
            {Object.entries(check.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                <span className="font-mono text-xs">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!healthResult && !isLoading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Health status not available</span>
          <button
            onClick={handleManualCheck}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            Check Now
          </button>
        </div>
      </div>
    );
  }

  const overallStatusClass = healthResult ? statusColors[healthResult.status] : 'text-gray-600 bg-gray-50 border-gray-200';
  const overallIcon = healthResult ? statusIcons[healthResult.status] : '⏳';

  return (
    <div className={`${className}`} role="status" aria-live="polite">
      {/* Overall Status */}
      <div className={`p-4 rounded-lg border ${overallStatusClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl" role="img" aria-label={healthResult?.status || 'loading'}>
              {isLoading ? '⏳' : overallIcon}
            </span>
            <div>
              <h3 className="font-semibold">
                System Status: {healthResult?.status ? 
                  healthResult.status.charAt(0).toUpperCase() + healthResult.status.slice(1) : 
                  'Checking...'
                }
              </h3>
              {lastUpdate && (
                <p className="text-sm opacity-75">
                  Last updated: {getTimeAgo(lastUpdate)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {healthResult && (
              <div className="text-sm opacity-75 text-right">
                <div>Version: {healthResult.metadata.version}</div>
                <div>Environment: {healthResult.metadata.environment}</div>
              </div>
            )}
            <button
              onClick={handleManualCheck}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Refresh health check"
            >
              {isLoading ? '⏳' : '🔄'}
            </button>
          </div>
        </div>
        
        {/* Quick Summary */}
        {healthResult && !showDetails && (
          <div className="mt-3 flex flex-wrap gap-2">
            {healthResult.checks.map((check) => (
              <span
                key={check.name}
                className={`px-2 py-1 text-xs rounded-full ${statusColors[check.status]}`}
                title={`${check.name}: ${check.status}${check.error ? ` - ${check.error}` : ''}`}
              >
                {statusIcons[check.status]} {check.name}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Detailed Status */}
      {showDetails && healthResult && (
        <div className="mt-4 space-y-3">
          <h4 className="font-semibold text-gray-800">Detailed Health Checks</h4>
          {healthResult.checks.map(renderHealthCheck)}
          
          {/* System Metadata */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h5 className="font-medium text-gray-800 mb-2">System Information</h5>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>
                <strong>Version:</strong> {healthResult.metadata.version}
              </div>
              <div>
                <strong>Environment:</strong> {healthResult.metadata.environment}
              </div>
              <div>
                <strong>Build Time:</strong> {new Date(healthResult.metadata.buildTime).toLocaleString()}
              </div>
              <div>
                <strong>Check Time:</strong> {new Date(healthResult.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-blue-600">Checking system health...</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact Health Status Indicator
 * Minimal status indicator for use in headers or status bars
 */
export const HealthStatusIndicator: React.FC<{
  className?: string;
  showTooltip?: boolean;
}> = ({ className = '', showTooltip = true }) => {
  const [status, setStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await monitoring.performHealthCheck();
        setStatus(result.status);
        setLastCheck(new Date());
      } catch (error) {
        setStatus('unhealthy');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const statusClass = statusColors[status];
  const icon = statusIcons[status];

  const tooltipContent = showTooltip ? `System Status: ${status} (Last checked: ${lastCheck.toLocaleTimeString()})` : undefined;

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusClass} ${className}`}
      title={tooltipContent}
      role="status"
      aria-label={`System status: ${status}`}
    >
      <span className="mr-1" role="img" aria-hidden="true">{icon}</span>
      <span className="capitalize">{status}</span>
    </div>
  );
};

/**
 * Health Check Hook
 * Custom hook for accessing health status in other components
 */
export const useHealthCheck = (updateInterval: number = 30000) => {
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await monitoring.performHealthCheck();
      setHealthResult(result);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, updateInterval);
    return () => clearInterval(interval);
  }, [checkHealth, updateInterval]);

  return {
    healthResult,
    isLoading,
    checkHealth,
    status: healthResult?.status || null,
    isHealthy: healthResult?.status === 'healthy',
  };
};

export default HealthCheck;