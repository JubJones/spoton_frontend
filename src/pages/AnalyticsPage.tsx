import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { EnvironmentId } from '../types/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar
} from 'recharts';
import {
  Server, Clock, Zap, AlertTriangle, Monitor, Globe, Cpu, Database, Eye, Activity
} from 'lucide-react';

// --- Metric Interfaces ---
interface TimeSeriesPoint {
  time: string;
  value: number;
}

// --- Mock Data Generation ---
const generateTimeSeriesData = (points: number, baseValue: number, variance: number, trend: number = 0): TimeSeriesPoint[] => {
  const data = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 1 minute intervals
    const value = baseValue + (Math.random() * variance * 2 - variance) + (points - i) * trend;
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: Number(Math.max(0, value).toFixed(2))
    });
  }
  return data;
};

const AnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const environment = (searchParams.get('environment') || 'factory') as EnvironmentId;

  // Real-time state for simulating live updates
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  // --- Mocking The Requested Metrics ---
  const metrics = useMemo(() => {
    // 1. System and API Health
    const apiP50 = 45 + Math.random() * 5;
    const apiP95 = 120 + Math.random() * 10;
    const apiP99 = 250 + Math.random() * 50;
    const rpsCurrent = 1250 + Math.random() * 100;
    const errorRateCurrent = 0.15 + Math.random() * 0.05;

    // 2. Real-Time Processing
    const g2gCurrent = 120 + Math.random() * 20;
    const pipelineCurrent = 45 + Math.random() * 10;
    const streamInitCurrent = 1.2 + Math.random() * 0.3;
    const wsLatencyCurrent = 15 + Math.random() * 5;
    const frameDropCurrent = 0.5 + Math.random() * 0.2;

    // 3. Frontend UX
    const ttfbCurrent = 150 + Math.random() * 20;
    const lcpCurrent = 1.5 + Math.random() * 0.2;
    const ttiCurrent = 2.1 + Math.random() * 0.3;
    const fpsCurrent = 59 + Math.random() * 1; // Almost 60 FPS typically

    // Historical Series
    return {
      system: {
        apiResponse: { p50: apiP50, p95: apiP95, p99: apiP99 },
        throughput: rpsCurrent,
        throughputHistory: generateTimeSeriesData(30, 1200, 150, 0),
        errorRate: errorRateCurrent,
        errorHistory: generateTimeSeriesData(30, 0.2, 0.1, 0)
      },
      processing: {
        glassToGlass: g2gCurrent,
        pipeline: pipelineCurrent,
        latencyHistory: generateTimeSeriesData(30, 120, 25, 0).map(pt => ({
          time: pt.time,
          glass: pt.value,
          pipeline: pt.value * 0.4
        })),
        streamInit: streamInitCurrent,
        wsLatency: wsLatencyCurrent,
        frameDrop: frameDropCurrent,
        frameDropHistory: generateTimeSeriesData(30, 0.5, 0.3, 0)
      },
      frontend: {
        ttfb: ttfbCurrent,
        lcp: lcpCurrent,
        tti: ttiCurrent,
        fps: fpsCurrent,
        fpsHistory: generateTimeSeriesData(30, 59, 2, 0)
      }
    };
  }, [tick]); // Re-calculate to simulate live feed

  const KpiCard = ({ title, value, unit, icon: Icon, description, colorClass }: any) => (
    <div className={`p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between hover:border-${colorClass}-500/30 transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg bg-${colorClass}-500/10`}>
          <Icon className={`w-5 h-5 text-${colorClass}-500`} />
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white tracking-tight">{value} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
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
        connectionStatus={{ isConnected: true, statusText: "Connected (Telemetry Mock)" }}
        showBackButton={true}
        backText="Back to Operations"
      />

      <main className="max-w-[1800px] mx-auto p-6 space-y-12 animate-in fade-in duration-500 mt-6">

        {/* Header Section */}
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            Performance Metrics
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            Detailed telemetry covering System & API health, Real-Time Processing pipelines, and Frontend User Experience.
          </p>
        </div>

        {/* 1. System and API Health Metrics */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Server className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-semibold text-white">System and API Health Metrics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between col-span-1 lg:col-span-2 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="w-5 h-5 text-blue-500" /></div>
                <h3 className="text-lg font-bold text-gray-200">API Response Time</h3>
              </div>
              <div className="grid grid-cols-3 gap-6 mt-2">
                <div>
                  <p className="text-3xl font-bold text-white">{metrics.system.apiResponse.p50.toFixed(0)} <span className="text-sm text-gray-500">ms</span></p>
                  <p className="text-xs text-blue-400 font-semibold mt-1">p50 (Median)</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{metrics.system.apiResponse.p95.toFixed(0)} <span className="text-sm text-gray-500">ms</span></p>
                  <p className="text-xs text-yellow-500 font-semibold mt-1">p95</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-400">{metrics.system.apiResponse.p99.toFixed(0)} <span className="text-sm text-gray-500">ms</span></p>
                  <p className="text-xs text-orange-500 font-semibold mt-1">p99 (Peak)</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-6 leading-relaxed">Average and peak times required for REST endpoints to return data, ensuring responsiveness for historical and analytical queries.</p>
            </div>

            <KpiCard
              title="Throughput"
              value={metrics.system.throughput.toFixed(0)}
              unit="RPS"
              icon={Activity}
              colorClass="green"
              description="Volume of concurrent requests the API & WS can handle."
            />
            <KpiCard
              title="Error Rate"
              value={metrics.system.errorRate.toFixed(2)}
              unit="%"
              icon={AlertTriangle}
              colorClass="red"
              description="Percentage of failed HTTP requests (4xx, 5xx) & dropped WS."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-[300px] flex flex-col">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Throughput Trend (RPS)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.system.throughputHistory}>
                  <defs>
                    <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fillOpacity={1} fill="url(#colorRps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-[300px] flex flex-col">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Error Rate Trend (%)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.system.errorHistory}>
                  <defs>
                    <linearGradient id="colorErr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                  <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={1} fill="url(#colorErr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 2. Real-Time Processing Performance */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Cpu className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-semibold text-white">Real-Time Processing Performance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard title="Glass-to-Glass Latency" value={metrics.processing.glassToGlass.toFixed(0)} unit="ms" icon={Eye} colorClass="orange" description="Total delay from physical event to UI dashboard." />
            <KpiCard title="Pipeline Latency" value={metrics.processing.pipeline.toFixed(0)} unit="ms" icon={Database} colorClass="blue" description="Backend ingestion, tracking, & emission time." />
            <KpiCard title="Stream Init Time" value={metrics.processing.streamInit.toFixed(2)} unit="s" icon={Zap} colorClass="yellow" description="Time elapsed request to first video frame." />
            <KpiCard title="WS Message Latency" value={metrics.processing.wsLatency.toFixed(0)} unit="ms" icon={Globe} colorClass="purple" description="Tracking coord delivery delay backend to frontend." />
            <KpiCard title="Frame Drop Rate" value={metrics.processing.frameDrop.toFixed(2)} unit="%" icon={AlertTriangle} colorClass="red" description="% frames dropped due to processing limits." />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-[300px] flex flex-col col-span-1 lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Latency Breakdown (ms)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.processing.latencyHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                  <Line type="monotone" name="Glass-to-Glass Overall" dataKey="glass" stroke="#f97316" strokeWidth={3} dot={false} />
                  <Line type="monotone" name="AI Pipeline Time" dataKey="pipeline" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-[300px] flex flex-col">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Frame Drops (%)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.processing.frameDropHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} cursor={{ fill: '#ffffff10' }} />
                  <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 3. Frontend User Experience Metrics */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Monitor className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-semibold text-white">Frontend User Experience Metrics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Time to First Byte" value={metrics.frontend.ttfb.toFixed(0)} unit="ms" icon={Globe} colorClass="blue" description="Delay between request and first byte (TTFB)." />
            <KpiCard title="Largest Contentful Paint" value={metrics.frontend.lcp.toFixed(2)} unit="s" icon={Eye} colorClass="purple" description="Render time of largest visual element (LCP)." />
            <KpiCard title="Time to Interactive" value={metrics.frontend.tti.toFixed(2)} unit="s" icon={Activity} colorClass="green" description="Time for dashboard to become responsive (TTI)." />
            <KpiCard title="UI Frame Rate" value={metrics.frontend.fps.toFixed(0)} unit="FPS" icon={Monitor} colorClass="orange" description="Client rendering speed for tracking visuals." />
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-[250px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-200">UI Rendering Stability (FPS)</h3>
              <div className="px-3 py-1 rounded bg-orange-500/20 text-orange-400 text-xs font-bold">Target: 60 FPS</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.frontend.fpsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Line type="stepAfter" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AnalyticsPage;
