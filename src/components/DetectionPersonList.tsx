// src/components/DetectionPersonList.tsx
import React, { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { useCameraConfig } from '../context/CameraConfigContext';
import type { BackendCameraId } from '../types/api';

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
  track_id?: number;
  global_id?: string | null;
  tracking_key?: string;
  track_assignment_iou?: number;
  track_assignment_center_distance?: number;
  metadata?: Record<string, unknown>;
}

interface CameraDetection {
  camera_id: string;
  frame_image_base64?: string;
  detections: DetectedPerson[];
  processing_time_ms: number;
}

interface DetectionPersonListProps {
  cameraDetections: { [camera_id: string]: CameraDetection };
  className?: string;
  onPersonClick?: (detection: DetectedPerson, camera_id: string, isSelecting: boolean) => void;
  selectedPersonKey?: string | null;
  activeCameraId?: string | null;
  allCameraIds?: string[];
}

// Memoized to prevent re-renders when props haven't changed
const DetectionPersonList = memo<DetectionPersonListProps>(({
  cameraDetections,
  className = '',
  onPersonClick,
  selectedPersonKey = null,
  activeCameraId = null,
  allCameraIds = [],
}) => {
  const [croppedImages, setCroppedImages] = useState<{ [key: string]: string }>({});
  const [selectedPerson, setSelectedPerson] = useState<string | null>(selectedPersonKey);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getDisplayName } = useCameraConfig();

  useEffect(() => {
    setSelectedPerson(selectedPersonKey);
  }, [selectedPersonKey]);

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
      // Source dimensions from backend (detection coordinates are in this space)
      const SRC_WIDTH = 1920;
      const SRC_HEIGHT = 1080;

      // Actual image dimensions
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Calculate scale factors
      const scaleX = imgWidth / SRC_WIDTH;
      const scaleY = imgHeight / SRC_HEIGHT;

      // Scale bbox coordinates to actual image dimensions
      const scaledX1 = bbox.x1 * scaleX;
      const scaledY1 = bbox.y1 * scaleY;
      const scaledWidth = bbox.width * scaleX;
      const scaledHeight = bbox.height * scaleY;

      // Set canvas size to match the crop area (use scaled dimensions)
      const cropWidth = Math.max(Math.round(scaledWidth), 64);
      const cropHeight = Math.max(Math.round(scaledHeight), 96);

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Clear canvas
      ctx.clearRect(0, 0, cropWidth, cropHeight);

      // Draw the cropped portion of the image using scaled coordinates
      ctx.drawImage(
        img,
        scaledX1, scaledY1, scaledWidth, scaledHeight, // Source rectangle (scaled)
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
          cropPersonFromImage(
            cameraData.frame_image_base64!,
            detection.bbox,
            detection.detection_id,
            camera_id
          );
        });
      }
    });
  }, [cameraDetections, cropPersonFromImage]);

  // Handle person click
  const handlePersonClick = useCallback((detection: DetectedPerson, camera_id: string) => {
    const personKey = `${camera_id}-${detection.detection_id}`;
    const willSelect = selectedPerson !== personKey;
    setSelectedPerson(willSelect ? personKey : null);
    onPersonClick?.(detection, camera_id, willSelect);
  }, [selectedPerson, onPersonClick]);

  // Memoized: Get all detections across all cameras, deduplicated by track_id, sorted by confidence
  const sortedDetections = useMemo(() => {
    const allDetections = Object.entries(cameraDetections).flatMap(([camera_id, cameraData]) =>
      (cameraData.detections || []).map(detection => ({
        ...detection,
        camera_id,
        processing_time: cameraData.processing_time_ms
      }))
    );

    // Deduplicate by track_id within each camera, keeping highest confidence
    const deduplicatedMap = new Map<string, typeof allDetections[0]>();

    for (const detection of allDetections) {
      // Create a unique key: prefer track_id, fall back to detection_id
      const trackKey = typeof detection.track_id === 'number'
        ? `${detection.camera_id}:track:${detection.track_id}`
        : `${detection.camera_id}:det:${detection.detection_id}`;

      const existing = deduplicatedMap.get(trackKey);
      if (!existing || detection.confidence > existing.confidence) {
        deduplicatedMap.set(trackKey, detection);
      }
    }

    // Sort by confidence (highest first)
    return Array.from(deduplicatedMap.values()).sort((a, b) => b.confidence - a.confidence);
  }, [cameraDetections]);

  // Group sorted detections by camera for easier rendering
  const detectionsByCamera = useMemo(() => {
    const grouped: Record<string, typeof sortedDetections> = {};
    sortedDetections.forEach(detection => {
      if (!grouped[detection.camera_id]) grouped[detection.camera_id] = [];
      grouped[detection.camera_id].push(detection);
    });
    return grouped;
  }, [sortedDetections]);

  // Determine which cameras to display
  const displayedCameraIds = useMemo(() => {
    // If a specific camera is active (and not "all"), show only that camera
    if (activeCameraId && activeCameraId !== 'all') {
      return [activeCameraId];
    }
    // Otherwise show all configured cameras
    if (allCameraIds && allCameraIds.length > 0) {
      return allCameraIds;
    }
    // Fallback to only cameras with detections if no config provided
    return Object.keys(detectionsByCamera).sort();
  }, [activeCameraId, allCameraIds, detectionsByCamera]);

  // Get camera display name
  const getCameraName = (camera_id: string) => {
    if (camera_id) {
      return getDisplayName(camera_id as BackendCameraId) || camera_id;
    }
    return camera_id;
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

      {/* Person Grid - Grouped by Camera */}
      <div className="flex-1 overflow-y-auto">
        {displayedCameraIds.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <div className="text-lg font-medium">No cameras available</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedCameraIds.map((camera_id) => {
              const detections = detectionsByCamera[camera_id] || [];

              // Sort by track_id for stable ordering within each camera
              const stableSorted = [...detections].sort((a, b) => {
                const aId = typeof a.track_id === 'number' ? a.track_id : Infinity;
                const bId = typeof b.track_id === 'number' ? b.track_id : Infinity;
                return aId - bId;
              });

              return (
                <div key={camera_id}>
                  {/* Camera Section Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-300">
                      {getCameraName(camera_id).replace(/\s*\(.*?\)\s*/g, '').trim()}
                    </span>
                    <span className="text-xs text-gray-500">({stableSorted.length})</span>
                  </div>
                  {stableSorted.length === 0 ? (
                    <div className="text-xs text-gray-500 italic px-2 py-4 border border-gray-700/50 rounded-lg border-dashed">
                      No active detections
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4 pb-2">
                      {stableSorted.map((detection) => {
                        const cropKey = `${detection.camera_id}-${detection.detection_id}`;
                        const isSelected = selectedPerson === cropKey;
                        const croppedImage = croppedImages[cropKey];
                        let trackLabel: string | undefined;
                        if (typeof detection.track_id === 'number') {
                          trackLabel = `Track ${detection.track_id.toString().padStart(3, '0')}`;
                        } else if (typeof detection.tracking_key === 'string') {
                          const lastSegment = detection.tracking_key.split(':').pop();
                          trackLabel = lastSegment ? `Track ${lastSegment.toString().padStart(3, '0')}` : `Track ${detection.tracking_key}`;
                        }

                        const fallbackLabel = detection.detection_id?.startsWith('track_')
                          ? `Track ${detection.detection_id.slice(-3)}`
                          : detection.detection_id
                            ? `Detection ${detection.detection_id.slice(-4)}`
                            : 'Detection';
                        const primaryLabel = trackLabel ?? fallbackLabel;

                        return (
                          <div
                            key={cropKey}
                            onClick={() => handlePersonClick(detection, detection.camera_id)}
                            className={`
                            flex-shrink-0 flex items-center bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:bg-gray-600 w-64 h-20
                            ${isSelected ? 'ring-2 ring-blue-500 bg-blue-600' : 'hover:shadow-lg'}
                          `}
                          >
                            {/* Left: Image */}
                            <div className="relative w-20 h-20 flex-shrink-0 bg-black">
                              {croppedImage ? (
                                <img
                                  src={croppedImage}
                                  alt={`Person ${primaryLabel}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${detection.confidence >= 0.8 ? 'bg-green-900/40' :
                                  detection.confidence >= 0.6 ? 'bg-yellow-900/40' : 'bg-red-900/40'
                                  }`}>
                                  <span className="text-2xl">👤</span>
                                </div>
                              )}

                              {/* Confidence Badge */}
                              <div className="absolute bottom-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white">
                                {Math.round(detection.confidence * 100)}%
                              </div>
                            </div>

                            {/* Right: Info */}
                            <div className="flex-1 p-2 min-w-0 flex flex-col justify-center h-full">
                              <div className="flex items-center justify-between">
                                <span className="text-white font-bold text-sm truncate">
                                  {primaryLabel}
                                </span>
                                {isSelected && <span className="text-blue-200 text-xs">✓</span>}
                              </div>

                              <div className="text-xs text-gray-400 mt-1 truncate">
                                Box: {Math.round(detection.bbox.width)}×{Math.round(detection.bbox.height)}
                              </div>

                              {/* Attributes if available */}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
});

// Display name for React DevTools
DetectionPersonList.displayName = 'DetectionPersonList';

export default DetectionPersonList;
