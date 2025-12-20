// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Map, BarChart2 } from 'lucide-react';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import Header from '../components/common/Header';
import StatusCard from '../components/common/StatusCard';
import heroImage from '../assets/hero-image.png';

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="text-left">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              SpotOn
            </h1>
            <h2 className="text-4xl font-bold mb-6 text-white">
              Intelligent Multi-Camera Person Tracking
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed mb-8">
              Automate the detection, tracking, and re-identification of individuals across multiple camera feeds.
            </p>

            <div className="flex justify-start">
              <Link
                to="/environments"
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25"
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="SpotOn Dashboard Preview"
              className="w-full"
            />
          </div>
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
