// src/components/PersonTrajectory.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';

interface TrajectoryPoint {
  coords: [number, number];
  timestamp: Date;
  cameraId: BackendCameraId;
  confidence: number;
  velocity?: number; // pixels/second
  direction?: number; // degrees
}

interface PersonTrajectoryData {
  personId: string;
  globalId?: string;
  firstSeen: Date;
  lastSeen: Date;
  totalDuration: number; // seconds
  totalDistance: number; // pixels
  averageVelocity: number; // pixels/second
  path: TrajectoryPoint[];
  cameraTransitions: Array<{
    fromCamera: BackendCameraId;
    toCamera: BackendCameraId;
    timestamp: Date;
    confidence: number;
  }>;
}

interface PersonTrajectoryProps {
  personId: string;
  trajectoryData: PersonTrajectoryData;
  environment: EnvironmentId;
  className?: string;
  // Display options
  showVelocity?: boolean;
  showDirection?: boolean;
  showCameraTransitions?: boolean;
  showStatistics?: boolean;
  animationSpeed?: number; // 1x, 2x, 4x, etc.
  // Event handlers
  onTimelineSeek?: (timestamp: Date) => void;
  onPlaybackToggle?: (isPlaying: boolean) => void;
}

const PersonTrajectory: React.FC<PersonTrajectoryProps> = ({
  personId,
  trajectoryData,
  environment,
  className = '',
  showVelocity = true,
  showDirection = false,
  showCameraTransitions = true,
  showStatistics = true,
  animationSpeed = 1,
  onTimelineSeek,
  onPlaybackToggle,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [selectedTimeRange, setSelectedTimeRange] = useState<[Date, Date] | null>(null);

  // Calculate trajectory statistics
  const statistics = useMemo(() => {
    const { path, totalDuration, totalDistance, averageVelocity, cameraTransitions } =
      trajectoryData;

    const maxVelocity = Math.max(...path.map((p) => p.velocity || 0));
    const avgConfidence = path.reduce((sum, p) => sum + p.confidence, 0) / path.length;
    const uniqueCameras = new Set(path.map((p) => p.cameraId)).size;

    return {
      duration: `${Math.round(totalDuration)}s`,
      distance: `${Math.round(totalDistance)}px`,
      avgVelocity: `${Math.round(averageVelocity)}px/s`,
      maxVelocity: `${Math.round(maxVelocity)}px/s`,
      avgConfidence: `${Math.round(avgConfidence * 100)}%`,
      uniqueCameras,
      transitions: cameraTransitions.length,
    };
  }, [trajectoryData]);

  // Handle playback control
  const handlePlaybackToggle = useCallback(() => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    onPlaybackToggle?.(newPlayingState);
  }, [isPlaying, onPlaybackToggle]);

  // Handle timeline seeking
  const handleTimelineSeek = useCallback(
    (timeIndex: number) => {
      setCurrentTimeIndex(timeIndex);
      if (trajectoryData.path[timeIndex]) {
        onTimelineSeek?.(trajectoryData.path[timeIndex].timestamp);
      }
    },
    [trajectoryData.path, onTimelineSeek]
  );

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Get velocity color based on speed
  const getVelocityColor = useCallback(
    (velocity: number) => {
      const maxVel = Math.max(...trajectoryData.path.map((p) => p.velocity || 0));
      const normalized = velocity / maxVel;

      if (normalized < 0.3) return '#00FF00'; // Green - slow
      if (normalized < 0.7) return '#FFD700'; // Yellow - medium
      return '#FF4500'; // Red - fast
    },
    [trajectoryData.path]
  );

  // Get confidence color
  const getConfidenceColor = useCallback((confidence: number) => {
    if (confidence >= 0.8) return '#00FF00'; // Green - high confidence
    if (confidence >= 0.6) return '#FFD700'; // Yellow - medium confidence
    return '#FF4500'; // Red - low confidence
  }, []);

  return (
    <div className={`bg-black/30 backdrop-blur-sm rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Person Trajectory</h3>
            <p className="text-sm text-gray-400">
              ID: {trajectoryData.globalId || personId} |{formatTimestamp(trajectoryData.firstSeen)}{' '}
              - {formatTimestamp(trajectoryData.lastSeen)}
            </p>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlaybackToggle}
              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>

            <select
              value={animationSpeed}
              onChange={(e) => {
                // This would be handled by parent component
                console.log('Animation speed changed:', e.target.value);
              }}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStatistics && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Trajectory Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Duration:</span>
              <div className="text-orange-400 font-semibold">{statistics.duration}</div>
            </div>
            <div>
              <span className="text-gray-500">Distance:</span>
              <div className="text-blue-400 font-semibold">{statistics.distance}</div>
            </div>
            <div>
              <span className="text-gray-500">Avg Speed:</span>
              <div className="text-green-400 font-semibold">{statistics.avgVelocity}</div>
            </div>
            <div>
              <span className="text-gray-500">Max Speed:</span>
              <div className="text-red-400 font-semibold">{statistics.maxVelocity}</div>
            </div>
            <div>
              <span className="text-gray-500">Avg Confidence:</span>
              <div className="text-purple-400 font-semibold">{statistics.avgConfidence}</div>
            </div>
            <div>
              <span className="text-gray-500">Cameras:</span>
              <div className="text-cyan-400 font-semibold">{statistics.uniqueCameras}</div>
            </div>
            <div>
              <span className="text-gray-500">Transitions:</span>
              <div className="text-yellow-400 font-semibold">{statistics.transitions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Scrubber */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Timeline</h4>

        {/* Timeline Bar */}
        <div className="relative bg-gray-800 rounded h-8 mb-2">
          {/* Path visualization */}
          <div className="absolute inset-0 flex items-center">
            {trajectoryData.path.map((point, index) => {
              const position = (index / (trajectoryData.path.length - 1)) * 100;
              const isCurrentPoint = index === currentTimeIndex;
              const opacity = showVelocity
                ? Math.max(
                    0.3,
                    (point.velocity || 0) /
                      Math.max(...trajectoryData.path.map((p) => p.velocity || 0))
                  )
                : 0.7;

              return (
                <div
                  key={index}
                  className={`absolute w-1 h-full transition-all duration-200 ${
                    isCurrentPoint ? 'bg-orange-400 h-8 z-10' : 'bg-blue-400'
                  }`}
                  style={{
                    left: `${position}%`,
                    opacity: isCurrentPoint ? 1 : opacity,
                    backgroundColor: isCurrentPoint
                      ? '#FB923C'
                      : showVelocity
                        ? getVelocityColor(point.velocity || 0)
                        : getConfidenceColor(point.confidence),
                  }}
                  onClick={() => handleTimelineSeek(index)}
                />
              );
            })}
          </div>

          {/* Camera transition markers */}
          {showCameraTransitions &&
            trajectoryData.cameraTransitions.map((transition, index) => {
              const transitionTime = transition.timestamp.getTime();
              const startTime = trajectoryData.firstSeen.getTime();
              const endTime = trajectoryData.lastSeen.getTime();
              const position = ((transitionTime - startTime) / (endTime - startTime)) * 100;

              return (
                <div
                  key={`transition-${index}`}
                  className="absolute top-0 w-0.5 h-full bg-red-500 z-20"
                  style={{ left: `${position}%` }}
                  title={`Camera transition: ${transition.fromCamera} → ${transition.toCamera}`}
                />
              );
            })}
        </div>

        {/* Timeline Labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTimestamp(trajectoryData.firstSeen)}</span>
          <span>
            Current:{' '}
            {trajectoryData.path[currentTimeIndex]
              ? formatTimestamp(trajectoryData.path[currentTimeIndex].timestamp)
              : '--:--:--'}
          </span>
          <span>{formatTimestamp(trajectoryData.lastSeen)}</span>
        </div>
      </div>

      {/* Current Point Details */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Current Position Details</h4>

        {trajectoryData.path[currentTimeIndex] ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Time:</span>
              <div className="text-white font-mono">
                {formatTimestamp(trajectoryData.path[currentTimeIndex].timestamp)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Camera:</span>
              <div className="text-blue-400 font-semibold">
                {trajectoryData.path[currentTimeIndex].cameraId}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Coordinates:</span>
              <div className="text-green-400 font-mono text-xs">
                ({trajectoryData.path[currentTimeIndex].coords[0].toFixed(1)},{' '}
                {trajectoryData.path[currentTimeIndex].coords[1].toFixed(1)})
              </div>
            </div>
            <div>
              <span className="text-gray-500">Confidence:</span>
              <div className="text-purple-400 font-semibold">
                {Math.round(trajectoryData.path[currentTimeIndex].confidence * 100)}%
              </div>
            </div>
            {showVelocity && trajectoryData.path[currentTimeIndex].velocity && (
              <div>
                <span className="text-gray-500">Velocity:</span>
                <div className="text-orange-400 font-semibold">
                  {Math.round(trajectoryData.path[currentTimeIndex].velocity || 0)} px/s
                </div>
              </div>
            )}
            {showDirection && trajectoryData.path[currentTimeIndex].direction && (
              <div>
                <span className="text-gray-500">Direction:</span>
                <div className="text-cyan-400 font-semibold">
                  {Math.round(trajectoryData.path[currentTimeIndex].direction || 0)}°
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No trajectory data available</div>
        )}
      </div>

      {/* Camera Transitions List */}
      {showCameraTransitions && trajectoryData.cameraTransitions.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Camera Transitions</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {trajectoryData.cameraTransitions.map((transition, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">{transition.fromCamera}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400">{transition.toCamera}</span>
                </div>
                <div className="text-gray-500">
                  {formatTimestamp(transition.timestamp)}
                  <span className="ml-2 text-purple-400">
                    ({Math.round(transition.confidence * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonTrajectory;
