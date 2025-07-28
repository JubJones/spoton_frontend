import React, { useRef, useEffect, useState } from 'react';
import { useMappingStore, useTrackingStore } from '../../../stores';

interface SpatialMapProps {
  className?: string;
  onPersonClick?: (personId: number) => void;
}

interface MapPoint {
  x: number;
  y: number;
  globalId: number;
  cameraId: string;
}

const SpatialMap: React.FC<SpatialMapProps> = ({ className = '', onPersonClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { mapPoints, pointColors, showMapPoints } = useMappingStore();
  const { selectedPersonId } = useTrackingStore();
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Camera names for quadrant labeling
  const cameraNames = ['Camera 1', 'Camera 2', 'Camera 3', 'Camera 4'];
  const appCameraIds = ['camera1', 'camera2', 'camera3', 'camera4'];

  // Camera ID mapping
  const appCameraIdToJsonId: Record<string, string> = {
    'camera1': 'c09',
    'camera2': 'c12',
    'camera3': 'c13',
    'camera4': 'c16',
  };

  // Measure container dimensions
  useEffect(() => {
    const mapElement = mapContainerRef.current;
    if (!mapElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
      }
    });

    resizeObserver.observe(mapElement);
    setContainerDimensions({ width: mapElement.offsetWidth, height: mapElement.offsetHeight });

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate scaled map points for each camera quadrant
  const getScaledMapPoints = (): Record<string, MapPoint[]> => {
    if (!containerDimensions.width || !containerDimensions.height) {
      return {};
    }

    const quadrantWidth = containerDimensions.width / 2;
    const quadrantHeight = containerDimensions.height / 2;
    const sourceWidth = 1920;
    const sourceHeight = 1080;
    const scaleX = quadrantWidth / sourceWidth;
    const scaleY = quadrantHeight / sourceHeight;

    const scaledPoints: Record<string, MapPoint[]> = {};

    Object.entries(mapPoints).forEach(([jsonCameraId, points]) => {
      scaledPoints[jsonCameraId] = points.map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
        globalId: point.personId,
        cameraId: jsonCameraId,
      }));
    });

    return scaledPoints;
  };

  const scaledMapPoints = getScaledMapPoints();

  const handlePersonClick = (personId: number) => {
    if (onPersonClick) {
      onPersonClick(personId);
    }
  };

  const getPointColor = (cameraId: string): string => {
    return pointColors[cameraId] || '#6b7280'; // Default gray
  };

  const getQuadrantPosition = (index: number): { x: number; y: number } => {
    const quadrantWidth = containerDimensions.width / 2;
    const quadrantHeight = containerDimensions.height / 2;
    
    return {
      x: (index % 2) * quadrantWidth,
      y: Math.floor(index / 2) * quadrantHeight,
    };
  };

  return (
    <div
      ref={mapContainerRef}
      className={`relative bg-gray-700 rounded-md overflow-hidden ${className}`}
    >
      {/* Grid Lines */}
      <div className="absolute inset-0">
        {/* Vertical line */}
        <div
          className="absolute bg-gray-600"
          style={{
            left: '50%',
            top: '0',
            width: '1px',
            height: '100%',
            transform: 'translateX(-50%)',
          }}
        />
        {/* Horizontal line */}
        <div
          className="absolute bg-gray-600"
          style={{
            left: '0',
            top: '50%',
            width: '100%',
            height: '1px',
            transform: 'translateY(-50%)',
          }}
        />
      </div>

      {/* Camera Quadrants */}
      {appCameraIds.map((appId, index) => {
        const jsonCameraId = appCameraIdToJsonId[appId];
        const position = getQuadrantPosition(index);
        const quadrantWidth = containerDimensions.width / 2;
        const quadrantHeight = containerDimensions.height / 2;
        const pointsForQuadrant = scaledMapPoints[jsonCameraId] || [];

        return (
          <div
            key={jsonCameraId}
            className="absolute bg-gray-800"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${quadrantWidth}px`,
              height: `${quadrantHeight}px`,
            }}
          >
            {/* Camera Name Label */}
            <div className="absolute top-1 left-1 text-xs text-gray-400 opacity-75 pointer-events-none">
              {cameraNames[index]}
            </div>

            {/* Map Points */}
            {showMapPoints && pointsForQuadrant.map((point) => {
              const isSelected = selectedPersonId === point.globalId;
              const baseColor = getPointColor(point.cameraId);
              
              return (
                <div
                  key={point.globalId}
                  className={`absolute rounded-full cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'w-3 h-3 ring-2 ring-white shadow-lg' 
                      : 'w-2 h-2 hover:w-3 hover:h-3 shadow-md'
                  }`}
                  style={{
                    left: `${point.x}px`,
                    top: `${point.y}px`,
                    backgroundColor: baseColor,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelected ? 10 : 5,
                  }}
                  onClick={() => handlePersonClick(point.globalId)}
                  title={`Person ${point.globalId} (${cameraNames[index]})`}
                />
              );
            })}
          </div>
        );
      })}

      {/* Map Title */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm text-gray-300 bg-gray-900/60 px-2 py-1 rounded">
        Spatial Map - Floor 1
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-gray-900/80 rounded p-2 text-xs text-gray-300">
        <div className="font-semibold mb-1">Cameras</div>
        {appCameraIds.map((appId, index) => {
          const jsonCameraId = appCameraIdToJsonId[appId];
          const color = getPointColor(jsonCameraId);
          const pointCount = scaledMapPoints[jsonCameraId]?.length || 0;
          
          return (
            <div key={jsonCameraId} className="flex items-center space-x-1 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{cameraNames[index]}</span>
              <span className="text-gray-400">({pointCount})</span>
            </div>
          );
        })}
      </div>

      {/* No Data Message */}
      {containerDimensions.width === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          Map Visualization Area
        </div>
      )}
    </div>
  );
};

export default SpatialMap;