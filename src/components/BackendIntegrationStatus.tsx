// Backend Integration Status Component - Critical Pre-Phase 15 Requirements
// src/components/BackendIntegrationStatus.tsx

import React, { useState } from 'react';
import { useBackendIntegration, useBackendStatus } from '../hooks/useBackendIntegration';

// =============================================================================
// Backend Integration Status Component
// =============================================================================

interface BackendIntegrationStatusProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  onStatusChange?: (isHealthy: boolean) => void;
}

const BackendIntegrationStatus: React.FC<BackendIntegrationStatusProps> = ({
  className = '',
  showDetails = false,
  autoRefresh = true,
  onStatusChange,
}) => {
  const [showFullReport, setShowFullReport] = useState(false);
  
  const integration = useBackendIntegration({
    autoValidate: true,
    autoMonitoring: autoRefresh,
    monitoringInterval: 15000,
  });

  const status = useBackendStatus();

  // Notify parent of health changes
  React.useEffect(() => {
    if (onStatusChange) {
      onStatusChange(integration.isHealthy);
    }
  }, [integration.isHealthy, onStatusChange]);

  const getStatusIcon = () => {
    if (integration.isValidating) {
      return <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full" />;
    }
    
    switch (status.statusColor) {
      case 'green':
        return <div className="h-3 w-3 bg-green-400 rounded-full" />;
      case 'yellow':
        return <div className="h-3 w-3 bg-yellow-400 rounded-full animate-pulse" />;
      case 'red':
        return <div className="h-3 w-3 bg-red-400 rounded-full" />;
      default:
        return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusTextColor = () => {
    switch (status.statusColor) {
      case 'green': return 'text-green-400';
      case 'yellow': return 'text-yellow-400';  
      case 'red': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`${className}`}>
      {/* Compact Status Display */}
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusTextColor()}`}>
          {status.statusMessage}
        </span>
        
        {showDetails && (
          <button
            onClick={() => setShowFullReport(!showFullReport)}
            className="text-xs text-gray-400 hover:text-gray-200 ml-2"
          >
            {showFullReport ? '▼' : '▶'} Details
          </button>
        )}
        
        <button
          onClick={integration.retryConnection}
          disabled={integration.isValidating}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Detailed Status Information */}
      {showDetails && showFullReport && (
        <div className="mt-3 p-3 bg-gray-800 rounded-md text-sm">
          <div className="space-y-2">
            {/* Connection Details */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-1">Connection Status</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>API:</span>
                  <span className={
                    integration.connectionStatus?.api === 'connected' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }>
                    {integration.connectionStatus?.api || 'unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>WebSocket:</span>
                  <span className={
                    integration.connectionStatus?.websocket === 'connected' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }>
                    {integration.connectionStatus?.websocket || 'unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Health:</span>
                  <span className={
                    integration.connectionStatus?.health === 'healthy' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }>
                    {integration.connectionStatus?.health || 'unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className="text-blue-400">
                    {status.latency.api}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Issues and Warnings */}
            {status.issues.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-400 mb-1">Issues</h4>
                <ul className="text-xs space-y-1">
                  {status.issues.map((issue, index) => (
                    <li key={index} className="text-red-300">• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {status.warnings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-yellow-400 mb-1">Warnings</h4>
                <ul className="text-xs space-y-1">
                  {status.warnings.map((warning, index) => (
                    <li key={index} className="text-yellow-300">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {integration.validationResult?.recommendations && integration.validationResult.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-blue-400 mb-1">Recommendations</h4>
                <ul className="text-xs space-y-1">
                  {integration.validationResult.recommendations.map((rec, index) => (
                    <li key={index} className="text-blue-300">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Last Check */}
            <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
              Last checked: {status.lastCheck > 0 ? new Date(status.lastCheck).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>
      )}

      {/* Critical Issues Alert */}
      {!integration.isHealthy && !integration.isValidating && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded-md">
          <div className="flex items-center space-x-2">
            <span className="text-red-400 text-sm font-medium">⚠️ Backend Integration Issues</span>
          </div>
          <p className="text-xs text-red-300 mt-1">
            Critical backend connectivity issues detected. Some features may not work properly.
          </p>
          <button
            onClick={integration.retryConnection}
            disabled={integration.isValidating}
            className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Simple Backend Health Indicator
// =============================================================================

interface BackendHealthIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BackendHealthIndicator: React.FC<BackendHealthIndicatorProps> = ({
  className = '',
  size = 'md',
}) => {
  const status = useBackendStatus();
  
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3', 
    lg: 'h-4 w-4',
  };

  const colorClasses = {
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
    gray: 'bg-gray-400',
  };

  return (
    <div className={`${className} flex items-center space-x-1`}>
      <div 
        className={`${sizeClasses[size]} ${colorClasses[status.statusColor]} rounded-full ${
          status.statusColor === 'yellow' ? 'animate-pulse' : ''
        }`}
        title={status.statusMessage}
      />
      <span className="text-xs text-gray-400">Backend</span>
    </div>
  );
};

// =============================================================================
// Backend Configuration Panel
// =============================================================================

interface BackendConfigPanelProps {
  className?: string;
}

export const BackendConfigPanel: React.FC<BackendConfigPanelProps> = ({
  className = '',
}) => {
  const integration = useBackendIntegration({
    autoValidate: false,
    autoMonitoring: false,
  });

  const [configReport, setConfigReport] = useState<string>('');
  
  const handleGenerateReport = () => {
    const report = integration.getIntegrationReport();
    setConfigReport(report);
  };

  const handleTestConnection = async () => {
    await integration.validateIntegration();
  };

  return (
    <div className={`${className} bg-gray-800 rounded-lg p-4`}>
      <h3 className="text-lg font-semibold text-white mb-4">Backend Configuration</h3>
      
      <div className="space-y-4">
        {/* Current Status */}
        <BackendIntegrationStatus 
          showDetails={true}
          autoRefresh={false}
        />

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleTestConnection}
            disabled={integration.isValidating}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
          >
            {integration.isValidating ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button
            onClick={handleGenerateReport}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
          >
            Generate Report
          </button>

          <button
            onClick={integration.isBackendReady() ? integration.stopMonitoring : integration.startMonitoring}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded"
          >
            {integration.isBackendReady() ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>

        {/* Configuration Report */}
        {configReport && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Integration Report</h4>
            <pre className="text-xs bg-gray-900 p-3 rounded overflow-auto max-h-64 text-gray-300">
              {configReport}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackendIntegrationStatus;