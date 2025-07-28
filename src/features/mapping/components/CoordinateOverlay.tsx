import React, { useState, useEffect } from 'react';
import { Environment, CameraPosition } from '../../../services/types/api';
import { useMappingStore } from '../../../stores/mappingStore';

interface CoordinateOverlayProps {
  className?: string;
  environment?: Environment;
  cameraPositions?: CameraPosition[];
  showGrid?: boolean;
  showLabels?: boolean;
  coordinateSystem?: 'world' | 'camera' | 'pixel';
  onCoordinateClick?: (x: number, y: number, coordinateSystem: string) => void;
}

export const CoordinateOverlay: React.FC<CoordinateOverlayProps> = ({
  className = '',
  environment,
  cameraPositions = [],
  showGrid = true,
  showLabels = true,
  coordinateSystem = 'world',
  onCoordinateClick
}) => {
  const { currentMapping } = useMappingStore();
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null);

  // Get coordinate bounds from environment or default
  const bounds = environment?.mapBounds || {
    minX: -50,
    minY: -50,
    maxX: 50,
    maxY: 50
  };

  const coordinateRange = {
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  };

  // Convert world coordinates to screen coordinates
  const worldToScreen = (worldX: number, worldY: number, containerWidth: number, containerHeight: number) => {
    const x = ((worldX - bounds.minX) / coordinateRange.width) * containerWidth;
    const y = ((worldY - bounds.minY) / coordinateRange.height) * containerHeight;
    return { x, y };
  };

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number, containerWidth: number, containerHeight: number) => {
    const x = (screenX / containerWidth) * coordinateRange.width + bounds.minX;
    const y = (screenY / containerHeight) * coordinateRange.height + bounds.minY;
    return { x, y };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onCoordinateClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    const worldCoords = screenToWorld(screenX, screenY, rect.width, rect.height);
    onCoordinateClick(worldCoords.x, worldCoords.y, coordinateSystem);
  };

  const formatCoordinate = (value: number) => {
    return value.toFixed(2);
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Grid Overlay */}
      {showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Major grid lines */}
          {[-40, -20, 0, 20, 40].map(x => {
            const screenPos = worldToScreen(x, 0, 800, 600);
            return (
              <line
                key={`vertical-${x}`}
                x1={screenPos.x}
                y1={0}
                x2={screenPos.x}
                y2={600}
                stroke="#d1d5db"
                strokeWidth="1"
              />
            );
          })}
          
          {[-30, -15, 0, 15, 30].map(y => {
            const screenPos = worldToScreen(0, y, 800, 600);
            return (
              <line
                key={`horizontal-${y}`}
                x1={0}
                y1={screenPos.y}
                x2={800}
                y2={screenPos.y}
                stroke="#d1d5db"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      )}

      {/* Coordinate Labels */}
      {showLabels && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          {/* X-axis labels */}
          {[-40, -20, 0, 20, 40].map(x => {
            const screenPos = worldToScreen(x, bounds.minY, 800, 600);
            return (
              <div
                key={`x-label-${x}`}
                className="absolute text-xs text-gray-500 font-mono"
                style={{
                  left: screenPos.x - 10,
                  top: 10,
                  transform: 'translateX(-50%)'
                }}
              >
                {x}
              </div>
            );
          })}
          
          {/* Y-axis labels */}
          {[-30, -15, 0, 15, 30].map(y => {
            const screenPos = worldToScreen(bounds.minX, y, 800, 600);
            return (
              <div
                key={`y-label-${y}`}
                className="absolute text-xs text-gray-500 font-mono"
                style={{
                  left: 10,
                  top: screenPos.y - 6
                }}
              >
                {y}
              </div>
            );
          })}
        </div>
      )}

      {/* Origin marker */}
      <div 
        className="absolute w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: worldToScreen(0, 0, 800, 600).x,
          top: worldToScreen(0, 0, 800, 600).y,
          zIndex: 3
        }}
      />

      {/* Camera positions */}
      {cameraPositions.map(camera => {
        const screenPos = worldToScreen(camera.worldPosition.x, camera.worldPosition.y, 800, 600);
        return (
          <div
            key={camera.cameraId}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{
              left: screenPos.x,
              top: screenPos.y,
              zIndex: 4
            }}
            onMouseEnter={() => setHoveredCamera(camera.cameraId)}
            onMouseLeave={() => setHoveredCamera(null)}
          >
            {/* Camera icon */}
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
              hoveredCamera === camera.cameraId ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>

            {/* Camera label */}
            {(hoveredCamera === camera.cameraId || showLabels) && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {camera.cameraId}
                <div className="text-xs opacity-75">
                  ({formatCoordinate(camera.worldPosition.x)}, {formatCoordinate(camera.worldPosition.y)})
                </div>
              </div>
            )}

            {/* Field of view indicator */}
            {hoveredCamera === camera.cameraId && (
              <div
                className="absolute border-2 border-blue-300 border-opacity-50 rounded-full"
                style={{
                  width: `${camera.fieldOfView}px`,
                  height: `${camera.fieldOfView}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: -1
                }}
              />
            )}
          </div>
        );
      })}

      {/* Mouse position indicator */}
      {mousePosition && (
        <div
          className="absolute bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 30,
            zIndex: 10
          }}
        >
          {(() => {
            const worldCoords = screenToWorld(mousePosition.x, mousePosition.y, 800, 600);
            return `${coordinateSystem}: (${formatCoordinate(worldCoords.x)}, ${formatCoordinate(worldCoords.y)})`;
          })()}
        </div>
      )}

      {/* Coordinate system info */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-2 shadow-lg" style={{ zIndex: 5 }}>
        <div className="text-xs text-gray-600">
          <div className="font-semibold">Coordinate System</div>
          <div>Type: {coordinateSystem}</div>
          <div>Range: ({bounds.minX}, {bounds.minY}) to ({bounds.maxX}, {bounds.maxY})</div>
          <div>Units: {environment?.coordinateSystem || 'world'}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 rounded-lg p-2 shadow-lg" style={{ zIndex: 5 }}>
        <div className="text-xs text-gray-600">
          <div className="font-semibold mb-1">Legend</div>
          <div className="flex items-center mb-1">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            <span>Origin (0,0)</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="w-2 h-2 bg-gray-600 rounded-full mr-2"></div>
            <span>Camera Position</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span>Selected Camera</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinateOverlay;