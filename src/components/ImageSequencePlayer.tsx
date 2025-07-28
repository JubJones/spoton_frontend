// src/components/ImageSequencePlayer.tsx
import React, { useState, useEffect, useRef } from 'react'; // Added useState, useEffect, useRef
// import { Track } from '../types'; // Import if types are external

// --- Type Definitions (if not imported) ---
interface Track {
  track_id: number;
  global_id: number;
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords?: [number, number];
}
// --- End Type Definitions ---

// Props Interface
interface ImageSequencePlayerProps {
  cameraId: string;
  basePath: string;
  startFrame: number;
  frameCount: number;
  currentFrameIndex: number;
  tracks: Track[] | null;
  className?: string;
  imageExtension?: string;
}

// Interface for storing calculated scaling information
interface ScaleInfo {
    scale: number;
    offsetX: number;
    offsetY: number;
}

// Original image dimensions (important!)
const ORIGINAL_WIDTH = 1920;

// --- Component ---
const ImageSequencePlayer: React.FC<ImageSequencePlayerProps> = ({
  cameraId,
  basePath,
  startFrame,
  frameCount,
  currentFrameIndex,
  tracks,
  className = '',
  imageExtension = 'jpg',
}) => {
  // Ref to access the img DOM element
  const imgRef = useRef<HTMLImageElement>(null);
  // State to store the calculated scale and offset
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo | null>(null);

  // Calculate image URL (same as before)
  let frameUrl = `/placeholder.png`;
  let displayFrameNumber = startFrame;
  const safeIndex = frameCount > 0 ? currentFrameIndex % frameCount : 0;
  if (frameCount > 0 && startFrame >= 0) {
      const actualFrameNumber = startFrame + safeIndex;
      displayFrameNumber = actualFrameNumber;
      const paddedFrameNumber = String(actualFrameNumber).padStart(6, '0');
      frameUrl = `${basePath}${paddedFrameNumber}.${imageExtension}`;
  }

  // --- Effect to calculate scaling when image or container size changes ---
  useEffect(() => {
    const calculateScale = () => {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        const imgElement = imgRef.current;

        // Get actual rendered dimensions of the image element
        const renderedWidth = imgElement.width;

        // Get the position of the image relative to its offset parent (the container div)
        const offsetX = imgElement.offsetLeft;
        const offsetY = imgElement.offsetTop;

        // Calculate the scale factor (use width-based scale, assuming object-contain scales primarily by one dimension)
        const scale = renderedWidth / ORIGINAL_WIDTH;

        setScaleInfo({ scale, offsetX, offsetY });
      } else {
         // Image not loaded or available yet
         setScaleInfo(null);
      }
    };

    // Calculate scale initially and whenever the frame URL changes
    // We also need to recalculate if the window (and thus container) resizes
    calculateScale(); // Calculate on first render / frame change

    // Re-calculate when the image fully loads (important!)
    const imgElement = imgRef.current;
    if (imgElement) {
        imgElement.addEventListener('load', calculateScale);
    }

    // Re-calculate on window resize
    window.addEventListener('resize', calculateScale);

    // Cleanup function
    return () => {
       if (imgElement) {
            imgElement.removeEventListener('load', calculateScale);
       }
       window.removeEventListener('resize', calculateScale);
    };
    // Dependencies: recalculate if the image source changes
  }, [frameUrl]);


  return (
    // Container needs relative positioning
    <div className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden ${className}`}>

      {/* Image Display - Add ref and potentially onLoad */}
      {frameCount > 0 && startFrame >= 0 ? (
         <img
           ref={imgRef} // Assign the ref here
           key={`${cameraId}-${safeIndex}-${frameUrl}`} // More specific key including frameUrl
           src={frameUrl}
           alt={`Camera ${cameraId} - Frame ${displayFrameNumber}`}
           className="object-contain w-full h-full" // Crucial style for scaling
           // onLoad={calculateScale} // Alternative way to trigger calculation
           onError={(e) => {
             console.error(`Error loading image: ${frameUrl}`);
             (e.target as HTMLImageElement).src = '/placeholder.png';
           }}
         />
      ) : (
          <span className="text-gray-500">No frames available</span>
      )}

      {/* Bounding Box Overlay - Render only if scaleInfo is calculated */}
      {scaleInfo && tracks && tracks.length > 0 && tracks.map((track) => {
          // Original coordinates from JSON
          const [x1, y1, x2, y2] = track.bbox_xyxy;

          // Transform coordinates using calculated scale and offset
          const scaledX1 = x1 * scaleInfo.scale + scaleInfo.offsetX;
          const scaledY1 = y1 * scaleInfo.scale + scaleInfo.offsetY;
          const scaledWidth = (x2 - x1) * scaleInfo.scale;
          const scaledHeight = (y2 - y1) * scaleInfo.scale;

          // CSS styles for the transformed box
          const boxStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${scaledX1}px`,
              top: `${scaledY1}px`,
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              border: '2px solid lime',
              pointerEvents: 'none',
          };

          const labelStyle : React.CSSProperties = {
              position: 'absolute', top: '-16px', left: '0px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white',
              padding: '1px 3px', fontSize: '10px', fontWeight: 'bold',
              whiteSpace: 'nowrap',
          };

          return (
              <div key={track.global_id} style={boxStyle}>
                  <span style={labelStyle}>ID: {track.global_id}</span>
              </div>
          );
      })}
    </div> // End container div
  );
};

export default ImageSequencePlayer;