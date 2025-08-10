// src/components/performance/OptimizedCameraGrid.tsx
import React, { memo, useMemo, useCallback } from 'react';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../../types/api';

// Lazy load the main component
const CameraGrid = React.lazy(() => import('../CameraGrid'));

interface CameraData {
  cameraId: BackendCameraId;
  imageSrc?: string;
  base64Image?: string;
  tracks: TrackedPerson[];
  isLoading?: boolean;
  lastUpdated?: Date;
}

interface OptimizedCameraGridProps {
  environment: EnvironmentId;
  cameraData: Record<BackendCameraId, CameraData>;
  focusedCameraId?: BackendCameraId | null;
  selectedPersonIds?: Set<string>;
  className?: string;
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

// Memoized CameraGrid with performance optimizations
const OptimizedCameraGrid = memo<OptimizedCameraGridProps>(
  ({
    environment,
    cameraData,
    focusedCameraId,
    selectedPersonIds,
    className,
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
    // Memoize expensive calculations
    const cameraDataStable = useMemo(() => {
      // Create stable reference for camera data to prevent unnecessary re-renders
      const stableData: Record<string, CameraData> = {};
      Object.entries(cameraData).forEach(([id, data]) => {
        stableData[id] = {
          ...data,
          tracks: data.tracks || [], // Ensure tracks is always an array
        };
      });
      return stableData as Record<BackendCameraId, CameraData>;
    }, [cameraData]);

    // Memoize selected person IDs as array for stable comparison
    const selectedPersonIdsArray = useMemo(() => {
      return selectedPersonIds ? Array.from(selectedPersonIds).sort() : [];
    }, [selectedPersonIds]);

    const selectedPersonIdsSet = useMemo(() => {
      return new Set(selectedPersonIdsArray);
    }, [selectedPersonIdsArray]);

    // Stable event handlers
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

    const handleCameraFocus = useCallback(
      (cameraId: BackendCameraId | null) => {
        onCameraFocus?.(cameraId);
      },
      [onCameraFocus]
    );

    const handleGridLayoutChange = useCallback(
      (layout: '2x2' | '1x4' | 'focus') => {
        onGridLayoutChange?.(layout);
      },
      [onGridLayoutChange]
    );

    const handleDisplayOptionsChange = useCallback(
      (options: { showConfidence: boolean; showPersonIds: boolean }) => {
        onDisplayOptionsChange?.(options);
      },
      [onDisplayOptionsChange]
    );

    return (
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-300">Loading camera grid...</span>
          </div>
        }
      >
        <CameraGrid
          environment={environment}
          cameraData={cameraDataStable}
          focusedCameraId={focusedCameraId}
          selectedPersonIds={selectedPersonIdsSet}
          className={className}
          onPersonClick={handlePersonClick}
          onPersonHover={handlePersonHover}
          onCameraFocus={handleCameraFocus}
          onGridLayoutChange={handleGridLayoutChange}
          onDisplayOptionsChange={handleDisplayOptionsChange}
          showConfidence={showConfidence}
          showPersonIds={showPersonIds}
          gridLayout={gridLayout}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </React.Suspense>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for performance

    // Quick checks for primitive values
    if (
      prevProps.environment !== nextProps.environment ||
      prevProps.focusedCameraId !== nextProps.focusedCameraId ||
      prevProps.className !== nextProps.className ||
      prevProps.showConfidence !== nextProps.showConfidence ||
      prevProps.showPersonIds !== nextProps.showPersonIds ||
      prevProps.gridLayout !== nextProps.gridLayout ||
      prevProps.isMobile !== nextProps.isMobile ||
      prevProps.isTablet !== nextProps.isTablet
    ) {
      return false; // Props changed, re-render
    }

    // Check callbacks (these should be stable with useCallback)
    if (
      prevProps.onPersonClick !== nextProps.onPersonClick ||
      prevProps.onPersonHover !== nextProps.onPersonHover ||
      prevProps.onCameraFocus !== nextProps.onCameraFocus ||
      prevProps.onGridLayoutChange !== nextProps.onGridLayoutChange ||
      prevProps.onDisplayOptionsChange !== nextProps.onDisplayOptionsChange
    ) {
      return false;
    }

    // Deep comparison for cameraData (expensive but necessary)
    const prevCameras = Object.keys(prevProps.cameraData);
    const nextCameras = Object.keys(nextProps.cameraData);

    if (prevCameras.length !== nextCameras.length) {
      return false;
    }

    for (const cameraId of prevCameras) {
      const prevData = prevProps.cameraData[cameraId as BackendCameraId];
      const nextData = nextProps.cameraData[cameraId as BackendCameraId];

      if (!nextData || !prevData) {
        return false;
      }

      // Compare basic properties
      if (
        prevData.imageSrc !== nextData.imageSrc ||
        prevData.base64Image !== nextData.base64Image ||
        prevData.isLoading !== nextData.isLoading
      ) {
        return false;
      }

      // Compare lastUpdated timestamp
      if (prevData.lastUpdated?.getTime() !== nextData.lastUpdated?.getTime()) {
        return false;
      }

      // Compare tracks array
      if (prevData.tracks.length !== nextData.tracks.length) {
        return false;
      }

      // Quick shallow comparison of tracks
      for (let i = 0; i < prevData.tracks.length; i++) {
        const prevTrack = prevData.tracks[i];
        const nextTrack = nextData.tracks[i];

        if (
          prevTrack.track_id !== nextTrack.track_id ||
          prevTrack.global_id !== nextTrack.global_id ||
          prevTrack.confidence !== nextTrack.confidence ||
          JSON.stringify(prevTrack.bbox_xyxy) !== JSON.stringify(nextTrack.bbox_xyxy)
        ) {
          return false;
        }
      }
    }

    // Compare selectedPersonIds Set
    const prevSelected = prevProps.selectedPersonIds
      ? Array.from(prevProps.selectedPersonIds).sort()
      : [];
    const nextSelected = nextProps.selectedPersonIds
      ? Array.from(nextProps.selectedPersonIds).sort()
      : [];

    if (prevSelected.length !== nextSelected.length) {
      return false;
    }

    for (let i = 0; i < prevSelected.length; i++) {
      if (prevSelected[i] !== nextSelected[i]) {
        return false;
      }
    }

    return true; // Props are equal, skip re-render
  }
);

OptimizedCameraGrid.displayName = 'OptimizedCameraGrid';

export default OptimizedCameraGrid;
