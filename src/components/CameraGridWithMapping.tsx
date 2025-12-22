// src/components/CameraGridWithMapping.tsx
import React, { useState, useCallback, useMemo } from 'react';
import CameraGrid from './CameraGrid';
import { CameraMapPair } from './mapping';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName, getFrontendCameraId } from '../config/environments';
import { useViewportSize, getResponsiveClasses } from '../utils/responsive';

interface CameraData {
  cameraId: BackendCameraId;
  imageSrc?: string;
  base64Image?: string;
  tracks: TrackedPerson[];
  isLoading?: boolean;
  lastUpdated?: Date;
}

/**
 * Mapping coordinate interface from WebSocket detection endpoint
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
 * WebSocket message structure from detection endpoint
 */
interface DetectionMessage {
  type: string;
  camera_id: string;
  future_pipeline_data?: {
    mapping_coordinates?: MappingCoordinate[];
  };
}

interface CameraGridWithMappingProps {
  environment: EnvironmentId;
  cameraData: Record<BackendCameraId, CameraData>;
  focusedCameraId?: BackendCameraId | null;
  selectedPersonIds?: Set<string>;
  className?: string;
  // Mapping specific props
  mappingData?: Record<BackendCameraId, MappingCoordinate[]>;
  showMaps?: boolean;
  defaultMapVisibility?: Record<BackendCameraId, boolean>;
  onMappingToggle?: (cameraId: BackendCameraId, visible: boolean) => void;
  // Existing camera grid props
  onPersonClick?: (person: TrackedPerson, cameraId: BackendCameraId) => void;
  onPersonHover?: (person: TrackedPerson | null, cameraId: BackendCameraId) => void;
  onCameraFocus?: (cameraId: BackendCameraId | null) => void;
  onGridLayoutChange?: (layout: '2x2' | '1x4' | 'focus') => void;
  onDisplayOptionsChange?: (options: { showConfidence: boolean; showPersonIds: boolean }) => void;
  showConfidence?: boolean;
  showPersonIds?: boolean;
  gridLayout?: '2x2' | '1x4' | 'focus';
  isMobile?: boolean;
  isTablet?: boolean;
}

/**
 * CameraGridWithMapping - Enhanced camera grid with integrated 2D mapping
 * 
 * This component wraps the existing CameraGrid with 2D mapping functionality.
 * It provides:
 * - All existing camera grid functionality
 * - Individual 2D maps for each camera
 * - Real-time person position visualization
 * - Movement trail visualization
 * - Toggle controls for showing/hiding maps
 */
const CameraGridWithMapping: React.FC<CameraGridWithMappingProps> = ({
  environment,
  cameraData,
  focusedCameraId,
  selectedPersonIds = new Set(),
  className = '',
  mappingData = {},
  showMaps = true,
  defaultMapVisibility,
  onMappingToggle,
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
  const { screenSize } = useViewportSize();
  const actualIsMobile = isMobile ?? screenSize === 'mobile';
  const actualIsTablet = isTablet ?? screenSize === 'tablet';

  // Initialize map visibility state
  const [mapVisibility, setMapVisibility] = useState<Partial<Record<BackendCameraId, boolean>>>(() => {
    const availableCameras = Object.keys(cameraData) as BackendCameraId[];
    const initialVisibility: Partial<Record<BackendCameraId, boolean>> = {};

    availableCameras.forEach(cameraId => {
      initialVisibility[cameraId] = defaultMapVisibility?.[cameraId] ?? true;
    });

    return initialVisibility;
  });

  // Handle map toggle
  const handleToggleMap = useCallback((cameraId: BackendCameraId, visible: boolean) => {
    setMapVisibility(prev => ({
      ...prev,
      [cameraId]: visible
    }));

    onMappingToggle?.(cameraId, visible);
  }, [onMappingToggle]);

  // Get available cameras
  const availableCameras = Object.keys(cameraData) as BackendCameraId[];

  // Memoized mapping data per camera
  const mappingByCamera = useMemo(() => {
    const result: Partial<Record<BackendCameraId, MappingCoordinate[]>> = {};
    availableCameras.forEach(cameraId => {
      result[cameraId] = mappingData[cameraId] || [];
    });
    return result;
  }, [mappingData, availableCameras]);

  // Check if any camera has mapping data
  const hasMappingData = useMemo(() => {
    return Object.values(mappingByCamera).some(coords => coords.length > 0);
  }, [mappingByCamera]);

  // Render individual camera with map
  const renderCameraWithMap = (cameraId: BackendCameraId, data: CameraData) => {
    const mappingCoordinates = mappingByCamera[cameraId] || [];
    const isMapVisible = mapVisibility[cameraId] && showMaps;

    return (
      <div key={cameraId} className="camera-with-map-container">
        <CameraMapPair
          cameraId={cameraId}
          frameData={data.base64Image}
          mappingCoordinates={mappingCoordinates}
          onToggleMap={handleToggleMap}
          mapVisible={isMapVisible}
          className="w-full"
        >
          {/* Pass the original camera functionality as children */}
          <div className="camera-wrapper w-full h-full">
            {/* This would need to be refactored to extract just the camera rendering part */}
            {/* For now, we'll integrate this differently - see alternative approach below */}
          </div>
        </CameraMapPair>
      </div>
    );
  };

  // Global map controls
  const renderMappingControls = () => {
    if (!showMaps || !hasMappingData) return null;

    const allMapsVisible = availableCameras.every(id => mapVisibility[id]);
    const anyMapsVisible = availableCameras.some(id => mapVisibility[id]);

    return (
      <div className="mapping-controls bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">
            2D Mapping 🗺️
          </h3>

          <div className="flex items-center space-x-2">
            <span className="text-gray-300 text-xs">
              {Object.values(mappingByCamera).reduce((sum, coords) => sum + coords.length, 0)} person positions
            </span>

            <button
              onClick={() => {
                const newVisibility = !allMapsVisible;
                const newState = Object.fromEntries(
                  availableCameras.map(id => [id, newVisibility])
                ) as Record<BackendCameraId, boolean>;

                setMapVisibility(newState);
                availableCameras.forEach(id => onMappingToggle?.(id, newVisibility));
              }}
              className={`px-3 py-1 text-xs rounded transition-colors ${anyMapsVisible
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
            >
              {allMapsVisible ? 'Hide All Maps' : 'Show All Maps'}
            </button>
          </div>
        </div>

        {anyMapsVisible && (
          <div className="mt-2 text-xs text-gray-400">
            Real-time person positions with 3-frame movement trails
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`camera-grid-with-mapping ${className}`}>
      {/* Mapping Controls */}
      {renderMappingControls()}

      {/* Original Camera Grid */}
      <CameraGrid
        environment={environment}
        cameraData={cameraData}
        focusedCameraId={focusedCameraId}
        selectedPersonIds={selectedPersonIds}
        onPersonClick={onPersonClick}
        onPersonHover={onPersonHover}
        onCameraFocus={onCameraFocus}
        onGridLayoutChange={onGridLayoutChange}
        onDisplayOptionsChange={onDisplayOptionsChange}
        showConfidence={showConfidence}
        showPersonIds={showPersonIds}
        gridLayout={gridLayout}
        isMobile={actualIsMobile}
        isTablet={actualIsTablet}
        className="mb-4"
      />

      {/* Mapping Section */}
      {showMaps && hasMappingData && (
        <div className="mapping-section">
          <div className={`grid gap-4 ${actualIsMobile
            ? 'grid-cols-1'
            : actualIsTablet
              ? 'grid-cols-2'
              : 'grid-cols-2'
            }`}>
            {availableCameras.map((cameraId) => {
              const data = cameraData[cameraId];
              const mappingCoordinates = mappingByCamera[cameraId] || [];
              const isMapVisible = mapVisibility[cameraId];

              if (!data || !isMapVisible || mappingCoordinates.length === 0) {
                return null;
              }

              return (
                <div key={`map-${cameraId}`} className="camera-map-standalone">
                  <CameraMapPair
                    cameraId={cameraId}
                    mappingCoordinates={mappingCoordinates}
                    onToggleMap={handleToggleMap}
                    mapVisible={true}
                    className="border border-gray-600 rounded-lg p-3 bg-gray-800"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No mapping data message */}
      {showMaps && !hasMappingData && (
        <div className="no-mapping-data bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">
            🗺️ 2D mapping will display when person positions are detected
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Start detection to see real-time person tracking on maps
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraGridWithMapping;
export type { CameraGridWithMappingProps, MappingCoordinate, DetectionMessage };