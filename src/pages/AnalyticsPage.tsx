import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { EnvironmentId, BackendCameraId, AnalyticsDashboardResponse, SystemStatistics } from '../types/api';
import { APIService } from '../services/apiService';
import AnalyticsCharts from '../components/AnalyticsCharts';
import {
  Server, Clock, Zap, AlertTriangle, Monitor, Globe, Cpu, Database, Eye, Activity, Users, Video, BarChart2, CheckCircle
} from 'lucide-react';
import { getCameraDisplayName, getEnvironmentCameraIds } from '../config/environments';

// Create API service instance
// In a real app we might want to get this from a context or a hook like useSpotOnBackend
const apiService = new APIService();

const AnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const environment = (searchParams.get('environment') || 'factory') as EnvironmentId;

  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardResponse['data'] | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindowHours, setTimeWindowHours] = useState<number>(24);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // AnalyticsCharts state
  const [selectedMetricType, setSelectedMetricType] = useState<'detections' | 'occupancy' | 'flow' | 'dwell'>('detections');
  const availableCameras = getEnvironmentCameraIds(environment);
  const [selectedCameras, setSelectedCameras] = useState<Set<BackendCameraId>>(new Set(availableCameras));

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // We pass environment and windowHours to the backend
      const [dashResponse, statsResponse] = await Promise.all([
        apiService.getDashboardAnalytics(environment, timeWindowHours),
        apiService.getSystemStatistics()
      ]);
      setDashboardData(dashResponse.data);
      setSystemStats(statsResponse);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch analytics dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [environment, timeWindowHours]);

  useEffect(() => {
    fetchAnalytics();

    // Auto-refresh every 60 seconds
    const intervalId = setInterval(() => {
      fetchAnalytics();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchAnalytics]);

  // Format data for AnalyticsCharts
  const timeRangeMetrics = useMemo(() => {
    if (!dashboardData) {
      return {
        timeRange: '24h' as const,
        totalDetections: 0,
        peakHour: { hour: 0, count: 0 },
        trends: []
      };
    }

    const { charts, summary } = dashboardData;

    // Map backend detections_per_bucket to the format expected by AnalyticsCharts
    const trends = charts.detections_per_bucket.map((bucket, index) => {
      // Find corresponding confidence if available, else use average
      const confidencePoint = charts.average_confidence_trend?.[index];
      const confidence = confidencePoint ? confidencePoint.confidence_percent / 100 : summary.average_confidence_percent / 100;

      return {
        timestamp: new Date(bucket.timestamp),
        count: bucket.detections,
        confidence: confidence
      };
    });

    // Find peak hour (just roughly finding the max bucket)
    let peakIndex = 0;
    let maxCount = 0;
    trends.forEach((t, i) => {
      if (t.count > maxCount) {
        maxCount = t.count;
        peakIndex = i;
      }
    });

    const peakHourInt = trends.length > 0 ? trends[peakIndex].timestamp.getHours() : 0;

    let timeRangeLabel: '1h' | '6h' | '24h' | '7d' | '30d' = '24h';
    if (timeWindowHours === 1) timeRangeLabel = '1h';
    else if (timeWindowHours === 6) timeRangeLabel = '6h';
    else if (timeWindowHours === 168) timeRangeLabel = '7d';

    return {
      timeRange: timeRangeLabel,
      totalDetections: summary.total_detections,
      peakHour: { hour: peakHourInt, count: maxCount },
      trends: trends
    };
  }, [dashboardData, timeWindowHours]);

  const KpiCard = ({ title, value, unit, icon: Icon, description, colorClass, highlight }: any) => (
    <div className={`p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between hover:border-${colorClass}-500/30 transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg bg-${colorClass}-500/10`}>
          <Icon className={`w-5 h-5 text-${colorClass}-500`} />
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${highlight ? 'text-' + colorClass + '-400' : 'text-white'} tracking-tight`}>
            {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
          </p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-200">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white selection:bg-orange-500/30 font-sans pb-12">
      <Header
        environment={environment}
        connectionStatus={{ isConnected: true, statusText: "Connected to Database" }}
        showBackButton={true}
        backText="Back to Operations"
      />

      <main className="max-w-[1800px] mx-auto p-6 space-y-12 animate-in fade-in duration-500 mt-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Business Intelligence & Analytics
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Real telemetry mapping physical business events from the {environment} environment.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
            <span className="text-sm text-gray-400 px-2">Time Window:</span>
            <select
              className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500"
              value={timeWindowHours}
              onChange={(e) => setTimeWindowHours(Number(e.target.value))}
            >
              <option value={1}>Last Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={168}>Last 7 Days</option>
            </select>
            <button
              onClick={() => fetchAnalytics()}
              disabled={loading}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-start gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Failed to load analytics data</h4>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* 1. Global KPI Metrics */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2">
            <BarChart2 className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-semibold text-white">Aggregated Performance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Detections"
              value={dashboardData ? dashboardData.summary.total_detections.toLocaleString() : "..."}
              unit="events"
              icon={Eye}
              colorClass="orange"
              highlight={true}
              description={`Total recorded bounding boxes across all cameras in the last ${timeRangeMetrics.timeRange}.`}
            />
            <KpiCard
              title="System Uptime"
              value={dashboardData ? dashboardData.summary.system_uptime_percent.toFixed(2) : "..."}
              unit="%"
              icon={CheckCircle}
              colorClass="green"
              description="Percentage of time the tracking services were fully operational and recording."
            />
            <KpiCard
              title="Avg Detection Confidence"
              value={dashboardData ? dashboardData.summary.average_confidence_percent.toFixed(1) : "..."}
              unit="%"
              icon={Activity}
              colorClass="blue"
              description="Mean confidence score of the AI detection and re-identification models."
            />
            <KpiCard
              title="Unique Entities (Est)"
              value={dashboardData && dashboardData.cameras ? dashboardData.cameras.reduce((sum, c) => sum + c.unique_entities, 0).toLocaleString() : "..."}
              unit="people"
              icon={Users}
              colorClass="purple"
              description="Estimated count of unique individuals processed."
            />
          </div>
        </section>

        {/* 2. Visualizations using AnalyticsCharts */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-semibold text-white">Advanced Trends</h2>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-400">Metric Type:</span>
              <select
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none"
                value={selectedMetricType}
                onChange={(e) => setSelectedMetricType(e.target.value as any)}
              >
                <option value="detections">Detect Count</option>
                <option value="occupancy">Estimated Occupancy</option>
                <option value="flow">Traffic Flow</option>
                <option value="dwell">Avg Dwell Time</option>
              </select>
            </div>
          </div>

          <div className="w-full flex flex-col relative rounded-lg mb-8" style={{ minHeight: '550px', height: '550px', overflow: 'hidden' }}>
            {loading && !dashboardData ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center bg-gray-900/50 border border-gray-700 rounded-lg">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-t-orange-500 border-r-orange-500 border-b-transparent border-l-transparent animate-spin mb-4"></div>
                  <span className="text-gray-400">Loading multi-dimensional analytics...</span>
                </div>
              </div>
            ) : (
              <AnalyticsCharts
                timeRangeMetrics={timeRangeMetrics}
                selectedMetricType={selectedMetricType}
                selectedCameras={selectedCameras}
                environment={environment}
                className="flex-1 w-full h-full"
                chartType={selectedMetricType === 'detections' ? 'area' : 'line'}
                showConfidenceInterval={true}
                showTrendLine={true}
                showDataLabels={false}
              />
            )}
          </div>
        </section>

        {/* 3. Camera Level Breakdown */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Video className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-semibold text-white">Camera Workloads</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {!dashboardData ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-gray-800/50 border border-gray-700 animate-pulse h-32"></div>
              ))
            ) : (
              dashboardData.cameras.map((cameraConfig) => (
                <div key={cameraConfig.camera_id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <h3 className="font-bold text-gray-200">{getCameraDisplayName(cameraConfig.camera_id as BackendCameraId, environment)}</h3>
                    </div>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{cameraConfig.camera_id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 mb-2">
                    <div>
                      <p className="text-xs text-gray-500">Total Detections</p>
                      <p className="text-lg font-bold text-white">{cameraConfig.detections.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Unique Entities</p>
                      <p className="text-lg font-bold text-white">{cameraConfig.unique_entities.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Uptime</p>
                      <p className="text-lg font-bold text-white">{cameraConfig.uptime_percent.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Confidence</p>
                      <p className="text-lg font-bold text-white">{cameraConfig.average_confidence_percent.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Visual Progress Bar for Load distribution */}
                  <div className="mt-auto pt-4 relative">
                    <div className="w-full bg-gray-700 rounded-full h-1.5 absolute bottom-0">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (cameraConfig.detections / Object.values(dashboardData.cameras).reduce((sum, c) => sum + c.detections, 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 4. Backend Systems Health */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Server className="w-6 h-6 text-gray-400" />
            <h2 className="text-2xl font-semibold text-white">Backing Services Health</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-gray-200">Database Engine</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">PostgreSQL Status</span>
                  <span className={`text-sm font-medium ${systemStats?.database_service?.postgres_status === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {systemStats?.database_service?.postgres_status || 'Checking...'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Redis Cache Status</span>
                  <span className={`text-sm font-medium ${systemStats?.database_service?.redis_status === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {systemStats?.database_service?.redis_status || 'Checking...'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Total Active Sessions</span>
                  <span className="text-sm text-white font-medium">{systemStats?.database_service?.total_active_sessions ?? '0'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-gray-200">Analytics Engine Process</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Avg Query latency</span>
                  <span className="text-sm text-white font-medium">{systemStats?.analytics_engine?.average_query_time_ms ? `${systemStats.analytics_engine.average_query_time_ms.toFixed(1)} ms` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Cache Hit Rate</span>
                  <span className="text-sm text-white font-medium">{systemStats?.analytics_engine?.cache_hit_rate ? `${(systemStats.analytics_engine.cache_hit_rate * 100).toFixed(1)} %` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Queries Processed</span>
                  <span className="text-sm text-white font-medium">{systemStats?.analytics_engine?.total_queries_processed?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-gray-200">Processing Models</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Behavior Analysis</span>
                  <span className="text-sm text-white font-medium">{systemStats?.analytics_engine?.total_behavior_analyses?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Path Predictions</span>
                  <span className="text-sm text-white font-medium">{systemStats?.analytics_engine?.total_path_predictions?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="text-sm text-gray-400">Service Uptime</span>
                  <span className="text-sm text-white font-medium">{systemStats?.system_uptime || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AnalyticsPage;
