// src/components/SystemSettings.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { EnvironmentId } from '../types/api';

interface SystemConfiguration {
  backend: {
    apiBaseUrl: string;
    wsBaseUrl: string;
    timeout: number;
    retryAttempts: number;
    enableTLS: boolean;
  };
  detection: {
    confidenceThreshold: number;
    detectionFrameRate: number;
    maxTrackedPersons: number;
    trackingTimeout: number;
  };
  reid: {
    sensitivityLevel: 'low' | 'medium' | 'high';
    crossCameraThreshold: number;
    featureExtractionQuality: 'fast' | 'balanced' | 'accurate';
    maxIdentityAge: number;
  };
  performance: {
    videoQuality: 'low' | 'medium' | 'high' | 'ultra';
    compressionLevel: number;
    bufferSize: number;
    maxConcurrentStreams: number;
  };
  storage: {
    dataRetentionDays: number;
    cacheSize: number;
    autoCleanup: boolean;
    compressionEnabled: boolean;
  };
}

interface SystemSettingsProps {
  environment: EnvironmentId;
  isConnected: boolean;
  onSettingsChange: () => void;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({
  environment: _environment,
  isConnected,
  onSettingsChange,
  hasUnsavedChanges,
  isSubmitting: _isSubmitting,
}) => {
  // Default configuration
  const defaultConfig: SystemConfiguration = useMemo(
    () => ({
      backend: {
        apiBaseUrl: 'http://localhost:3847',
        wsBaseUrl: 'ws://localhost:3847',
        timeout: 30000,
        retryAttempts: 3,
        enableTLS: false,
      },
      detection: {
        confidenceThreshold: 0.7,
        detectionFrameRate: 30,
        maxTrackedPersons: 100,
        trackingTimeout: 30,
      },
      reid: {
        sensitivityLevel: 'medium',
        crossCameraThreshold: 0.8,
        featureExtractionQuality: 'balanced',
        maxIdentityAge: 3600,
      },
      performance: {
        videoQuality: 'high',
        compressionLevel: 50,
        bufferSize: 10,
        maxConcurrentStreams: 4,
      },
      storage: {
        dataRetentionDays: 30,
        cacheSize: 1024,
        autoCleanup: true,
        compressionEnabled: true,
      },
    }),
    []
  );

  const [config, setConfig] = useState<SystemConfiguration>(defaultConfig);
  const [testResults, setTestResults] = useState<{
    backend?: { success: boolean; message: string };
    performance?: { success: boolean; message: string };
  }>({});

  // Handle configuration changes
  const handleConfigChange = useCallback(
    (section: keyof SystemConfiguration, key: string, value: unknown) => {
      setConfig((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      }));
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Test backend connection
  const testBackendConnection = useCallback(async () => {
    setTestResults((prev) => ({ ...prev, backend: undefined }));

    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3; // 70% success rate for demo

      setTestResults((prev) => ({
        ...prev,
        backend: {
          success,
          message: success
            ? 'Backend connection successful'
            : 'Connection failed - check URL and network',
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        backend: {
          success: false,
          message: 'Connection test failed',
        },
      }));
    }
  }, []);

  // Test system performance
  const testSystemPerformance = useCallback(async () => {
    setTestResults((prev) => ({ ...prev, performance: undefined }));

    try {
      // Simulate performance test
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setTestResults((prev) => ({
        ...prev,
        performance: {
          success: true,
          message: 'System performance optimal - 45ms avg response time',
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        performance: {
          success: false,
          message: 'Performance test failed',
        },
      }));
    }
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
    onSettingsChange();
  }, [defaultConfig, onSettingsChange]);

  return (
    <div className="space-y-8">
      {/* Backend Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Backend Configuration</h3>
          <button
            onClick={testBackendConnection}
            disabled={!isConnected}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm"
          >
            🔍 Test Connection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">API Base URL</label>
            <input
              type="url"
              value={config.backend.apiBaseUrl}
              onChange={(e) => handleConfigChange('backend', 'apiBaseUrl', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
              placeholder="http://localhost:3847"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">WebSocket URL</label>
            <input
              type="url"
              value={config.backend.wsBaseUrl}
              onChange={(e) => handleConfigChange('backend', 'wsBaseUrl', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
              placeholder="ws://localhost:3847"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timeout (ms): {config.backend.timeout}
            </label>
            <input
              type="range"
              min={5000}
              max={60000}
              step={1000}
              value={config.backend.timeout}
              onChange={(e) => handleConfigChange('backend', 'timeout', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">5s - 60s</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Retry Attempts: {config.backend.retryAttempts}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={config.backend.retryAttempts}
              onChange={(e) =>
                handleConfigChange('backend', 'retryAttempts', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">1 - 10 attempts</div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableTLS"
              checked={config.backend.enableTLS}
              onChange={(e) => handleConfigChange('backend', 'enableTLS', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="enableTLS" className="text-sm text-gray-300">
              Enable TLS/SSL
            </label>
          </div>
        </div>

        {testResults.backend && (
          <div
            className={`p-3 rounded ${
              testResults.backend.success
                ? 'bg-green-500/20 text-green-200 border border-green-500'
                : 'bg-red-500/20 text-red-200 border border-red-500'
            }`}
          >
            {testResults.backend.message}
          </div>
        )}
      </div>

      {/* Detection Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Person Detection Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confidence Threshold: {(config.detection.confidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={config.detection.confidenceThreshold}
              onChange={(e) =>
                handleConfigChange('detection', 'confidenceThreshold', parseFloat(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Higher = fewer false positives</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Detection Frame Rate: {config.detection.detectionFrameRate} FPS
            </label>
            <input
              type="range"
              min={1}
              max={60}
              value={config.detection.detectionFrameRate}
              onChange={(e) =>
                handleConfigChange('detection', 'detectionFrameRate', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Higher = more CPU usage</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tracked Persons: {config.detection.maxTrackedPersons}
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={config.detection.maxTrackedPersons}
              onChange={(e) =>
                handleConfigChange('detection', 'maxTrackedPersons', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">System memory limit</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tracking Timeout: {config.detection.trackingTimeout}s
            </label>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={config.detection.trackingTimeout}
              onChange={(e) =>
                handleConfigChange('detection', 'trackingTimeout', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">ID persistence after occlusion</div>
          </div>
        </div>
      </div>

      {/* Re-identification Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Re-identification Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sensitivity Level
            </label>
            <select
              value={config.reid.sensitivityLevel}
              onChange={(e) => handleConfigChange('reid', 'sensitivityLevel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="low">Low - Conservative matching</option>
              <option value="medium">Medium - Balanced accuracy</option>
              <option value="high">High - Aggressive matching</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Feature Extraction Quality
            </label>
            <select
              value={config.reid.featureExtractionQuality}
              onChange={(e) =>
                handleConfigChange('reid', 'featureExtractionQuality', e.target.value)
              }
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="fast">Fast - Lower accuracy, higher speed</option>
              <option value="balanced">Balanced - Good accuracy and speed</option>
              <option value="accurate">Accurate - Best accuracy, slower</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cross-Camera Threshold: {(config.reid.crossCameraThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={config.reid.crossCameraThreshold}
              onChange={(e) =>
                handleConfigChange('reid', 'crossCameraThreshold', parseFloat(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Similarity required for same identity</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Identity Age: {config.reid.maxIdentityAge}s
            </label>
            <input
              type="range"
              min={300}
              max={7200}
              step={300}
              value={config.reid.maxIdentityAge}
              onChange={(e) =>
                handleConfigChange('reid', 'maxIdentityAge', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Identity retention time</div>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Performance Settings</h3>
          <button
            onClick={testSystemPerformance}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
          >
            ⚡ Test Performance
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Video Quality</label>
            <select
              value={config.performance.videoQuality}
              onChange={(e) => handleConfigChange('performance', 'videoQuality', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
            >
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
              <option value="ultra">Ultra (4K)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Compression Level: {config.performance.compressionLevel}%
            </label>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={config.performance.compressionLevel}
              onChange={(e) =>
                handleConfigChange('performance', 'compressionLevel', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Higher = smaller files, lower quality</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buffer Size: {config.performance.bufferSize}MB
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={config.performance.bufferSize}
              onChange={(e) =>
                handleConfigChange('performance', 'bufferSize', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Memory usage for buffering</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Concurrent Streams: {config.performance.maxConcurrentStreams}
            </label>
            <input
              type="range"
              min={1}
              max={16}
              value={config.performance.maxConcurrentStreams}
              onChange={(e) =>
                handleConfigChange('performance', 'maxConcurrentStreams', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Active camera feeds</div>
          </div>
        </div>

        {testResults.performance && (
          <div
            className={`p-3 rounded ${
              testResults.performance.success
                ? 'bg-green-500/20 text-green-200 border border-green-500'
                : 'bg-red-500/20 text-red-200 border border-red-500'
            }`}
          >
            {testResults.performance.message}
          </div>
        )}
      </div>

      {/* Storage Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Storage & Data Management</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Retention: {config.storage.dataRetentionDays} days
            </label>
            <input
              type="range"
              min={1}
              max={365}
              value={config.storage.dataRetentionDays}
              onChange={(e) =>
                handleConfigChange('storage', 'dataRetentionDays', parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Historical data storage period</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cache Size: {config.storage.cacheSize}MB
            </label>
            <input
              type="range"
              min={100}
              max={10240}
              step={100}
              value={config.storage.cacheSize}
              onChange={(e) => handleConfigChange('storage', 'cacheSize', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">Memory for caching</div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoCleanup"
              checked={config.storage.autoCleanup}
              onChange={(e) => handleConfigChange('storage', 'autoCleanup', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoCleanup" className="text-sm text-gray-300">
              Enable automatic cleanup
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="compressionEnabled"
              checked={config.storage.compressionEnabled}
              onChange={(e) =>
                handleConfigChange('storage', 'compressionEnabled', e.target.checked)
              }
              className="rounded"
            />
            <label htmlFor="compressionEnabled" className="text-sm text-gray-300">
              Enable data compression
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
        >
          Reset to Defaults
        </button>

        <div className="text-sm text-gray-400">
          {hasUnsavedChanges ? (
            <span className="text-orange-400">⚠️ Unsaved changes</span>
          ) : (
            <span className="text-green-400">✅ Settings saved</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
