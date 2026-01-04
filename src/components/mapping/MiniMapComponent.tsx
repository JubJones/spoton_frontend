import React, { useRef, useEffect, useState, useMemo } from 'react';

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

const CAMERA_HUE_MAP: Record<string, number> = {
  c01: 205,
  c02: 140,
  c03: 28,
  c05: 320,
  c09: 260,
  c12: 36,
  c13: 12,
  c16: 180,
};

const hashCameraIdToHue = (cameraId: string): number => {
  let hash = 0;
  for (let i = 0; i < cameraId.length; i += 1) {
    hash = (hash << 5) - hash + cameraId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 360;
};

const buildCameraColors = (cameraId: string) => {
  const hue = CAMERA_HUE_MAP[cameraId] ?? hashCameraIdToHue(cameraId);
  const base = `hsl(${hue}, 80%, 60%)`;
  const trail = (alpha: number) => `hsla(${hue}, 75%, 60%, ${alpha})`;
  const label = `hsl(${hue}, 40%, 75%)`;
  return {
    base,
    trailLine: trail(0.45),
    trailPoint: (alpha: number) => trail(alpha),
    label,
  };
};

/**
 * MiniMapComponent - Renders a 2D map showing person positions and movement trails
 * 
 * This component integrates with the detection endpoint WebSocket stream to display
 * real-time person positions as dots on a 2D coordinate system. It shows:
 * - Current person positions color-coded per camera
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
  const cameraColors = useMemo(() => buildCameraColors(cameraId), [cameraId]);

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

    // Clear canvas so underlying card background shows through
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

    // Optional grid (disabled for clean, consistent look like c02)
    const showGrid = false;
    if (showGrid) {
      ctx.strokeStyle = '#eaeaea';
      ctx.lineWidth = 1;
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
    }

    // Draw person dots and trails
    mappingCoordinates.forEach((coord, index) => {
      if (!coord.projection_successful) return;

      const currentPos = mapToCanvas(coord.map_x, coord.map_y);

      // Draw trail if available
      if (coord.trail && coord.trail.length > 1) {
        // Draw trail lines in camera-specific color
        ctx.strokeStyle = cameraColors.trailLine;
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
          ctx.fillStyle = cameraColors.trailPoint(Math.max(alpha, 0.2));
          ctx.beginPath();
          ctx.arc(trailPos.x, trailPos.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Draw current position (larger dot)
      ctx.fillStyle = cameraColors.base;
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw detection ID (last 3 characters for brevity)
      ctx.fillStyle = cameraColors.label;
      ctx.font = '10px Arial';
      ctx.fillText(
        coord.detection_id.slice(-3), 
        currentPos.x + 8, 
        currentPos.y - 8
      );
    });

    // Draw camera label (keep minimal)
    ctx.fillStyle = cameraColors.label;
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`Camera ${cameraId}`, 10, 20);

  }, [mappingCoordinates, mapBounds, width, height, cameraColors]);

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
