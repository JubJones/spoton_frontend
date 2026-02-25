// src/components/PersonStatistics.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { BackendCameraId, EnvironmentId } from '../types/api';
import { useCameraConfig } from '../context/CameraConfigContext';

interface PersonMetrics {
  totalDetections: number;
  uniquePersons: number;
  averageDetectionTime: number;
  detectionAccuracy: number;
  falsePositiveRate: number;
  personTurnover: number;
}

interface PersonDistribution {
  cameraId: BackendCameraId;
  personCount: number;
  percentage: number;
  avgConfidence: number;
  peakTime: string;
}

interface PersonBehaviorData {
  dwellTimeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  movementPatterns: Array<{
    pattern: string;
    count: number;
    description: string;
  }>;
  confidenceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

interface PersonStatisticsProps {
  environment: EnvironmentId;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  selectedCameras: Set<BackendCameraId>;
  className?: string;
  onPersonClick?: (personId: string) => void;
  onExportData?: (data: any) => void;
  personMetrics?: PersonMetrics;
  personDistribution?: PersonDistribution[];
  behaviorData?: PersonBehaviorData;
}

const PersonStatistics: React.FC<PersonStatisticsProps> = ({
  environment,
  timeRange,
  selectedCameras,
  className = '',
  onPersonClick,
  onExportData,
  personMetrics = {
    totalDetections: 0,
    uniquePersons: 0,
    averageDetectionTime: 0,
    detectionAccuracy: 0,
    falsePositiveRate: 0,
    personTurnover: 0,
  },
  personDistribution = [],
  behaviorData = {
    dwellTimeDistribution: [],
    movementPatterns: [],
    confidenceDistribution: [],
  },
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'behavior'>('overview');
  const [sortBy, setSortBy] = useState<'count' | 'confidence' | 'camera'>('count');
  const { environmentCameras, getDisplayName } = useCameraConfig();
  const cameraIds: BackendCameraId[] = environmentCameras[environment] ?? [];

  const sortedDistribution = useMemo(() => {
    return [...personDistribution].sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.personCount - a.personCount;
        case 'confidence':
          return b.avgConfidence - a.avgConfidence;
        case 'camera':
          return a.cameraId.localeCompare(b.cameraId);
        default:
          return 0;
      }
    });
  }, [personDistribution, sortBy]);

  // Get metric trend indicator
  const getTrendIndicator = (current: number, baseline: number) => {
    const change = ((current - baseline) / baseline) * 100;
    if (Math.abs(change) < 1) return { icon: '➡️', color: 'text-gray-400', text: 'stable' };
    if (change > 0) return { icon: '📈', color: 'text-green-400', text: `+${change.toFixed(1)}%` };
    return { icon: '📉', color: 'text-red-400', text: `${change.toFixed(1)}%` };
  };

  // Handle data export
  const handleExport = useCallback(() => {
    const exportData = {
      metrics: personMetrics,
      distribution: personDistribution,
      behavior: behaviorData,
      metadata: {
        environment,
        timeRange,
        selectedCameras: Array.from(selectedCameras),
        generatedAt: new Date().toISOString(),
      },
    };
    onExportData?.(exportData);
  }, [
    personMetrics,
    personDistribution,
    behaviorData,
    environment,
    timeRange,
    selectedCameras,
    onExportData,
  ]);

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Person Statistics</h3>
            <p className="text-sm text-gray-400">
              Detailed person detection and behavior analytics
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              📊 Export
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'distribution', label: 'Distribution', icon: '📍' },
            { key: 'behavior', label: 'Behavior', icon: '🔄' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1 text-sm rounded transition-colors flex items-center space-x-1 ${activeTab === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-400">
                  {personMetrics.totalDetections.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Total Detections</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(personMetrics.totalDetections, 1000).color}`}
                >
                  <span>{getTrendIndicator(personMetrics.totalDetections, 1000).icon}</span>
                  <span>{getTrendIndicator(personMetrics.totalDetections, 1000).text}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">
                  {personMetrics.uniquePersons}
                </div>
                <div className="text-sm text-gray-400">Unique Persons</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(personMetrics.uniquePersons, 75).color}`}
                >
                  <span>{getTrendIndicator(personMetrics.uniquePersons, 75).icon}</span>
                  <span>{getTrendIndicator(personMetrics.uniquePersons, 75).text}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">
                  {personMetrics.averageDetectionTime.toFixed(1)}m
                </div>
                <div className="text-sm text-gray-400">Avg Detection Time</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(personMetrics.averageDetectionTime, 4.0).color}`}
                >
                  <span>{getTrendIndicator(personMetrics.averageDetectionTime, 4.0).icon}</span>
                  <span>{getTrendIndicator(personMetrics.averageDetectionTime, 4.0).text}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">
                  {personMetrics.detectionAccuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Detection Accuracy</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(personMetrics.detectionAccuracy, 85).color}`}
                >
                  <span>{getTrendIndicator(personMetrics.detectionAccuracy, 85).icon}</span>
                  <span>{getTrendIndicator(personMetrics.detectionAccuracy, 85).text}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-400">
                  {personMetrics.falsePositiveRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">False Positive Rate</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(personMetrics.falsePositiveRate, 3.0).color}`}
                >
                  <span>{getTrendIndicator(personMetrics.falsePositiveRate, 3.0).icon}</span>
                  <span>{getTrendIndicator(personMetrics.falsePositiveRate, 3.0).text}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-cyan-400">
                  {personMetrics.personTurnover.toFixed(1)}/h
                </div>
                <div className="text-sm text-gray-400">Person Turnover</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(personMetrics.personTurnover, 12).color}`}
                >
                  <span>{getTrendIndicator(personMetrics.personTurnover, 12).icon}</span>
                  <span>{getTrendIndicator(personMetrics.personTurnover, 12).text}</span>
                </div>
              </div>
            </div>

            {/* Performance Quality Indicators */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Detection Quality</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Overall System Health</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 transition-all duration-500"
                        style={{ width: `${personMetrics.detectionAccuracy}%` }}
                      />
                    </div>
                    <span className="text-green-400 text-sm font-semibold">
                      {personMetrics.detectionAccuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Detection Reliability</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 transition-all duration-500"
                        style={{ width: `${100 - personMetrics.falsePositiveRate * 10}%` }}
                      />
                    </div>
                    <span className="text-blue-400 text-sm font-semibold">
                      {(100 - personMetrics.falsePositiveRate * 10).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Tracking Continuity</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 transition-all duration-500"
                        style={{ width: '92%' }}
                      />
                    </div>
                    <span className="text-purple-400 text-sm font-semibold">92.0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-300">Camera Distribution</h4>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1"
              >
                <option value="count">Sort by Count</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="camera">Sort by Camera</option>
              </select>
            </div>

            {/* Distribution Chart */}
            <div className="space-y-3">
              {sortedDistribution.map((dist) => (
                <div key={dist.cameraId} className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-semibold">
                        {getDisplayName(dist.cameraId)}
                      </span>
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                        Peak: {dist.peakTime}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-400 font-semibold">
                        {dist.personCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">{dist.percentage.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                        style={{ width: `${dist.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-green-400">
                      {Math.round(dist.avgConfidence * 100)}% conf
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'behavior' && (
          <div className="space-y-6">
            {/* Dwell Time Distribution */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Dwell Time Distribution</h4>
              <div className="space-y-2">
                {behaviorData.dwellTimeDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-gray-400 w-16">{item.range}</span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-blue-400 font-semibold">{item.count}</div>
                      <div className="text-xs text-gray-400">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Movement Patterns */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Movement Patterns</h4>
              <div className="space-y-3">
                {behaviorData.movementPatterns.map((pattern, index) => (
                  <div key={index} className="bg-gray-800/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold">{pattern.pattern}</span>
                      <span className="text-purple-400 font-semibold">{pattern.count}</span>
                    </div>
                    <div className="text-xs text-gray-400">{pattern.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Distribution */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Confidence Distribution</h4>
              <div className="space-y-2">
                {behaviorData.confidenceDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-gray-400 w-16">{item.range}</span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-green-400 font-semibold">{item.count}</div>
                      <div className="text-xs text-gray-400">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonStatistics;
