import React, { useEffect, useState, useCallback } from 'react';
import { TrackingResult, Detection, Camera, SpatialMapping } from '../../../services/types/api';
import { useTrackingStore } from '../../../stores/trackingStore';
import { useMappingStore } from '../../../stores/mappingStore';
import { useDetectionStore } from '../../../stores/detectionStore';
import { InteractiveLeafletMap } from './InteractiveLeafletMap';
import { trackingAPI } from '../../../services/trackingAPI';
import { mappingAPI } from '../../../services/mappingAPI';

interface MapTrackingControllerProps {
  cameras: Camera[];
  onPersonSelect?: (personId: string) => void;
  onTrackingStart?: (personId: string, location: [number, number]) => void;
  className?: string;
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
}

interface TrackingState {
  activeTrackingResults: TrackingResult[];
  personTrajectories: Map<string, TrajectoryPoint[]>;
  realTimePositions: Map<string, PositionUpdate>;
  mapSettings: MapSettings;
}

interface TrajectoryPoint {
  position: [number, number];
  timestamp: number;
  confidence: number;
  cameraId?: string;
}

interface PositionUpdate {
  position: [number, number];
  timestamp: number;
  velocity?: { x: number; y: number };
  confidence: number;
}

interface MapSettings {
  showCameras: boolean;
  showTrajectories: boolean;
  showHeatmap: boolean;
  showZones: boolean;
  enableClickToTrack: boolean;
  trajectoryLength: number; // Number of points to keep
  updateFrequency: number; // Update frequency in milliseconds
}

export const MapTrackingController: React.FC<MapTrackingControllerProps> = ({
  cameras,
  onPersonSelect,
  onTrackingStart,
  className = '',
  enableRealTimeUpdates = true,
  updateInterval = 1000,
}) => {
  const [trackingState, setTrackingState] = useState<TrackingState>({
    activeTrackingResults: [],
    personTrajectories: new Map(),
    realTimePositions: new Map(),
    mapSettings: {
      showCameras: true,
      showTrajectories: true,
      showHeatmap: false,
      showZones: true,
      enableClickToTrack: true,
      trajectoryLength: 100,
      updateFrequency: 1000,
    },
  });

  const [spatialMapping, setSpatialMapping] = useState<SpatialMapping | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store hooks
  const { trackingTargets, trackingHistory, startTracking, stopTracking } = useTrackingStore();
  const { selectedMapping, zones, loadSpatialMapping } = useMappingStore();
  const { selectedDetection } = useDetectionStore();

  // Load spatial mapping data
  useEffect(() => {
    const loadMapping = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load spatial mapping data
        const mappingData = await mappingAPI.getSpatialMapping('default');
        setSpatialMapping(mappingData);
        
        // Load zones if available
        if (mappingData.zones) {
          // Zones would be loaded via the mapping store
        }
        
      } catch (err) {
        console.error('Failed to load spatial mapping:', err);
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    loadMapping();
  }, []);

  // Real-time tracking data updates
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const updateTrackingData = async () => {
      try {
        // Get current tracking results
        const trackingResults = await trackingAPI.getTrackingResults({
          limit: 100,
          includeTrajectories: true,
        });

        // Update active tracking results
        setTrackingState(prev => ({
          ...prev,
          activeTrackingResults: trackingResults.results,
        }));

        // Update trajectories
        const newTrajectories = new Map(prev.personTrajectories);
        trackingResults.results.forEach(result => {
          if (result.trajectory) {
            const trajectoryPoints: TrajectoryPoint[] = result.trajectory.map(point => ({
              position: [point.y, point.x], // Lat, Lng
              timestamp: point.timestamp,
              confidence: point.confidence,
              cameraId: result.cameraId,
            }));

            // Keep only recent points
            const recentPoints = trajectoryPoints
              .slice(-trackingState.mapSettings.trajectoryLength)
              .filter(point => Date.now() - point.timestamp < 300000); // 5 minutes

            newTrajectories.set(result.personId, recentPoints);
          }
        });

        // Update real-time positions
        const newPositions = new Map(prev.realTimePositions);
        trackingResults.results.forEach(result => {
          newPositions.set(result.personId, {
            position: [result.currentPosition.y, result.currentPosition.x],
            timestamp: Date.now(),
            velocity: result.velocity,
            confidence: result.confidence,
          });
        });

        setTrackingState(prev => ({
          ...prev,
          personTrajectories: newTrajectories,
          realTimePositions: newPositions,
        }));

      } catch (err) {
        console.error('Failed to update tracking data:', err);
      }
    };

    // Initial load
    updateTrackingData();

    // Set up interval for real-time updates
    const interval = setInterval(updateTrackingData, updateInterval);

    return () => clearInterval(interval);
  }, [enableRealTimeUpdates, updateInterval, trackingState.mapSettings.trajectoryLength]);

  // Handle person selection
  const handlePersonSelect = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    onPersonSelect?.(personId);
  }, [onPersonSelect]);

  // Handle location selection
  const handleLocationSelect = useCallback((coordinates: [number, number]) => {
    console.log('Location selected:', coordinates);
    // This could be used for manual person placement or zone creation
  }, []);

  // Handle tracking start from map
  const handleTrackingStart = useCallback(async (personId: string, location: [number, number]) => {
    try {
      await startTracking(personId, 'map');
      onTrackingStart?.(personId, location);
    } catch (err) {
      console.error('Failed to start tracking:', err);
    }
  }, [startTracking, onTrackingStart]);

  // Handle map settings changes
  const handleMapSettingsChange = useCallback((setting: keyof MapSettings, value: any) => {
    setTrackingState(prev => ({
      ...prev,
      mapSettings: {
        ...prev.mapSettings,
        [setting]: value,
      },
    }));
  }, []);

  // Transform tracking results for map display
  const transformTrackingResults = useCallback((): TrackingResult[] => {
    return trackingState.activeTrackingResults.map(result => ({
      ...result,
      // Ensure coordinates are in the correct format
      currentPosition: {
        ...result.currentPosition,
        coordinateSystem: 'geographic',
      },
      // Add trajectory data from our local state
      trajectory: trackingState.personTrajectories.get(result.personId)?.map(point => ({
        x: point.position[1], // Lng
        y: point.position[0], // Lat
        timestamp: point.timestamp,
        confidence: point.confidence,
        coordinateSystem: 'geographic' as const,
      })) || [],
    }));
  }, [trackingState.activeTrackingResults, trackingState.personTrajectories]);

  // Create mock detections from tracking results for display
  const createDetectionsFromTracking = useCallback((): Detection[] => {
    return trackingState.activeTrackingResults.map(result => ({
      id: `tracking-${result.personId}`,
      personId: result.personId,
      cameraId: result.cameraId || '',
      timestamp: new Date().toISOString(),
      confidence: result.confidence,
      boundingBox: {
        x: 0, y: 0, width: 0, height: 0 // Map doesn't need bounding boxes
      },
      isSelected: selectedPersonId === result.personId,
      isTracking: trackingTargets.some(target => target.personId === result.personId),
      classId: 1, // Person class
      globalId: parseInt(result.personId) || 0,
    }));
  }, [trackingState.activeTrackingResults, selectedPersonId, trackingTargets]);

  // Clean up old trajectory data
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setTrackingState(prev => {
        const newTrajectories = new Map(prev.personTrajectories);
        const newPositions = new Map(prev.realTimePositions);
        const cutoffTime = Date.now() - 600000; // 10 minutes

        // Clean up old trajectory points
        newTrajectories.forEach((points, personId) => {
          const recentPoints = points.filter(point => point.timestamp > cutoffTime);
          if (recentPoints.length === 0) {
            newTrajectories.delete(personId);
          } else {
            newTrajectories.set(personId, recentPoints);
          }
        });

        // Clean up old positions
        newPositions.forEach((position, personId) => {
          if (position.timestamp < cutoffTime) {
            newPositions.delete(personId);
          }
        });

        return {
          ...prev,
          personTrajectories: newTrajectories,
          realTimePositions: newPositions,
        };
      });
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <div className="text-gray-600">Loading map...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !spatialMapping) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-gray-600">{error || 'Failed to load map data'}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <InteractiveLeafletMap
        spatialMapping={spatialMapping}
        trackingResults={transformTrackingResults()}
        cameras={cameras}
        detections={createDetectionsFromTracking()}
        onPersonSelect={handlePersonSelect}
        onLocationSelect={handleLocationSelect}
        onTrackingStart={handleTrackingStart}
        showCameras={trackingState.mapSettings.showCameras}
        showTrajectories={trackingState.mapSettings.showTrajectories}
        showHeatmap={trackingState.mapSettings.showHeatmap}
        showZones={trackingState.mapSettings.showZones}
        enableClickToTrack={trackingState.mapSettings.enableClickToTrack}
        selectedPersonId={selectedPersonId}
        className="h-full"
      />

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
        <div className="text-sm font-semibold mb-2">Map Controls</div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={trackingState.mapSettings.showCameras}
              onChange={(e) => handleMapSettingsChange('showCameras', e.target.checked)}
              className="rounded"
            />
            Show Cameras
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={trackingState.mapSettings.showTrajectories}
              onChange={(e) => handleMapSettingsChange('showTrajectories', e.target.checked)}
              className="rounded"
            />
            Show Trajectories
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={trackingState.mapSettings.showZones}
              onChange={(e) => handleMapSettingsChange('showZones', e.target.checked)}
              className="rounded"
            />
            Show Zones
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={trackingState.mapSettings.enableClickToTrack}
              onChange={(e) => handleMapSettingsChange('enableClickToTrack', e.target.checked)}
              className="rounded"
            />
            Click to Track
          </label>

          <div className="border-t pt-2 mt-2">
            <label className="flex items-center gap-2 text-sm">
              <span>Trajectory Length:</span>
              <input
                type="range"
                min="10"
                max="200"
                value={trackingState.mapSettings.trajectoryLength}
                onChange={(e) => handleMapSettingsChange('trajectoryLength', parseInt(e.target.value))}
                className="w-16"
              />
              <span className="text-xs">{trackingState.mapSettings.trajectoryLength}</span>
            </label>

            <label className="flex items-center gap-2 text-sm mt-1">
              <span>Update Rate:</span>
              <select
                value={trackingState.mapSettings.updateFrequency}
                onChange={(e) => handleMapSettingsChange('updateFrequency', parseInt(e.target.value))}
                className="text-xs px-1 py-0.5 border rounded"
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Status panel */}
      <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-75 text-white p-3 rounded-lg">
        <div className="text-sm font-semibold mb-1">Tracking Status</div>
        <div className="text-xs space-y-1">
          <div>Active Persons: {trackingState.activeTrackingResults.length}</div>
          <div>Tracking Targets: {trackingTargets.length}</div>
          <div>Trajectories: {trackingState.personTrajectories.size}</div>
          <div>Real-time Updates: {enableRealTimeUpdates ? 'ON' : 'OFF'}</div>
          {selectedPersonId && (
            <div className="text-blue-300 mt-2">
              Selected: {selectedPersonId}
            </div>
          )}
        </div>
      </div>

      {/* Performance indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-green-500 bg-opacity-75 text-white px-3 py-1 rounded-full text-xs">
        Real-time Tracking Active
      </div>
    </div>
  );
};

export default MapTrackingController;