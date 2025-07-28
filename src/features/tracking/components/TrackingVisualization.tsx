import React, { useState, useEffect, useRef } from 'react';
import { useTrackingStore } from '../../../stores/trackingStore';
import { TrackingResult } from '../../../services/types/api';

interface TrackingVisualizationProps {
  className?: string;
  showTrajectories?: boolean;
  showIdentities?: boolean;
  selectedPersonId?: string;
  onPersonSelect?: (personId: string) => void;
}

export const TrackingVisualization: React.FC<TrackingVisualizationProps> = ({
  className = '',
  showTrajectories = true,
  showIdentities = true,
  selectedPersonId,
  onPersonSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { trackingResults, isLoading, error } = useTrackingStore();
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !trackingResults.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tracking visualizations
    drawTrackingData(ctx, trackingResults, canvas.width, canvas.height);
  }, [trackingResults, selectedPersonId, highlightedPersonId, showTrajectories, showIdentities]);

  const drawTrackingData = (
    ctx: CanvasRenderingContext2D,
    tracks: TrackingResult[],
    width: number,
    height: number
  ) => {
    tracks.forEach(track => {
      const isSelected = selectedPersonId === track.personId;
      const isHighlighted = highlightedPersonId === track.personId;
      
      // Draw trajectory if enabled
      if (showTrajectories && track.trajectory.length > 1) {
        drawTrajectory(ctx, track, width, height, isSelected, isHighlighted);
      }

      // Draw current position
      if (track.trajectory.length > 0) {
        drawCurrentPosition(ctx, track, width, height, isSelected, isHighlighted);
      }

      // Draw identity label if enabled
      if (showIdentities) {
        drawIdentityLabel(ctx, track, width, height, isSelected, isHighlighted);
      }
    });
  };

  const drawTrajectory = (
    ctx: CanvasRenderingContext2D,
    track: TrackingResult,
    width: number,
    height: number,
    isSelected: boolean,
    isHighlighted: boolean
  ) => {
    const trajectory = track.trajectory;
    if (trajectory.length < 2) return;

    // Map coordinates to canvas space (assuming normalized coordinates)
    const points = trajectory.map(point => ({
      x: (point.x + 50) * width / 100, // Assuming coordinate range -50 to 50
      y: (point.y + 50) * height / 100
    }));

    // Draw trajectory line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    // Style based on selection state
    if (isSelected) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
    } else if (isHighlighted) {
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#95a5a6';
      ctx.lineWidth = 1;
    }

    ctx.stroke();

    // Draw trajectory points
    points.forEach((point, index) => {
      const alpha = 0.3 + (index / points.length) * 0.7; // Fade effect
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? `rgba(255, 107, 107, ${alpha})` : 
                     isHighlighted ? `rgba(78, 205, 196, ${alpha})` : 
                     `rgba(149, 165, 166, ${alpha})`;
      ctx.fill();
    });
  };

  const drawCurrentPosition = (
    ctx: CanvasRenderingContext2D,
    track: TrackingResult,
    width: number,
    height: number,
    isSelected: boolean,
    isHighlighted: boolean
  ) => {
    const currentPoint = track.trajectory[track.trajectory.length - 1];
    const x = (currentPoint.x + 50) * width / 100;
    const y = (currentPoint.y + 50) * height / 100;

    // Draw current position marker
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    
    if (isSelected) {
      ctx.fillStyle = '#ff6b6b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
    } else if (isHighlighted) {
      ctx.fillStyle = '#4ecdc4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = track.status === 'active' ? '#2ecc71' : '#95a5a6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
    }

    ctx.fill();
    ctx.stroke();

    // Draw pulsing effect for active tracks
    if (track.status === 'active') {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? 'rgba(255, 107, 107, 0.3)' : 
                       isHighlighted ? 'rgba(78, 205, 196, 0.3)' : 
                       'rgba(46, 204, 113, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const drawIdentityLabel = (
    ctx: CanvasRenderingContext2D,
    track: TrackingResult,
    width: number,
    height: number,
    isSelected: boolean,
    isHighlighted: boolean
  ) => {
    const currentPoint = track.trajectory[track.trajectory.length - 1];
    const x = (currentPoint.x + 50) * width / 100;
    const y = (currentPoint.y + 50) * height / 100;

    // Draw identity label
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = isSelected ? '#ff6b6b' : 
                   isHighlighted ? '#4ecdc4' : 
                   '#2c3e50';
    
    const label = `ID: ${track.personId}`;
    ctx.fillText(label, x, y - 15);

    // Draw confidence if available
    if (track.confidence) {
      ctx.font = '10px Arial';
      ctx.fillStyle = '#7f8c8d';
      ctx.fillText(`${(track.confidence * 100).toFixed(0)}%`, x, y - 3);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onPersonSelect) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find closest person to click point
    let closestTrack: TrackingResult | null = null;
    let closestDistance = Infinity;

    trackingResults.forEach(track => {
      if (track.trajectory.length === 0) return;
      
      const currentPoint = track.trajectory[track.trajectory.length - 1];
      const trackX = (currentPoint.x + 50) * canvas.width / 100;
      const trackY = (currentPoint.y + 50) * canvas.height / 100;
      
      const distance = Math.sqrt(Math.pow(x - trackX, 2) + Math.pow(y - trackY, 2));
      
      if (distance < 15 && distance < closestDistance) { // 15px click radius
        closestDistance = distance;
        closestTrack = track;
      }
    });

    if (closestTrack) {
      onPersonSelect(closestTrack.personId);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find person under mouse
    let hoveredPersonId: string | null = null;

    trackingResults.forEach(track => {
      if (track.trajectory.length === 0) return;
      
      const currentPoint = track.trajectory[track.trajectory.length - 1];
      const trackX = (currentPoint.x + 50) * canvas.width / 100;
      const trackY = (currentPoint.y + 50) * canvas.height / 100;
      
      const distance = Math.sqrt(Math.pow(x - trackX, 2) + Math.pow(y - trackY, 2));
      
      if (distance < 15) {
        hoveredPersonId = track.personId;
      }
    });

    setHighlightedPersonId(hoveredPersonId);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading tracking data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-red-500">Error loading tracking data: {error}</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full border border-gray-300 rounded-lg cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHighlightedPersonId(null)}
      />
      
      {/* Tracking Legend */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <h3 className="font-semibold text-sm mb-2">Tracking Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Active Track</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <span>Completed Track</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Selected Track</span>
          </div>
        </div>
      </div>

      {/* Tracking Statistics */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <h3 className="font-semibold text-sm mb-2">Statistics</h3>
        <div className="space-y-1 text-xs">
          <div>Total Tracks: {trackingResults.length}</div>
          <div>Active: {trackingResults.filter(t => t.status === 'active').length}</div>
          <div>Completed: {trackingResults.filter(t => t.status === 'completed').length}</div>
        </div>
      </div>
    </div>
  );
};

export default TrackingVisualization;