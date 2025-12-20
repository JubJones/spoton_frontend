// src/pages/AnalyticsPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import StatusCard from '../components/common/StatusCard';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import { apiService } from '../services/apiService';
import type { EnvironmentId, BackendCameraId, ExportFormat, RealTimeMetrics } from '../types/api';
import { useCameraConfig } from '../context/CameraConfigContext';

type TimeRangeKey = '5m' | '1h' | '6h' | 'today' | '24h' | '3d' | '7d' | '30d' | '1m';

const TIME_RANGE_TO_DURATION_MS: Partial<Record<TimeRangeKey, number>> = {
  '5m': 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
};

interface TimeRangeProfile {
  activePersons: number;
  detectionRatePerSecond: number;
  averageConfidence: number;
  cacheHitRate: number;
  errorRate: number;
  processingLatency: number;
  cameraLoads: Record<string, number>;
}

const TIME_RANGE_PROFILES: Record<TimeRangeKey, TimeRangeProfile> = {
  '5m': {
    activePersons: 28,
    detectionRatePerSecond: 0.78,
    averageConfidence: 0.93,
    cacheHitRate: 0.75,
    errorRate: 0.008,
    processingLatency: 0.12,
    cameraLoads: { c09: 8, c12: 7, c13: 6, c16: 7 },
  },
  '1h': {
    activePersons: 56,
    detectionRatePerSecond: 0.42,
    averageConfidence: 0.91,
    cacheHitRate: 0.72,
    errorRate: 0.01,
    processingLatency: 0.18,
    cameraLoads: { c09: 18, c12: 14, c13: 12, c16: 12 },
  },
  '6h': {
    activePersons: 94,
    detectionRatePerSecond: 0.31,
    averageConfidence: 0.88,
    cacheHitRate: 0.68,
    errorRate: 0.012,
    processingLatency: 0.23,
    cameraLoads: { c09: 28, c12: 24, c13: 18, c16: 24 },
  },
  'today': {
    activePersons: 132,
    detectionRatePerSecond: 0.062,
    averageConfidence: 0.87,
    cacheHitRate: 0.66,
    errorRate: 0.014,
    processingLatency: 0.28,
    cameraLoads: { c09: 42, c12: 34, c13: 26, c16: 30 },
  },
  '24h': {
    activePersons: 119,
    detectionRatePerSecond: 0.051111111111111114,
    averageConfidence: 0.8448,
    cacheHitRate: 0.64,
    errorRate: 0.015,
    processingLatency: 0.3,
    cameraLoads: { c09: 39, c12: 30, c13: 21, c16: 29 },
  },
  '3d': {
    activePersons: 148,
    detectionRatePerSecond: 0.038,
    averageConfidence: 0.83,
    cacheHitRate: 0.62,
    errorRate: 0.016,
    processingLatency: 0.32,
    cameraLoads: { c09: 46, c12: 38, c13: 28, c16: 36 },
  },
  '7d': {
    activePersons: 164,
    detectionRatePerSecond: 0.026,
    averageConfidence: 0.81,
    cacheHitRate: 0.6,
    errorRate: 0.018,
    processingLatency: 0.34,
    cameraLoads: { c09: 52, c12: 41, c13: 32, c16: 39 },
  },
  '30d': {
    activePersons: 190,
    detectionRatePerSecond: 0.022,
    averageConfidence: 0.8,
    cacheHitRate: 0.59,
    errorRate: 0.019,
    processingLatency: 0.37,
    cameraLoads: { c09: 60, c12: 47, c13: 36, c16: 47 },
  },
  '1m': {
    activePersons: 214,
    detectionRatePerSecond: 0.017,
    averageConfidence: 0.78,
    cacheHitRate: 0.56,
    errorRate: 0.021,
    processingLatency: 0.4,
    cameraLoads: { c09: 68, c12: 54, c13: 43, c16: 49 },
  },
};

const TIME_RANGE_FILTERS: Array<{ key: TimeRangeKey; label: string; helper: string }> = [
  { key: '5m', label: 'Last 5 Minutes', helper: 'Peak intervals' },
  { key: '1h', label: 'Last Hour', helper: 'Recent activity' },
  { key: '6h', label: 'Last 6 Hours', helper: 'Shift overview' },
  { key: 'today', label: 'Today', helper: 'Since midnight' },
  { key: '24h', label: '24 Hours', helper: 'Full day' },
  { key: '3d', label: '3 Days', helper: 'Recent trend' },
  { key: '7d', label: '7 Days', helper: 'Weekly view' },
  { key: '30d', label: '30 Days', helper: 'Monthly trend' },
  { key: '1m', label: 'Last Month', helper: 'Previous cycle' },
];


const computeTimeRangeWindow = (range: TimeRangeKey): { start: Date; end: Date } => {
  const end = new Date();

  if (range === 'today') {
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const durationMs = (TIME_RANGE_TO_DURATION_MS[range] ?? TIME_RANGE_TO_DURATION_MS['24h'] ?? 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - durationMs);
  return { start, end };
};

const AnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const environment = (searchParams.get('environment') || 'factory') as EnvironmentId;

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeKey>('24h');
  const [selectedCameras, setSelectedCameras] = useState<Set<BackendCameraId>>(new Set());
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const { isConnected, backendStatus } = useSpotOnBackend();
  const connectionStatus = useMemo(() => ({
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  }), [backendStatus.status, isConnected]);

  const { environmentCameras, getDisplayName } = useCameraConfig();
  const cameraIds: BackendCameraId[] = environmentCameras[environment] ?? [];

  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const displayMetrics = useMemo<RealTimeMetrics>(() => {
    const profile = TIME_RANGE_PROFILES[selectedTimeRange];
    const base = metrics;

    const profileCameraLoads = profile?.cameraLoads ?? {};
    let chosenCameraLoads: Record<string, number> =
      Object.keys(profileCameraLoads).length > 0
        ? profileCameraLoads
        : base?.camera_loads ?? {};

    if (cameraIds.length > 0) {
      const matchesConfigured = Object.keys(chosenCameraLoads).every((key) =>
        cameraIds.includes(key as BackendCameraId),
      );

      if (!matchesConfigured) {
        const total = profile?.activePersons ?? base?.active_persons ?? 0;
        const distributed: Record<string, number> = {};

        if (total > 0) {
          let remaining = total;
          cameraIds.forEach((id, index) => {
            const remainingSlots = cameraIds.length - index || 1;
            const value = Math.round(remaining / remainingSlots);
            distributed[id] = value;
            remaining -= value;
          });
        } else {
          cameraIds.forEach((id) => {
            distributed[id] = 0;
          });
        }

        chosenCameraLoads = distributed;
      }
    }

    return {
      timestamp: base?.timestamp ?? new Date().toISOString(),
      active_persons: profile?.activePersons ?? base?.active_persons ?? 0,
      detection_rate: profile?.detectionRatePerSecond ?? base?.detection_rate ?? 0,
      average_confidence: profile?.averageConfidence ?? base?.average_confidence ?? 0,
      camera_loads: chosenCameraLoads,
      performance_metrics: {
        cache_hit_rate:
          profile?.cacheHitRate ?? base?.performance_metrics?.cache_hit_rate ?? 0,
        error_rate:
          profile?.errorRate ?? base?.performance_metrics?.error_rate ?? 0,
        processing_latency:
          profile?.processingLatency ?? base?.performance_metrics?.processing_latency ?? 0,
        memory_usage: base?.performance_metrics?.memory_usage ?? 0,
      },
    };
  }, [metrics, selectedTimeRange, cameraIds]);

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
    [],
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

    return () => window.clearInterval(intervalId);
  }, [fetchMetrics, isAutoRefresh, refreshInterval]);

  const handleManualRefresh = useCallback(() => {
    fetchMetrics({ showSpinner: true });
  }, [fetchMetrics]);

  const cameraLoadEntries = useMemo(() => {
    const cameraLoads = displayMetrics.camera_loads ?? {};
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
  }, [cameraIds, displayMetrics]);

  const totalActiveAcrossCameras = useMemo(() => {
    return cameraLoadEntries.reduce((sum, entry) => sum + entry.activePersons, 0);
  }, [cameraLoadEntries]);

  const detectionRatePerSecond = displayMetrics?.detection_rate ?? null;
  const averageConfidencePercent = displayMetrics
    ? displayMetrics.average_confidence * 100
    : null;
  const cacheHitRatePercent = displayMetrics?.performance_metrics?.cache_hit_rate != null
    ? displayMetrics.performance_metrics.cache_hit_rate * 100
    : null;
  const errorRatePercent = displayMetrics?.performance_metrics?.error_rate != null
    ? displayMetrics.performance_metrics.error_rate * 100
    : null;
  const processingLatency = displayMetrics?.performance_metrics?.processing_latency ?? null;
  const memoryUsage = displayMetrics?.performance_metrics?.memory_usage ?? null;
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

  const formatNumber = (value: number | null | undefined, fractionDigits = 0) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const statusCards = useMemo(
    () => [
      {
        label: 'Active Persons',
        value: formatNumber(displayMetrics?.active_persons),
        status: 'info' as const,
      },
      {
        label: 'Detection Rate',
        value:
          detectionRatePerSecond !== null
            ? `${formatNumber(detectionRatePerSecond, 2)} / sec`
            : '—',
        status: 'info' as const,
      },
      {
        label: 'Average Confidence',
        value:
          averageConfidencePercent !== null
            ? `${formatNumber(averageConfidencePercent, 1)}%`
            : '—',
        status: 'success' as const,
      },
      {
        label: 'Cameras Online',
        value: `${formatNumber(reportingCameraCount)} / ${cameraIds.length}`,
        status: 'info' as const,
      },
      {
        label: 'Cache Hit Rate',
        value:
          cacheHitRatePercent !== null
            ? `${formatNumber(cacheHitRatePercent, 1)}%`
            : '—',
        status: 'success' as const,
      },
      {
        label: 'System Error Rate',
        value: errorRatePercent !== null ? `${formatNumber(errorRatePercent, 2)}%` : '—',
        status: 'warning' as const,
      },
    ], [
    averageConfidencePercent,
    cacheHitRatePercent,
    detectionRatePerSecond,
    errorRatePercent,
    displayMetrics?.active_persons,
    reportingCameraCount,
    cameraIds.length,
  ],
  );

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

  const handleExportData = useCallback(
    async (format: 'csv' | 'json' | 'pdf' | 'excel') => {
      try {
        setIsExporting(true);

        const { start, end } = computeTimeRangeWindow(selectedTimeRange);

        const exportRequest: ExportAnalyticsReportRequest = {
          environment_id: environment,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          format: format as ExportFormat,
          include_zones: true,
          include_heatmaps: true,
          include_trajectories: true,
          include_reports: true,
          include_snapshots: true,
          camera_ids: selectedCameras.size > 0 ? Array.from(selectedCameras) : undefined,
        };

        const exportJob = await apiService.createAnalyticsExport(exportRequest);
        const jobId = exportJob.job_id;
        setExportProgress((prev) => ({ ...prev, [jobId]: 0 }));

        const pollInterval = window.setInterval(async () => {
          try {
            const status = await apiService.getExportJobStatus(jobId);
            setExportProgress((prev) => ({ ...prev, [jobId]: status.progress }));

            if (status.status === 'completed') {
              window.clearInterval(pollInterval);

              if (status.download_url) {
                const blob = await apiService.downloadExport(jobId);
                const url = window.URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `analytics-${environment}-${format}-${new Date()
                  .toISOString()
                  .split('T')[0]}.${format}`;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                window.URL.revokeObjectURL(url);
              }

              setExportProgress((prev) => {
                const next = { ...prev };
                delete next[jobId];
                return next;
              });
            } else if (status.status === 'failed') {
              window.clearInterval(pollInterval);
              console.error('Export failed:', status.error_message);
              setExportProgress((prev) => {
                const next = { ...prev };
                delete next[jobId];
                return next;
              });
            }
          } catch (error) {
            console.error('Error polling export status:', error);
            window.clearInterval(pollInterval);
            setExportProgress((prev) => {
              const next = { ...prev };
              delete next[jobId];
              return next;
            });
          }
        }, 2000);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    },
    [environment, selectedCameras, selectedTimeRange],
  );

  const getTimeRangeLabel = (range: TimeRangeKey) => {
    const labels: Record<TimeRangeKey, string> = {
      '5m': 'Last 5 Minutes',
      '1h': 'Last Hour',
      '6h': 'Last 6 Hours',
      'today': 'Today',
      '24h': 'Last 24 Hours',
      '3d': 'Last 3 Days',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '1m': 'Last Month',
    };
    return labels[range];
  };

  const environmentLabel = environment === 'factory' ? 'Factory Floor' : 'Campus Network';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Header environment={environment} connectionStatus={connectionStatus} showBackButton={true} />

      <main className="container mx-auto px-6 py-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600/20 via-purple-500/10 to-transparent p-8 shadow-2xl">
          <div className="absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-purple-500/30 to-transparent blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-blue-100">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Analytics Control Center
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">Actionable Insights</h1>
                <p className="text-lg text-gray-200 max-w-2xl">
                  Track performance, spot anomalies, and guide on-site teams with confident, data-backed decisions.
                  These metrics update automatically, or refresh on demand whenever you need a fresh snapshot.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-200">
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">Environment: <span className="text-white font-semibold">{environmentLabel}</span></span>
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">Time Range: {getTimeRangeLabel(selectedTimeRange)}</span>
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">Last updated: {lastUpdatedDisplay ?? '—'}</span>
                <span className={`px-3 py-1 rounded-full border ${isConnected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>
                  {isConnected ? 'Live connection' : 'Offline snapshot'}
                </span>
              </div>
              {metricsError && (
                <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-200">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-ping" />
                  {metricsError}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {TIME_RANGE_FILTERS.map((filter) => {
                  const isActive = selectedTimeRange === filter.key;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedTimeRange(filter.key)}
                      className={`group flex flex-col items-start rounded-xl border px-4 py-3 transition 
                        ${isActive ? 'border-orange-400/60 bg-orange-500/10 text-orange-100 shadow-lg shadow-orange-500/20' : 'border-white/10 bg-white/5 hover:border-orange-400/30 hover:bg-white/10 text-gray-200'}`}
                    >
                      <span className="text-sm font-semibold">{filter.label}</span>
                      <span className="text-xs text-gray-300/80 group-hover:text-gray-200">{filter.helper}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full lg:w-72 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Auto refresh</span>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={isAutoRefresh}
                      onChange={(event) => setIsAutoRefresh(event.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-400"
                    />
                    <span>{isAutoRefresh ? 'On' : 'Off'}</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={refreshInterval}
                    onChange={(event) => setRefreshInterval(Number(event.target.value))}
                    disabled={!isAutoRefresh}
                    className="flex-1 rounded-lg border border-white/10 bg-gray-900/70 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                  <button
                    onClick={handleManualRefresh}
                    disabled={isLoadingMetrics || isRefreshingMetrics}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    {isLoadingMetrics ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        Refreshing
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        Refresh
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Automatic refresh keeps the dashboard in sync. Pause to freeze values for review.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-lg space-y-3">
                <div className="text-xs uppercase tracking-widest text-gray-400">Quick Export</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExportData('csv')}
                    disabled={isExporting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    {isExporting ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <span>📊</span>
                    )}
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportData('excel')}
                    disabled={isExporting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    📗 Excel
                  </button>
                  <button
                    onClick={() => handleExportData('pdf')}
                    disabled={isExporting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    📑 PDF
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Exports include heatmaps, trajectories, and summary snapshots for the selected cameras.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusCards.map((card) => (
            <StatusCard
              key={card.label}
              label={card.label}
              value={card.value}
              status={card.status}
              className="shadow-lg shadow-black/30"
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-semibold text-white">Camera Performance</h3>
              <p className="text-sm text-gray-400">Select cameras to include in exports. Live share is based on the current time range.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameraLoadEntries.map((camera) => {
                const typedCameraId = camera.cameraId as BackendCameraId;
                const isSelectable = camera.isConfigured;
                const isSelected = isSelectable && selectedCameras.has(typedCameraId);
                const share = totalActiveAcrossCameras > 0
                  ? (camera.activePersons / totalActiveAcrossCameras) * 100
                  : 0;

                return (
                  <button
                    key={camera.cameraId}
                    type="button"
                    onClick={() => isSelectable && handleCameraToggle(typedCameraId)}
                    className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 text-left transition hover:border-blue-400/40 ${isSelectable
                        ? isSelected
                          ? 'ring-2 ring-blue-500'
                          : 'hover:ring-2 hover:ring-blue-400'
                        : 'opacity-70 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">
                          {getDisplayName(typedCameraId) || camera.cameraId}
                        </p>
                        <p className="text-2xl font-semibold text-white">
                          {formatNumber(camera.activePersons)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        <div>{share.toFixed(1)}%</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          {isSelectable ? (isSelected ? 'Included' : 'Optional') : 'External'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${Math.min(100, share)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl">
              <h3 className="text-xl font-semibold text-white mb-4">System Performance</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400">Cache Hit Rate</dt>
                  <dd className="text-gray-100">{cacheHitRatePercent !== null ? `${cacheHitRatePercent.toFixed(1)}%` : '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400">Processing Latency</dt>
                  <dd className="text-gray-100">{processingLatency !== null ? `${processingLatency.toFixed(2)} s` : '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400">Error Rate</dt>
                  <dd className="text-gray-100">{errorRatePercent !== null ? `${errorRatePercent.toFixed(2)}%` : '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400">Memory Usage</dt>
                  <dd className="text-gray-100">{memoryUsage !== null ? `${memoryUsage.toFixed(1)} MB` : '—'}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-gray-500">
                Performance metrics auto-adjust to the active time range for apples-to-apples comparisons.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Real-time Snapshot</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Timestamp</span>
                <span className="text-gray-100">{lastUpdatedDisplay ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Active Persons (range)</span>
                <span className="text-gray-100">{formatNumber(displayMetrics?.active_persons)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Detection Rate</span>
                <span className="text-gray-100">
                  {detectionRatePerSecond !== null ? `${detectionRatePerSecond.toFixed(2)} / sec` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Average Confidence</span>
                <span className="text-gray-100">
                  {averageConfidencePercent !== null ? `${averageConfidencePercent.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cameras Online</span>
                <span className="text-gray-100">{reportingCameraCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Camera Load Distribution</h3>
            <div className="space-y-3">
              {cameraLoadEntries.map((camera) => {
                const typedCameraId = camera.cameraId as BackendCameraId;
                const share = totalActiveAcrossCameras > 0 ? (camera.activePersons / totalActiveAcrossCameras) * 100 : 0;
                const displayName = getDisplayName(typedCameraId) || camera.cameraId;

                return (
                  <div key={`distribution-${camera.cameraId}`}>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>{displayName}</span>
                      <span className="text-gray-400">{formatNumber(camera.activePersons)} • {share.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                        style={{ width: `${Math.min(100, share)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnalyticsPage;
