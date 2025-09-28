// src/pages/AnalyticsPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import AlertSettings from '../components/AlertSettings';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import { apiService } from '../services/apiService';
import type {
  EnvironmentId,
  BackendCameraId,
  ExportFormat,
  ExportAnalyticsReportRequest,
  RealTimeMetrics,
} from '../types/api';
import { useCameraConfig } from '../context/CameraConfigContext';

const TIME_RANGE_TO_DURATION_MS: Record<'1h' | '6h' | '24h' | '7d' | '30d', number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const AnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const environment = (searchParams.get('environment') || 'factory') as EnvironmentId;
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>(
    '24h'
  );
  const [selectedMetricType, setSelectedMetricType] = useState<
    'detections' | 'occupancy' | 'flow' | 'dwell'
  >('detections');
  const [selectedCameras, setSelectedCameras] = useState<Set<BackendCameraId>>(new Set());
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ [key: string]: number }>({});

  const { isConnected, backendStatus } = useSpotOnBackend();

  // Create connection status for Header component
  const connectionStatus = {
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  };

  const { environmentCameras, getDisplayName } = useCameraConfig();
  const cameraIds: BackendCameraId[] = environmentCameras[environment] ?? [];

  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState<boolean>(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchMetrics = useCallback(
    async (options: { showSpinner?: boolean } = {}) => {
      const { showSpinner = false } = options;
      try {
        if (showSpinner) {
          setIsLoadingMetrics(true);
        } else {
          setIsRefreshingMetrics(true);
        }

        const data = await apiService.getRealTimeMetrics();
        setMetrics(data);
        setMetricsError(null);
        setLastUpdated(data.timestamp);
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error);
        setMetricsError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        if (showSpinner) {
          setIsLoadingMetrics(false);
        } else {
          setIsRefreshingMetrics(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchMetrics({ showSpinner: true });
  }, [fetchMetrics]);

  useEffect(() => {
    if (!isAutoRefresh) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchMetrics();
    }, refreshInterval * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchMetrics, isAutoRefresh, refreshInterval]);

  const handleManualRefresh = useCallback(() => {
    fetchMetrics({ showSpinner: true });
  }, [fetchMetrics]);

  const cameraLoadEntries = useMemo(() => {
    if (!metrics) {
      return [] as Array<{ cameraId: string; activePersons: number; isConfigured: boolean }>;
    }

    const cameraLoads = metrics.camera_loads ?? {};
    const configuredSet = new Set(cameraIds);
    const entries: Array<{ cameraId: string; activePersons: number; isConfigured: boolean }> =
      cameraIds.map((cameraId) => ({
        cameraId,
        activePersons: cameraLoads[cameraId] ?? 0,
        isConfigured: true,
      }));

    Object.entries(cameraLoads).forEach(([cameraId, activePersons]) => {
      if (!configuredSet.has(cameraId as BackendCameraId)) {
        entries.push({ cameraId, activePersons, isConfigured: false });
      }
    });

    return entries.sort((a, b) => b.activePersons - a.activePersons);
  }, [cameraIds, metrics]);

  const totalActiveAcrossCameras = useMemo(() => {
    return cameraLoadEntries.reduce((sum, entry) => sum + entry.activePersons, 0);
  }, [cameraLoadEntries]);

  const detectionRatePerSecond = metrics?.detection_rate ?? null;
  const detectionRatePerMinute = detectionRatePerSecond !== null ? detectionRatePerSecond * 60 : null;
  const averageConfidencePercent = metrics ? metrics.average_confidence * 100 : null;
  const cacheHitRatePercent = metrics?.performance_metrics?.cache_hit_rate != null
    ? metrics.performance_metrics.cache_hit_rate * 100
    : null;
  const errorRatePercent = metrics?.performance_metrics?.error_rate != null
    ? metrics.performance_metrics.error_rate * 100
    : null;
  const processingLatency = metrics?.performance_metrics?.processing_latency ?? null;
  const memoryUsage = metrics?.performance_metrics?.memory_usage ?? null;
  const reportingCameraCount = cameraLoadEntries.length;
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastUpdated) {
      return null;
    }
    try {
      return new Date(lastUpdated).toLocaleTimeString();
    } catch (error) {
      console.warn('Failed to parse last updated timestamp', error);
      return lastUpdated;
    }
  }, [lastUpdated]);
  const showInitialLoading = isLoadingMetrics && metrics === null;

  const metricCards = useMemo(() => {
    const formatNumber = (value: number | null | undefined, fractionDigits = 0) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
      }
      return value.toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
    };

    return [
      {
        id: 'active-persons',
        label: 'Active Persons',
        value: formatNumber(metrics?.active_persons),
        accent: 'text-orange-400',
        subLabel:
          totalActiveAcrossCameras > 0
            ? `${totalActiveAcrossCameras.toLocaleString()} across cameras`
            : null,
      },
      {
        id: 'detection-rate',
        label: 'Detection Rate',
        value:
          detectionRatePerSecond !== null
            ? `${formatNumber(detectionRatePerSecond, 2)} / sec`
            : '—',
        accent: 'text-blue-400',
        subLabel:
          detectionRatePerMinute !== null
            ? `${formatNumber(detectionRatePerMinute, 1)} / min`
            : null,
      },
      {
        id: 'avg-confidence',
        label: 'Average Confidence',
        value:
          averageConfidencePercent !== null
            ? `${formatNumber(averageConfidencePercent, 1)}%`
            : '—',
        accent: 'text-purple-400',
        subLabel: null,
      },
      {
        id: 'camera-coverage',
        label: 'Cameras Reporting',
        value: `${formatNumber(reportingCameraCount)} / ${cameraIds.length}`,
        accent: 'text-green-400',
        subLabel:
          totalActiveAcrossCameras > 0
            ? `${formatNumber(totalActiveAcrossCameras)} active persons tracked`
            : null,
      },
      {
        id: 'cache-hit-rate',
        label: 'Cache Hit Rate',
        value:
          cacheHitRatePercent !== null
            ? `${formatNumber(cacheHitRatePercent, 1)}%`
            : '—',
        accent: 'text-cyan-400',
        subLabel: null,
      },
      {
        id: 'error-rate',
        label: 'System Error Rate',
        value:
          errorRatePercent !== null ? `${formatNumber(errorRatePercent, 2)}%` : '—',
        accent: 'text-yellow-400',
        subLabel:
          processingLatency !== null
            ? `Latency: ${formatNumber(processingLatency, 2)} s`
            : undefined,
      },
    ];
  }, [
    averageConfidencePercent,
    cacheHitRatePercent,
    cameraIds.length,
    detectionRatePerMinute,
    detectionRatePerSecond,
    errorRatePercent,
    metrics?.active_persons,
    processingLatency,
    reportingCameraCount,
    totalActiveAcrossCameras,
  ]);

  // Handle camera selection
  const handleCameraToggle = useCallback((cameraId: BackendCameraId) => {
    setSelectedCameras((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cameraId)) {
        newSet.delete(cameraId);
      } else {
        newSet.add(cameraId);
      }
      return newSet;
    });
  }, []);

  // Handle export functionality
  const handleExportData = useCallback(
    async (format: 'csv' | 'json' | 'pdf' | 'excel') => {
      try {
        setIsExporting(true);

        const now = Date.now();
        const durationMs = TIME_RANGE_TO_DURATION_MS[selectedTimeRange];

        // Create export request
        const exportRequest: ExportAnalyticsReportRequest = {
          environment_id: environment,
          start_time: new Date(now - durationMs).toISOString(),
          end_time: new Date(now).toISOString(),
          format: format as ExportFormat,
          include_zones: true,
          include_heatmaps: selectedMetricType === 'occupancy',
          include_trajectories: selectedMetricType === 'flow',
          camera_ids: selectedCameras.size > 0 ? Array.from(selectedCameras) : undefined,
        };

        // Start export job
        const exportJob = await apiService.createAnalyticsExport(exportRequest);

        // Poll for completion
        const jobId = exportJob.job_id;
        setExportProgress((prev) => ({ ...prev, [jobId]: 0 }));

        const pollInterval = setInterval(async () => {
          try {
            const status = await apiService.getExportJobStatus(jobId);
            setExportProgress((prev) => ({ ...prev, [jobId]: status.progress }));

            if (status.status === 'completed') {
              clearInterval(pollInterval);

              // Download file
              if (status.download_url) {
                const blob = await apiService.downloadExport(jobId);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-${environment}-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }

              setExportProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[jobId];
                return newProgress;
              });
            } else if (status.status === 'failed') {
              clearInterval(pollInterval);
              console.error('Export failed:', status.error_message);
              setExportProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[jobId];
                return newProgress;
              });
            }
          } catch (error) {
            console.error('Error polling export status:', error);
            clearInterval(pollInterval);
            setExportProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[jobId];
              return newProgress;
            });
          }
        }, 2000); // Poll every 2 seconds
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    },
    [environment, selectedMetricType, selectedCameras, selectedTimeRange]
  );

  // Handle alert configuration
  const handleConfigureAlerts = useCallback(() => {
    setShowAlertSettings(true);
  }, []);

  // Handle alert settings change
  const handleAlertSettingsChange = useCallback(() => {
    // Handle settings changes if needed
    console.log('Alert settings changed');
  }, []);

  // Format time range label
  const getTimeRangeLabel = (range: string) => {
    const labels = {
      '1h': 'Last Hour',
      '6h': 'Last 6 Hours',
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
    };
    return labels[range as keyof typeof labels] || range;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Header environment={environment} connectionStatus={connectionStatus} showBackButton={true} />

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-gray-400">
                Real-time insights and historical analysis for{' '}
                {environment === 'factory' ? 'Factory' : 'Campus'} environment
              </p>
            </div>

            {/* Global Controls */}
            <div className="flex items-center space-x-4">
              {/* Auto Refresh Toggle */}
              <label className="flex items-center space-x-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={isAutoRefresh}
                  onChange={(e) => setIsAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Auto-refresh</span>
              </label>

              {/* Refresh Interval */}
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!isAutoRefresh}
                className="bg-gray-700 text-white text-sm rounded px-3 py-1 disabled:opacity-50"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>

              {/* Manual Refresh */}
              <button
                onClick={handleManualRefresh}
                disabled={isLoadingMetrics || isRefreshingMetrics}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center space-x-2"
              >
                {isLoadingMetrics ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Refresh</span>
                  </>
                )}
              </button>

              <div className="text-xs text-gray-400 min-w-[120px]">
                <span>Last updated:</span>{' '}
                <span className="text-gray-200">{lastUpdatedDisplay ?? '—'}</span>
                {isRefreshingMetrics && !isLoadingMetrics && (
                  <span className="ml-2 text-blue-400">(auto)</span>
                )}
              </div>

              {/* Export Actions */}
              <div className="flex space-x-2">
                <div className="relative group">
                  <button
                    disabled={isExporting}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center space-x-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <span>📊</span>
                        <span>Export</span>
                        <span className="text-xs">▼</span>
                      </>
                    )}
                  </button>
                  {/* Export dropdown */}
                  <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity min-w-32">
                    <button
                      onClick={() => handleExportData('csv')}
                      disabled={isExporting}
                      className="block w-full px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50 text-left"
                    >
                      📊 Export CSV
                    </button>
                    <button
                      onClick={() => handleExportData('json')}
                      disabled={isExporting}
                      className="block w-full px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50 text-left"
                    >
                      📄 Export JSON
                    </button>
                    <button
                      onClick={() => handleExportData('excel')}
                      disabled={isExporting}
                      className="block w-full px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50 text-left"
                    >
                      📗 Export Excel
                    </button>
                    <button
                      onClick={() => handleExportData('pdf')}
                      disabled={isExporting}
                      className="block w-full px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50 text-left"
                    >
                      📑 Export PDF
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleConfigureAlerts}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm flex items-center space-x-2"
                >
                  <span>⚠️</span>
                  <span>Alerts</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span>Analytics data may be outdated - backend connection lost</span>
              </div>
            </div>
          )}

          {metricsError && (
            <div className="bg-red-500/10 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span>{metricsError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Time Range and Metric Type Controls */}
        <div className="flex items-center justify-between mb-6">
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            <span className="text-gray-400 text-sm self-center mr-2">Time Range:</span>
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {getTimeRangeLabel(range)}
              </button>
            ))}
          </div>

          {/* Metric Type Selector */}
          <div className="flex space-x-2">
            <span className="text-gray-400 text-sm self-center mr-2">Focus:</span>
            {(
              [
                { value: 'detections', label: 'Detections', icon: '👤' },
                { value: 'occupancy', label: 'Occupancy', icon: '📊' },
                { value: 'flow', label: 'Traffic Flow', icon: '🔄' },
                { value: 'dwell', label: 'Dwell Time', icon: '⏱️' },
              ] as const
            ).map((metric) => (
              <button
                key={metric.value}
                onClick={() => setSelectedMetricType(metric.value)}
                className={`px-3 py-1 text-sm rounded transition-colors flex items-center space-x-1 ${
                  selectedMetricType === metric.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span>{metric.icon}</span>
                <span>{metric.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {metricCards.map((card) => (
            <div
              key={card.id}
              className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4"
            >
              <div
                className={`text-2xl font-bold ${card.accent} ${
                  showInitialLoading ? 'animate-pulse text-gray-500' : ''
                }`}
              >
                {showInitialLoading ? '—' : card.value}
              </div>
              <div className="text-sm text-gray-400">{card.label}</div>
              {card.subLabel && (
                <div className="text-xs text-gray-500 mt-1">{card.subLabel}</div>
              )}
            </div>
          ))}
        </div>

        {!metrics && !isLoadingMetrics && (
          <div className="text-sm text-gray-400 mb-6">
            No real-time metrics available yet. Trigger a manual refresh or verify the backend is
            publishing analytics data.
          </div>
        )}

        {/* Camera Performance Overview */}
        <div className="mb-6">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Camera Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cameraLoadEntries.map((camera) => {
                const typedCameraId = camera.cameraId as BackendCameraId;
                const isSelectable = camera.isConfigured;
                const isSelected = isSelectable && selectedCameras.has(typedCameraId);
                const share =
                  totalActiveAcrossCameras > 0
                    ? (camera.activePersons / totalActiveAcrossCameras) * 100
                    : 0;
                const loadIndicator =
                  camera.activePersons >= 8
                    ? 'bg-red-400'
                    : camera.activePersons >= 4
                      ? 'bg-yellow-400'
                      : camera.activePersons > 0
                        ? 'bg-green-400'
                        : 'bg-gray-500';

                const cardClasses = [
                  'p-3 rounded-lg border transition-colors',
                  isSelectable
                    ? isSelected
                      ? 'border-orange-400 bg-orange-500/10'
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 cursor-pointer'
                    : 'border-dashed border-gray-600 bg-gray-800/20 cursor-not-allowed opacity-75',
                ].join(' ');

                const displayName = getDisplayName(typedCameraId) || camera.cameraId;

                return (
                  <div
                    key={camera.cameraId}
                    className={cardClasses}
                    onClick={() => {
                      if (isSelectable) {
                        handleCameraToggle(typedCameraId);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">{displayName}</span>
                      <div className={`w-2 h-2 rounded-full ${loadIndicator}`} />
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Persons:</span>
                        <span className="text-orange-400 font-semibold">
                          {camera.activePersons}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Share:</span>
                        <span className="text-blue-400">{share.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-gray-300">
                          {camera.activePersons === 0
                            ? 'Idle'
                            : camera.activePersons >= 8
                              ? 'High load'
                              : camera.activePersons >= 4
                                ? 'Moderate'
                                : 'Normal'}
                        </span>
                      </div>
                      {!camera.isConfigured && (
                        <div className="text-xs text-yellow-400">
                          Not configured in current environment
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Performance Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Cache Hit Rate</dt>
                <dd className="text-gray-200">
                  {cacheHitRatePercent !== null ? `${cacheHitRatePercent.toFixed(1)}%` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Processing Latency</dt>
                <dd className="text-gray-200">
                  {processingLatency !== null ? `${processingLatency.toFixed(2)} s` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Error Rate</dt>
                <dd className="text-gray-200">
                  {errorRatePercent !== null ? `${errorRatePercent.toFixed(2)}%` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-400">Memory Usage</dt>
                <dd className="text-gray-200">
                  {memoryUsage !== null ? `${memoryUsage.toFixed(1)} MB` : '—'}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-gray-500 mt-4">
              Metrics refresh automatically based on the selected interval. Manual refresh is available at
              any time for on-demand snapshots.
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Real-time Snapshot</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Timestamp</span>
                <span className="text-gray-200">{lastUpdatedDisplay ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Active Persons</span>
                <span className="text-gray-200">
                  {metrics?.active_persons != null ? metrics.active_persons.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Detection Rate</span>
                <span className="text-gray-200">
                  {detectionRatePerSecond !== null
                    ? `${detectionRatePerSecond.toFixed(2)} / sec`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Average Confidence</span>
                <span className="text-gray-200">
                  {averageConfidencePercent !== null
                    ? `${averageConfidencePercent.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cameras Reporting</span>
                <span className="text-gray-200">{reportingCameraCount}</span>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-2">Camera Load Distribution</h4>
              <div className="space-y-2">
                {cameraLoadEntries.map((camera) => {
                  const share =
                    totalActiveAcrossCameras > 0
                      ? (camera.activePersons / totalActiveAcrossCameras) * 100
                      : 0;
                  const typedCameraId = camera.cameraId as BackendCameraId;
                  const displayName = getDisplayName(typedCameraId) || camera.cameraId;

                  return (
                    <div key={`${camera.cameraId}-distribution`} className="text-xs">
                      <div className="flex items-center justify-between text-gray-300">
                        <span>{displayName}</span>
                        <span>{camera.activePersons}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-700 rounded overflow-hidden mt-1">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.min(100, share)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {cameraLoadEntries.length === 0 && (
                  <div className="text-xs text-gray-500">No camera load data available.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Export Progress Indicator */}
        {Object.keys(exportProgress).length > 0 && (
          <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl z-40">
            <div className="text-white font-semibold mb-2">Export Progress</div>
            {Object.entries(exportProgress).map(([jobId, progress]) => (
              <div key={jobId} className="mb-2">
                <div className="flex justify-between text-sm text-gray-300 mb-1">
                  <span>Export Job</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-48 h-2 bg-gray-700 rounded">
                  <div
                    className="h-full bg-green-500 rounded transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alert Settings Modal */}
        {showAlertSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Alert Configuration</h2>
                <button
                  onClick={() => setShowAlertSettings(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                <AlertSettings
                  environment={environment}
                  isConnected={isConnected}
                  onSettingsChange={handleAlertSettingsChange}
                  hasUnsavedChanges={false}
                  isSubmitting={false}
                />
              </div>
              <div className="flex justify-end space-x-2 p-4 border-t border-gray-700">
                <button
                  onClick={() => setShowAlertSettings(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Save alert settings
                    console.log('Saving alert settings');
                    setShowAlertSettings(false);
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalyticsPage;
