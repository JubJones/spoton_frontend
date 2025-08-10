// src/components/TrafficFlowAnalysis.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface FlowDirection {
  direction:
    | 'north'
    | 'south'
    | 'east'
    | 'west'
    | 'northeast'
    | 'northwest'
    | 'southeast'
    | 'southwest';
  count: number;
  percentage: number;
  averageSpeed: number; // pixels per second
  confidence: number;
}

interface FlowPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  averageSpeed: number;
  path: Array<{ x: number; y: number; timestamp: number }>;
  cameraTransitions: Array<{
    fromCamera: BackendCameraId;
    toCamera: BackendCameraId;
    count: number;
    averageTransitionTime: number;
  }>;
}

interface TrafficFlowData {
  cameraId: BackendCameraId;
  totalMovements: number;
  averageSpeed: number;
  peakFlowTime: Date;
  peakFlowCount: number;
  flowDirections: FlowDirection[];
  flowPatterns: FlowPattern[];
  entranceExitData: {
    entrances: number;
    exits: number;
    netFlow: number;
    throughTraffic: number;
  };
}

interface FlowMetrics {
  overallThroughput: number;
  averageTransitionTime: number;
  busyCorridors: Array<{
    from: BackendCameraId;
    to: BackendCameraId;
    count: number;
    avgTime: number;
  }>;
  flowEfficiency: number; // 0-100%
  congestionPoints: Array<{
    location: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

interface TrafficFlowAnalysisProps {
  environment: EnvironmentId;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  selectedCameras: Set<BackendCameraId>;
  className?: string;
  // Display options
  showFlowDirections?: boolean;
  showPathVisualization?: boolean;
  showCameraTransitions?: boolean;
  visualizationMode?: 'arrows' | 'heatlines' | 'combined';
  // Event handlers
  onFlowPatternClick?: (pattern: FlowPattern) => void;
  onCameraTransitionClick?: (from: BackendCameraId, to: BackendCameraId) => void;
  onExportFlowData?: (data: any) => void;
}

const TrafficFlowAnalysis: React.FC<TrafficFlowAnalysisProps> = ({
  environment,
  timeRange,
  selectedCameras,
  className = '',
  showFlowDirections = true,
  showPathVisualization = true,
  showCameraTransitions = true,
  visualizationMode = 'combined',
  onFlowPatternClick,
  onCameraTransitionClick,
  onExportFlowData,
}) => {
  const [activeView, setActiveView] = useState<
    'overview' | 'directions' | 'patterns' | 'transitions'
  >('overview');
  const [selectedPattern, setSelectedPattern] = useState<FlowPattern | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate mock traffic flow data
  const trafficFlowData: TrafficFlowData[] = useMemo(() => {
    const cameras =
      environment === 'factory'
        ? (['c09', 'c12', 'c13', 'c16'] as BackendCameraId[])
        : (['c01', 'c02', 'c03', 'c05'] as BackendCameraId[]);

    return cameras.map((cameraId, index) => {
      const baseMovements = 450 + index * 120;
      const baseSpeed = 25 + index * 8; // pixels per second

      // Generate flow directions
      const directions: FlowDirection[] = [
        {
          direction: 'north',
          count: Math.round(baseMovements * 0.25),
          percentage: 25,
          averageSpeed: baseSpeed * 0.9,
          confidence: 0.89,
        },
        {
          direction: 'south',
          count: Math.round(baseMovements * 0.23),
          percentage: 23,
          averageSpeed: baseSpeed * 0.95,
          confidence: 0.91,
        },
        {
          direction: 'east',
          count: Math.round(baseMovements * 0.28),
          percentage: 28,
          averageSpeed: baseSpeed * 1.1,
          confidence: 0.87,
        },
        {
          direction: 'west',
          count: Math.round(baseMovements * 0.24),
          percentage: 24,
          averageSpeed: baseSpeed * 1.05,
          confidence: 0.92,
        },
      ];

      // Generate flow patterns
      const patterns: FlowPattern[] = [
        {
          id: `${cameraId}_pattern_1`,
          name: 'Direct Transit',
          description: 'Straight path through the monitoring area',
          frequency: Math.round(baseMovements * 0.4),
          averageSpeed: baseSpeed * 1.2,
          path: [
            { x: 50, y: 200, timestamp: 0 },
            { x: 200, y: 200, timestamp: 3000 },
            { x: 350, y: 200, timestamp: 6000 },
          ],
          cameraTransitions: [],
        },
        {
          id: `${cameraId}_pattern_2`,
          name: 'L-Shape Turn',
          description: 'Movement with 90-degree direction change',
          frequency: Math.round(baseMovements * 0.25),
          averageSpeed: baseSpeed * 0.8,
          path: [
            { x: 50, y: 300, timestamp: 0 },
            { x: 200, y: 300, timestamp: 4000 },
            { x: 200, y: 150, timestamp: 7000 },
          ],
          cameraTransitions: [],
        },
        {
          id: `${cameraId}_pattern_3`,
          name: 'Circular Movement',
          description: 'Looping or circular path pattern',
          frequency: Math.round(baseMovements * 0.15),
          averageSpeed: baseSpeed * 0.6,
          path: [
            { x: 200, y: 200, timestamp: 0 },
            { x: 250, y: 150, timestamp: 2000 },
            { x: 250, y: 250, timestamp: 4000 },
            { x: 150, y: 250, timestamp: 6000 },
            { x: 150, y: 150, timestamp: 8000 },
            { x: 200, y: 200, timestamp: 10000 },
          ],
          cameraTransitions: [],
        },
      ];

      return {
        cameraId,
        totalMovements: baseMovements,
        averageSpeed: baseSpeed,
        peakFlowTime: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
        peakFlowCount: Math.round(baseMovements * 0.15),
        flowDirections: directions,
        flowPatterns: patterns,
        entranceExitData: {
          entrances: Math.round(baseMovements * 0.48),
          exits: Math.round(baseMovements * 0.52),
          netFlow: Math.round(baseMovements * 0.04),
          throughTraffic: Math.round(baseMovements * 0.35),
        },
      };
    });
  }, [environment]);

  // Generate overall flow metrics
  const flowMetrics: FlowMetrics = useMemo(() => {
    const cameras =
      environment === 'factory'
        ? (['c09', 'c12', 'c13', 'c16'] as BackendCameraId[])
        : (['c01', 'c02', 'c03', 'c05'] as BackendCameraId[]);

    const busyCorridors = [];
    for (let i = 0; i < cameras.length - 1; i++) {
      for (let j = i + 1; j < cameras.length; j++) {
        busyCorridors.push({
          from: cameras[i],
          to: cameras[j],
          count: Math.round(50 + Math.random() * 150),
          avgTime: 15 + Math.random() * 30, // seconds
        });
      }
    }

    return {
      overallThroughput: trafficFlowData.reduce((sum, data) => sum + data.totalMovements, 0),
      averageTransitionTime: 22.5,
      busyCorridors: busyCorridors.sort((a, b) => b.count - a.count).slice(0, 4),
      flowEfficiency: 78.2,
      congestionPoints: [
        {
          location: `${getCameraDisplayName(cameras[0], environment)} - Main Entrance`,
          severity: 'medium',
          description: 'Moderate bottleneck during peak hours',
        },
        {
          location: `${getCameraDisplayName(cameras[1], environment)} - Corridor Junction`,
          severity: 'low',
          description: 'Minor slowdown in afternoon',
        },
        {
          location: `${getCameraDisplayName(cameras[2], environment)} - Exit Zone`,
          severity: 'high',
          description: 'Significant congestion during shift changes',
        },
      ],
    };
  }, [environment, trafficFlowData]);

  // Filter data based on selected cameras
  const filteredData = useMemo(() => {
    if (selectedCameras.size === 0) return trafficFlowData;
    return trafficFlowData.filter((data) => selectedCameras.has(data.cameraId));
  }, [trafficFlowData, selectedCameras]);

  // Get direction arrow
  const getDirectionArrow = useCallback((direction: string) => {
    const arrows = {
      north: '↑',
      south: '↓',
      east: '→',
      west: '←',
      northeast: '↗',
      northwest: '↖',
      southeast: '↘',
      southwest: '↙',
    };
    return arrows[direction as keyof typeof arrows] || '•';
  }, []);

  // Get severity color
  const getSeverityColor = useCallback((severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
    }
  }, []);

  // Draw flow visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showPathVisualization) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = 600;
    canvas.height = 300;

    // Draw flow patterns
    if (selectedPattern) {
      const pattern = selectedPattern;

      // Draw path
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (pattern.path.length > 0) {
        ctx.moveTo(pattern.path[0].x, pattern.path[0].y);
        pattern.path.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
      }
      ctx.stroke();

      // Draw path points
      pattern.path.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle =
          index === 0 ? '#00FF00' : index === pattern.path.length - 1 ? '#FF0000' : '#FFA500';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw direction arrows
      for (let i = 0; i < pattern.path.length - 1; i++) {
        const current = pattern.path[i];
        const next = pattern.path[i + 1];
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const angle = Math.atan2(dy, dx);

        const midX = current.x + dx * 0.5;
        const midY = current.y + dy * 0.5;

        // Draw arrow
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(0, 0);
        ctx.lineTo(-10, 5);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Draw all patterns as overview
      filteredData.forEach((cameraData, cameraIndex) => {
        cameraData.flowPatterns.forEach((pattern, patternIndex) => {
          const alpha = 0.6;
          const color = `hsla(${cameraIndex * 90}, 70%, 60%, ${alpha})`;

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (pattern.path.length > 0) {
            const offsetY = cameraIndex * 80;
            ctx.moveTo(pattern.path[0].x + patternIndex * 10, pattern.path[0].y + offsetY);
            pattern.path.slice(1).forEach((point) => {
              ctx.lineTo(point.x + patternIndex * 10, point.y + offsetY);
            });
          }
          ctx.stroke();
        });
      });
    }
  }, [filteredData, selectedPattern, showPathVisualization]);

  // Handle export
  const handleExport = useCallback(() => {
    const exportData = {
      trafficFlowData: filteredData,
      flowMetrics,
      metadata: {
        environment,
        timeRange,
        selectedCameras: Array.from(selectedCameras),
        generatedAt: new Date().toISOString(),
      },
    };
    onExportFlowData?.(exportData);
  }, [filteredData, flowMetrics, environment, timeRange, selectedCameras, onExportFlowData]);

  // Format time
  const formatTime = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Traffic Flow Analysis</h3>
            <p className="text-sm text-gray-400">Movement patterns and directional analysis</p>
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
            { key: 'directions', label: 'Directions', icon: '🧭' },
            { key: 'patterns', label: 'Patterns', icon: '🔄' },
            { key: 'transitions', label: 'Transitions', icon: '🔀' },
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
          <div className="space-y-6">
            {/* Key Flow Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-400">
                  {flowMetrics.overallThroughput.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Total Movements</div>
                <div className="text-xs text-green-400 mt-1">Last {timeRange}</div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">
                  {flowMetrics.averageTransitionTime.toFixed(1)}s
                </div>
                <div className="text-sm text-gray-400">Avg Transition</div>
                <div className="text-xs text-gray-400 mt-1">Between cameras</div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">
                  {flowMetrics.flowEfficiency.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Flow Efficiency</div>
                <div className="text-xs text-green-400 mt-1">Good</div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">
                  {flowMetrics.congestionPoints.length}
                </div>
                <div className="text-sm text-gray-400">Congestion Points</div>
                <div className="text-xs text-yellow-400 mt-1">Active</div>
              </div>
            </div>

            {/* Busy Corridors */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Busiest Corridors</h4>
              <div className="space-y-2">
                {flowMetrics.busyCorridors.map((corridor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => onCameraTransitionClick?.(corridor.from, corridor.to)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-400 font-semibold">
                        {getCameraDisplayName(corridor.from, environment)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-400 font-semibold">
                        {getCameraDisplayName(corridor.to, environment)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-orange-400 font-semibold">{corridor.count}</div>
                        <div className="text-xs text-gray-400">movements</div>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-400 font-semibold">
                          {corridor.avgTime.toFixed(1)}s
                        </div>
                        <div className="text-xs text-gray-400">avg time</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Congestion Points */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Congestion Analysis</h4>
              <div className="space-y-2">
                {flowMetrics.congestionPoints.map((point, index) => (
                  <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">{point.location}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          point.severity === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : point.severity === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {point.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">{point.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'directions' && (
          <div className="space-y-6">
            {filteredData.map((cameraData) => (
              <div key={cameraData.cameraId} className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">
                  {getCameraDisplayName(cameraData.cameraId, environment)} - Flow Directions
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {cameraData.flowDirections.map((direction) => (
                    <div
                      key={direction.direction}
                      className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getDirectionArrow(direction.direction)}</span>
                        <div>
                          <div className="text-white font-semibold capitalize">
                            {direction.direction}
                          </div>
                          <div className="text-xs text-gray-400">
                            {direction.averageSpeed.toFixed(1)} px/s avg
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 font-semibold">{direction.count}</div>
                        <div className="text-xs text-gray-400">{direction.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Entrance/Exit Summary */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-semibold">
                      {cameraData.entranceExitData.entrances}
                    </div>
                    <div className="text-gray-400">Entrances</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-semibold">
                      {cameraData.entranceExitData.exits}
                    </div>
                    <div className="text-gray-400">Exits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">
                      {cameraData.entranceExitData.netFlow}
                    </div>
                    <div className="text-gray-400">Net Flow</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-semibold">
                      {cameraData.entranceExitData.throughTraffic}
                    </div>
                    <div className="text-gray-400">Through Traffic</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'patterns' && (
          <div className="space-y-6">
            {/* Pattern List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300">Flow Patterns</h4>
                {selectedPattern && (
                  <button
                    onClick={() => setSelectedPattern(null)}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredData.flatMap((cameraData) =>
                  cameraData.flowPatterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPattern?.id === pattern.id
                          ? 'border-orange-400 bg-orange-500/10'
                          : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                      }`}
                      onClick={() => {
                        setSelectedPattern(selectedPattern?.id === pattern.id ? null : pattern);
                        onFlowPatternClick?.(pattern);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold">{pattern.name}</span>
                        <div className="text-right">
                          <div className="text-orange-400 font-semibold">{pattern.frequency}</div>
                          <div className="text-xs text-gray-400">occurrences</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">{pattern.description}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-400">
                          Avg Speed: {pattern.averageSpeed.toFixed(1)} px/s
                        </span>
                        <span className="text-purple-400">{pattern.path.length} waypoints</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Path Visualization */}
            {showPathVisualization && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                  Path Visualization {selectedPattern ? `- ${selectedPattern.name}` : ''}
                </h4>
                <div className="bg-gray-900 rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    className="w-full max-w-full border border-gray-600 rounded bg-gray-800"
                  />

                  {selectedPattern && (
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-1"></div>
                        <span className="text-gray-400">Start Point</span>
                      </div>
                      <div className="text-center">
                        <div className="w-3 h-3 bg-orange-400 rounded-full mx-auto mb-1"></div>
                        <span className="text-gray-400">Waypoints</span>
                      </div>
                      <div className="text-center">
                        <div className="w-3 h-3 bg-red-400 rounded-full mx-auto mb-1"></div>
                        <span className="text-gray-400">End Point</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'transitions' && showCameraTransitions && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-300">Camera Transition Analysis</h4>

            {/* Transition Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2 text-gray-400">From / To</th>
                    {Array.from(new Set(filteredData.map((d) => d.cameraId))).map((cameraId) => (
                      <th key={cameraId} className="text-center p-2 text-gray-400">
                        {getCameraDisplayName(cameraId, environment)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(filteredData.map((d) => d.cameraId))).map((fromCamera) => (
                    <tr key={fromCamera} className="border-b border-gray-700/50">
                      <td className="p-2 text-white font-semibold">
                        {getCameraDisplayName(fromCamera, environment)}
                      </td>
                      {Array.from(new Set(filteredData.map((d) => d.cameraId))).map((toCamera) => (
                        <td key={toCamera} className="text-center p-2">
                          {fromCamera === toCamera ? (
                            <span className="text-gray-600">-</span>
                          ) : (
                            <div className="text-orange-400 font-semibold cursor-pointer hover:text-orange-300">
                              {Math.floor(Math.random() * 50) + 10}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Transitions */}
            <div>
              <h5 className="text-sm font-semibold text-gray-400 mb-2">
                Most Frequent Transitions
              </h5>
              <div className="space-y-2">
                {flowMetrics.busyCorridors.slice(0, 6).map((corridor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-800/30 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-blue-400">
                        {getCameraDisplayName(corridor.from, environment)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-400">
                        {getCameraDisplayName(corridor.to, environment)}
                      </span>
                    </div>
                    <div className="text-orange-400 font-semibold">
                      {corridor.count} transitions
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

export default TrafficFlowAnalysis;
