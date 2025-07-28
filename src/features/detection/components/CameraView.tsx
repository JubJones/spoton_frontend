import React, { useState, useEffect, useRef } from 'react';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import { CameraConfig } from '../../../stores/detectionStore';
import LoadingSpinner from '../../../components/molecules/LoadingSpinner';

interface Track {
  track_id: number;
  global_id: number;
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords?: [number, number];
}

interface CameraViewProps {
  cameraId: string;
  config: CameraConfig;
  currentFrameIndex: number;
  tracks: Track[];
  className?: string;
  onCameraClick?: (cameraId: string) => void;
}

interface ScaleInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const ORIGINAL_WIDTH = 1920;

const CameraView: React.FC<CameraViewProps> = ({
  cameraId,
  config,
  currentFrameIndex,
  tracks,
  className = '',
  onCameraClick,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Calculate image URL
  const getImageUrl = (): string => {
    if (!config || config.frameCount <= 0 || config.startFrame < 0) {
      return '/placeholder.png';
    }

    const safeIndex = config.frameCount > 0 ? currentFrameIndex % config.frameCount : 0;
    const actualFrameNumber = config.startFrame + safeIndex;
    const paddedFrameNumber = String(actualFrameNumber).padStart(6, '0');
    
    return `${config.basePath}${paddedFrameNumber}.${config.extension}`;
  };

  const imageUrl = getImageUrl();

  // Calculate scaling when image loads or container size changes
  useEffect(() => {
    const calculateScale = () => {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        const imgElement = imgRef.current;
        const renderedWidth = imgElement.width;
        const offsetX = imgElement.offsetLeft;
        const offsetY = imgElement.offsetTop;
        const scale = renderedWidth / ORIGINAL_WIDTH;

        setScaleInfo({ scale, offsetX, offsetY });
      } else {
        setScaleInfo(null);
      }
    };

    calculateScale();

    const imgElement = imgRef.current;
    if (imgElement) {
      imgElement.addEventListener('load', calculateScale);
    }

    window.addEventListener('resize', calculateScale);

    return () => {
      if (imgElement) {
        imgElement.removeEventListener('load', calculateScale);
      }
      window.removeEventListener('resize', calculateScale);
    };
  }, [imageUrl]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    if (imgRef.current) {
      imgRef.current.src = '/placeholder.png';
    }
  };

  const handleClick = () => {
    if (onCameraClick) {
      onCameraClick(cameraId);
    }
  };

  return (
    <div 
      className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {/* Camera Name Label */}
      <div className="absolute top-2 left-2 z-10 bg-black/60 text-white px-2 py-1 rounded text-sm font-medium">
        {config.name}
      </div>

      {/* Status Indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center">
        <div className={`w-2 h-2 rounded-full mr-1 ${config.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-xs text-white bg-black/60 px-1 py-0.5 rounded">
          {config.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Loading Indicator */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="medium" color="white" text="Loading..." />
        </div>
      )}

      {/* Image Display */}
      {config.frameCount > 0 && config.startFrame >= 0 ? (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={`${config.name} - Frame ${currentFrameIndex}`}
          className="object-contain w-full h-full"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="text-gray-500 text-center">
          <p>No frames available</p>
          <p className="text-sm">Camera: {config.name}</p>
        </div>
      )}

      {/* Bounding Box Overlay */}
      {scaleInfo && tracks && tracks.length > 0 && (
        <BoundingBoxOverlay
          tracks={tracks}
          scaleInfo={scaleInfo}
        />
      )}

      {/* Frame Info */}
      <div className="absolute bottom-2 left-2 z-10 bg-black/60 text-white px-2 py-1 rounded text-xs">
        Frame: {currentFrameIndex + 1} / {config.frameCount}
      </div>

      {/* Detection Count */}
      {tracks && tracks.length > 0 && (
        <div className="absolute bottom-2 right-2 z-10 bg-black/60 text-white px-2 py-1 rounded text-xs">
          Detections: {tracks.length}
        </div>
      )}
    </div>
  );
};

export default CameraView;