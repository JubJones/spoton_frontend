import React, { useState, useEffect } from 'react';
import { CameraPosition, CameraConfig } from '../../../services/types/api';

interface CameraPositionsProps {
  cameras: CameraPosition[];
  className?: string;
  selectedCameraId?: string;
  showFieldOfView?: boolean;
  showLabels?: boolean;
  showViewingArea?: boolean;
  onCameraClick?: (camera: CameraPosition) => void;
  onCameraHover?: (camera: CameraPosition | null) => void;
}

export const CameraPositions: React.FC<CameraPositionsProps> = ({
  cameras,
  className = '',
  selectedCameraId,
  showFieldOfView = true,
  showLabels = true,
  showViewingArea = false,
  onCameraClick,
  onCameraHover
}) => {
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null);
  const [cameraStatuses, setCameraStatuses] = useState<Record<string, 'active' | 'inactive' | 'error'>>({});

  useEffect(() => {
    // Mock camera status updates
    const statusInterval = setInterval(() => {
      setCameraStatuses(prev => {
        const newStatuses = { ...prev };
        cameras.forEach(camera => {
          // Randomly update status for demo
          if (Math.random() < 0.1) {
            const statuses: ('active' | 'inactive' | 'error')[] = ['active', 'inactive', 'error'];
            newStatuses[camera.cameraId] = statuses[Math.floor(Math.random() * statuses.length)];
          } else if (!newStatuses[camera.cameraId]) {
            newStatuses[camera.cameraId] = 'active';
          }
        });
        return newStatuses;
      });
    }, 2000);

    return () => clearInterval(statusInterval);
  }, [cameras]);

  const getCameraStatusColor = (cameraId: string) => {
    const status = cameraStatuses[cameraId] || 'active';
    switch (status) {
      case 'active': return '#10b981'; // green
      case 'inactive': return '#f59e0b'; // yellow
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getCameraIcon = (status: 'active' | 'inactive' | 'error') => {
    switch (status) {
      case 'active': return '📹';
      case 'inactive': return '⏸️';
      case 'error': return '❌';
      default: return '📹';
    }
  };

  const handleCameraClick = (camera: CameraPosition) => {
    if (onCameraClick) {
      onCameraClick(camera);
    }
  };

  const handleCameraHover = (camera: CameraPosition | null) => {
    setHoveredCamera(camera?.cameraId || null);
    if (onCameraHover) {
      onCameraHover(camera);
    }
  };

  // Calculate field of view polygon points
  const calculateFieldOfViewPoints = (camera: CameraPosition) => {
    const { x, y, z } = camera.worldPosition;
    const { pitch, yaw, roll } = camera.orientation;
    const fov = camera.fieldOfView;
    
    // Convert FOV to radians
    const fovRad = (fov * Math.PI) / 180;
    const yawRad = (yaw * Math.PI) / 180;
    
    // Calculate viewing distance (arbitrary scale)
    const viewingDistance = 20;
    
    // Calculate field of view triangle points
    const leftAngle = yawRad - fovRad / 2;
    const rightAngle = yawRad + fovRad / 2;
    
    const leftX = x + viewingDistance * Math.cos(leftAngle);
    const leftY = y + viewingDistance * Math.sin(leftAngle);
    const rightX = x + viewingDistance * Math.cos(rightAngle);
    const rightY = y + viewingDistance * Math.sin(rightAngle);
    
    return [
      { x, y },
      { x: leftX, y: leftY },
      { x: rightX, y: rightY }
    ];
  };

  return (
    <div className={`relative ${className}`}>
      {/* Camera positions and field of view */}
      <svg className="w-full h-full">
        {cameras.map((camera, index) => {
          const isSelected = selectedCameraId === camera.cameraId;
          const isHovered = hoveredCamera === camera.cameraId;
          const status = cameraStatuses[camera.cameraId] || 'active';
          const statusColor = getCameraStatusColor(camera.cameraId);
          
          // Convert world coordinates to screen coordinates (assuming normalized range)
          const screenX = (camera.worldPosition.x + 50) * 8;
          const screenY = (camera.worldPosition.y + 50) * 6;
          
          return (
            <g key={camera.cameraId}>
              {/* Field of view */}
              {showFieldOfView && (
                <g>
                  {(() => {
                    const fovPoints = calculateFieldOfViewPoints(camera);
                    return (
                      <polygon
                        points={fovPoints.map(p => `${(p.x + 50) * 8},${(p.y + 50) * 6}`).join(' ')}
                        fill={statusColor}
                        fillOpacity={isSelected ? 0.3 : isHovered ? 0.2 : 0.1}
                        stroke={statusColor}
                        strokeWidth={isSelected ? 2 : 1}
                        strokeOpacity={0.5}
                        className="cursor-pointer"
                        onClick={() => handleCameraClick(camera)}
                      />
                    );
                  })()}
                </g>
              )}

              {/* Viewing area */}
              {showViewingArea && camera.viewingArea && (
                <polygon
                  points={camera.viewingArea.points.map(p => `${(p.x + 50) * 8},${(p.y + 50) * 6}`).join(' ')}
                  fill={statusColor}
                  fillOpacity={0.1}
                  stroke={statusColor}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  className="cursor-pointer"
                  onClick={() => handleCameraClick(camera)}
                />
              )}

              {/* Camera marker */}
              <g
                className="cursor-pointer"
                onClick={() => handleCameraClick(camera)}
                onMouseEnter={() => handleCameraHover(camera)}
                onMouseLeave={() => handleCameraHover(null)}
              >
                {/* Camera base */}
                <circle
                  cx={screenX}
                  cy={screenY}
                  r={isSelected ? 12 : isHovered ? 10 : 8}
                  fill={statusColor}
                  stroke="white"
                  strokeWidth={2}
                />

                {/* Camera direction indicator */}
                <g>
                  {(() => {
                    const yawRad = (camera.orientation.yaw * Math.PI) / 180;
                    const dirX = screenX + 6 * Math.cos(yawRad);
                    const dirY = screenY + 6 * Math.sin(yawRad);
                    
                    return (
                      <line
                        x1={screenX}
                        y1={screenY}
                        x2={dirX}
                        y2={dirY}
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    );
                  })()}
                </g>

                {/* Status indicator */}
                <circle
                  cx={screenX + 6}
                  cy={screenY - 6}
                  r="3"
                  fill={status === 'active' ? '#10b981' : status === 'inactive' ? '#f59e0b' : '#ef4444'}
                  stroke="white"
                  strokeWidth={1}
                />
              </g>

              {/* Camera label */}
              {showLabels && (
                <text
                  x={screenX}
                  y={screenY + 20}
                  fontSize="12"
                  fill="black"
                  textAnchor="middle"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  className="pointer-events-none"
                >
                  {camera.cameraId}
                </text>
              )}

              {/* Detailed info on hover */}
              {isHovered && (
                <g>
                  {/* Info background */}
                  <rect
                    x={screenX + 15}
                    y={screenY - 40}
                    width="120"
                    height="70"
                    fill="black"
                    fillOpacity="0.8"
                    rx="4"
                    className="pointer-events-none"
                  />
                  
                  {/* Info text */}
                  <text
                    x={screenX + 20}
                    y={screenY - 25}
                    fontSize="10"
                    fill="white"
                    className="pointer-events-none"
                  >
                    <tspan x={screenX + 20} dy="0">{camera.cameraId}</tspan>
                    <tspan x={screenX + 20} dy="12">Status: {status}</tspan>
                    <tspan x={screenX + 20} dy="12">
                      Pos: ({camera.worldPosition.x.toFixed(1)}, {camera.worldPosition.y.toFixed(1)})
                    </tspan>
                    <tspan x={screenX + 20} dy="12">FOV: {camera.fieldOfView}°</tspan>
                    <tspan x={screenX + 20} dy="12">
                      Yaw: {camera.orientation.yaw.toFixed(1)}°
                    </tspan>
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Camera list */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg max-w-xs">
        <h4 className="text-sm font-semibold mb-2">Cameras ({cameras.length})</h4>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {cameras.map(camera => {
            const status = cameraStatuses[camera.cameraId] || 'active';
            const isSelected = selectedCameraId === camera.cameraId;
            
            return (
              <div
                key={camera.cameraId}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleCameraClick(camera)}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCameraStatusColor(camera.cameraId) }}
                  />
                  <span className="text-sm font-medium">{camera.cameraId}</span>
                </div>
                <div className="text-xs text-gray-500 capitalize">{status}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Camera statistics */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">Camera Statistics</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Active: {Object.values(cameraStatuses).filter(s => s === 'active').length}</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            <span>Inactive: {Object.values(cameraStatuses).filter(s => s === 'inactive').length}</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            <span>Error: {Object.values(cameraStatuses).filter(s => s === 'error').length}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={showFieldOfView}
              onChange={(e) => {
                // This would need to be passed as a prop or managed by parent
              }}
              className="w-3 h-3"
            />
            <span className="text-xs">Field of View</span>
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => {
                // This would need to be passed as a prop or managed by parent
              }}
              className="w-3 h-3"
            />
            <span className="text-xs">Labels</span>
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={showViewingArea}
              onChange={(e) => {
                // This would need to be passed as a prop or managed by parent
              }}
              className="w-3 h-3"
            />
            <span className="text-xs">Viewing Area</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CameraPositions;