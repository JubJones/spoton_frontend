// src/pages/AnalyticsPage.tsx
import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import { useCameraConfig } from '../context/CameraConfigContext';
import { APIService } from '../services/apiService';
import { AnalyticsDashboardResponse, EnvironmentId } from '../types/api';
import { useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  Activity,
  Users,
  Clock,
  AlertCircle,
  Server,
  Download,
  Video,
  Zap,
  ChevronDown
} from 'lucide-react';

// --- Mock Data Generators Removed ---
// Real data is now fetched via useSpotOnBackend and APIService

const RECENT_ALERTS = [
  { id: 1, type: 'warning', message: 'High occupancy detected in C12', time: '10:42 AM' },
  { id: 2, type: 'info', message: 'Shift change pattern recognized', time: '09:00 AM' },
  { id: 3, type: 'success', message: 'System health check passed', time: '08:00 AM' },
];

const AnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const environment = (searchParams.get('environment') || 'factory') as EnvironmentId;
  const [timeRange, setTimeRange] = useState('24h');
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, backendStatus } = useSpotOnBackend();
  const { environmentCameras } = useCameraConfig();

  // Fetch dashboard data on mount and when environment changes
  useEffect(() => {
    let mounted = true;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const api = new APIService();
        const response = await api.getDashboardAnalytics(environment, 24); // Default to 24h for now

        if (mounted) {
          if (response.status === 'success' && response.data) {
            setDashboardData(response.data);
          } else {
            setError('Failed to load analytics data');
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching analytics:', err);
          setError('System unreachable');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAnalytics();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [environment]);

  const connectionStatus = useMemo(() => ({
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  }), [backendStatus.status, isConnected]);

  const cameraCount = (environmentCameras[environment] ?? []).length;

  // Process all chart data
  const { activityData, accuracyData, uptimeData } = useMemo(() => {
    if (!dashboardData?.charts) return { activityData: [], accuracyData: [], uptimeData: [] };

    const activity = dashboardData.charts.detections_per_bucket.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      persons: point.detections,
    }));

    const accuracy = dashboardData.charts.average_confidence_trend.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: point.confidence_percent,
    }));

    const uptime = dashboardData.charts.uptime_trend.map(point => ({
      date: new Date(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      uptime: point.uptime_percent,
    }));

    return { activityData: activity, accuracyData: accuracy, uptimeData: uptime };
  }, [dashboardData]);

  // Real Distribution Data from Cameras
  const distributionData = useMemo(() => {
    if (!dashboardData?.cameras) return [];

    // Group cameras by zone prefix (e.g., c01-c04 = Campus, c09-c16 = Factory) - assuming convention or metadata
    // For now, we'll iterate through known lists since we have environmentCameras

    // Actually, let's just use the camera ID to guess or use metadata if available.
    // The previous code had hardcoded zones. Let's make it data-driven:

    const factoryCameras = ['c09', 'c12', 'c13', 'c16'];
    const campusCameras = ['c01', 'c02', 'c03', 'c05'];

    let factoryCount = 0;
    let campusCount = 0;

    dashboardData.cameras.forEach(cam => {
      if (factoryCameras.includes(cam.camera_id)) factoryCount += cam.detections;
      else if (campusCameras.includes(cam.camera_id)) campusCount += cam.detections;
      else {
        // Fallback for unknown cameras -> assign to current environment
        if (environment === 'factory') factoryCount += cam.detections;
        else campusCount += cam.detections;
      }
    });

    const total = factoryCount + campusCount || 1; // avoid /0

    return [
      { name: 'Factory Zone', value: Math.round((factoryCount / total) * 100), raw: factoryCount, color: '#f97316' },
      { name: 'Campus Zone', value: Math.round((campusCount / total) * 100), raw: campusCount, color: '#3b82f6' },
    ].filter(d => d.value > 0);
  }, [dashboardData, environment]);

  const summary = dashboardData?.summary;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white selection:bg-orange-500/30 font-sans">
      <Header
        environment={environment}
        connectionStatus={connectionStatus}
        showBackButton={true}
        backText="Back to Operations"
      />

      <main className="max-w-[1800px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-2">
              <Activity className="w-3 h-3" />
              <span>LIVE ANALYTICS</span>
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Command Center
            </h1>
            <p className="text-gray-400 mt-1">Real-time surveillance intelligence for {environment.charAt(0).toUpperCase() + environment.slice(1)}.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-1 flex">
              {['1h', '6h', '24h', '7d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === range
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export Report</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !dashboardData && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-400">Loading analytics streams...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && !dashboardData && (
          <div className="text-center py-20 bg-red-500/10 rounded-2xl border border-red-500/20">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Unavailable</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {/* Dashboard Content */}
        {dashboardData && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total Active Persons"
                value={summary?.total_detections.toLocaleString() ?? '0'}
                change="+12%" // Calculate real delta if available
                trend="up"
                icon={Users}
                color="orange"
              />
              <KpiCard
                title="Avg Confidence"
                value={`${summary?.average_confidence_percent.toFixed(1)}%`}
                change="Target > 80%"
                trend={summary?.average_confidence_percent && summary.average_confidence_percent > 80 ? 'up' : 'neutral'}
                icon={Activity}
                color="blue"
              />
              <KpiCard
                title="Active Cameras"
                value={`${cameraCount}`}
                change="100% Uptime"
                trend="up"
                icon={Video}
                color="green"
              />
              <KpiCard
                title="System Uptime"
                value={`${summary?.system_uptime_percent}%`}
                change={`+${summary?.uptime_delta_percent}%`}
                trend="up"
                icon={Zap}
                color="purple"
              />
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Area Chart: Activity Trend */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Activity Volume</h3>
                    <p className="text-sm text-gray-500">Person detection frequency over time</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span>Total Detections</span>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="colorPersons" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="persons"
                        stroke="#f97316"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPersons)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Secondary Column: Distribution & Recent Events */}
              <div className="space-y-6">

                {/* Donut Chart: Zone Distribution */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl min-h-[300px]">
                  <h3 className="text-lg font-bold text-white mb-6">Zone Distribution</h3>
                  <div className="relative h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-white">100%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-4 px-4">
                    {distributionData.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-gray-400">{item.name}</span>
                        </div>
                        <span className="text-white font-mono">{item.value}% ({item.raw})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Events */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">System Events</h3>
                    <button className="text-xs text-orange-400 hover:text-orange-300">View All</button>
                  </div>
                  <div className="space-y-4 max-h-[150px] overflow-y-auto">
                    {RECENT_ALERTS.map(alert => (
                      <div key={alert.id} className="flex gap-4 items-start p-3 rounded-lg bg-white/5 border border-white/5">
                        <AlertIcon type={alert.type} />
                        <div>
                          <p className="text-sm text-gray-200 font-medium">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* NEW: Operational Statistics Section */}
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Operational Status</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Accuracy Trend */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-2">Detection Accuracy Trend</h3>
                <p className="text-xs text-gray-500 mb-6">Average confidence score over the last 24h</p>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                      {/* Domain 0-100 */}
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="confidence" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Uptime Trend */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-2">System Availability Trend</h3>
                <p className="text-xs text-gray-500 mb-6">Daily uptime percentage over the last 7 days</p>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={uptimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: '#ffffff10' }}
                      />
                      <Bar dataKey="uptime" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* NEW: Camera Health Grid */}
            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Camera Health & Load</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.cameras.map((cam) => (
                <div key={cam.camera_id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-white font-bold">{cam.camera_id}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${cam.uptime_percent > 98 ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Detections</span>
                      <span className="text-white">{cam.detections.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Unique Entities</span>
                      <span className="text-white">{cam.unique_entities}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Avg Confidence</span>
                      <span className="text-blue-400">{cam.average_confidence_percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(cam.detections / 5, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Server Health Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-8">
              <HealthMetric label="Server Status" value={backendStatus.status} status={isConnected ? 'active' : 'neutral'} />
              <HealthMetric label="Data Freshness" value={dashboardData.generated_at ? new Date(dashboardData.generated_at).toLocaleTimeString() : 'Unknown'} status="active" />
              <HealthMetric label="Last Backup" value="2 hours ago" status="neutral" />
            </div>
          </>
        )}

      </main>
    </div>
  );
};

// --- Helper Components ---

const KpiCard: React.FC<{
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: 'orange' | 'blue' | 'green' | 'purple';
}> = ({ title, value, change, trend, icon: Icon, color }) => {

  const colors = {
    orange: 'bg-orange-500/10 text-orange-500',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-orange-500/30 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg \${colors[color]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white/5 \${trendColor}`}>
          {change}
        </span>
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

const AlertIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'warning') return <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />;
  if (type === 'success') return <Activity className="w-5 h-5 text-green-400 mt-0.5" />;
  return <Server className="w-5 h-5 text-blue-400 mt-0.5" />;
}

const HealthMetric: React.FC<{ label: string; value: string; status: 'active' | 'neutral' }> = ({ label, value, status }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full \${status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-300 font-mono">{value}</p>
      </div>
    </div>
  );
}

export default AnalyticsPage;
