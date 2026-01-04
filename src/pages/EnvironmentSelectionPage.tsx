// src/pages/EnvironmentSelectionPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAvailableEnvironments, validateEnvironmentConfig } from '../config/environments';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import Header from '../components/common/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { APP_CONFIG } from '../config/app';
import type { EnvironmentConfiguration, EnvironmentId } from '../types/api';

interface EnvironmentCardProps {
  environment: EnvironmentConfiguration;
  isSelected: boolean;
  isValidated: boolean;
  onSelect: (envId: EnvironmentId) => void;
  onValidate: (envId: EnvironmentId) => void;
}

const EnvironmentCard: React.FC<EnvironmentCardProps> = ({
  environment,
  isSelected,
  isValidated,
  onSelect,
  onValidate,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    onSelect(environment.id);
  };

  const handleProceed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isValidated) {
      navigate(`/group-view?environment=${environment.id}`);
    } else {
      onValidate(environment.id);
    }
  };

  const getEnvironmentIcon = (envId: EnvironmentId) => {
    switch (envId) {
      case 'factory':
        return '🏭';
      case 'campus':
        return '🏫';
      default:
        return '📹';
    }
  };

  const getEnvironmentDescription = (envId: EnvironmentId) => {
    switch (envId) {
      case 'factory':
        return 'Industrial monitoring with 4 cameras covering entrance, assembly line, storage, and quality control areas.';
      case 'campus':
        return 'Educational facility monitoring with cameras at main entrance, library, cafeteria, and courtyard.';
      default:
        return 'Multi-camera monitoring environment.';
    }
  };

  return (
    <div
      data-testid={`environment-${environment.id}`}
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${isSelected
        ? 'border-orange-400 bg-gradient-to-br from-orange-500/10 to-red-500/10 shadow-lg shadow-orange-500/25'
        : 'border-gray-600 bg-black/30 hover:border-gray-500'
        }`}
      onClick={handleCardClick}
    >
      {/* Environment Icon */}
      <div className="text-6xl mb-4 text-center">{getEnvironmentIcon(environment.id)}</div>

      {/* Environment Info */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{environment.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{getEnvironmentDescription(environment.id)}</p>

        {/* Environment Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Scene ID:</span>
            <div className="text-orange-400 font-mono">{environment.scene_id}</div>
          </div>
          <div>
            <span className="text-gray-500">Cameras:</span>
            <div className="text-blue-400 font-semibold">{environment.cameras.length}</div>
          </div>
        </div>
      </div>

      {/* Camera List */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Camera Setup:</h4>
        <div className="space-y-1">
          {environment.cameras.map((camera, index) => (
            <div key={camera.id} className="flex justify-between items-center text-xs">
              <span className="text-gray-400">{camera.name}</span>
              <span
                className={`px-2 py-1 rounded ${camera.homography_available
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
                  }`}
              >
                {camera.homography_available ? 'Mapped' : 'Basic'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleProceed}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${isValidated
          ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
          : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
          }`}
      >
        {isValidated ? 'Launch Environment' : 'Validate & Launch'}
      </button>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">✓</span>
        </div>
      )}
    </div>
  );
};

const EnvironmentSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, backendStatus, healthCheck } = useSpotOnBackend();
  const [environments] = useState(getAvailableEnvironments());
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentId | null>(null);
  const [validatedEnvironments, setValidatedEnvironments] = useState<Set<EnvironmentId>>(new Set());
  const [validatingEnvironment, setValidatingEnvironment] = useState<EnvironmentId | null>(null);

  // Date/Time Range state removed - defaulting to last hour on launch

  useEffect(() => {
    // Perform initial health check
    healthCheck();
  }, [healthCheck]);

  const handleEnvironmentSelect = (envId: EnvironmentId) => {
    setSelectedEnvironment(envId);
  };

  const handleEnvironmentValidate = async (envId: EnvironmentId) => {
    setValidatingEnvironment(envId);

    try {
      // Validate environment configuration
      const isValid = validateEnvironmentConfig(envId);

      if (isValid && isConnected) {
        // Perform backend health check with environment context
        await healthCheck();

        // Mark as validated
        setValidatedEnvironments((prev) => new Set([...prev, envId]));

        // Auto-navigate after successful validation with default (last hour) parameters
        setTimeout(() => {
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

          const params = new URLSearchParams({
            environment: envId,
            startDate: oneHourAgo.toISOString().split('T')[0],
            startTime: oneHourAgo.toTimeString().slice(0, 5),
            endDate: now.toISOString().split('T')[0],
            endTime: now.toTimeString().slice(0, 5),
          });
          navigate(`/group-view?${params.toString()}`);
        }, 1000);
      } else {
        console.error(`Environment validation failed for ${envId}`);
      }
    } catch (error) {
      console.error('Environment validation error:', error);
    } finally {
      setValidatingEnvironment(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Navigation Header */}
      <Header
        showBackButton={true}
        backText="← Back to Home"
        backUrl="/"
        connectionStatus={{
          isConnected,
          statusText: isConnected ? 'Backend Connected' : 'Backend Disconnected',
        }}
      />

      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Select Your Environment</h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto">
            Choose from our pre-configured monitoring environments. Each environment includes
            multiple camera feeds with specialized tracking capabilities.
          </p>
        </div>

        {/* Backend Status Alert */}
        {!isConnected && (
          <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
            <p className="text-red-400">
              ⚠️ Backend connection required for environment validation. Please ensure the SpotOn
              backend is running on {new URL(APP_CONFIG.API_BASE_URL).port || '3847'}.
            </p>
          </div>
        )}

        {/* Environment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-12">
          {environments.map((environment) => (
            <EnvironmentCard
              key={environment.id}
              environment={environment}
              isSelected={selectedEnvironment === environment.id}
              isValidated={validatedEnvironments.has(environment.id)}
              onSelect={handleEnvironmentSelect}
              onValidate={handleEnvironmentValidate}
            />
          ))}
        </div>

        {/* Validation Status */}
        {validatingEnvironment && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 px-6 py-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <LoadingSpinner size="medium" color="orange" />
              <span className="text-orange-400">
                Validating {environments.find((e) => e.id === validatingEnvironment)?.name}...
              </span>
            </div>
          </div>
        )}


      </main>
    </div>
  );
};

export default EnvironmentSelectionPage;
