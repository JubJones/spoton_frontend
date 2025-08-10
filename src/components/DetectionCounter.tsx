// src/components/DetectionCounter.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface DetectionStats {
  cameraId: BackendCameraId;
  currentCount: number;
  maxCount: number;
  avgCount: number;
  totalDetections: number;
  confidenceAvg: number;
  lastUpdate: Date;
  trend: 'up' | 'down' | 'stable';
  hourlyStats?: Array<{
    hour: number;
    count: number;
    avgConfidence: number;
  }>;
}

interface DetectionAlert {
  id: string;
  type: 'high_count' | 'low_count' | 'low_confidence' | 'no_activity';
  cameraId: BackendCameraId;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  acknowledged: boolean;
}

interface DetectionCounterProps {
  environment: EnvironmentId;
  detectionStats: DetectionStats[];
  alerts?: DetectionAlert[];
  className?: string;
  // Display options
  showTrends?: boolean;
  showConfidence?: boolean;
  showAlerts?: boolean;
  showHourlyBreakdown?: boolean;
  confidenceThreshold?: number;
  countThresholds?: {
    high: number;
    low: number;
  };
  // Event handlers
  onCameraClick?: (cameraId: BackendCameraId) => void;
  onAlertAcknowledge?: (alertId: string) => void;
  onThresholdChange?: (type: 'high' | 'low' | 'confidence', value: number) => void;
  onExportData?: (cameraIds: BackendCameraId[], timeRange: [Date, Date]) => void;
}

const DetectionCounter: React.FC<DetectionCounterProps> = ({
  environment,
  detectionStats = [],
  alerts = [],
  className = '',
  showTrends = true,
  showConfidence = true,
  showAlerts = true,
  showHourlyBreakdown = false,
  confidenceThreshold = 0.7,
  countThresholds = { high: 10, low: 1 },
  onCameraClick,
  onAlertAcknowledge,
  onThresholdChange,
  onExportData,
}) => {
  const [selectedCameraId, setSelectedCameraId] = useState<BackendCameraId | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const [sortBy, setSortBy] = useState<'camera' | 'count' | 'confidence' | 'trend'>('count');

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalCurrent = detectionStats.reduce((sum, stat) => sum + stat.currentCount, 0);
    const totalMax = Math.max(...detectionStats.map((stat) => stat.maxCount), 0);
    const avgConfidence =
      detectionStats.length > 0
        ? detectionStats.reduce((sum, stat) => sum + stat.confidenceAvg, 0) / detectionStats.length
        : 0;
    const activeCameras = detectionStats.filter((stat) => stat.currentCount > 0).length;

    return {
      totalCurrent,
      totalMax,
      avgConfidence,
      activeCameras,
      totalCameras: detectionStats.length,
    };
  }, [detectionStats]);

  // Get trend icon and color
  const getTrendDisplay = useCallback((trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return { icon: '📈', color: 'text-green-400' };
      case 'down':
        return { icon: '📉', color: 'text-red-400' };
      case 'stable':
        return { icon: '➡️', color: 'text-gray-400' };
    }
  }, []);

  // Get count status color
  const getCountStatusColor = useCallback(
    (count: number, maxCount: number) => {
      if (count >= countThresholds.high) return 'text-red-400';
      if (count <= countThresholds.low) return 'text-yellow-400';
      if (count >= maxCount * 0.8) return 'text-orange-400';
      return 'text-green-400';
    },
    [countThresholds]
  );

  // Get confidence status color
  const getConfidenceColor = useCallback(
    (confidence: number) => {
      if (confidence >= 0.8) return 'text-green-400';
      if (confidence >= confidenceThreshold) return 'text-yellow-400';
      return 'text-red-400';
    },
    [confidenceThreshold]
  );

  // Get alert severity color
  const getAlertColor = useCallback((severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500 bg-blue-500/10';
    }
  }, []);

  // Sort detection stats
  const sortedStats = useMemo(() => {
    return [...detectionStats].sort((a, b) => {
      switch (sortBy) {
        case 'camera':
          return a.cameraId.localeCompare(b.cameraId);
        case 'count':
          return b.currentCount - a.currentCount;
        case 'confidence':
          return b.confidenceAvg - a.confidenceAvg;
        case 'trend':
          const trendOrder = { up: 3, stable: 2, down: 1 };
          return trendOrder[b.trend] - trendOrder[a.trend];
        default:
          return 0;
      }
    });
  }, [detectionStats, sortBy]);

  // Filter unacknowledged alerts
  const activeAlerts = useMemo(() => {
    return alerts.filter((alert) => !alert.acknowledged);
  }, [alerts]);

  // Handle camera selection
  const handleCameraClick = useCallback(
    (cameraId: BackendCameraId) => {
      setSelectedCameraId(selectedCameraId === cameraId ? null : cameraId);
      onCameraClick?.(cameraId);
    },
    [selectedCameraId, onCameraClick]
  );

  // Handle alert acknowledgment
  const handleAlertAcknowledge = useCallback(
    (alertId: string) => {
      onAlertAcknowledge?.(alertId);
    },
    [onAlertAcknowledge]
  );

  // Format timestamp
  const formatTime = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Detection Counter</h3>
            <p className="text-sm text-gray-400">Real-time person count across all cameras</p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="count">Sort by Count</option>
              <option value="camera">Sort by Camera</option>
              <option value="confidence">Sort by Confidence</option>
              <option value="trend">Sort by Trend</option>
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{overallStats.totalCurrent}</div>
            <div className="text-gray-400">Current Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{overallStats.totalMax}</div>
            <div className="text-gray-400">Peak Count</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getConfidenceColor(overallStats.avgConfidence)}`}>
              {Math.round(overallStats.avgConfidence * 100)}%
            </div>
            <div className="text-gray-400">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{overallStats.activeCameras}</div>
            <div className="text-gray-400">Active Cameras</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${
                activeAlerts.length > 0 ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {activeAlerts.length}
            </div>
            <div className="text-gray-400">Alerts</div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {showAlerts && activeAlerts.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Active Alerts</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        alert.severity === 'high'
                          ? 'bg-red-500'
                          : alert.severity === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-white text-sm font-medium">
                      {getCameraDisplayName(alert.cameraId, environment)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{formatTime(alert.timestamp)}</span>
                    <button
                      onClick={() => handleAlertAcknowledge(alert.id)}
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
                    >
                      ✓
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-300 mt-1">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Statistics */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Camera Breakdown</h4>

        <div className="space-y-3">
          {sortedStats.map((stat) => {
            const isSelected = selectedCameraId === stat.cameraId;
            const trendDisplay = getTrendDisplay(stat.trend);
            const countColor = getCountStatusColor(stat.currentCount, stat.maxCount);
            const confidenceColor = getConfidenceColor(stat.confidenceAvg);

            return (
              <div
                key={stat.cameraId}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-orange-400 bg-orange-500/10'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                }`}
                onClick={() => handleCameraClick(stat.cameraId)}
              >
                {/* Camera Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        stat.currentCount > 0 ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-white font-semibold">
                      {getCameraDisplayName(stat.cameraId, environment)}
                    </span>
                    {showTrends && (
                      <div className={`flex items-center space-x-1 ${trendDisplay.color}`}>
                        <span>{trendDisplay.icon}</span>
                        <span className="text-xs">{stat.trend}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">Updated {formatTime(stat.lastUpdate)}</div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Current:</span>
                    <div className={`font-bold ${countColor}`}>{stat.currentCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Peak:</span>
                    <div className="text-blue-400 font-bold">{stat.maxCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Average:</span>
                    <div className="text-purple-400 font-bold">{Math.round(stat.avgCount)}</div>
                  </div>
                  {showConfidence && (
                    <div>
                      <span className="text-gray-500">Confidence:</span>
                      <div className={`font-bold ${confidenceColor}`}>
                        {Math.round(stat.confidenceAvg * 100)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Hourly Breakdown */}
                {isSelected && showHourlyBreakdown && stat.hourlyStats && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <h5 className="text-xs font-semibold text-gray-400 mb-2">Hourly Breakdown</h5>
                    <div className="flex space-x-1 overflow-x-auto">
                      {stat.hourlyStats.map((hourStat) => (
                        <div
                          key={hourStat.hour}
                          className="flex-shrink-0 text-center"
                          style={{ minWidth: '32px' }}
                        >
                          <div
                            className={`h-8 bg-blue-500 rounded-t`}
                            style={{
                              height: `${Math.max(4, (hourStat.count / stat.maxCount) * 32)}px`,
                              opacity: hourStat.count > 0 ? 0.7 : 0.3,
                            }}
                          />
                          <div className="text-xs text-gray-500 mt-1">{hourStat.hour}h</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Controls */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Data for {detectionStats.length} camera{detectionStats.length !== 1 ? 's' : ''}
          </div>

          <button
            onClick={() => {
              const now = new Date();
              const start = new Date(
                now.getTime() -
                  (timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24) * 60 * 60 * 1000
              );
              onExportData?.(
                detectionStats.map((stat) => stat.cameraId),
                [start, now]
              );
            }}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold"
          >
            📊 Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetectionCounter;
