// src/pages/GroupViewPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import ImageSequencePlayer from "../components/ImageSequencePlayer";
// Import types if defined externally, e.g.:
// import { Track, FrameData, CameraData, CameraConfig, FrameIndicesState } from './types';

// --- Type Definitions (or import) ---
interface Track {
  track_id: number;
  global_id: number;
  bbox_xyxy: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
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
  scene_id: string; // e.g., "s10"
  timestamp_processed_utc: string;
  cameras: {
    [cameraId: string]: CameraData; // e.g., "c09": { ... }
  };
}

interface CameraConfig {
  basePath: string;      // Path to image frames folder, e.g., "/frames/camera1/"
  startFrame: number;    // Number of the first image frame, e.g., 0
  frameCount: number;    // Total number of image frames in sequence, e.g., 51
  extension?: string;    // Image file extension, defaults to 'jpg'
}

interface FrameIndicesState {
  [cameraId: string]: number; // e.g., { camera1: 0, camera2: 5, ... }
}
// --- End Type Definitions ---


// --- Mock Data and Configuration ---
const zoneName = "Campus";
const totalCameras = 4;
const activeCameras = 4;
const cameraIds = ["camera1", "camera2", "camera3", "camera4"]; // App's internal camera IDs
const cameraNames = ["Camera 1", "Camera 2", "Camera 3", "Camera 4"]; // Display names
const mockDetections = [145, 117, 82, 29]; // Mock data for right panel

// Configuration for each camera's IMAGE sequence
// ** IMPORTANT: Adjust startFrame, frameCount, extension based on your actual image files **
const cameraFrameConfig: { [key: string]: CameraConfig } = {
  camera1: { basePath: "/frames/camera1/", startFrame: 0, frameCount: 51, extension: "jpg" },
  camera2: { basePath: "/frames/camera2/", startFrame: 0, frameCount: 51, extension: "jpg" },
  camera3: { basePath: "/frames/camera3/", startFrame: 0, frameCount: 51, extension: "jpg" },
  camera4: { basePath: "/frames/camera4/", startFrame: 0, frameCount: 51, extension: "jpg" }
};

// Mapping from your App's Camera ID ('camera1') to the ID used inside the JSON ('c09')
// ** IMPORTANT: Verify these mappings match your JSON data structure! **
const appCameraIdToJsonId: { [key: string]: string } = {
    'camera1': 'c09',
    'camera2': 'c12', // Example - VERIFY
    'camera3': 'c13', // Example - VERIFY
    'camera4': 'c16', // Example - VERIFY
};

// Simulation playback speed
const SIMULATED_FPS = 5;

// Type for the active tab state
type TabType = "all" | string;

// Helper to initialize frame indices state to 0 for all cameras
const initialFrameIndices = cameraIds.reduce((acc, id) => {
  acc[id] = 0;
  return acc;
}, {} as FrameIndicesState);

// Scene ID (used for data path - make dynamic if needed based on zone selection etc.)
const CURRENT_SCENE_ID = 's10';
// Base path for the JSON data files (one file per frame for the whole scene)
const JSON_DATA_BASE_PATH = `/coords/scene_${CURRENT_SCENE_ID}/`; // e.g., /public/coords/s10/


// --- GroupViewPage Component ---
const GroupViewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isPlaying, setIsPlaying] = useState(true); // Global play/pause state
  const [frameIndices, setFrameIndices] = useState<FrameIndicesState>(initialFrameIndices); // Synced frame index per camera
  // State to store the entire FrameData object for the currently displayed frame index
  const [currentFrameData, setCurrentFrameData] = useState<FrameData | null>(null);
  const intervalRef = useRef<number | null>(null); // Ref for the global interval timer

  // --- Memoized function to advance frame indices for all cameras ---
  const advanceFrames = useCallback(() => {
      setFrameIndices(prevIndices => {
          const newIndices = { ...prevIndices };
          cameraIds.forEach(id => {
              const config = cameraFrameConfig[id];
              if (config && config.frameCount > 0) {
                   newIndices[id] = (prevIndices[id] + 1) % config.frameCount; // Loop index
              }
          });
          return newIndices;
      });
  // Assuming cameraIds and cameraFrameConfig are stable
  }, []);

  // --- Effect to manage the global playback interval timer ---
  useEffect(() => {
      const stopInterval = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
      }
      stopInterval(); // Clear previous interval
      if (isPlaying) {
          const intervalDuration = 1000 / SIMULATED_FPS;
          intervalRef.current = window.setInterval(advanceFrames, intervalDuration);
      }
      return stopInterval; // Cleanup on unmount/dependency change
  }, [isPlaying, advanceFrames]);

  // --- Effect to fetch the SINGLE JSON data file when frame index changes ---
  useEffect(() => {
    // Use the index from a representative camera (e.g., camera1)
    // Assumes all camera image sequences have the same length for data lookup
    const representativeIndex = frameIndices['camera1'];
    const config = cameraFrameConfig['camera1']; // Need config for startFrame

    // Check if index is valid
    if (config && representativeIndex !== undefined && representativeIndex < config.frameCount) {
        // Calculate the frame number based on startFrame and current index
        const actualFrameNumber = config.startFrame + representativeIndex;
        // Pad the frame number (e.g., 0 -> "000000")
        const frameString = String(actualFrameNumber).padStart(6, '0');

        // Construct the JSON filename for the scene
        // Uses CURRENT_SCENE_ID defined above
        const scenePrefix = `scene_${CURRENT_SCENE_ID}`;
        const jsonFilename = `${scenePrefix}_frame_${frameString}.json`;

        // Construct the CORRECT path to the single JSON file for the frame
        const jsonPath = `${JSON_DATA_BASE_PATH}${jsonFilename}`; // e.g., /coords/s10/scene_s10_frame_000000.json

        console.log("Attempting to fetch scene data:", jsonPath); // Log the path

        fetch(jsonPath)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        // Don't treat 'Not Found' as a hard error for potentially missing frames
                        console.warn(`Scene JSON data not found: ${jsonPath}`);
                        return null; // Indicate data is missing
                    }
                    // Throw error for other HTTP issues
                    throw new Error(`HTTP error! status: ${response.status} for ${jsonPath}`);
                }
                // Parse successful response as JSON
                return response.json();
            })
            .then((jsonData: FrameData | null) => { // jsonData can be null if 404 occurred
                // Store the entire fetched frame data object (or null)
                setCurrentFrameData(jsonData);
                // Optional log:
                // console.log(`Frame ${representativeIndex} Data Loaded:`, jsonData ? "Object received" : "null");
            })
            .catch(error => {
                // Log other errors (network issues, parsing errors)
                console.error(`Error fetching/parsing scene data for path "${jsonPath}":`, error);
                setCurrentFrameData(null); // Clear data on error
            });
    } else {
        // Clear data if index is invalid (e.g., initial state before config loads)
        setCurrentFrameData(null);
    }
  // Dependency: Fetch whenever the representative frame index changes
  // Using the whole frameIndices object ensures it runs when any index updates (they update together)
  }, [frameIndices]);


  // --- Handlers for global Play/Stop Buttons ---
  const handlePlayAll = () => setIsPlaying(true);
  const handleStopAll = () => setIsPlaying(false);

  // --- Render JSX ---
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 p-4 sm:p-6">
      {/* Header Section */}
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <Link to="/" className="flex items-center text-lg hover:text-orange-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            Back
        </Link>
        <h1 className="text-2xl font-semibold">{zoneName}</h1>
        <div></div> {/* Spacer */}
      </header>

      {/* Info Bar & Global Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0 gap-4">
        {/* Info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
            <div>Num cameras: <span className="font-semibold">{totalCameras}</span></div>
            <div className="flex space-x-4">
                <span className="text-green-400 flex items-center"><span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span> Active: {activeCameras}</span>
                <span className="text-red-400 flex items-center"><span className="h-2 w-2 bg-red-400 rounded-full mr-1"></span> Inactive: {totalCameras - activeCameras}</span>
            </div>
            <div>Map: <span className="font-semibold">floor 1</span></div>
        </div>
        {/* Controls */}
        <div className="flex space-x-2 flex-shrink-0">
            <button onClick={handlePlayAll} disabled={isPlaying} className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${ isPlaying ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700" }`}>Play All</button>
            <button onClick={handleStopAll} disabled={!isPlaying} className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${ !isPlaying ? "bg-gray-600 cursor-not-allowed" : "bg-red-600 hover:bg-red-700" }`}>Stop All</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-4 border-b border-gray-700 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab("all")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${ activeTab === "all" ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500" }`}>View all</button>
          {cameraIds.map((id, index) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${ activeTab === id ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500" }`}>
                {cameraNames[index]}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-grow min-h-0 gap-4">
        {/* Left Side (Image Player Area) */}
        <div className="w-2/3 bg-gray-800 rounded-md p-1 flex items-center justify-center">
          {/* Grid View */}
          {activeTab === "all" && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
              {cameraIds.map((id) => {
                const config = cameraFrameConfig[id];
                // Extract tracks for THIS camera from the centrally stored frame data
                const jsonCameraId = appCameraIdToJsonId[id];
                const tracks = jsonCameraId ? currentFrameData?.cameras?.[jsonCameraId]?.tracks : null;

                return (
                  <ImageSequencePlayer
                    key={id}
                    cameraId={id}
                    basePath={config?.basePath || ""}
                    startFrame={config?.startFrame ?? -1}
                    frameCount={config?.frameCount || 0}
                    currentFrameIndex={frameIndices[id] ?? 0} // Use synced index
                    imageExtension={config?.extension}
                    tracks={tracks || null} // Pass the extracted tracks
                    className="min-h-0"
                  />
                );
              })}
            </div>
          )}
          {/* Single Camera View */}
          {cameraIds.includes(activeTab) && (() => {
              const config = cameraFrameConfig[activeTab];
               // Extract tracks for THIS camera from the centrally stored frame data
              const jsonCameraId = appCameraIdToJsonId[activeTab];
              const tracks = jsonCameraId ? currentFrameData?.cameras?.[jsonCameraId]?.tracks : null;

              return (
                <ImageSequencePlayer
                  key={activeTab}
                  cameraId={activeTab}
                  basePath={config?.basePath || ""}
                  startFrame={config?.startFrame ?? -1}
                  frameCount={config?.frameCount || 0}
                  currentFrameIndex={frameIndices[activeTab] ?? 0} // Use synced index
                  imageExtension={config?.extension}
                  tracks={tracks || null} // Pass the extracted tracks
                  className="w-full h-full"
                />
              );
            })()}
        </div>

        {/* Right Side Panels */}
        <div className="w-1/3 flex flex-col gap-4">
            {/* Map Panel */}
            <div className="bg-gray-800 rounded-md p-4 h-1/2 flex items-center justify-center text-gray-500"> Mock Map Visualization </div>
            {/* Lower Panels */}
            <div className="flex flex-grow gap-4 h-1/2">
                {/* Detections Panel */}
                <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col">
                    <h3 className="text-sm font-semibold mb-3 text-gray-400">Detections per camera</h3>
                    <div className="space-y-2 text-xs flex-grow overflow-y-auto">
                        {cameraNames.map((name, index) => (
                            <div key={name} className="flex items-center justify-between">
                                <span>{name}</span>
                                <div className="flex items-center">
                                    <div className="w-16 h-2 bg-gray-700 rounded-full mr-2">
                                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${(mockDetections[index] / Math.max(1, ...mockDetections)) * 100}%` }}></div>
                                    </div>
                                    <span className="font-mono">{mockDetections[index]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Details Panel */}
                <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-400">Last caught</h3>
                            <span className="text-green-400 text-xs font-semibold flex items-center">
                                <span className="h-1.5 w-1.5 bg-green-400 rounded-full mr-1"></span>Active
                            </span>
                        </div>
                        <p className="text-xs">Camera <span className="font-bold text-lg">3</span></p>
                        <p className="text-xs mt-3">Person Id: <span className="font-bold">1</span></p>
                        <p className="text-xs mt-1">Tracking start: 25 min. ago</p>
                        <p className="text-xs mt-1">Last known: Room1</p>
                    </div>
                    <button className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold mt-3">Cancel Tracking</button>
                </div>
            </div>
        </div>
      </div> {/* End Main Content Area */}
    </div> // End Page Container
  );
};

export default GroupViewPage; // Make sure export name matches filename if needed