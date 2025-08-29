// Enhanced Loading States for Task Initialization and Processing
// src/components/common/TaskLoadingStates.tsx

import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { ProgressBar } from './LoadingStates';

interface TaskInitializationLoadingProps {
  isLoading: boolean;
  progress?: number;
  currentStep?: string;
  message?: string;
  environment?: string;
  onCancel?: () => void;
  className?: string;
}

export const TaskInitializationLoading: React.FC<TaskInitializationLoadingProps> = ({
  isLoading,
  progress = 0,
  currentStep,
  message,
  environment,
  onCancel,
  className = '',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Expected steps during task initialization
  const initializationSteps = [
    'Preparing system...',
    'Loading AI models...',
    'Initializing detection models...',
    'Loading tracking models...',
    'Setting up homography mappings...',
    'Preparing camera feeds...',
    'Starting processing pipeline...',
    'Establishing WebSocket connection...',
    'Ready to begin tracking!'
  ];

  // Track elapsed time
  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      setCurrentStepIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Update step based on progress or time
  useEffect(() => {
    if (!isLoading) return;

    let stepIndex = 0;
    if (progress > 0) {
      // Use progress to determine step
      stepIndex = Math.min(
        Math.floor((progress / 100) * initializationSteps.length),
        initializationSteps.length - 1
      );
    } else {
      // Use elapsed time to simulate progress
      stepIndex = Math.min(
        Math.floor(elapsedSeconds / 8), // ~8 seconds per step
        initializationSteps.length - 1
      );
    }
    
    setCurrentStepIndex(stepIndex);
  }, [isLoading, progress, elapsedSeconds, initializationSteps.length]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (!isLoading) return null;

  const displayStep = currentStep || initializationSteps[currentStepIndex];
  const displayMessage = message || `Initializing ${environment || 'system'}...`;

  return (
    <div className={`fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-4">
            <LoadingSpinner size="large" color="orange" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {displayMessage}
          </h3>
          <p className="text-gray-400 text-sm">
            This may take up to 3 minutes for model loading
          </p>
        </div>

        {/* Current Step */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Current Step:</span>
            <span className="text-xs text-gray-500">
              {currentStepIndex + 1} of {initializationSteps.length}
            </span>
          </div>
          <p className="text-orange-400 text-sm font-medium mb-3">
            {displayStep}
          </p>
          
          {/* Progress Bar */}
          <ProgressBar
            progress={progress > 0 ? progress : (currentStepIndex / initializationSteps.length) * 100}
            showPercentage={progress > 0}
            color="orange"
            className="mb-2"
          />
        </div>

        {/* Status Information */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Environment:</span>
              <span className="text-white ml-2 capitalize">{environment || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Elapsed:</span>
              <span className="text-white ml-2">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Expected Duration Info */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-500 bg-gray-900/30 rounded-full px-3 py-1">
            <span>ℹ️</span>
            <span>First-time initialization may take longer as AI models are downloaded</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          )}
          <div className="text-xs text-gray-500 flex items-center">
            <span className="animate-pulse">●</span>
            <span className="ml-1">Processing...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskProcessingStatusProps {
  taskStatus?: string;
  progress?: number;
  currentStep?: string;
  isConnected?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const TaskProcessingStatus: React.FC<TaskProcessingStatusProps> = ({
  taskStatus = 'UNKNOWN',
  progress = 0,
  currentStep,
  isConnected = false,
  connectionError,
  onRetry,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (taskStatus.toLowerCase()) {
      case 'queued':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/20',
          icon: '⏳',
          message: 'Task queued for processing...',
        };
      case 'initializing':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/20',
          icon: <LoadingSpinner size="small" color="blue" />,
          message: 'Initializing processing pipeline...',
        };
      case 'downloading':
        return {
          color: 'text-purple-400',
          bgColor: 'bg-purple-400/10',
          borderColor: 'border-purple-400/20',
          icon: '📥',
          message: 'Downloading video data...',
        };
      case 'extracting':
        return {
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-400/10',
          borderColor: 'border-indigo-400/20',
          icon: '🎬',
          message: 'Extracting video frames...',
        };
      case 'processing':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-400/10',
          borderColor: 'border-orange-400/20',
          icon: <LoadingSpinner size="small" color="orange" />,
          message: 'Processing frames with AI models...',
        };
      case 'streaming':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/20',
          icon: '📡',
          message: 'Streaming real-time results...',
        };
      case 'completed':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/20',
          icon: '✅',
          message: 'Processing completed successfully!',
        };
      case 'failed':
      case 'error':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/20',
          icon: '❌',
          message: 'Processing failed',
        };
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          borderColor: 'border-gray-400/20',
          icon: '●',
          message: 'Status unknown',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center">
            {typeof config.icon === 'string' ? (
              <span className="text-lg">{config.icon}</span>
            ) : (
              config.icon
            )}
          </div>
          <div>
            <h4 className={`font-medium ${config.color}`}>
              {taskStatus.replace('_', ' ').toUpperCase()}
            </h4>
            <p className="text-sm text-gray-400">
              {currentStep || config.message}
            </p>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="text-xs">
          {isConnected ? (
            <span className="text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
              Connected
            </span>
          ) : (
            <span className="text-red-400 flex items-center">
              <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <ProgressBar
          progress={progress}
          showPercentage={true}
          color="orange"
          className="mb-3"
        />
      )}

      {/* Connection Error */}
      {connectionError && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/20 rounded text-sm">
          <p className="text-red-400 mb-2">Connection Error:</p>
          <p className="text-gray-300 text-xs">{connectionError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskInitializationLoading;