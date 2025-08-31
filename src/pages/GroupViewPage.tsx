// src/pages/GroupViewPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import ImageSequencePlayer from "../components/ImageSequencePlayer";

// --- Type Definitions ---
interface Track {
  track_id: number;
  global_id: number;
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords?: [number, number];
}

interface CameraData {
  frame_image_base64?: string;  // Updated to match backend API
  tracks: Track[];
  frame_width?: number;
  frame_height?: number;
  timestamp?: string;
}

interface RawFrameData {
  type: string;
  task_id: string;
  global_frame_index: number;
  timestamp_processed_utc: string;
  mode: string;
  cameras: {
    [jsonCameraId: string]: CameraData;
  };
}

interface SystemHealth {
  status: string;
  detector_model_loaded?: boolean;
  redis_connected?: boolean;
  processing_tasks_active?: number;
}

interface RawTask {
  task_id: string;
  status: string;
  environment_id: string;
  created_at: string;
}
// --- End Type Definitions ---

// --- Configuration ---
const BACKEND_BASE_URL = "http://localhost:3847";  // Updated to match Docker backend port
const BACKEND_WS_URL = "ws://localhost:3847";
const totalCameras = 4;
const activeCameras = 4;
const appCameraIds = ["camera1", "camera2", "camera3", "camera4"];
const cameraNames = ["Camera 1", "Camera 2", "Camera 3", "Camera 4"];

// Camera mapping between app IDs and backend camera IDs
const appCameraIdToJsonId: { [appId: string]: string } = {
    'camera1': 'c09',
    'camera2': 'c12',
    'camera3': 'c13', 
    'camera4': 'c16',
};

const jsonIdToAppCameraId: { [jsonId: string]: string } = Object.entries(
  appCameraIdToJsonId
).reduce((acc, [appId, jsonId]) => {
  acc[jsonId] = appId;
  return acc;
}, {} as { [jsonId: string]: string });

type TabType = "all" | string;
const MAP_SOURCE_WIDTH = 1920; // Source width for map_coords (per camera)
const MAP_SOURCE_HEIGHT = 1080; // Source height for map_coords (per camera)

// --- MODIFIED: Type for storing calculated map points (per camera) ---
interface SingleCameraMapPoint {
    x: number;         // Scaled x-coordinate for display within a quadrant
    y: number;         // Scaled y-coordinate for display within a quadrant
    globalId: number;
}

// --- NEW: Color mapping for cameras (using JSON IDs) ---
const cameraColorMap: { [jsonCameraId: string]: string } = {
    'c09': 'bg-cyan-400',
    'c12': 'bg-red-500',
    'c13': 'bg-yellow-400',
    'c16': 'bg-purple-500',
};
const defaultDotColor = 'bg-gray-500';

// --- GroupViewPage Component ---
const GroupViewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrameData, setCurrentFrameData] = useState<RawFrameData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  
  // Camera frame data stored as base64 strings
  const [cameraFrames, setCameraFrames] = useState<{ [jsonCameraId: string]: string }>({});
  
  // Add debugging states for image rendering
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [jsonCameraId: string]: 'loading' | 'loaded' | 'error' | 'none' }>({});
  const [imageDebugInfo, setImageDebugInfo] = useState<{ [jsonCameraId: string]: any }>({});

  const overallMapContainerRef = useRef<HTMLDivElement>(null);
  const [overallMapDimensions, setOverallMapDimensions] = useState({ width: 0, height: 0 });

  // State to store points per camera
  const [perCameraMapPoints, setPerCameraMapPoints] = useState<{ [jsonCameraId: string]: SingleCameraMapPoint[] }>({});

  // Get environment from URL parameters
  const getEnvironmentFromUrl = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const environment = urlParams.get('environment') || 'campus'; // Default to campus
    return environment;
  }, []);

  // Get zone name based on environment
  const getZoneName = useCallback(() => {
    const env = getEnvironmentFromUrl();
    return env === 'factory' ? 'Factory' : 'Campus';
  }, [getEnvironmentFromUrl]);

  // Test base64 data validity
  const testBase64Validity = useCallback((base64Data: string, jsonCameraId: string) => {
    try {
      // Test if base64 can be decoded
      const binaryString = atob(base64Data);
      
      // Check for JPEG magic bytes (FF D8 FF)
      const firstBytes = Array.from(binaryString.slice(0, 10)).map(c => c.charCodeAt(0));
      const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF;
      
      console.log(`🔍 Base64 validation for ${jsonCameraId}:`, {
        base64Length: base64Data.length,
        binaryLength: binaryString.length,
        firstBytes: firstBytes.map(b => b.toString(16).padStart(2, '0')).join(' '),
        isValidJPEG: isJPEG,
        expectedJPEGHeader: 'ff d8 ff'
      });
      
      return { isValid: true, isJPEG, binaryLength: binaryString.length };
    } catch (error) {
      console.error(`❌ Base64 validation failed for ${jsonCameraId}:`, error);
      return { isValid: false, isJPEG: false, binaryLength: 0, error };
    }
  }, []);


  // Check system health
  const checkSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/health`);
      const health = await response.json();
      setSystemHealth(health);
      return health.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      setError('Backend connection failed');
      return false;
    }
  }, []);

  // Check for existing streaming tasks or create new one
  const checkExistingStreamingTask = useCallback(async () => {
    try {
      const environment = getEnvironmentFromUrl();
      console.log('Checking for existing streaming task for environment:', environment);
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/raw-processing-tasks/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment_id: environment })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Response not OK:', response.status, errorText);
        
        if (response.status === 400 && errorText.includes('already has an active')) {
          console.log('Found existing streaming task - since error message does not contain task ID, we need to handle this differently');
          
          // Since we can't extract task ID from error, we need to detect existing streaming
          // Let's try a different approach - check if there's a known task ID pattern
          // For now, show user they need to stop existing stream first
          setError('An active streaming session already exists for this environment. Please refresh the page or wait for it to complete.');
          return false;
        } else {
          throw new Error(`Failed to start streaming: ${response.status} - ${errorText}`);
        }
      } else {
        // New task created successfully
        const task: RawTask = await response.json();
        console.log('New task created:', task.task_id);
        setTaskId(task.task_id);
        
        // Monitor until STREAMING
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max
        while (attempts < maxAttempts) {
          const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/raw-processing-tasks/${task.task_id}/status`);
          const status = await statusResponse.json();
          console.log('Task status:', status.status, 'attempts:', attempts);
          
          if (status.status === 'STREAMING') {
            console.log('Task is streaming, connecting WebSocket');
            connectWebSocket(task.task_id);
            return true;
          }
          if (status.status === 'FAILED') {
            throw new Error(status.details || 'Task failed');
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for streaming to start');
        }
        return true;
      }
    } catch (error) {
      console.error('Error checking/starting streaming task:', error);
      setError(`Failed to start streaming: ${(error as Error).message}`);
      return false;
    }
  }, [getEnvironmentFromUrl]);

  // Start raw video streaming task
  const startRawStreaming = useCallback(async () => {
    try {
      setError(null);
      
      // If already streaming, don't start a new task
      if (isStreaming) {
        console.log('Already streaming, skipping new task creation');
        return;
      }
      
      // If taskId exists but not streaming, try to connect to existing task
      if (taskId) {
        console.log('Task ID exists, trying to connect to existing task:', taskId);
        connectWebSocket(taskId);
        return;
      }
      
      // Otherwise, check for existing tasks or create new one
      await checkExistingStreamingTask();
      
    } catch (error) {
      console.error('Error starting raw streaming:', error);
      setError(`Failed to start streaming: ${(error as Error).message}`);
    }
  }, [isStreaming, taskId, checkExistingStreamingTask]);

  // Connect to WebSocket for raw video frames
  const connectWebSocket = useCallback((taskId: string) => {
    console.log('🔌 Attempting to connect WebSocket for task:', taskId);
    
    if (wsRef.current) {
      console.log('🔌 Closing existing WebSocket connection');
      wsRef.current.close();
    }

    const wsUrl = `${BACKEND_WS_URL}/ws/raw-tracking/${taskId}`;
    console.log('🔌 Connecting to WebSocket URL:', wsUrl);
    console.log('🔌 Using task ID:', taskId);
    console.log('🔌 Backend WS URL:', BACKEND_WS_URL);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      console.log('📤 Sending subscribe message');
      ws.send(JSON.stringify({ type: 'subscribe_raw_frames' }));
      setIsStreaming(true);
      setError(null);
      
      // Reset states for clean start
      setImageLoadingStates({});
      setImageDebugInfo({});
      setCameraFrames({});
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message.type, message.mode);
        
        if (message.type === 'tracking_update' && message.mode === 'raw_streaming') {
          setCurrentFrameData(message);
          
          // Update camera frames with base64 data
          const newFrames: { [jsonCameraId: string]: string } = {};
          const newDebugInfo: { [jsonCameraId: string]: any } = {};
          
          Object.entries(message.cameras).forEach(([jsonCameraId, cameraData]: [string, any]) => {
            if (cameraData.frame_image_base64) {
              const rawData = cameraData.frame_image_base64;
              
              // Check if data already has data URI prefix
              let processedData: string;
              let base64Part: string;
              
              if (rawData.startsWith('data:image/')) {
                // Data already has data URI prefix
                processedData = rawData;
                base64Part = rawData.split(',')[1] || '';
                console.log(`🖼️ Data URI already formatted for ${jsonCameraId}`);
              } else {
                // Add data URI prefix
                processedData = `data:image/jpeg;base64,${rawData}`;
                base64Part = rawData;
                console.log(`🖼️ Added data URI prefix for ${jsonCameraId}`);
              }
              
              // Validate base64 data
              const validationResult = testBase64Validity(base64Part, jsonCameraId);
              
              newFrames[jsonCameraId] = processedData;
              
              // Store debug info
              newDebugInfo[jsonCameraId] = {
                hasFrameData: !!rawData,
                rawDataLength: rawData?.length,
                processedDataLength: processedData?.length,
                rawDataPrefix: rawData?.substring(0, 30) + '...',
                processedDataPrefix: processedData?.substring(0, 50) + '...',
                hasDataUriPrefix: rawData.startsWith('data:image/'),
                validationResult,
                timestamp: new Date().toISOString()
              };
              
              console.log(`🖼️ Frame data for ${jsonCameraId}:`, newDebugInfo[jsonCameraId]);
              
              // Set loading state
              setImageLoadingStates(prev => ({
                ...prev,
                [jsonCameraId]: 'loading'
              }));
            }
          });
          
          setCameraFrames(newFrames);
          setImageDebugInfo(prev => ({ ...prev, ...newDebugInfo }));
          console.log('🖼️ Updated frames for cameras:', Object.keys(newFrames));
          console.log('🖼️ Frame data summary:', Object.keys(newFrames).map(id => `${id}: ${newFrames[id].length} chars`));
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.error('❌ WebSocket error details:', {
        taskId,
        wsUrl,
        readyState: ws.readyState,
        error
      });
      setError(`WebSocket connection error for task ${taskId}: ${error}`);
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected. Details:', {
        taskId,
        wsUrl,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setIsStreaming(false);
    };
  }, []);

  // Initialize streaming on component mount
  useEffect(() => {
    const initializeStreaming = async () => {
      console.log('Initializing streaming, current taskId:', taskId, 'isStreaming:', isStreaming);
      
      const isHealthy = await checkSystemHealth();
      if (!isHealthy) {
        console.log('System not healthy, skipping initialization');
        return;
      }
      
      // If we already have a taskId but not streaming, try to connect to existing WebSocket
      if (taskId && !isStreaming) {
        console.log('Found existing taskId, trying to connect to WebSocket:', taskId);
        // Check if task is still active
        try {
          const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/raw-processing-tasks/${taskId}/status`);
          const status = await statusResponse.json();
          console.log('Existing task status:', status);
          
          if (status.status === 'STREAMING') {
            console.log('Existing task is streaming, connecting WebSocket');
            connectWebSocket(taskId);
            return;
          } else {
            console.log('Existing task not streaming, clearing taskId and trying new task');
            setTaskId(null);
          }
        } catch (error) {
          console.error('Error checking existing task:', error);
          setTaskId(null);
        }
      }
      
      // If no taskId or existing task not active, try to create/find new task
      if (!taskId) {
        console.log('No taskId, checking for existing streaming task');
        await checkExistingStreamingTask();
      }
    };
    
    initializeStreaming();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [checkSystemHealth, checkExistingStreamingTask]);


  // --- Effect to measure Overall Map Container Size ---
  useEffect(() => {
    const mapElement = overallMapContainerRef.current;
    if (!mapElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setOverallMapDimensions({ width, height });
      }
    });
    resizeObserver.observe(mapElement);
    setOverallMapDimensions({ width: mapElement.offsetWidth, height: mapElement.offsetHeight });
    return () => resizeObserver.disconnect();
  }, []);

  // Effect to Calculate Scaled Map Points PER CAMERA for their quadrant
  useEffect(() => {
    if (!currentFrameData || !overallMapDimensions.width || !overallMapDimensions.height || MAP_SOURCE_WIDTH <= 0 || MAP_SOURCE_HEIGHT <= 0) {
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
        cameraData.tracks.forEach(track => {
          if (track.map_coords && typeof track.global_id === 'number') {
            const [mapX, mapY] = track.map_coords;

            // Scale coordinates to fit within a quadrant
            const displayX = mapX * scaleX;
            const displayY = mapY * scaleY;

            newPerCameraPoints[jsonCameraId].push({
                x: displayX,
                y: displayY,
                globalId: track.global_id
            });
          }
        });
      }
    });

    setPerCameraMapPoints(newPerCameraPoints);

  }, [currentFrameData, overallMapDimensions]);

  // Control handlers for streaming
  const handleStartStreaming = () => {
    if (!isStreaming && systemHealth?.status === 'healthy') {
      startRawStreaming();
    }
  };

  const handleStopStreaming = async () => {
    try {
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Clear local state immediately for responsive UI
      setIsStreaming(false);
      setTaskId(null);
      setCameraFrames({});
      setCurrentFrameData(null);
      setImageLoadingStates({});
      setImageDebugInfo({});
      
      // Call backend to cleanup all tasks for this environment
      const environment = getEnvironmentFromUrl();
      console.log('🧹 Cleaning up all tasks for environment:', environment);
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/raw-processing-tasks/environment/${environment}/cleanup`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Environment cleanup successful:', result.data?.message);
      } else {
        console.warn('⚠️ Environment cleanup failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      // Don't re-throw - we want the UI to still update even if cleanup fails
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 p-4 sm:p-6">
      {/* Header Section (Keep as before) */}
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <Link to="/" className="flex items-center text-lg hover:text-orange-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            Back
        </Link>
        <h1 className="text-2xl font-semibold">{getZoneName()}</h1>
        <div></div>
      </header>

      {/* Info Bar & Global Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
            <div>Num cameras: <span className="font-semibold">{totalCameras}</span></div>
            <div className="flex space-x-4">
                <span className={`flex items-center ${isStreaming ? 'text-green-400' : 'text-red-400'}`}>
                  <span className={`h-2 w-2 ${isStreaming ? 'bg-green-400' : 'bg-red-400'} rounded-full mr-1`}></span> 
                  {isStreaming ? 'Streaming' : 'Disconnected'}
                </span>
                <span className="text-blue-400 flex items-center">
                  <span className="h-2 w-2 bg-blue-400 rounded-full mr-1"></span> 
                  Backend: {systemHealth?.status || 'Unknown'}
                </span>
            </div>
            <div>Mode: <span className="font-semibold">Raw Video</span></div>
            {taskId && <div>Task: <span className="font-semibold text-xs">{taskId.slice(0, 8)}...</span></div>}
        </div>
        <div className="flex space-x-2 flex-shrink-0">
            <button 
              onClick={handleStartStreaming} 
              disabled={isStreaming || systemHealth?.status !== 'healthy' || (taskId && !isStreaming)} 
              className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${
                isStreaming || systemHealth?.status !== 'healthy' || (taskId && !isStreaming)
                  ? "bg-gray-600 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {taskId && !isStreaming ? 'Connecting...' : 'Start Stream'}
            </button>
            <button 
              onClick={handleStopStreaming} 
              disabled={!isStreaming && !error} 
              className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${
                !isStreaming && !error
                  ? "bg-gray-600 cursor-not-allowed" 
                  : error && !isStreaming
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {error && !isStreaming ? 'Clean Up' : 'Stop Stream'}
            </button>
            <button 
              onClick={() => {
                console.log('🔍 DEBUG STATE:', {
                  isStreaming,
                  taskId,
                  cameraFramesKeys: Object.keys(cameraFrames),
                  frameLengths: Object.keys(cameraFrames).map(id => ({ [id]: cameraFrames[id]?.length })),
                  imageLoadingStates,
                  currentFrameData: !!currentFrameData
                });
              }}
              className="px-2 py-1.5 rounded text-white text-xs bg-blue-600 hover:bg-blue-700"
            >
              Debug
            </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-800 border border-red-600 text-red-200 p-3 rounded-md flex-shrink-0">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Tab Bar (Keep as before) */}
      <div className="mb-4 border-b border-gray-700 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab("all")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${ activeTab === "all" ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500" }`}>View all</button>
          {appCameraIds.map((id, index) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${ activeTab === id ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500" }`}>
                {cameraNames[index]}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-grow min-h-0 gap-4">
        {/* Left Side (Video Player Area) */}
        <div className="w-2/3 bg-gray-800 rounded-md p-1 flex items-center justify-center">
          {activeTab === "all" && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
              {appCameraIds.map((appId) => {
                const jsonCameraId = appCameraIdToJsonId[appId];
                const frameData = cameraFrames[jsonCameraId];
                const tracks = currentFrameData?.cameras?.[jsonCameraId]?.tracks || [];
                
                return (
                  <div key={appId} className="relative bg-black rounded overflow-hidden min-h-0 flex items-center justify-center">
                    {frameData ? (
                      <div className="relative w-full h-full">
                        <img 
                          key={`${jsonCameraId}-${frameData.length}`} // Force re-render on data change
                          src={frameData} 
                          alt={`Camera ${appId}`}
                          className="w-full h-full object-contain"
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement;
                            console.log(`✅ Image loaded successfully for ${appId}`, {
                              jsonCameraId,
                              frameDataLength: frameData.length,
                              frameDataPrefix: frameData.substring(0, 50) + '...',
                              naturalWidth: img.naturalWidth,
                              naturalHeight: img.naturalHeight,
                              displayWidth: img.width,
                              displayHeight: img.height,
                              debugInfo: imageDebugInfo[jsonCameraId]
                            });
                            
                            // Update loading state
                            setImageLoadingStates(prev => ({
                              ...prev,
                              [jsonCameraId]: 'loaded'
                            }));
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            console.error(`❌ Error loading frame for ${appId}:`, {
                              jsonCameraId,
                              frameDataLength: frameData.length,
                              frameDataPrefix: frameData.substring(0, 50) + '...',
                              src: img.src.substring(0, 100) + '...',
                              error: e,
                              debugInfo: imageDebugInfo[jsonCameraId]
                            });
                            
                            // Update loading state
                            setImageLoadingStates(prev => ({
                              ...prev,
                              [jsonCameraId]: 'error'
                            }));
                            
                            // Try to decode the base64 to check if it's valid
                            try {
                              if (frameData.startsWith('data:image/jpeg;base64,')) {
                                const base64Data = frameData.split(',')[1];
                                const binaryString = atob(base64Data);
                                console.log(`🔍 Base64 decode test for ${appId}:`, {
                                  base64Length: base64Data.length,
                                  binaryLength: binaryString.length,
                                  firstBytes: Array.from(binaryString.slice(0, 10)).map(c => c.charCodeAt(0).toString(16)).join(' ')
                                });
                              }
                            } catch (decodeError) {
                              console.error(`❌ Base64 decode error for ${appId}:`, decodeError);
                            }
                          }}
                        />
                        
                        {/* Loading state indicator */}
                        {imageLoadingStates[jsonCameraId] === 'loading' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="text-white text-sm">Loading frame...</div>
                          </div>
                        )}
                        
                        {/* Error state indicator */}
                        {imageLoadingStates[jsonCameraId] === 'error' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
                            <div className="text-red-200 text-sm text-center">
                              <div>Frame load error</div>
                              <div className="text-xs mt-1">Check console for details</div>
                            </div>
                          </div>
                        )}
                        {/* Render bounding boxes if available */}
                        {tracks.map((track) => {
                          const [x1, y1, x2, y2] = track.bbox_xyxy;
                          const width = x2 - x1;
                          const height = y2 - y1;
                          
                          return (
                            <div
                              key={track.track_id}
                              className="absolute border-2 border-lime-400 pointer-events-none"
                              style={{
                                left: `${(x1 / MAP_SOURCE_WIDTH) * 100}%`,
                                top: `${(y1 / MAP_SOURCE_HEIGHT) * 100}%`,
                                width: `${(width / MAP_SOURCE_WIDTH) * 100}%`,
                                height: `${(height / MAP_SOURCE_HEIGHT) * 100}%`,
                              }}
                            >
                              <div className="absolute -top-6 left-0 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                                ID: {track.global_id}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center p-4">
                        {isStreaming ? 'Waiting for frames...' : 'No video stream'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {appCameraIds.includes(activeTab) && (() => {
              const jsonCameraId = appCameraIdToJsonId[activeTab];
              const frameData = cameraFrames[jsonCameraId];
              const tracks = currentFrameData?.cameras?.[jsonCameraId]?.tracks || [];
              
              return (
                <div key={activeTab} className="relative bg-black rounded overflow-hidden w-full h-full flex items-center justify-center">
                  {frameData ? (
                    <div className="relative w-full h-full">
                      <img 
                        key={`${jsonCameraId}-single-${frameData.length}`} // Force re-render on data change
                        src={frameData} 
                        alt={`Camera ${activeTab}`}
                        className="w-full h-full object-contain"
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log(`✅ Single view image loaded for ${activeTab}`, {
                            jsonCameraId,
                            frameDataLength: frameData.length,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            displayWidth: img.width,
                            displayHeight: img.height
                          });
                          
                          setImageLoadingStates(prev => ({
                            ...prev,
                            [jsonCameraId]: 'loaded'
                          }));
                        }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.error(`❌ Single view error loading frame for ${activeTab}:`, {
                            jsonCameraId,
                            frameDataLength: frameData.length,
                            src: img.src.substring(0, 100) + '...',
                            error: e
                          });
                          
                          setImageLoadingStates(prev => ({
                            ...prev,
                            [jsonCameraId]: 'error'
                          }));
                        }}
                      />
                      
                      {/* Loading/Error indicators for single view */}
                      {imageLoadingStates[jsonCameraId] === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <div className="text-white">Loading frame...</div>
                        </div>
                      )}
                      
                      {imageLoadingStates[jsonCameraId] === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
                          <div className="text-red-200 text-center">
                            <div>Frame load error</div>
                            <div className="text-sm mt-1">Check console for details</div>
                          </div>
                        </div>
                      )}
                      {/* Render bounding boxes if available */}
                      {tracks.map((track) => {
                        const [x1, y1, x2, y2] = track.bbox_xyxy;
                        const width = x2 - x1;
                        const height = y2 - y1;
                        
                        return (
                          <div
                            key={track.track_id}
                            className="absolute border-2 border-lime-400 pointer-events-none"
                            style={{
                              left: `${(x1 / MAP_SOURCE_WIDTH) * 100}%`,
                              top: `${(y1 / MAP_SOURCE_HEIGHT) * 100}%`,
                              width: `${(width / MAP_SOURCE_WIDTH) * 100}%`,
                              height: `${(height / MAP_SOURCE_HEIGHT) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                              ID: {track.global_id}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center p-4">
                      {isStreaming ? 'Waiting for frames...' : 'No video stream'}
                    </div>
                  )}
                </div>
              );
            })()}
        </div>

        {/* Right Side Panels */}
        <div className="w-1/3 flex flex-col gap-4">
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
                            <div className="absolute top-1 left-1 text-xs text-gray-400 opacity-75 pointer-events-none">{camName}</div>

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

            {/* Debug Panel - Show when frames are present */}
            {(Object.keys(cameraFrames).length > 0 || isStreaming) && (
              <div className="bg-gray-800 rounded-md p-3 mb-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-400">Debug Info</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {appCameraIds.map(appId => {
                    const jsonCameraId = appCameraIdToJsonId[appId];
                    const frameData = cameraFrames[jsonCameraId];
                    const loadingState = imageLoadingStates[jsonCameraId];
                    const debugInfo = imageDebugInfo[jsonCameraId];
                    
                    return (
                      <div key={appId} className="bg-gray-700 p-2 rounded">
                        <div className="font-semibold text-gray-300">{appId} ({jsonCameraId})</div>
                        <div>State: <span className={`font-mono ${
                          loadingState === 'loaded' ? 'text-green-400' : 
                          loadingState === 'error' ? 'text-red-400' : 
                          loadingState === 'loading' ? 'text-yellow-400' : 'text-gray-400'
                        }`}>{loadingState || 'none'}</span></div>
                        <div>Frame: <span className="font-mono">{frameData ? `${frameData.length} chars` : 'none'}</span></div>
                        {debugInfo && (
                          <>
                            <div>Prefix: <span className="font-mono text-blue-400">{debugInfo.hasDataUriPrefix ? 'yes' : 'no'}</span></div>
                            <div>Valid: <span className={`font-mono ${debugInfo.validationResult?.isValid ? 'text-green-400' : 'text-red-400'}`}>
                              {debugInfo.validationResult?.isValid ? 'yes' : 'no'}
                            </span></div>
                            <div>JPEG: <span className={`font-mono ${debugInfo.validationResult?.isJPEG ? 'text-green-400' : 'text-red-400'}`}>
                              {debugInfo.validationResult?.isJPEG ? 'yes' : 'no'}
                            </span></div>
                            <div>Updated: <span className="font-mono">{new Date(debugInfo.timestamp).toLocaleTimeString().split(' ')[0]}</span></div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lower Panels */}
            <div className="flex flex-grow gap-4 h-1/2">
                <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col">
                    <h3 className="text-sm font-semibold mb-3 text-gray-400">Tracks per camera</h3>
                    <div className="space-y-2 text-xs flex-grow overflow-y-auto">
                        {cameraNames.map((name, idx) => {
                            const appId = appCameraIds[idx];
                            const jsonCameraId = appCameraIdToJsonId[appId];
                            const trackCount = currentFrameData?.cameras?.[jsonCameraId]?.tracks?.length || 0;
                            const maxTracks = Math.max(1, ...cameraNames.map((_, i) => {
                                const aId = appCameraIds[i];
                                const jId = appCameraIdToJsonId[aId];
                                return currentFrameData?.cameras?.[jId]?.tracks?.length || 0;
                            }));
                            
                            return (
                                <div key={name} className="flex items-center justify-between">
                                    <span>{name}</span>
                                    <div className="flex items-center">
                                        <div className="w-16 h-2 bg-gray-700 rounded-full mr-2">
                                            <div 
                                                className="h-2 bg-green-500 rounded-full" 
                                                style={{ width: `${(trackCount / maxTracks) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-mono">{trackCount}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-400">Stream Info</h3>
                            <span className={`text-xs font-semibold flex items-center ${isStreaming ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`h-1.5 w-1.5 ${isStreaming ? 'bg-green-400' : 'bg-red-400'} rounded-full mr-1`}></span>
                                {isStreaming ? 'Live' : 'Offline'}
                            </span>
                        </div>
                        {isStreaming && currentFrameData ? (
                            <>
                                <p className="text-xs">Mode: <span className="font-bold">Raw Video</span></p>
                                <p className="text-xs mt-1">Frame: <span className="font-bold">{currentFrameData.global_frame_index}</span></p>
                                <p className="text-xs mt-1">Last update: <span className="font-bold">{new Date(currentFrameData.timestamp_processed_utc).toLocaleTimeString()}</span></p>
                                <p className="text-xs mt-1">Total tracks: <span className="font-bold">
                                    {Object.values(currentFrameData.cameras).reduce((sum, cam) => sum + (cam.tracks?.length || 0), 0)}
                                </span></p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs">Status: <span className="font-bold">No stream</span></p>
                                <p className="text-xs mt-1">Backend: <span className="font-bold">{systemHealth?.status || 'Unknown'}</span></p>
                                <p className="text-xs mt-1">Click Start Stream to begin</p>
                            </>
                        )}
                    </div>
                    <button 
                        onClick={isStreaming ? handleStopStreaming : error ? handleStopStreaming : handleStartStreaming}
                        className={`w-full py-1.5 text-white rounded text-sm font-semibold mt-3 ${
                            isStreaming 
                                ? "bg-red-600 hover:bg-red-700" 
                                : error && !isStreaming
                                    ? "bg-orange-600 hover:bg-orange-700"
                                    : systemHealth?.status === 'healthy'
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-gray-600 cursor-not-allowed"
                        }`}
                        disabled={!isStreaming && !error && systemHealth?.status !== 'healthy'}
                    >
                        {isStreaming ? 'Stop Stream' : error ? 'Clean Up' : 'Start Stream'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GroupViewPage;