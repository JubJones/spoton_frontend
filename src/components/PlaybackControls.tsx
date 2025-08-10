// src/components/PlaybackControls.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: Date;
  startTime: Date;
  endTime: Date;
  playbackSpeed: number;
  isLive: boolean;
  buffering: boolean;
}

interface PlaybackControlsProps {
  playbackState: PlaybackState;
  className?: string;
  // Playback control
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (timestamp: Date) => void;
  onSpeedChange?: (speed: number) => void;
  onLiveToggle?: (isLive: boolean) => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  // Time range control
  onTimeRangeChange?: (startTime: Date, endTime: Date) => void;
  // Export and recording
  onExportSegment?: (startTime: Date, endTime: Date) => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  // Additional features
  showFrameControls?: boolean;
  showSpeedControls?: boolean;
  showExportControls?: boolean;
  showRecordingControls?: boolean;
  isRecording?: boolean;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackState,
  className = '',
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  onLiveToggle,
  onStepForward,
  onStepBackward,
  onTimeRangeChange,
  onExportSegment,
  onStartRecording,
  onStopRecording,
  showFrameControls = true,
  showSpeedControls = true,
  showExportControls = true,
  showRecordingControls = false,
  isRecording = false,
}) => {
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);

  // Calculate playback progress
  const progress = useMemo(() => {
    const totalDuration = playbackState.endTime.getTime() - playbackState.startTime.getTime();
    const currentProgress = playbackState.currentTime.getTime() - playbackState.startTime.getTime();
    return totalDuration > 0 ? (currentProgress / totalDuration) * 100 : 0;
  }, [playbackState]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    const remaining = playbackState.endTime.getTime() - playbackState.currentTime.getTime();
    return Math.max(0, remaining / 1000); // in seconds
  }, [playbackState]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (playbackState.isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  }, [playbackState.isPlaying, onPlay, onPause]);

  // Handle timeline seek
  const handleTimelineSeek = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;

      const totalDuration = playbackState.endTime.getTime() - playbackState.startTime.getTime();
      const targetTime = new Date(playbackState.startTime.getTime() + totalDuration * percentage);

      onSeek?.(targetTime);
    },
    [playbackState, onSeek]
  );

  // Handle speed change
  const handleSpeedChange = useCallback(
    (speed: number) => {
      onSpeedChange?.(speed);
    },
    [onSpeedChange]
  );

  // Handle live toggle
  const handleLiveToggle = useCallback(() => {
    onLiveToggle?.(!playbackState.isLive);
  }, [playbackState.isLive, onLiveToggle]);

  // Handle segment selection
  const handleSegmentSelection = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isSelecting) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;

      const totalDuration = playbackState.endTime.getTime() - playbackState.startTime.getTime();
      const selectedTime = new Date(playbackState.startTime.getTime() + totalDuration * percentage);

      if (!selectedStartTime) {
        setSelectedStartTime(selectedTime);
      } else if (!selectedEndTime && selectedTime > selectedStartTime) {
        setSelectedEndTime(selectedTime);
        setIsSelecting(false);
      } else {
        // Reset selection
        setSelectedStartTime(selectedTime);
        setSelectedEndTime(null);
      }
    },
    [isSelecting, selectedStartTime, selectedEndTime, playbackState]
  );

  // Handle export
  const handleExport = useCallback(() => {
    if (selectedStartTime && selectedEndTime) {
      onExportSegment?.(selectedStartTime, selectedEndTime);
      setSelectedStartTime(null);
      setSelectedEndTime(null);
    }
  }, [selectedStartTime, selectedEndTime, onExportSegment]);

  // Format time duration
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) {
            onStepBackward?.();
          } else {
            const newTime = new Date(playbackState.currentTime.getTime() - 10000); // 10 seconds back
            onSeek?.(newTime);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) {
            onStepForward?.();
          } else {
            const newTime = new Date(playbackState.currentTime.getTime() + 10000); // 10 seconds forward
            onSeek?.(newTime);
          }
          break;
        case 'KeyL':
          event.preventDefault();
          handleLiveToggle();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playbackState, handlePlayPause, handleLiveToggle, onSeek, onStepForward, onStepBackward]);

  return (
    <div className={`bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Main Timeline */}
      <div className="p-4">
        {/* Timeline Container */}
        <div className="relative">
          {/* Timeline Track */}
          <div
            className="relative h-8 bg-gray-800 rounded-lg cursor-pointer overflow-hidden"
            onClick={isSelecting ? handleSegmentSelection : handleTimelineSeek}
          >
            {/* Progress Bar */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />

            {/* Buffering Indicator */}
            {playbackState.buffering && (
              <div className="absolute inset-0 bg-gray-600/50 animate-pulse" />
            )}

            {/* Current Time Indicator */}
            <div
              className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-200"
              style={{ left: `${Math.max(0, Math.min(100, progress))}%` }}
            />

            {/* Selected Segment */}
            {selectedStartTime && selectedEndTime && (
              <div
                className="absolute top-0 h-full bg-blue-500/40 border-l-2 border-r-2 border-blue-500"
                style={{
                  left: `${
                    ((selectedStartTime.getTime() - playbackState.startTime.getTime()) /
                      (playbackState.endTime.getTime() - playbackState.startTime.getTime())) *
                    100
                  }%`,
                  width: `${
                    ((selectedEndTime.getTime() - selectedStartTime.getTime()) /
                      (playbackState.endTime.getTime() - playbackState.startTime.getTime())) *
                    100
                  }%`,
                }}
              />
            )}

            {/* Live Indicator */}
            {playbackState.isLive && (
              <div className="absolute top-1 right-1 flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold">LIVE</span>
              </div>
            )}
          </div>

          {/* Time Labels */}
          <div className="flex justify-between items-center mt-2 text-sm text-gray-400">
            <span>{formatTimestamp(playbackState.startTime)}</span>
            <div className="flex items-center space-x-2">
              <span className="text-white font-semibold">
                {formatTimestamp(playbackState.currentTime)}
              </span>
              {!playbackState.isLive && <span>(-{formatDuration(remainingTime)})</span>}
            </div>
            <span>{formatTimestamp(playbackState.endTime)}</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-2">
            {/* Step Backward */}
            {showFrameControls && (
              <button
                onClick={onStepBackward}
                className="p-2 text-white hover:text-orange-400 transition-colors"
                title="Step backward (Shift + ←)"
              >
                ⏮️
              </button>
            )}

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              title="Play/Pause (Space)"
            >
              {playbackState.isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Step Forward */}
            {showFrameControls && (
              <button
                onClick={onStepForward}
                className="p-2 text-white hover:text-orange-400 transition-colors"
                title="Step forward (Shift + →)"
              >
                ⏭️
              </button>
            )}

            {/* Live Toggle */}
            <button
              onClick={handleLiveToggle}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                playbackState.isLive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
              title="Toggle live mode (L)"
            >
              {playbackState.isLive ? '🔴 LIVE' : '📺 GO LIVE'}
            </button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            {showSpeedControls && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Speed:</span>
                <select
                  value={playbackState.playbackSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                  disabled={playbackState.isLive}
                >
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Buffering Indicator */}
            {playbackState.buffering && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full" />
                <span className="text-sm">Buffering...</span>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Recording Controls */}
            {showRecordingControls && (
              <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                }`}
              >
                {isRecording ? '⏹️ Stop Recording' : '🔴 Record'}
              </button>
            )}

            {/* Export Controls */}
            {showExportControls && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsSelecting(!isSelecting)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isSelecting
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                >
                  {isSelecting ? '✂️ Selecting...' : '✂️ Select Segment'}
                </button>

                {selectedStartTime && selectedEndTime && (
                  <button
                    onClick={handleExport}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
                  >
                    📥 Export
                  </button>
                )}
              </div>
            )}

            {/* Time Range Picker */}
            <button
              onClick={() => setShowTimeRangePicker(!showTimeRangePicker)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Set time range"
            >
              📅
            </button>
          </div>
        </div>

        {/* Selection Info */}
        {(selectedStartTime || selectedEndTime || isSelecting) && (
          <div className="mt-3 p-2 bg-gray-800/50 rounded text-sm">
            {isSelecting && !selectedStartTime && (
              <div className="text-blue-400">Click on timeline to select start time</div>
            )}
            {isSelecting && selectedStartTime && !selectedEndTime && (
              <div className="text-blue-400">Click on timeline to select end time</div>
            )}
            {selectedStartTime && selectedEndTime && (
              <div className="flex items-center justify-between">
                <div className="text-gray-300">
                  Selected: {formatTimestamp(selectedStartTime)} -{' '}
                  {formatTimestamp(selectedEndTime)}
                  <span className="ml-2 text-gray-500">
                    (
                    {formatDuration(
                      (selectedEndTime.getTime() - selectedStartTime.getTime()) / 1000
                    )}
                    )
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedStartTime(null);
                    setSelectedEndTime(null);
                    setIsSelecting(false);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="mt-3 text-xs text-gray-500">
          <span className="font-semibold">Shortcuts:</span> Space (play/pause) | ← → (seek) |
          Shift+← → (frame step) | L (live)
        </div>
      </div>

      {/* Time Range Picker Modal */}
      {showTimeRangePicker && (
        <div className="absolute top-0 left-0 right-0 bg-gray-900 border border-gray-600 rounded-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold">Set Time Range</h4>
            <button
              onClick={() => setShowTimeRangePicker(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Time</label>
              <input
                type="datetime-local"
                defaultValue={playbackState.startTime.toISOString().slice(0, 16)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Time</label>
              <input
                type="datetime-local"
                defaultValue={playbackState.endTime.toISOString().slice(0, 16)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowTimeRangePicker(false)}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle time range update
                setShowTimeRangePicker(false);
              }}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaybackControls;
