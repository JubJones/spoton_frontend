// Legacy tracking data types - kept for backward compatibility
// New types should be imported from './api.ts' and './ui.ts'
// src/types/trackingData.ts

import { TrackedPerson, CameraTrackingData as APICameraTrackingData, BackendCameraId, WebSocketTrackingMessagePayload, EnvironmentId } from './api';
import { TrackedPersonDisplay, CameraTrackingDisplayData } from './ui';

// Re-export new types for backward compatibility
export type { TrackedPerson, BackendCameraId, WebSocketTrackingMessagePayload, EnvironmentId };
export type { TrackedPersonDisplay, CameraTrackingDisplayData };

// Legacy exports for compatibility
export type TrackingUpdatePayload = WebSocketTrackingMessagePayload;
export type CameraID = BackendCameraId;
export type EnvironmentID = EnvironmentId;

// Camera mapping constants
export const CAMERA_MAPPING = {
  camera1: 'c09' as BackendCameraId,
  camera2: 'c12' as BackendCameraId,
  camera3: 'c13' as BackendCameraId,
  camera4: 'c16' as BackendCameraId,
};

export const ENVIRONMENT_CAMERAS = {
  campus: ['c01', 'c02', 'c03', 'c05'] as BackendCameraId[],
  factory: ['c09', 'c12', 'c13', 'c16'] as BackendCameraId[],
};

// Legacy interface - use TrackedPerson instead
/** @deprecated Use TrackedPerson from './api.ts' instead */
export interface BoundingBox {
  track_id: number;
  global_id?: number | string; // Legacy property, use global_id (string) instead
  bbox_xyxy: [number, number, number, number]; // [x_min, y_min, x_max, y_max]
  confidence?: number; // Optional
  class_id?: number; // Optional
  map_coords?: [number, number]; // Optional for now
}

// Legacy interface - use CameraTrackingDisplayData instead
/** @deprecated Use CameraTrackingDisplayData from './ui.ts' instead */
export interface CameraTrackingData {
  image_source: string;
  frame_image_base64?: string;
  tracks: BoundingBox[]; // Legacy compatibility - overrides the API tracks
}

// Legacy interface - use WebSocketTrackingMessagePayload instead
/** @deprecated Use WebSocketTrackingMessagePayload from './api.ts' instead */
export interface FrameTrackingData {
  frame_index: number; // Corresponds to global_frame_index
  cameras: {
    [cameraId: string]: CameraTrackingData; // e.g., cameras['c09']
  };
  timestamp?: string; // Add timestamp support
}

// ============================================================================
// Migration Helpers - Convert between legacy and new types
// ============================================================================

export function convertLegacyBoundingBox(legacy: BoundingBox): TrackedPerson {
  return {
    track_id: legacy.track_id,
    global_id: legacy.global_id?.toString(), // Convert number to string if exists
    bbox_xyxy: legacy.bbox_xyxy,
    confidence: legacy.confidence,
    class_id: legacy.class_id,
    map_coords: legacy.map_coords,
  };
}

export function convertLegacyCameraData(legacy: CameraTrackingData): APICameraTrackingData {
  return {
    image_source: legacy.image_source || '',
    frame_image_base64: undefined, // Legacy doesn't have base64 frames
    tracks: legacy.tracks.map(convertLegacyBoundingBox),
  };
}

export function convertLegacyFrameData(legacy: FrameTrackingData): {
  global_frame_index: number;
  cameras: Record<string, APICameraTrackingData>;
  timestamp: string;
} {
  const convertedCameras: Record<string, APICameraTrackingData> = {};

  Object.entries(legacy.cameras).forEach(([cameraId, cameraData]) => {
    convertedCameras[cameraId] = convertLegacyCameraData(cameraData);
  });

  return {
    global_frame_index: legacy.frame_index,
    cameras: convertedCameras,
    timestamp: legacy.timestamp || new Date().toISOString(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a value is a valid legacy BoundingBox
 */
export function isLegacyBoundingBox(value: any): value is BoundingBox {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.track_id === 'number' &&
    Array.isArray(value.bbox_xyxy) &&
    value.bbox_xyxy.length === 4 &&
    value.bbox_xyxy.every((coord: any) => typeof coord === 'number')
  );
}

/**
 * Check if a value is a valid legacy FrameTrackingData
 */
export function isLegacyFrameTrackingData(value: any): value is FrameTrackingData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.frame_index === 'number' &&
    typeof value.cameras === 'object' &&
    value.cameras !== null
  );
}

// ============================================================================
// Constants for backward compatibility
// ============================================================================

/** @deprecated Use camera mapping from config instead */
export const LEGACY_CAMERA_MAPPING = {
  camera1: 'c09',
  camera2: 'c12',
  camera3: 'c13',
  camera4: 'c16',
} as const;
