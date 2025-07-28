import React, { useState, useEffect } from 'react';
import { SpatialTrajectory, TrajectoryPoint } from '../../../services/types/api';

interface TrajectoryPathProps {
  trajectories: SpatialTrajectory[];
  className?: string;
  selectedPersonId?: string;
  showVelocity?: boolean;
  showTimestamps?: boolean;
  animationSpeed?: number;
  onTrajectoryClick?: (trajectory: SpatialTrajectory) => void;
  onPointClick?: (point: TrajectoryPoint, trajectory: SpatialTrajectory) => void;
}

export const TrajectoryPath: React.FC<TrajectoryPathProps> = ({
  trajectories,
  className = '',
  selectedPersonId,
  showVelocity = false,
  showTimestamps = false,
  animationSpeed = 1,
  onTrajectoryClick,
  onPointClick
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredTrajectory, setHoveredTrajectory] = useState<string | null>(null);
  const [playAnimation, setPlayAnimation] = useState(false);

  // Animation control
  useEffect(() => {
    if (!playAnimation) return;

    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 1) {
          setPlayAnimation(false);
          return 1;
        }
        return prev + (0.01 * animationSpeed);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [playAnimation, animationSpeed]);

  const getTrajectoryColor = (trajectory: SpatialTrajectory) => {
    if (selectedPersonId === trajectory.personId) {
      return '#ef4444'; // red for selected
    }
    if (hoveredTrajectory === trajectory.personId) {
      return '#3b82f6'; // blue for hovered
    }
    
    // Color based on person ID hash
    const hash = trajectory.personId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];
    return colors[hash % colors.length];
  };

  const getVelocityColor = (velocity: number) => {
    // Normalize velocity to color scale (0-2 m/s typical walking speed)
    const normalizedVelocity = Math.min(velocity / 2, 1);
    const hue = (1 - normalizedVelocity) * 120; // Green to red
    return `hsl(${hue}, 70%, 50%)`;
  };

  const calculateVelocity = (point1: TrajectoryPoint, point2: TrajectoryPoint) => {
    const distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
    const timeDiff = (new Date(point2.timestamp).getTime() - new Date(point1.timestamp).getTime()) / 1000;
    return timeDiff > 0 ? distance / timeDiff : 0;
  };

  const handleTrajectoryClick = (trajectory: SpatialTrajectory) => {
    if (onTrajectoryClick) {
      onTrajectoryClick(trajectory);
    }
  };

  const handlePointClick = (point: TrajectoryPoint, trajectory: SpatialTrajectory) => {
    if (onPointClick) {
      onPointClick(point, trajectory);
    }
  };

  const toggleAnimation = () => {
    if (playAnimation) {
      setPlayAnimation(false);
    } else {
      setAnimationProgress(0);
      setPlayAnimation(true);
    }
  };

  const resetAnimation = () => {
    setAnimationProgress(0);
    setPlayAnimation(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Animation Controls */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-2 shadow-lg z-10">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAnimation}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {playAnimation ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={resetAnimation}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Reset
          </button>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-600">Speed:</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="w-16"
            />
          </div>
        </div>
      </div>

      {/* Trajectory SVG */}
      <svg className="w-full h-full">
        {trajectories.map((trajectory, trajectoryIndex) => {
          const isSelected = selectedPersonId === trajectory.personId;
          const isHovered = hoveredTrajectory === trajectory.personId;
          const color = getTrajectoryColor(trajectory);
          
          // Calculate how many points to show based on animation progress
          const pointsToShow = Math.floor(trajectory.path.length * animationProgress);
          const visiblePath = playAnimation ? trajectory.path.slice(0, pointsToShow) : trajectory.path;
          
          return (
            <g key={trajectory.personId}>
              {/* Trajectory path */}
              {visiblePath.length > 1 && (
                <polyline
                  points={visiblePath.map(point => `${(point.x + 50) * 8},${(point.y + 50) * 6}`).join(' ')}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                  strokeOpacity={isSelected ? 1 : isHovered ? 0.8 : 0.6}
                  fill="none"
                  className="cursor-pointer hover:stroke-opacity-100"
                  onClick={() => handleTrajectoryClick(trajectory)}
                  onMouseEnter={() => setHoveredTrajectory(trajectory.personId)}
                  onMouseLeave={() => setHoveredTrajectory(null)}
                />
              )}

              {/* Trajectory points */}
              {visiblePath.map((point, pointIndex) => {
                const velocity = pointIndex > 0 ? calculateVelocity(visiblePath[pointIndex - 1], point) : 0;
                const pointColor = showVelocity ? getVelocityColor(velocity) : color;
                
                return (
                  <g key={pointIndex}>
                    {/* Point circle */}
                    <circle
                      cx={(point.x + 50) * 8}
                      cy={(point.y + 50) * 6}
                      r={isSelected ? 4 : isHovered ? 3 : 2}
                      fill={pointColor}
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-pointer hover:r-5"
                      onClick={() => handlePointClick(point, trajectory)}
                    />

                    {/* Direction arrow */}
                    {pointIndex > 0 && (isSelected || isHovered) && (
                      <g>
                        {(() => {
                          const prevPoint = visiblePath[pointIndex - 1];
                          const dx = point.x - prevPoint.x;
                          const dy = point.y - prevPoint.y;
                          const angle = Math.atan2(dy, dx);
                          const arrowLength = 8;
                          const arrowX = (point.x + 50) * 8;
                          const arrowY = (point.y + 50) * 6;
                          
                          return (
                            <polygon
                              points={`${arrowX},${arrowY} ${arrowX - arrowLength * Math.cos(angle - Math.PI / 6)},${arrowY - arrowLength * Math.sin(angle - Math.PI / 6)} ${arrowX - arrowLength * Math.cos(angle + Math.PI / 6)},${arrowY - arrowLength * Math.sin(angle + Math.PI / 6)}`}
                              fill={color}
                              opacity="0.7"
                            />
                          );
                        })()}
                      </g>
                    )}

                    {/* Timestamp label */}
                    {showTimestamps && (isSelected || isHovered) && pointIndex % 5 === 0 && (
                      <text
                        x={(point.x + 50) * 8}
                        y={(point.y + 50) * 6 - 8}
                        fontSize="10"
                        fill="black"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {new Date(point.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        })}
                      </text>
                    )}

                    {/* Velocity label */}
                    {showVelocity && velocity > 0 && (isSelected || isHovered) && pointIndex % 3 === 0 && (
                      <text
                        x={(point.x + 50) * 8}
                        y={(point.y + 50) * 6 + 15}
                        fontSize="8"
                        fill="gray"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {velocity.toFixed(1)} m/s
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Start point marker */}
              {visiblePath.length > 0 && (
                <circle
                  cx={(visiblePath[0].x + 50) * 8}
                  cy={(visiblePath[0].y + 50) * 6}
                  r="6"
                  fill="green"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onClick={() => handleTrajectoryClick(trajectory)}
                />
              )}

              {/* End point marker */}
              {visiblePath.length > 1 && (
                <circle
                  cx={(visiblePath[visiblePath.length - 1].x + 50) * 8}
                  cy={(visiblePath[visiblePath.length - 1].y + 50) * 6}
                  r="6"
                  fill="red"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onClick={() => handleTrajectoryClick(trajectory)}
                />
              )}

              {/* Person ID label */}
              {(isSelected || isHovered) && visiblePath.length > 0 && (
                <text
                  x={(visiblePath[0].x + 50) * 8}
                  y={(visiblePath[0].y + 50) * 6 - 12}
                  fontSize="12"
                  fill="black"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  Person {trajectory.personId}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Trajectory Statistics */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">Trajectory Statistics</h4>
        <div className="space-y-1 text-xs">
          <div>Total Trajectories: {trajectories.length}</div>
          <div>Selected: {selectedPersonId || 'None'}</div>
          <div>Animation Progress: {Math.round(animationProgress * 100)}%</div>
          {selectedPersonId && (
            <div>
              {(() => {
                const selectedTrajectory = trajectories.find(t => t.personId === selectedPersonId);
                return selectedTrajectory ? (
                  <>
                    <div>Distance: {selectedTrajectory.totalDistance.toFixed(1)} units</div>
                    <div>Avg Speed: {selectedTrajectory.averageSpeed.toFixed(1)} m/s</div>
                    <div>Dwell Time: {Math.round(selectedTrajectory.dwellTime / 1000)}s</div>
                  </>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Start Point</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>End Point</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-1 bg-gray-500 mr-2"></div>
            <span>Trajectory Path</span>
          </div>
          {showVelocity && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-red-400 rounded-full mr-2"></div>
              <span>Velocity (Green=Slow, Red=Fast)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrajectoryPath;