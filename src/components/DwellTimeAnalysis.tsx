// src/components/DwellTimeAnalysis.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { BackendCameraId, EnvironmentId } from '../types/api';
import { useCameraConfig } from '../context/CameraConfigContext';

interface DwellTimeData {
  cameraId: BackendCameraId;
  averageDwellTime: number; // minutes
  medianDwellTime: number;
  minDwellTime: number;
  maxDwellTime: number;
  dwellTimeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
    avgConfidence: number;
  }>;
  timeOfDayPatterns: Array<{
    hour: number;
    avgDwellTime: number;
    personCount: number;
  }>;
}

interface DwellTimeTrends {
  hourlyTrends: Array<{
    hour: number;
    avgDwellTime: number;
    personCount: number;
    confidenceScore: number;
  }>;
  dailyComparison: {
    today: number;
    yesterday: number;
    weekAvg: number;
    trend: 'up' | 'down' | 'stable';
  };
  behaviorInsights: Array<{
    category: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }>;
}

interface DwellTimeAnalysisProps {
  environment: EnvironmentId;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  selectedCameras: Set<BackendCameraId>;
  className?: string;
  // Display options
  showHourlyBreakdown?: boolean;
  showDistributionChart?: boolean;
  showTrendAnalysis?: boolean;
  groupByCamera?: boolean;
  // Event handlers
  onDwellTimeRangeClick?: (range: string, cameraId?: BackendCameraId) => void;
  onTimeOfDayClick?: (hour: number, cameraId?: BackendCameraId) => void;
  onExportAnalysis?: (data: any) => void;
}

const DwellTimeAnalysis: React.FC<DwellTimeAnalysisProps> = ({
  environment,
  timeRange,
  selectedCameras,
  className = '',
  showHourlyBreakdown = true,
  showDistributionChart = true,
  showTrendAnalysis = true,
  groupByCamera = true,
  onDwellTimeRangeClick,
  onTimeOfDayClick,
  onExportAnalysis,
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'distribution' | 'trends' | 'insights'>(
    'overview'
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  const { environmentCameras, getDisplayName } = useCameraConfig();
  const cameraIds: BackendCameraId[] = environmentCameras[environment] ?? [];

  // Generate mock dwell time data
  const dwellTimeData: DwellTimeData[] = useMemo(() => {
    const cameras = cameraIds.length ? cameraIds : ([] as BackendCameraId[]);

    return cameras.map((cameraId, index) => {
      const baseAvgDwell = 3.5 + index * 0.8;
      const variability = 0.5 + index * 0.2;

      return {
        cameraId,
        averageDwellTime: baseAvgDwell,
        medianDwellTime: baseAvgDwell * 0.8,
        minDwellTime: 0.5,
        maxDwellTime: baseAvgDwell * 3.2,
        dwellTimeDistribution: [
          {
            range: '< 1 min',
            count: 145 + index * 20,
            percentage: 25.2 + index * 2,
            avgConfidence: 0.92,
          },
          {
            range: '1-3 min',
            count: 198 + index * 15,
            percentage: 34.5 + index * 1.5,
            avgConfidence: 0.89,
          },
          {
            range: '3-5 min',
            count: 124 + index * 10,
            percentage: 21.6 - index * 1,
            avgConfidence: 0.87,
          },
          {
            range: '5-10 min',
            count: 78 + index * 8,
            percentage: 13.6 - index * 0.8,
            avgConfidence: 0.85,
          },
          {
            range: '> 10 min',
            count: 32 + index * 5,
            percentage: 5.1 - index * 0.2,
            avgConfidence: 0.83,
          },
        ],
        timeOfDayPatterns: Array.from({ length: 24 }, (_, hour) => {
          const businessHours = hour >= 8 && hour <= 18;
          const lunchTime = hour >= 12 && hour <= 14;
          const baseCount = businessHours ? 15 + Math.random() * 25 : 2 + Math.random() * 8;
          const dwellMultiplier = lunchTime ? 1.4 : businessHours ? 1.0 : 0.6;

          return {
            hour,
            avgDwellTime: baseAvgDwell * dwellMultiplier + (Math.random() - 0.5) * variability,
            personCount: Math.round(baseCount),
          };
        }),
      };
    });
  }, [cameraIds]);

  // Generate trend analysis data
  const dwellTimeTrends: DwellTimeTrends = useMemo(() => {
    const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
      const businessHours = hour >= 8 && hour <= 18;
      const avgDwell = businessHours
        ? 4.2 + Math.sin((hour / 24) * Math.PI * 2) * 1.5
        : 2.1 + Math.random() * 1.0;

      return {
        hour,
        avgDwellTime: avgDwell,
        personCount: Math.round(businessHours ? 20 + Math.random() * 30 : 3 + Math.random() * 7),
        confidenceScore: 0.85 + Math.random() * 0.1,
      };
    });

    const todayAvg = 4.2;
    const yesterdayAvg = 3.9;
    const weekAvg = 4.0;

    return {
      hourlyTrends,
      dailyComparison: {
        today: todayAvg,
        yesterday: yesterdayAvg,
        weekAvg,
        trend: todayAvg > weekAvg * 1.05 ? 'up' : todayAvg < weekAvg * 0.95 ? 'down' : 'stable',
      },
      behaviorInsights: [
        {
          category: 'Peak Dwell Time',
          description: 'Longest dwell times occur during lunch hours (12-2 PM)',
          impact: 'neutral',
          confidence: 0.89,
        },
        {
          category: 'Quick Transit',
          description: 'Morning rush shows shorter dwell times, indicating efficient movement',
          impact: 'positive',
          confidence: 0.92,
        },
        {
          category: 'Extended Presence',
          description: 'Increased dwell times in afternoon may indicate congestion',
          impact: 'negative',
          confidence: 0.76,
        },
        {
          category: 'Weekend Pattern',
          description: 'Weekend dwell times are 25% shorter than weekday average',
          impact: 'neutral',
          confidence: 0.84,
        },
      ],
    };
  }, []);

  // Filter data based on selected cameras
  const filteredData = useMemo(() => {
    if (selectedCameras.size === 0) return dwellTimeData;
    return dwellTimeData.filter((data) => selectedCameras.has(data.cameraId));
  }, [dwellTimeData, selectedCameras]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const totalAvgDwell =
      filteredData.reduce((sum, data) => sum + data.averageDwellTime, 0) / filteredData.length;
    const totalMedianDwell =
      filteredData.reduce((sum, data) => sum + data.medianDwellTime, 0) / filteredData.length;
    const totalPersons = filteredData.reduce(
      (sum, data) =>
        sum + data.dwellTimeDistribution.reduce((distSum, dist) => distSum + dist.count, 0),
      0
    );

    return {
      avgDwellTime: totalAvgDwell,
      medianDwellTime: totalMedianDwell,
      totalPersons,
      activeCameras: filteredData.length,
    };
  }, [filteredData]);

  // Get trend indicator
  const getTrendIndicator = useCallback((trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return { icon: '📈', color: 'text-green-400', label: 'Increasing' };
      case 'down':
        return { icon: '📉', color: 'text-red-400', label: 'Decreasing' };
      case 'stable':
        return { icon: '➡️', color: 'text-gray-400', label: 'Stable' };
    }
  }, []);

  // Get impact color
  const getImpactColor = useCallback((impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      case 'neutral':
        return 'text-gray-400';
    }
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    const exportData = {
      dwellTimeData,
      trends: dwellTimeTrends,
      overallStats,
      metadata: {
        environment,
        timeRange,
        selectedCameras: Array.from(selectedCameras),
        generatedAt: new Date().toISOString(),
      },
    };
    onExportAnalysis?.(exportData);
  }, [
    dwellTimeData,
    dwellTimeTrends,
    overallStats,
    environment,
    timeRange,
    selectedCameras,
    onExportAnalysis,
  ]);

  // Format time display
  const formatHour = useCallback((hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  }, []);

  if (!overallStats) {
    return (
      <div
        className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8 ${className}`}
      >
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-2">⏱️</div>
          <div>No dwell time data available</div>
          <div className="text-sm mt-1">Select cameras to view analysis</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Dwell Time Analysis</h3>
            <p className="text-sm text-gray-400">
              Time spent analysis across {filteredData.length} camera
              {filteredData.length !== 1 ? 's' : ''}
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
            { key: 'distribution', label: 'Distribution', icon: '📈' },
            { key: 'trends', label: 'Trends', icon: '🔄' },
            { key: 'insights', label: 'Insights', icon: '💡' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`px-3 py-1 text-sm rounded transition-colors flex items-center space-x-1 ${
                activeView === tab.key
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
        {activeView === 'overview' && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-400">
                  {overallStats.avgDwellTime.toFixed(1)}m
                </div>
                <div className="text-sm text-gray-400">Avg Dwell Time</div>
                <div
                  className={`text-xs flex items-center space-x-1 mt-1 ${getTrendIndicator(dwellTimeTrends.dailyComparison.trend).color}`}
                >
                  <span>{getTrendIndicator(dwellTimeTrends.dailyComparison.trend).icon}</span>
                  <span>{getTrendIndicator(dwellTimeTrends.dailyComparison.trend).label}</span>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">
                  {overallStats.medianDwellTime.toFixed(1)}m
                </div>
                <div className="text-sm text-gray-400">Median Dwell Time</div>
                <div className="text-xs text-gray-400 mt-1">50th percentile</div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">
                  {overallStats.totalPersons.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Total Persons</div>
                <div className="text-xs text-green-400 mt-1">Analyzed</div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-cyan-400">{overallStats.activeCameras}</div>
                <div className="text-sm text-gray-400">Active Cameras</div>
                <div className="text-xs text-gray-400 mt-1">Monitoring</div>
              </div>
            </div>

            {/* Camera Breakdown */}
            {groupByCamera && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300">Camera Breakdown</h4>
                {filteredData.map((cameraData) => (
                  <div key={cameraData.cameraId} className="bg-gray-800/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">
                        {getDisplayName(cameraData.cameraId)}
                      </span>
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-gray-400">Avg:</span>
                          <span className="text-orange-400 ml-1 font-semibold">
                            {cameraData.averageDwellTime.toFixed(1)}m
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Range:</span>
                          <span className="text-blue-400 ml-1 font-semibold">
                            {cameraData.minDwellTime.toFixed(1)}-
                            {cameraData.maxDwellTime.toFixed(1)}m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Distribution Chart */}
                    <div className="flex space-x-1 h-2">
                      {cameraData.dwellTimeDistribution.map((dist, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-t from-orange-500 to-orange-400 rounded-sm flex-1"
                          style={{ height: `${Math.max(2, (dist.percentage / 40) * 100)}%` }}
                          title={`${dist.range}: ${dist.count} (${dist.percentage.toFixed(1)}%)`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'distribution' && (
          <div className="space-y-6">
            {/* Overall Distribution */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Dwell Time Distribution</h4>
              <div className="space-y-3">
                {/* Aggregate all distributions */}
                {filteredData[0]?.dwellTimeDistribution.map((_, rangeIndex) => {
                  const aggregated = filteredData.reduce(
                    (acc, cameraData) => {
                      const dist = cameraData.dwellTimeDistribution[rangeIndex];
                      return {
                        range: dist.range,
                        count: acc.count + dist.count,
                        avgConfidence: acc.avgConfidence + dist.avgConfidence,
                      };
                    },
                    { range: '', count: 0, avgConfidence: 0 }
                  );

                  aggregated.avgConfidence /= filteredData.length;
                  const totalCount = filteredData.reduce(
                    (sum, data) =>
                      sum +
                      data.dwellTimeDistribution.reduce((distSum, dist) => distSum + dist.count, 0),
                    0
                  );
                  const percentage = (aggregated.count / totalCount) * 100;

                  return (
                    <div
                      key={rangeIndex}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-800/30 rounded p-2 transition-colors"
                      onClick={() => onDwellTimeRangeClick?.(aggregated.range)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-gray-400 w-20">{aggregated.range}</span>
                        <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-orange-400 font-semibold">
                          {aggregated.count.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {percentage.toFixed(1)}% | {Math.round(aggregated.avgConfidence * 100)}%
                          conf
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Camera-specific distributions */}
            {groupByCamera && filteredData.length > 1 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3">By Camera</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredData.map((cameraData) => (
                    <div key={cameraData.cameraId} className="bg-gray-800/30 rounded-lg p-3">
                      <div className="font-semibold text-white mb-2">
                        {getDisplayName(cameraData.cameraId)}
                      </div>
                      <div className="space-y-2">
                        {cameraData.dwellTimeDistribution.map((dist, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 w-16">{dist.range}</span>
                            <div className="flex-1 mx-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-400 transition-all duration-500"
                                style={{ width: `${dist.percentage}%` }}
                              />
                            </div>
                            <span className="text-blue-400 w-12 text-right">{dist.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'trends' && (
          <div className="space-y-6">
            {/* Daily Comparison */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Daily Comparison</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-400">
                    {dwellTimeTrends.dailyComparison.today.toFixed(1)}m
                  </div>
                  <div className="text-sm text-gray-400">Today</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {dwellTimeTrends.dailyComparison.yesterday.toFixed(1)}m
                  </div>
                  <div className="text-sm text-gray-400">Yesterday</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {dwellTimeTrends.dailyComparison.weekAvg.toFixed(1)}m
                  </div>
                  <div className="text-sm text-gray-400">Week Avg</div>
                </div>
              </div>
            </div>

            {/* Hourly Trends */}
            {showHourlyBreakdown && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                  24-Hour Dwell Time Pattern
                </h4>
                <div className="grid grid-cols-12 gap-1">
                  {dwellTimeTrends.hourlyTrends.map((trend) => (
                    <div
                      key={trend.hour}
                      className={`text-center cursor-pointer transition-colors ${
                        selectedTimeSlot === trend.hour
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-800/30 hover:bg-gray-700/50 text-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedTimeSlot(selectedTimeSlot === trend.hour ? null : trend.hour);
                        onTimeOfDayClick?.(trend.hour);
                      }}
                    >
                      <div className="p-2">
                        <div className="text-xs font-mono">{formatHour(trend.hour)}</div>
                        <div className="text-xs font-semibold mt-1">
                          {trend.avgDwellTime.toFixed(1)}m
                        </div>
                        <div className="w-full bg-gray-600 rounded mt-1" style={{ height: '4px' }}>
                          <div
                            className="bg-orange-400 rounded transition-all duration-300"
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (trend.avgDwellTime / 8) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTimeSlot !== null && (
                  <div className="mt-3 bg-gray-800/30 rounded-lg p-3">
                    <div className="text-sm">
                      <strong>{formatHour(selectedTimeSlot)}</strong> - Avg Dwell:{' '}
                      <span className="text-orange-400">
                        {dwellTimeTrends.hourlyTrends[selectedTimeSlot].avgDwellTime.toFixed(1)}m
                      </span>
                      , Person Count:{' '}
                      <span className="text-blue-400">
                        {dwellTimeTrends.hourlyTrends[selectedTimeSlot].personCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'insights' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-300">Behavioral Insights</h4>
            {dwellTimeTrends.behaviorInsights.map((insight, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        insight.impact === 'positive'
                          ? 'bg-green-400'
                          : insight.impact === 'negative'
                            ? 'bg-red-400'
                            : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-white font-semibold">{insight.category}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        insight.impact === 'positive'
                          ? 'bg-green-500/20 text-green-400'
                          : insight.impact === 'negative'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {insight.impact}
                    </span>
                    <span className="text-xs text-gray-400">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-300">{insight.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DwellTimeAnalysis;
