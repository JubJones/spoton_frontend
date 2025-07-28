import React, { useState, useEffect, useCallback } from 'react';
import { Detection, Camera, TrackingResult } from '../../../services/types/api';
import { useDetectionStore } from '../../../stores/detectionStore';
import { useTrackingStore } from '../../../stores/trackingStore';
import { performanceMonitor } from '../../../services/performanceMonitor';

interface DetectionStatisticsProps {
  cameras: Camera[];
  detections: Detection[];
  trackingResults: TrackingResult[];
  className?: string;
  updateInterval?: number;
  showCharts?: boolean;
  showHeatmap?: boolean;
  showTrends?: boolean;
}

interface StatisticsData {
  totalDetections: number;
  activeDetections: number;
  trackingTargets: number;
  averageConfidence: number;
  detectionRate: number; // detections per second
  falsePositiveRate: number;
  performanceMetrics: {
    fps: number;
    latency: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  cameraStats: CameraStatistics[];
  timeSeriesData: TimeSeriesPoint[];
  heatmapData: HeatmapPoint[];
  trends: TrendData;
}

interface CameraStatistics {
  cameraId: string;
  cameraName: string;
  detectionCount: number;
  averageConfidence: number;
  isActive: boolean;
  fps: number;
  quality: 'excellent' | 'good' | 'poor' | 'critical';
  lastDetectionTime: number;
}

interface TimeSeriesPoint {
  timestamp: number;
  detections: number;
  confidence: number;
  fps: number;
  tracking: number;
}

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  detections: number;
}

interface TrendData {
  detectionTrend: 'increasing' | 'stable' | 'decreasing';
  confidenceTrend: 'improving' | 'stable' | 'degrading';
  performanceTrend: 'improving' | 'stable' | 'degrading';
  changeRate: number;
}

export const DetectionStatistics: React.FC<DetectionStatisticsProps> = ({
  cameras,
  detections,
  trackingResults,
  className = '',
  updateInterval = 1000,
  showCharts = true,
  showHeatmap = false,
  showTrends = true,
}) => {
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalDetections: 0,
    activeDetections: 0,
    trackingTargets: 0,
    averageConfidence: 0,
    detectionRate: 0,
    falsePositiveRate: 0,
    performanceMetrics: {
      fps: 0,
      latency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    },
    cameraStats: [],
    timeSeriesData: [],
    heatmapData: [],
    trends: {
      detectionTrend: 'stable',
      confidenceTrend: 'stable',
      performanceTrend: 'stable',
      changeRate: 0,
    },
  });

  const [historicalData, setHistoricalData] = useState<TimeSeriesPoint[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [selectedMetric, setSelectedMetric] = useState<'detections' | 'confidence' | 'fps' | 'tracking'>('detections');

  // Store hooks
  const { detectionHistory } = useDetectionStore();
  const { trackingHistory, trackingTargets } = useTrackingStore();

  // Calculate statistics
  const calculateStatistics = useCallback(() => {
    const now = Date.now();
    
    // Basic counts
    const totalDetections = detections.length;
    const activeDetections = detections.filter(d => d.confidence > 0.5).length;
    const trackingTargetsCount = trackingTargets.length;
    
    // Average confidence
    const averageConfidence = detections.length > 0 
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length 
      : 0;
    
    // Detection rate (last 10 seconds)
    const recentDetections = detectionHistory.filter(d => 
      now - new Date(d.timestamp).getTime() < 10000
    );
    const detectionRate = recentDetections.length / 10;
    
    // Performance metrics
    const perfMetrics = performanceMonitor.getCurrentMetrics();
    
    // Camera statistics
    const cameraStats: CameraStatistics[] = cameras.map(camera => {
      const cameraDetections = detections.filter(d => d.cameraId === camera.id);
      const cameraConfidence = cameraDetections.length > 0
        ? cameraDetections.reduce((sum, d) => sum + d.confidence, 0) / cameraDetections.length
        : 0;
      
      const lastDetection = cameraDetections.length > 0
        ? Math.max(...cameraDetections.map(d => new Date(d.timestamp).getTime()))
        : 0;
      
      let quality: CameraStatistics['quality'] = 'excellent';
      if (camera.fps < 15) quality = 'poor';
      else if (camera.fps < 25) quality = 'good';
      else if (cameraConfidence < 0.7) quality = 'poor';
      else if (cameraConfidence < 0.85) quality = 'good';
      
      return {
        cameraId: camera.id,
        cameraName: camera.name,
        detectionCount: cameraDetections.length,
        averageConfidence: cameraConfidence,
        isActive: camera.isActive,
        fps: camera.fps,
        quality,
        lastDetectionTime: lastDetection,
      };
    });
    
    // Time series data point
    const timeSeriesPoint: TimeSeriesPoint = {
      timestamp: now,
      detections: totalDetections,
      confidence: averageConfidence,
      fps: perfMetrics.fps,
      tracking: trackingTargetsCount,
    };
    
    // Update historical data
    setHistoricalData(prev => {
      const newData = [...prev, timeSeriesPoint];
      const timeRange = getTimeRangeMs(selectedTimeRange);
      return newData.filter(point => now - point.timestamp < timeRange);
    });
    
    // Calculate trends
    const trends = calculateTrends(historicalData);
    
    // Heatmap data (simplified)
    const heatmapData: HeatmapPoint[] = showHeatmap 
      ? generateHeatmapData(detections)
      : [];
    
    // Estimate false positive rate (simplified)
    const falsePositiveRate = Math.max(0, 1 - averageConfidence) * 0.1;
    
    setStatistics({
      totalDetections,
      activeDetections,
      trackingTargets: trackingTargetsCount,
      averageConfidence,
      detectionRate,
      falsePositiveRate,
      performanceMetrics: {
        fps: perfMetrics.fps,
        latency: perfMetrics.latency,
        memoryUsage: perfMetrics.memoryUsage,
        cpuUsage: perfMetrics.cpuUsage,
      },
      cameraStats,
      timeSeriesData: historicalData,
      heatmapData,
      trends,
    });
  }, [detections, detectionHistory, trackingTargets, cameras, selectedTimeRange, historicalData, showHeatmap]);

  // Update statistics at regular intervals
  useEffect(() => {
    calculateStatistics();
    const interval = setInterval(calculateStatistics, updateInterval);
    return () => clearInterval(interval);
  }, [calculateStatistics, updateInterval]);

  // Helper functions
  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  };

  const calculateTrends = (data: TimeSeriesPoint[]): TrendData => {
    if (data.length < 2) {
      return {
        detectionTrend: 'stable',
        confidenceTrend: 'stable',
        performanceTrend: 'stable',
        changeRate: 0,
      };
    }

    const recent = data.slice(-10);
    const older = data.slice(-20, -10);
    
    if (recent.length === 0 || older.length === 0) {
      return {
        detectionTrend: 'stable',
        confidenceTrend: 'stable',
        performanceTrend: 'stable',
        changeRate: 0,
      };
    }

    const recentAvg = recent.reduce((sum, p) => sum + p.detections, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.detections, 0) / older.length;
    const changeRate = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    const detectionTrend = changeRate > 5 ? 'increasing' : changeRate < -5 ? 'decreasing' : 'stable';
    
    const recentConfidence = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;
    const olderConfidence = older.reduce((sum, p) => sum + p.confidence, 0) / older.length;
    const confidenceChange = recentConfidence - olderConfidence;
    
    const confidenceTrend = confidenceChange > 0.05 ? 'improving' : confidenceChange < -0.05 ? 'degrading' : 'stable';
    
    const recentFps = recent.reduce((sum, p) => sum + p.fps, 0) / recent.length;
    const olderFps = older.reduce((sum, p) => sum + p.fps, 0) / older.length;
    const fpsChange = recentFps - olderFps;
    
    const performanceTrend = fpsChange > 2 ? 'improving' : fpsChange < -2 ? 'degrading' : 'stable';

    return {
      detectionTrend,
      confidenceTrend,
      performanceTrend,
      changeRate,
    };
  };

  const generateHeatmapData = (detections: Detection[]): HeatmapPoint[] => {
    const heatmap: Map<string, HeatmapPoint> = new Map();
    
    detections.forEach(detection => {
      if (detection.boundingBox) {
        const centerX = detection.boundingBox.x + detection.boundingBox.width / 2;
        const centerY = detection.boundingBox.y + detection.boundingBox.height / 2;
        const gridX = Math.floor(centerX / 50) * 50;
        const gridY = Math.floor(centerY / 50) * 50;
        const key = `${gridX},${gridY}`;
        
        const existing = heatmap.get(key);
        if (existing) {
          existing.intensity += detection.confidence;
          existing.detections += 1;
        } else {
          heatmap.set(key, {
            x: gridX,
            y: gridY,
            intensity: detection.confidence,
            detections: 1,
          });
        }
      }
    });
    
    return Array.from(heatmap.values());
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return '↗️';
      case 'decreasing':
      case 'degrading':
        return '↘️';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return 'text-green-500';
      case 'decreasing':
      case 'degrading':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-gray-900 text-white rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Detection Statistics</h3>
        <div className="flex gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
          >
            <option value="1m">1 minute</option>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
          </select>
          
          {showCharts && (
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
            >
              <option value="detections">Detections</option>
              <option value="confidence">Confidence</option>
              <option value="fps">FPS</option>
              <option value="tracking">Tracking</option>
            </select>
          )}
        </div>
      </div>

      {/* Main statistics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total detections */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Total Detections</div>
          <div className="text-2xl font-bold text-blue-400">
            {formatNumber(statistics.totalDetections)}
          </div>
          {showTrends && (
            <div className={`text-xs ${getTrendColor(statistics.trends.detectionTrend)}`}>
              {getTrendIcon(statistics.trends.detectionTrend)} {statistics.trends.detectionTrend}
            </div>
          )}
        </div>

        {/* Active detections */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Active Detections</div>
          <div className="text-2xl font-bold text-green-400">
            {statistics.activeDetections}
          </div>
          <div className="text-xs text-gray-500">
            {statistics.totalDetections > 0 ? 
              ((statistics.activeDetections / statistics.totalDetections) * 100).toFixed(1) + '%'
              : '0%'
            }
          </div>
        </div>

        {/* Tracking targets */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Tracking Targets</div>
          <div className="text-2xl font-bold text-red-400">
            {statistics.trackingTargets}
          </div>
          <div className="text-xs text-gray-500">
            {statistics.trackingTargets > 0 ? 'Active' : 'None'}
          </div>
        </div>

        {/* Average confidence */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Avg Confidence</div>
          <div className="text-2xl font-bold text-yellow-400">
            {(statistics.averageConfidence * 100).toFixed(1)}%
          </div>
          {showTrends && (
            <div className={`text-xs ${getTrendColor(statistics.trends.confidenceTrend)}`}>
              {getTrendIcon(statistics.trends.confidenceTrend)} {statistics.trends.confidenceTrend}
            </div>
          )}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">FPS</div>
          <div className="text-xl font-bold text-blue-400">
            {statistics.performanceMetrics.fps.toFixed(1)}
          </div>
        </div>

        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Latency</div>
          <div className="text-xl font-bold text-green-400">
            {statistics.performanceMetrics.latency.toFixed(0)}ms
          </div>
        </div>

        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Memory</div>
          <div className="text-xl font-bold text-yellow-400">
            {statistics.performanceMetrics.memoryUsage.toFixed(1)}MB
          </div>
        </div>

        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-sm text-gray-400">CPU</div>
          <div className="text-xl font-bold text-red-400">
            {statistics.performanceMetrics.cpuUsage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Camera statistics */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">Camera Performance</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statistics.cameraStats.map(camera => (
            <div key={camera.cameraId} className="bg-gray-800 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{camera.cameraName}</div>
                  <div className="text-sm text-gray-400">
                    {camera.detectionCount} detections
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    camera.quality === 'excellent' ? 'bg-green-500' :
                    camera.quality === 'good' ? 'bg-yellow-500' :
                    camera.quality === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                  }`}></span>
                  <span className="text-xs text-gray-400">{camera.quality}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Confidence:</span>
                  <span className="ml-1">{(camera.averageConfidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">FPS:</span>
                  <span className="ml-1">{camera.fps}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      {showCharts && statistics.timeSeriesData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3">
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
          </h4>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="h-32 relative">
              {/* Simple ASCII chart */}
              <div className="text-xs text-gray-400 mb-2">
                {selectedMetric} over {selectedTimeRange}
              </div>
              <div className="text-sm font-mono text-green-400">
                {statistics.timeSeriesData.slice(-20).map((point, index) => {
                  const value = point[selectedMetric as keyof TimeSeriesPoint];
                  const height = Math.max(1, Math.min(10, Math.floor(value as number / 5)));
                  return (
                    <span key={index} className="inline-block w-2 mr-1">
                      {'█'.repeat(height)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-gray-400">Detection Rate</div>
          <div className="text-lg font-semibold">
            {statistics.detectionRate.toFixed(1)}/sec
          </div>
        </div>

        <div className="bg-gray-800 p-3 rounded-lg">
          <div className="text-gray-400">Est. False Positive</div>
          <div className="text-lg font-semibold">
            {(statistics.falsePositiveRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center mt-4 text-xs text-gray-400">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
        Real-time updates every {updateInterval / 1000}s
      </div>
    </div>
  );
};

export default DetectionStatistics;