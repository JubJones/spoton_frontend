import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../services/analyticsAPI';
import { exportService } from '../services/exportService';
import { 
  AnalyticsData, 
  AnalyticsTimeRange, 
  AnalyticsFilter, 
  HistoricalData, 
  PerformanceMetrics, 
  SystemHealth,
  PersonJourney,
  BehavioralAnalytics,
  DwellTimeAnalysis,
  TrafficPattern,
  HeatmapData
} from '../services/types/api';
import { useAppStore } from '../stores/appStore';
import { useDetectionStore } from '../stores/detectionStore';
import { useTrackingStore } from '../stores/trackingStore';
import { useMappingStore } from '../stores/mappingStore';
import PersonJourneyVisualization from '../components/analytics/PersonJourneyVisualization';
import AdvancedBehavioralAnalytics from '../components/analytics/AdvancedBehavioralAnalytics';
import AutomatedReportGenerator from '../components/analytics/AutomatedReportGenerator';

interface AnalyticsPageProps {
  className?: string;
}

interface TabContent {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<any>;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('realtime');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>({
    startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
    endTime: Date.now(),
    interval: 'hour'
  });
  const [filters, setFilters] = useState<AnalyticsFilter>({
    confidenceThreshold: 0.7
  });

  // Analytics data state
  const [realtimeData, setRealtimeData] = useState<AnalyticsData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [journeyData, setJourneyData] = useState<PersonJourney | null>(null);
  const [behavioralData, setBehavioralData] = useState<BehavioralAnalytics | null>(null);
  const [dwellTimeData, setDwellTimeData] = useState<DwellTimeAnalysis | null>(null);
  const [trafficPatterns, setTrafficPatterns] = useState<TrafficPattern[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);

  // Store hooks
  const { currentEnvironment } = useAppStore();
  const { detectionHistory } = useDetectionStore();
  const { trackingHistory } = useTrackingStore();
  const { cameras } = useMappingStore();

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, filters]);

  // Real-time updates
  useEffect(() => {
    if (activeTab === 'realtime') {
      const interval = setInterval(() => {
        loadRealtimeData();
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load data based on active tab
      switch (activeTab) {
        case 'realtime':
          await loadRealtimeData();
          break;
        case 'historical':
          await loadHistoricalData();
          break;
        case 'performance':
          await loadPerformanceData();
          break;
        case 'behavioral':
          await loadBehavioralData();
          break;
        case 'heatmap':
          await loadHeatmapData();
          break;
        case 'journey':
          // Person journey data is loaded on-demand in the component
          break;
        case 'reports':
          // Reports are generated on-demand
          break;
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealtimeData = async () => {
    try {
      const data = await analyticsAPI.getRealTimeAnalytics(filters);
      setRealtimeData(data);
    } catch (err) {
      console.error('Failed to load real-time data:', err);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const data = await analyticsAPI.getHistoricalAnalytics(timeRange, filters);
      setHistoricalData(data);
    } catch (err) {
      console.error('Failed to load historical data:', err);
    }
  };

  const loadPerformanceData = async () => {
    try {
      const [metrics, health] = await Promise.all([
        analyticsAPI.getPerformanceMetrics(),
        analyticsAPI.getSystemHealth()
      ]);
      setPerformanceMetrics(metrics);
      setSystemHealth(health);
    } catch (err) {
      console.error('Failed to load performance data:', err);
    }
  };

  const loadBehavioralData = async () => {
    try {
      const [behavioral, dwellTime, traffic] = await Promise.all([
        analyticsAPI.getBehavioralAnalytics(filters),
        analyticsAPI.getDwellTimeAnalysis(filters),
        analyticsAPI.getTrafficPatterns(timeRange, filters)
      ]);
      setBehavioralData(behavioral);
      setDwellTimeData(dwellTime);
      setTrafficPatterns(traffic);
    } catch (err) {
      console.error('Failed to load behavioral data:', err);
    }
  };

  const loadHeatmapData = async () => {
    try {
      const data = await analyticsAPI.getHeatmapData(timeRange, filters);
      setHeatmapData(data);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
    }
  };

  // Export functions
  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const blob = await analyticsAPI.exportAnalytics(format, filters, timeRange);
      const filename = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      exportService.downloadBlob(blob, filename);
    } catch (err) {
      console.error('Failed to export analytics:', err);
    }
  };

  const handleGenerateReport = async (reportType: 'summary' | 'detailed' | 'performance' | 'security') => {
    try {
      const response = await analyticsAPI.generateReport(reportType, filters, timeRange);
      console.log('Report generated:', response);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  // Time range handlers
  const handleTimeRangeChange = (range: string) => {
    const now = Date.now();
    let startTime: number;
    
    switch (range) {
      case '1h':
        startTime = now - 60 * 60 * 1000;
        break;
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = now - 24 * 60 * 60 * 1000;
    }
    
    setTimeRange({
      startTime,
      endTime: now,
      interval: range === '1h' ? 'minute' : range === '24h' ? 'hour' : 'day'
    });
  };

  // Filter handlers
  const handleFilterChange = (key: keyof AnalyticsFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Tab definitions
  const tabs: TabContent[] = [
    {
      id: 'realtime',
      label: 'Real-time',
      icon: '📊',
      component: RealTimeAnalytics
    },
    {
      id: 'historical',
      label: 'Historical',
      icon: '📈',
      component: HistoricalAnalytics
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: '⚡',
      component: PerformanceAnalytics
    },
    {
      id: 'behavioral',
      label: 'Behavioral',
      icon: '🧠',
      component: BehavioralAnalytics
    },
    {
      id: 'heatmap',
      label: 'Heatmap',
      icon: '🔥',
      component: HeatmapAnalytics
    },
    {
      id: 'journey',
      label: 'Person Journey',
      icon: '🚶',
      component: PersonJourneyAnalytics
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📋',
      component: ReportsAnalytics
    }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-900 text-white flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-lg">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gray-900 text-white flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-lg mb-4">{error}</div>
          <button
            onClick={() => loadAnalyticsData()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-700 rounded"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select
              value={timeRange.interval}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                Export CSV
              </button>
            </div>

            {/* Generate Report Button */}
            <div className="relative">
              <button
                onClick={() => handleGenerateReport('summary')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Filters */}
          <div className="mt-8 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Filters</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confidence Threshold</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.confidenceThreshold || 0.7}
                  onChange={(e) => handleFilterChange('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {((filters.confidenceThreshold || 0.7) * 100).toFixed(0)}%
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Cameras</label>
                <select
                  multiple
                  value={filters.cameraIds || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions).map(option => option.value);
                    handleFilterChange('cameraIds', values);
                  }}
                  className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                >
                  {cameras.map(camera => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentTab && (
            <currentTab.component
              data={getDataForTab(activeTab)}
              timeRange={timeRange}
              filters={filters}
              onRefresh={loadAnalyticsData}
            />
          )}
        </div>
      </div>
    </div>
  );

  function getDataForTab(tabId: string) {
    switch (tabId) {
      case 'realtime':
        return realtimeData;
      case 'historical':
        return historicalData;
      case 'performance':
        return { metrics: performanceMetrics, health: systemHealth };
      case 'behavioral':
        return { behavioral: behavioralData, dwellTime: dwellTimeData, traffic: trafficPatterns };
      case 'heatmap':
        return heatmapData;
      case 'journey':
        return null; // Data is loaded on-demand
      case 'reports':
        return null; // Reports are generated on-demand
      default:
        return null;
    }
  }
};

// Real-time Analytics Component
const RealTimeAnalytics: React.FC<{ data: AnalyticsData | null }> = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8">No real-time data available</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Real-time Analytics</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Detections</div>
          <div className="text-2xl font-bold text-blue-400">{data.totalDetections}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Active Detections</div>
          <div className="text-2xl font-bold text-green-400">{data.activeDetections}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Avg Confidence</div>
          <div className="text-2xl font-bold text-yellow-400">
            {(data.averageConfidence * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Detection Rate</div>
          <div className="text-2xl font-bold text-purple-400">
            {data.detectionRate.toFixed(1)}/s
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">System Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">FPS</div>
            <div className="text-xl font-bold">{data.systemPerformance.fps.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Latency</div>
            <div className="text-xl font-bold">{data.systemPerformance.latency.toFixed(0)}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Memory</div>
            <div className="text-xl font-bold">{data.systemPerformance.memoryUsage.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">CPU</div>
            <div className="text-xl font-bold">{data.systemPerformance.cpuUsage.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Camera Analytics */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Camera Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.cameraAnalytics.map(camera => (
            <div key={camera.cameraId} className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{camera.cameraName}</div>
                  <div className="text-sm text-gray-400">
                    {camera.detectionCount} detections
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">FPS</div>
                  <div className="font-semibold">{camera.fps.toFixed(1)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Confidence:</span>
                  <span className="ml-1">{(camera.averageConfidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Uptime:</span>
                  <span className="ml-1">{camera.uptime.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Detection Trend</h3>
        <div className="h-32 relative">
          <div className="text-xs text-gray-400 mb-2">Detections over time</div>
          <div className="text-sm font-mono text-green-400">
            {data.timeSeriesData.slice(-20).map((point, index) => {
              const height = Math.max(1, Math.min(10, Math.floor(point.detections / 2)));
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
  );
};

// Historical Analytics Component
const HistoricalAnalytics: React.FC<{ data: HistoricalData | null }> = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8">No historical data available</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Historical Analytics</h2>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Detections</div>
          <div className="text-2xl font-bold text-blue-400">{data.summary.totalDetections}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Unique Persons</div>
          <div className="text-2xl font-bold text-green-400">{data.summary.uniquePersons}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Avg Confidence</div>
          <div className="text-2xl font-bold text-yellow-400">
            {(data.summary.averageConfidence * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Most Active Camera</div>
          <div className="text-2xl font-bold text-purple-400">{data.summary.mostActiveCamera}</div>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Peak Hours</h3>
        <div className="flex flex-wrap gap-2">
          {data.summary.peakHours.map(hour => (
            <span key={hour} className="bg-blue-600 px-3 py-1 rounded text-sm">
              {hour}
            </span>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Detection Trends</h3>
          <div className="space-y-2">
            {data.detectionTrends.slice(-5).map((trend, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  {new Date(trend.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{trend.value}</span>
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

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Tracking Trends</h3>
          <div className="space-y-2">
            {data.trackingTrends.slice(-5).map((trend, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  {new Date(trend.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{trend.value}</span>
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

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
          <div className="space-y-2">
            {data.performanceTrends.slice(-5).map((trend, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  {new Date(trend.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{trend.value.toFixed(1)}</span>
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

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-2">
            {data.alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'high' ? 'bg-orange-500' :
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></span>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Analytics Component
const PerformanceAnalytics: React.FC<{ 
  data: { metrics: PerformanceMetrics | null; health: SystemHealth | null } | null 
}> = ({ data }) => {
  if (!data?.metrics || !data?.health) {
    return <div className="text-center py-8">No performance data available</div>;
  }

  const { metrics, health } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Performance Analytics</h2>
      
      {/* System Health Overview */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-4 h-4 rounded-full ${
            health.overall === 'healthy' ? 'bg-green-500' :
            health.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-lg font-semibold capitalize">{health.overall}</span>
          <span className="text-sm text-gray-400">
            Uptime: {health.uptime.toFixed(1)}%
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(health.components).map(([name, component]) => (
            <div key={name} className="bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold capitalize">{name}</span>
                <span className={`w-2 h-2 rounded-full ${
                  component.status === 'healthy' ? 'bg-green-500' :
                  component.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
              </div>
              <div className="text-sm text-gray-400">
                Response: {component.responseTime.toFixed(1)}ms
              </div>
              <div className="text-sm text-gray-400">
                Error Rate: {(component.errorRate * 100).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">System Resources</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">CPU Usage</span>
              <span className="text-sm font-semibold">{metrics.system.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Memory Usage</span>
              <span className="text-sm font-semibold">{metrics.system.memoryUsage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Disk Usage</span>
              <span className="text-sm font-semibold">{metrics.system.diskUsage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Network Usage</span>
              <span className="text-sm font-semibold">{metrics.system.networkUsage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Application Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">FPS</span>
              <span className="text-sm font-semibold">{metrics.application.fps.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Latency</span>
              <span className="text-sm font-semibold">{metrics.application.latency.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Processing Time</span>
              <span className="text-sm font-semibold">{metrics.application.processingTime.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Error Rate</span>
              <span className="text-sm font-semibold">{(metrics.application.errorRate * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Performance */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Camera Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2">Camera</th>
                <th className="text-left py-2">FPS</th>
                <th className="text-left py-2">Latency</th>
                <th className="text-left py-2">Processing</th>
                <th className="text-left py-2">Error Rate</th>
                <th className="text-left py-2">Temperature</th>
                <th className="text-left py-2">Uptime</th>
              </tr>
            </thead>
            <tbody>
              {metrics.cameras.map(camera => (
                <tr key={camera.cameraId} className="border-b border-gray-700">
                  <td className="py-2 font-semibold">{camera.cameraId}</td>
                  <td className="py-2">{camera.fps.toFixed(1)}</td>
                  <td className="py-2">{camera.latency.toFixed(0)}ms</td>
                  <td className="py-2">{camera.processingTime.toFixed(0)}ms</td>
                  <td className="py-2">{(camera.errorRate * 100).toFixed(2)}%</td>
                  <td className="py-2">{camera.temperature.toFixed(1)}°C</td>
                  <td className="py-2">{camera.uptime.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Performance Alerts</h3>
          <div className="space-y-2">
            {health.alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'high' ? 'bg-orange-500' :
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></span>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Behavioral Analytics Component
const BehavioralAnalytics: React.FC<{ 
  data: { 
    behavioral: BehavioralAnalytics | null; 
    dwellTime: DwellTimeAnalysis | null; 
    traffic: TrafficPattern[] 
  } | null;
  timeRange: AnalyticsTimeRange;
  filters: AnalyticsFilter;
  onRefresh: () => void;
}> = ({ data, timeRange, filters, onRefresh }) => {
  return (
    <AdvancedBehavioralAnalytics
      data={data}
      timeRange={timeRange}
      filters={filters}
      onRefresh={onRefresh}
    />
  );
};

// Heatmap Analytics Component
const HeatmapAnalytics: React.FC<{ data: HeatmapData | null }> = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8">No heatmap data available</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Heatmap Analytics</h2>
      
      {/* Heatmap Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Detections</div>
          <div className="text-2xl font-bold text-blue-400">{data.totalDetections}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Max Intensity</div>
          <div className="text-2xl font-bold text-red-400">{data.maxIntensity.toFixed(2)}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Data Points</div>
          <div className="text-2xl font-bold text-green-400">{data.data.length}</div>
        </div>
      </div>

      {/* Heatmap Visualization */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Activity Heatmap</h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">🔥</div>
          <div>Heatmap visualization would be rendered here</div>
          <div className="text-sm mt-2">
            {data.data.length} activity points from {new Date(data.timeRange.startTime).toLocaleDateString()} to {new Date(data.timeRange.endTime).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Top Activity Areas */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Top Activity Areas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 6)
            .map((point, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg">
                <div className="font-semibold">Zone {index + 1}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Position: ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                </div>
                <div className="text-sm text-gray-400">
                  Intensity: {(point.intensity * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">
                  Detections: {point.detectionCount}
                </div>
                <div className="text-sm text-gray-400">
                  Dwell Time: {Math.round(point.dwellTime / 60)}min
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Person Journey Analytics Component
const PersonJourneyAnalytics: React.FC<{ timeRange: AnalyticsTimeRange; filters: AnalyticsFilter }> = ({ 
  timeRange, 
  filters 
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Person Journey Analytics</h2>
      <PersonJourneyVisualization 
        className="w-full"
        onPersonSelect={(personId) => {
          console.log('Selected person:', personId);
        }}
      />
    </div>
  );
};

// Reports Analytics Component
const ReportsAnalytics: React.FC<{ timeRange: AnalyticsTimeRange; filters: AnalyticsFilter }> = ({ 
  timeRange, 
  filters 
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Automated Reports</h2>
      <AutomatedReportGenerator className="w-full" />
    </div>
  );
};

export default AnalyticsPage;