import React, { useRef, useEffect, useState } from 'react';

/**
 * Trail point representing a person's position in their movement history
 */
interface TrailPoint {
  x: number;
  y: number;
  frame_offset: number;
  timestamp: string;
}

/**
 * Mapping coordinate data from the detection endpoint
 */
interface MappingCoordinate {
  detection_id: string;
  map_x: number;
  map_y: number;
  projection_successful: boolean;
  coordinate_system: string;
  trail?: TrailPoint[];
}

/**
 * Props for the MiniMapComponent
 */
interface MiniMapComponentProps {
  cameraId: string;
  mappingCoordinates: MappingCoordinate[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * MiniMapComponent - Renders a 2D map showing person positions and movement trails
 * 
 * This component integrates with the detection endpoint WebSocket stream to display
 * real-time person positions as dots on a 2D coordinate system. It shows:
 * - Current person positions as blue dots
 * - Movement trails (last 3 positions) as connected lines with fading points
 * - Grid coordinate system with meter-based scaling
 * - Camera identifier label
 * 
 * @param props - Component props
 */
export const MiniMapComponent: React.FC<MiniMapComponentProps> = ({
  cameraId,
  mappingCoordinates,
  width = 300,
  height = 200,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapBounds, setMapBounds] = useState({ 
    minX: -10, 
    maxX: 10, 
    minY: -10, 
    maxY: 10 
  });

  // Calculate dynamic map bounds based on current coordinates
  useEffect(() => {
    if (mappingCoordinates.length > 0) {
      const validCoords = mappingCoordinates.filter(coord => coord.projection_successful);
      if (validCoords.length > 0) {
        // Get all coordinates including trail points
        const allCoords: { x: number; y: number }[] = [];
        
        validCoords.forEach(coord => {
          allCoords.push({ x: coord.map_x, y: coord.map_y });
          
          // Include trail points for bounds calculation
          if (coord.trail && coord.trail.length > 0) {
            coord.trail.forEach(point => {
              allCoords.push({ x: point.x, y: point.y });
            });
          }
        });
        
        const xs = allCoords.map(c => c.x);
        const ys = allCoords.map(c => c.y);
        
        const padding = 2; // meters
        setMapBounds({
          minX: Math.min(...xs) - padding,
          maxX: Math.max(...xs) + padding,
          minY: Math.min(...ys) - padding,
          maxY: Math.max(...ys) + padding
        });
      }
    }
  }, [mappingCoordinates]);

  // Render the map on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const { minX, maxX, minY, maxY } = mapBounds;
    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);

    // Helper function to convert map coordinates to canvas coordinates
    // Map coordinates directly to canvas without vertical flip so that
    // increasing Y in map corresponds to moving down on canvas. This fixes
    // the visual reversal seen previously.
    const mapToCanvas = (mapX: number, mapY: number) => ({
      x: (mapX - minX) * scaleX,
      y: (mapY - minY) * scaleY
    });

    // Draw coordinate system background
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Grid lines every 2 meters
    const gridSize = 2;
    for (let x = Math.ceil(minX / gridSize) * gridSize; x <= maxX; x += gridSize) {
      const canvasX = mapToCanvas(x, 0).x;
      ctx.beginPath();
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, height);
      ctx.stroke();
    }
    
    for (let y = Math.ceil(minY / gridSize) * gridSize; y <= maxY; y += gridSize) {
      const canvasY = mapToCanvas(0, y).y;
      ctx.beginPath();
      ctx.moveTo(0, canvasY);
      ctx.lineTo(width, canvasY);
      ctx.stroke();
    }

    // Draw axes (origin lines if visible)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    
    if (minX <= 0 && maxX >= 0) {
      const originX = mapToCanvas(0, 0).x;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();
    }
    
    if (minY <= 0 && maxY >= 0) {
      const originY = mapToCanvas(0, 0).y;
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();
    }

    // Draw person dots and trails
    mappingCoordinates.forEach((coord, index) => {
      if (!coord.projection_successful) return;

      const currentPos = mapToCanvas(coord.map_x, coord.map_y);

      // Draw trail if available
      if (coord.trail && coord.trail.length > 1) {
        // Draw trail lines
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        coord.trail.forEach((point, pointIndex) => {
          const trailPos = mapToCanvas(point.x, point.y);
          
          if (pointIndex === 0) {
            ctx.moveTo(trailPos.x, trailPos.y);
          } else {
            ctx.lineTo(trailPos.x, trailPos.y);
          }
        });
        ctx.stroke();

        // Draw trail points with fading effect
        coord.trail.forEach((point, pointIndex) => {
          const trailPos = mapToCanvas(point.x, point.y);
          const alpha = 1 - (pointIndex * 0.3); // Fade older points
          
          ctx.fillStyle = `rgba(100, 150, 255, ${Math.max(alpha, 0.2)})`;
          ctx.beginPath();
          ctx.arc(trailPos.x, trailPos.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Draw current position (larger dot)
      ctx.fillStyle = '#007bff';
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw detection ID (last 3 characters for brevity)
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.fillText(
        coord.detection_id.slice(-3), 
        currentPos.x + 8, 
        currentPos.y - 8
      );
    });

    // Draw camera label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`Camera ${cameraId}`, 10, 20);

    // Draw coordinate info
    ctx.fillStyle = '#666';
    ctx.font = '9px Arial';
    ctx.fillText(
      `${minX.toFixed(1)}m - ${maxX.toFixed(1)}m`, 
      10, 
      height - 25
    );
    ctx.fillText(
      `${minY.toFixed(1)}m - ${maxY.toFixed(1)}m`, 
      10, 
      height - 10
    );

  }, [mappingCoordinates, mapBounds, width, height, cameraId]);

  const validPersonCount = mappingCoordinates.filter(c => c.projection_successful).length;

  return (
    <div className={`mini-map-container ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          border: '1px solid #ccc', 
          borderRadius: '4px',
          display: 'block'
        }}
        aria-label={`2D map for camera ${cameraId} showing ${validPersonCount} persons`}
      />
      <div className="map-info text-xs text-gray-600 mt-1">
        Map Coordinates ({validPersonCount} person{validPersonCount !== 1 ? 's' : ''})
      </div>
    </div>
  );
};