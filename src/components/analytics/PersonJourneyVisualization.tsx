import React, { useState, useEffect, useRef } from 'react';
import { PersonJourney, TrajectoryPoint } from '../../services/types/api';
import { analyticsAPI } from '../../services/analyticsAPI';
import { useAnalyticsStore } from '../../stores/analyticsStore';

interface PersonJourneyVisualizationProps {
  className?: string;
  personId?: string;
  onPersonSelect?: (personId: string) => void;
}

interface JourneyMapPoint {
  x: number;
  y: number;
  timestamp: string;
  cameraId: string;
  confidence: number;
  isTransition?: boolean;
}

export const PersonJourneyVisualization: React.FC<PersonJourneyVisualizationProps> = ({
  className = '',
  personId,
  onPersonSelect
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>(personId || '');
  const [journeyData, setJourneyData] = useState<PersonJourney | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const { timeRange } = useAnalyticsStore();

  // Load journey data
  useEffect(() => {
    if (selectedPersonId) {
      loadJourneyData();
    }
  }, [selectedPersonId, timeRange]);

  const loadJourneyData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await analyticsAPI.getPersonJourney(selectedPersonId, timeRange);
      setJourneyData(data);
      setPlaybackTime(0);
    } catch (err) {
      console.error('Failed to load journey data:', err);
      setError('Failed to load person journey data');
    } finally {
      setIsLoading(false);
    }
  };

  // Animation playback
  useEffect(() => {
    if (isPlaying && journeyData) {
      const animate = () => {
        setPlaybackTime(prev => {
          const duration = new Date(journeyData.endTime).getTime() - new Date(journeyData.startTime).getTime();
          const newTime = prev + (16 * playbackSpeed); // 16ms per frame
          
          if (newTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          
          return newTime;
        });
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, journeyData]);

  // Draw journey on canvas
  useEffect(() => {
    if (journeyData && canvasRef.current) {
      drawJourney();
    }
  }, [journeyData, playbackTime]);

  const drawJourney = () => {
    const canvas = canvasRef.current;
    if (!canvas || !journeyData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up coordinate system
    const padding = 40;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;

    // Draw background grid
    drawGrid(ctx, padding, width, height);

    // Draw camera zones
    drawCameraZones(ctx, padding, width, height);

    // Draw trajectory path
    drawTrajectoryPath(ctx, padding, width, height);

    // Draw current position
    drawCurrentPosition(ctx, padding, width, height);

    // Draw camera transitions
    drawCameraTransitions(ctx, padding, width, height);

    // Draw timeline
    drawTimeline(ctx, padding, width, height);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, padding: number, width: number, height: number) => {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i * width / 10);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i * height / 10);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + width, y);
      ctx.stroke();
    }
  };

  const drawCameraZones = (ctx: CanvasRenderingContext2D, padding: number, width: number, height: number) => {
    if (!journeyData) return;

    const cameraColors = {
      'camera-1': '#ef4444',
      'camera-2': '#3b82f6',
      'camera-3': '#10b981',
      'camera-4': '#f59e0b'
    };

    journeyData.cameraSequence.forEach((camera, index) => {
      const color = cameraColors[camera.cameraId as keyof typeof cameraColors] || '#6b7280';
      
      ctx.fillStyle = color + '20'; // 20% opacity
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      // Draw camera zone (simplified as rectangles)
      const zoneWidth = width / 4;
      const zoneHeight = height / 2;
      const x = padding + (index % 2) * (width / 2);
      const y = padding + Math.floor(index / 2) * (height / 2);
      
      ctx.fillRect(x, y, zoneWidth, zoneHeight);
      ctx.strokeRect(x, y, zoneWidth, zoneHeight);
      
      // Draw camera label
      ctx.fillStyle = color;
      ctx.font = '12px Arial';
      ctx.fillText(camera.cameraName, x + 5, y + 15);
    });
  };

  const drawTrajectoryPath = (ctx: CanvasRenderingContext2D, padding: number, width: number, height: number) => {
    if (!journeyData || journeyData.trajectory.length === 0) return;

    const trajectory = journeyData.trajectory;
    const startTime = new Date(journeyData.startTime).getTime();
    const currentTime = startTime + playbackTime;
    
    // Find visible trajectory points up to current time
    const visiblePoints = trajectory.filter(point => {
      const pointTime = new Date(point.timestamp).getTime();
      return pointTime <= currentTime;
    });

    if (visiblePoints.length === 0) return;

    // Draw trajectory line
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    visiblePoints.forEach((point, index) => {
      const x = padding + (point.x / 100) * width;
      const y = padding + (point.y / 100) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw trajectory points
    visiblePoints.forEach((point, index) => {
      const x = padding + (point.x / 100) * width;
      const y = padding + (point.y / 100) * height;
      
      ctx.fillStyle = point.confidence > 0.8 ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw point number
      if (index % 5 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(`${index + 1}`, x + 6, y - 6);
      }
    });
  };

  const drawCurrentPosition = (ctx: CanvasRenderingContext2D, padding: number, width: number, height: number) => {
    if (!journeyData) return;

    const startTime = new Date(journeyData.startTime).getTime();
    const currentTime = startTime + playbackTime;
    
    // Find current position
    const currentPoint = journeyData.trajectory.find(point => {
      const pointTime = new Date(point.timestamp).getTime();
      return Math.abs(pointTime - currentTime) < 1000; // Within 1 second
    });

    if (!currentPoint) return;

    const x = padding + (currentPoint.x / 100) * width;
    const y = padding + (currentPoint.y / 100) * height;

    // Draw current position indicator
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw pulsing animation
    const pulseRadius = 8 + Math.sin(Date.now() / 200) * 4;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawCameraTransitions = (ctx: CanvasRenderingContext2D, padding: number, width: number, height: number) => {
    if (!journeyData) return;

    const startTime = new Date(journeyData.startTime).getTime();
    const currentTime = startTime + playbackTime;

    journeyData.cameraSequence.forEach((camera, index) => {
      const entryTime = new Date(camera.entryTime).getTime();
      const exitTime = new Date(camera.exitTime).getTime();
      
      if (entryTime <= currentTime && exitTime >= currentTime) {
        // Draw active camera indicator
        const x = padding + 10;
        const y = padding + height + 20;
        
        ctx.fillStyle = '#10b981';
        ctx.font = '14px Arial';
        ctx.fillText(`Active: ${camera.cameraName}`, x, y);
        
        // Draw confidence indicator
        const confidence = Math.round(camera.confidence * 100);
        ctx.fillStyle = confidence > 80 ? '#10b981' : confidence > 60 ? '#f59e0b' : '#ef4444';
        ctx.fillText(`Confidence: ${confidence}%`, x + 150, y);
      }
    });
  };

  const drawTimeline = (ctx: CanvasRenderingContext2D, padding: number, width: number, height: number) => {
    if (!journeyData) return;

    const timelineY = padding + height + 40;
    const timelineWidth = width;
    const duration = new Date(journeyData.endTime).getTime() - new Date(journeyData.startTime).getTime();
    const progress = playbackTime / duration;

    // Draw timeline background
    ctx.fillStyle = '#374151';
    ctx.fillRect(padding, timelineY, timelineWidth, 4);

    // Draw timeline progress
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(padding, timelineY, timelineWidth * progress, 4);

    // Draw timeline markers
    const markerCount = 5;
    for (let i = 0; i <= markerCount; i++) {
      const markerX = padding + (i * timelineWidth / markerCount);
      const markerTime = new Date(new Date(journeyData.startTime).getTime() + (i * duration / markerCount));
      
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(markerX, timelineY - 5);
      ctx.lineTo(markerX, timelineY + 9);
      ctx.stroke();
      
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Arial';
      ctx.fillText(markerTime.toLocaleTimeString(), markerX - 20, timelineY + 20);
    }
  };

  const handlePersonIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPersonId = e.target.value;
    setSelectedPersonId(newPersonId);
    onPersonSelect?.(newPersonId);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setPlaybackTime(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-lg">Loading person journey...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
        <div className="text-center text-red-500">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-lg">{error}</div>
          <button
            onClick={loadJourneyData}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Person Journey Visualization</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Person ID:</label>
            <input
              type="text"
              value={selectedPersonId}
              onChange={handlePersonIdChange}
              placeholder="Enter person ID"
              className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={loadJourneyData}
            disabled={!selectedPersonId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded"
          >
            Load Journey
          </button>
        </div>
      </div>

      {journeyData && (
        <>
          {/* Journey Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Duration</div>
              <div className="text-lg font-semibold">
                {Math.round(journeyData.totalDuration / 60000)} minutes
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Cameras Visited</div>
              <div className="text-lg font-semibold">
                {journeyData.cameraSequence.length}
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Avg Confidence</div>
              <div className="text-lg font-semibold">
                {(journeyData.statistics.averageConfidence * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Distance</div>
              <div className="text-lg font-semibold">
                {journeyData.statistics.totalDistance.toFixed(1)}m
              </div>
            </div>
          </div>

          {/* Visualization Canvas */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="w-full h-auto border border-gray-700 rounded"
            />
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                {isPlaying ? '⏸️' : '▶️'}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                🔄 Restart
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Speed:</span>
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-3 py-1 rounded text-sm ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Camera Sequence */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-lg font-semibold mb-4">Camera Sequence</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {journeyData.cameraSequence.map((camera, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{camera.cameraName}</span>
                    <span className="text-sm text-gray-400">#{index + 1}</span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Entry: {new Date(camera.entryTime).toLocaleTimeString()}</div>
                    <div>Duration: {Math.round(camera.duration / 60000)}min</div>
                    <div>Confidence: {(camera.confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PersonJourneyVisualization;