// src/components/PersonDetailPanel.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface PersonMovementMetrics {
  averageVelocity: number; // pixels/second
  maxVelocity: number;
  totalDistance: number; // pixels
  averageConfidence: number;
  timeInView: number; // seconds
  camerasCovered: BackendCameraId[];
  firstDetection: Date;
  lastDetection: Date;
}

interface PersonIdentityInfo {
  globalId: string;
  localIds: Record<BackendCameraId, string>;
  reidentificationConfidence: number;
  crossCameraMatches: Array<{
    fromCamera: BackendCameraId;
    toCamera: BackendCameraId;
    confidence: number;
    timestamp: Date;
  }>;
}

interface PersonDetailPanelProps {
  person: TrackedPerson;
  currentCamera: BackendCameraId;
  environment: EnvironmentId;
  className?: string;
  // Additional person data
  movementMetrics?: PersonMovementMetrics;
  identityInfo?: PersonIdentityInfo;
  historicalPositions?: Array<{
    timestamp: Date;
    cameraId: BackendCameraId;
    bbox: [number, number, number, number];
    mapCoords?: [number, number];
    confidence: number;
  }>;
  // Event handlers
  onFocusToggle?: (personId: string, shouldFocus: boolean) => void;
  onCameraSwitch?: (cameraId: BackendCameraId) => void;
  onExportData?: (personId: string) => void;
  onBookmark?: (personId: string, label: string) => void;
  // State
  isFocused?: boolean;
  isTracking?: boolean;
}

const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  currentCamera,
  environment,
  className = '',
  movementMetrics,
  identityInfo,
  historicalPositions = [],
  onFocusToggle,
  onCameraSwitch,
  onExportData,
  onBookmark,
  isFocused = false,
  isTracking = true,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'movement' | 'identity' | 'history'>(
    'overview'
  );
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);

  const personId = person.global_id || `${person.track_id}`;

  // Calculate real-time metrics
  const realTimeMetrics = useMemo(() => {
    const now = new Date();
    const detectionTime = movementMetrics?.firstDetection || now;
    const trackingDuration = (now.getTime() - detectionTime.getTime()) / 1000;

    return {
      currentConfidence: Math.round((person.confidence || 0) * 100),
      trackingDuration: Math.round(trackingDuration),
      currentVelocity: movementMetrics?.averageVelocity || 0,
      positionStability: person.confidence && person.confidence > 0.8 ? 'Stable' : 'Unstable',
    };
  }, [person, movementMetrics]);

  // Handle focus toggle
  const handleFocusToggle = useCallback(() => {
    onFocusToggle?.(personId, !isFocused);
  }, [personId, isFocused, onFocusToggle]);

  // Handle bookmark creation
  const handleBookmark = useCallback(() => {
    if (bookmarkLabel.trim()) {
      onBookmark?.(personId, bookmarkLabel.trim());
      setBookmarkLabel('');
      setShowBookmarkInput(false);
    }
  }, [personId, bookmarkLabel, onBookmark]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={`bg-black/40 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${isTracking ? 'bg-green-400' : 'bg-red-400'}`} />
            <div>
              <h3 className="text-lg font-semibold text-white">Person {personId}</h3>
              <p className="text-sm text-gray-400">
                Camera {getCameraDisplayName(currentCamera, environment)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFocusToggle}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                isFocused
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
            >
              {isFocused ? '🎯 Focused' : 'Focus'}
            </button>

            <button
              onClick={() => onExportData?.(personId)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
              title="Export tracking data"
            >
              📥 Export
            </button>

            <button
              onClick={() => setShowBookmarkInput(!showBookmarkInput)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
              title="Bookmark this person"
            >
              🔖
            </button>
          </div>
        </div>

        {/* Real-time Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Confidence:</span>
            <div
              className={`font-semibold ${
                realTimeMetrics.currentConfidence >= 80
                  ? 'text-green-400'
                  : realTimeMetrics.currentConfidence >= 60
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {realTimeMetrics.currentConfidence}%
            </div>
          </div>
          <div>
            <span className="text-gray-500">Tracking:</span>
            <div className="text-blue-400 font-semibold">
              {formatDuration(realTimeMetrics.trackingDuration)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Position:</span>
            <div
              className={`font-semibold ${person.map_coords ? 'text-green-400' : 'text-gray-400'}`}
            >
              {person.map_coords
                ? `(${person.map_coords[0].toFixed(1)}, ${person.map_coords[1].toFixed(1)})`
                : 'No coords'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <div
              className={`font-semibold ${
                realTimeMetrics.positionStability === 'Stable'
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`}
            >
              {realTimeMetrics.positionStability}
            </div>
          </div>
        </div>

        {/* Bookmark Input */}
        {showBookmarkInput && (
          <div className="mt-3 flex items-center space-x-2">
            <input
              type="text"
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
              placeholder="Bookmark label..."
              className="flex-1 px-3 py-1 bg-gray-700 text-white rounded text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleBookmark()}
            />
            <button
              onClick={handleBookmark}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              Save
            </button>
            <button
              onClick={() => setShowBookmarkInput(false)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'movement', label: 'Movement', icon: '🏃' },
          { id: 'identity', label: 'Identity', icon: '🆔' },
          { id: 'history', label: 'History', icon: '📝' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/10'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Current Detection</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Bounding Box:</span>
                  <div className="text-gray-300 font-mono text-xs">
                    [{person.bbox_xyxy.map((coord) => Math.round(coord)).join(', ')}]
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Class ID:</span>
                  <div className="text-gray-300">{person.class_id || 'Person'}</div>
                </div>
              </div>
            </div>

            {movementMetrics && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Session Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Time in View:</span>
                    <div className="text-blue-400 font-semibold">
                      {formatDuration(movementMetrics.timeInView)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Cameras:</span>
                    <div className="text-green-400 font-semibold">
                      {movementMetrics.camerasCovered.length}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Confidence:</span>
                    <div className="text-purple-400 font-semibold">
                      {Math.round(movementMetrics.averageConfidence * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Distance:</span>
                    <div className="text-orange-400 font-semibold">
                      {Math.round(movementMetrics.totalDistance)}px
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Movement Tab */}
        {selectedTab === 'movement' && movementMetrics && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Velocity Analysis</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Average Speed:</span>
                  <div className="text-green-400 font-semibold">
                    {Math.round(movementMetrics.averageVelocity)} px/s
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Max Speed:</span>
                  <div className="text-red-400 font-semibold">
                    {Math.round(movementMetrics.maxVelocity)} px/s
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Camera Coverage</h4>
              <div className="space-y-2">
                {movementMetrics.camerasCovered.map((cameraId) => (
                  <div key={cameraId} className="flex items-center justify-between">
                    <span className="text-gray-400">
                      {getCameraDisplayName(cameraId, environment)}
                    </span>
                    <button
                      onClick={() => onCameraSwitch?.(cameraId)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                    >
                      Switch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Identity Tab */}
        {selectedTab === 'identity' && identityInfo && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Global Identity</h4>
              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-gray-500">Global ID:</span>
                  <div className="text-orange-400 font-mono">{identityInfo.globalId}</div>
                </div>
                <div>
                  <span className="text-gray-500">Re-ID Confidence:</span>
                  <div
                    className={`font-semibold ${
                      identityInfo.reidentificationConfidence >= 0.8
                        ? 'text-green-400'
                        : identityInfo.reidentificationConfidence >= 0.6
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {Math.round(identityInfo.reidentificationConfidence * 100)}%
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Local Track IDs</h4>
              <div className="space-y-1">
                {Object.entries(identityInfo.localIds).map(([cameraId, localId]) => (
                  <div key={cameraId} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {getCameraDisplayName(cameraId as BackendCameraId, environment)}:
                    </span>
                    <span className="text-blue-400 font-mono">{localId}</span>
                  </div>
                ))}
              </div>
            </div>

            {identityInfo.crossCameraMatches.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Cross-Camera Matches</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {identityInfo.crossCameraMatches.map((match, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400">{match.fromCamera}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-green-400">{match.toCamera}</span>
                      </div>
                      <div className="text-gray-500">
                        {formatTimestamp(match.timestamp)}
                        <span className="ml-2 text-purple-400">
                          ({Math.round(match.confidence * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Detection History</h4>
              <div className="text-sm mb-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">First Seen:</span>
                    <div className="text-green-400">
                      {movementMetrics?.firstDetection
                        ? formatTimestamp(movementMetrics.firstDetection)
                        : 'Current session'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Seen:</span>
                    <div className="text-blue-400">
                      {movementMetrics?.lastDetection
                        ? formatTimestamp(movementMetrics.lastDetection)
                        : 'Now'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {historicalPositions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Positions</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {historicalPositions
                    .slice(-10)
                    .reverse()
                    .map((position, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs p-2 bg-gray-800/50 rounded"
                      >
                        <div>
                          <div className="text-blue-400">
                            {getCameraDisplayName(position.cameraId, environment)}
                          </div>
                          <div className="text-gray-500">{formatTimestamp(position.timestamp)}</div>
                        </div>
                        <div className="text-right">
                          {position.mapCoords && (
                            <div className="text-green-400 font-mono">
                              ({position.mapCoords[0].toFixed(1)},{' '}
                              {position.mapCoords[1].toFixed(1)})
                            </div>
                          )}
                          <div className="text-purple-400">
                            {Math.round(position.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonDetailPanel;
