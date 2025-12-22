import React from 'react';
import { MiniMapComponent } from './MiniMapComponent';
import { BackendCameraId } from '../../types/api';

/**
 * Mapping coordinate interface (matches MiniMapComponent)
 */
interface MappingCoordinate {
  detection_id: string;
  map_x: number;
  map_y: number;
  projection_successful: boolean;
  coordinate_system: string;
  trail?: Array<{
    x: number;
    y: number;
    frame_offset: number;
    timestamp: string;
  }>;
}

/**
 * Props for CameraMapPair component
 */
interface CameraMapPairProps {
  cameraId: BackendCameraId;
  frameData?: string; // base64 encoded frame
  mappingCoordinates: MappingCoordinate[];
  onToggleMap?: (cameraId: BackendCameraId, visible: boolean) => void;
  mapVisible?: boolean;
  className?: string;
  children?: React.ReactNode; // For the camera component
  // Optional map sizing (defaults to 300x200)
  mapWidth?: number;
  mapHeight?: number;
}

/**
 * CameraMapPair - Combines a camera view with its corresponding 2D map
 * 
 * This component creates a synchronized pair of camera video feed and 2D map visualization.
 * It provides:
 * - Side-by-side layout of camera and map
 * - Toggle functionality for showing/hiding the map
 * - Data synchronization between camera detections and map positions
 * - Responsive design that adapts to available space
 * 
 * @param props - Component props
 */
export const CameraMapPair: React.FC<CameraMapPairProps> = ({
  cameraId,
  frameData,
  mappingCoordinates,
  onToggleMap,
  mapVisible = true,
  className = '',
  children,
  mapWidth = 600,
  mapHeight = 400,
}) => {
  const handleToggleMap = () => {
    onToggleMap?.(cameraId, !mapVisible);
  };

  const validPersonCount = mappingCoordinates.filter(c => c.projection_successful).length;

  return (
    <div className={`camera-map-pair ${className}`}>
      {/* Camera Section */}
      <div className="camera-section">
        {/* Render camera component (typically ImageSequencePlayer) */}
        {children && (
          <div className="camera-view">
            {children}
          </div>
        )}

        {/* Camera Controls */}
        <div className="camera-controls mt-2 flex items-center justify-between">
          <div className="camera-info text-sm text-gray-600">
            Camera {cameraId}
            {validPersonCount > 0 && (
              <span className="ml-2 text-blue-600">
                • {validPersonCount} person{validPersonCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            onClick={handleToggleMap}
            className={`toggle-map-btn px-3 py-1 text-sm rounded transition-colors ${mapVisible
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            aria-label={`${mapVisible ? 'Hide' : 'Show'} map for camera ${cameraId}`}
            data-testid={`toggle-map-${cameraId}`}
          >
            {mapVisible ? '📍 Hide Map' : '🗺️ Show Map'}
          </button>
        </div>
      </div>

      {/* Map Section */}
      {mapVisible && (
        <div className="map-section mt-3">
          <MiniMapComponent
            cameraId={cameraId}
            mappingCoordinates={mappingCoordinates}
            className="camera-mini-map"
            width={mapWidth}
            height={mapHeight}
          />
        </div>
      )}

      {/* Status Information */}
      {mapVisible && mappingCoordinates.length > 0 && (
        <div className="status-info mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>
              🎯 Tracking: {validPersonCount}/{mappingCoordinates.length}
            </span>
            {mappingCoordinates.some(c => c.trail && c.trail.length > 1) && (
              <span>
                🛤️ Trails: {mappingCoordinates.filter(c => c.trail && c.trail.length > 1).length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CameraMapPairProps type export for external usage
 */
export type { CameraMapPairProps, MappingCoordinate };