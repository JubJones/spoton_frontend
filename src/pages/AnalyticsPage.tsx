// src/pages/AnalyticsPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import PersonStatistics from '../components/PersonStatistics';
import TrafficHeatmap from '../components/TrafficHeatmap';
import DwellTimeAnalysis from '../components/DwellTimeAnalysis';
import TrafficFlowAnalysis from '../components/TrafficFlowAnalysis';
import AnalyticsCharts from '../components/AnalyticsCharts';
import AlertSettings from '../components/AlertSettings';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import { apiService } from '../services/apiService';
import type {
  EnvironmentId,
  BackendCameraId,
  ExportFormat,
  ExportAnalyticsReportRequest,
} from '../types/api';
import { useCameraConfig } from '../context/CameraConfigContext';

interface AnalyticsMetrics {
  totalDetections: number;
  uniquePersons: number;
  averageDwellTime: number;
  peakOccupancy: number;
  averageConfidence: number;
  systemUptime: number;
}

interface CameraAnalytics {
  cameraId: BackendCameraId;
  detectionCount: number;
  uniquePersons: number;
  averageConfidence: number;
  uptimePercentage: number;
  lastActivity: Date;
}

interface TimeRangeMetrics {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  totalDetections: number;
  peakHour: { hour: number; count: number };
  trends: Array<{ timestamp: Date; count: number; confidence: number }>;
}

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

  // Mock analytics data - in real implementation, this would come from the backend
  const analyticsMetrics: AnalyticsMetrics = useMemo(
    () => ({
      totalDetections: 1247,
      uniquePersons: 89,
      averageDwellTime: 4.2, // minutes
      peakOccupancy: 12,
      averageConfidence: 0.87,
      systemUptime: 99.2, // percentage
    }),
    []
  );

  const cameraAnalytics: CameraAnalytics[] = useMemo(() => {
    if (cameraIds.length === 0) {
      return [];
    }

    return cameraIds.map((cameraId, index) => ({
      cameraId,
      detectionCount: 280 + index * 45,
      uniquePersons: 15 + index * 8,
      averageConfidence: 0.82 + index * 0.03,
      uptimePercentage: 97.5 + index * 0.8,
      lastActivity: new Date(Date.now() - index * 300000), // 5 minutes apart
    }));
  }, [cameraIds]);

  const timeRangeMetrics: TimeRangeMetrics = useMemo(() => {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const range = ranges[selectedTimeRange];
    const dataPoints = selectedTimeRange === '1h' ? 12 : selectedTimeRange === '6h' ? 36 : 48;

    const trends = Array.from({ length: dataPoints }, (_, i) => ({
      timestamp: new Date(now - range + (i * range) / dataPoints),
      count: Math.floor(Math.random() * 20) + 5,
      confidence: 0.7 + Math.random() * 0.3,
    }));

    return {
      timeRange: selectedTimeRange,
      totalDetections: trends.reduce((sum, point) => sum + point.count, 0),
      peakHour: { hour: 14, count: 35 },
      trends,
    };
  }, [selectedTimeRange]);

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

        // Create export request
        const exportRequest: ExportAnalyticsReportRequest = {
          environment_id: environment,
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          end_time: new Date().toISOString(),
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
    [environment, selectedMetricType, selectedCameras]
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
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4" data-testid="metric-total-detections">
            <div className="text-2xl font-bold text-orange-400">
              {analyticsMetrics.totalDetections.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Detections</div>
            <div className="text-xs text-green-400 mt-1">+12% from yesterday</div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4" data-testid="metric-active-tracks">
            <div className="text-2xl font-bold text-blue-400">{analyticsMetrics.uniquePersons}</div>
            <div className="text-sm text-gray-400">Active Tracks</div>
            <div className="text-xs text-green-400 mt-1">+8% from yesterday</div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4" data-testid="metric-average-confidence">
            <div className="text-2xl font-bold text-purple-400">
              {Math.round(analyticsMetrics.averageConfidence * 100)}%
            </div>
            <div className="text-sm text-gray-400">Average Confidence</div>
            <div className="text-xs text-red-400 mt-1">-5% from yesterday</div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4" data-testid="metric-system-uptime">
            <div className="text-2xl font-bold text-green-400">
              99.7%
            </div>
            <div className="text-sm text-gray-400">System Uptime</div>
            <div className="text-xs text-gray-400 mt-1">At 2:00 PM</div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-400">
              {Math.round(analyticsMetrics.averageConfidence * 100)}%
            </div>
            <div className="text-sm text-gray-400">Avg Confidence</div>
            <div className="text-xs text-green-400 mt-1">+2% from yesterday</div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {analyticsMetrics.systemUptime.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">System Uptime</div>
            <div className="text-xs text-green-400 mt-1">Excellent</div>
          </div>
        </div>

        {/* Camera Performance Overview */}
        <div className="mb-6">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Camera Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cameraAnalytics.map((camera) => {
                const isSelected = selectedCameras.has(camera.cameraId);
                return (
                  <div
                    key={camera.cameraId}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-orange-400 bg-orange-500/10'
                        : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                    }`}
                    onClick={() => handleCameraToggle(camera.cameraId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">
                        {getDisplayName(camera.cameraId)}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          camera.uptimePercentage > 95
                            ? 'bg-green-400'
                            : camera.uptimePercentage > 90
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                        }`}
                      />
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Detections:</span>
                        <span className="text-orange-400">{camera.detectionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unique:</span>
                        <span className="text-blue-400">{camera.uniquePersons}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-green-400">
                          {Math.round(camera.averageConfidence * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Uptime:</span>
                        <span className="text-purple-400">
                          {camera.uptimePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Analytics Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Charts Component */}
          <AnalyticsCharts
            timeRangeMetrics={timeRangeMetrics}
            selectedMetricType={selectedMetricType}
            selectedCameras={selectedCameras}
            environment={environment}
            className="lg:col-span-2"
          />

          {/* Person Statistics */}
          <PersonStatistics
            environment={environment}
            timeRange={selectedTimeRange}
            selectedCameras={selectedCameras}
            className=""
          />

          {/* Traffic Heatmap */}
          <TrafficHeatmap
            environment={environment}
            timeRange={selectedTimeRange}
            selectedCameras={selectedCameras}
            className=""
          />
        </div>

        {/* Advanced Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dwell Time Analysis */}
          <DwellTimeAnalysis
            environment={environment}
            timeRange={selectedTimeRange}
            selectedCameras={selectedCameras}
            className=""
          />

          {/* Traffic Flow Analysis */}
          <TrafficFlowAnalysis
            environment={environment}
            timeRange={selectedTimeRange}
            selectedCameras={selectedCameras}
            className=""
          />
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
