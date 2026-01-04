// src/pages/HelpPage.tsx
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const HelpPage: React.FC = () => {
  const { isConnected, backendStatus } = useSpotOnBackend();
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create connection status for Header component
  const connectionStatus = {
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  };

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-400 mb-4">Welcome to SpotOn</h3>
            <p className="text-gray-300 mb-4">
              SpotOn is an intelligent multi-camera person tracking and analytics system that provides 
              real-time person detection, cross-camera tracking, and spatial mapping capabilities.
            </p>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-orange-400 font-bold">1.</span>
                <div>
                  <h4 className="font-semibold text-white">Select Environment</h4>
                  <p className="text-gray-400">Choose between Factory or Campus environment from the main dashboard.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-orange-400 font-bold">2.</span>
                <div>
                  <h4 className="font-semibold text-white">Configure Settings</h4>
                  <p className="text-gray-400">Set up your time range, cameras, and tracking preferences.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-orange-400 font-bold">3.</span>
                <div>
                  <h4 className="font-semibold text-white">Start Tracking</h4>
                  <p className="text-gray-400">Begin monitoring and analyzing person movements across multiple cameras.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">System Requirements</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• Modern web browser (Chrome, Firefox, Safari, Edge)</li>
                <li>• Stable internet connection</li>
                <li>• Backend server running on port 3847 (not required in mock mode)</li>
                <li>• JavaScript enabled</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <Link to="/environments" className="block text-orange-400 hover:text-orange-300 text-sm">
                  → Select Environment
                </Link>
                <Link to="/group-view" className="block text-orange-400 hover:text-orange-300 text-sm">
                  → Start Tracking
                </Link>
                <Link to="/analytics" className="block text-orange-400 hover:text-orange-300 text-sm">
                  → View Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Features Overview',
      icon: '✨',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">🎥 Multi-Camera Tracking</h3>
              <p className="text-gray-300 mb-3">
                Monitor multiple camera feeds simultaneously with synchronized playback and real-time tracking.
              </p>
              <ul className="text-gray-400 space-y-1 text-sm">
                <li>• Support for up to 8 cameras</li>
                <li>• Real-time frame processing</li>
                <li>• Synchronized playback controls</li>
                <li>• Camera status monitoring</li>
              </ul>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">🔍 Person Detection</h3>
              <p className="text-gray-300 mb-3">
                Advanced AI-powered person detection with high accuracy and confidence scoring.
              </p>
              <ul className="text-gray-400 space-y-1 text-sm">
                <li>• Faster R-CNN detection model</li>
                <li>• Confidence threshold filtering</li>
                <li>• Real-time bounding box overlay</li>
                <li>• Detection statistics</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-3">🚶 Cross-Camera Tracking</h3>
              <p className="text-gray-300 mb-3">
                Track individuals across multiple cameras using advanced re-identification technology.
              </p>
              <ul className="text-gray-400 space-y-1 text-sm">
                <li>• CLIP-based re-identification</li>
                <li>• Global person ID assignment</li>
                <li>• Cross-camera trajectory mapping</li>
                <li>• Movement pattern analysis</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">📊 Analytics Dashboard</h3>
              <p className="text-gray-300 mb-3">
                Comprehensive analytics and reporting with exportable data and insights.
              </p>
              <ul className="text-gray-400 space-y-1 text-sm">
                <li>• Real-time metrics</li>
                <li>• Historical data analysis</li>
                <li>• Export in multiple formats</li>
                <li>• Custom alert configuration</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'user-guide',
      title: 'User Guide',
      icon: '📖',
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Environment Selection</h3>
              <p className="text-gray-300 mb-3">
                Choose the environment that matches your deployment scenario:
              </p>
              <div className="space-y-3">
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-400">Factory Environment</h4>
                  <p className="text-gray-400 text-sm">
                    Optimized for industrial settings with cameras c09, c12, c13, c16. 
                    Ideal for monitoring production areas, quality control, and safety compliance.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-400">Campus Environment</h4>
                  <p className="text-gray-400 text-sm">
                    Designed for educational or corporate campuses with cameras c01, c02, c03, c05. 
                    Perfect for tracking foot traffic, security monitoring, and space utilization.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tracking Interface</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Camera Grid</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• View up to 4 cameras simultaneously</li>
                    <li>• Real-time bounding box overlays</li>
                    <li>• Click to focus on specific persons</li>
                    <li>• Synchronized playback across cameras</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Interactive Map</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• 2D spatial representation</li>
                    <li>• Real-time position tracking</li>
                    <li>• Camera coverage visualization</li>
                    <li>• Movement trajectory display</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Analytics Features</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-300 mb-1">Data Export</h4>
                  <p className="text-gray-400 text-sm mb-2">
                    Export tracking data and analytics in multiple formats for further analysis.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">CSV</span>
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">JSON</span>
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">Excel</span>
                    <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs">PDF</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-300 mb-1">Alert Configuration</h4>
                  <p className="text-gray-400 text-sm">
                    Set up custom alerts for person count thresholds, occupancy time limits, and camera status changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      content: (
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-4">Common Issues</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">Backend Connection Failed</h4>
                <p className="text-gray-300 mb-2">
                  If you see "Backend connection lost" message:
                </p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                  <li>• Check that the backend server is running on port 3847 (or enable mock mode)</li>
                  <li>• Verify your network connection</li>
                  <li>• Ensure no firewall is blocking the connection</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Cameras Not Loading</h4>
                <p className="text-gray-300 mb-2">
                  If camera feeds are not displaying:
                </p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                  <li>• Check camera status in the header</li>
                  <li>• Verify camera configurations in settings</li>
                  <li>• Ensure video data is available for selected time range</li>
                  <li>• Check browser console for error messages</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Slow Performance</h4>
                <p className="text-gray-300 mb-2">
                  If the application is running slowly:
                </p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                  <li>• Close other browser tabs to free memory</li>
                  <li>• Reduce the number of simultaneous cameras</li>
                  <li>• Check your internet connection speed</li>
                  <li>• Clear browser cache and cookies</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Performance Optimization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-white mb-2">Recommended Settings</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Use Chrome or Firefox for best performance</li>
                  <li>• Enable hardware acceleration</li>
                  <li>• Close unnecessary applications</li>
                  <li>• Use wired internet when possible</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">System Requirements</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• 8GB+ RAM recommended</li>
                  <li>• Modern CPU (Intel i5/AMD Ryzen 5+)</li>
                  <li>• Stable 100+ Mbps internet</li>
                  <li>• Up-to-date browser version</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      icon: '⚙️',
      content: (
        <div className="space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Backend Integration</h3>
            <p className="text-gray-300 mb-4">
              SpotOn frontend communicates with a FastAPI backend server for all tracking and analytics operations.
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-orange-400 mb-2">Base URL</h4>
                <code className="bg-gray-900 text-green-400 px-3 py-1 rounded text-sm">
                  http://localhost:3847
                </code>
              </div>

              <div>
                <h4 className="font-medium text-orange-400 mb-2">WebSocket Connection</h4>
                <code className="bg-gray-900 text-green-400 px-3 py-1 rounded text-sm">
                  ws://localhost:3847/ws/tracking/[task_id]
                </code>
              </div>

              <div>
                <h4 className="font-medium text-orange-400 mb-2">Key Endpoints</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono">GET</span>
                    <code className="text-sm text-gray-300">/health</code>
                    <span className="text-gray-400 text-sm">System health check</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-mono">POST</span>
                    <code className="text-sm text-gray-300">/api/v1/processing-tasks/start</code>
                    <span className="text-gray-400 text-sm">Start tracking task</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono">GET</span>
                    <code className="text-sm text-gray-300">/api/v1/analytics/real-time/metrics</code>
                    <span className="text-gray-400 text-sm">Get analytics data</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-mono">POST</span>
                    <code className="text-sm text-gray-300">/api/v1/export/analytics-report</code>
                    <span className="text-gray-400 text-sm">Export analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Data Formats</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-400 mb-2">Tracking Data Structure</h4>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "global_frame_index": 42,
  "scene_id": "factory",
  "timestamp_processed_utc": "2025-01-10T08:30:00Z",
  "cameras": {
    "c09": {
      "image_source": "frame_000042.jpg",
      "frame_image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
      "tracks": [
        {
          "track_id": 1,
          "global_id": "person_123",
          "bbox_xyxy": [100, 150, 200, 400],
          "confidence": 0.95,
          "map_coords": [25.4, 18.7]
        }
      ]
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const faqs: FAQ[] = [
    {
      id: 'what-is-spoton',
      question: 'What is SpotOn?',
      answer: 'SpotOn is an intelligent multi-camera person tracking and analytics system that uses advanced AI to detect, track, and analyze person movement across multiple camera feeds in real-time.',
    },
    {
      id: 'supported-cameras',
      question: 'How many cameras does SpotOn support?',
      answer: 'SpotOn supports up to 8 cameras simultaneously, with two pre-configured environments: Factory (cameras c09, c12, c13, c16) and Campus (cameras c01, c02, c03, c05).',
    },
    {
      id: 'accuracy',
      question: 'How accurate is the person detection?',
      answer: 'SpotOn uses state-of-the-art Faster R-CNN models for person detection with typical accuracy rates above 90%. The system also includes confidence scoring and filtering to ensure high-quality detections.',
    },
    {
      id: 'data-export',
      question: 'Can I export tracking data?',
      answer: 'Yes, SpotOn provides comprehensive data export functionality in multiple formats including CSV, JSON, Excel, and PDF reports. You can export analytics data, tracking trajectories, and system statistics.',
    },
    {
      id: 'real-time',
      question: 'Is tracking performed in real-time?',
      answer: 'SpotOn processes video feeds in near real-time, typically at 30 FPS. The system includes WebSocket connections for live updates and synchronized playback across multiple cameras.',
    },
    {
      id: 'privacy',
      question: 'How does SpotOn handle privacy?',
      answer: 'SpotOn focuses on person detection and tracking without facial recognition or personal identification. All processing is performed locally, and no personal data is stored or transmitted.',
    },
    {
      id: 'setup-requirements',
      question: 'What are the setup requirements?',
      answer: 'SpotOn requires a FastAPI backend server, Redis for caching, TimescaleDB for historical data, and a modern web browser. The system can run on CPU or GPU depending on performance requirements.',
    },
    {
      id: 'alerts',
      question: 'Can I set up custom alerts?',
      answer: 'Yes, SpotOn includes a comprehensive alert system where you can configure notifications for person count thresholds, occupancy time limits, camera offline status, and custom conditions with multiple notification channels.',
    },
  ];

  const toggleFAQ = useCallback((faqId: string) => {
    setExpandedFAQ(prev => prev === faqId ? null : faqId);
  }, []);

  const filteredSections = helpSections.filter(section =>
    searchQuery === '' ||
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFAQs = faqs.filter(faq =>
    searchQuery === '' ||
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Header 
        connectionStatus={connectionStatus} 
        showBackButton={true} 
        backText="← Back to Home"
        backUrl="/"
      />

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Help & Documentation
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Comprehensive guide to using SpotOn's intelligent multi-camera person tracking system
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {helpSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeSection === section.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          ))}
          <button
            onClick={() => setActiveSection('faq')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              activeSection === 'faq'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700 border border-gray-600'
            }`}
          >
            <span>❓</span>
            <span>FAQ</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto">
          {/* Help Sections */}
          {activeSection !== 'faq' && (
            <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
              {filteredSections.map(section => 
                section.id === activeSection && (
                  <div key={section.id}>
                    <div className="flex items-center space-x-3 mb-6">
                      <span className="text-2xl">{section.icon}</span>
                      <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                    </div>
                    {section.content}
                  </div>
                )
              )}
            </div>
          )}

          {/* FAQ Section */}
          {activeSection === 'faq' && (
            <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-2xl">❓</span>
                <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
              </div>
              
              <div className="space-y-4">
                {filteredFAQs.map(faq => (
                  <div key={faq.id} className="bg-gray-800/50 border border-gray-600 rounded-lg">
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                    >
                      <h3 className="font-semibold text-white">{faq.question}</h3>
                      <span className={`transform transition-transform ${
                        expandedFAQ === faq.id ? 'rotate-180' : ''
                      }`}>
                        ⌄
                      </span>
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-300">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default HelpPage;
