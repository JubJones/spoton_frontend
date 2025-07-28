import React, { useEffect, useRef, useState } from 'react';
import { Detection, BoundingBox } from '../../../services/types/api';

interface DynamicBoundingBoxProps {
  detection: Detection;
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isHovered?: boolean;
  isTracking?: boolean;
  showTrajectory?: boolean;
  showVelocity?: boolean;
  showMetadata?: boolean;
  animationSpeed?: number;
  className?: string;
}

interface BoundingBoxState {
  position: { x: number; y: number; width: number; height: number };
  confidence: number;
  velocity: { x: number; y: number };
  previousPositions: { x: number; y: number; timestamp: number }[];
  pulsePhase: number;
  trackingDuration: number;
}

export const DynamicBoundingBox: React.FC<DynamicBoundingBoxProps> = ({
  detection,
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
  isSelected = false,
  isHighlighted = false,
  isHovered = false,
  isTracking = false,
  showTrajectory = false,
  showVelocity = false,
  showMetadata = true,
  animationSpeed = 1,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [boxState, setBoxState] = useState<BoundingBoxState>({
    position: { x: 0, y: 0, width: 0, height: 0 },
    confidence: detection.confidence,
    velocity: { x: 0, y: 0 },
    previousPositions: [],
    pulsePhase: 0,
    trackingDuration: 0,
  });

  // Calculate scaled position
  const getScaledPosition = (bbox: BoundingBox) => {
    const scaleX = canvasWidth / imageWidth;
    const scaleY = canvasHeight / imageHeight;
    
    return {
      x: bbox.x * scaleX,
      y: bbox.y * scaleY,
      width: bbox.width * scaleX,
      height: bbox.height * scaleY,
    };
  };

  // Update bounding box position
  useEffect(() => {
    if (!detection.boundingBox) return;

    const newPosition = getScaledPosition(detection.boundingBox);
    const now = Date.now();

    setBoxState(prev => {
      // Calculate velocity if we have previous position
      let velocity = prev.velocity;
      if (prev.previousPositions.length > 0) {
        const lastPos = prev.previousPositions[prev.previousPositions.length - 1];
        const timeDelta = now - lastPos.timestamp;
        if (timeDelta > 0) {
          velocity = {
            x: (newPosition.x - lastPos.x) / timeDelta * 1000, // pixels per second
            y: (newPosition.y - lastPos.y) / timeDelta * 1000,
          };
        }
      }

      // Update position history
      const newPreviousPositions = [
        ...prev.previousPositions,
        { x: newPosition.x, y: newPosition.y, timestamp: now }
      ].slice(-10); // Keep last 10 positions

      return {
        ...prev,
        position: newPosition,
        confidence: detection.confidence,
        velocity,
        previousPositions: newPreviousPositions,
        trackingDuration: isTracking ? prev.trackingDuration : 0,
      };
    });
  }, [detection.boundingBox, canvasWidth, canvasHeight, imageWidth, imageHeight, isTracking]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setBoxState(prev => ({
        ...prev,
        pulsePhase: (prev.pulsePhase + animationSpeed * 0.1) % (Math.PI * 2),
        trackingDuration: isTracking ? prev.trackingDuration + 16 : 0, // 16ms per frame
      }));

      if (isTracking || isSelected || isHighlighted) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isTracking || isSelected || isHighlighted) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTracking, isSelected, isHighlighted, animationSpeed]);

  // Draw bounding box
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { position, confidence, velocity, previousPositions, pulsePhase, trackingDuration } = boxState;

    // Determine colors and styles
    let strokeColor = '#00ff00'; // Default green
    let fillColor = 'rgba(0, 255, 0, 0.1)';
    let strokeWidth = 2;

    if (isHighlighted) {
      strokeColor = '#ff6b35'; // Orange
      fillColor = 'rgba(255, 107, 53, 0.2)';
      strokeWidth = 3;
    } else if (isSelected) {
      strokeColor = '#0066cc'; // Blue
      fillColor = 'rgba(0, 102, 204, 0.2)';
      strokeWidth = 3;
    } else if (isTracking) {
      strokeColor = '#ff0000'; // Red
      fillColor = 'rgba(255, 0, 0, 0.2)';
      strokeWidth = 3;
    } else if (isHovered) {
      strokeColor = '#ffff00'; // Yellow
      fillColor = 'rgba(255, 255, 0, 0.1)';
      strokeWidth = 2;
    }

    // Apply confidence-based transparency
    const alpha = Math.max(0.3, confidence);
    
    // Draw trajectory if enabled
    if (showTrajectory && previousPositions.length > 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      previousPositions.forEach((pos, index) => {
        if (index === 0) {
          ctx.moveTo(pos.x + position.width / 2, pos.y + position.height / 2);
        } else {
          ctx.lineTo(pos.x + position.width / 2, pos.y + position.height / 2);
        }
      });
      ctx.stroke();

      // Draw position markers
      previousPositions.forEach((pos, index) => {
        const markerAlpha = index / previousPositions.length;
        ctx.fillStyle = `rgba(255, 255, 255, ${markerAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(pos.x + position.width / 2, pos.y + position.height / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw velocity indicator
    if (showVelocity && (Math.abs(velocity.x) > 1 || Math.abs(velocity.y) > 1)) {
      const centerX = position.x + position.width / 2;
      const centerY = position.y + position.height / 2;
      const arrowLength = Math.min(50, Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y) * 0.1);
      const angle = Math.atan2(velocity.y, velocity.x);
      
      ctx.strokeStyle = '#ff9500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + arrowLength * Math.cos(angle), centerY + arrowLength * Math.sin(angle));
      ctx.stroke();

      // Arrow head
      const arrowHeadLength = 8;
      const arrowHeadAngle = Math.PI / 6;
      const endX = centerX + arrowLength * Math.cos(angle);
      const endY = centerY + arrowLength * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle),
        endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle),
        endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle)
      );
      ctx.stroke();
    }

    // Draw pulsing effect for tracking
    if (isTracking) {
      const pulseSize = 5 + Math.sin(pulsePhase) * 3;
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(pulsePhase) * 0.3})`;
      ctx.lineWidth = pulseSize;
      ctx.strokeRect(
        position.x - pulseSize / 2,
        position.y - pulseSize / 2,
        position.width + pulseSize,
        position.height + pulseSize
      );
    }

    // Draw main bounding box
    ctx.fillStyle = `rgba(${parseInt(strokeColor.slice(1, 3), 16)}, ${parseInt(strokeColor.slice(3, 5), 16)}, ${parseInt(strokeColor.slice(5, 7), 16)}, ${alpha * 0.2})`;
    ctx.fillRect(position.x, position.y, position.width, position.height);
    
    ctx.strokeStyle = `rgba(${parseInt(strokeColor.slice(1, 3), 16)}, ${parseInt(strokeColor.slice(3, 5), 16)}, ${parseInt(strokeColor.slice(5, 7), 16)}, ${alpha})`;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(position.x, position.y, position.width, position.height);

    // Draw corner indicators for selected/highlighted
    if (isSelected || isHighlighted) {
      const cornerSize = 8;
      ctx.fillStyle = strokeColor;
      
      // Top-left corner
      ctx.fillRect(position.x - cornerSize / 2, position.y - cornerSize / 2, cornerSize, cornerSize);
      // Top-right corner
      ctx.fillRect(position.x + position.width - cornerSize / 2, position.y - cornerSize / 2, cornerSize, cornerSize);
      // Bottom-left corner
      ctx.fillRect(position.x - cornerSize / 2, position.y + position.height - cornerSize / 2, cornerSize, cornerSize);
      // Bottom-right corner
      ctx.fillRect(position.x + position.width - cornerSize / 2, position.y + position.height - cornerSize / 2, cornerSize, cornerSize);
    }

    // Draw metadata
    if (showMetadata) {
      ctx.fillStyle = strokeColor;
      ctx.font = '12px Arial';
      
      // Person ID and confidence
      const personId = detection.personId || 'Unknown';
      const confidenceText = `${personId} (${(confidence * 100).toFixed(1)}%)`;
      ctx.fillText(confidenceText, position.x, position.y - 5);

      // Velocity information
      if (showVelocity && (Math.abs(velocity.x) > 1 || Math.abs(velocity.y) > 1)) {
        const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const velocityText = `${velocityMagnitude.toFixed(1)} px/s`;
        ctx.fillText(velocityText, position.x, position.y + position.height + 15);
      }

      // Tracking duration
      if (isTracking && trackingDuration > 0) {
        const durationText = `${(trackingDuration / 1000).toFixed(1)}s`;
        ctx.fillStyle = '#ff0000';
        ctx.fillText(durationText, position.x + position.width - 40, position.y - 5);
      }
    }

    // Draw tracking indicator
    if (isTracking) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(position.x + position.width - 10, position.y + 10, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Pulsing ring
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(pulsePhase * 2) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x + position.width - 10, position.y + 10, 5 + Math.sin(pulsePhase * 2) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw confidence bar
    if (showMetadata) {
      const barWidth = 40;
      const barHeight = 4;
      const barX = position.x + position.width - barWidth - 5;
      const barY = position.y + position.height - barHeight - 5;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Confidence level
      const confidenceWidth = barWidth * confidence;
      const confidenceColor = confidence > 0.8 ? '#00ff00' : confidence > 0.6 ? '#ffff00' : '#ff0000';
      ctx.fillStyle = confidenceColor;
      ctx.fillRect(barX, barY, confidenceWidth, barHeight);
    }

  }, [boxState, isSelected, isHighlighted, isHovered, isTracking, showTrajectory, showVelocity, showMetadata, detection]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
};

export default DynamicBoundingBox;