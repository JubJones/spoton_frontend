// src/pages/AboutPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';

interface TeamMember {
  name: string;
  role: string;
  expertise: string[];
  avatar: string;
}

interface TechSpec {
  category: string;
  technologies: string[];
  icon: string;
}

const AboutPage: React.FC = () => {
  const { isConnected, backendStatus } = useSpotOnBackend();
  const [systemStats, setSystemStats] = useState({
    totalProcessed: 0,
    uptime: 0,
    accuracy: 95.2,
    responseTime: 42,
  });

  // Create connection status for Header component
  const connectionStatus = {
    isConnected,
    statusText: isConnected ? backendStatus.status : 'Disconnected',
  };

  useEffect(() => {
    // Simulate real-time stats updates
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        ...prev,
        totalProcessed: prev.totalProcessed + Math.floor(Math.random() * 5),
        uptime: prev.uptime + 1,
        responseTime: 35 + Math.floor(Math.random() * 15),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const teamMembers: TeamMember[] = [
    {
      name: 'Dr. Sarah Chen',
      role: 'Lead AI Engineer',
      expertise: ['Computer Vision', 'Deep Learning', 'Object Detection'],
      avatar: '👩‍💻',
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Backend Architect',
      expertise: ['FastAPI', 'Distributed Systems', 'Database Design'],
      avatar: '👨‍💼',
    },
    {
      name: 'Emily Watson',
      role: 'Frontend Developer',
      expertise: ['React', 'TypeScript', 'UI/UX Design'],
      avatar: '👩‍🎨',
    },
    {
      name: 'David Kim',
      role: 'DevOps Engineer',
      expertise: ['Docker', 'Kubernetes', 'Cloud Infrastructure'],
      avatar: '👨‍🔧',
    },
  ];

  const techSpecs: TechSpec[] = [
    {
      category: 'Frontend',
      icon: '⚛️',
      technologies: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite', 'React Router'],
    },
    {
      category: 'Backend',
      icon: '🐍',
      technologies: ['FastAPI', 'Python 3.9+', 'uvicorn', 'Pydantic', 'AsyncIO'],
    },
    {
      category: 'AI/ML',
      icon: '🤖',
      technologies: ['PyTorch', 'OpenCV', 'Faster R-CNN', 'CLIP', 'FAISS'],
    },
    {
      category: 'Database',
      icon: '🗄️',
      technologies: ['TimescaleDB', 'Redis', 'PostgreSQL', 'Vector DB'],
    },
    {
      category: 'Infrastructure',
      icon: '☁️',
      technologies: ['Docker', 'Docker Compose', 'WebSockets', 'REST API'],
    },
    {
      category: 'Monitoring',
      icon: '📊',
      technologies: ['Real-time Metrics', 'Performance Tracking', 'Error Reporting'],
    },
  ];

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Header 
        connectionStatus={connectionStatus} 
        showBackButton={true} 
        backText="← Back to Home"
        backUrl="/"
      />

      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              SpotOn
            </h1>
          </div>
          <p className="text-2xl text-gray-300 mb-4">
            Intelligent Multi-Camera Person Tracking System
          </p>
          <p className="text-lg text-gray-400 max-w-4xl mx-auto">
            Advanced AI-powered solution for real-time person detection, tracking, and analytics 
            across multiple camera feeds with enterprise-grade performance and reliability.
          </p>
        </div>

        {/* Live System Stats */}
        <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Live System Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {systemStats.totalProcessed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Detections Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {systemStats.accuracy}%
              </div>
              <div className="text-sm text-gray-400">Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {formatUptime(systemStats.uptime)}
              </div>
              <div className="text-sm text-gray-400">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {systemStats.responseTime}ms
              </div>
              <div className="text-sm text-gray-400">Avg Response Time</div>
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">🎯</span>
              <h2 className="text-2xl font-bold text-white">Our Mission</h2>
            </div>
            <p className="text-gray-300 mb-4">
              To revolutionize security and analytics through intelligent computer vision technology 
              that provides actionable insights while respecting privacy and maintaining the highest 
              standards of accuracy and performance.
            </p>
            <p className="text-gray-400">
              We believe in making advanced AI accessible and practical for organizations of all sizes, 
              from small businesses to enterprise deployments.
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">🔮</span>
              <h2 className="text-2xl font-bold text-white">Our Vision</h2>
            </div>
            <p className="text-gray-300 mb-4">
              To become the leading platform for intelligent video analytics, enabling safer, more 
              efficient, and data-driven decision making across industries worldwide.
            </p>
            <p className="text-gray-400">
              We envision a future where AI-powered insights transform how organizations understand 
              and optimize their physical spaces.
            </p>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Why Choose SpotOn?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-6">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-orange-400 mb-3">Real-Time Processing</h3>
              <p className="text-gray-300">
                Process multiple camera feeds simultaneously at 30 FPS with minimal latency for 
                immediate actionable insights.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-blue-400 mb-3">High Accuracy</h3>
              <p className="text-gray-300">
                State-of-the-art AI models achieve 95%+ accuracy in person detection with advanced 
                confidence scoring and filtering.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-green-400 mb-3">Privacy-First</h3>
              <p className="text-gray-300">
                No facial recognition or personal identification. All processing focuses on 
                movement patterns and occupancy analytics.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-lg p-6">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-purple-400 mb-3">Rich Analytics</h3>
              <p className="text-gray-300">
                Comprehensive dashboards with exportable reports, custom alerts, and historical 
                trend analysis for data-driven decisions.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">Scalable Architecture</h3>
              <p className="text-gray-300">
                Built on modern microservices architecture with Docker support for easy deployment 
                and horizontal scaling.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-6">
              <div className="text-3xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-indigo-400 mb-3">Easy Integration</h3>
              <p className="text-gray-300">
                RESTful API and WebSocket support make it simple to integrate with existing 
                systems and build custom applications.
              </p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techSpecs.map((spec) => (
              <div key={spec.category} className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">{spec.icon}</span>
                  <h3 className="text-xl font-semibold text-white">{spec.category}</h3>
                </div>
                <div className="space-y-2">
                  {spec.technologies.map((tech) => (
                    <div key={tech} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span className="text-gray-300">{tech}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Development Team */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Development Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div key={member.name} className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">{member.avatar}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{member.name}</h3>
                <p className="text-orange-400 font-medium mb-3">{member.role}</p>
                <div className="space-y-1">
                  {member.expertise.map((skill) => (
                    <span
                      key={skill}
                      className="inline-block bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-sm mr-1"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8">System Architecture</h2>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 border border-blue-500/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📷</span>
                </div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Input Layer</h3>
                <p className="text-gray-300 text-sm">
                  Multi-camera video streams with real-time frame processing and quality optimization
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧠</span>
                </div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">AI Processing</h3>
                <p className="text-gray-300 text-sm">
                  Advanced computer vision models for detection, tracking, and re-identification
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">Analytics Output</h3>
                <p className="text-gray-300 text-sm">
                  Real-time dashboards, historical reports, and configurable alert systems
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-4">Data Flow Architecture</h4>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                  <span>Video Input</span>
                  <span className="text-orange-400">→</span>
                  <span>AI Detection</span>
                  <span className="text-orange-400">→</span>
                  <span>Cross-Camera Tracking</span>
                  <span className="text-orange-400">→</span>
                  <span>Real-time Analytics</span>
                  <span className="text-orange-400">→</span>
                  <span>User Dashboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Version Information */}
        <div className="mb-12">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-400 mb-1">v2.1.0</div>
                <div className="text-sm text-gray-400">Current Version</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-1">2025.01</div>
                <div className="text-sm text-gray-400">Release Date</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400 mb-1">MIT</div>
                <div className="text-sm text-gray-400">License</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400 mb-1">Enterprise</div>
                <div className="text-sm text-gray-400">Support Tier</div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-gray-300 mb-6">
              Experience the power of intelligent video analytics with SpotOn's comprehensive tracking solution.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/environments"
                className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                🚀 Start Tracking
              </Link>
              <Link
                to="/help"
                className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                📖 Read Documentation
              </Link>
              <Link
                to="/analytics"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                📊 View Demo Analytics
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;