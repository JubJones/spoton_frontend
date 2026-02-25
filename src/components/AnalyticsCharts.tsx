// src/components/AnalyticsCharts.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface TimeRangeMetrics {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  totalDetections: number;
  peakHour: { hour: number; count: number };
  trends: Array<{ timestamp: Date; count: number; confidence: number }>;
}

interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  confidence?: number;
  cameraId?: BackendCameraId;
}

interface AnalyticsChartsProps {
  timeRangeMetrics: TimeRangeMetrics;
  selectedMetricType: 'detections' | 'occupancy' | 'flow' | 'dwell';
  selectedCameras: Set<BackendCameraId>;
  environment: EnvironmentId;
  className?: string;
  // Display options
  chartType?: 'line' | 'bar' | 'area';
  showConfidenceInterval?: boolean;
  showTrendLine?: boolean;
  showDataLabels?: boolean;
  // Event handlers
  onDataPointClick?: (dataPoint: ChartDataPoint) => void;
  onTimeRangeHover?: (timeRange: [Date, Date]) => void;
  onExportChart?: (chartData: any) => void;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  timeRangeMetrics,
  selectedMetricType,
  selectedCameras,
  environment,
  className = '',
  chartType = 'line',
  showConfidenceInterval = true,
  showTrendLine = true,
  showDataLabels = false,
  onDataPointClick,
  onTimeRangeHover,
  onExportChart,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<[Date, Date] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Generate chart data based on selected metric type and cameras
  const chartData: ChartDataPoint[] = useMemo(() => {
    const baseData = timeRangeMetrics.trends.map((trend) => ({
      timestamp: trend.timestamp,
      value: trend.count,
      confidence: trend.confidence,
    }));

    // Modify data based on selected metric type
    switch (selectedMetricType) {
      case 'detections':
        return baseData;

      case 'occupancy':
        return baseData.map((point) => ({
          ...point,
          value: Math.round(point.value * 0.3), // Convert to occupancy
          label: `${Math.round(point.value * 0.3)} persons`,
        }));

      case 'flow':
        return baseData.map((point) => ({
          ...point,
          value: Math.round(point.value * 1.2), // Flow rate
          label: `${Math.round(point.value * 1.2)} movements/hr`,
        }));

      case 'dwell':
        return baseData.map((point) => ({
          ...point,
          value: 2 + Math.random() * 6, // 2-8 minute dwell times
          label: `${(2 + Math.random() * 6).toFixed(1)} min avg`,
        }));

      default:
        return baseData;
    }
  }, [timeRangeMetrics, selectedMetricType]);

  const [containerSize, setContainerSize] = useState({ width: 800, height: 400 });

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate chart dimensions and scales
  const chartDimensions = useMemo(() => {
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const { width, height } = containerSize;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.bottom - padding.top;

    const maxValue = Math.max(...chartData.map((d) => d.value), 1);
    const minValue = Math.min(...chartData.map((d) => d.value), 0);
    const valueRange = maxValue - minValue;

    const timeRange =
      chartData.length > 1
        ? chartData[chartData.length - 1].timestamp.getTime() - chartData[0].timestamp.getTime()
        : 1;

    return {
      padding,
      width,
      height,
      chartWidth,
      chartHeight,
      maxValue: maxValue + valueRange * 0.1,
      minValue: Math.max(0, minValue - valueRange * 0.1),
      timeRange,
      firstTimestamp: chartData[0]?.timestamp.getTime() || Date.now(),
    };
  }, [chartData, containerSize]);

  // Convert data values to chart coordinates
  const getChartCoordinates = useCallback(
    (dataPoint: ChartDataPoint, index: number) => {
      const { padding, chartWidth, chartHeight, maxValue, minValue, timeRange, firstTimestamp } =
        chartDimensions;

      const x = padding.left + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        ((dataPoint.value - minValue) / Math.max(maxValue - minValue, 1)) * chartHeight;

      return { x, y };
    },
    [chartDimensions, chartData.length]
  );

  // Draw the chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = chartDimensions.width;
    canvas.height = chartDimensions.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = chartDimensions.padding.left + (i / 10) * chartDimensions.chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, chartDimensions.padding.top);
      ctx.lineTo(x, chartDimensions.padding.top + chartDimensions.chartHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 8; i++) {
      const y = chartDimensions.padding.top + (i / 8) * chartDimensions.chartHeight;
      ctx.beginPath();
      ctx.moveTo(chartDimensions.padding.left, y);
      ctx.lineTo(chartDimensions.padding.left + chartDimensions.chartWidth, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(
      chartDimensions.padding.left,
      chartDimensions.padding.top + chartDimensions.chartHeight
    );
    ctx.lineTo(
      chartDimensions.padding.left + chartDimensions.chartWidth,
      chartDimensions.padding.top + chartDimensions.chartHeight
    );
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(chartDimensions.padding.left, chartDimensions.padding.top);
    ctx.lineTo(
      chartDimensions.padding.left,
      chartDimensions.padding.top + chartDimensions.chartHeight
    );
    ctx.stroke();

    // Draw chart based on type
    const coordinates = chartData.map((point, index) => getChartCoordinates(point, index));

    if (chartType === 'area' || chartType === 'line') {
      // Draw confidence interval if enabled
      if (showConfidenceInterval) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
        ctx.beginPath();
        coordinates.forEach((coord, index) => {
          const confidenceOffset = (chartData[index].confidence || 0.8) * 20;
          if (index === 0) {
            ctx.moveTo(coord.x, coord.y - confidenceOffset);
          } else {
            ctx.lineTo(coord.x, coord.y - confidenceOffset);
          }
        });
        for (let i = coordinates.length - 1; i >= 0; i--) {
          const coord = coordinates[i];
          const confidenceOffset = (chartData[i].confidence || 0.8) * 20;
          ctx.lineTo(coord.x, coord.y + confidenceOffset);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Draw area fill
      if (chartType === 'area') {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
        ctx.beginPath();
        ctx.moveTo(coordinates[0].x, chartDimensions.padding.top + chartDimensions.chartHeight);
        coordinates.forEach((coord) => {
          ctx.lineTo(coord.x, coord.y);
        });
        ctx.lineTo(
          coordinates[coordinates.length - 1].x,
          chartDimensions.padding.top + chartDimensions.chartHeight
        );
        ctx.closePath();
        ctx.fill();
      }

      // Draw line
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      coordinates.forEach((coord, index) => {
        if (index === 0) {
          ctx.moveTo(coord.x, coord.y);
        } else {
          ctx.lineTo(coord.x, coord.y);
        }
      });
      ctx.stroke();

      // Draw data points
      coordinates.forEach((coord, index) => {
        const isHovered = hoveredPoint === chartData[index];

        ctx.beginPath();
        ctx.arc(coord.x, coord.y, isHovered ? 8 : 5, 0, 2 * Math.PI);
        ctx.fillStyle = isHovered ? '#FFFFFF' : '#F97316';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    } else if (chartType === 'bar') {
      // Draw bars
      const barWidth = (chartDimensions.chartWidth / chartData.length) * 0.8;
      coordinates.forEach((coord, index) => {
        const barHeight = chartDimensions.padding.top + chartDimensions.chartHeight - coord.y;
        const isHovered = hoveredPoint === chartData[index];

        ctx.fillStyle = isHovered ? '#FB923C' : '#F97316';
        ctx.fillRect(coord.x - barWidth / 2, coord.y, barWidth, barHeight);

        // Bar border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(coord.x - barWidth / 2, coord.y, barWidth, barHeight);
      });
    }

    // Draw trend line if enabled
    if (showTrendLine && chartData.length > 1) {
      // Simple linear regression
      const n = chartData.length;
      const sumX = chartData.reduce((sum, _, index) => sum + index, 0);
      const sumY = chartData.reduce((sum, point) => sum + point.value, 0);
      const sumXY = chartData.reduce((sum, point, index) => sum + index * point.value, 0);
      const sumXX = chartData.reduce((sum, _, index) => sum + index * index, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const trendStart = getChartCoordinates({ ...chartData[0], value: intercept }, 0);
      const trendEnd = getChartCoordinates(
        { ...chartData[chartData.length - 1], value: intercept + slope * (chartData.length - 1) },
        chartData.length - 1
      );

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(trendStart.x, trendStart.y);
      ctx.lineTo(trendEnd.x, trendEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw axis labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // X-axis labels (time)
    for (let i = 0; i < Math.min(6, chartData.length); i++) {
      const dataIndex = Math.floor((i * (chartData.length - 1)) / 5);
      const coord = coordinates[dataIndex];
      const timestamp = chartData[dataIndex].timestamp;
      const label = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      ctx.fillText(label, coord.x, chartDimensions.padding.top + chartDimensions.chartHeight + 20);
    }

    // Y-axis labels (values)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value =
        chartDimensions.minValue + (chartDimensions.maxValue - chartDimensions.minValue) * (i / 5);
      const y =
        chartDimensions.padding.top +
        chartDimensions.chartHeight -
        (i / 5) * chartDimensions.chartHeight;

      ctx.fillText(
        value.toFixed(selectedMetricType === 'dwell' ? 1 : 0),
        chartDimensions.padding.left - 10,
        y + 4
      );
    }

    // Draw data labels if enabled
    if (showDataLabels) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';

      coordinates.forEach((coord, index) => {
        const value = chartData[index].value;
        const label = selectedMetricType === 'dwell' ? value.toFixed(1) : value.toString();
        ctx.fillText(label, coord.x, coord.y - 10);
      });
    }

    // Draw title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const titles = {
      detections: 'Detection Count Over Time',
      occupancy: 'Occupancy Levels Over Time',
      flow: 'Traffic Flow Rate Over Time',
      dwell: 'Average Dwell Time Over Time',
    };
    ctx.fillText(titles[selectedMetricType], chartDimensions.width / 2, 25);
  }, [
    chartData,
    chartDimensions,
    chartType,
    selectedMetricType,
    showConfidenceInterval,
    showTrendLine,
    showDataLabels,
    hoveredPoint,
    getChartCoordinates,
  ]);

  // Handle canvas mouse events
  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Find closest data point
      let closestPoint: ChartDataPoint | null = null;
      let closestDistance = Infinity;

      chartData.forEach((point, index) => {
        const coord = getChartCoordinates(point, index);
        const distance = Math.sqrt(Math.pow(x - coord.x, 2) + Math.pow(y - coord.y, 2));

        if (distance < 20 && distance < closestDistance) {
          closestDistance = distance;
          closestPoint = point;
        }
      });

      setHoveredPoint(closestPoint);
    },
    [chartData, getChartCoordinates]
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (hoveredPoint) {
        onDataPointClick?.(hoveredPoint);
      }
    },
    [hoveredPoint, onDataPointClick]
  );

  // Get metric unit
  const getMetricUnit = () => {
    switch (selectedMetricType) {
      case 'detections':
        return 'detections';
      case 'occupancy':
        return 'persons';
      case 'flow':
        return 'movements/hr';
      case 'dwell':
        return 'minutes';
      default:
        return '';
    }
  };

  // Handle export
  const handleExport = useCallback(() => {
    const exportData = {
      chartData,
      metadata: {
        metricType: selectedMetricType,
        timeRange: timeRangeMetrics.timeRange,
        selectedCameras: Array.from(selectedCameras),
        environment,
        generatedAt: new Date().toISOString(),
      },
    };
    onExportChart?.(exportData);
  }, [
    chartData,
    selectedMetricType,
    timeRangeMetrics.timeRange,
    selectedCameras,
    environment,
    onExportChart,
  ]);

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Analytics Charts</h3>
            <p className="text-sm text-gray-400">
              {selectedMetricType.charAt(0).toUpperCase() + selectedMetricType.slice(1)} trends over{' '}
              {timeRangeMetrics.timeRange}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={chartType}
              onChange={(e) => console.log('Chart type:', e.target.value)}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
            </select>

            <button
              onClick={handleExport}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              📊 Export
            </button>
          </div>
        </div>

        {/* Chart Options */}
        <div className="flex items-center space-x-4 text-sm">
          <label className="flex items-center space-x-1 text-gray-300">
            <input
              type="checkbox"
              checked={showConfidenceInterval}
              onChange={(e) => console.log('Confidence interval:', e.target.checked)}
              className="rounded"
            />
            <span>Confidence</span>
          </label>
          <label className="flex items-center space-x-1 text-gray-300">
            <input
              type="checkbox"
              checked={showTrendLine}
              onChange={(e) => console.log('Trend line:', e.target.checked)}
              className="rounded"
            />
            <span>Trend</span>
          </label>
          <label className="flex items-center space-x-1 text-gray-300">
            <input
              type="checkbox"
              checked={showDataLabels}
              onChange={(e) => console.log('Data labels:', e.target.checked)}
              className="rounded"
            />
            <span>Labels</span>
          </label>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div ref={chartContainerRef} className="relative flex-1 min-h-0 w-full mb-4">
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full border border-gray-600 rounded bg-gray-900 cursor-crosshair"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={handleCanvasClick}
          />

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-black/90 text-white text-sm p-3 rounded shadow-lg pointer-events-none z-10"
              style={{
                left: '50%',
                top: '10px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-semibold">
                {hoveredPoint.timestamp.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="text-orange-400">
                Value:{' '}
                {selectedMetricType === 'dwell'
                  ? hoveredPoint.value.toFixed(1)
                  : hoveredPoint.value}{' '}
                {getMetricUnit()}
              </div>
              {hoveredPoint.confidence && (
                <div className="text-blue-400">
                  Confidence: {Math.round(hoveredPoint.confidence * 100)}%
                </div>
              )}
              {hoveredPoint.label && <div className="text-gray-400">{hoveredPoint.label}</div>}
            </div>
          )}
        </div>

        {/* Chart Summary */}
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-orange-400 font-semibold">
              {chartData.length > 0
                ? selectedMetricType === 'dwell'
                  ? chartData[chartData.length - 1].value.toFixed(1)
                  : chartData[chartData.length - 1].value
                : 0}
            </div>
            <div className="text-gray-400">Current</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-semibold">
              {chartData.length > 0
                ? selectedMetricType === 'dwell'
                  ? Math.max(...chartData.map((d) => d.value)).toFixed(1)
                  : Math.max(...chartData.map((d) => d.value))
                : 0}
            </div>
            <div className="text-gray-400">Peak</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-semibold">
              {chartData.length > 0
                ? selectedMetricType === 'dwell'
                  ? (chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)
                  : Math.round(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length)
                : 0}
            </div>
            <div className="text-gray-400">Average</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-semibold">
              {chartData.length > 0
                ? Math.round(
                  (chartData.reduce((sum, d) => sum + (d.confidence || 0.8), 0) /
                    chartData.length) *
                  100
                )
                : 0}
              %
            </div>
            <div className="text-gray-400">Confidence</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
