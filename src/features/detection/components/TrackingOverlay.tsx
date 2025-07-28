import React, { useEffect, useRef, useState } from 'react';
import { Detection, TrackingResult } from '../../../services/types/api';
import { useTrackingStore } from '../../../stores/trackingStore';
import { DynamicBoundingBox } from './DynamicBoundingBox';

interface TrackingOverlayProps {
  detections: Detection[];
  trackingResults: TrackingResult[];
  cameraId: string;
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  selectedPersonId?: string;
  highlightedPersonId?: string;
  showTrajectories?: boolean;
  showVelocity?: boolean;
  showMetadata?: boolean;
  showConnections?: boolean;
  className?: string;
}

interface TrackingConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  confidence: number;
  timestamp: number;
}

interface TrackingTrail {
  positions: { x: number; y: number; timestamp: number }[];
  personId: string;
  color: string;
}

export const TrackingOverlay: React.FC<TrackingOverlayProps> = ({
  detections,
  trackingResults,
  cameraId,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  selectedPersonId,
  highlightedPersonId,
  showTrajectories = true,
  showVelocity = true,
  showMetadata = true,
  showConnections = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trackingTrails, setTrackingTrails] = useState<TrackingTrail[]>([]);
  const [connections, setConnections] = useState<TrackingConnection[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Store hooks
  const { trackingTargets, trackingHistory } = useTrackingStore();

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Update tracking trails
  useEffect(() => {
    const newTrails: TrackingTrail[] = [];
    const personColors: Record<string, string> = {};

    // Generate colors for each person
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    let colorIndex = 0;

    trackingResults.forEach(result => {
      if (!personColors[result.personId]) {
        personColors[result.personId] = colors[colorIndex % colors.length];
        colorIndex++;
      }
    });

    // Create trails from tracking history
    trackingHistory.forEach(history => {
      if (history.cameraId === cameraId) {
        const positions = history.positions.map(pos => ({
          x: pos.x * (canvasWidth / imageWidth),
          y: pos.y * (canvasHeight / imageHeight),
          timestamp: pos.timestamp,
        }));

        newTrails.push({
          positions,
          personId: history.personId,
          color: personColors[history.personId] || '#ffffff',
        });
      }
    });

    setTrackingTrails(newTrails);
  }, [trackingResults, trackingHistory, cameraId, canvasWidth, canvasHeight, imageWidth, imageHeight]);

  // Update connections
  useEffect(() => {
    const newConnections: TrackingConnection[] = [];
    
    // Find connections between current detections and tracking results
    detections.forEach(detection => {
      const matchingResult = trackingResults.find(r => r.personId === detection.personId);
      if (matchingResult && detection.boundingBox) {
        const detectionCenter = {
          x: (detection.boundingBox.x + detection.boundingBox.width / 2) * (canvasWidth / imageWidth),
          y: (detection.boundingBox.y + detection.boundingBox.height / 2) * (canvasHeight / imageHeight),
        };

        // Find predicted position
        const predictedX = matchingResult.predictedPosition?.x || detectionCenter.x;
        const predictedY = matchingResult.predictedPosition?.y || detectionCenter.y;

        newConnections.push({
          from: detectionCenter,
          to: {
            x: predictedX * (canvasWidth / imageWidth),
            y: predictedY * (canvasHeight / imageHeight),
          },
          confidence: matchingResult.confidence,
          timestamp: Date.now(),
        });
      }
    });

    setConnections(newConnections);
  }, [detections, trackingResults, canvasWidth, canvasHeight, imageWidth, imageHeight]);

  // Draw overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tracking trails
    if (showTrajectories) {
      trackingTrails.forEach(trail => {
        if (trail.positions.length < 2) return;

        const isSelected = selectedPersonId === trail.personId;
        const isHighlighted = highlightedPersonId === trail.personId;
        const alpha = isSelected || isHighlighted ? 0.8 : 0.3;

        ctx.strokeStyle = `rgba(${parseInt(trail.color.slice(1, 3), 16)}, ${parseInt(trail.color.slice(3, 5), 16)}, ${parseInt(trail.color.slice(5, 7), 16)}, ${alpha})`;
        ctx.lineWidth = isSelected || isHighlighted ? 3 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw trail
        ctx.beginPath();
        trail.positions.forEach((pos, index) => {
          if (index === 0) {
            ctx.moveTo(pos.x, pos.y);
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        });
        ctx.stroke();

        // Draw position markers
        trail.positions.forEach((pos, index) => {
          const age = Date.now() - pos.timestamp;
          const maxAge = 10000; // 10 seconds
          const positionAlpha = Math.max(0, 1 - age / maxAge);
          
          if (positionAlpha > 0) {
            ctx.fillStyle = `rgba(${parseInt(trail.color.slice(1, 3), 16)}, ${parseInt(trail.color.slice(3, 5), 16)}, ${parseInt(trail.color.slice(5, 7), 16)}, ${positionAlpha * alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Draw direction arrow
        if (trail.positions.length >= 2) {
          const lastPos = trail.positions[trail.positions.length - 1];
          const secondLastPos = trail.positions[trail.positions.length - 2];
          const angle = Math.atan2(lastPos.y - secondLastPos.y, lastPos.x - secondLastPos.x);
          const arrowLength = 15;
          const arrowAngle = Math.PI / 6;

          ctx.strokeStyle = trail.color;
          ctx.fillStyle = trail.color;
          ctx.lineWidth = 2;

          // Arrow shaft
          ctx.beginPath();
          ctx.moveTo(lastPos.x, lastPos.y);
          ctx.lineTo(
            lastPos.x + arrowLength * Math.cos(angle),
            lastPos.y + arrowLength * Math.sin(angle)
          );
          ctx.stroke();

          // Arrow head
          const arrowHeadX = lastPos.x + arrowLength * Math.cos(angle);
          const arrowHeadY = lastPos.y + arrowLength * Math.sin(angle);
          
          ctx.beginPath();
          ctx.moveTo(arrowHeadX, arrowHeadY);
          ctx.lineTo(
            arrowHeadX - 8 * Math.cos(angle - arrowAngle),
            arrowHeadY - 8 * Math.sin(angle - arrowAngle)
          );
          ctx.lineTo(
            arrowHeadX - 8 * Math.cos(angle + arrowAngle),
            arrowHeadY - 8 * Math.sin(angle + arrowAngle)
          );
          ctx.closePath();
          ctx.fill();
        }
      });
    }

    // Draw connections
    if (showConnections) {
      connections.forEach(connection => {
        const age = Date.now() - connection.timestamp;
        const maxAge = 5000; // 5 seconds
        const alpha = Math.max(0, 1 - age / maxAge) * connection.confidence;

        if (alpha > 0) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          ctx.moveTo(connection.from.x, connection.from.y);
          ctx.lineTo(connection.to.x, connection.to.y);
          ctx.stroke();
          
          ctx.setLineDash([]);
        }
      });
    }

    // Draw zone indicators
    const activeTargets = trackingTargets.filter(target => target.cameraId === cameraId);
    activeTargets.forEach(target => {
      // Draw tracking zone
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(50, 50, canvasWidth - 100, canvasHeight - 100);
      ctx.setLineDash([]);

      // Draw target indicator
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.font = '14px Arial';
      ctx.fillText(`Tracking: ${target.personId}`, 60, 70);
    });

    // Draw performance indicators
    if (showMetadata) {
      const fps = 30; // This would come from performance monitor
      const trackingCount = trackingTargets.length;
      const detectionCount = detections.length;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvasWidth - 150, 10, 140, 60);

      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(`FPS: ${fps}`, canvasWidth - 140, 30);
      ctx.fillText(`Tracking: ${trackingCount}`, canvasWidth - 140, 45);
      ctx.fillText(`Detections: ${detectionCount}`, canvasWidth - 140, 60);
    }

    // Draw timeline scrubber if in playback mode
    // This would be implemented when playback controls are added

  }, [
    trackingTrails,
    connections,
    showTrajectories,
    showConnections,
    showMetadata,
    selectedPersonId,
    highlightedPersonId,
    trackingTargets,
    detections,
    animationFrame,
    canvasWidth,
    canvasHeight,
  ]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 pointer-events-none"
      />
      
      {/* Render dynamic bounding boxes */}
      {detections.map(detection => (
        <DynamicBoundingBox
          key={detection.id}
          detection={detection}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          isSelected={selectedPersonId === detection.personId}
          isHighlighted={highlightedPersonId === detection.personId}
          isTracking={detection.isTracking}
          showTrajectory={showTrajectories}
          showVelocity={showVelocity}
          showMetadata={showMetadata}
        />
      ))}

      {/* Tracking controls overlay */}
      {trackingTargets.length > 0 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded">
          <div className="text-sm font-semibold mb-1">Active Tracking</div>
          {trackingTargets.map(target => (
            <div key={target.personId} className="text-xs">
              {target.personId} - {target.cameraId === cameraId ? 'This Camera' : 'Other Camera'}
            </div>
          ))}
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        {showTrajectories && (
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
            Trajectories
          </div>
        )}
        {showVelocity && (
          <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">
            Velocity
          </div>
        )}
        {showConnections && (
          <div className="bg-purple-500 text-white px-2 py-1 rounded text-xs">
            Connections
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingOverlay;