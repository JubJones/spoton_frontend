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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-300">Detected People</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {sortedDetections.length} detection{sortedDetections.length !== 1 ? 's' : ''}
          </span>
          {sortedDetections.length > 0 && (
            <span className="text-sm text-blue-400">
              Avg: {Math.round(
                sortedDetections.reduce((sum, d) => sum + d.confidence, 0) / sortedDetections.length * 100
              )}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Person Grid */}
      <div className="flex-1 overflow-y-auto">
        {sortedDetections.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <div className="text-lg font-medium">No people detected</div>
              <div className="text-sm mt-2">Detections will appear here when streaming</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortedDetections.map((detection) => {
              const cropKey = `${detection.camera_id}-${detection.detection_id}`;
              const isSelected = selectedPerson === cropKey;
              const croppedImage = croppedImages[cropKey];

              return (
                <div
                  key={cropKey}
                  onClick={() => handlePersonClick(detection, detection.camera_id)}
                  className={`relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 bg-blue-600' 
                      : 'hover:bg-gray-600 hover:shadow-lg'
                  }`}
                >
                  {/* Cropped Person Image */}
                  <div className="aspect-[3/4] relative">
                    {croppedImage ? (
                      <img
                        src={croppedImage}
                        alt={`Person ${detection.detection_id}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                        <div className="text-gray-400 text-sm">Loading...</div>
                      </div>
                    )}
                    
                    {/* Confidence Badge */}
                    <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${
                      detection.confidence >= 0.8 
                        ? 'bg-green-500 text-white' 
                        : detection.confidence >= 0.6 
                          ? 'bg-yellow-500 text-black'
                          : 'bg-red-500 text-white'
                    }`}>
                      {Math.round(detection.confidence * 100)}%
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="text-white text-xs font-bold">✓</div>
                      </div>
                    )}
                  </div>

                  {/* Person Details */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white truncate">
                        Person {detection.detection_id.slice(-4)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">
                        {getCameraName(detection.camera_id)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(detection.bbox.width)}×{Math.round(detection.bbox.height)}
                      </p>
                    </div>

                    {/* Map Coordinates (if available) */}
                    {detection.map_coords && (
                      <p className="text-xs text-blue-400 truncate">
                        Map: ({detection.map_coords.map_x.toFixed(1)}, {detection.map_coords.map_y.toFixed(1)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Summary Footer */}
      {sortedDetections.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-white">{sortedDetections.length}</div>
              <div className="text-xs text-gray-400">Total Detections</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-400">
                {sortedDetections.filter(d => d.confidence >= 0.8).length}
              </div>
              <div className="text-xs text-gray-400">High Confidence (≥80%)</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-400">
                {Object.keys(cameraDetections).length}
              </div>
              <div className="text-xs text-gray-400">Active Cameras</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-400">
                {Math.round(
                  sortedDetections.reduce((sum, d) => sum + d.confidence, 0) / sortedDetections.length * 100
                )}%
              </div>
              <div className="text-xs text-gray-400">Average Confidence</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionPersonList;