import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Detection, TrackingResult } from '../../../services/types/api';
import { useTrackingStore } from '../../../stores/trackingStore';
import { useDetectionStore } from '../../../stores/detectionStore';

interface PlaybackControlsProps {
  onTimeChange?: (timestamp: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  className?: string;
  showTimeline?: boolean;
  showSpeedControls?: boolean;
  showBookmarks?: boolean;
  enableJumpToEvent?: boolean;
  enableLooping?: boolean;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;
  isLooping: boolean;
  isMuted: boolean;
  bufferedRanges: BufferedRange[];
  quality: 'auto' | 'high' | 'medium' | 'low';
}

interface BufferedRange {
  start: number;
  end: number;
}

interface BookmarkData {
  id: string;
  timestamp: number;
  title: string;
  description?: string;
  type: 'detection' | 'tracking' | 'event' | 'manual';
  personId?: string;
  cameraId?: string;
}

interface EventMarker {
  timestamp: number;
  type: 'detection_start' | 'detection_end' | 'tracking_start' | 'tracking_end' | 'camera_switch';
  description: string;
  personId?: string;
  cameraId?: string;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8];
const SKIP_INTERVALS = [5, 10, 30, 60]; // seconds

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  onTimeChange,
  onPlaybackStateChange,
  onSpeedChange,
  className = '',
  showTimeline = true,
  showSpeedControls = true,
  showBookmarks = true,
  enableJumpToEvent = true,
  enableLooping = true,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 3600, // 1 hour default
    speed: 1,
    volume: 100,
    isLooping: false,
    isMuted: false,
    bufferedRanges: [],
    quality: 'auto',
  });

  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [eventMarkers, setEventMarkers] = useState<EventMarker[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkData | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const playbackInterval = useRef<number | null>(null);

  // Store hooks
  const { trackingHistory, trackingTargets } = useTrackingStore();
  const { detectionHistory } = useDetectionStore();

  // Initialize timeline data
  useEffect(() => {
    const initializeTimeline = () => {
      // Calculate duration from available data
      const allTimestamps = [
        ...trackingHistory.flatMap(h => h.positions.map(p => p.timestamp)),
        ...detectionHistory.map(d => new Date(d.timestamp).getTime()),
      ];

      if (allTimestamps.length > 0) {
        const minTime = Math.min(...allTimestamps);
        const maxTime = Math.max(...allTimestamps);
        const duration = (maxTime - minTime) / 1000; // Convert to seconds

        setPlaybackState(prev => ({
          ...prev,
          duration: Math.max(duration, 60), // Minimum 1 minute
        }));

        // Generate event markers
        generateEventMarkers(minTime, maxTime);
      }
    };

    initializeTimeline();
  }, [trackingHistory, detectionHistory]);

  // Generate event markers from data
  const generateEventMarkers = useCallback((startTime: number, endTime: number) => {
    const markers: EventMarker[] = [];

    // Add detection events
    detectionHistory.forEach(detection => {
      const timestamp = (new Date(detection.timestamp).getTime() - startTime) / 1000;
      if (timestamp >= 0 && timestamp <= (endTime - startTime) / 1000) {
        markers.push({
          timestamp,
          type: 'detection_start',
          description: `Person ${detection.personId} detected`,
          personId: detection.personId,
          cameraId: detection.cameraId,
        });
      }
    });

    // Add tracking events
    trackingHistory.forEach(track => {
      if (track.positions.length > 0) {
        const firstPos = track.positions[0];
        const lastPos = track.positions[track.positions.length - 1];
        
        const startTimestamp = (firstPos.timestamp - startTime) / 1000;
        const endTimestamp = (lastPos.timestamp - startTime) / 1000;

        if (startTimestamp >= 0 && startTimestamp <= (endTime - startTime) / 1000) {
          markers.push({
            timestamp: startTimestamp,
            type: 'tracking_start',
            description: `Tracking started for ${track.personId}`,
            personId: track.personId,
          });
        }

        if (endTimestamp >= 0 && endTimestamp <= (endTime - startTime) / 1000) {
          markers.push({
            timestamp: endTimestamp,
            type: 'tracking_end',
            description: `Tracking ended for ${track.personId}`,
            personId: track.personId,
          });
        }
      }
    });

    // Sort markers by timestamp
    markers.sort((a, b) => a.timestamp - b.timestamp);
    setEventMarkers(markers);
  }, [detectionHistory, trackingHistory]);

  // Playback control functions
  const handlePlay = useCallback(() => {
    setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    onPlaybackStateChange?.(true);

    playbackInterval.current = window.setInterval(() => {
      setPlaybackState(prev => {
        const newTime = prev.currentTime + (prev.speed * 0.1);
        const finalTime = newTime >= prev.duration ? 
          (prev.isLooping ? 0 : prev.duration) : newTime;

        onTimeChange?.(finalTime);

        if (finalTime >= prev.duration && !prev.isLooping) {
          return { ...prev, currentTime: finalTime, isPlaying: false };
        }

        return { ...prev, currentTime: finalTime };
      });
    }, 100);
  }, [onTimeChange, onPlaybackStateChange]);

  const handlePause = useCallback(() => {
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
    onPlaybackStateChange?.(false);
    
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
  }, [onPlaybackStateChange]);

  const handleStop = useCallback(() => {
    handlePause();
    setPlaybackState(prev => ({ ...prev, currentTime: 0 }));
    onTimeChange?.(0);
  }, [handlePause, onTimeChange]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setPlaybackState(prev => ({ ...prev, speed: newSpeed }));
    onSpeedChange?.(newSpeed);
  }, [onSpeedChange]);

  const handleSeek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, playbackState.duration));
    setPlaybackState(prev => ({ ...prev, currentTime: clampedTime }));
    onTimeChange?.(clampedTime);
  }, [playbackState.duration, onTimeChange]);

  const handleSkip = useCallback((seconds: number) => {
    handleSeek(playbackState.currentTime + seconds);
  }, [playbackState.currentTime, handleSeek]);

  // Timeline interaction
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * playbackState.duration;

    handleSeek(time);
  }, [playbackState.duration, handleSeek]);

  const handleTimelineDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * playbackState.duration;

    setDragPosition(time);
  }, [isDragging, playbackState.duration]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragPosition(playbackState.currentTime);
  }, [playbackState.currentTime]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      handleSeek(dragPosition);
      setIsDragging(false);
    }
  }, [isDragging, dragPosition, handleSeek]);

  // Bookmark functions
  const handleAddBookmark = useCallback((timestamp?: number) => {
    const bookmarkTime = timestamp ?? playbackState.currentTime;
    const newBookmark: BookmarkData = {
      id: Date.now().toString(),
      timestamp: bookmarkTime,
      title: `Bookmark ${bookmarks.length + 1}`,
      description: `Bookmark at ${formatTime(bookmarkTime)}`,
      type: 'manual',
    };

    setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.timestamp - b.timestamp));
  }, [playbackState.currentTime, bookmarks.length]);

  const handleDeleteBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  }, []);

  const handleJumpToBookmark = useCallback((bookmark: BookmarkData) => {
    handleSeek(bookmark.timestamp);
    setSelectedBookmark(bookmark);
  }, [handleSeek]);

  // Jump to event
  const handleJumpToEvent = useCallback((marker: EventMarker) => {
    handleSeek(marker.timestamp);
  }, [handleSeek]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          playbackState.isPlaying ? handlePause() : handlePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(5);
          break;
        case 'ArrowDown':
          e.preventDefault();
          const currentSpeedIndex = PLAYBACK_SPEEDS.indexOf(playbackState.speed);
          if (currentSpeedIndex > 0) {
            handleSpeedChange(PLAYBACK_SPEEDS[currentSpeedIndex - 1]);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          const currentSpeedIndex2 = PLAYBACK_SPEEDS.indexOf(playbackState.speed);
          if (currentSpeedIndex2 < PLAYBACK_SPEEDS.length - 1) {
            handleSpeedChange(PLAYBACK_SPEEDS[currentSpeedIndex2 + 1]);
          }
          break;
        case 'Home':
          e.preventDefault();
          handleSeek(0);
          break;
        case 'End':
          e.preventDefault();
          handleSeek(playbackState.duration);
          break;
        case 'b':
          e.preventDefault();
          handleAddBookmark();
          break;
        case 'l':
          e.preventDefault();
          setPlaybackState(prev => ({ ...prev, isLooping: !prev.isLooping }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState.isPlaying, playbackState.speed, playbackState.duration, handlePlay, handlePause, handleSkip, handleSeek, handleSpeedChange, handleAddBookmark]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, []);

  // Format time utility
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (playbackState.currentTime / playbackState.duration) * 100;
  const dragPercentage = isDragging ? (dragPosition / playbackState.duration) * 100 : progressPercentage;

  return (
    <div className={`bg-gray-900 text-white p-4 rounded-lg ${className}`}>
      {/* Timeline */}
      {showTimeline && (
        <div className="mb-4">
          <div
            ref={timelineRef}
            className="relative h-6 bg-gray-700 rounded-lg cursor-pointer"
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineDrag}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {/* Buffered ranges */}
            {playbackState.bufferedRanges.map((range, index) => (
              <div
                key={index}
                className="absolute h-full bg-gray-500 rounded-lg"
                style={{
                  left: `${(range.start / playbackState.duration) * 100}%`,
                  width: `${((range.end - range.start) / playbackState.duration) * 100}%`,
                }}
              />
            ))}

            {/* Progress bar */}
            <div
              className="absolute h-full bg-blue-500 rounded-lg transition-all duration-100"
              style={{ width: `${dragPercentage}%` }}
            />

            {/* Event markers */}
            {enableJumpToEvent && eventMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-0 h-full w-0.5 bg-yellow-400 cursor-pointer hover:bg-yellow-300"
                style={{ left: `${(marker.timestamp / playbackState.duration) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJumpToEvent(marker);
                }}
                title={marker.description}
              />
            ))}

            {/* Bookmarks */}
            {showBookmarks && bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="absolute -top-1 w-2 h-8 bg-red-500 rounded cursor-pointer hover:bg-red-400"
                style={{ left: `${(bookmark.timestamp / playbackState.duration) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJumpToBookmark(bookmark);
                }}
                title={bookmark.title}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute -top-1 w-3 h-8 bg-white rounded cursor-grab active:cursor-grabbing"
              style={{ left: `${dragPercentage}%`, transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between mt-2 text-sm text-gray-300">
            <span>{formatTime(playbackState.currentTime)}</span>
            <span>{formatTime(playbackState.duration)}</span>
          </div>
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center gap-4 mb-4">
        {/* Playback buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStop}
            className="p-2 hover:bg-gray-700 rounded"
            title="Stop (Home)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7zM12 7a1 1 0 10-2 0v6a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={playbackState.isPlaying ? handlePause : handlePlay}
            className="p-2 hover:bg-gray-700 rounded"
            title={playbackState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playbackState.isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zM11 8a1 1 0 112 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Skip buttons */}
          <button
            onClick={() => handleSkip(-10)}
            className="p-1 hover:bg-gray-700 rounded text-xs"
            title="Skip back 10s (←)"
          >
            -10s
          </button>
          <button
            onClick={() => handleSkip(10)}
            className="p-1 hover:bg-gray-700 rounded text-xs"
            title="Skip forward 10s (→)"
          >
            +10s
          </button>
        </div>

        {/* Speed controls */}
        {showSpeedControls && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Speed:</span>
            <select
              value={playbackState.speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
            >
              {PLAYBACK_SPEEDS.map(speed => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loop control */}
        {enableLooping && (
          <button
            onClick={() => setPlaybackState(prev => ({ ...prev, isLooping: !prev.isLooping }))}
            className={`p-2 hover:bg-gray-700 rounded ${playbackState.isLooping ? 'text-blue-400' : 'text-gray-400'}`}
            title="Loop (L)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Bookmark button */}
        {showBookmarks && (
          <button
            onClick={() => handleAddBookmark()}
            className="p-2 hover:bg-gray-700 rounded text-red-400"
            title="Add bookmark (B)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
          </button>
        )}
      </div>

      {/* Event markers list */}
      {enableJumpToEvent && eventMarkers.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-2">Events:</div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
            {eventMarkers.slice(0, 10).map((marker, index) => (
              <button
                key={index}
                onClick={() => handleJumpToEvent(marker)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                title={marker.description}
              >
                {formatTime(marker.timestamp)} - {marker.type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bookmarks list */}
      {showBookmarks && bookmarks.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-2">Bookmarks:</div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleJumpToBookmark(bookmark)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs"
                  title={bookmark.description}
                >
                  {formatTime(bookmark.timestamp)} - {bookmark.title}
                </button>
                <button
                  onClick={() => handleDeleteBookmark(bookmark.id)}
                  className="px-1 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                  title="Delete bookmark"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
        <div className="flex flex-wrap gap-4">
          <span>Space: Play/Pause</span>
          <span>←/→: Skip 5s</span>
          <span>↑/↓: Speed</span>
          <span>Home/End: Start/End</span>
          <span>B: Bookmark</span>
          <span>L: Loop</span>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;