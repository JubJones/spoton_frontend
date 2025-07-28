import React, { useState, useEffect, useRef } from 'react';
import { 
  BehavioralAnalytics, 
  DwellTimeAnalysis, 
  TrafficPattern, 
  AnalyticsFilter,
  AnalyticsTimeRange
} from '../../services/types/api';
import { analyticsAPI } from '../../services/analyticsAPI';
import { useAnalyticsStore } from '../../stores/analyticsStore';

interface AdvancedBehavioralAnalyticsProps {
  className?: string;
  data?: {
    behavioral: BehavioralAnalytics | null;
    dwellTime: DwellTimeAnalysis | null;
    traffic: TrafficPattern[];
  } | null;
  timeRange: AnalyticsTimeRange;
  filters: AnalyticsFilter;
  onRefresh?: () => void;
}

interface HeatmapVisualizationProps {
  dwellData: DwellTimeAnalysis;
  className?: string;
}

const HeatmapVisualization: React.FC<HeatmapVisualizationProps> = ({ dwellData, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (dwellData && canvasRef.current) {
      drawHeatmap();
    }
  }, [dwellData]);

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 400;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw heatmap points
    dwellData.heatmap.forEach(point => {
      const x = (point.x / 100) * canvas.width;
      const y = (point.y / 100) * canvas.height;
      const intensity = point.intensity;
      
      // Create gradient based on intensity
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30 * intensity);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 165, 0, ${intensity * 0.5})`);
      gradient.addColorStop(1, `rgba(255, 255, 0, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 30 * intensity, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw grid overlay
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <h4 className="text-lg font-semibold mb-4">Dwell Time Heatmap</h4>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="border border-gray-600 rounded"
        />
      </div>
      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>High Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Medium Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Low Activity</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FlowAnalysisProps {
  behavioral: BehavioralAnalytics;
  className?: string;
}

const FlowAnalysis: React.FC<FlowAnalysisProps> = ({ behavioral, className = '' }) => {
  const [selectedFlow, setSelectedFlow] = useState<string>('entry');

  const flowData = behavioral.spatialAnalysis.flowAnalysis;

  const renderFlowData = () => {
    switch (selectedFlow) {
      case 'entry':
        return (
          <div className="space-y-3">
            <h5 className="font-semibold">Entry Points</h5>
            {flowData.entryPoints.map((entry, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{entry.location}</div>
                    <div className="text-sm text-gray-400">
                      Peak: {entry.peakTime}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-400">{entry.count}</div>
                    <div className="text-sm text-gray-400">{entry.rate.toFixed(1)}/min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'exit':
        return (
          <div className="space-y-3">
            <h5 className="font-semibold">Exit Points</h5>
            {flowData.exitPoints.map((exit, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{exit.location}</div>
                    <div className="text-sm text-gray-400">
                      Peak: {exit.peakTime}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-red-400">{exit.count}</div>
                    <div className="text-sm text-gray-400">{exit.rate.toFixed(1)}/min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'bottleneck':
        return (
          <div className="space-y-3">
            <h5 className="font-semibold">Bottlenecks</h5>
            {flowData.bottlenecks.map((bottleneck, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{bottleneck.location}</div>
                    <div className="text-sm text-gray-400">
                      Peak: {bottleneck.peakTime}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-orange-400">{bottleneck.count}</div>
                    <div className="text-sm text-gray-400">{bottleneck.rate.toFixed(1)}/min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <h4 className="text-lg font-semibold mb-4">Flow Analysis</h4>
      
      <div className="flex gap-2 mb-4">
        {['entry', 'exit', 'bottleneck'].map(flow => (
          <button
            key={flow}
            onClick={() => setSelectedFlow(flow)}
            className={`px-3 py-2 rounded text-sm capitalize ${
              selectedFlow === flow
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {flow} Points
          </button>
        ))}
      </div>

      {renderFlowData()}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Peak Flow Time</div>
            <div className="text-lg font-semibold">{flowData.peakFlowTime}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Average Flow Rate</div>
            <div className="text-lg font-semibold">{flowData.flowRate.toFixed(1)}/min</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdvancedBehavioralAnalytics: React.FC<AdvancedBehavioralAnalyticsProps> = ({
  className = '',
  data,
  timeRange,
  filters,
  onRefresh
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('dwell');

  const { behavioral, dwellTime, traffic } = data || {};

  const analysisTypes = [
    { id: 'dwell', label: 'Dwell Time', icon: '⏱️' },
    { id: 'routes', label: 'Route Patterns', icon: '🗺️' },
    { id: 'crowd', label: 'Crowd Analysis', icon: '👥' },
    { id: 'flow', label: 'Flow Analysis', icon: '🌊' },
    { id: 'anomalies', label: 'Anomalies', icon: '⚠️' },
    { id: 'zones', label: 'Zone Utilization', icon: '🏢' }
  ];

  const renderAnalysisContent = () => {
    if (!behavioral || !dwellTime) {
      return (
        <div className="text-center py-8 text-gray-400">
          No behavioral data available
        </div>
      );
    }

    switch (selectedAnalysis) {
      case 'dwell':
        return (
          <div className="space-y-6">
            <HeatmapVisualization dwellData={dwellTime} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Dwell Time by Zone</h4>
                <div className="space-y-3">
                  {dwellTime.dwellTimeDistribution.map((zone, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="capitalize">{zone.zone}</span>
                      <div className="text-right">
                        <div className="font-semibold">{Math.round(zone.averageTime / 60)}min</div>
                        <div className="text-sm text-gray-400">{zone.visitorCount} visitors</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Dwell Time Trends</h4>
                <div className="space-y-3">
                  {dwellTime.trends.slice(-5).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                        {new Date(trend.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{Math.round(trend.value / 60)}min</span>
                        <span className={`text-xs ${
                          trend.trend === 'increasing' ? 'text-green-400' : 
                          trend.trend === 'decreasing' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {trend.trend === 'increasing' ? '↗' : 
                           trend.trend === 'decreasing' ? '↘' : '→'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'routes':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-4">Common Route Patterns</h4>
              <div className="space-y-4">
                {behavioral.routePatterns.map((pattern, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">Route {pattern.id}</div>
                      <div className="text-sm text-gray-400">
                        {pattern.frequency} times | {pattern.userCount} users
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      Path: {pattern.path.join(' → ')}
                    </div>
                    <div className="text-sm text-gray-400">
                      Avg Duration: {Math.round(pattern.averageDuration / 60)}min
                    </div>
                    <div className="text-sm text-gray-400">
                      Common Times: {pattern.commonTimes.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'crowd':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Current Count</div>
                <div className="text-2xl font-bold text-green-400">
                  {behavioral.crowdAnalysis.currentCount}
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Peak Count</div>
                <div className="text-2xl font-bold text-red-400">
                  {behavioral.crowdAnalysis.peakCount}
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Average Count</div>
                <div className="text-2xl font-bold text-blue-400">
                  {behavioral.crowdAnalysis.averageCount}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-4">Crowd Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {behavioral.crowdAnalysis.distribution.map((zone, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg">
                    <div className="font-semibold capitalize">{zone.zone}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Count: {zone.count}
                    </div>
                    <div className="text-sm text-gray-400">
                      Density: {(zone.density * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'flow':
        return (
          <div className="space-y-6">
            <FlowAnalysis behavioral={behavioral} />
          </div>
        );

      case 'anomalies':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-4">Behavioral Anomalies</h4>
              {behavioral.anomalies.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No anomalies detected
                </div>
              ) : (
                <div className="space-y-3">
                  {behavioral.anomalies.map((anomaly, index) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${
                            anomaly.severity === 'high' ? 'bg-red-500' :
                            anomaly.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></span>
                          <div>
                            <div className="font-semibold">{anomaly.description}</div>
                            <div className="text-sm text-gray-400">
                              {anomaly.type} | {anomaly.location} | {(anomaly.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'zones':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-4">Zone Utilization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {behavioral.spatialAnalysis.zoneUtilization.map((zone, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold capitalize">{zone.zone}</div>
                      <div className="text-sm text-gray-400">
                        {(zone.utilizationRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Capacity</span>
                        <span className="text-sm">{zone.capacity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Current</span>
                        <span className="text-sm">{zone.currentOccupancy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Avg Visit</span>
                        <span className="text-sm">{Math.round(zone.averageVisitDuration / 60)}min</span>
                      </div>
                    </div>
                    <div className="mt-2 bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${zone.utilizationRate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Advanced Behavioral Analytics</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Analysis Type Selector */}
      <div className="flex flex-wrap gap-2">
        {analysisTypes.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedAnalysis(type.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              selectedAnalysis === type.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Analysis Content */}
      {error ? (
        <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      ) : (
        renderAnalysisContent()
      )}
    </div>
  );
};

export default AdvancedBehavioralAnalytics;