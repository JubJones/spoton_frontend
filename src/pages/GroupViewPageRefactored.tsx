// src/pages/GroupViewPageRefactored.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/layout/Header";
import CameraGrid from "../features/detection/components/CameraGrid";
import DetectionControls from "../features/detection/components/DetectionControls";
import SpatialMap from "../features/mapping/components/SpatialMap";
import Button from "../components/atoms/Button";
import { useAppStore, useDetectionStore, useTrackingStore } from "../stores";
import { appActions, detectionActions, trackingActions } from "../stores";

// --- Legacy Types (to be migrated) ---
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
// --- End Legacy Types ---

// --- Configuration Data ---
const zoneName = "Campus";
const totalCameras = 4;
const activeCameras = 4;
const appCameraIds = ["camera1", "camera2", "camera3", "camera4"];
const cameraNames = ["Camera 1", "Camera 2", "Camera 3", "Camera 4"];
const mockDetections = [145, 117, 82, 29];

const SIMULATED_FPS = 1;
const CURRENT_SCENE_ID = 's10';
const JSON_DATA_BASE_PATH = `/coords/scene_${CURRENT_SCENE_ID}/`;

const GroupViewPageRefactored: React.FC = () => {
  // Store state
  const { activeTab, isPlaying } = useAppStore();
  const { frameIndices, cameraConfigs } = useDetectionStore();
  const { selectedPersonId } = useTrackingStore();

  // Local state for legacy functionality
  const [, setCurrentFrameDataLegacy] = useState<FrameData | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Frame advancement logic (legacy)
  const advanceFrames = useCallback(() => {
    Object.keys(frameIndices).forEach(cameraId => {
      const config = cameraConfigs[cameraId];
      if (config && config.frameCount > 0) {
        const currentIndex = frameIndices[cameraId];
        const newIndex = (currentIndex + 1) % config.frameCount;
        detectionActions.updateFrameIndex(cameraId, newIndex);
      }
    });
  }, [frameIndices, cameraConfigs]);

  // Auto-play effect (legacy)
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

  // Fetch frame data (legacy)
  useEffect(() => {
    const representativeAppId = appCameraIds[0];
    const representativeIndex = frameIndices[representativeAppId];
    const config = cameraConfigs[representativeAppId];

    if (config && representativeIndex !== undefined && representativeIndex < config.frameCount) {
      const actualFrameNumber = config.startFrame + representativeIndex;
      const frameString = String(actualFrameNumber).padStart(6, '0');
      const scenePrefix = `scene_${CURRENT_SCENE_ID}`;
      const jsonFilename = `${scenePrefix}_frame_${frameString}.json`;
      const jsonPath = `${JSON_DATA_BASE_PATH}${jsonFilename}`;

      fetch(jsonPath)
        .then(response => {
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`Scene JSON data not found: ${jsonPath}`);
              return null;
            }
            throw new Error(`HTTP error! status: ${response.status} for ${jsonPath}`);
          }
          return response.json();
        })
        .then((jsonData: FrameData | null) => {
          setCurrentFrameDataLegacy(jsonData);
          if (jsonData) {
            detectionActions.updateFrameData(jsonData);
          }
        })
        .catch(error => {
          console.error(`Error fetching/parsing scene data:`, error);
          setCurrentFrameDataLegacy(null);
        });
    } else {
      setCurrentFrameDataLegacy(null);
    }
  }, [frameIndices, cameraConfigs]);

  // Event handlers
  const handlePlayAll = () => appActions.setIsPlaying(true);
  const handleStopAll = () => appActions.setIsPlaying(false);
  const handlePersonClick = (personId: number) => trackingActions.setSelectedPerson(personId);
  const handleTabChange = (tab: string) => appActions.setActiveTab(tab);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 p-4 sm:p-6">
      {/* Header */}
      <Header 
        title={zoneName}
        showBackButton={true}
        backTo="/"
        className="mb-4"
      />

      {/* Info Bar & Global Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
          <div>Num cameras: <span className="font-semibold">{totalCameras}</span></div>
          <div className="flex space-x-4">
            <span className="text-green-400 flex items-center">
              <span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span>
              Active: {activeCameras}
            </span>
            <span className="text-red-400 flex items-center">
              <span className="h-2 w-2 bg-red-400 rounded-full mr-1"></span>
              Inactive: {totalCameras - activeCameras}
            </span>
          </div>
          <div>Map: <span className="font-semibold">floor 1</span></div>
        </div>
        
        <div className="flex space-x-2 flex-shrink-0">
          <Button
            onClick={handlePlayAll}
            disabled={isPlaying}
            variant={isPlaying ? "secondary" : "success"}
            size="small"
          >
            Play All
          </Button>
          <Button
            onClick={handleStopAll}
            disabled={!isPlaying}
            variant={!isPlaying ? "secondary" : "danger"}
            size="small"
          >
            Stop All
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-4 border-b border-gray-700 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("all")}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            View all
          </button>
          {appCameraIds.map((id, index) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
              }`}
            >
              {cameraNames[index]}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-grow min-h-0 gap-4">
        {/* Left Side - Camera Display */}
        <div className="w-2/3 bg-gray-800 rounded-md p-1 flex items-center justify-center">
          {activeTab === "all" ? (
            <CameraGrid className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Single camera view: {activeTab}
              {/* TODO: Implement single camera view */}
            </div>
          )}
        </div>

        {/* Right Side Panels */}
        <div className="w-1/3 flex flex-col gap-4">
          {/* Spatial Map */}
          <div className="h-1/2">
            <SpatialMap 
              className="w-full h-full"
              onPersonClick={handlePersonClick}
            />
          </div>

          {/* Bottom Panels */}
          <div className="flex flex-grow gap-4 h-1/2">
            {/* Detection Statistics */}
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
                          style={{ width: `${(mockDetections[idx] / Math.max(1, ...mockDetections)) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono">{mockDetections[idx]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Caught Panel */}
            <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-400">Last caught</h3>
                  <span className="text-green-400 text-xs font-semibold flex items-center">
                    <span className="h-1.5 w-1.5 bg-green-400 rounded-full mr-1"></span>
                    Active
                  </span>
                </div>
                <p className="text-xs">Camera <span className="font-bold text-lg">3</span></p>
                <p className="text-xs mt-3">Person Id: <span className="font-bold">{selectedPersonId || 1}</span></p>
                <p className="text-xs mt-1">Tracking start: 25 min. ago</p>
                <p className="text-xs mt-1">Last known: Room1</p>
              </div>
              <Button
                onClick={() => trackingActions.setSelectedPerson(null)}
                variant="danger"
                size="small"
                className="mt-3"
              >
                Cancel Tracking
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Controls (Hidden by default, can be toggled) */}
      <div className="hidden">
        <DetectionControls className="mt-4" />
      </div>
    </div>
  );
};

export default GroupViewPageRefactored;