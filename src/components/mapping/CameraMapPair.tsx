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
 * Professional design with:
 * - Clean dark theme matching the detection pipeline
 * - Elegant badge and status indicators
 * - Responsive layout
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
  const hasTrails = mappingCoordinates.some(c => c.trail && c.trail.length > 1);

  return (
    <div className={`camera-map-pair ${className}`}>
      {/* Camera Section */}
      {children && (
        <div className="camera-section">
          <div className="camera-view">
            {children}
          </div>
        </div>
      )}

      {/* Controls & Info Bar */}
      <div
        className="flex items-center justify-between py-2 px-1"
        style={{ minHeight: '36px' }}
      >
        {/* Camera Info with Status */}
        <div className="flex items-center gap-3">
          {/* Camera ID Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(34, 211, 238, 0.05))',
              border: '1px solid rgba(34, 211, 238, 0.3)',
            }}
          >
            <span className="text-cyan-400 text-xs">📍</span>
            <span className="text-cyan-300 font-semibold text-sm">{cameraId.toUpperCase()}</span>
          </div>

          {/* Person Count Badge */}
          {validPersonCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(52, 211, 153, 0.1))',
                border: '1px solid rgba(52, 211, 153, 0.3)',
              }}
            >
              <span className="text-emerald-400 font-bold text-xs">
                {validPersonCount}
              </span>
              <span className="text-emerald-300 text-xs">
                person{validPersonCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Trails Badge */}
          {hasTrails && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
              }}
            >
              <span className="text-amber-400 text-xs">🛤️</span>
              <span className="text-amber-300 text-xs font-medium">
                {mappingCoordinates.filter(c => c.trail && c.trail.length > 1).length} trails
              </span>
            </div>
          )}
        </div>

        {/* Toggle Button (only if handler provided) */}
        {onToggleMap && (
          <button
            onClick={handleToggleMap}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 ease-out
              ${mapVisible
                ? 'text-cyan-300 hover:text-cyan-200'
                : 'text-slate-400 hover:text-slate-300'
              }
            `}
            style={{
              background: mapVisible
                ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(34, 211, 238, 0.1))'
                : 'rgba(100, 116, 139, 0.1)',
              border: mapVisible
                ? '1px solid rgba(34, 211, 238, 0.4)'
                : '1px solid rgba(100, 116, 139, 0.2)',
            }}
            aria-label={`${mapVisible ? 'Hide' : 'Show'} map for camera ${cameraId}`}
            data-testid={`toggle-map-${cameraId}`}
          >
            <span>{mapVisible ? '🗺️' : '📍'}</span>
            <span>{mapVisible ? 'Hide Map' : 'Show Map'}</span>
          </button>
        )}
      </div>

      {/* Map Section - Always render when mapVisible is true */}
      {mapVisible && (
        <div className="mt-2">
          <MiniMapComponent
            cameraId={cameraId}
            mappingCoordinates={mappingCoordinates}
            className="camera-mini-map"
            width={mapWidth}
            height={mapHeight}
          />
        </div>
      )}

      {/* Status Bar */}
      {mapVisible && mappingCoordinates.length > 0 && (
        <div
          className="flex items-center justify-between mt-3 px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(100, 116, 139, 0.15)',
          }}
        >
          <div className="flex items-center gap-4">
            {/* Tracking Status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 text-xs">
                Tracking <span className="text-emerald-400 font-semibold">{validPersonCount}</span>/{mappingCoordinates.length}
              </span>
            </div>
          </div>

          {/* Coordinate System */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">BEV Projection</span>
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                background: 'rgba(34, 211, 238, 0.1)',
                color: '#22d3ee',
              }}
            >
              Active
            </span>
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