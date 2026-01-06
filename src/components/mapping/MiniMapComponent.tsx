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
  fixedBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

// Color palette for professional appearance
const COLORS = {
  bgGradientStart: '#0f172a',
  bgGradientEnd: '#1e293b',
  gridMajor: 'rgba(100, 116, 139, 0.3)',
  gridText: 'rgba(148, 163, 184, 0.6)',
  personPrimary: '#22d3ee',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  accents: [
    { primary: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' },
    { primary: '#a78bfa', glow: 'rgba(167, 139, 250, 0.4)' },
    { primary: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
    { primary: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)' },
    { primary: '#f472b6', glow: 'rgba(244, 114, 182, 0.4)' },
    { primary: '#60a5fa', glow: 'rgba(96, 165, 250, 0.4)' },
  ],
};

/**
 * MiniMapComponent - Renders a professional 2D map showing person positions
 */
export const MiniMapComponent: React.FC<MiniMapComponentProps> = ({
  cameraId,
  mappingCoordinates,
  width = 300,
  height = 200,
  className = '',
  fixedBounds
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapBounds, setMapBounds] = useState({
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10
  });

  // Calculate dynamic map bounds based on current coordinates OR use fixed bounds
  useEffect(() => {
    // If fixed bounds are provided, use them and DO NOT calculate from data
    if (fixedBounds) {
      setMapBounds(fixedBounds);
      return;
    }

    if (mappingCoordinates.length > 0) {
      const validCoords = mappingCoordinates.filter(coord => coord.projection_successful);
      if (validCoords.length > 0) {
        const allCoords: { x: number; y: number }[] = [];

        validCoords.forEach(coord => {
          allCoords.push({ x: coord.map_x, y: coord.map_y });
          if (coord.trail && coord.trail.length > 0) {
            coord.trail.forEach(point => {
              allCoords.push({ x: point.x, y: point.y });
            });
          }
        });

        const xs = allCoords.map(c => c.x);
        const ys = allCoords.map(c => c.y);

        const padding = 3;
        const minBoundSize = 8;

        let minX = Math.min(...xs) - padding;
        let maxX = Math.max(...xs) + padding;
        let minY = Math.min(...ys) - padding;
        let maxY = Math.max(...ys) + padding;

        if (maxX - minX < minBoundSize) {
          const center = (maxX + minX) / 2;
          minX = center - minBoundSize / 2;
          maxX = center + minBoundSize / 2;
        }
        if (maxY - minY < minBoundSize) {
          const center = (maxY + minY) / 2;
          minY = center - minBoundSize / 2;
          maxY = center + minBoundSize / 2;
        }

        setMapBounds({ minX, maxX, minY, maxY });
      }
    }
  }, [mappingCoordinates, fixedBounds]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set canvas size
    canvas.width = width;
    canvas.height = height;

    // Draw dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, COLORS.bgGradientStart);
    bgGradient.addColorStop(1, COLORS.bgGradientEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const { minX, maxX, minY, maxY } = mapBounds;
    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);

    const mapToCanvas = (mapX: number, mapY: number) => ({
      x: (mapX - minX) * scaleX,
      y: (mapY - minY) * scaleY
    });

    // Draw grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.gridMajor;
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

    // Draw coordinate labels
    ctx.fillStyle = COLORS.gridText;
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';

    for (let x = Math.ceil(minX / (gridSize * 2)) * gridSize * 2; x <= maxX; x += gridSize * 2) {
      const canvasX = mapToCanvas(x, 0).x;
      if (canvasX > 20 && canvasX < width - 20) {
        ctx.fillText(`${x.toFixed(0)}m`, canvasX, height - 4);
      }
    }

    ctx.textAlign = 'left';
    for (let y = Math.ceil(minY / (gridSize * 2)) * gridSize * 2; y <= maxY; y += gridSize * 2) {
      const canvasY = mapToCanvas(0, y).y;
      if (canvasY > 15 && canvasY < height - 15) {
        ctx.fillText(`${y.toFixed(0)}m`, 4, canvasY + 3);
      }
    }

    // Draw person dots and trails
    mappingCoordinates.forEach((coord, index) => {
      if (!coord.projection_successful) return;

      const colorSet = COLORS.accents[index % COLORS.accents.length];
      const currentPos = mapToCanvas(coord.map_x, coord.map_y);

      // Draw trail if available
      if (coord.trail && coord.trail.length > 1) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
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

        // Trail dots
        coord.trail.forEach((point, pointIndex) => {
          const trailPos = mapToCanvas(point.x, point.y);
          const alpha = 0.3 + (pointIndex / coord.trail!.length) * 0.5;
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
          ctx.beginPath();
          ctx.arc(trailPos.x, trailPos.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Draw glow
      const gradient = ctx.createRadialGradient(
        currentPos.x, currentPos.y, 0,
        currentPos.x, currentPos.y, 18
      );
      gradient.addColorStop(0, colorSet.glow);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 18, 0, 2 * Math.PI);
      ctx.fill();

      // Draw main dot
      ctx.fillStyle = colorSet.primary;
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // White center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Detection ID label
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`#${coord.detection_id.slice(-4)}`, currentPos.x + 12, currentPos.y + 3);
    });

    // Camera badge in top-left
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 80, 26);

    ctx.fillStyle = COLORS.personPrimary;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📍 ${cameraId.toUpperCase()}`, 8, 17);

    // Person count in top-right
    const validCount = mappingCoordinates.filter(c => c.projection_successful).length;
    if (validCount > 0) {
      const countText = `${validCount} 👤`;
      const textWidth = ctx.measureText(countText).width + 16;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(width - textWidth - 4, 0, textWidth + 4, 26);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(countText, width - 8, 17);
    }

  }, [mappingCoordinates, mapBounds, width, height, cameraId]);

  const validPersonCount = mappingCoordinates.filter(c => c.projection_successful).length;

  return (
    <div className={`mini-map-container ${className}`} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '12px',
          display: 'block',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(100, 116, 139, 0.2)',
        }}
        aria-label={`2D map for camera ${cameraId} showing ${validPersonCount} persons`}
      />
      {/* Status bar overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95), transparent)',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          fontSize: '11px',
        }}
      >
        <span style={{ color: '#94a3b8', fontWeight: 500 }}>
          BEV Coordinates
        </span>
        <span style={{ color: '#34d399', fontWeight: 600 }}>
          {validPersonCount > 0 ? `${validPersonCount} tracked` : 'No detections'}
        </span>
      </div>
    </div>
  );
};