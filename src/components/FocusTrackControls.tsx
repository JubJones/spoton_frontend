// src/components/FocusTrackControls.tsx
import React, { useState, useCallback, useMemo } from 'react';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface FocusedPerson {
  personId: string;
  globalId?: string;
  currentCamera: BackendCameraId;
  confidenceScore: number;
  focusStartTime: Date;
  bookmarks: Array<{
    timestamp: Date;
    label: string;
    cameraId: BackendCameraId;
    coordinates?: [number, number];
  }>;
}

interface FocusTrackControlsProps {
  environment: EnvironmentId;
  focusedPersons: FocusedPerson[];
  availableCameras: BackendCameraId[];
  className?: string;
  // Focus track state
  isFollowModeEnabled?: boolean;
  focusIntensity?: 'dim' | 'hide' | 'highlight'; // How to handle non-focused persons
  autoSwitchEnabled?: boolean; // Automatically switch cameras when person moves
  // Event handlers
  onPersonFocus?: (personId: string, shouldFocus: boolean) => void;
  onPersonUnfocus?: (personId: string) => void;
  onFollowModeToggle?: (enabled: boolean) => void;
  onFocusIntensityChange?: (intensity: 'dim' | 'hide' | 'highlight') => void;
  onAutoSwitchToggle?: (enabled: boolean) => void;
  onCameraSwitchForPerson?: (personId: string, cameraId: BackendCameraId) => void;
  onBookmarkCreate?: (personId: string, label: string) => void;
  onFocusHistoryExport?: (personIds: string[]) => void;
  onFocusSessionClear?: () => void;
}

const FocusTrackControls: React.FC<FocusTrackControlsProps> = ({
  environment,
  focusedPersons = [],
  availableCameras = [],
  className = '',
  isFollowModeEnabled = false,
  focusIntensity = 'dim',
  autoSwitchEnabled = false,
  onPersonFocus,
  onPersonUnfocus,
  onFollowModeToggle,
  onFocusIntensityChange,
  onAutoSwitchToggle,
  onCameraSwitchForPerson,
  onBookmarkCreate,
  onFocusHistoryExport,
  onFocusSessionClear,
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [showBookmarkInput, setShowBookmarkInput] = useState<string | null>(null);

  // Calculate focus session statistics
  const sessionStats = useMemo(() => {
    const now = new Date();
    const totalPersons = focusedPersons.length;
    const totalBookmarks = focusedPersons.reduce((sum, person) => sum + person.bookmarks.length, 0);
    const avgFocusTime =
      totalPersons > 0
        ? focusedPersons.reduce(
            (sum, person) => sum + (now.getTime() - person.focusStartTime.getTime()) / 1000,
            0
          ) / totalPersons
        : 0;

    return {
      totalPersons,
      totalBookmarks,
      avgFocusTime: Math.round(avgFocusTime),
      sessionDuration:
        totalPersons > 0
          ? Math.round(
              (now.getTime() - Math.min(...focusedPersons.map((p) => p.focusStartTime.getTime()))) /
                1000
            )
          : 0,
    };
  }, [focusedPersons]);

  // Handle person unfocus
  const handlePersonUnfocus = useCallback(
    (personId: string) => {
      onPersonUnfocus?.(personId);
      if (selectedPersonId === personId) {
        setSelectedPersonId(null);
      }
    },
    [selectedPersonId, onPersonUnfocus]
  );

  // Handle bookmark creation
  const handleBookmarkCreate = useCallback(
    (personId: string) => {
      if (bookmarkLabel.trim()) {
        onBookmarkCreate?.(personId, bookmarkLabel.trim());
        setBookmarkLabel('');
        setShowBookmarkInput(null);
      }
    },
    [bookmarkLabel, onBookmarkCreate]
  );

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  return (
    <div className={`bg-black/40 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Focus Track Controls</h3>
            <p className="text-sm text-gray-400">
              {focusedPersons.length} person{focusedPersons.length !== 1 ? 's' : ''} in focus
            </p>
          </div>

          {/* Global Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onFollowModeToggle?.(!isFollowModeEnabled)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                isFollowModeEnabled
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
              title="Automatically switch cameras when focused person moves"
            >
              {isFollowModeEnabled ? '👁️ Following' : '👁️ Follow'}
            </button>

            <button
              onClick={() => onAutoSwitchToggle?.(!autoSwitchEnabled)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                autoSwitchEnabled
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
              title="Automatically switch to best camera view"
            >
              🔄 Auto
            </button>
          </div>
        </div>

        {/* Session Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Session:</span>
            <div className="text-blue-400 font-semibold">
              {formatDuration(sessionStats.sessionDuration)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Avg Focus:</span>
            <div className="text-green-400 font-semibold">
              {formatDuration(sessionStats.avgFocusTime)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Bookmarks:</span>
            <div className="text-purple-400 font-semibold">{sessionStats.totalBookmarks}</div>
          </div>
          <div>
            <span className="text-gray-500">Persons:</span>
            <div className="text-orange-400 font-semibold">{sessionStats.totalPersons}</div>
          </div>
        </div>
      </div>

      {/* Focus Intensity Controls */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Focus Display Mode</h4>
        <div className="flex space-x-2">
          {[
            { value: 'highlight', label: 'Highlight Focused', icon: '✨' },
            { value: 'dim', label: 'Dim Others', icon: '🔅' },
            { value: 'hide', label: 'Hide Others', icon: '👻' },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => onFocusIntensityChange?.(mode.value as any)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                focusIntensity === mode.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Focused Persons List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Focused Persons</h4>

          {focusedPersons.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={() => onFocusHistoryExport?.(focusedPersons.map((p) => p.personId))}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                title="Export focus session data"
              >
                📥 Export
              </button>
              <button
                onClick={onFocusSessionClear}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                title="Clear all focused persons"
              >
                🗑️ Clear
              </button>
            </div>
          )}
        </div>

        {focusedPersons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">🎯</div>
            <div>No persons in focus</div>
            <div className="text-xs mt-1">
              Click on a person in the camera view to start focusing
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {focusedPersons.map((person) => {
              const focusDuration = (new Date().getTime() - person.focusStartTime.getTime()) / 1000;
              const isSelected = selectedPersonId === person.personId;

              return (
                <div
                  key={person.personId}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-orange-400 bg-orange-500/10'
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                  }`}
                >
                  {/* Person Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => setSelectedPersonId(isSelected ? null : person.personId)}
                    >
                      <div className="w-3 h-3 bg-orange-400 rounded-full" />
                      <div>
                        <div className="text-white font-semibold">
                          Person {person.globalId || person.personId}
                        </div>
                        <div className="text-xs text-gray-400">
                          {getCameraDisplayName(person.currentCamera, environment)} | Focus:{' '}
                          {formatDuration(Math.round(focusDuration))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Confidence Indicator */}
                      <div
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          person.confidenceScore >= 80
                            ? 'bg-green-500/20 text-green-400'
                            : person.confidenceScore >= 60
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {Math.round(person.confidenceScore)}%
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() =>
                          setShowBookmarkInput(
                            showBookmarkInput === person.personId ? null : person.personId
                          )
                        }
                        className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                        title="Add bookmark"
                      >
                        🔖
                      </button>

                      <button
                        onClick={() => handlePersonUnfocus(person.personId)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove from focus"
                      >
                        ❌
                      </button>
                    </div>
                  </div>

                  {/* Bookmark Input */}
                  {showBookmarkInput === person.personId && (
                    <div className="mb-2 flex items-center space-x-2">
                      <input
                        type="text"
                        value={bookmarkLabel}
                        onChange={(e) => setBookmarkLabel(e.target.value)}
                        placeholder="Bookmark label..."
                        className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                        onKeyPress={(e) =>
                          e.key === 'Enter' && handleBookmarkCreate(person.personId)
                        }
                      />
                      <button
                        onClick={() => handleBookmarkCreate(person.personId)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="space-y-3">
                      {/* Camera Controls */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-400 mb-2">Camera Control</h5>
                        <div className="flex flex-wrap gap-1">
                          {availableCameras.map((cameraId) => (
                            <button
                              key={cameraId}
                              onClick={() => onCameraSwitchForPerson?.(person.personId, cameraId)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                person.currentCamera === cameraId
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              }`}
                            >
                              {getCameraDisplayName(cameraId, environment)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Recent Bookmarks */}
                      {person.bookmarks.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 mb-2">
                            Recent Bookmarks ({person.bookmarks.length})
                          </h5>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {person.bookmarks
                              .slice(-3)
                              .reverse()
                              .map((bookmark, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-gray-300">{bookmark.label}</span>
                                  <div className="text-gray-500">
                                    {getCameraDisplayName(bookmark.cameraId, environment)} |{' '}
                                    {formatTime(bookmark.timestamp)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusTrackControls;
