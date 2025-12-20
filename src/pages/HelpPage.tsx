// src/pages/HelpPage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import {
  BookOpen,
  Map,
  Camera,
  MousePointer,
  Activity,
  HelpCircle,
  ChevronRight,
  Users,
  Eye,
  BarChart2
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const HelpPage: React.FC = () => {
  const { isConnected, backendStatus } = useSpotOnBackend();
  const [activeSection, setActiveSection] = useState('welcome');

  const connectionStatus = {
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  };

  const sections: DocSection[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      content: (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
              User Guide
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              Welcome to the SpotOn monitoring dashboard. This guide will help you master the tools available for tracking personnel safety and facility usage across your environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all duration-300 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                <Eye className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Monitor</h3>
              <p className="text-sm text-gray-400">
                View live feeds from up to 8 cameras simultaneously.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all duration-300 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                <MousePointer className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Track</h3>
              <p className="text-sm text-gray-400">
                Click any person to follow them across different cameras.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all duration-300 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                <BarChart2 className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analyze</h3>
              <p className="text-sm text-gray-400">
                Review occupancy trends and movement patterns.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'quick-start',
      title: 'Quick Start',
      content: (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Start Monitoring in 3 Steps</h2>
            <div className="relative pl-8 space-y-10 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-800">

              <div className="relative">
                <div className="absolute -left-8 w-6 h-6 rounded-full bg-gray-900 border border-orange-500 flex items-center justify-center text-xs font-bold text-orange-500">1</div>
                <h3 className="text-xl font-semibold text-white mb-2">Select Your Zone</h3>
                <p className="text-gray-400 mb-4">
                  Upon launching the application, choose the environment you wish to monitor.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div className="p-4 rounded bg-gray-900 border border-gray-800">
                    <span className="text-orange-400 font-bold block mb-1">Factory Floor</span>
                    <span className="text-sm text-gray-500">Cameras 09, 12, 13, 16</span>
                  </div>
                  <div className="p-4 rounded bg-gray-900 border border-gray-800">
                    <span className="text-blue-400 font-bold block mb-1">Campus Ground</span>
                    <span className="text-sm text-gray-500">Cameras 01, 02, 03, 05</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-8 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">2</div>
                <h3 className="text-xl font-semibold text-white mb-2">Enter the Control Room</h3>
                <p className="text-gray-400">
                  Click <strong>"Get Started"</strong>. You will be taken to the <strong>Group View</strong> page where all camera feeds are synchronized.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-8 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">3</div>
                <h3 className="text-xl font-semibold text-white mb-2">Begin Observation</h3>
                <p className="text-gray-400">
                  The system automatically detects individuals (highlighted in boxes). Use the interactive map on the right to see their real-time positions.
                </p>
              </div>

            </div>
          </div>
        </div>
      )
    },
    {
      id: 'live-tracking',
      title: 'Live Tracking Features',
      content: (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-bold text-white mb-6">Using the Tracking Tools</h2>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <MousePointer className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold text-white">Focus Mode</h3>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                To track a specific individual across the facility:
              </p>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 ml-2">
                <li>Locate the person in any camera feed.</li>
                <li><strong>Click directly on their bounding box.</strong></li>
                <li>The system will lock onto this person. Their bounding box will turn <span className="text-orange-400 font-bold">Orange</span>.</li>
                <li>The system will now highlight this same person in <strong>all other cameras</strong> automatically.</li>
              </ol>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Map className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold text-white">Interactive Map</h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                The map on the right side of your screen shows a bird's-eye view of the facility.
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span><strong>Orange Dot:</strong> The person you are currently tracking.</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                  <span><strong>Gray Dot:</strong> Other detected individuals.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Analytics Guide',
      content: (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Understanding Reports</h2>
            <p className="text-gray-400 mb-8">
              Navigate to the <strong>Analytics</strong> page via the header to view long-term trends.
            </p>

            <div className="grid grid-cols-1 gap-6">
              <div className="flex gap-6 p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="shrink-0 pt-1">
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Peak Occupancy</h3>
                  <p className="text-gray-400 text-sm">
                    Understand when your facility is busiest. Use this data to schedule cleaning or security shifts efficiently.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="shrink-0 pt-1">
                  <Activity className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Traffic Heatmaps</h3>
                  <p className="text-gray-400 text-sm">
                    Visualizes "hot spots" where people tend to congregate. Warmer colors (Red/Orange) indicate high traffic areas, while cooler colors (Blue) indicate low usage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'Common Questions',
      content: (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Why did the tracking box disappear?</h3>
              <p className="text-sm text-gray-400">
                If a person walks behind a large obstacle (like a pillar or machine) or leaves the camera's view, the tracking box may briefly disappear. The system will attempt to picking them up again once they reappear.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Can I export the video?</h3>
              <p className="text-sm text-gray-400">
                Currently, SpotOn is a <strong>live monitoring tool</strong>. Video export functionality is scheduled for a future update. However, you can export <em>Analytics reports</em> as PDFs.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">My screen says "Disconnected"</h3>
              <p className="text-sm text-gray-400">
                This usually means the connection to the processing server was lost. Please verify your internet connection. If the problem persists, contact your IT administrator.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-orange-500/30">
      <Header
        connectionStatus={connectionStatus}
        showBackButton={true}
        backText="Back to App"
        backUrl="/"
      />

      <div className="flex flex-1 max-w-[1600px] mx-auto w-full pt-8">

        {/* Sidebar Navigation */}
        <aside className="w-64 hidden lg:block sticky top-8 h-[calc(100vh-8rem)] overflow-y-auto px-6 border-r border-gray-800 ml-4">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 text-orange-500">
              <BookOpen className="w-5 h-5" />
              <span className="font-bold tracking-tight">User Guide</span>
            </div>
            <p className="text-xs text-gray-500">Updated: Dec 2025</p>
          </div>

          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-between group ${activeSection === section.id
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {section.title}
                {activeSection === section.id && (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 px-8 lg:px-16 pb-20 max-w-5xl">
          {sections.map(section => (
            <div key={section.id} className={activeSection === section.id ? 'block' : 'hidden'}>
              {section.content}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
};

export default HelpPage;