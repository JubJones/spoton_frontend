import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Detection } from '../../../services/types/api';
import { useDetectionStore } from '../../../stores/detectionStore';
import { useTrackingStore } from '../../../stores/trackingStore';
import { InteractiveCameraView } from './InteractiveCameraView';

interface InteractiveCameraGridProps {
  cameras: Camera[];
  detections: Detection[];
  onPersonSelect?: (personId: string) => void;
  onCameraSelect?: (cameraId: string) => void;
  className?: string;
  layout?: 'grid' | 'focus' | 'carousel';
  enableClickToTrack?: boolean;
  enableSync?: boolean;
  highlightedPersonId?: string;
}

interface CameraGridState {
  focusedCameraId: string | null;
  syncEnabled: boolean;
  layoutMode: 'grid' | 'focus' | 'carousel';
  selectedPersonId: string | null;
}

export const InteractiveCameraGrid: React.FC<InteractiveCameraGridProps> = ({
  cameras,
  detections,
  onPersonSelect,
  onCameraSelect,
  className = '',
  layout = 'grid',
  enableClickToTrack = true,
  enableSync = true,
  highlightedPersonId,
}) => {
  const [gridState, setGridState] = useState<CameraGridState>({
    focusedCameraId: null,
    syncEnabled: enableSync,
    layoutMode: layout,
    selectedPersonId: null,
  });

  const [hoveredCameraId, setHoveredCameraId] = useState<string | null>(null);
  const [fullscreenCameraId, setFullscreenCameraId] = useState<string | null>(null);

  // Store hooks
  const { selectedDetection } = useDetectionStore();
  const { trackingTargets, isTracking } = useTrackingStore();

  // Update selected person when detection changes
  useEffect(() => {
    if (selectedDetection) {
      setGridState(prev => ({
        ...prev,
        selectedPersonId: selectedDetection.personId || null,
      }));
    }
  }, [selectedDetection]);

  // Group detections by camera
  const detectionsByCamera = React.useMemo(() => {
    const grouped: Record<string, Detection[]> = {};
    cameras.forEach(camera => {
      grouped[camera.id] = detections.filter(d => d.cameraId === camera.id);
    });
    return grouped;
  }, [cameras, detections]);

  // Handle person selection
  const handlePersonSelect = useCallback((personId: string) => {
    setGridState(prev => ({
      ...prev,
      selectedPersonId: personId,
    }));
    onPersonSelect?.(personId);
  }, [onPersonSelect]);

  // Handle camera focus
  const handleCameraFocus = useCallback((cameraId: string) => {
    setGridState(prev => ({
      ...prev,
      focusedCameraId: prev.focusedCameraId === cameraId ? null : cameraId,
    }));
    onCameraSelect?.(cameraId);
  }, [onCameraSelect]);

  // Handle tracking start
  const handleTrackingStart = useCallback((detection: Detection) => {
    // Focus on the camera where tracking started
    if (detection.cameraId) {
      setGridState(prev => ({
        ...prev,
        focusedCameraId: detection.cameraId,
      }));
    }
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: 'grid' | 'focus' | 'carousel') => {
    setGridState(prev => ({
      ...prev,
      layoutMode: newLayout,
      focusedCameraId: newLayout === 'grid' ? null : prev.focusedCameraId || cameras[0]?.id,
    }));
  }, [cameras]);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback((cameraId: string) => {
    setFullscreenCameraId(prev => prev === cameraId ? null : cameraId);
  }, []);

  // Handle sync toggle
  const handleSyncToggle = useCallback(() => {
    setGridState(prev => ({
      ...prev,
      syncEnabled: !prev.syncEnabled,
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '1' && event.key <= '4') {
        const cameraIndex = parseInt(event.key) - 1;
        if (cameras[cameraIndex]) {
          handleCameraFocus(cameras[cameraIndex].id);
        }
      } else if (event.key === 'g') {
        handleLayoutChange('grid');
      } else if (event.key === 'f') {
        handleLayoutChange('focus');
      } else if (event.key === 'c') {
        handleLayoutChange('carousel');
      } else if (event.key === 's') {
        handleSyncToggle();
      } else if (event.key === 'Escape') {
        setFullscreenCameraId(null);
        setGridState(prev => ({
          ...prev,
          focusedCameraId: null,
          selectedPersonId: null,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameras, handleCameraFocus, handleLayoutChange, handleSyncToggle]);

  // Render camera view
  const renderCameraView = (camera: Camera, index: number, isMain = false) => {
    const cameraDetections = detectionsByCamera[camera.id] || [];
    const isTracking = trackingTargets.some(target => target.cameraId === camera.id);
    const isFocused = gridState.focusedCameraId === camera.id;
    const isHovered = hoveredCameraId === camera.id;

    return (
      <div
        key={camera.id}
        className={`
          relative bg-gray-900 rounded-lg overflow-hidden border-2 transition-all duration-300
          ${isFocused ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-700'}
          ${isHovered ? 'border-gray-500' : ''}
          ${isTracking ? 'ring-2 ring-red-400' : ''}
          ${isMain ? 'col-span-2 row-span-2' : ''}
        `}
        onMouseEnter={() => setHoveredCameraId(camera.id)}
        onMouseLeave={() => setHoveredCameraId(null)}
      >
        <InteractiveCameraView
          camera={camera}
          detections={cameraDetections}
          onPersonSelect={handlePersonSelect}
          onTrackingStart={handleTrackingStart}
          className="w-full h-full"
          showOverlays={true}
          enableClickToTrack={enableClickToTrack}
          highlightedPersonId={highlightedPersonId || gridState.selectedPersonId || undefined}
        />

        {/* Camera controls */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleCameraFocus(camera.id)}
            className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75 transition-colors"
            title="Focus camera"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={() => handleFullscreenToggle(camera.id)}
            className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75 transition-colors"
            title="Fullscreen"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Camera stats */}
        <div className="absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
          {camera.fps} FPS • {cameraDetections.length} detections
        </div>

        {/* Sync indicator */}
        {gridState.syncEnabled && (
          <div className="absolute top-2 left-2 text-xs text-white bg-green-500 bg-opacity-75 px-2 py-1 rounded">
            SYNC
          </div>
        )}
      </div>
    );
  };

  // Render grid layout
  const renderGridLayout = () => {
    const { focusedCameraId } = gridState;
    
    if (focusedCameraId) {
      const focusedCamera = cameras.find(c => c.id === focusedCameraId);
      const otherCameras = cameras.filter(c => c.id !== focusedCameraId);

      return (
        <div className="grid grid-cols-4 grid-rows-4 gap-2 h-full">
          {/* Main focused camera */}
          {focusedCamera && renderCameraView(focusedCamera, 0, true)}
          
          {/* Other cameras */}
          {otherCameras.map((camera, index) => renderCameraView(camera, index + 1))}
        </div>
      );
    }

    // Standard 2x2 grid
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
        {cameras.map((camera, index) => renderCameraView(camera, index))}
      </div>
    );
  };

  // Render focus layout
  const renderFocusLayout = () => {
    const { focusedCameraId } = gridState;
    const focusedCamera = cameras.find(c => c.id === focusedCameraId) || cameras[0];
    
    if (!focusedCamera) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Main camera */}
        <div className="flex-1 mb-2">
          {renderCameraView(focusedCamera, 0)}
        </div>
        
        {/* Camera thumbnails */}
        <div className="flex gap-2 h-24">
          {cameras.map((camera, index) => (
            <div
              key={camera.id}
              className={`
                flex-1 cursor-pointer transition-all duration-200
                ${camera.id === focusedCamera.id ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => handleCameraFocus(camera.id)}
            >
              {renderCameraView(camera, index)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render carousel layout
  const renderCarouselLayout = () => {
    const { focusedCameraId } = gridState;
    const currentIndex = cameras.findIndex(c => c.id === focusedCameraId);
    const currentCamera = cameras[currentIndex] || cameras[0];

    return (
      <div className="flex flex-col h-full">
        {/* Main camera */}
        <div className="flex-1 mb-2">
          {currentCamera && renderCameraView(currentCamera, 0)}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-center items-center gap-4 h-12">
          <button
            onClick={() => {
              const prevIndex = (currentIndex - 1 + cameras.length) % cameras.length;
              handleCameraFocus(cameras[prevIndex].id);
            }}
            className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ←
          </button>
          
          <div className="flex gap-2">
            {cameras.map((camera, index) => (
              <button
                key={camera.id}
                onClick={() => handleCameraFocus(camera.id)}
                className={`
                  w-3 h-3 rounded-full transition-colors
                  ${index === currentIndex ? 'bg-blue-500' : 'bg-gray-400'}
                `}
              />
            ))}
          </div>
          
          <button
            onClick={() => {
              const nextIndex = (currentIndex + 1) % cameras.length;
              handleCameraFocus(cameras[nextIndex].id);
            }}
            className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            →
          </button>
        </div>
      </div>
    );
  };

  // Render fullscreen view
  if (fullscreenCameraId) {
    const fullscreenCamera = cameras.find(c => c.id === fullscreenCameraId);
    if (fullscreenCamera) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="w-full h-full max-w-7xl max-h-7xl">
            {renderCameraView(fullscreenCamera, 0)}
          </div>
          
          {/* Exit fullscreen */}
          <button
            onClick={() => setFullscreenCameraId(null)}
            className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      );
    }
  }

  return (
    <div className={`relative ${className} group`}>
      {/* Layout controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleLayoutChange('grid')}
          className={`p-2 rounded text-sm transition-colors ${
            gridState.layoutMode === 'grid' 
              ? 'bg-blue-500 text-white' 
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
          }`}
          title="Grid layout (G)"
        >
          Grid
        </button>
        <button
          onClick={() => handleLayoutChange('focus')}
          className={`p-2 rounded text-sm transition-colors ${
            gridState.layoutMode === 'focus' 
              ? 'bg-blue-500 text-white' 
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
          }`}
          title="Focus layout (F)"
        >
          Focus
        </button>
        <button
          onClick={() => handleLayoutChange('carousel')}
          className={`p-2 rounded text-sm transition-colors ${
            gridState.layoutMode === 'carousel' 
              ? 'bg-blue-500 text-white' 
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
          }`}
          title="Carousel layout (C)"
        >
          Carousel
        </button>
        <button
          onClick={handleSyncToggle}
          className={`p-2 rounded text-sm transition-colors ${
            gridState.syncEnabled 
              ? 'bg-green-500 text-white' 
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
          }`}
          title="Toggle sync (S)"
        >
          {gridState.syncEnabled ? 'SYNC ON' : 'SYNC OFF'}
        </button>
      </div>

      {/* Main content */}
      <div className="h-full">
        {gridState.layoutMode === 'grid' && renderGridLayout()}
        {gridState.layoutMode === 'focus' && renderFocusLayout()}
        {gridState.layoutMode === 'carousel' && renderCarouselLayout()}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        1-4: Focus camera • G: Grid • F: Focus • C: Carousel • S: Sync • ESC: Reset
      </div>

      {/* Status bar */}
      <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
        {cameras.filter(c => c.isActive).length}/{cameras.length} active
        {gridState.selectedPersonId && (
          <span className="ml-2">• Tracking: {gridState.selectedPersonId}</span>
        )}
      </div>
    </div>
  );
};

export default InteractiveCameraGrid;