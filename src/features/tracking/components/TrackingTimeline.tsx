import React, { useState, useEffect, useRef } from 'react';
import { TrackingResult } from '../../../services/types/api';
import { useTrackingStore } from '../../../stores/trackingStore';

interface TrackingTimelineProps {
  className?: string;
  timeWindow?: number; // in minutes
  showPersonIds?: boolean;
  onTimeRangeChange?: (startTime: Date, endTime: Date) => void;
  onPersonSelect?: (personId: string) => void;
}

interface TimelineEvent {
  id: string;
  personId: string;
  type: 'start' | 'end' | 'transition';
  timestamp: Date;
  cameraId?: string;
  fromCamera?: string;
  toCamera?: string;
  confidence: number;
}

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  className = '',
  timeWindow = 60, // 1 hour default
  showPersonIds = true,
  onTimeRangeChange,
  onPersonSelect
}) => {
  const { trackingResults } = useTrackingStore();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update current time for live timeline
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Process tracking results into timeline events
  useEffect(() => {
    const timelineEvents: TimelineEvent[] = [];
    
    trackingResults.forEach(track => {
      // Add start event
      timelineEvents.push({
        id: `${track.id}-start`,
        personId: track.personId,
        type: 'start',
        timestamp: new Date(track.firstSeen),
        cameraId: track.trajectory[0]?.cameraId,
        confidence: track.confidence
      });

      // Add end event
      timelineEvents.push({
        id: `${track.id}-end`,
        personId: track.personId,
        type: 'end',
        timestamp: new Date(track.lastSeen),
        cameraId: track.trajectory[track.trajectory.length - 1]?.cameraId,
        confidence: track.confidence
      });

      // Add transition events
      track.cameraTransitions.forEach(transition => {
        timelineEvents.push({
          id: `${track.id}-transition-${transition.id}`,
          personId: track.personId,
          type: 'transition',
          timestamp: new Date(transition.timestamp),
          fromCamera: transition.fromCameraId,
          toCamera: transition.toCameraId,
          confidence: transition.confidence
        });
      });
    });

    // Sort events by timestamp
    timelineEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setEvents(timelineEvents);
  }, [trackingResults]);

  // Calculate time range
  const endTime = currentTime;
  const startTime = new Date(endTime.getTime() - timeWindow * 60 * 1000);

  // Filter events within time window
  const visibleEvents = events.filter(event => 
    event.timestamp >= startTime && event.timestamp <= endTime
  );

  // Group events by person
  const eventsByPerson = visibleEvents.reduce((acc, event) => {
    if (!acc[event.personId]) {
      acc[event.personId] = [];
    }
    acc[event.personId].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const getEventColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'start': return '#10b981'; // green
      case 'end': return '#ef4444'; // red
      case 'transition': return '#f59e0b'; // yellow
      default: return '#6b7280'; // gray
    }
  };

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'start': return '▶';
      case 'end': return '⏹';
      case 'transition': return '↔';
      default: return '●';
    }
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (start: Date, end: Date) => {
    const duration = end.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimelinePosition = (timestamp: Date) => {
    const totalDuration = endTime.getTime() - startTime.getTime();
    const eventOffset = timestamp.getTime() - startTime.getTime();
    return (eventOffset / totalDuration) * 100;
  };

  const handlePersonClick = (personId: string) => {
    if (onPersonSelect) {
      onPersonSelect(personId);
    }
  };

  const handleTimeRangeSelect = (start: Date, end: Date) => {
    setSelectedTimeRange({ start, end });
    if (onTimeRangeChange) {
      onTimeRangeChange(start, end);
    }
  };

  // Playback controls
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Tracking Timeline</h3>
        <div className="flex items-center space-x-4">
          {/* Time Window Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Window:</label>
            <select
              value={timeWindow}
              onChange={(e) => setSelectedTimeRange(null)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={180}>3 hours</option>
              <option value={360}>6 hours</option>
            </select>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlayback}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <select
              value={playbackSpeed}
              onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold">{Object.keys(eventsByPerson).length}</div>
          <div className="text-xs text-gray-600">Active People</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="text-lg font-bold text-green-600">
            {visibleEvents.filter(e => e.type === 'start').length}
          </div>
          <div className="text-xs text-gray-600">Entries</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="text-lg font-bold text-red-600">
            {visibleEvents.filter(e => e.type === 'end').length}
          </div>
          <div className="text-xs text-gray-600">Exits</div>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded">
          <div className="text-lg font-bold text-yellow-600">
            {visibleEvents.filter(e => e.type === 'transition').length}
          </div>
          <div className="text-xs text-gray-600">Transitions</div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="mb-4">
        <div className="relative h-32 bg-gray-50 rounded-lg overflow-hidden" ref={timelineRef}>
          {/* Time axis */}
          <div className="absolute top-0 left-0 w-full h-4 bg-gray-100 border-b border-gray-300">
            {[0, 0.25, 0.5, 0.75, 1].map(position => (
              <div
                key={position}
                className="absolute top-0 bottom-0 w-px bg-gray-300"
                style={{ left: `${position * 100}%` }}
              >
                <div className="absolute top-0 left-1 text-xs text-gray-600">
                  {formatTime(new Date(startTime.getTime() + position * (endTime.getTime() - startTime.getTime())))}
                </div>
              </div>
            ))}
          </div>

          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
            style={{ left: '100%' }}
          >
            <div className="absolute top-0 left-1 text-xs text-red-600 font-medium">
              Now
            </div>
          </div>

          {/* Timeline events */}
          <div className="absolute top-4 left-0 w-full" style={{ height: 'calc(100% - 1rem)' }}>
            {Object.entries(eventsByPerson).map(([personId, personEvents], index) => (
              <div
                key={personId}
                className="absolute w-full hover:bg-blue-50 cursor-pointer"
                style={{
                  top: `${(index / Object.keys(eventsByPerson).length) * 100}%`,
                  height: `${100 / Object.keys(eventsByPerson).length}%`
                }}
                onClick={() => handlePersonClick(personId)}
              >
                {showPersonIds && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-700">
                    {personId}
                  </div>
                )}
                
                {personEvents.map(event => (
                  <div
                    key={event.id}
                    className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{
                      left: `${getTimelinePosition(event.timestamp)}%`,
                      backgroundColor: getEventColor(event)
                    }}
                    title={`${event.type} - ${formatTime(event.timestamp)} - ${event.cameraId || `${event.fromCamera} → ${event.toCamera}`}`}
                  >
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs text-white font-bold">
                      {getEventIcon(event)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event List */}
      <div className="max-h-64 overflow-y-auto">
        <h4 className="text-sm font-medium mb-2">Recent Events</h4>
        <div className="space-y-1">
          {visibleEvents.slice(-10).reverse().map(event => (
            <div
              key={event.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getEventColor(event) }}
                />
                <span className="font-medium text-sm">Person {event.personId}</span>
                <span className="text-sm text-gray-600 capitalize">{event.type}</span>
                {event.type === 'transition' && (
                  <span className="text-xs text-gray-500">
                    {event.fromCamera} → {event.toCamera}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {(event.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrackingTimeline;