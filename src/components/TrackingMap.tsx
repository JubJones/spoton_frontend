// src/components/TrackingMap.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName, getEnvironmentConfiguration } from '../config/environments';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

interface PersonTrajectory {
  personId: string;
  path: Array<{
    coords: [number, number];
    timestamp: Date;
    cameraId: BackendCameraId;
    confidence: number;
  }>;
}

interface CameraPosition {
  id: BackendCameraId;
  position: [number, number];
  fieldOfView?: {
    angle: number;
    distance: number;
    direction: number;
  };
}

interface TrackingMapProps {
  environment: EnvironmentId;
  // Current person positions
  currentPersons: Array<{
    person: TrackedPerson;
    cameraId: BackendCameraId;
  }>;
  // Historical trajectories
  trajectories?: PersonTrajectory[];
  // Camera positions
  cameraPositions: CameraPosition[];
  // Map interaction
  selectedPersonIds?: Set<string>;
  focusedCameraId?: BackendCameraId | null;
  className?: string;
  // Event handlers
  onPersonClick?: (person: TrackedPerson, cameraId: BackendCameraId) => void;
  onPersonHover?: (person: TrackedPerson | null, cameraId: BackendCameraId) => void;
  onCameraClick?: (cameraId: BackendCameraId) => void;
  // Display options
  showTrajectories?: boolean;
  showCameraFOV?: boolean;
  showHeatmap?: boolean;
  trajectoryTimeRange?: number; // minutes
}

// Person marker colors matching the camera view colors
const PERSON_COLORS = [
  '#00FF00', // Lime
  '#FF6B35', // Orange
  '#F7931E', // Yellow-orange
  '#FFD23F', // Yellow
  '#06FFA5', // Mint
  '#118AB2', // Blue
  '#073B4C', // Dark blue
  '#EF476F', // Pink
  '#8338EC', // Purple
  '#FB8500', // Orange
];

// Create custom person marker
const createPersonMarker = (color: string, isSelected: boolean) => {
  const size = isSelected ? 14 : 10;
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'person-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Create camera marker
const createCameraMarker = (cameraId: BackendCameraId, isFocused: boolean) => {
  const size = isFocused ? 24 : 18;
  const color = isFocused ? '#FF6B35' : '#118AB2';
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 3px; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: bold;">${cameraId.slice(-2)}</div>`,
    className: 'camera-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map bounds controller component
const MapBoundsController: React.FC<{
  environment: EnvironmentId;
  cameraPositions: CameraPosition[];
}> = ({ environment, cameraPositions }) => {
  const map = useMap();

  useEffect(() => {
    if (cameraPositions.length > 0) {
      const bounds = L.latLngBounds(cameraPositions.map((cam) => cam.position));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, cameraPositions, environment]);

  return null;
};

const TrackingMap: React.FC<TrackingMapProps> = ({
  environment,
  currentPersons = [],
  trajectories = [],
  cameraPositions = [],
  selectedPersonIds = new Set(),
  focusedCameraId,
  className = '',
  onPersonClick,
  onPersonHover,
  onCameraClick,
  showTrajectories = true,
  showCameraFOV = false,
  showHeatmap = false,
  trajectoryTimeRange = 30,
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]); // Default to SF
  const [mapZoom, setMapZoom] = useState(18);

  // Get environment configuration
  const envConfig = useMemo(() => getEnvironmentConfiguration(environment), [environment]);

  // Set initial map bounds based on environment
  useEffect(() => {
    if (cameraPositions.length > 0) {
      // Calculate center from camera positions
      const avgLat =
        cameraPositions.reduce((sum, cam) => sum + cam.position[0], 0) / cameraPositions.length;
      const avgLng =
        cameraPositions.reduce((sum, cam) => sum + cam.position[1], 0) / cameraPositions.length;
      setMapCenter([avgLat, avgLng]);
    } else {
      // Use default positions based on environment
      switch (environment) {
        case 'factory':
          setMapCenter([37.7749, -122.4194]); // Factory coordinates
          break;
        case 'campus':
          setMapCenter([37.7849, -122.4094]); // Campus coordinates
          break;
        default:
          setMapCenter([37.7749, -122.4194]);
      }
    }
  }, [environment, cameraPositions]);

  // Get person color based on ID
  const getPersonColor = useCallback((personId: string, isSelected: boolean) => {
    if (isSelected) {
      return '#FFD700'; // Gold for selected persons
    }
    const colorIndex = parseInt(personId?.slice(-2) || '0', 36) % PERSON_COLORS.length;
    return PERSON_COLORS[colorIndex];
  }, []);

  // Filter trajectories by time range
  const filteredTrajectories = useMemo(() => {
    if (!showTrajectories) return [];

    const cutoffTime = new Date(Date.now() - trajectoryTimeRange * 60 * 1000);
    return trajectories
      .map((trajectory) => ({
        ...trajectory,
        path: trajectory.path.filter((point) => point.timestamp >= cutoffTime),
      }))
      .filter((trajectory) => trajectory.path.length > 1);
  }, [trajectories, showTrajectories, trajectoryTimeRange]);

  // Handle person marker click
  const handlePersonClick = useCallback(
    (person: TrackedPerson, cameraId: BackendCameraId) => {
      onPersonClick?.(person, cameraId);
    },
    [onPersonClick]
  );

  // Handle camera marker click
  const handleCameraClick = useCallback(
    (cameraId: BackendCameraId) => {
      onCameraClick?.(cameraId);
    },
    [onCameraClick]
  );

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2">
        <h3 className="text-white text-sm font-semibold">Map Options</h3>

        <label className="flex items-center space-x-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={showTrajectories}
            onChange={(e) => {
              // This would be handled by parent component
              console.log('Toggle trajectories:', e.target.checked);
            }}
            className="rounded"
          />
          <span>Show Paths</span>
        </label>

        <label className="flex items-center space-x-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={showCameraFOV}
            onChange={(e) => {
              console.log('Toggle camera FOV:', e.target.checked);
            }}
            className="rounded"
          />
          <span>Camera FOV</span>
        </label>

        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <span>Path Time:</span>
          <select
            value={trajectoryTimeRange}
            onChange={(e) => {
              console.log('Change trajectory time range:', e.target.value);
            }}
            className="bg-gray-700 text-white text-xs rounded px-1 py-0.5"
          >
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </div>

      {/* Person Count Display */}
      <div className="absolute top-4 right-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-lg p-3">
        <div className="text-white text-sm font-semibold mb-1">Live Tracking</div>
        <div className="text-orange-400 text-lg font-bold">
          {currentPersons.length} person{currentPersons.length !== 1 ? 's' : ''}
        </div>
        <div className="text-gray-400 text-xs">
          {cameraPositions.length} camera{cameraPositions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        {/* Map bounds controller */}
        <MapBoundsController environment={environment} cameraPositions={cameraPositions} />

        {/* Base tile layer */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={22} />

        {/* Camera position markers */}
        {cameraPositions.map((camera) => {
          const isFocused = focusedCameraId === camera.id;
          const displayName = getCameraDisplayName(camera.id, environment);

          return (
            <Marker
              key={`camera-${camera.id}`}
              position={camera.position}
              icon={createCameraMarker(camera.id, isFocused)}
              eventHandlers={{
                click: () => handleCameraClick(camera.id),
              }}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">{displayName}</div>
                  <div className="text-xs text-gray-600">Camera {camera.id}</div>
                  {isFocused && (
                    <div className="text-xs text-orange-600 font-semibold">🎯 Focused</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Camera field of view */}
        {showCameraFOV &&
          cameraPositions.map((camera) => {
            if (!camera.fieldOfView) return null;

            const { angle, distance, direction } = camera.fieldOfView;
            const [lat, lng] = camera.position;

            // Calculate FOV polygon points (simplified triangle)
            const angleRad = (angle * Math.PI) / 180;
            const directionRad = (direction * Math.PI) / 180;

            const point1 = [
              lat + (distance * Math.cos(directionRad - angleRad / 2)) / 111320,
              lng +
                (distance * Math.sin(directionRad - angleRad / 2)) /
                  (111320 * Math.cos((lat * Math.PI) / 180)),
            ] as [number, number];

            const point2 = [
              lat + (distance * Math.cos(directionRad + angleRad / 2)) / 111320,
              lng +
                (distance * Math.sin(directionRad + angleRad / 2)) /
                  (111320 * Math.cos((lat * Math.PI) / 180)),
            ] as [number, number];

            return (
              <React.Fragment key={`fov-${camera.id}`}>
                <Polyline
                  positions={[camera.position, point1, point2, camera.position]}
                  color={focusedCameraId === camera.id ? '#FF6B35' : '#118AB2'}
                  weight={2}
                  opacity={0.6}
                  fillOpacity={0.1}
                />
              </React.Fragment>
            );
          })}

        {/* Current person positions */}
        {currentPersons.map(({ person, cameraId }) => {
          if (!person.map_coords) return null;

          const personId = person.global_id || `${person.track_id}`;
          const isSelected = selectedPersonIds.has(personId);
          const color = getPersonColor(personId, isSelected);

          return (
            <Marker
              key={`person-${personId}-${cameraId}`}
              position={person.map_coords}
              icon={createPersonMarker(color, isSelected)}
              eventHandlers={{
                click: () => handlePersonClick(person, cameraId),
                mouseover: () => onPersonHover?.(person, cameraId),
                mouseout: () => onPersonHover?.(null, cameraId),
              }}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">Person {personId}</div>
                  <div className="text-xs text-gray-600">Camera {cameraId}</div>
                  {person.confidence && (
                    <div className="text-xs">
                      Confidence: {Math.round(person.confidence * 100)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-600">
                    Coords: ({person.map_coords[0].toFixed(3)}, {person.map_coords[1].toFixed(3)})
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Person trajectories */}
        {filteredTrajectories.map((trajectory) => {
          const isSelected = selectedPersonIds.has(trajectory.personId);
          const color = getPersonColor(trajectory.personId, isSelected);
          const positions = trajectory.path.map((point) => point.coords);

          return (
            <Polyline
              key={`trajectory-${trajectory.personId}`}
              positions={positions}
              color={color}
              weight={isSelected ? 4 : 2}
              opacity={isSelected ? 0.9 : 0.6}
              dashArray={isSelected ? undefined : '5, 10'}
            />
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2">
        <h4 className="text-white text-xs font-semibold">Legend</h4>
        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span>Cameras</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <div className="w-3 h-3 bg-lime-400 rounded-full"></div>
          <span>Current Persons</span>
        </div>
        {showTrajectories && (
          <div className="flex items-center space-x-2 text-xs text-gray-300">
            <div className="w-3 h-0.5 bg-gray-400" style={{ borderTop: '2px dashed' }}></div>
            <span>Paths</span>
          </div>
        )}
        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;
