// src/pages/GroupViewPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ImageSequencePlayer from '../components/ImageSequencePlayer';
import ErrorBoundary from '../components/common/ErrorBoundary';
import {
  LoadingOverlay,
  CameraSkeleton,
  ConnectionStatus,
} from '../components/common/LoadingStates';
import { useViewportSize, getResponsiveClasses } from '../utils/responsive';
import { useErrorRecovery, useNetworkStatus } from '../hooks/useErrorRecovery';
import { TaskManagementService } from '../services/taskManagementService';
import { SpotOnWebSocketClient } from '../services/spotOnWebSocketClient';
import { WebSocketTrackingMessagePayload } from '../types/api';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';

// --- Type Definitions (Keep as before) ---
interface Track {
  track_id: number;
  global_id: number;
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords?: [number, number];
}
interface CameraData {
  image_source: string;
  tracks: Track[];
}
interface FrameData {
  frame_index: number;
  scene_id: string;
  timestamp_processed_utc: string;
  cameras: {
    [jsonCameraId: string]: CameraData;
  };
}
interface CameraConfig {
  basePath: string;
  startFrame: number;
  frameCount: number;
  extension?: string;
}
interface FrameIndicesState {
  [appCameraId: string]: number;
}
// --- End Type Definitions ---

// --- Mock Data and Configuration (Keep as before) ---
const zoneName = 'Campus';
const totalCameras = 4;
const activeCameras = 4;
const appCameraIds = ['camera1', 'camera2', 'camera3', 'camera4'];
const cameraNames = ['Camera 1', 'Camera 2', 'Camera 3', 'Camera 4'];
const mockDetections = [145, 117, 82, 29];

const cameraFrameConfig: { [key: string]: CameraConfig } = {
  camera1: { basePath: '/frames/camera1/', startFrame: 0, frameCount: 51, extension: 'jpg' },
  camera2: { basePath: '/frames/camera2/', startFrame: 0, frameCount: 51, extension: 'jpg' },
  camera3: { basePath: '/frames/camera3/', startFrame: 0, frameCount: 51, extension: 'jpg' },
  camera4: { basePath: '/frames/camera4/', startFrame: 0, frameCount: 51, extension: 'jpg' },
};

const appCameraIdToJsonId: { [appId: string]: string } = {
  camera1: 'c09',
  camera2: 'c12', // VERIFY
  camera3: 'c13', // VERIFY
  camera4: 'c16', // VERIFY
};

const jsonIdToAppCameraId: { [jsonId: string]: string } = Object.entries(
  appCameraIdToJsonId
).reduce(
  (acc, [appId, jsonId]) => {
    acc[jsonId] = appId;
    return acc;
  },
  {} as { [jsonId: string]: string }
);

const SIMULATED_FPS = 1;
type TabType = 'all' | string;
const initialFrameIndices = appCameraIds.reduce((acc, id) => {
  acc[id] = 0;
  return acc;
}, {} as FrameIndicesState);

// Backend integration configuration - replaces static file approach
// const CURRENT_SCENE_ID = 's10'; // Removed - now dynamic from backend
// const JSON_DATA_BASE_PATH = `/coords/scene_${CURRENT_SCENE_ID}/`; // Removed - using backend API

const MAP_SOURCE_WIDTH = 1920; // Source width for map_coords (per camera)
const MAP_SOURCE_HEIGHT = 1080; // Source height for map_coords (per camera)

// --- MODIFIED: Type for storing calculated map points (per camera) ---
interface SingleCameraMapPoint {
  x: number; // Scaled x-coordinate for display within a quadrant
  y: number; // Scaled y-coordinate for display within a quadrant
  globalId: number;
}

// --- NEW: Color mapping for cameras (using JSON IDs) ---
const cameraColorMap: { [jsonCameraId: string]: string } = {
  c09: 'bg-cyan-400',
  c12: 'bg-red-500',
  c13: 'bg-yellow-400',
  c16: 'bg-purple-500',
};
const defaultDotColor = 'bg-gray-500';

// --- GroupViewPage Component ---
const GroupViewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameIndices, setFrameIndices] = useState<FrameIndicesState>(initialFrameIndices);
  const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  // Backend integration hooks
  const { isConnected, backendStatus, healthCheck } = useSpotOnBackend();
  const [taskManager, setTaskManager] = useState<TaskManagementService | null>(null);
  const [latestTrackingData, setLatestTrackingData] = useState<WebSocketTrackingMessagePayload | null>(null);
  const [isTaskActive, setIsTaskActive] = useState(false);

  // Responsive and error handling hooks
  const { screenSize } = useViewportSize();
  const { isOnline } = useNetworkStatus();
  const { error, isLoading, executeWithRecovery, retry, reset } = useErrorRecovery({
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
  });

  const responsiveClasses = getResponsiveClasses(screenSize);

  const overallMapContainerRef = useRef<HTMLDivElement>(null); // Ref for the main 2x2 grid container
  const [overallMapDimensions, setOverallMapDimensions] = useState({ width: 0, height: 0 });

  // --- MODIFIED: State to store points per camera ---
  // Key is jsonCameraId (e.g., 'c09'), value is an array of points for that camera
  const [perCameraMapPoints, setPerCameraMapPoints] = useState<{
    [jsonCameraId: string]: SingleCameraMapPoint[];
  }>({});

  const advanceFrames = useCallback(() => {
    setFrameIndices((prevIndices) => {
      const newIndices = { ...prevIndices };
      appCameraIds.forEach((id) => {
        const config = cameraFrameConfig[id];
        if (config && config.frameCount > 0) {
          newIndices[id] = (prevIndices[id] + 1) % config.frameCount;
        }
      });
      return newIndices;
    });
  }, []);

  useEffect(() => {
    const stopInterval = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    stopInterval();
    if (isPlaying) {
      const intervalDuration = 1000 / SIMULATED_FPS;
      intervalRef.current = window.setInterval(advanceFrames, intervalDuration);
    }
    return stopInterval;
  }, [isPlaying, advanceFrames]);

  // Backend integration initialization
  useEffect(() => {
    if (isConnected && !taskManager) {
      const initializeBackendIntegration = async () => {
        try {
          const manager = new TaskManagementService();
          setTaskManager(manager);
          
          // Get environment from URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const environment = urlParams.get('environment') || 'factory';
          
          // Start the task lifecycle with backend
          console.log('🚀 Starting backend task for environment:', environment);
          await manager.startTaskWithLifecycle({
            environment_id: environment as 'campus' | 'factory',
            autoConnect: true,
            autoSubscribe: true,
          });
          
          // Set up tracking data listener
          manager.addEventListener('tracking-update', (trackingData) => {
            console.log('📊 Received tracking update:', trackingData);
            setLatestTrackingData(trackingData);
            setCurrentFrameData(convertTrackingDataToFrameData(trackingData));
          });
          
          setIsTaskActive(true);
          console.log('✅ Backend integration initialized successfully');
          
        } catch (error) {
          console.error('❌ Backend integration failed:', error);
          reset(); // Use error recovery
        }
      };
      
      initializeBackendIntegration();
    }
  }, [isConnected, taskManager, reset]);

  // Convert WebSocket tracking data to legacy FrameData format
  const convertTrackingDataToFrameData = (trackingData: WebSocketTrackingMessagePayload): FrameData => {
    const cameras: { [jsonCameraId: string]: Track[] } = {};
    
    Object.entries(trackingData.cameras).forEach(([cameraId, cameraFrame]) => {
      cameras[cameraId] = cameraFrame.tracks.map((track) => ({
        trackId: track.track_id,
        x1: track.bbox_xyxy[0],
        y1: track.bbox_xyxy[1], 
        x2: track.bbox_xyxy[2],
        y2: track.bbox_xyxy[3],
        globalId: parseInt(track.global_id) || track.track_id,
        mapCoords: track.map_coords || [0, 0],
      }));
    });
    
    return {
      frameNumber: trackingData.global_frame_index,
      timestamp: trackingData.timestamp_processed_utc,
      cameras,
    };
  };

  // Enhanced data fetching with error recovery (NOW USES BACKEND DATA)
  const fetchFrameData = useCallback(
    async (frameIndices: FrameIndicesState) => {
      // Backend integration: Data comes from WebSocket, not static files
      if (latestTrackingData) {
        // We have real-time data from WebSocket - use it directly
        console.log('📡 Using real-time backend data:', latestTrackingData.global_frame_index);
        setIsInitialLoading(false);
        return currentFrameData;
      } else if (isTaskActive && taskManager) {
        // Task is active but no data yet - wait for WebSocket data
        console.log('⏳ Waiting for backend tracking data...');
        setCurrentFrameData(null);
        return null;
      } else {
        // No backend connection - show connection error
        console.warn('🔌 Backend not connected - cannot load frame data');
        setCurrentFrameData(null);
        setIsInitialLoading(false);
        return null;
      }
    },
    [latestTrackingData, currentFrameData, isTaskActive, taskManager]
  );

  useEffect(() => {
    fetchFrameData(frameIndices);
  }, [frameIndices, fetchFrameData]);

  // --- Effect to measure Overall Map Container Size ---
  useEffect(() => {
    const mapElement = overallMapContainerRef.current;
    if (!mapElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setOverallMapDimensions({ width, height });
      }
    });
    resizeObserver.observe(mapElement);
    setOverallMapDimensions({ width: mapElement.offsetWidth, height: mapElement.offsetHeight });
    return () => resizeObserver.disconnect();
  }, []);

  // --- MODIFIED: Effect to Calculate Scaled Map Points PER CAMERA for their quadrant ---
  useEffect(() => {
    if (
      !currentFrameData ||
      !overallMapDimensions.width ||
      !overallMapDimensions.height ||
      MAP_SOURCE_WIDTH <= 0 ||
      MAP_SOURCE_HEIGHT <= 0
    ) {
      setPerCameraMapPoints({});
      return;
    }

    const newPerCameraPoints: { [jsonCameraId: string]: SingleCameraMapPoint[] } = {};

    // Calculate dimensions of each quadrant
    const quadrantWidth = overallMapDimensions.width / 2;
    const quadrantHeight = overallMapDimensions.height / 2;

    // Scaling factors are now based on quadrant size
    const scaleX = quadrantWidth / MAP_SOURCE_WIDTH;
    const scaleY = quadrantHeight / MAP_SOURCE_HEIGHT;

    Object.entries(currentFrameData.cameras).forEach(([jsonCameraId, cameraData]) => {
      newPerCameraPoints[jsonCameraId] = []; // Initialize array for this camera
      if (cameraData && cameraData.tracks) {
        cameraData.tracks.forEach((track) => {
          if (track.map_coords && typeof track.global_id === 'number') {
            const [mapX, mapY] = track.map_coords;

            // Scale coordinates to fit within a quadrant
            const displayX = mapX * scaleX;
            const displayY = mapY * scaleY;

            newPerCameraPoints[jsonCameraId].push({
              x: displayX,
              y: displayY,
              globalId: track.global_id,
            });
          }
        });
      }
    });

    setPerCameraMapPoints(newPerCameraPoints);
  }, [currentFrameData, overallMapDimensions]);

  const handlePlayAll = () => setIsPlaying(true);
  const handleStopAll = () => setIsPlaying(false);

  return (
    <ErrorBoundary>
      <div
        className={`flex flex-col h-screen bg-gray-900 text-gray-200 ${responsiveClasses.container}`}
      >
        {/* Header Section - Responsive */}
        <header className={`mb-4 flex-shrink-0 ${responsiveClasses.headerSection}`}>
          <Link
            to="/"
            className={`flex items-center hover:text-orange-400 ${
              screenSize === 'mobile' ? 'text-base' : 'text-lg'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Back
          </Link>

          <h1 className={`font-semibold ${screenSize === 'mobile' ? 'text-xl' : 'text-2xl'}`}>
            {zoneName}
          </h1>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <ConnectionStatus
              status={isOnline ? 'connected' : 'disconnected'}
              compact={screenSize === 'mobile'}
            />
          </div>
        </header>

        {/* Info Bar & Global Controls (Keep as before) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
            <div>
              Num cameras: <span className="font-semibold">{totalCameras}</span>
            </div>
            <div className="flex space-x-4">
              <span className="text-green-400 flex items-center">
                <span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span> Active:{' '}
                {activeCameras}
              </span>
              <span className="text-red-400 flex items-center">
                <span className="h-2 w-2 bg-red-400 rounded-full mr-1"></span> Inactive:{' '}
                {totalCameras - activeCameras}
              </span>
            </div>
            <div>
              Map: <span className="font-semibold">floor 1</span>
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <button
              onClick={handlePlayAll}
              disabled={isPlaying}
              className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${isPlaying ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              Play All
            </button>
            <button
              onClick={handleStopAll}
              disabled={!isPlaying}
              className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${!isPlaying ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Stop All
            </button>
          </div>
        </div>

        {/* Tab Bar (Keep as before) */}
        <div className="mb-4 border-b border-gray-700 flex-shrink-0">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            >
              View all
            </button>
            {appCameraIds.map((id, index) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === id ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
              >
                {cameraNames[index]}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-grow min-h-0 gap-4">
          {/* Left Side (Image Player Area) - Enhanced with loading states */}
          <div
            className={`bg-gray-800 rounded-md p-1 flex items-center justify-center ${responsiveClasses.cameraSection}`}
          >
            <LoadingOverlay
              isLoading={isInitialLoading && !error}
              message="Loading camera feeds..."
            >
              {error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Connection Error</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      {error.message || 'Failed to load camera data'}
                    </p>
                    <button
                      onClick={() => {
                        reset();
                        fetchFrameData(frameIndices);
                      }}
                      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : isInitialLoading ? (
                <CameraSkeleton
                  count={activeTab === 'all' ? 4 : 1}
                  layout={activeTab === 'all' ? '2x2' : 'focus'}
                />
              ) : (
                <>
                  {activeTab === 'all' && (
                    <div
                      className={`gap-1 w-full h-full ${
                        screenSize === 'mobile'
                          ? 'grid grid-cols-1'
                          : 'grid grid-cols-2 grid-rows-2'
                      }`}
                    >
                      {appCameraIds.map((appId) => {
                        const config = cameraFrameConfig[appId];
                        const jsonCameraId = appCameraIdToJsonId[appId];
                        const tracks = jsonCameraId
                          ? currentFrameData?.cameras?.[jsonCameraId]?.tracks
                          : null;
                        // Get base64 image from WebSocket data if available
                        const base64Image = latestTrackingData?.cameras?.[jsonCameraId]?.frame_image_base64;
                        
                        return (
                          <ErrorBoundary key={appId}>
                            <ImageSequencePlayer
                              cameraId={appId}
                              basePath={config?.basePath || ''}
                              startFrame={config?.startFrame ?? -1}
                              frameCount={config?.frameCount || 0}
                              currentFrameIndex={frameIndices[appId] ?? 0}
                              imageExtension={config?.extension}
                              tracks={tracks || null}
                              base64Image={base64Image}
                              className="min-h-0"
                            />
                          </ErrorBoundary>
                        );
                      })}
                    </div>
                  )}
                  {appCameraIds.includes(activeTab) &&
                    (() => {
                      const config = cameraFrameConfig[activeTab];
                      const jsonCameraId = appCameraIdToJsonId[activeTab];
                      const tracks = jsonCameraId
                        ? currentFrameData?.cameras?.[jsonCameraId]?.tracks
                        : null;
                      // Get base64 image from WebSocket data if available
                      const base64Image = latestTrackingData?.cameras?.[jsonCameraId]?.frame_image_base64;
                      
                      return (
                        <ErrorBoundary key={activeTab}>
                          <ImageSequencePlayer
                            cameraId={activeTab}
                            basePath={config?.basePath || ''}
                            startFrame={config?.startFrame ?? -1}
                            frameCount={config?.frameCount || 0}
                            currentFrameIndex={frameIndices[activeTab] ?? 0}
                            imageExtension={config?.extension}
                            tracks={tracks || null}
                            base64Image={base64Image}
                            className="w-full h-full"
                          />
                        </ErrorBoundary>
                      );
                    })()}
                </>
              )}
            </LoadingOverlay>
          </div>

          {/* Right Side Panels - Responsive */}
          <div className={`flex flex-col gap-4 ${responsiveClasses.sidebarSection}`}>
            {/* === MODIFIED: Map Panel - Now a 2x2 Grid === */}
            <div
              ref={overallMapContainerRef} // Ref for the main grid container
              className="bg-gray-700 rounded-md h-1/2 grid grid-cols-2 grid-rows-2 gap-px overflow-hidden" // Grid layout with small gap for borders
            >
              {appCameraIds.map((appId, index) => {
                const jsonCameraId = appCameraIdToJsonId[appId];
                const pointsForThisQuadrant = perCameraMapPoints[jsonCameraId] || [];
                const quadrantColor = cameraColorMap[jsonCameraId] || defaultDotColor;
                const camName = cameraNames[index];

                return (
                  <div
                    key={jsonCameraId}
                    className="relative w-full h-full bg-gray-800 p-1" // Quadrant styling, p-1 for slight inner padding
                    title={`Map - ${camName}`}
                  >
                    {/* Optional: Display camera name in quadrant */}
                    <div className="absolute top-1 left-1 text-xs text-gray-400 opacity-75 pointer-events-none">
                      {camName}
                    </div>

                    {pointsForThisQuadrant.map((point) => (
                      <div
                        key={point.globalId}
                        title={`ID: ${point.globalId} (from ${camName})`}
                        className={`absolute w-2 h-2 ${quadrantColor} rounded-full shadow-md`}
                        style={{
                          left: `${point.x}px`,
                          top: `${point.y}px`,
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                        }}
                      />
                    ))}
                  </div>
                );
              })}
              {/* Show placeholder if no dimensions yet */}
              {overallMapDimensions.width === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 col-span-2 row-span-2">
                  Map Visualization Area
                </div>
              )}
            </div>
            {/* === END MODIFIED === */}

            {/* Lower Panels (Keep as before) */}
            <div className="flex flex-grow gap-4 h-1/2">
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col">
                <h3 className="text-sm font-semibold mb-3 text-gray-400">Detections per camera</h3>
                <div className="space-y-2 text-xs flex-grow overflow-y-auto">
                  {cameraNames.map((name, idx) => (
                    <div key={name} className="flex items-center justify-between">
                      <span>{name}</span>
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-700 rounded-full mr-2">
                          <div
                            className="h-2 bg-green-500 rounded-full"
                            style={{
                              width: `${(mockDetections[idx] / Math.max(1, ...mockDetections)) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="font-mono">{mockDetections[idx]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-400">Last caught</h3>
                    <span className="text-green-400 text-xs font-semibold flex items-center">
                      <span className="h-1.5 w-1.5 bg-green-400 rounded-full mr-1"></span>Active
                    </span>
                  </div>
                  <p className="text-xs">
                    Camera <span className="font-bold text-lg">3</span>
                  </p>
                  <p className="text-xs mt-3">
                    Person Id: <span className="font-bold">1</span>
                  </p>
                  <p className="text-xs mt-1">Tracking start: 25 min. ago</p>
                  <p className="text-xs mt-1">Last known: Room1</p>
                </div>
                <button className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold mt-3">
                  Cancel Tracking
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default GroupViewPage;
