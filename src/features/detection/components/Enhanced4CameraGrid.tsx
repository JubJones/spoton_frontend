import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Detection, TrackingResult } from '../../../services/types/api';
import { useDetectionStore } from '../../../stores/detectionStore';
import { useTrackingStore } from '../../../stores/trackingStore';
import { InteractiveCameraView } from './InteractiveCameraView';
import { TrackingOverlay } from './TrackingOverlay';
import { frameSynchronizer } from '../../../services/frameSynchronizer';
import { performanceMonitor } from '../../../services/performanceMonitor';

interface Enhanced4CameraGridProps {
  cameras: Camera[];
  detections: Detection[];
  trackingResults: TrackingResult[];
  onPersonSelect?: (personId: string) => void;
  onCameraSelect?: (cameraId: string) => void;
  className?: string;
  enableSync?: boolean;
  enablePip?: boolean; // Picture-in-picture mode
  enableMatrix?: boolean; // Matrix view with multiple layouts
  showPerformanceStats?: boolean;
}

interface GridLayout {
  id: string;
  name: string;
  description: string;
  gridConfig: {
    columns: number;
    rows: number;
    cells: GridCell[];
  };
}

interface GridCell {
  cameraId: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface GridState {
  currentLayout: string;
  selectedCameraId: string | null;
  pipCameraId: string | null;
  syncEnabled: boolean;
  showOverlays: boolean;
  followMode: boolean; // Follow tracked person across cameras
  selectedPersonId: string | null;
  matrixMode: boolean;
}

export const Enhanced4CameraGrid: React.FC<Enhanced4CameraGridProps> = ({
  cameras,
  detections,
  trackingResults,
  onPersonSelect,
  onCameraSelect,
  className = '',
  enableSync = true,
  enablePip = true,
  enableMatrix = true,
  showPerformanceStats = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridState, setGridState] = useState<GridState>({
    currentLayout: 'standard',
    selectedCameraId: null,
    pipCameraId: null,
    syncEnabled: enableSync,
    showOverlays: true,
    followMode: false,
    selectedPersonId: null,
    matrixMode: false,
  });

  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    syncQuality: 'excellent' as const,
    latency: 0,
    activeConnections: 0,
  });

  // Store hooks
  const { selectedDetection } = useDetectionStore();
  const { trackingTargets, trackingHistory } = useTrackingStore();

  // Available layouts
  const layouts: GridLayout[] = [
    {
      id: 'standard',
      name: 'Standard 2x2',
      description: 'Equal-sized 2x2 grid',
      gridConfig: {
        columns: 2,
        rows: 2,
        cells: [
          { cameraId: cameras[0]?.id || '', row: 0, col: 0 },
          { cameraId: cameras[1]?.id || '', row: 0, col: 1 },
          { cameraId: cameras[2]?.id || '', row: 1, col: 0 },
          { cameraId: cameras[3]?.id || '', row: 1, col: 1 },
        ],
      },
    },
    {
      id: 'focus',
      name: 'Focus + Thumbnails',
      description: 'Main camera with 3 thumbnails',
      gridConfig: {
        columns: 3,
        rows: 3,
        cells: [
          { cameraId: cameras[0]?.id || '', row: 0, col: 0, rowSpan: 2, colSpan: 2, priority: 'high' },
          { cameraId: cameras[1]?.id || '', row: 0, col: 2 },
          { cameraId: cameras[2]?.id || '', row: 1, col: 2 },
          { cameraId: cameras[3]?.id || '', row: 2, col: 0, colSpan: 3 },
        ],
      },
    },
    {
      id: 'tracking',
      name: 'Tracking Layout',
      description: 'Optimized for person tracking',
      gridConfig: {
        columns: 4,
        rows: 2,
        cells: [
          { cameraId: cameras[0]?.id || '', row: 0, col: 0, colSpan: 2 },
          { cameraId: cameras[1]?.id || '', row: 0, col: 2 },
          { cameraId: cameras[2]?.id || '', row: 0, col: 3 },
          { cameraId: cameras[3]?.id || '', row: 1, col: 0, colSpan: 4 },
        ],
      },
    },
    {
      id: 'matrix',
      name: 'Matrix View',
      description: 'Multiple synchronized views',
      gridConfig: {
        columns: 2,
        rows: 2,
        cells: [
          { cameraId: cameras[0]?.id || '', row: 0, col: 0 },
          { cameraId: cameras[1]?.id || '', row: 0, col: 1 },
          { cameraId: cameras[2]?.id || '', row: 1, col: 0 },
          { cameraId: cameras[3]?.id || '', row: 1, col: 1 },
        ],
      },
    },
  ];

  // Update performance stats
  useEffect(() => {
    const updateStats = () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      const syncQuality = frameSynchronizer.getSyncQuality();
      
      setPerformanceStats({
        fps: Math.round(metrics.fps),
        syncQuality: syncQuality.overall,
        latency: Math.round(metrics.latency),
        activeConnections: cameras.filter(c => c.isActive).length,
      });
    };

    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [cameras]);

  // Follow mode: automatically switch to camera with tracked person
  useEffect(() => {
    if (gridState.followMode && gridState.selectedPersonId) {
      const personDetection = detections.find(d => d.personId === gridState.selectedPersonId);
      if (personDetection && personDetection.cameraId) {
        setGridState(prev => ({
          ...prev,
          selectedCameraId: personDetection.cameraId,
        }));
      }
    }
  }, [gridState.followMode, gridState.selectedPersonId, detections]);

  // Handle person selection
  const handlePersonSelect = useCallback((personId: string) => {
    setGridState(prev => ({
      ...prev,
      selectedPersonId: personId,
    }));
    onPersonSelect?.(personId);
  }, [onPersonSelect]);

  // Handle camera selection
  const handleCameraSelect = useCallback((cameraId: string) => {
    setGridState(prev => ({
      ...prev,
      selectedCameraId: prev.selectedCameraId === cameraId ? null : cameraId,
    }));
    onCameraSelect?.(cameraId);
  }, [onCameraSelect]);

  // Handle layout change
  const handleLayoutChange = useCallback((layoutId: string) => {
    setGridState(prev => ({
      ...prev,
      currentLayout: layoutId,
    }));
  }, []);

  // Handle PIP toggle
  const handlePipToggle = useCallback((cameraId: string) => {
    setGridState(prev => ({
      ...prev,
      pipCameraId: prev.pipCameraId === cameraId ? null : cameraId,
    }));
  }, []);

  // Handle sync toggle
  const handleSyncToggle = useCallback(() => {
    setGridState(prev => ({
      ...prev,
      syncEnabled: !prev.syncEnabled,
    }));
  }, []);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback(() => {
    setGridState(prev => ({
      ...prev,
      showOverlays: !prev.showOverlays,
    }));
  }, []);

  // Handle follow mode toggle
  const handleFollowModeToggle = useCallback(() => {
    setGridState(prev => ({
      ...prev,
      followMode: !prev.followMode,
    }));
  }, []);

  // Handle matrix mode toggle
  const handleMatrixModeToggle = useCallback(() => {
    setGridState(prev => ({
      ...prev,
      matrixMode: !prev.matrixMode,
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return;

      switch (event.key) {
        case '1':
        case '2':
        case '3':
        case '4':
          const cameraIndex = parseInt(event.key) - 1;
          if (cameras[cameraIndex]) {
            handleCameraSelect(cameras[cameraIndex].id);
          }
          break;
        case 'l':
          // Cycle through layouts
          const currentIndex = layouts.findIndex(l => l.id === gridState.currentLayout);
          const nextIndex = (currentIndex + 1) % layouts.length;
          handleLayoutChange(layouts[nextIndex].id);
          break;
        case 'p':
          if (gridState.selectedCameraId) {
            handlePipToggle(gridState.selectedCameraId);
          }
          break;
        case 's':
          handleSyncToggle();
          break;
        case 'o':
          handleOverlayToggle();
          break;
        case 'f':
          handleFollowModeToggle();
          break;
        case 'm':
          handleMatrixModeToggle();
          break;
        case 'Escape':
          setGridState(prev => ({
            ...prev,
            selectedCameraId: null,
            pipCameraId: null,
            selectedPersonId: null,
            followMode: false,
          }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridState, cameras, layouts, handleCameraSelect, handleLayoutChange, handlePipToggle, handleSyncToggle, handleOverlayToggle, handleFollowModeToggle, handleMatrixModeToggle]);

  // Get current layout
  const currentLayout = layouts.find(l => l.id === gridState.currentLayout) || layouts[0];

  // Group detections by camera
  const detectionsByCamera = React.useMemo(() => {
    const grouped: Record<string, Detection[]> = {};
    cameras.forEach(camera => {
      grouped[camera.id] = detections.filter(d => d.cameraId === camera.id);
    });
    return grouped;
  }, [cameras, detections]);

  // Group tracking results by camera
  const trackingResultsByCamera = React.useMemo(() => {
    const grouped: Record<string, TrackingResult[]> = {};
    cameras.forEach(camera => {
      grouped[camera.id] = trackingResults.filter(r => r.cameraId === camera.id);
    });
    return grouped;
  }, [cameras, trackingResults]);

  // Render camera cell
  const renderCameraCell = (cell: GridCell, camera: Camera | undefined) => {
    if (!camera) return null;

    const isSelected = gridState.selectedCameraId === camera.id;
    const isPip = gridState.pipCameraId === camera.id;
    const cameraDetections = detectionsByCamera[camera.id] || [];
    const cameraTrackingResults = trackingResultsByCamera[camera.id] || [];

    return (
      <div
        key={camera.id}
        className={`
          relative bg-gray-900 rounded-lg overflow-hidden border-2 transition-all duration-300
          ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-700'}
          ${isPip ? 'z-50' : ''}
          ${cell.priority === 'high' ? 'ring-2 ring-yellow-400' : ''}
        `}
        style={{
          gridColumn: `${cell.col + 1} / span ${cell.colSpan || 1}`,
          gridRow: `${cell.row + 1} / span ${cell.rowSpan || 1}`,
        }}
      >
        <InteractiveCameraView
          camera={camera}
          detections={cameraDetections}
          onPersonSelect={handlePersonSelect}
          onTrackingStart={(detection) => {
            handlePersonSelect(detection.personId || '');
          }}
          className="w-full h-full"
          showOverlays={gridState.showOverlays}
          enableClickToTrack={true}
          highlightedPersonId={gridState.selectedPersonId || undefined}
        />

        {/* Enhanced tracking overlay */}
        {gridState.showOverlays && (
          <TrackingOverlay
            detections={cameraDetections}
            trackingResults={cameraTrackingResults}
            cameraId={camera.id}
            canvasWidth={640}
            canvasHeight={480}
            imageWidth={1920}
            imageHeight={1080}
            selectedPersonId={gridState.selectedPersonId || undefined}
            highlightedPersonId={gridState.selectedPersonId || undefined}
            showTrajectories={true}
            showVelocity={true}
            showMetadata={true}
            showConnections={true}
            className="absolute inset-0"
          />
        )}

        {/* Camera controls */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleCameraSelect(camera.id)}
            className={`p-1 rounded text-xs transition-colors ${
              isSelected ? 'bg-blue-500 text-white' : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
            }`}
            title="Select camera"
          >
            SELECT
          </button>
          
          {enablePip && (
            <button
              onClick={() => handlePipToggle(camera.id)}
              className={`p-1 rounded text-xs transition-colors ${
                isPip ? 'bg-green-500 text-white' : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
              }`}
              title="Picture-in-picture"
            >
              PIP
            </button>
          )}
        </div>

        {/* Camera info */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          <div className="font-semibold">{camera.name}</div>
          <div className="text-xs opacity-75">
            {cameraDetections.length} detections • {camera.fps} FPS
          </div>
        </div>

        {/* Sync indicator */}
        {gridState.syncEnabled && (
          <div className="absolute top-2 left-2 bg-green-500 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            SYNC
          </div>
        )}

        {/* Follow mode indicator */}
        {gridState.followMode && gridState.selectedPersonId && (
          <div className="absolute top-8 left-2 bg-blue-500 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            FOLLOW
          </div>
        )}
      </div>
    );
  };

  // Render PIP overlay
  const renderPipOverlay = () => {
    if (!gridState.pipCameraId) return null;

    const pipCamera = cameras.find(c => c.id === gridState.pipCameraId);
    if (!pipCamera) return null;

    return (
      <div className="fixed bottom-4 right-4 w-64 h-48 bg-gray-900 border-2 border-gray-600 rounded-lg overflow-hidden z-50">
        <InteractiveCameraView
          camera={pipCamera}
          detections={detectionsByCamera[pipCamera.id] || []}
          onPersonSelect={handlePersonSelect}
          className="w-full h-full"
          showOverlays={true}
          enableClickToTrack={true}
          highlightedPersonId={gridState.selectedPersonId || undefined}
        />
        
        <button
          onClick={() => handlePipToggle(pipCamera.id)}
          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className} group`}>
      {/* Control panel */}
      <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-75 text-white p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-wrap gap-2 mb-2">
          {/* Layout selector */}
          <select
            value={gridState.currentLayout}
            onChange={(e) => handleLayoutChange(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 rounded text-xs"
          >
            {layouts.map(layout => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>

          {/* Control buttons */}
          <button
            onClick={handleSyncToggle}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              gridState.syncEnabled ? 'bg-green-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            SYNC
          </button>

          <button
            onClick={handleOverlayToggle}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              gridState.showOverlays ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            OVERLAY
          </button>

          <button
            onClick={handleFollowModeToggle}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              gridState.followMode ? 'bg-purple-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            FOLLOW
          </button>

          {enableMatrix && (
            <button
              onClick={handleMatrixModeToggle}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                gridState.matrixMode ? 'bg-yellow-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
            >
              MATRIX
            </button>
          )}
        </div>

        {/* Current layout info */}
        <div className="text-xs opacity-75 mb-1">
          {currentLayout.description}
        </div>

        {/* Keyboard shortcuts */}
        <div className="text-xs opacity-50">
          1-4: Select • L: Layout • P: PIP • S: Sync • O: Overlay • F: Follow • M: Matrix
        </div>
      </div>

      {/* Performance stats */}
      {showPerformanceStats && (
        <div className="absolute top-2 right-2 z-10 bg-black bg-opacity-75 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs">
            <div>FPS: {performanceStats.fps}</div>
            <div>Sync: {performanceStats.syncQuality}</div>
            <div>Latency: {performanceStats.latency}ms</div>
            <div>Active: {performanceStats.activeConnections}/{cameras.length}</div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div
        className="h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${currentLayout.gridConfig.columns}, 1fr)`,
          gridTemplateRows: `repeat(${currentLayout.gridConfig.rows}, 1fr)`,
          gap: '8px',
        }}
      >
        {currentLayout.gridConfig.cells.map(cell => {
          const camera = cameras.find(c => c.id === cell.cameraId);
          return renderCameraCell(cell, camera);
        })}
      </div>

      {/* PIP overlay */}
      {enablePip && renderPipOverlay()}

      {/* Status bar */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        {gridState.selectedPersonId && (
          <span>Selected: {gridState.selectedPersonId} • </span>
        )}
        {trackingTargets.length > 0 && (
          <span>Tracking: {trackingTargets.length} • </span>
        )}
        Layout: {currentLayout.name}
      </div>
    </div>
  );
};

export default Enhanced4CameraGrid;