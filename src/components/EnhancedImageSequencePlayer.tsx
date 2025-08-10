// src/components/EnhancedImageSequencePlayer.tsx
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { TrackedPerson } from '../types/api';

// Enhanced interface for WebSocket-based data
interface EnhancedImageSequencePlayerProps {
  cameraId: string;
  // Support both file-based and base64 image sources
  imageSrc?: string; // File path for historical data
  base64Image?: string; // Base64 image from WebSocket
  tracks: TrackedPerson[];
  className?: string;
  // Event handlers
  onPersonClick?: (person: TrackedPerson) => void;
  onPersonHover?: (person: TrackedPerson | null) => void;
  // Display options
  showConfidence?: boolean;
  showPersonIds?: boolean;
  highlightedPersonIds?: Set<string>;
  // Loading state
  isLoading?: boolean;
}

interface ScaleInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// Original image dimensions
const ORIGINAL_WIDTH = 1920;
const ORIGINAL_HEIGHT = 1080;

// Color palette for person highlighting
const PERSON_COLORS = [
  '#00FF00', // Lime
  '#FF6B35', // Orange
  '#F7931E', // Yellow-orange
  '#FFD23F', // Yellow
  '#06FFA5', // Mint
  '#118AB2', // Blue
  '#073B4C', // Dark blue
  '#EF476F', // Pink
  '#8338EC', // Purple
  '#FB8500', // Orange
];

const EnhancedImageSequencePlayer: React.FC<EnhancedImageSequencePlayerProps> = ({
  cameraId,
  imageSrc,
  base64Image,
  tracks = [],
  className = '',
  onPersonClick,
  onPersonHover,
  showConfidence = false,
  showPersonIds = true,
  highlightedPersonIds = new Set(),
  isLoading = false,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo | null>(null);
  const [imageError, setImageError] = useState(false);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  // Calculate image source - prioritize base64 over file path
  const imageSource = base64Image
    ? `data:image/jpeg;base64,${base64Image}`
    : imageSrc || '/placeholder.png';

  // Calculate scaling when image or container size changes
  const calculateScale = useCallback(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      const imgElement = imgRef.current;
      const renderedWidth = imgElement.width;
      const renderedHeight = imgElement.height;
      const offsetX = imgElement.offsetLeft;
      const offsetY = imgElement.offsetTop;
      const scale = renderedWidth / ORIGINAL_WIDTH;

      setScaleInfo({ scale, offsetX, offsetY });
    } else {
      setScaleInfo(null);
    }
  }, []);

  // Effect to handle scaling calculations
  useEffect(() => {
    calculateScale();

    const imgElement = imgRef.current;
    if (imgElement) {
      imgElement.addEventListener('load', calculateScale);
    }

    const handleResize = () => {
      setTimeout(calculateScale, 100); // Debounce resize
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (imgElement) {
        imgElement.removeEventListener('load', calculateScale);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateScale, imageSource]);

  // Get person color based on ID
  const getPersonColor = useCallback((personId: string, isHighlighted: boolean) => {
    if (isHighlighted) {
      return '#FFD700'; // Gold for highlighted persons
    }
    const colorIndex = parseInt(personId?.slice(-2) || '0', 36) % PERSON_COLORS.length;
    return PERSON_COLORS[colorIndex];
  }, []);

  // Handle person interaction
  const handlePersonClick = useCallback(
    (person: TrackedPerson, event: React.MouseEvent) => {
      event.stopPropagation();
      onPersonClick?.(person);
    },
    [onPersonClick]
  );

  const handlePersonMouseEnter = useCallback(
    (person: TrackedPerson) => {
      setHoveredPersonId(person.global_id || `${person.track_id}`);
      onPersonHover?.(person);
    },
    [onPersonHover]
  );

  const handlePersonMouseLeave = useCallback(() => {
    setHoveredPersonId(null);
    onPersonHover?.(null);
  }, [onPersonHover]);

  return (
    <div
      className={`relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Image Display */}
      <img
        ref={imgRef}
        key={`${cameraId}-${imageSource}`}
        src={imageSource}
        alt={`Camera ${cameraId}`}
        className="object-contain w-full h-full"
        onLoad={() => {
          setImageError(false);
          calculateScale();
        }}
        onError={() => {
          setImageError(true);
          setScaleInfo(null);
        }}
      />

      {/* Error State */}
      {imageError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">📷</div>
            <div>Camera {cameraId}</div>
            <div className="text-sm">Frame not available</div>
          </div>
        </div>
      )}

      {/* Bounding Box Overlays */}
      {scaleInfo &&
        !imageError &&
        tracks.map((track) => {
          const personId = track.global_id || `${track.track_id}`;
          const isHighlighted = highlightedPersonIds.has(personId);
          const isHovered = hoveredPersonId === personId;

          // Calculate scaled coordinates
          const [x1, y1, x2, y2] = track.bbox_xyxy;
          const scaledX1 = x1 * scaleInfo.scale + scaleInfo.offsetX;
          const scaledY1 = y1 * scaleInfo.scale + scaleInfo.offsetY;
          const scaledWidth = (x2 - x1) * scaleInfo.scale;
          const scaledHeight = (y2 - y1) * scaleInfo.scale;

          const personColor = getPersonColor(personId, isHighlighted);
          const borderWidth = isHighlighted ? 3 : isHovered ? 2.5 : 2;
          const opacity = isHighlighted ? 1 : isHovered ? 0.9 : 0.8;

          return (
            <div
              key={personId}
              className="absolute cursor-pointer transition-all duration-200"
              style={{
                left: `${scaledX1}px`,
                top: `${scaledY1}px`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                border: `${borderWidth}px solid ${personColor}`,
                opacity,
                boxShadow: isHighlighted ? `0 0 10px ${personColor}` : undefined,
              }}
              onClick={(e) => handlePersonClick(track, e)}
              onMouseEnter={() => handlePersonMouseEnter(track)}
              onMouseLeave={handlePersonMouseLeave}
            >
              {/* Person ID Label */}
              {showPersonIds && (
                <div
                  className="absolute text-xs font-bold px-1 py-0.5 rounded whitespace-nowrap select-none"
                  style={{
                    top: '-20px',
                    left: '0px',
                    backgroundColor: personColor,
                    color: '#000',
                    fontSize: isHighlighted ? '11px' : '10px',
                  }}
                >
                  {personId}
                </div>
              )}

              {/* Confidence Score */}
              {showConfidence && track.confidence !== undefined && (
                <div
                  className="absolute text-xs px-1 py-0.5 rounded whitespace-nowrap select-none"
                  style={{
                    bottom: '-18px',
                    left: '0px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    fontSize: '9px',
                  }}
                >
                  {Math.round((track.confidence || 0) * 100)}%
                </div>
              )}

              {/* Hover Info Tooltip */}
              {isHovered && (
                <div
                  className="absolute z-20 bg-black/90 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                  style={{
                    top: `${scaledHeight + 5}px`,
                    left: '0px',
                    minWidth: '120px',
                  }}
                >
                  <div>ID: {personId}</div>
                  {track.confidence !== undefined && (
                    <div>Confidence: {Math.round(track.confidence * 100)}%</div>
                  )}
                  {track.map_coords && (
                    <div>
                      Map: ({track.map_coords[0].toFixed(1)}, {track.map_coords[1].toFixed(1)})
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

      {/* Camera Info Overlay */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        <div className="font-semibold">Camera {cameraId}</div>
        {tracks.length > 0 && (
          <div className="text-green-400">
            {tracks.length} person{tracks.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Frame Type Indicator */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {base64Image ? '🔴 LIVE' : '📁 FILE'}
      </div>
    </div>
  );
};

// Memoize the component with custom comparison
export default memo(EnhancedImageSequencePlayer, (prevProps, nextProps) => {
  // Compare primitive props
  if (
    prevProps.cameraId !== nextProps.cameraId ||
    prevProps.imageSrc !== nextProps.imageSrc ||
    prevProps.base64Image !== nextProps.base64Image ||
    prevProps.className !== nextProps.className ||
    prevProps.showConfidence !== nextProps.showConfidence ||
    prevProps.showPersonIds !== nextProps.showPersonIds ||
    prevProps.isLoading !== nextProps.isLoading
  ) {
    return false;
  }

  // Compare callback props (should be stable with useCallback)
  if (
    prevProps.onPersonClick !== nextProps.onPersonClick ||
    prevProps.onPersonHover !== nextProps.onPersonHover
  ) {
    return false;
  }

  // Compare tracks array
  if (prevProps.tracks.length !== nextProps.tracks.length) {
    return false;
  }

  for (let i = 0; i < prevProps.tracks.length; i++) {
    const prevTrack = prevProps.tracks[i];
    const nextTrack = nextProps.tracks[i];

    if (
      prevTrack.track_id !== nextTrack.track_id ||
      prevTrack.global_id !== nextTrack.global_id ||
      prevTrack.confidence !== nextTrack.confidence ||
      JSON.stringify(prevTrack.bbox_xyxy) !== JSON.stringify(nextTrack.bbox_xyxy) ||
      JSON.stringify(prevTrack.map_coords) !== JSON.stringify(nextTrack.map_coords)
    ) {
      return false;
    }
  }

  // Compare highlightedPersonIds Set
  const prevHighlighted = prevProps.highlightedPersonIds
    ? Array.from(prevProps.highlightedPersonIds).sort()
    : [];
  const nextHighlighted = nextProps.highlightedPersonIds
    ? Array.from(nextProps.highlightedPersonIds).sort()
    : [];

  if (prevHighlighted.length !== nextHighlighted.length) {
    return false;
  }

  for (let i = 0; i < prevHighlighted.length; i++) {
    if (prevHighlighted[i] !== nextHighlighted[i]) {
      return false;
    }
  }

  return true; // Props are equal, skip re-render
});
