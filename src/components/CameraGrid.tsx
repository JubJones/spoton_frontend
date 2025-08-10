// src/components/CameraGrid.tsx
import React, { useState, useCallback } from 'react';
import EnhancedImageSequencePlayer from './EnhancedImageSequencePlayer';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName, getFrontendCameraId } from '../config/environments';
import { useViewportSize, getResponsiveClasses, useTouchGestures } from '../utils/responsive';

interface CameraData {
  cameraId: BackendCameraId;
  imageSrc?: string;
  base64Image?: string;
  tracks: TrackedPerson[];
  isLoading?: boolean;
  lastUpdated?: Date;
}

interface CameraGridProps {
  environment: EnvironmentId;
  cameraData: Record<BackendCameraId, CameraData>;
  focusedCameraId?: BackendCameraId | null;
  selectedPersonIds?: Set<string>;
  className?: string;
  // Event handlers
  onPersonClick?: (person: TrackedPerson, cameraId: BackendCameraId) => void;
  onPersonHover?: (person: TrackedPerson | null, cameraId: BackendCameraId) => void;
  onCameraFocus?: (cameraId: BackendCameraId | null) => void;
  onGridLayoutChange?: (layout: '2x2' | '1x4' | 'focus') => void;
  onDisplayOptionsChange?: (options: { showConfidence: boolean; showPersonIds: boolean }) => void;
  // Display options
  showConfidence?: boolean;
  showPersonIds?: boolean;
  gridLayout?: '2x2' | '1x4' | 'focus';
  // Responsive options
  isMobile?: boolean;
  isTablet?: boolean;
}

const CameraGrid: React.FC<CameraGridProps> = ({
  environment,
  cameraData,
  focusedCameraId,
  selectedPersonIds = new Set(),
  className = '',
  onPersonClick,
  onPersonHover,
  onCameraFocus,
  onGridLayoutChange,
  onDisplayOptionsChange,
  showConfidence = false,
  showPersonIds = true,
  gridLayout = '2x2',
  isMobile,
  isTablet,
}) => {
  const [hoveredCameraId, setHoveredCameraId] = useState<BackendCameraId | null>(null);
  const { screenSize } = useViewportSize();
  const responsiveClasses = getResponsiveClasses(screenSize);

  // Override responsive detection with props if provided
  const actualIsMobile = isMobile ?? screenSize === 'mobile';
  const actualIsTablet = isTablet ?? screenSize === 'tablet';

  // Get camera IDs for the environment
  const availableCameras = Object.keys(cameraData) as BackendCameraId[];

  // Handle camera focus toggle
  const handleCameraClick = useCallback(
    (cameraId: BackendCameraId) => {
      if (gridLayout === 'focus') {
        // In focus mode, clicking toggles focus
        onCameraFocus?.(focusedCameraId === cameraId ? null : cameraId);
      } else {
        // In grid mode, clicking sets focus
        onCameraFocus?.(cameraId);
      }
    },
    [gridLayout, focusedCameraId, onCameraFocus]
  );

  // Handle person interactions
  const handlePersonClick = useCallback(
    (person: TrackedPerson, cameraId: BackendCameraId) => {
      onPersonClick?.(person, cameraId);
    },
    [onPersonClick]
  );

  const handlePersonHover = useCallback(
    (person: TrackedPerson | null, cameraId: BackendCameraId) => {
      onPersonHover?.(person, cameraId);
    },
    [onPersonHover]
  );

  // Touch gesture handlers for mobile
  const touchGestures = useTouchGestures({
    onSwipeLeft: () => {
      if (actualIsMobile && onGridLayoutChange) {
        // Cycle through layouts on mobile
        const nextLayout = gridLayout === '2x2' ? '1x4' : '2x2';
        onGridLayoutChange(nextLayout);
      }
    },
    onSwipeRight: () => {
      if (actualIsMobile && onGridLayoutChange) {
        // Cycle through layouts on mobile
        const nextLayout = gridLayout === '1x4' ? '2x2' : '1x4';
        onGridLayoutChange(nextLayout);
      }
    },
    onDoubleTap: () => {
      if (focusedCameraId && onGridLayoutChange) {
        const nextLayout = gridLayout === 'focus' ? '2x2' : 'focus';
        onGridLayoutChange(nextLayout);
      }
    },
  });

  // Get grid layout classes with responsive support
  const getGridClasses = () => {
    if (actualIsMobile) {
      switch (gridLayout) {
        case '2x2':
          return 'grid grid-cols-1 sm:grid-cols-2 gap-2';
        case '1x4':
          return 'grid grid-cols-1 gap-2 max-h-[80vh] overflow-y-auto';
        case 'focus':
          return 'flex flex-col gap-2';
        default:
          return 'grid grid-cols-1 sm:grid-cols-2 gap-2';
      }
    }

    if (actualIsTablet) {
      switch (gridLayout) {
        case '2x2':
          return 'grid grid-cols-2 gap-2';
        case '1x4':
          return 'grid grid-cols-2 gap-2';
        case 'focus':
          return 'flex gap-2';
        default:
          return 'grid grid-cols-2 gap-2';
      }
    }

    // Desktop
    switch (gridLayout) {
      case '2x2':
        return 'grid grid-cols-2 grid-rows-2 gap-2';
      case '1x4':
        return 'grid grid-cols-4 gap-2';
      case 'focus':
        return 'flex gap-2';
      default:
        return 'grid grid-cols-2 grid-rows-2 gap-2';
    }
  };

  // Get camera size classes with responsive support
  const getCameraClasses = (cameraId: BackendCameraId) => {
    const baseClasses =
      'relative bg-gray-900 rounded-lg overflow-hidden border transition-all duration-300';
    const isFocused = focusedCameraId === cameraId;
    const isHovered = hoveredCameraId === cameraId;

    let sizeClasses = '';
    let borderClasses = '';

    if (gridLayout === 'focus') {
      if (isFocused) {
        if (actualIsMobile) {
          sizeClasses = 'w-full min-h-[250px] max-h-[400px]';
        } else if (actualIsTablet) {
          sizeClasses = 'flex-1 min-h-[300px]';
        } else {
          sizeClasses = 'flex-1 min-h-[400px]';
        }
        borderClasses = 'border-orange-400 shadow-lg shadow-orange-400/25';
      } else {
        if (actualIsMobile) {
          sizeClasses = 'w-full h-20';
        } else if (actualIsTablet) {
          sizeClasses = 'w-32 h-24';
        } else {
          sizeClasses = 'w-48 h-32';
        }
        borderClasses = 'border-gray-600 hover:border-gray-500';
      }
    } else {
      if (actualIsMobile) {
        sizeClasses = 'aspect-video min-h-[180px] w-full';
      } else if (actualIsTablet) {
        sizeClasses = 'aspect-video min-h-[160px]';
      } else {
        sizeClasses = 'aspect-video min-h-[200px]';
      }

      if (isFocused) {
        borderClasses = 'border-orange-400 shadow-lg shadow-orange-400/25';
      } else if (isHovered) {
        borderClasses = 'border-gray-500';
      } else {
        borderClasses = 'border-gray-600';
      }
    }

    return `${baseClasses} ${sizeClasses} ${borderClasses} cursor-pointer touch-manipulation`;
  };

  // Render camera controls
  const renderCameraControls = (cameraId: BackendCameraId, data: CameraData) => {
    const frontendId = getFrontendCameraId(cameraId, environment);
    const displayName = getCameraDisplayName(cameraId, environment);
    const personCount = data.tracks.length;
    const isOnline = !data.isLoading && (data.base64Image || data.imageSrc);

    return (
      <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start">
        {/* Camera Info */}
        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          <div className="font-semibold">{displayName}</div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
            {personCount > 0 && (
              <span className="text-orange-400">
                • {personCount} person{personCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Camera Controls */}
        <div className="flex space-x-1">
          {gridLayout !== 'focus' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCameraClick(cameraId);
              }}
              className="bg-black/80 text-white text-xs px-2 py-1 rounded hover:bg-black/90 transition-colors backdrop-blur-sm"
              title="Focus this camera"
            >
              🔍
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              // Toggle fullscreen for this camera
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                const cameraElement = e.currentTarget.closest(
                  '[data-camera-container]'
                ) as HTMLElement;
                if (cameraElement) {
                  cameraElement.requestFullscreen();
                }
              }
            }}
            className="bg-black/80 text-white text-xs px-2 py-1 rounded hover:bg-black/90 transition-colors backdrop-blur-sm"
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full ${className}`} {...touchGestures}>
      {/* Grid Layout Controls - Responsive */}
      <div
        className={
          actualIsMobile ? 'flex flex-col gap-2 mb-4' : 'flex justify-between items-center mb-4'
        }
      >
        <div className={actualIsMobile ? 'flex justify-center space-x-1' : 'flex space-x-2'}>
          <button
            onClick={() => onGridLayoutChange?.('2x2')}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors touch-manipulation ${
              gridLayout === '2x2'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            aria-label="Switch to 2x2 grid layout"
          >
            {actualIsMobile ? '2×2' : '2×2 Grid'}
          </button>
          <button
            onClick={() => onGridLayoutChange?.('1x4')}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors touch-manipulation ${
              gridLayout === '1x4'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            aria-label="Switch to 1x4 grid layout"
          >
            {actualIsMobile ? '1×4' : '1×4 Grid'}
          </button>
          {focusedCameraId && (
            <button
              onClick={() => onGridLayoutChange?.('focus')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors touch-manipulation ${
                gridLayout === 'focus'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
              aria-label="Switch to focus mode"
            >
              {actualIsMobile ? 'Focus' : 'Focus Mode'}
            </button>
          )}
        </div>

        {/* Display Options - Responsive */}
        <div
          className={
            actualIsMobile ? 'flex justify-center space-x-3 text-xs' : 'flex space-x-2 text-sm'
          }
        >
          <label className="flex items-center space-x-1 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showPersonIds}
              onChange={(e) =>
                onDisplayOptionsChange?.({ showPersonIds: e.target.checked, showConfidence })
              }
              className="rounded focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
              aria-label="Show person IDs"
            />
            <span>IDs</span>
          </label>
          <label className="flex items-center space-x-1 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showConfidence}
              onChange={(e) =>
                onDisplayOptionsChange?.({ showPersonIds, showConfidence: e.target.checked })
              }
              className="rounded focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
              aria-label="Show confidence scores"
            />
            <span>Confidence</span>
          </label>
        </div>
      </div>

      {/* Mobile Gesture Instructions */}
      {actualIsMobile && (
        <div className="text-xs text-gray-400 text-center mb-2">
          Swipe left/right to change layout • Double tap to toggle focus
        </div>
      )}

      {/* Camera Grid */}
      <div className={getGridClasses()}>
        {availableCameras.map((cameraId) => {
          const data = cameraData[cameraId];
          if (!data) return null;

          return (
            <div
              key={cameraId}
              data-camera-container
              className={getCameraClasses(cameraId)}
              onClick={() => handleCameraClick(cameraId)}
              onMouseEnter={() => !actualIsMobile && setHoveredCameraId(cameraId)}
              onMouseLeave={() => !actualIsMobile && setHoveredCameraId(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCameraClick(cameraId);
                }
              }}
              aria-label={`Camera ${getCameraDisplayName(cameraId, environment)}`}
            >
              {/* Camera Controls Overlay */}
              {renderCameraControls(cameraId, data)}

              {/* Enhanced Image Player */}
              <EnhancedImageSequencePlayer
                cameraId={cameraId}
                imageSrc={data.imageSrc}
                base64Image={data.base64Image}
                tracks={data.tracks}
                onPersonClick={(person) => handlePersonClick(person, cameraId)}
                onPersonHover={(person) => handlePersonHover(person, cameraId)}
                showConfidence={showConfidence}
                showPersonIds={showPersonIds}
                highlightedPersonIds={selectedPersonIds}
                isLoading={data.isLoading}
                className="w-full h-full"
              />

              {/* Last Updated Indicator */}
              {data.lastUpdated && (
                <div
                  className={`absolute bottom-2 right-2 bg-black/80 text-white rounded backdrop-blur-sm ${
                    actualIsMobile ? 'text-xs px-1 py-0.5' : 'text-xs px-2 py-1'
                  }`}
                >
                  {new Date().getTime() - data.lastUpdated.getTime() < 5000 ? (
                    <span className="text-green-400">● Live</span>
                  ) : (
                    <span className="text-gray-400">
                      {Math.round((new Date().getTime() - data.lastUpdated.getTime()) / 1000)}s ago
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Cameras Available */}
      {availableCameras.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <div className={actualIsMobile ? 'text-2xl mb-2' : 'text-4xl mb-4'}>📷</div>
            <div className={actualIsMobile ? 'text-base' : 'text-lg'}>No camera data available</div>
            <div className={actualIsMobile ? 'text-xs' : 'text-sm'}>
              Waiting for tracking data...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraGrid;
