// src/components/TrafficHeatmap.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface HeatmapZone {
  id: string;
  name: string;
  coordinates: Array<[number, number]>; // Polygon coordinates
  cameraId: BackendCameraId;
  occupancyData: Array<{
    timestamp: Date;
    personCount: number;
    avgDwellTime: number;
    peakOccupancy: number;
  }>;
}

interface HeatmapData {
  zones: HeatmapZone[];
  overallMetrics: {
    totalOccupancyEvents: number;
    averageOccupancy: number;
    peakOccupancyTime: Date;
    peakOccupancyCount: number;
  };
}

interface TrafficHeatmapProps {
  environment: EnvironmentId;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  selectedCameras: Set<BackendCameraId>;
  className?: string;
  // Display options
  showZoneLabels?: boolean;
  showOccupancyNumbers?: boolean;
  heatmapIntensity?: 'low' | 'medium' | 'high';
  visualizationMode?: 'heatmap' | 'zones' | 'combined';
  // Event handlers
  onZoneClick?: (zone: HeatmapZone) => void;
  onZoneHover?: (zone: HeatmapZone | null) => void;
  onExportHeatmap?: (data: HeatmapData) => void;
}

const TrafficHeatmap: React.FC<TrafficHeatmapProps> = ({
  environment,
  timeRange,
  selectedCameras,
  className = '',
  showZoneLabels = true,
  showOccupancyNumbers = true,
  heatmapIntensity = 'medium',
  visualizationMode = 'combined',
  onZoneClick,
  onZoneHover,
  onExportHeatmap,
}) => {
  const [hoveredZone, setHoveredZone] = useState<HeatmapZone | null>(null);
  const [selectedZone, setSelectedZone] = useState<HeatmapZone | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState<Date>(new Date());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Generate mock heatmap data based on environment
  const heatmapData: HeatmapData = useMemo(() => {
    const cameras =
      environment === 'factory'
        ? (['c09', 'c12', 'c13', 'c16'] as BackendCameraId[])
        : (['c01', 'c02', 'c03', 'c05'] as BackendCameraId[]);

    const zones: HeatmapZone[] = cameras.flatMap((cameraId, cameraIndex) => {
      // Create 2-4 zones per camera
      const zoneCount = 2 + Math.floor(Math.random() * 3);
      return Array.from({ length: zoneCount }, (_, zoneIndex) => {
        const zoneId = `${cameraId}_zone_${zoneIndex + 1}`;

        // Generate occupancy data based on time range
        const dataPoints = timeRange === '1h' ? 12 : timeRange === '6h' ? 36 : 48;
        const now = Date.now();
        const rangeMs = {
          '1h': 60 * 60 * 1000,
          '6h': 6 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }[timeRange];

        const occupancyData = Array.from({ length: dataPoints }, (_, i) => {
          const timestamp = new Date(now - rangeMs + (i * rangeMs) / dataPoints);
          const baseOccupancy = 3 + Math.floor(Math.random() * 8);
          const dwellMultiplier = 1 + Math.sin((i / dataPoints) * Math.PI * 2) * 0.5;

          return {
            timestamp,
            personCount: Math.round(baseOccupancy * dwellMultiplier),
            avgDwellTime: 2 + Math.random() * 8, // 2-10 minutes
            peakOccupancy: Math.round(baseOccupancy * dwellMultiplier * 1.5),
          };
        });

        return {
          id: zoneId,
          name: `${getCameraDisplayName(cameraId, environment)} Zone ${zoneIndex + 1}`,
          coordinates: [
            [50 + cameraIndex * 200 + zoneIndex * 80, 50 + zoneIndex * 60],
            [130 + cameraIndex * 200 + zoneIndex * 80, 50 + zoneIndex * 60],
            [130 + cameraIndex * 200 + zoneIndex * 80, 110 + zoneIndex * 60],
            [50 + cameraIndex * 200 + zoneIndex * 80, 110 + zoneIndex * 60],
          ],
          cameraId,
          occupancyData,
        };
      });
    });

    const totalOccupancyEvents = zones.reduce(
      (sum, zone) =>
        sum + zone.occupancyData.reduce((zoneSum, data) => zoneSum + data.personCount, 0),
      0
    );

    const allDataPoints = zones.flatMap((zone) => zone.occupancyData);
    const averageOccupancy =
      allDataPoints.length > 0
        ? allDataPoints.reduce((sum, data) => sum + data.personCount, 0) / allDataPoints.length
        : 0;

    const peakData = allDataPoints.reduce(
      (peak, current) => (current.personCount > peak.personCount ? current : peak),
      { personCount: 0, timestamp: new Date() }
    );

    return {
      zones,
      overallMetrics: {
        totalOccupancyEvents,
        averageOccupancy,
        peakOccupancyTime: peakData.timestamp,
        peakOccupancyCount: peakData.personCount,
      },
    };
  }, [environment, timeRange]);

  // Filter zones based on selected cameras
  const filteredZones = useMemo(() => {
    if (selectedCameras.size === 0) return heatmapData.zones;
    return heatmapData.zones.filter((zone) => selectedCameras.has(zone.cameraId));
  }, [heatmapData.zones, selectedCameras]);

  // Get occupancy intensity for visualization
  const getOccupancyIntensity = useCallback(
    (occupancyCount: number) => {
      const maxOccupancy = Math.max(
        ...filteredZones.flatMap((zone) => zone.occupancyData.map((data) => data.personCount))
      );

      const normalizedIntensity = occupancyCount / maxOccupancy;
      const intensityMultiplier =
        heatmapIntensity === 'low' ? 0.5 : heatmapIntensity === 'high' ? 1.5 : 1;

      return Math.min(1, normalizedIntensity * intensityMultiplier);
    },
    [filteredZones, heatmapIntensity]
  );

  // Get color for occupancy level
  const getOccupancyColor = useCallback((intensity: number) => {
    // Color gradient from blue (low) to red (high)
    const colors = [
      { r: 0, g: 100, b: 255 }, // Blue (low occupancy)
      { r: 0, g: 200, b: 255 }, // Light blue
      { r: 0, g: 255, b: 200 }, // Cyan
      { r: 50, g: 255, b: 50 }, // Green
      { r: 200, g: 255, b: 0 }, // Yellow-green
      { r: 255, g: 200, b: 0 }, // Yellow
      { r: 255, g: 100, b: 0 }, // Orange
      { r: 255, g: 0, b: 0 }, // Red (high occupancy)
    ];

    const scaledIntensity = intensity * (colors.length - 1);
    const colorIndex = Math.floor(scaledIntensity);
    const fraction = scaledIntensity - colorIndex;

    if (colorIndex >= colors.length - 1) {
      const color = colors[colors.length - 1];
      return `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
    }

    const color1 = colors[colorIndex];
    const color2 = colors[colorIndex + 1];

    const r = Math.round(color1.r + (color2.r - color1.r) * fraction);
    const g = Math.round(color1.g + (color2.g - color1.g) * fraction);
    const b = Math.round(color1.b + (color2.b - color1.b) * fraction);

    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  }, []);

  // Handle zone interactions
  const handleZoneClick = useCallback(
    (zone: HeatmapZone) => {
      setSelectedZone(selectedZone?.id === zone.id ? null : zone);
      onZoneClick?.(zone);
    },
    [selectedZone, onZoneClick]
  );

  const handleZoneHover = useCallback(
    (zone: HeatmapZone | null) => {
      setHoveredZone(zone);
      onZoneHover?.(zone);
    },
    [onZoneHover]
  );

  // Draw heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;

    if (visualizationMode === 'heatmap' || visualizationMode === 'combined') {
      // Draw heatmap zones
      filteredZones.forEach((zone) => {
        const currentOccupancy =
          zone.occupancyData[zone.occupancyData.length - 1]?.personCount || 0;
        const intensity = getOccupancyIntensity(currentOccupancy);
        const color = getOccupancyColor(intensity);

        // Draw zone polygon
        ctx.beginPath();
        ctx.moveTo(zone.coordinates[0][0], zone.coordinates[0][1]);
        zone.coordinates.slice(1).forEach(([x, y]) => {
          ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Draw zone border
        ctx.strokeStyle = hoveredZone?.id === zone.id ? '#FFA500' : '#FFFFFF';
        ctx.lineWidth = hoveredZone?.id === zone.id ? 3 : 1;
        ctx.stroke();
      });
    }

    if (visualizationMode === 'zones' || visualizationMode === 'combined') {
      // Draw zone outlines and labels
      filteredZones.forEach((zone) => {
        const centerX = zone.coordinates.reduce((sum, [x]) => sum + x, 0) / zone.coordinates.length;
        const centerY =
          zone.coordinates.reduce((sum, [, y]) => sum + y, 0) / zone.coordinates.length;

        if (showZoneLabels) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(zone.name, centerX, centerY - 10);
        }

        if (showOccupancyNumbers) {
          const currentOccupancy =
            zone.occupancyData[zone.occupancyData.length - 1]?.personCount || 0;
          ctx.fillStyle = '#FFA500';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(currentOccupancy.toString(), centerX, centerY + 10);
        }
      });
    }
  }, [
    filteredZones,
    visualizationMode,
    showZoneLabels,
    showOccupancyNumbers,
    hoveredZone,
    getOccupancyIntensity,
    getOccupancyColor,
  ]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is inside any zone
      for (const zone of filteredZones) {
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.beginPath();
        ctx.moveTo(zone.coordinates[0][0], zone.coordinates[0][1]);
        zone.coordinates.slice(1).forEach(([coordX, coordY]) => {
          ctx.lineTo(coordX, coordY);
        });
        ctx.closePath();

        if (ctx.isPointInPath(x, y)) {
          handleZoneClick(zone);
          break;
        }
      }
    },
    [filteredZones, handleZoneClick]
  );

  // Handle canvas mouse move
  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if mouse is over any zone
      let foundZone: HeatmapZone | null = null;
      for (const zone of filteredZones) {
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.beginPath();
        ctx.moveTo(zone.coordinates[0][0], zone.coordinates[0][1]);
        zone.coordinates.slice(1).forEach(([coordX, coordY]) => {
          ctx.lineTo(coordX, coordY);
        });
        ctx.closePath();

        if (ctx.isPointInPath(x, y)) {
          foundZone = zone;
          break;
        }
      }

      if (foundZone !== hoveredZone) {
        handleZoneHover(foundZone);
      }
    },
    [filteredZones, hoveredZone, handleZoneHover]
  );

  // Format time for display
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
            <h3 className="text-lg font-semibold text-white">Traffic Heatmap</h3>
            <p className="text-sm text-gray-400">
              Occupancy visualization across {filteredZones.length} zone
              {filteredZones.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExportHeatmap?.(heatmapData)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              📊 Export
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Visualization Mode */}
            <select
              value={visualizationMode}
              onChange={(e) => console.log('Visualization mode:', e.target.value)}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="combined">Combined View</option>
              <option value="heatmap">Heatmap Only</option>
              <option value="zones">Zones Only</option>
            </select>

            {/* Intensity */}
            <select
              value={heatmapIntensity}
              onChange={(e) => console.log('Intensity:', e.target.value)}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="low">Low Intensity</option>
              <option value="medium">Medium Intensity</option>
              <option value="high">High Intensity</option>
            </select>
          </div>

          {/* Display Options */}
          <div className="flex items-center space-x-4 text-sm">
            <label className="flex items-center space-x-1 text-gray-300">
              <input
                type="checkbox"
                checked={showZoneLabels}
                onChange={(e) => console.log('Zone labels:', e.target.checked)}
                className="rounded"
              />
              <span>Labels</span>
            </label>
            <label className="flex items-center space-x-1 text-gray-300">
              <input
                type="checkbox"
                checked={showOccupancyNumbers}
                onChange={(e) => console.log('Occupancy numbers:', e.target.checked)}
                className="rounded"
              />
              <span>Numbers</span>
            </label>
          </div>
        </div>
      </div>

      {/* Overall Metrics */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Events:</span>
            <div className="text-orange-400 font-semibold">
              {heatmapData.overallMetrics.totalOccupancyEvents.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Avg Occupancy:</span>
            <div className="text-blue-400 font-semibold">
              {heatmapData.overallMetrics.averageOccupancy.toFixed(1)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Peak Count:</span>
            <div className="text-red-400 font-semibold">
              {heatmapData.overallMetrics.peakOccupancyCount}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Peak Time:</span>
            <div className="text-purple-400 font-semibold">
              {formatTime(heatmapData.overallMetrics.peakOccupancyTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Visualization */}
      <div className="p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full max-w-full border border-gray-600 rounded bg-gray-900 cursor-pointer"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => handleZoneHover(null)}
          />

          {/* Zone Details Overlay */}
          {hoveredZone && (
            <div className="absolute top-2 left-2 bg-black/90 text-white text-xs p-3 rounded shadow-lg pointer-events-none max-w-xs">
              <div className="font-semibold mb-1">{hoveredZone.name}</div>
              <div className="space-y-1">
                <div>
                  Current:{' '}
                  {hoveredZone.occupancyData[hoveredZone.occupancyData.length - 1]?.personCount ||
                    0}{' '}
                  persons
                </div>
                <div>
                  Avg Dwell:{' '}
                  {(
                    hoveredZone.occupancyData[hoveredZone.occupancyData.length - 1]?.avgDwellTime ||
                    0
                  ).toFixed(1)}
                  m
                </div>
                <div>
                  Peak:{' '}
                  {hoveredZone.occupancyData[hoveredZone.occupancyData.length - 1]?.peakOccupancy ||
                    0}{' '}
                  persons
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Color Legend */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">Low</span>
            <div className="flex space-x-1">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="w-6 h-4 rounded"
                  style={{ backgroundColor: getOccupancyColor(i / 7) }}
                />
              ))}
            </div>
            <span className="text-gray-400">High</span>
          </div>
        </div>
      </div>

      {/* Selected Zone Details */}
      {selectedZone && (
        <div className="p-4 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            Zone Details: {selectedZone.name}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Current Occupancy:</span>
              <div className="text-orange-400 font-semibold">
                {selectedZone.occupancyData[selectedZone.occupancyData.length - 1]?.personCount ||
                  0}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Avg Dwell Time:</span>
              <div className="text-blue-400 font-semibold">
                {(
                  selectedZone.occupancyData[selectedZone.occupancyData.length - 1]?.avgDwellTime ||
                  0
                ).toFixed(1)}
                m
              </div>
            </div>
            <div>
              <span className="text-gray-500">Peak Occupancy:</span>
              <div className="text-red-400 font-semibold">
                {selectedZone.occupancyData[selectedZone.occupancyData.length - 1]?.peakOccupancy ||
                  0}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Camera:</span>
              <div className="text-purple-400 font-semibold">
                {getCameraDisplayName(selectedZone.cameraId, environment)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficHeatmap;
