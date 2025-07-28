import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Detection, Camera, BoundingBox } from '../../../services/types/api';
import { useDetectionStore } from '../../../stores/detectionStore';
import { useTrackingStore } from '../../../stores/trackingStore';
import { frameHandler } from '../../../services/frameHandler';
import { performanceMonitor } from '../../../services/performanceMonitor';

interface InteractiveCameraViewProps {
  camera: Camera;
  detections: Detection[];
  onPersonSelect?: (personId: string) => void;
  onTrackingStart?: (detection: Detection) => void;
  className?: string;
  showOverlays?: boolean;
  enableClickToTrack?: boolean;
  highlightedPersonId?: string;
}

interface ClickCoordinates {
  x: number;
  y: number;
  timestamp: number;
}

export const InteractiveCameraView: React.FC<InteractiveCameraViewProps> = ({
  camera,
  detections,
  onPersonSelect,
  onTrackingStart,
  className = '',
  showOverlays = true,
  enableClickToTrack = true,
  highlightedPersonId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [clickCoordinates, setClickCoordinates] = useState<ClickCoordinates | null>(null);
  const [hoveredDetection, setHoveredDetection] = useState<Detection | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Store hooks
  const { startTracking, stopTracking } = useTrackingStore();
  const { selectDetection } = useDetectionStore();

  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load camera image
  useEffect(() => {
    if (camera.currentFrame?.imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setImageDimensions({ width: img.width, height: img.height });
        if (imageRef.current) {
          imageRef.current.src = camera.currentFrame!.imageUrl;
        }
      };
      img.src = camera.currentFrame.imageUrl;
    }
  }, [camera.currentFrame?.imageUrl]);

  // Draw image on canvas
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Track performance
    performanceMonitor.trackRenderTime(performance.now());
  }, [imageLoaded, camera.currentFrame?.imageUrl]);

  // Draw overlays
  useEffect(() => {
    if (!showOverlays || !overlayRef.current || !imageLoaded) return;

    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detections
    detections.forEach(detection => {
      drawDetectionOverlay(ctx, detection, canvas.width, canvas.height);
    });

    // Draw click coordinates
    if (clickCoordinates) {
      drawClickIndicator(ctx, clickCoordinates, canvas.width, canvas.height);
    }

    // Track performance
    performanceMonitor.trackRenderTime(performance.now());
  }, [detections, showOverlays, imageLoaded, clickCoordinates, hoveredDetection, highlightedPersonId]);

  // Draw detection overlay
  const drawDetectionOverlay = (
    ctx: CanvasRenderingContext2D,
    detection: Detection,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    if (!detection.boundingBox) return;

    const bbox = detection.boundingBox;
    const scaleX = canvasWidth / imageDimensions.width;
    const scaleY = canvasHeight / imageDimensions.height;

    // Scale bounding box coordinates
    const x = bbox.x * scaleX;
    const y = bbox.y * scaleY;
    const width = bbox.width * scaleX;
    const height = bbox.height * scaleY;

    // Determine colors and styles
    const isHighlighted = highlightedPersonId === detection.personId;
    const isHovered = hoveredDetection?.id === detection.id;
    const isSelected = detection.isSelected;

    let strokeColor = '#00ff00'; // Default green
    let strokeWidth = 2;
    let fillColor = 'rgba(0, 255, 0, 0.1)';

    if (isHighlighted) {
      strokeColor = '#ff6b35'; // Orange for highlighted
      strokeWidth = 3;
      fillColor = 'rgba(255, 107, 53, 0.2)';
    } else if (isSelected) {
      strokeColor = '#0066cc'; // Blue for selected
      strokeWidth = 3;
      fillColor = 'rgba(0, 102, 204, 0.2)';
    } else if (isHovered) {
      strokeColor = '#ffff00'; // Yellow for hovered
      strokeWidth = 2;
      fillColor = 'rgba(255, 255, 0, 0.1)';
    }

    // Draw bounding box
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.fillStyle = fillColor;
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Draw confidence and ID
    ctx.fillStyle = strokeColor;
    ctx.font = '12px Arial';
    ctx.fillText(
      `ID: ${detection.personId || 'N/A'} (${(detection.confidence * 100).toFixed(1)}%)`,
      x,
      y - 5
    );

    // Draw tracking indicator
    if (detection.isTracking) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(x + width - 10, y + 10, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // Draw click indicator
  const drawClickIndicator = (
    ctx: CanvasRenderingContext2D,
    coordinates: ClickCoordinates,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const { x, y } = coordinates;
    const age = Date.now() - coordinates.timestamp;
    const maxAge = 2000; // 2 seconds

    if (age > maxAge) {
      setClickCoordinates(null);
      return;
    }

    const alpha = 1 - (age / maxAge);
    const radius = 10 + (age / maxAge) * 20;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw cross hair
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  };

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableClickToTrack || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Store click coordinates
    setClickCoordinates({ x, y, timestamp: Date.now() });

    // Check if click is on a detection
    const clickedDetection = findDetectionAtPoint(x, y);
    
    if (clickedDetection) {
      // Select detection
      selectDetection(clickedDetection);
      onPersonSelect?.(clickedDetection.personId || '');
      
      // Start tracking if not already tracking
      if (!clickedDetection.isTracking) {
        handleStartTracking(clickedDetection);
      }
    } else {
      // Clear selection
      selectDetection(null);
    }
  }, [enableClickToTrack, detections, onPersonSelect, selectDetection]);

  // Find detection at point
  const findDetectionAtPoint = (x: number, y: number): Detection | null => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const scaleX = canvas.width / imageDimensions.width;
    const scaleY = canvas.height / imageDimensions.height;

    for (const detection of detections) {
      if (!detection.boundingBox) continue;

      const bbox = detection.boundingBox;
      const scaledX = bbox.x * scaleX;
      const scaledY = bbox.y * scaleY;
      const scaledWidth = bbox.width * scaleX;
      const scaledHeight = bbox.height * scaleY;

      if (
        x >= scaledX &&
        x <= scaledX + scaledWidth &&
        y >= scaledY &&
        y <= scaledY + scaledHeight
      ) {
        return detection;
      }
    }

    return null;
  };

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hoveredDet = findDetectionAtPoint(x, y);
    setHoveredDetection(hoveredDet);

    // Change cursor
    canvas.style.cursor = hoveredDet ? 'pointer' : 'default';
  }, [detections, imageDimensions]);

  // Handle start tracking
  const handleStartTracking = useCallback(async (detection: Detection) => {
    if (isTracking) return;

    setIsTracking(true);
    
    try {
      await startTracking(detection.personId || '', camera.id);
      onTrackingStart?.(detection);
    } catch (error) {
      console.error('Failed to start tracking:', error);
    } finally {
      setIsTracking(false);
    }
  }, [isTracking, startTracking, camera.id, onTrackingStart]);

  // Handle stop tracking
  const handleStopTracking = useCallback(async (detection: Detection) => {
    try {
      await stopTracking(detection.personId || '');
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  }, [stopTracking]);

  // Handle double click for tracking toggle
  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableClickToTrack) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const detection = findDetectionAtPoint(x, y);
    if (detection) {
      if (detection.isTracking) {
        handleStopTracking(detection);
      } else {
        handleStartTracking(detection);
      }
    }
  }, [enableClickToTrack, handleStartTracking, handleStopTracking]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        selectDetection(null);
        setClickCoordinates(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectDetection]);

  return (
    <div className={`relative ${className}`}>
      {/* Hidden image for loading */}
      <img
        ref={imageRef}
        style={{ display: 'none' }}
        alt="Camera frame"
        onLoad={() => setImageLoaded(true)}
      />

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full object-cover"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
      />

      {/* Overlay canvas */}
      {showOverlays && (
        <canvas
          ref={overlayRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Loading indicator */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="text-white text-sm">Loading camera...</div>
        </div>
      )}

      {/* Camera info */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {camera.name}
        {camera.isActive && (
          <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
        )}
      </div>

      {/* Detection count */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {detections.length} detections
      </div>

      {/* Tracking indicator */}
      {isTracking && (
        <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
          Starting tracking...
        </div>
      )}

      {/* Hover info */}
      {hoveredDetection && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          Person {hoveredDetection.personId || 'Unknown'} 
          ({(hoveredDetection.confidence * 100).toFixed(1)}%)
          {hoveredDetection.isTracking && (
            <span className="ml-1 text-red-400">• Tracking</span>
          )}
        </div>
      )}

      {/* Click to track hint */}
      {enableClickToTrack && detections.length > 0 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          Click to select • Double-click to track
        </div>
      )}
    </div>
  );
};

export default InteractiveCameraView;