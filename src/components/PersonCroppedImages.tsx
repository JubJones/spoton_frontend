// src/components/PersonCroppedImages.tsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { TrackedPerson, BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraDisplayName } from '../config/environments';

interface PersonCrop {
  personId: string;
  globalId?: string;
  cameraId: BackendCameraId;
  cropImage: string; // Base64 or URL
  bbox: [number, number, number, number];
  confidence: number;
  timestamp: Date;
  isSelected?: boolean;
  quality: 'high' | 'medium' | 'low';
}

interface PersonCroppedImagesProps {
  environment: EnvironmentId;
  crops: PersonCrop[];
  selectedPersonIds?: Set<string>;
  className?: string;
  // Display options
  thumbnailSize?: 'small' | 'medium' | 'large';
  sortBy?: 'confidence' | 'timestamp' | 'camera' | 'quality';
  sortOrder?: 'asc' | 'desc';
  filterBy?: {
    minConfidence?: number;
    cameras?: BackendCameraId[];
    timeRange?: [Date, Date];
    quality?: ('high' | 'medium' | 'low')[];
  };
  showLabels?: boolean;
  showConfidence?: boolean;
  showTimestamp?: boolean;
  showCamera?: boolean;
  maxItems?: number;
  // Event handlers
  onPersonClick?: (personId: string, cameraId: BackendCameraId) => void;
  onPersonHover?: (personId: string | null, cameraId: BackendCameraId) => void;
  onPersonSelect?: (personId: string, isSelected: boolean) => void;
  onCropExport?: (crops: PersonCrop[]) => void;
  onQualityFilter?: (quality: 'high' | 'medium' | 'low') => void;
}

// Thumbnail size configurations
const THUMBNAIL_SIZES = {
  small: { width: 64, height: 96, textSize: 'text-xs' },
  medium: { width: 96, height: 144, textSize: 'text-sm' },
  large: { width: 128, height: 192, textSize: 'text-base' },
};

// Quality indicators
const QUALITY_CONFIG = {
  high: { color: 'bg-green-500', label: 'High', threshold: 0.8 },
  medium: { color: 'bg-yellow-500', label: 'Med', threshold: 0.6 },
  low: { color: 'bg-red-500', label: 'Low', threshold: 0.0 },
};

// Color palette for person identification
const PERSON_COLORS = [
  '#00FF00',
  '#FF6B35',
  '#F7931E',
  '#FFD23F',
  '#06FFA5',
  '#118AB2',
  '#073B4C',
  '#EF476F',
  '#8338EC',
  '#FB8500',
];

const PersonCroppedImages: React.FC<PersonCroppedImagesProps> = ({
  environment,
  crops = [],
  selectedPersonIds = new Set(),
  className = '',
  thumbnailSize = 'medium',
  sortBy = 'confidence',
  sortOrder = 'desc',
  filterBy = {},
  showLabels = true,
  showConfidence = true,
  showTimestamp = false,
  showCamera = true,
  maxItems = 50,
  onPersonClick,
  onPersonHover,
  onPersonSelect,
  onCropExport,
  onQualityFilter,
}) => {
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [selectedCrops, setSelectedCrops] = useState<Set<string>>(new Set());
  const [expandedView, setExpandedView] = useState<PersonCrop | null>(null);
  const cropRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sizeConfig = THUMBNAIL_SIZES[thumbnailSize];

  // Filter and sort crops
  const processedCrops = useMemo(() => {
    let filtered = crops;

    // Apply filters
    if (filterBy.minConfidence !== undefined) {
      filtered = filtered.filter((crop) => crop.confidence >= filterBy.minConfidence!);
    }

    if (filterBy.cameras && filterBy.cameras.length > 0) {
      filtered = filtered.filter((crop) => filterBy.cameras!.includes(crop.cameraId));
    }

    if (filterBy.timeRange) {
      const [start, end] = filterBy.timeRange;
      filtered = filtered.filter((crop) => crop.timestamp >= start && crop.timestamp <= end);
    }

    if (filterBy.quality && filterBy.quality.length > 0) {
      filtered = filtered.filter((crop) => filterBy.quality!.includes(crop.quality));
    }

    // Sort crops
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'camera':
          comparison = a.cameraId.localeCompare(b.cameraId);
          break;
        case 'quality':
          const qualityOrder = { high: 3, medium: 2, low: 1 };
          comparison = qualityOrder[a.quality] - qualityOrder[b.quality];
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Limit results
    return filtered.slice(0, maxItems);
  }, [crops, filterBy, sortBy, sortOrder, maxItems]);

  // Get person color based on ID
  const getPersonColor = useCallback((personId: string, isSelected: boolean) => {
    if (isSelected) {
      return '#FFD700'; // Gold for selected persons
    }
    const colorIndex = parseInt(personId?.slice(-2) || '0', 36) % PERSON_COLORS.length;
    return PERSON_COLORS[colorIndex];
  }, []);

  // Get quality color and label
  const getQualityInfo = useCallback((confidence: number) => {
    if (confidence >= QUALITY_CONFIG.high.threshold) return QUALITY_CONFIG.high;
    if (confidence >= QUALITY_CONFIG.medium.threshold) return QUALITY_CONFIG.medium;
    return QUALITY_CONFIG.low;
  }, []);

  // Handle crop click
  const handleCropClick = useCallback(
    (crop: PersonCrop, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select mode
        const newSelected = new Set(selectedCrops);
        const cropKey = `${crop.personId}-${crop.cameraId}-${crop.timestamp.getTime()}`;

        if (newSelected.has(cropKey)) {
          newSelected.delete(cropKey);
        } else {
          newSelected.add(cropKey);
        }

        setSelectedCrops(newSelected);
      } else {
        // Single selection
        onPersonClick?.(crop.personId, crop.cameraId);
        onPersonSelect?.(crop.personId, !selectedPersonIds.has(crop.personId));
      }
    },
    [selectedCrops, selectedPersonIds, onPersonClick, onPersonSelect]
  );

  // Handle crop hover
  const handleCropHover = useCallback(
    (crop: PersonCrop | null) => {
      const personId = crop?.personId || null;
      setHoveredPersonId(personId);
      if (crop) {
        onPersonHover?.(personId, crop.cameraId);
      } else {
        onPersonHover?.(null, '' as BackendCameraId);
      }
    },
    [onPersonHover]
  );

  // Handle crop double-click for expanded view
  const handleCropDoubleClick = useCallback(
    (crop: PersonCrop) => {
      setExpandedView(expandedView?.personId === crop.personId ? null : crop);
    },
    [expandedView]
  );

  // Handle export selected crops
  const handleExportSelected = useCallback(() => {
    const cropsToExport = processedCrops.filter((crop) => {
      const cropKey = `${crop.personId}-${crop.cameraId}-${crop.timestamp.getTime()}`;
      return selectedCrops.has(cropKey);
    });
    onCropExport?.(cropsToExport);
  }, [processedCrops, selectedCrops, onCropExport]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: Date | string) => {
    const dateObj = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return dateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  return (
    <div className={`bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Person Detections</h3>
            <p className="text-sm text-gray-400">
              {processedCrops.length} detection{processedCrops.length !== 1 ? 's' : ''}
              {crops.length > processedCrops.length && ` (${crops.length} total)`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Thumbnail Size */}
            <select
              value={thumbnailSize}
              onChange={(e) => {
                // This would be handled by parent component
                console.log('Thumbnail size changed:', e.target.value);
              }}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>

            {/* Sort Options */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                console.log('Sort changed:', { sortBy: newSortBy, sortOrder: newSortOrder });
              }}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="confidence-desc">Confidence ↓</option>
              <option value="confidence-asc">Confidence ↑</option>
              <option value="timestamp-desc">Newest First</option>
              <option value="timestamp-asc">Oldest First</option>
              <option value="camera-asc">Camera A-Z</option>
              <option value="quality-desc">Quality ↓</option>
            </select>

            {/* Export Button */}
            {selectedCrops.size > 0 && (
              <button
                onClick={handleExportSelected}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
              >
                📥 Export ({selectedCrops.size})
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-4 text-sm">
          {/* Quality Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">Quality:</span>
            {Object.entries(QUALITY_CONFIG).map(([quality, config]) => (
              <button
                key={quality}
                onClick={() => onQualityFilter?.(quality as any)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filterBy.quality?.includes(quality as any) || !filterBy.quality
                    ? `${config.color} text-white`
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
              >
                {config.label}
              </button>
            ))}
          </div>

          {/* Confidence Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Min Confidence:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={(filterBy.minConfidence || 0) * 100}
              onChange={(e) => {
                console.log('Confidence filter changed:', parseInt(e.target.value) / 100);
              }}
              className="w-20"
            />
            <span className="text-gray-300 text-xs w-8">
              {Math.round((filterBy.minConfidence || 0) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Crops Grid */}
      <div className="p-4">
        {processedCrops.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">👥</div>
            <div className="text-lg mb-2">No person detections</div>
            <div className="text-sm">Adjust filters or wait for new detections</div>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${sizeConfig.width}px, 1fr))`,
            }}
          >
            {processedCrops.map((crop) => {
              const cropKey = `${crop.personId}-${crop.cameraId}-${crop.timestamp.getTime()}`;
              const isPersonSelected = selectedPersonIds.has(crop.personId);
              const isCropSelected = selectedCrops.has(cropKey);
              const isHovered = hoveredPersonId === crop.personId;
              const personColor = getPersonColor(crop.personId, isPersonSelected);
              const qualityInfo = getQualityInfo(crop.confidence);

              return (
                <div
                  key={cropKey}
                  ref={(el) => {
                    if (el) {
                      cropRefs.current.set(cropKey, el);
                    } else {
                      cropRefs.current.delete(cropKey);
                    }
                  }}
                  className={`relative bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${isPersonSelected
                      ? 'border-yellow-400 shadow-lg shadow-yellow-400/25'
                      : isCropSelected
                        ? 'border-blue-400 shadow-lg shadow-blue-400/25'
                        : isHovered
                          ? 'border-gray-500 shadow-md'
                          : 'border-gray-600 hover:border-gray-500'
                    }`}
                  style={{
                    width: sizeConfig.width,
                    height: sizeConfig.height + 40, // Extra space for labels
                  }}
                  onClick={(e) => handleCropClick(crop, e)}
                  onDoubleClick={() => handleCropDoubleClick(crop)}
                  onMouseEnter={() => handleCropHover(crop)}
                  onMouseLeave={() => handleCropHover(null)}
                >
                  {/* Crop Image */}
                  <div className="relative bg-gray-900" style={{ height: sizeConfig.height }}>
                    <img
                      src={crop.cropImage}
                      alt={`Person ${crop.personId}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-person.png';
                      }}
                    />

                    {/* Selection Indicator */}
                    {(isPersonSelected || isCropSelected) && (
                      <div className="absolute top-1 right-1">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${isPersonSelected ? 'bg-yellow-400 text-black' : 'bg-blue-400 text-white'
                            }`}
                        >
                          ✓
                        </div>
                      </div>
                    )}

                    {/* Quality Indicator */}
                    <div
                      className={`absolute top-1 left-1 px-1 py-0.5 rounded text-xs font-bold text-white ${qualityInfo.color}`}
                    >
                      {qualityInfo.label}
                    </div>

                    {/* Person Color Strip */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1"
                      style={{ backgroundColor: personColor }}
                    />
                  </div>

                  {/* Labels */}
                  <div className="p-2 space-y-1">
                    {showLabels && (
                      <div className={`font-semibold text-white truncate ${sizeConfig.textSize}`}>
                        {crop.globalId || crop.personId}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      {showCamera && (
                        <span className="truncate">
                          {getCameraDisplayName(crop.cameraId, environment)}
                        </span>
                      )}

                      {showConfidence && (
                        <span
                          className={`font-semibold ${crop.confidence >= 0.8
                              ? 'text-green-400'
                              : crop.confidence >= 0.6
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                        >
                          {Math.round(crop.confidence * 100)}%
                        </span>
                      )}
                    </div>

                    {showTimestamp && (
                      <div className="text-xs text-gray-500 truncate">
                        {formatTimestamp(crop.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded View Modal */}
      {expandedView && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                Person {expandedView.globalId || expandedView.personId}
              </h3>
              <button
                onClick={() => setExpandedView(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enlarged Image */}
              <div>
                <img
                  src={expandedView.cropImage}
                  alt={`Person ${expandedView.personId}`}
                  className="w-full rounded-lg"
                />
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Detection Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Camera:</span>
                      <span className="text-blue-400">
                        {getCameraDisplayName(expandedView.cameraId, environment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidence:</span>
                      <span
                        className={`font-semibold ${expandedView.confidence >= 0.8
                            ? 'text-green-400'
                            : expandedView.confidence >= 0.6
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                      >
                        {Math.round(expandedView.confidence * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quality:</span>
                      <span
                        className={`font-semibold ${expandedView.quality === 'high'
                            ? 'text-green-400'
                            : expandedView.quality === 'medium'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                      >
                        {expandedView.quality.charAt(0).toUpperCase() +
                          expandedView.quality.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Timestamp:</span>
                      <span className="text-gray-300">
                        {formatTimestamp(expandedView.timestamp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bounding Box:</span>
                      <span className="text-gray-300 font-mono text-xs">
                        [{expandedView.bbox.map((coord) => Math.round(coord)).join(', ')}]
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonCroppedImages;
