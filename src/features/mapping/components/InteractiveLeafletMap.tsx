import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { SpatialMapping, TrackingResult, Detection, Camera } from '../../../services/types/api';
import { useMappingStore } from '../../../stores/mappingStore';
import { useTrackingStore } from '../../../stores/trackingStore';
import { useDetectionStore } from '../../../stores/detectionStore';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveLeafletMapProps {
  spatialMapping: SpatialMapping;
  trackingResults: TrackingResult[];
  cameras: Camera[];
  detections: Detection[];
  onPersonSelect?: (personId: string) => void;
  onLocationSelect?: (coordinates: [number, number]) => void;
  onTrackingStart?: (personId: string, location: [number, number]) => void;
  className?: string;
  showCameras?: boolean;
  showTrajectories?: boolean;
  showHeatmap?: boolean;
  showZones?: boolean;
  enableClickToTrack?: boolean;
  selectedPersonId?: string;
  highlightedPersonId?: string;
}

interface PersonMarker {
  id: string;
  position: [number, number];
  confidence: number;
  timestamp: number;
  cameraId: string;
  isTracking: boolean;
  velocity?: { x: number; y: number };
}

interface TrajectoryPath {
  personId: string;
  points: [number, number][];
  color: string;
  timestamps: number[];
}

interface CameraMarker {
  id: string;
  position: [number, number];
  name: string;
  isActive: boolean;
  fieldOfView: number;
  direction: number;
}

interface ClickToTrackHandler {
  coordinates: [number, number];
  timestamp: number;
  nearestPersonId?: string;
}

// Custom marker icons
const createPersonIcon = (isSelected: boolean, isTracking: boolean, confidence: number) => {
  const color = isSelected ? '#0066cc' : isTracking ? '#ff0000' : '#00ff00';
  const size = isSelected ? 12 : isTracking ? 10 : 8;
  const opacity = Math.max(0.3, confidence);

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        opacity: ${opacity};
        ${isTracking ? 'animation: pulse 2s infinite;' : ''}
      "></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: ${opacity}; }
          50% { transform: scale(1.2); opacity: ${opacity * 0.7}; }
          100% { transform: scale(1); opacity: ${opacity}; }
        }
      </style>
    `,
    className: 'person-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createCameraIcon = (isActive: boolean) => {
  const color = isActive ? '#00ff00' : '#ff0000';
  return L.divIcon({
    html: `
      <div style="
        width: 16px;
        height: 16px;
        background: ${color};
        border: 2px solid white;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 8px;
        font-weight: bold;
      ">📹</div>
    `,
    className: 'camera-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Map event handler component
const MapEventHandler: React.FC<{
  onLocationSelect?: (coordinates: [number, number]) => void;
  onTrackingStart?: (personId: string, location: [number, number]) => void;
  enableClickToTrack: boolean;
  personMarkers: PersonMarker[];
}> = ({ onLocationSelect, onTrackingStart, enableClickToTrack, personMarkers }) => {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      const coordinates: [number, number] = [e.latlng.lat, e.latlng.lng];
      onLocationSelect?.(coordinates);

      if (enableClickToTrack) {
        // Find nearest person within 50 meters
        const nearestPerson = findNearestPerson(coordinates, personMarkers, 50);
        if (nearestPerson) {
          onTrackingStart?.(nearestPerson.id, coordinates);
        }
      }
    },
  });

  return null;
};

// Utility function to find nearest person
const findNearestPerson = (
  coordinates: [number, number],
  personMarkers: PersonMarker[],
  maxDistance: number
): PersonMarker | null => {
  let nearest: PersonMarker | null = null;
  let minDistance = maxDistance;

  personMarkers.forEach(marker => {
    const distance = calculateDistance(coordinates, marker.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = marker;
    }
  });

  return nearest;
};

// Calculate distance between two coordinates (in meters)
const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const InteractiveLeafletMap: React.FC<InteractiveLeafletMapProps> = ({
  spatialMapping,
  trackingResults,
  cameras,
  detections,
  onPersonSelect,
  onLocationSelect,
  onTrackingStart,
  className = '',
  showCameras = true,
  showTrajectories = true,
  showHeatmap = false,
  showZones = true,
  enableClickToTrack = true,
  selectedPersonId,
  highlightedPersonId,
}) => {
  const [personMarkers, setPersonMarkers] = useState<PersonMarker[]>([]);
  const [trajectoryPaths, setTrajectoryPaths] = useState<TrajectoryPath[]>([]);
  const [cameraMarkers, setCameraMarkers] = useState<CameraMarker[]>([]);
  const [clickToTrackHandler, setClickToTrackHandler] = useState<ClickToTrackHandler | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [mapZoom, setMapZoom] = useState(18);

  // Store hooks
  const { selectedMapping, zones } = useMappingStore();
  const { trackingTargets, trackingHistory } = useTrackingStore();
  const { selectedDetection } = useDetectionStore();

  // Initialize map center and zoom from spatial mapping
  useEffect(() => {
    if (spatialMapping.bounds) {
      const centerLat = (spatialMapping.bounds.north + spatialMapping.bounds.south) / 2;
      const centerLng = (spatialMapping.bounds.east + spatialMapping.bounds.west) / 2;
      setMapCenter([centerLat, centerLng]);
      
      // Calculate appropriate zoom level based on bounds
      const latDiff = spatialMapping.bounds.north - spatialMapping.bounds.south;
      const lngDiff = spatialMapping.bounds.east - spatialMapping.bounds.west;
      const maxDiff = Math.max(latDiff, lngDiff);
      const zoom = Math.min(20, Math.max(15, 20 - Math.log2(maxDiff * 1000)));
      setMapZoom(zoom);
    }
  }, [spatialMapping]);

  // Update person markers from tracking results
  useEffect(() => {
    const markers: PersonMarker[] = trackingResults.map(result => ({
      id: result.personId,
      position: [result.currentPosition.y, result.currentPosition.x], // Lat, Lng
      confidence: result.confidence,
      timestamp: Date.now(),
      cameraId: result.cameraId || '',
      isTracking: trackingTargets.some(target => target.personId === result.personId),
      velocity: result.velocity ? { x: result.velocity.x, y: result.velocity.y } : undefined,
    }));

    setPersonMarkers(markers);
  }, [trackingResults, trackingTargets]);

  // Update trajectory paths from tracking history
  useEffect(() => {
    const paths: TrajectoryPath[] = [];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    let colorIndex = 0;

    trackingHistory.forEach(history => {
      if (history.positions.length > 1) {
        const points: [number, number][] = history.positions.map(pos => [pos.y, pos.x]);
        const timestamps = history.positions.map(pos => pos.timestamp);
        
        paths.push({
          personId: history.personId,
          points,
          color: colors[colorIndex % colors.length],
          timestamps,
        });
        
        colorIndex++;
      }
    });

    setTrajectoryPaths(paths);
  }, [trackingHistory]);

  // Update camera markers
  useEffect(() => {
    const markers: CameraMarker[] = cameras.map(camera => ({
      id: camera.id,
      position: [camera.position.y, camera.position.x], // Lat, Lng
      name: camera.name,
      isActive: camera.isActive,
      fieldOfView: camera.fieldOfView || 60,
      direction: camera.direction || 0,
    }));

    setCameraMarkers(markers);
  }, [cameras]);

  // Handle person marker click
  const handlePersonClick = useCallback((personId: string) => {
    onPersonSelect?.(personId);
  }, [onPersonSelect]);

  // Handle tracking start
  const handleTrackingStart = useCallback((personId: string, location: [number, number]) => {
    onTrackingStart?.(personId, location);
  }, [onTrackingStart]);

  // Handle click to track timeout
  useEffect(() => {
    if (clickToTrackHandler) {
      const timeout = setTimeout(() => {
        setClickToTrackHandler(null);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [clickToTrackHandler]);

  // Render camera field of view
  const renderCameraFOV = (camera: CameraMarker) => {
    if (!camera.isActive) return null;

    const fovRadius = 50; // 50 meters
    const fovAngle = camera.fieldOfView * Math.PI / 180;
    const direction = camera.direction * Math.PI / 180;

    // Calculate FOV arc points
    const points: [number, number][] = [];
    const numPoints = 20;
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = direction - fovAngle / 2 + (fovAngle * i) / numPoints;
      const lat = camera.position[0] + (fovRadius / 111320) * Math.cos(angle);
      const lng = camera.position[1] + (fovRadius / (111320 * Math.cos(camera.position[0] * Math.PI / 180))) * Math.sin(angle);
      points.push([lat, lng]);
    }

    points.push(camera.position); // Close the arc

    return (
      <Polyline
        key={`fov-${camera.id}`}
        positions={points}
        color="#00ff00"
        weight={2}
        opacity={0.3}
        fillOpacity={0.1}
      />
    );
  };

  // Render zones
  const renderZones = () => {
    if (!showZones || !zones) return null;

    return zones.map(zone => (
      <React.Fragment key={zone.id}>
        <Polyline
          positions={zone.coordinates.map(coord => [coord.y, coord.x])}
          color={zone.color || '#ffff00'}
          weight={2}
          opacity={0.7}
          fillOpacity={0.1}
        />
        <Marker position={[zone.center.y, zone.center.x]}>
          <Popup>
            <div>
              <h4>{zone.name}</h4>
              <p>Type: {zone.type}</p>
              <p>Status: {zone.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </Popup>
        </Marker>
      </React.Fragment>
    ));
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Map event handler */}
        <MapEventHandler
          onLocationSelect={onLocationSelect}
          onTrackingStart={handleTrackingStart}
          enableClickToTrack={enableClickToTrack}
          personMarkers={personMarkers}
        />

        {/* Person markers */}
        {personMarkers.map(marker => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={createPersonIcon(
              selectedPersonId === marker.id,
              marker.isTracking,
              marker.confidence
            )}
            eventHandlers={{
              click: () => handlePersonClick(marker.id),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Person {marker.id}</div>
                <div>Confidence: {(marker.confidence * 100).toFixed(1)}%</div>
                <div>Camera: {marker.cameraId}</div>
                <div>Status: {marker.isTracking ? 'Tracking' : 'Detected'}</div>
                {marker.velocity && (
                  <div>
                    Velocity: {Math.sqrt(marker.velocity.x ** 2 + marker.velocity.y ** 2).toFixed(2)} m/s
                  </div>
                )}
                <button
                  onClick={() => handleTrackingStart(marker.id, marker.position)}
                  className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  {marker.isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Camera markers */}
        {showCameras && cameraMarkers.map(camera => (
          <React.Fragment key={camera.id}>
            <Marker
              position={camera.position}
              icon={createCameraIcon(camera.isActive)}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{camera.name}</div>
                  <div>Status: {camera.isActive ? 'Active' : 'Inactive'}</div>
                  <div>FOV: {camera.fieldOfView}°</div>
                  <div>Direction: {camera.direction}°</div>
                </div>
              </Popup>
            </Marker>
            
            {/* Camera field of view */}
            {renderCameraFOV(camera)}
          </React.Fragment>
        ))}

        {/* Trajectory paths */}
        {showTrajectories && trajectoryPaths.map(path => (
          <Polyline
            key={path.personId}
            positions={path.points}
            color={path.color}
            weight={selectedPersonId === path.personId ? 4 : 2}
            opacity={selectedPersonId === path.personId ? 0.8 : 0.5}
          />
        ))}

        {/* Zones */}
        {renderZones()}

        {/* Click to track indicator */}
        {clickToTrackHandler && (
          <Circle
            center={clickToTrackHandler.coordinates}
            radius={5}
            color="#ffffff"
            weight={2}
            opacity={0.8}
            fillOpacity={0.3}
          />
        )}
      </MapContainer>

      {/* Map controls */}
      <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 p-2 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCameras}
              onChange={(e) => {
                // This would be passed as a prop or handled by parent component
              }}
            />
            Show Cameras
          </label>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTrajectories}
              onChange={(e) => {
                // This would be passed as a prop or handled by parent component
              }}
            />
            Show Trajectories
          </label>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showZones}
              onChange={(e) => {
                // This would be passed as a prop or handled by parent component
              }}
            />
            Show Zones
          </label>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enableClickToTrack}
              onChange={(e) => {
                // This would be passed as a prop or handled by parent component
              }}
            />
            Click to Track
          </label>
        </div>
      </div>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 p-2 rounded-lg shadow-lg">
        <div className="text-sm font-semibold mb-2">Legend</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Detected Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Tracking Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Selected Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span>Active Camera</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-yellow-500"></div>
            <span>Zone Boundary</span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-75 text-white p-2 rounded-lg">
        <div className="text-xs">
          <div>Persons: {personMarkers.length}</div>
          <div>Tracking: {trackingTargets.length}</div>
          <div>Cameras: {cameraMarkers.filter(c => c.isActive).length}/{cameraMarkers.length}</div>
          {selectedPersonId && (
            <div className="mt-1 text-blue-300">Selected: {selectedPersonId}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveLeafletMap;