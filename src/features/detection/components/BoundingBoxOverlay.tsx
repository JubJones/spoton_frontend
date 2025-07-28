import React from 'react';

interface Track {
  track_id: number;
  global_id: number;
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords?: [number, number];
}

interface ScaleInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface BoundingBoxOverlayProps {
  tracks: Track[];
  scaleInfo: ScaleInfo;
  selectedPersonId?: number | null;
  onPersonClick?: (personId: number) => void;
}

const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  tracks,
  scaleInfo,
  selectedPersonId,
  onPersonClick,
}) => {
  const getBoxColor = (track: Track): string => {
    // Highlight selected person
    if (selectedPersonId && track.global_id === selectedPersonId) {
      return '#ff6b6b'; // Red for selected
    }
    
    // Color based on confidence
    if (track.confidence > 0.8) {
      return '#00ff00'; // Green for high confidence
    } else if (track.confidence > 0.6) {
      return '#ffff00'; // Yellow for medium confidence
    } else {
      return '#ff8800'; // Orange for low confidence
    }
  };

  const getBoxOpacity = (track: Track): number => {
    // Higher opacity for selected person
    if (selectedPersonId && track.global_id === selectedPersonId) {
      return 1.0;
    }
    
    // Opacity based on confidence
    return Math.max(0.6, track.confidence);
  };

  const handlePersonClick = (track: Track, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onPersonClick) {
      onPersonClick(track.global_id);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {tracks.map((track) => {
        const [x1, y1, x2, y2] = track.bbox_xyxy;
        
        // Transform coordinates using scale info
        const scaledX1 = x1 * scaleInfo.scale + scaleInfo.offsetX;
        const scaledY1 = y1 * scaleInfo.scale + scaleInfo.offsetY;
        const scaledWidth = (x2 - x1) * scaleInfo.scale;
        const scaledHeight = (y2 - y1) * scaleInfo.scale;
        
        const boxColor = getBoxColor(track);
        const boxOpacity = getBoxOpacity(track);
        
        const boxStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${scaledX1}px`,
          top: `${scaledY1}px`,
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          border: `2px solid ${boxColor}`,
          backgroundColor: `${boxColor}20`, // 20% opacity background
          opacity: boxOpacity,
          pointerEvents: 'auto',
          cursor: 'pointer',
        };

        const labelStyle: React.CSSProperties = {
          position: 'absolute',
          top: '-20px',
          left: '0px',
          backgroundColor: boxColor,
          color: 'white',
          padding: '2px 6px',
          fontSize: '11px',
          fontWeight: 'bold',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
        };

        const confidenceStyle: React.CSSProperties = {
          position: 'absolute',
          bottom: '-20px',
          left: '0px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '1px 4px',
          fontSize: '10px',
          borderRadius: '2px',
          whiteSpace: 'nowrap',
        };

        return (
          <div
            key={`${track.global_id}-${track.track_id}`}
            style={boxStyle}
            onClick={(e) => handlePersonClick(track, e)}
            title={`Person ${track.global_id} | Confidence: ${(track.confidence * 100).toFixed(1)}%`}
          >
            {/* Person ID Label */}
            <div style={labelStyle}>
              ID: {track.global_id}
            </div>
            
            {/* Confidence Score */}
            <div style={confidenceStyle}>
              {(track.confidence * 100).toFixed(1)}%
            </div>
            
            {/* Track ID for debugging */}
            {import.meta.env.DEV && (
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '1px 3px',
                  fontSize: '9px',
                  borderRadius: '2px',
                }}
              >
                T{track.track_id}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BoundingBoxOverlay;