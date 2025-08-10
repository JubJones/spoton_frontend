// Coordinate Transformation Utilities
// src/utils/coordinateTransform.ts

import { BackendCameraId, EnvironmentId } from '../types/api';
import { getCameraConfig } from '../config/environments';

// ============================================================================
// Coordinate System Types
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CoordinateTransformConfig {
  sourceSize: Size;
  targetSize: Size;
  maintainAspectRatio: boolean;
  paddingMode: 'center' | 'top-left' | 'none';
}

// ============================================================================
// Image Coordinate Transformations
// ============================================================================

/**
 * Transform image coordinates from source to target resolution
 */
export function transformImageCoordinates(
  point: Point2D,
  sourceSize: Size,
  targetSize: Size,
  maintainAspectRatio: boolean = true
): Point2D {
  if (sourceSize.width <= 0 || sourceSize.height <= 0) {
    throw new Error('Source size must be positive');
  }

  if (targetSize.width <= 0 || targetSize.height <= 0) {
    throw new Error('Target size must be positive');
  }

  if (!maintainAspectRatio) {
    // Simple scaling without aspect ratio preservation
    const scaleX = targetSize.width / sourceSize.width;
    const scaleY = targetSize.height / sourceSize.height;

    return {
      x: point.x * scaleX,
      y: point.y * scaleY,
    };
  }

  // Scale with aspect ratio preservation
  const sourceAspect = sourceSize.width / sourceSize.height;
  const targetAspect = targetSize.width / targetSize.height;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceAspect > targetAspect) {
    // Source is wider, fit to width
    scale = targetSize.width / sourceSize.width;
    offsetY = (targetSize.height - sourceSize.height * scale) / 2;
  } else {
    // Source is taller, fit to height
    scale = targetSize.height / sourceSize.height;
    offsetX = (targetSize.width - sourceSize.width * scale) / 2;
  }

  return {
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  };
}

/**
 * Transform bounding box coordinates
 */
export function transformBoundingBox(
  bbox: BoundingBox,
  sourceSize: Size,
  targetSize: Size,
  maintainAspectRatio: boolean = true
): BoundingBox {
  const topLeft = transformImageCoordinates(
    { x: bbox.x1, y: bbox.y1 },
    sourceSize,
    targetSize,
    maintainAspectRatio
  );

  const bottomRight = transformImageCoordinates(
    { x: bbox.x2, y: bbox.y2 },
    sourceSize,
    targetSize,
    maintainAspectRatio
  );

  return {
    x1: Math.round(topLeft.x),
    y1: Math.round(topLeft.y),
    x2: Math.round(bottomRight.x),
    y2: Math.round(bottomRight.y),
  };
}

/**
 * Transform array of bounding boxes
 */
export function transformBoundingBoxes(
  bboxes: BoundingBox[],
  sourceSize: Size,
  targetSize: Size,
  maintainAspectRatio: boolean = true
): BoundingBox[] {
  return bboxes.map((bbox) =>
    transformBoundingBox(bbox, sourceSize, targetSize, maintainAspectRatio)
  );
}

// ============================================================================
// Camera-Specific Transformations
// ============================================================================

/**
 * Get transformation config for a camera
 */
export function getCameraTransformConfig(
  cameraId: BackendCameraId,
  environment: EnvironmentId,
  targetSize: Size
): CoordinateTransformConfig {
  const cameraConfig = getCameraConfig(cameraId, environment);

  if (!cameraConfig) {
    throw new Error(`Camera configuration not found for ${cameraId} in ${environment}`);
  }

  return {
    sourceSize: {
      width: cameraConfig.resolution[0],
      height: cameraConfig.resolution[1],
    },
    targetSize,
    maintainAspectRatio: true,
    paddingMode: 'center',
  };
}

/**
 * Transform coordinates for a specific camera
 */
export function transformCameraCoordinates(
  point: Point2D,
  cameraId: BackendCameraId,
  environment: EnvironmentId,
  targetSize: Size
): Point2D {
  const config = getCameraTransformConfig(cameraId, environment, targetSize);

  return transformImageCoordinates(
    point,
    config.sourceSize,
    config.targetSize,
    config.maintainAspectRatio
  );
}

/**
 * Transform bounding box for a specific camera
 */
export function transformCameraBoundingBox(
  bbox: BoundingBox,
  cameraId: BackendCameraId,
  environment: EnvironmentId,
  targetSize: Size
): BoundingBox {
  const config = getCameraTransformConfig(cameraId, environment, targetSize);

  return transformBoundingBox(
    bbox,
    config.sourceSize,
    config.targetSize,
    config.maintainAspectRatio
  );
}

// ============================================================================
// Scaling Utilities
// ============================================================================

/**
 * Calculate scale factors between two sizes
 */
export function calculateScaleFactors(sourceSize: Size, targetSize: Size): Point2D {
  return {
    x: targetSize.width / sourceSize.width,
    y: targetSize.height / sourceSize.height,
  };
}

/**
 * Calculate uniform scale factor (maintaining aspect ratio)
 */
export function calculateUniformScale(sourceSize: Size, targetSize: Size): number {
  const scaleX = targetSize.width / sourceSize.width;
  const scaleY = targetSize.height / sourceSize.height;

  return Math.min(scaleX, scaleY);
}

/**
 * Calculate display size with aspect ratio preservation
 */
export function calculateDisplaySize(sourceSize: Size, maxSize: Size): Size {
  const scale = calculateUniformScale(sourceSize, maxSize);

  return {
    width: Math.round(sourceSize.width * scale),
    height: Math.round(sourceSize.height * scale),
  };
}

// ============================================================================
// Bounding Box Utilities
// ============================================================================

/**
 * Get center point of bounding box
 */
export function getBoundingBoxCenter(bbox: BoundingBox): Point2D {
  return {
    x: (bbox.x1 + bbox.x2) / 2,
    y: (bbox.y1 + bbox.y2) / 2,
  };
}

/**
 * Get bounding box dimensions
 */
export function getBoundingBoxSize(bbox: BoundingBox): Size {
  return {
    width: Math.abs(bbox.x2 - bbox.x1),
    height: Math.abs(bbox.y2 - bbox.y1),
  };
}

/**
 * Check if point is inside bounding box
 */
export function isPointInBoundingBox(point: Point2D, bbox: BoundingBox): boolean {
  return (
    point.x >= Math.min(bbox.x1, bbox.x2) &&
    point.x <= Math.max(bbox.x1, bbox.x2) &&
    point.y >= Math.min(bbox.y1, bbox.y2) &&
    point.y <= Math.max(bbox.y1, bbox.y2)
  );
}

/**
 * Calculate bounding box area
 */
export function getBoundingBoxArea(bbox: BoundingBox): number {
  const size = getBoundingBoxSize(bbox);
  return size.width * size.height;
}

/**
 * Calculate intersection over union (IoU) of two bounding boxes
 */
export function calculateBoundingBoxIoU(bbox1: BoundingBox, bbox2: BoundingBox): number {
  // Calculate intersection rectangle
  const intersectionX1 = Math.max(bbox1.x1, bbox2.x1);
  const intersectionY1 = Math.max(bbox1.y1, bbox2.y1);
  const intersectionX2 = Math.min(bbox1.x2, bbox2.x2);
  const intersectionY2 = Math.min(bbox1.y2, bbox2.y2);

  // Check if there's no intersection
  if (intersectionX1 >= intersectionX2 || intersectionY1 >= intersectionY2) {
    return 0;
  }

  // Calculate areas
  const intersectionArea = (intersectionX2 - intersectionX1) * (intersectionY2 - intersectionY1);
  const bbox1Area = getBoundingBoxArea(bbox1);
  const bbox2Area = getBoundingBoxArea(bbox2);
  const unionArea = bbox1Area + bbox2Area - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate point coordinates
 */
export function isValidPoint(point: Point2D): boolean {
  return (
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    !isNaN(point.x) &&
    !isNaN(point.y) &&
    isFinite(point.x) &&
    isFinite(point.y)
  );
}

/**
 * Validate bounding box coordinates
 */
export function isValidBoundingBox(bbox: BoundingBox): boolean {
  return (
    typeof bbox.x1 === 'number' &&
    typeof bbox.y1 === 'number' &&
    typeof bbox.x2 === 'number' &&
    typeof bbox.y2 === 'number' &&
    !isNaN(bbox.x1) &&
    !isNaN(bbox.y1) &&
    !isNaN(bbox.x2) &&
    !isNaN(bbox.y2) &&
    isFinite(bbox.x1) &&
    isFinite(bbox.y1) &&
    isFinite(bbox.x2) &&
    isFinite(bbox.y2)
  );
}

/**
 * Validate size dimensions
 */
export function isValidSize(size: Size): boolean {
  return (
    typeof size.width === 'number' &&
    typeof size.height === 'number' &&
    size.width > 0 &&
    size.height > 0 &&
    !isNaN(size.width) &&
    !isNaN(size.height) &&
    isFinite(size.width) &&
    isFinite(size.height)
  );
}

/**
 * Clamp point to bounds
 */
export function clampPoint(point: Point2D, bounds: Size): Point2D {
  return {
    x: Math.max(0, Math.min(point.x, bounds.width)),
    y: Math.max(0, Math.min(point.y, bounds.height)),
  };
}

/**
 * Clamp bounding box to bounds
 */
export function clampBoundingBox(bbox: BoundingBox, bounds: Size): BoundingBox {
  return {
    x1: Math.max(0, Math.min(bbox.x1, bounds.width)),
    y1: Math.max(0, Math.min(bbox.y1, bounds.height)),
    x2: Math.max(0, Math.min(bbox.x2, bounds.width)),
    y2: Math.max(0, Math.min(bbox.y2, bounds.height)),
  };
}

// ============================================================================
// Format Conversion Utilities
// ============================================================================

/**
 * Convert [x1, y1, x2, y2] array to BoundingBox
 */
export function arrayToBoundingBox(coords: [number, number, number, number]): BoundingBox {
  return {
    x1: coords[0],
    y1: coords[1],
    x2: coords[2],
    y2: coords[3],
  };
}

/**
 * Convert BoundingBox to [x1, y1, x2, y2] array
 */
export function boundingBoxToArray(bbox: BoundingBox): [number, number, number, number] {
  return [bbox.x1, bbox.y1, bbox.x2, bbox.y2];
}

/**
 * Convert [x, y] array to Point2D
 */
export function arrayToPoint(coords: [number, number]): Point2D {
  return {
    x: coords[0],
    y: coords[1],
  };
}

/**
 * Convert Point2D to [x, y] array
 */
export function pointToArray(point: Point2D): [number, number] {
  return [point.x, point.y];
}

// ============================================================================
// Canvas and DOM Utilities
// ============================================================================

/**
 * Get mouse/touch position relative to element
 */
export function getRelativePosition(event: MouseEvent | TouchEvent, element: HTMLElement): Point2D {
  const rect = element.getBoundingClientRect();

  let clientX: number;
  let clientY: number;

  if (event instanceof MouseEvent) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    // Touch event
    const touch = event.touches[0] || event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * Convert element coordinates to image coordinates
 */
export function elementToImageCoordinates(
  point: Point2D,
  elementSize: Size,
  imageSize: Size,
  maintainAspectRatio: boolean = true
): Point2D {
  // This is the inverse of transformImageCoordinates
  if (!maintainAspectRatio) {
    const scaleX = imageSize.width / elementSize.width;
    const scaleY = imageSize.height / elementSize.height;

    return {
      x: point.x * scaleX,
      y: point.y * scaleY,
    };
  }

  const elementAspect = elementSize.width / elementSize.height;
  const imageAspect = imageSize.width / imageSize.height;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > elementAspect) {
    // Image is wider, fit to width
    scale = elementSize.width / imageSize.width;
    offsetY = (elementSize.height - imageSize.height * scale) / 2;
  } else {
    // Image is taller, fit to height
    scale = elementSize.height / imageSize.height;
    offsetX = (elementSize.width - imageSize.width * scale) / 2;
  }

  return {
    x: (point.x - offsetX) / scale,
    y: (point.y - offsetY) / scale,
  };
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Batch transform multiple points for performance
 */
export function batchTransformPoints(
  points: Point2D[],
  sourceSize: Size,
  targetSize: Size,
  maintainAspectRatio: boolean = true
): Point2D[] {
  // Calculate transformation parameters once
  const scaleFactors = maintainAspectRatio
    ? {
        x: calculateUniformScale(sourceSize, targetSize),
        y: calculateUniformScale(sourceSize, targetSize),
      }
    : calculateScaleFactors(sourceSize, targetSize);

  let offsetX = 0;
  let offsetY = 0;

  if (maintainAspectRatio) {
    const sourceAspect = sourceSize.width / sourceSize.height;
    const targetAspect = targetSize.width / targetSize.height;

    if (sourceAspect > targetAspect) {
      offsetY = (targetSize.height - sourceSize.height * scaleFactors.y) / 2;
    } else {
      offsetX = (targetSize.width - sourceSize.width * scaleFactors.x) / 2;
    }
  }

  // Transform all points with calculated parameters
  return points.map((point) => ({
    x: point.x * scaleFactors.x + offsetX,
    y: point.y * scaleFactors.y + offsetY,
  }));
}

// ============================================================================
// Default Exports
// ============================================================================

export const coordinateUtils = {
  transform: {
    point: transformImageCoordinates,
    bbox: transformBoundingBox,
    bboxes: transformBoundingBoxes,
    camera: transformCameraCoordinates,
    cameraBbox: transformCameraBoundingBox,
  },
  calculate: {
    scaleFactors: calculateScaleFactors,
    uniformScale: calculateUniformScale,
    displaySize: calculateDisplaySize,
  },
  bbox: {
    center: getBoundingBoxCenter,
    size: getBoundingBoxSize,
    area: getBoundingBoxArea,
    contains: isPointInBoundingBox,
    iou: calculateBoundingBoxIoU,
  },
  validate: {
    point: isValidPoint,
    bbox: isValidBoundingBox,
    size: isValidSize,
  },
  clamp: {
    point: clampPoint,
    bbox: clampBoundingBox,
  },
  convert: {
    arrayToBbox: arrayToBoundingBox,
    bboxToArray: boundingBoxToArray,
    arrayToPoint,
    pointToArray,
  },
  dom: {
    getRelativePosition,
    elementToImage: elementToImageCoordinates,
  },
  performance: {
    batchTransform: batchTransformPoints,
  },
};

export default coordinateUtils;
