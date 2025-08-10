// src/components/CameraSettings.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { EnvironmentId, BackendCameraId } from '../types/api';
import { getCameraDisplayName, getEnvironmentConfig } from '../config/environments';

interface CameraConfiguration {
  id: BackendCameraId;
  name: string;
  enabled: boolean;
  position: { x: number; y: number };
  detectionZones: Array<{
    id: string;
    name: string;
    coordinates: Array<[number, number]>;
    enabled: boolean;
    sensitivity: number;
  }>;
  settings: {
    resolution: '480p' | '720p' | '1080p' | '4K';
    frameRate: number;
    quality: number;
    brightnessAdjustment: number;
    contrastAdjustment: number;
    saturationAdjustment: number;
    exposureCompensation: number;
    nightVisionEnabled: boolean;
    motionDetectionEnabled: boolean;
    recordingEnabled: boolean;
  };
  detection: {
    confidenceThreshold: number;
    minPersonSize: number;
    maxPersonSize: number;
    trackingSmoothing: number;
    falsePositiveReduction: boolean;
    occlusionHandling: boolean;
  };
  privacy: {
    privacyMaskEnabled: boolean;
    privacyZones: Array<{
      id: string;
      coordinates: Array<[number, number]>;
      blurLevel: number;
    }>;
    dataRetentionDays: number;
    anonymizeData: boolean;
  };
}

interface CameraSettingsProps {
  environment: EnvironmentId;
  isConnected: boolean;
  onSettingsChange: () => void;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
}

const CameraSettings: React.FC<CameraSettingsProps> = ({
  environment,
  isConnected,
  onSettingsChange,
  hasUnsavedChanges: _hasUnsavedChanges,
  isSubmitting: _isSubmitting,
}) => {
  const environmentConfig = getEnvironmentConfig(environment);

  // Generate camera configurations based on environment
  const defaultCameraConfigs: CameraConfiguration[] = useMemo(() => {
    return environmentConfig.cameras.map((cameraId, index) => ({
      id: cameraId,
      name: getCameraDisplayName(cameraId, environment),
      enabled: true,
      position: { x: index * 200 + 100, y: 150 },
      detectionZones: [
        {
          id: `${cameraId}_zone_1`,
          name: 'Main Detection Area',
          coordinates: [
            [50, 50],
            [350, 50],
            [350, 250],
            [50, 250],
          ],
          enabled: true,
          sensitivity: 0.8,
        },
        {
          id: `${cameraId}_zone_2`,
          name: 'Secondary Area',
          coordinates: [
            [100, 100],
            [300, 100],
            [300, 200],
            [100, 200],
          ],
          enabled: false,
          sensitivity: 0.6,
        },
      ],
      settings: {
        resolution: '1080p',
        frameRate: 30,
        quality: 80,
        brightnessAdjustment: 0,
        contrastAdjustment: 0,
        saturationAdjustment: 0,
        exposureCompensation: 0,
        nightVisionEnabled: true,
        motionDetectionEnabled: true,
        recordingEnabled: true,
      },
      detection: {
        confidenceThreshold: 0.7,
        minPersonSize: 20,
        maxPersonSize: 500,
        trackingSmoothing: 0.5,
        falsePositiveReduction: true,
        occlusionHandling: true,
      },
      privacy: {
        privacyMaskEnabled: false,
        privacyZones: [],
        dataRetentionDays: 30,
        anonymizeData: false,
      },
    }));
  }, [environment, environmentConfig.cameras]);

  const [cameraConfigs, setCameraConfigs] = useState<CameraConfiguration[]>(defaultCameraConfigs);
  const [selectedCamera, setSelectedCamera] = useState<BackendCameraId>(
    defaultCameraConfigs[0]?.id
  );
  const [activeTab, setActiveTab] = useState<'settings' | 'detection' | 'zones' | 'privacy'>(
    'settings'
  );
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  // Get selected camera config
  const selectedCameraConfig = cameraConfigs.find((config) => config.id === selectedCamera);

  // Handle camera config changes
  const handleCameraConfigChange = useCallback(
    (
      cameraId: BackendCameraId,
      section: keyof CameraConfiguration,
      key: string,
      value: unknown
    ) => {
      setCameraConfigs((prev) =>
        prev.map((config) =>
          config.id === cameraId
            ? {
                ...config,
                [section]:
                  typeof config[section] === 'object' && config[section] !== null
                    ? { ...config[section], [key]: value }
                    : value,
              }
            : config
        )
      );
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Handle detection zone changes
  const handleDetectionZoneChange = useCallback(
    (cameraId: BackendCameraId, zoneId: string, key: string, value: unknown) => {
      setCameraConfigs((prev) =>
        prev.map((config) =>
          config.id === cameraId
            ? {
                ...config,
                detectionZones: config.detectionZones.map((zone) =>
                  zone.id === zoneId ? { ...zone, [key]: value } : zone
                ),
              }
            : config
        )
      );
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Test camera connection
  const testCameraConnection = useCallback(async (cameraId: BackendCameraId) => {
    setTestResults((prev) => ({ ...prev, [cameraId]: { success: false, message: 'Testing...' } }));

    try {
      // Simulate camera test
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const success = Math.random() > 0.2; // 80% success rate for demo

      setTestResults((prev) => ({
        ...prev,
        [cameraId]: {
          success,
          message: success
            ? 'Camera connection successful - 1080p @ 30fps'
            : 'Camera connection failed - check network and power',
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [cameraId]: {
          success: false,
          message: 'Test failed',
        },
      }));
    }
  }, []);

  // Add detection zone
  const addDetectionZone = useCallback(
    (cameraId: BackendCameraId) => {
      const camera = cameraConfigs.find((config) => config.id === cameraId);
      if (camera) {
        const newZone = {
          id: `${cameraId}_zone_${camera.detectionZones.length + 1}`,
          name: `Zone ${camera.detectionZones.length + 1}`,
          coordinates: [
            [75, 75],
            [325, 75],
            [325, 225],
            [75, 225],
          ] as Array<[number, number]>,
          enabled: true,
          sensitivity: 0.7,
        };

        setCameraConfigs((prev) =>
          prev.map((config) =>
            config.id === cameraId
              ? { ...config, detectionZones: [...config.detectionZones, newZone] }
              : config
          )
        );
        onSettingsChange();
      }
    },
    [cameraConfigs, onSettingsChange]
  );

  // Remove detection zone
  const removeDetectionZone = useCallback(
    (cameraId: BackendCameraId, zoneId: string) => {
      setCameraConfigs((prev) =>
        prev.map((config) =>
          config.id === cameraId
            ? {
                ...config,
                detectionZones: config.detectionZones.filter((zone) => zone.id !== zoneId),
              }
            : config
        )
      );
      onSettingsChange();
    },
    [onSettingsChange]
  );

  // Reset camera settings
  const resetCameraSettings = useCallback(
    (cameraId: BackendCameraId) => {
      const defaultConfig = defaultCameraConfigs.find((config) => config.id === cameraId);
      if (defaultConfig) {
        setCameraConfigs((prev) =>
          prev.map((config) => (config.id === cameraId ? defaultConfig : config))
        );
        onSettingsChange();
      }
    },
    [defaultCameraConfigs, onSettingsChange]
  );

  if (!selectedCameraConfig) {
    return <div className="text-center text-gray-400">No cameras configured</div>;
  }

  return (
    <div className="space-y-6">
      {/* Camera Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Camera Configuration</h3>
          <p className="text-sm text-gray-400">
            Configure individual camera settings and detection zones
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value as BackendCameraId)}
            className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
          >
            {cameraConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => testCameraConnection(selectedCamera)}
            disabled={!isConnected}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm"
          >
            🔍 Test
          </button>
        </div>
      </div>

      {/* Camera Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                selectedCameraConfig.enabled ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-sm text-gray-300">
              {selectedCameraConfig.enabled ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {selectedCameraConfig.settings.resolution}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-sm text-gray-400">Frame Rate</div>
          <div className="text-lg font-semibold text-orange-400">
            {selectedCameraConfig.settings.frameRate} FPS
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-sm text-gray-400">Detection Zones</div>
          <div className="text-lg font-semibold text-blue-400">
            {selectedCameraConfig.detectionZones.filter((zone) => zone.enabled).length} active
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-sm text-gray-400">Quality</div>
          <div className="text-lg font-semibold text-purple-400">
            {selectedCameraConfig.settings.quality}%
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults[selectedCamera] && (
        <div
          className={`p-3 rounded ${
            testResults[selectedCamera].success
              ? 'bg-green-500/20 text-green-200 border border-green-500'
              : 'bg-red-500/20 text-red-200 border border-red-500'
          }`}
        >
          {testResults[selectedCamera].message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1">
        {[
          { key: 'settings', label: 'Camera Settings', icon: '⚙️' },
          { key: 'detection', label: 'Detection', icon: '🎯' },
          { key: 'zones', label: 'Detection Zones', icon: '🔲' },
          { key: 'privacy', label: 'Privacy', icon: '🔒' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
              activeTab === tab.key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-white">Basic Camera Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
                  <select
                    value={selectedCameraConfig.settings.resolution}
                    onChange={(e) =>
                      handleCameraConfigChange(
                        selectedCamera,
                        'settings',
                        'resolution',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-orange-500"
                  >
                    <option value="480p">480p (SD)</option>
                    <option value="720p">720p (HD)</option>
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="4K">4K (Ultra HD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Frame Rate: {selectedCameraConfig.settings.frameRate} FPS
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={selectedCameraConfig.settings.frameRate}
                    onChange={(e) =>
                      handleCameraConfigChange(
                        selectedCamera,
                        'settings',
                        'frameRate',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video Quality: {selectedCameraConfig.settings.quality}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={selectedCameraConfig.settings.quality}
                    onChange={(e) =>
                      handleCameraConfigChange(
                        selectedCamera,
                        'settings',
                        'quality',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'nightVisionEnabled', label: 'Night vision' },
                    { key: 'motionDetectionEnabled', label: 'Motion detection' },
                    { key: 'recordingEnabled', label: 'Recording' },
                  ].map((option) => (
                    <div key={option.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${selectedCamera}_${option.key}`}
                        checked={
                          selectedCameraConfig.settings[
                            option.key as keyof typeof selectedCameraConfig.settings
                          ] as boolean
                        }
                        onChange={(e) =>
                          handleCameraConfigChange(
                            selectedCamera,
                            'settings',
                            option.key,
                            e.target.checked
                          )
                        }
                        className="rounded"
                      />
                      <label
                        htmlFor={`${selectedCamera}_${option.key}`}
                        className="text-sm text-gray-300"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Image Adjustments */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-white">Image Adjustments</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'brightnessAdjustment', label: 'Brightness', min: -100, max: 100 },
                  { key: 'contrastAdjustment', label: 'Contrast', min: -100, max: 100 },
                  { key: 'saturationAdjustment', label: 'Saturation', min: -100, max: 100 },
                  { key: 'exposureCompensation', label: 'Exposure', min: -3, max: 3 },
                ].map((adjustment) => (
                  <div key={adjustment.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {adjustment.label}:{' '}
                      {
                        selectedCameraConfig.settings[
                          adjustment.key as keyof typeof selectedCameraConfig.settings
                        ]
                      }
                    </label>
                    <input
                      type="range"
                      min={adjustment.min}
                      max={adjustment.max}
                      step={adjustment.key === 'exposureCompensation' ? 0.1 : 1}
                      value={
                        selectedCameraConfig.settings[
                          adjustment.key as keyof typeof selectedCameraConfig.settings
                        ] as number
                      }
                      onChange={(e) =>
                        handleCameraConfigChange(
                          selectedCamera,
                          'settings',
                          adjustment.key,
                          adjustment.key === 'exposureCompensation'
                            ? parseFloat(e.target.value)
                            : parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detection' && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Person Detection Settings</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confidence Threshold:{' '}
                  {(selectedCameraConfig.detection.confidenceThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={selectedCameraConfig.detection.confidenceThreshold}
                  onChange={(e) =>
                    handleCameraConfigChange(
                      selectedCamera,
                      'detection',
                      'confidenceThreshold',
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">Higher = fewer false positives</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tracking Smoothing:{' '}
                  {(selectedCameraConfig.detection.trackingSmoothing * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  value={selectedCameraConfig.detection.trackingSmoothing}
                  onChange={(e) =>
                    handleCameraConfigChange(
                      selectedCamera,
                      'detection',
                      'trackingSmoothing',
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Higher = smoother but slower tracking
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Person Size: {selectedCameraConfig.detection.minPersonSize}px
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selectedCameraConfig.detection.minPersonSize}
                  onChange={(e) =>
                    handleCameraConfigChange(
                      selectedCamera,
                      'detection',
                      'minPersonSize',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Person Size: {selectedCameraConfig.detection.maxPersonSize}px
                </label>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={10}
                  value={selectedCameraConfig.detection.maxPersonSize}
                  onChange={(e) =>
                    handleCameraConfigChange(
                      selectedCamera,
                      'detection',
                      'maxPersonSize',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                {[
                  { key: 'falsePositiveReduction', label: 'False positive reduction' },
                  { key: 'occlusionHandling', label: 'Occlusion handling' },
                ].map((option) => (
                  <div key={option.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${selectedCamera}_${option.key}`}
                      checked={
                        selectedCameraConfig.detection[
                          option.key as keyof typeof selectedCameraConfig.detection
                        ] as boolean
                      }
                      onChange={(e) =>
                        handleCameraConfigChange(
                          selectedCamera,
                          'detection',
                          option.key,
                          e.target.checked
                        )
                      }
                      className="rounded"
                    />
                    <label
                      htmlFor={`${selectedCamera}_${option.key}`}
                      className="text-sm text-gray-300"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-white">Detection Zones</h4>
              <button
                onClick={() => addDetectionZone(selectedCamera)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                ➕ Add Zone
              </button>
            </div>

            <div className="space-y-3">
              {selectedCameraConfig.detectionZones.map((zone) => (
                <div key={zone.id} className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={zone.enabled}
                        onChange={(e) =>
                          handleDetectionZoneChange(
                            selectedCamera,
                            zone.id,
                            'enabled',
                            e.target.checked
                          )
                        }
                        className="rounded"
                      />
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) =>
                          handleDetectionZoneChange(selectedCamera, zone.id, 'name', e.target.value)
                        }
                        className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-orange-500"
                      />
                    </div>
                    <button
                      onClick={() => removeDetectionZone(selectedCamera, zone.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Sensitivity: {(zone.sensitivity * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={zone.sensitivity}
                        onChange={(e) =>
                          handleDetectionZoneChange(
                            selectedCamera,
                            zone.id,
                            'sensitivity',
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full"
                        disabled={!zone.enabled}
                      />
                    </div>

                    <div className="text-sm text-gray-400">
                      <div>Coordinates: {zone.coordinates.length} points</div>
                      <div className="text-xs mt-1">
                        Area:{' '}
                        {Math.abs(
                          zone.coordinates.reduce((sum, point, i) => {
                            const next = zone.coordinates[(i + 1) % zone.coordinates.length];
                            return sum + (point[0] * next[1] - next[0] * point[1]);
                          }, 0) / 2
                        ).toFixed(0)}
                        px²
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {selectedCameraConfig.detectionZones.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No detection zones configured. Add a zone to get started.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Privacy & Data Protection</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data Retention: {selectedCameraConfig.privacy.dataRetentionDays} days
                </label>
                <input
                  type="range"
                  min={1}
                  max={365}
                  value={selectedCameraConfig.privacy.dataRetentionDays}
                  onChange={(e) =>
                    handleCameraConfigChange(
                      selectedCamera,
                      'privacy',
                      'dataRetentionDays',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">Automatic data deletion period</div>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'privacyMaskEnabled', label: 'Enable privacy masking' },
                  { key: 'anonymizeData', label: 'Anonymize exported data' },
                ].map((option) => (
                  <div key={option.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${selectedCamera}_${option.key}`}
                      checked={
                        selectedCameraConfig.privacy[
                          option.key as keyof typeof selectedCameraConfig.privacy
                        ] as boolean
                      }
                      onChange={(e) =>
                        handleCameraConfigChange(
                          selectedCamera,
                          'privacy',
                          option.key,
                          e.target.checked
                        )
                      }
                      className="rounded"
                    />
                    <label
                      htmlFor={`${selectedCamera}_${option.key}`}
                      className="text-sm text-gray-300"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {selectedCameraConfig.privacy.privacyMaskEnabled && (
              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-400 mb-2">Privacy Zones</h5>
                <p className="text-sm text-gray-300 mb-3">
                  Configure areas of the camera view that should be blurred for privacy.
                </p>

                {selectedCameraConfig.privacy.privacyZones.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No privacy zones configured. Areas can be added via the camera interface.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCameraConfig.privacy.privacyZones.map((zone, index) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between p-2 bg-gray-800/30 rounded"
                      >
                        <span className="text-sm text-gray-300">Privacy Zone {index + 1}</span>
                        <span className="text-xs text-gray-400">Blur: {zone.blurLevel * 100}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-700">
        <button
          onClick={() => resetCameraSettings(selectedCamera)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
        >
          Reset Camera Settings
        </button>

        <div className="text-sm text-gray-400">
          Camera: {selectedCameraConfig.name} •{' '}
          {selectedCameraConfig.enabled ? (
            <span className="text-green-400">Online</span>
          ) : (
            <span className="text-red-400">Offline</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraSettings;
