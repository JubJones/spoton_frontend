// src/components/Timeline.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { TrackedPerson, BackendCameraId } from '../types/api';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'person_enter' | 'person_exit' | 'person_reid' | 'alert' | 'bookmark' | 'system_event';
  cameraId?: BackendCameraId;
  personId?: string;
  title: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  data?: any;
}

interface TimelineBookmark {
  id: string;
  timestamp: Date;
  label: string;
  description?: string;
  cameraId?: BackendCameraId;
  personId?: string;
  color?: string;
}

interface TimelineProps {
  startTime: Date;
  endTime: Date;
  currentTime: Date;
  events?: TimelineEvent[];
  bookmarks?: TimelineBookmark[];
  className?: string;
  // Display options
  zoomLevel?: number; // 1 = fit all, >1 = zoomed in
  showEventTypes?: (
    | 'person_enter'
    | 'person_exit'
    | 'person_reid'
    | 'alert'
    | 'bookmark'
    | 'system_event'
  )[];
  showGrid?: boolean;
  showMinimap?: boolean;
  compactMode?: boolean;
  // Event handlers
  onTimeSeek?: (timestamp: Date) => void;
  onEventClick?: (event: TimelineEvent) => void;
  onBookmarkClick?: (bookmark: TimelineBookmark) => void;
  onBookmarkCreate?: (timestamp: Date, label: string) => void;
  onBookmarkDelete?: (bookmarkId: string) => void;
  onZoomChange?: (zoomLevel: number) => void;
  onTimeRangeChange?: (startTime: Date, endTime: Date) => void;
}

// Event type configurations
const EVENT_CONFIGS = {
  person_enter: { color: '#00FF00', icon: '👤➡️', label: 'Person Enter' },
  person_exit: { color: '#FF6B35', icon: '👤⬅️', label: 'Person Exit' },
  person_reid: { color: '#FFD700', icon: '🔄', label: 'Re-identification' },
  alert: { color: '#FF4444', icon: '⚠️', label: 'Alert' },
  bookmark: { color: '#8B5CF6', icon: '🔖', label: 'Bookmark' },
  system_event: { color: '#64748B', icon: '⚙️', label: 'System Event' },
};

const Timeline: React.FC<TimelineProps> = ({
  startTime,
  endTime,
  currentTime,
  events = [],
  bookmarks = [],
  className = '',
  zoomLevel = 1,
  showEventTypes = ['person_enter', 'person_exit', 'person_reid', 'alert', 'bookmark'],
  showGrid = true,
  showMinimap = true,
  compactMode = false,
  onTimeSeek,
  onEventClick,
  onBookmarkClick,
  onBookmarkCreate,
  onBookmarkDelete,
  onZoomChange,
  onTimeRangeChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; time: Date } | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState<{
    x: number;
    timestamp: Date;
  } | null>(null);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Calculate total duration and visible window
  const totalDuration = useMemo(() => {
    return endTime.getTime() - startTime.getTime();
  }, [startTime, endTime]);

  const visibleDuration = useMemo(() => {
    return totalDuration / zoomLevel;
  }, [totalDuration, zoomLevel]);

  // Calculate visible time window based on current time and zoom
  const visibleWindow = useMemo(() => {
    const currentTimeMs = currentTime.getTime();
    const halfWindow = visibleDuration / 2;

    let windowStart = currentTimeMs - halfWindow;
    let windowEnd = currentTimeMs + halfWindow;

    // Constrain to actual time bounds
    if (windowStart < startTime.getTime()) {
      windowStart = startTime.getTime();
      windowEnd = Math.min(windowStart + visibleDuration, endTime.getTime());
    }
    if (windowEnd > endTime.getTime()) {
      windowEnd = endTime.getTime();
      windowStart = Math.max(windowEnd - visibleDuration, startTime.getTime());
    }

    return {
      start: new Date(windowStart),
      end: new Date(windowEnd),
    };
  }, [currentTime, visibleDuration, startTime, endTime]);

  // Filter events and bookmarks within visible window
  const visibleEvents = useMemo(() => {
    return events.filter(
      (event) =>
        showEventTypes.includes(event.type) &&
        event.timestamp >= visibleWindow.start &&
        event.timestamp <= visibleWindow.end
    );
  }, [events, showEventTypes, visibleWindow]);

  const visibleBookmarks = useMemo(() => {
    return bookmarks.filter(
      (bookmark) =>
        bookmark.timestamp >= visibleWindow.start && bookmark.timestamp <= visibleWindow.end
    );
  }, [bookmarks, visibleWindow]);

  // Convert timestamp to x position
  const timeToX = useCallback(
    (timestamp: Date, containerWidth: number) => {
      const timelineStart = visibleWindow.start.getTime();
      const timelineEnd = visibleWindow.end.getTime();
      const progress = (timestamp.getTime() - timelineStart) / (timelineEnd - timelineStart);
      return progress * containerWidth;
    },
    [visibleWindow]
  );

  // Convert x position to timestamp
  const xToTime = useCallback(
    (x: number, containerWidth: number) => {
      const progress = x / containerWidth;
      const timelineStart = visibleWindow.start.getTime();
      const timelineEnd = visibleWindow.end.getTime();
      return new Date(timelineStart + progress * (timelineEnd - timelineStart));
    },
    [visibleWindow]
  );

  // Handle timeline click
  const handleTimelineClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const timestamp = xToTime(x, rect.width);

      if (event.detail === 2) {
        // Double click - create bookmark
        setShowBookmarkDialog({ x, timestamp });
      } else {
        // Single click - seek
        onTimeSeek?.(timestamp);
      }
    },
    [xToTime, onTimeSeek]
  );

  // Handle drag for time range selection
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || event.button !== 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const timestamp = xToTime(x, rect.width);

      setIsDragging(true);
      setDragStart({ x, time: timestamp });

      event.preventDefault();
    },
    [xToTime]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStart || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentTimestamp = xToTime(currentX, rect.width);

      // Update time range selection (visual feedback would be added here)
    },
    [isDragging, dragStart, xToTime]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStart || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const endX = event.clientX - rect.left;
      const endTimestamp = xToTime(endX, rect.width);

      // If significant drag, update time range
      if (Math.abs(endX - dragStart.x) > 10) {
        const rangeStart = dragStart.time < endTimestamp ? dragStart.time : endTimestamp;
        const rangeEnd = dragStart.time < endTimestamp ? endTimestamp : dragStart.time;
        onTimeRangeChange?.(rangeStart, rangeEnd);
      }

      setIsDragging(false);
      setDragStart(null);
    },
    [isDragging, dragStart, xToTime, onTimeRangeChange]
  );

  // Handle bookmark creation
  const handleBookmarkCreate = useCallback(() => {
    if (showBookmarkDialog && bookmarkLabel.trim()) {
      onBookmarkCreate?.(showBookmarkDialog.timestamp, bookmarkLabel.trim());
      setShowBookmarkDialog(null);
      setBookmarkLabel('');
    }
  }, [showBookmarkDialog, bookmarkLabel, onBookmarkCreate]);

  // Handle zoom
  const handleZoom = useCallback(
    (delta: number, centerX?: number) => {
      const newZoomLevel = Math.max(0.5, Math.min(20, zoomLevel * (1 + delta * 0.1)));
      onZoomChange?.(newZoomLevel);
    },
    [zoomLevel, onZoomChange]
  );

  // Handle wheel for zoom
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (event.ctrlKey) {
        event.preventDefault();
        const rect = timelineRef.current?.getBoundingClientRect();
        const centerX = rect ? event.clientX - rect.left : undefined;
        handleZoom(-event.deltaY / 100, centerX);
      }
    },
    [handleZoom]
  );

  // Formats time handling both Date objects and ISO strings
  const formatTime = useCallback((timestamp: Date | string) => {
    const dateObj = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();

    if (isToday) {
      return dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } else {
      return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
  }, []);

  // Generate time grid marks
  const timeGridMarks = useMemo(() => {
    const marks: Date[] = [];
    const duration = visibleWindow.end.getTime() - visibleWindow.start.getTime();

    // Determine appropriate interval based on zoom level
    let interval: number; // milliseconds
    if (duration < 60000) {
      // < 1 minute
      interval = 5000; // 5 seconds
    } else if (duration < 300000) {
      // < 5 minutes
      interval = 30000; // 30 seconds
    } else if (duration < 3600000) {
      // < 1 hour
      interval = 300000; // 5 minutes
    } else if (duration < 86400000) {
      // < 1 day
      interval = 3600000; // 1 hour
    } else {
      interval = 86400000; // 1 day
    }

    const startTime = Math.ceil(visibleWindow.start.getTime() / interval) * interval;
    for (let t = startTime; t <= visibleWindow.end.getTime(); t += interval) {
      marks.push(new Date(t));
    }

    return marks;
  }, [visibleWindow]);

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Timeline</h3>
            <p className="text-sm text-gray-400">
              {formatTime(visibleWindow.start)} - {formatTime(visibleWindow.end)}
            </p>
          </div>

          {/* Timeline Controls */}
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleZoom(-0.5)}
                className="p-1 text-white hover:text-orange-400 transition-colors"
                title="Zoom out"
              >
                🔍-
              </button>
              <span className="text-sm text-gray-400 w-12 text-center">
                {zoomLevel.toFixed(1)}x
              </span>
              <button
                onClick={() => handleZoom(0.5)}
                className="p-1 text-white hover:text-orange-400 transition-colors"
                title="Zoom in"
              >
                🔍+
              </button>
            </div>

            {/* View Options */}
            <button
              onClick={() => onZoomChange?.(1)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
              title="Fit all"
            >
              Fit All
            </button>
          </div>
        </div>

        {/* Event Type Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_CONFIGS).map(([type, config]) => (
            <button
              key={type}
              onClick={() => {
                const newTypes = showEventTypes.includes(type as any)
                  ? showEventTypes.filter((t) => t !== type)
                  : [...showEventTypes, type as any];
                console.log('Toggle event type:', type, newTypes);
              }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${showEventTypes.includes(type as any)
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              style={{
                borderLeft: `3px solid ${config.color}`,
              }}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timeline */}
      <div className="p-4">
        <div
          ref={timelineRef}
          className="relative h-20 bg-gray-800 rounded-lg cursor-crosshair overflow-hidden"
          onClick={handleTimelineClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Time Grid */}
          {showGrid &&
            timeGridMarks.map((mark, index) => {
              const x = timeToX(mark, timelineRef.current?.offsetWidth || 800);
              return (
                <div
                  key={index}
                  className="absolute top-0 bottom-0 border-l border-gray-600 opacity-50"
                  style={{ left: `${x}px` }}
                >
                  <div className="absolute -top-6 left-1 text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(mark)}
                  </div>
                </div>
              );
            })}

          {/* Current Time Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-orange-400 z-30"
            style={{
              left: `${timeToX(currentTime, timelineRef.current?.offsetWidth || 800)}px`,
            }}
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-orange-400 rounded-full border-2 border-white" />
          </div>

          {/* Events */}
          {visibleEvents.map((event) => {
            const x = timeToX(event.timestamp, timelineRef.current?.offsetWidth || 800);
            const config = EVENT_CONFIGS[event.type];
            const severity = event.severity || 'low';
            const size = severity === 'high' ? 12 : severity === 'medium' ? 10 : 8;

            return (
              <div
                key={event.id}
                className="absolute cursor-pointer transform -translate-x-1/2 transition-all duration-200 hover:scale-125"
                style={{
                  left: `${x}px`,
                  top: `${compactMode ? 25 : 30}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: config.color,
                  borderRadius: '50%',
                  border: '2px solid white',
                  zIndex: severity === 'high' ? 25 : severity === 'medium' ? 20 : 15,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
                title={`${config.label}: ${event.title}`}
              />
            );
          })}

          {/* Bookmarks */}
          {visibleBookmarks.map((bookmark) => {
            const x = timeToX(bookmark.timestamp, timelineRef.current?.offsetWidth || 800);

            return (
              <div
                key={bookmark.id}
                className="absolute cursor-pointer transform -translate-x-1/2"
                style={{ left: `${x}px`, top: '5px', zIndex: 25 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmarkClick?.(bookmark);
                }}
              >
                <div
                  className="w-4 h-6 rounded-t-md border-2 border-white"
                  style={{ backgroundColor: bookmark.color || EVENT_CONFIGS.bookmark.color }}
                  title={`${bookmark.label}: ${formatTime(bookmark.timestamp)}`}
                >
                  <span className="text-xs text-white">🔖</span>
                </div>
              </div>
            );
          })}

          {/* Event Tooltip */}
          {hoveredEvent && (
            <div className="absolute bg-black/90 text-white text-xs p-2 rounded shadow-lg z-40 pointer-events-none">
              <div className="font-semibold">{hoveredEvent.title}</div>
              <div className="text-gray-300">{formatTime(hoveredEvent.timestamp)}</div>
              {hoveredEvent.description && (
                <div className="text-gray-400 mt-1">{hoveredEvent.description}</div>
              )}
            </div>
          )}
        </div>

        {/* Minimap */}
        {showMinimap && (
          <div className="mt-4">
            <div ref={minimapRef} className="relative h-6 bg-gray-900 rounded">
              {/* Full timeline background */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-600 rounded" />

              {/* Visible window indicator */}
              <div
                className="absolute top-0 bottom-0 bg-orange-400/30 border border-orange-400 rounded"
                style={{
                  left: `${((visibleWindow.start.getTime() - startTime.getTime()) / totalDuration) * 100}%`,
                  width: `${((visibleWindow.end.getTime() - visibleWindow.start.getTime()) / totalDuration) * 100}%`,
                }}
              />

              {/* Current time in minimap */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-orange-400"
                style={{
                  left: `${((currentTime.getTime() - startTime.getTime()) / totalDuration) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookmark Creation Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-96">
            <h3 className="text-white font-semibold mb-4">Create Bookmark</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Time: {formatTime(showBookmarkDialog.timestamp)}
              </label>
              <input
                type="text"
                value={bookmarkLabel}
                onChange={(e) => setBookmarkLabel(e.target.value)}
                placeholder="Enter bookmark label..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleBookmarkCreate()}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowBookmarkDialog(null);
                  setBookmarkLabel('');
                }}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleBookmarkCreate}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded"
                disabled={!bookmarkLabel.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
