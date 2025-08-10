// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import Header from '../components/common/Header';
import StatusCard from '../components/common/StatusCard';

const LandingPage: React.FC = () => {
  const { isConnected, backendStatus } = useSpotOnBackend();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const systemStats = {
    uptime: '99.9%',
    activeEnvironments: 2,
    totalCameras: 8,
    processingSpeed: '30 FPS',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Navigation Header */}
      <Header
        connectionStatus={{
          isConnected,
          statusText: isConnected ? 'Connected' : 'Disconnected',
        }}
      />

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Beyond Watching:
          </h2>
          <p className="text-3xl text-orange-400 font-semibold mb-8">
            Intelligent Tracking in Action
          </p>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Real-time multi-camera person tracking with advanced AI-powered analytics. Monitor,
            analyze, and understand movement patterns across complex environments.
          </p>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <StatusCard label="System Uptime" value={systemStats.uptime} status="success" />
          <StatusCard label="Environments" value={systemStats.activeEnvironments} status="info" />
          <StatusCard label="Total Cameras" value={systemStats.totalCameras} status="info" />
          <StatusCard
            label="Processing Speed"
            value={systemStats.processingSpeed}
            status="warning"
          />
        </div>

        {/* Main Action Section */}
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold mb-8 text-white">Select Your Environment</h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Choose from our pre-configured monitoring environments or set up a custom configuration
            tailored to your specific needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/environments"
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25"
            >
              Browse Environments
            </Link>

            <Link
              to="/custom-setup"
              className="px-8 py-4 bg-transparent border-2 border-gray-600 hover:border-orange-400 rounded-xl font-semibold text-gray-300 hover:text-orange-400 transition-all duration-300"
            >
              Custom Setup
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <h4 className="text-xl font-semibold mb-3 text-white">Real-time Tracking</h4>
            <p className="text-gray-400">
              Monitor person movement across multiple camera feeds with advanced AI-powered
              detection and tracking algorithms.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🗺️</span>
            </div>
            <h4 className="text-xl font-semibold mb-3 text-white">Spatial Mapping</h4>
            <p className="text-gray-400">
              Visualize movement patterns on interactive maps with coordinate transformation and
              trajectory analysis.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <h4 className="text-xl font-semibold mb-3 text-white">Analytics Dashboard</h4>
            <p className="text-gray-400">
              Access comprehensive analytics with historical data, pattern recognition, and
              customizable reporting.
            </p>
          </div>
        </div>

        {/* System Time */}
        <div className="text-center text-gray-500 text-sm">
          System Time: {currentTime.toLocaleString()}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-800 text-center text-gray-500">
        <p>&copy; 2024 SpotOn Intelligence. Advanced Computer Vision & Analytics Platform.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
