// src/components/DetectionPersonList.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DetectedPerson {
  detection_id: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
    center_x: number;
    center_y: number;
  };
  map_coords?: {
    map_x: number;
    map_y: number;
  };
  class_name: string;
  class_id: number;
}

interface CameraDetection {
  camera_id: string;
  frame_image_base64: string;
  detections: DetectedPerson[];
  processing_time_ms: number;
}

interface DetectionPersonListProps {
  cameraDetections: { [camera_id: string]: CameraDetection };
  className?: string;
  onPersonClick?: (detection: DetectedPerson, camera_id: string) => void;
}

const DetectionPersonList: React.FC<DetectionPersonListProps> = ({
  cameraDetections,
  className = '',
  onPersonClick,
}) => {
  const [croppedImages, setCroppedImages] = useState<{ [key: string]: string }>({});
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Function to crop person from image using detection coordinates
  const cropPersonFromImage = useCallback((
    imageData: string,
    bbox: DetectedPerson['bbox'],
    detection_id: string,
    camera_id: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match the crop area
      const cropWidth = Math.max(bbox.width, 64); // Minimum width
      const cropHeight = Math.max(bbox.height, 96); // Minimum height
      
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Clear canvas
      ctx.clearRect(0, 0, cropWidth, cropHeight);

      // Draw the cropped portion of the image
      ctx.drawImage(
        img,
        bbox.x1, bbox.y1, bbox.width, bbox.height, // Source rectangle
        0, 0, cropWidth, cropHeight // Destination rectangle
      );

      // Convert to base64 and store
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const cropKey = `${camera_id}-${detection_id}`;
      
      setCroppedImages(prev => ({
        ...prev,
        [cropKey]: croppedDataUrl
      }));
    };

    // Handle both data URI and raw base64
    if (imageData.startsWith('data:image/')) {
      img.src = imageData;
    } else {
      img.src = `data:image/jpeg;base64,${imageData}`;
    }
  }, []);

  // Process detections and create crops when data changes
  useEffect(() => {
    Object.entries(cameraDetections).forEach(([camera_id, cameraData]) => {
      if (cameraData.detections && cameraData.frame_image_base64) {
        cameraData.detections.forEach((detection) => {
          const cropKey = `${camera_id}-${detection.detection_id}`;
          
          // Only crop if we don't already have this crop
          if (!croppedImages[cropKey]) {
            cropPersonFromImage(
              cameraData.frame_image_base64,
              detection.bbox,
              detection.detection_id,
              camera_id
            );
          }
        });
      }
    });
  }, [cameraDetections, cropPersonFromImage, croppedImages]);

  // Handle person click
  const handlePersonClick = useCallback((detection: DetectedPerson, camera_id: string) => {
    const personKey = `${camera_id}-${detection.detection_id}`;
    setSelectedPerson(selectedPerson === personKey ? null : personKey);
    onPersonClick?.(detection, camera_id);
  }, [selectedPerson, onPersonClick]);

  // Get all detections across all cameras
  const allDetections = Object.entries(cameraDetections).flatMap(([camera_id, cameraData]) =>
    (cameraData.detections || []).map(detection => ({
      ...detection,
      camera_id,
      processing_time: cameraData.processing_time_ms
    }))
  );

  // Sort by confidence (highest first)
  const sortedDetections = allDetections.sort((a, b) => b.confidence - a.confidence);

  // Get camera display name
  const getCameraName = (camera_id: string) => {
    const cameraMap: { [key: string]: string } = {
      'c09': 'Camera 1',
      'c12': 'Camera 2', 
      'c13': 'Camera 3',
      'c16': 'Camera 4',
    };
    return cameraMap[camera_id] || camera_id;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-gray-800 rounded-md p-3 ${className}`}>
      {/* Hidden canvas for image cropping */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">Detected People</h3>
        <span className="text-xs text-gray-500">
          {sortedDetections.length} detection{sortedDetections.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Person List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedDetections.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <div className="text-2xl mb-2">👤</div>
            <div className="text-sm">No people detected</div>
          </div>
        ) : (
          sortedDetections.map((detection) => {
            const cropKey = `${detection.camera_id}-${detection.detection_id}`;
            const isSelected = selectedPerson === cropKey;
            const croppedImage = croppedImages[cropKey];

            return (
              <div
                key={cropKey}
                onClick={() => handlePersonClick(detection, detection.camera_id)}
                className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {/* Cropped Person Image */}
                <div className="flex-shrink-0">
                  {croppedImage ? (
                    <div className="relative">
                      <img
                        src={croppedImage}
                        alt={`Person ${detection.detection_id}`}
                        className="w-12 h-16 object-cover rounded border-2 border-gray-600"
                      />
                      {/* Confidence Badge */}
                      <div className={`absolute -top-1 -right-1 text-xs font-bold px-1 rounded ${
                        detection.confidence >= 0.8 
                          ? 'bg-green-500 text-white' 
                          : detection.confidence >= 0.6 
                            ? 'bg-yellow-500 text-black'
                            : 'bg-red-500 text-white'
                      }`}>
                        {Math.round(detection.confidence * 100)}%
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-16 bg-gray-600 rounded flex items-center justify-center">
                      <div className="text-gray-400 text-xs">...</div>
                    </div>
                  )}
                </div>

                {/* Person Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white truncate">
                      Person {detection.detection_id.slice(-4)}
                    </p>
                    <span className={`text-xs font-semibold ${getConfidenceColor(detection.confidence)}`}>
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">
                      {getCameraName(detection.camera_id)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(detection.bbox.width)}×{Math.round(detection.bbox.height)}px
                    </p>
                  </div>

                  {/* Map Coordinates (if available) */}
                  {detection.map_coords && (
                    <p className="text-xs text-blue-400 mt-1">
                      Map: ({detection.map_coords.map_x.toFixed(1)}, {detection.map_coords.map_y.toFixed(1)})
                    </p>
                  )}
                </div>

                {/* Click Indicator */}
                <div className="flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-gray-500'
                  }`} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {sortedDetections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Avg Confidence: {Math.round(
                sortedDetections.reduce((sum, d) => sum + d.confidence, 0) / sortedDetections.length * 100
              )}%
            </span>
            <span>
              {Object.keys(cameraDetections).length} camera{Object.keys(cameraDetections).length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionPersonList;