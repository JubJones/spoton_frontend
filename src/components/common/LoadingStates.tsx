// src/components/common/LoadingStates.tsx
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  blur?: boolean;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  blur = true,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 ${blur ? 'backdrop-blur-sm' : ''}`}
        >
          <div className="text-center">
            <LoadingSpinner size="large" color="orange" />
            <p className="text-gray-200 mt-3 text-sm">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
  animate = true,
}) => {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-gray-700 ${animate ? 'animate-pulse' : ''} ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      role="status"
      aria-label="Loading content"
    />
  );
};

interface CameraSkeletonProps {
  count?: number;
  layout?: '2x2' | '1x4' | 'focus';
}

export const CameraSkeleton: React.FC<CameraSkeletonProps> = ({ count = 4, layout = '2x2' }) => {
  const getGridClasses = () => {
    switch (layout) {
      case '2x2':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case '1x4':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
      case 'focus':
        return 'flex flex-col gap-4';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    }
  };

  return (
    <div className={getGridClasses()}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Camera header skeleton */}
          <div className="p-3 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <Skeleton width="80px" height="16px" />
              <div className="flex space-x-2">
                <Skeleton width="12px" height="12px" rounded />
                <Skeleton width="40px" height="16px" />
              </div>
            </div>
          </div>

          {/* Camera content skeleton */}
          <div className="aspect-video bg-gray-700 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size="medium" color="white" />
            </div>

            {/* Simulated bounding boxes */}
            <div className="absolute top-4 left-4 w-16 h-20 border-2 border-orange-400/30 rounded"></div>
            <div className="absolute top-6 right-8 w-12 h-16 border-2 border-orange-400/30 rounded"></div>
          </div>

          {/* Footer skeleton */}
          <div className="p-2">
            <Skeleton width="60px" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface MapSkeletonProps {
  className?: string;
}

export const MapSkeleton: React.FC<MapSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      <div className="p-3 border-b border-gray-700">
        <Skeleton width="100px" height="16px" />
      </div>

      <div className="aspect-square bg-gray-700 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="medium" color="white" />
        </div>

        {/* Simulated map points */}
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="absolute w-2 h-2 bg-orange-400/40 rounded-full animate-pulse"
            style={{
              left: `${20 + (index % 3) * 30}%`,
              top: `${20 + Math.floor(index / 3) * 25}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface DataLoadingProps {
  message?: string;
  icon?: React.ReactNode;
  retry?: () => void;
  className?: string;
}

export const DataLoading: React.FC<DataLoadingProps> = ({
  message = 'Loading data...',
  icon,
  retry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-gray-400 ${className}`}>
      {icon || <LoadingSpinner size="large" color="orange" />}
      <p className="mt-4 text-center text-gray-300">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-3 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Retry
        </button>
      )}
    </div>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  color?: 'orange' | 'blue' | 'green';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showPercentage = true,
  color = 'orange',
  className = '',
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'orange':
      default:
        return 'bg-orange-500';
    }
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {message && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">{message}</span>
          {showPercentage && (
            <span className="text-sm text-gray-400">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}

      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 ${getColorClasses()} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Connection status component
interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'ready' | 'disconnected' | 'error';
  message?: string;
  showIcon?: boolean;
  compact?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  message,
  showIcon = true,
  compact = false,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400',
          icon: <LoadingSpinner size="small" color="orange" />,
          defaultMessage: 'Connecting...',
        };
      case 'connected':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-400',
          icon: '✓',
          defaultMessage: 'Connected',
        };
      case 'ready':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-blue-400',
          icon: '●',
          defaultMessage: 'Ready',
        };
      case 'disconnected':
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400',
          icon: '○',
          defaultMessage: 'Disconnected',
        };
      case 'error':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-400',
          icon: '✗',
          defaultMessage: 'Connection Error',
        };
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400',
          icon: '○',
          defaultMessage: 'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const displayMessage = message || config.defaultMessage;

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        {showIcon && <div className={`w-2 h-2 ${config.bgColor} rounded-full`} />}
        <span className={`text-xs ${config.color}`}>{displayMessage}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {showIcon && (
        <div className="flex items-center justify-center">
          {typeof config.icon === 'string' ? (
            <span className={`${config.color} text-sm`}>{config.icon}</span>
          ) : (
            config.icon
          )}
        </div>
      )}
      <span className={`text-sm ${config.color}`}>{displayMessage}</span>
    </div>
  );
};
