import React, { useState, useEffect } from 'react';
import { TrajectoryPoint, CameraTransition } from '../../../services/types/api';
import { trackingAPI } from '../../../services/trackingAPI';

interface PersonTrajectoryProps {
  personId: string;
  className?: string;
  showTimeline?: boolean;
  showCameraTransitions?: boolean;
  onTrajectoryPointClick?: (point: TrajectoryPoint) => void;
}

export const PersonTrajectory: React.FC<PersonTrajectoryProps> = ({
  personId,
  className = '',
  showTimeline = true,
  showCameraTransitions = true,
  onTrajectoryPointClick
}) => {
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [transitions, setTransitions] = useState<CameraTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrajectory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await trackingAPI.getPersonTrajectory(personId, showCameraTransitions);
        setTrajectory(data.trajectory);
        setTransitions(data.transitions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trajectory');
      } finally {
        setIsLoading(false);
      }
    };

    if (personId) {
      fetchTrajectory();
    }
  }, [personId, showCameraTransitions]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = end.getTime() - start.getTime();
    return `${Math.round(duration / 1000)}s`;
  };

  const getCameraColor = (cameraId: string) => {
    const colors = {
      'camera_1': '#3b82f6', // blue
      'camera_2': '#ef4444', // red
      'camera_3': '#10b981', // green
      'camera_4': '#f59e0b', // yellow
    };
    return colors[cameraId as keyof typeof colors] || '#6b7280';
  };

  const handleTrajectoryPointClick = (point: TrajectoryPoint) => {
    if (onTrajectoryPointClick) {
      onTrajectoryPointClick(point);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading trajectory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 p-4 ${className}`}>
        <div className="font-semibold">Error loading trajectory:</div>
        <div>{error}</div>
      </div>
    );
  }

  if (trajectory.length === 0) {
    return (
      <div className={`text-gray-500 p-4 text-center ${className}`}>
        No trajectory data available for person {personId}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Person {personId} Trajectory</h3>
        <div className="text-sm text-gray-500">
          {trajectory.length} points • {formatDuration(trajectory[0].timestamp, trajectory[trajectory.length - 1].timestamp)}
        </div>
      </div>

      {/* Trajectory Path Visualization */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2">Path Overview</h4>
        <div className="relative h-32 bg-gray-50 rounded-lg overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Draw trajectory path */}
            {trajectory.length > 1 && (
              <polyline
                points={trajectory.map(point => `${(point.x + 50)},${(point.y + 50)}`).join(' ')}
                stroke="#3b82f6"
                strokeWidth="0.5"
                fill="none"
              />
            )}
            
            {/* Draw trajectory points */}
            {trajectory.map((point, index) => (
              <circle
                key={index}
                cx={point.x + 50}
                cy={point.y + 50}
                r="1"
                fill={getCameraColor(point.cameraId)}
                className="cursor-pointer hover:r-2 transition-all"
                onClick={() => handleTrajectoryPointClick(point)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Timeline View */}
      {showTimeline && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Timeline</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {trajectory.map((point, index) => (
              <div
                key={index}
                className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleTrajectoryPointClick(point)}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: getCameraColor(point.cameraId) }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{point.cameraId}</span>
                    <span className="text-xs text-gray-500">{formatTime(point.timestamp)}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Position: ({point.x.toFixed(1)}, {point.y.toFixed(1)}) • 
                    Confidence: {(point.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Transitions */}
      {showCameraTransitions && transitions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Camera Transitions</h4>
          <div className="space-y-2">
            {transitions.map((transition, index) => (
              <div key={transition.id} className="flex items-center p-2 bg-yellow-50 rounded-lg">
                <div className="flex items-center mr-3">
                  <div 
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: getCameraColor(transition.fromCameraId) }}
                  />
                  <span className="text-xs">→</span>
                  <div 
                    className="w-2 h-2 rounded-full ml-1"
                    style={{ backgroundColor: getCameraColor(transition.toCameraId) }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {transition.fromCameraId} → {transition.toCameraId}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(transition.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Duration: {Math.round(transition.duration / 1000)}s • 
                    Confidence: {(transition.confidence * 100).toFixed(0)}% • 
                    Type: {transition.transitionType}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Distance:</span>
            <span className="ml-2 font-medium">
              {trajectory.reduce((acc, point, index) => {
                if (index === 0) return acc;
                const prev = trajectory[index - 1];
                return acc + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
              }, 0).toFixed(1)} units
            </span>
          </div>
          <div>
            <span className="text-gray-500">Cameras Visited:</span>
            <span className="ml-2 font-medium">
              {new Set(trajectory.map(p => p.cameraId)).size}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Average Confidence:</span>
            <span className="ml-2 font-medium">
              {(trajectory.reduce((acc, point) => acc + point.confidence, 0) / trajectory.length * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Transitions:</span>
            <span className="ml-2 font-medium">{transitions.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonTrajectory;