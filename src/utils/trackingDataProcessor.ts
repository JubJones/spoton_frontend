// Tracking Data Processing Utilities
// src/utils/trackingDataProcessor.ts

import {
  TrackedPerson,
  WebSocketTrackingMessagePayload,
  CameraTrackingData,
  BackendCameraId,
  EnvironmentId,
} from '../types/api';
import {
  TrackedPersonDisplay,
  CameraTrackingDisplayData,
  PersonTrajectoryData,
  TrajectoryPoint,
  PERSON_COLORS,
} from '../types/ui';
import { getBackendCameraId, getFrontendCameraId, getCameraConfig } from '../config/environments';
import { coordinateUtils } from './coordinateTransform';

// ============================================================================
// Data Processing Configuration
// ============================================================================

interface ProcessingConfig {
  enablePersonColoring: boolean;
  enableTrajectoryTracking: boolean;
  maxTrajectoryPoints: number;
  confidenceThreshold: number;
  displayScaling: boolean;
}

const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  enablePersonColoring: true,
  enableTrajectoryTracking: true,
  maxTrajectoryPoints: 100,
  confidenceThreshold: 0.3,
  displayScaling: true,
};

// ============================================================================
// Person Color Management
// ============================================================================

class PersonColorManager {
  private colorMap: Map<string, string> = new Map();
  private colorIndex: number = 0;

  /**
   * Get consistent color for person
   */
  getPersonColor(globalId: string): string {
    if (this.colorMap.has(globalId)) {
      return this.colorMap.get(globalId)!;
    }

    const color = PERSON_COLORS[this.colorIndex % PERSON_COLORS.length];
    this.colorMap.set(globalId, color);
    this.colorIndex++;

    return color;
  }

  /**
   * Clear color assignments
   */
  clearColors(): void {
    this.colorMap.clear();
    this.colorIndex = 0;
  }

  /**
   * Remove color for specific person
   */
  removePersonColor(globalId: string): void {
    this.colorMap.delete(globalId);
  }

  /**
   * Get all assigned colors
   */
  getAllColors(): Map<string, string> {
    return new Map(this.colorMap);
  }
}

// Global color manager instance
const colorManager = new PersonColorManager();

// ============================================================================
// Tracking Data Processing
// ============================================================================

/**
 * Process WebSocket tracking payload for display
 */
export function processTrackingPayload(
  payload: WebSocketTrackingMessagePayload,
  displaySizes: Record<BackendCameraId, { width: number; height: number }>,
  config: Partial<ProcessingConfig> = {}
): {
  processedCameras: Record<BackendCameraId, CameraTrackingDisplayData>;
  totalPersons: number;
  uniquePersons: Set<string>;
} {
  const mergedConfig = { ...DEFAULT_PROCESSING_CONFIG, ...config };
  const processedCameras: Record<BackendCameraId, CameraTrackingDisplayData> = {};
  const uniquePersons = new Set<string>();
  let totalPersons = 0;

  // Process each camera's data
  Object.entries(payload.cameras).forEach(([cameraId, cameraData]) => {
    const backendCameraId = cameraId as BackendCameraId;
    const displaySize = displaySizes[backendCameraId];

    if (!displaySize) {
      console.warn(`No display size configured for camera ${cameraId}`);
      return;
    }

    // Process camera data
    const processedCamera = processCameraData(
      cameraData,
      backendCameraId,
      payload.scene_id,
      displaySize,
      mergedConfig
    );

    processedCameras[backendCameraId] = processedCamera;

    // Collect statistics
    totalPersons += processedCamera.tracks.length;
    processedCamera.tracks.forEach((track) => {
      if (track.global_id) {
        uniquePersons.add(track.global_id);
      }
    });
  });

  return {
    processedCameras,
    totalPersons,
    uniquePersons,
  };
}

/**
 * Process individual camera tracking data
 */
export function processCameraData(
  cameraData: CameraTrackingData,
  cameraId: BackendCameraId,
  environment: EnvironmentId,
  displaySize: { width: number; height: number },
  config: ProcessingConfig
): CameraTrackingDisplayData {
  const cameraConfig = getCameraConfig(cameraId, environment);

  if (!cameraConfig) {
    throw new Error(`Camera configuration not found for ${cameraId}`);
  }

  const sourceSize = {
    width: cameraConfig.resolution[0],
    height: cameraConfig.resolution[1],
  };

  // Calculate scale factors
  const scaleFactors = coordinateUtils.calculate.scaleFactors(sourceSize, displaySize);

  // Process tracks
  const processedTracks = cameraData.tracks
    .filter((track) => {
      // Filter by confidence threshold
      return !track.confidence || track.confidence >= config.confidenceThreshold;
    })
    .map((track) => processPersonTrack(track, scaleFactors, config));

  return {
    cameraId,
    frameImageUrl: cameraData.frame_image_base64
      ? `data:image/jpeg;base64,${cameraData.frame_image_base64}`
      : undefined,
    tracks: processedTracks,
    isActive: true,
    lastUpdated: new Date().toISOString(),
    resolution: [sourceSize.width, sourceSize.height],
    displaySize: [displaySize.width, displaySize.height],
    scaleFactor: [scaleFactors.x, scaleFactors.y],
  };
}

/**
 * Process individual person track
 */
export function processPersonTrack(
  track: TrackedPerson,
  scaleFactors: { x: number; y: number },
  config: ProcessingConfig
): TrackedPersonDisplay {
  // Transform bounding box coordinates
  const originalBbox = coordinateUtils.convert.arrayToBbox(track.bbox_xyxy);
  const displayBbox = config.displayScaling
    ? {
        x1: originalBbox.x1 * scaleFactors.x,
        y1: originalBbox.y1 * scaleFactors.y,
        x2: originalBbox.x2 * scaleFactors.x,
        y2: originalBbox.y2 * scaleFactors.y,
      }
    : originalBbox;

  // Get person color
  const color =
    config.enablePersonColoring && track.global_id
      ? colorManager.getPersonColor(track.global_id)
      : '#FF6B6B'; // Default color

  // Create display label
  const label = createPersonLabel(track);

  // Calculate center point
  const center = coordinateUtils.bbox.center(displayBbox);

  return {
    ...track,
    displayBbox: coordinateUtils.convert.bboxToArray(displayBbox),
    isSelected: false,
    isFocused: false,
    isHighlighted: false,
    color,
    label,
    center: coordinateUtils.convert.pointToArray(center),
    croppedImageUrl: undefined, // Will be set by image service if needed
    firstSeenAt: undefined, // Will be set by trajectory tracking
    trackingDuration: undefined,
    lastSeenCamera: undefined,
  };
}

/**
 * Create display label for person
 */
export function createPersonLabel(track: TrackedPerson): string {
  if (track.global_id) {
    const shortId = track.global_id.substring(0, 8);
    return track.confidence
      ? `P-${shortId} (${(track.confidence * 100).toFixed(0)}%)`
      : `P-${shortId}`;
  }

  return track.confidence
    ? `Track ${track.track_id} (${(track.confidence * 100).toFixed(0)}%)`
    : `Track ${track.track_id}`;
}

// ============================================================================
// Trajectory Processing
// ============================================================================

export class TrajectoryProcessor {
  private trajectories: Map<string, PersonTrajectoryData> = new Map();
  private config: ProcessingConfig;

  constructor(config: Partial<ProcessingConfig> = {}) {
    this.config = { ...DEFAULT_PROCESSING_CONFIG, ...config };
  }

  /**
   * Update trajectory for person
   */
  updateTrajectory(
    globalPersonId: string,
    position: [number, number],
    mapCoords: [number, number] | undefined,
    cameraId: BackendCameraId,
    confidence: number,
    timestamp: string
  ): void {
    if (!this.config.enableTrajectoryTracking) {
      return;
    }

    let trajectory = this.trajectories.get(globalPersonId);

    if (!trajectory) {
      trajectory = this.createNewTrajectory(globalPersonId);
      this.trajectories.set(globalPersonId, trajectory);
    }

    // Add new trajectory point
    const newPoint: TrajectoryPoint = {
      position: mapCoords || position,
      timestamp,
      cameraId,
      confidence,
    };

    trajectory.points.push(newPoint);

    // Limit trajectory length
    if (trajectory.points.length > this.config.maxTrajectoryPoints) {
      trajectory.points = trajectory.points.slice(-this.config.maxTrajectoryPoints);
    }

    // Update trajectory metadata
    this.updateTrajectoryMetadata(trajectory);
  }

  /**
   * Get trajectory for person
   */
  getTrajectory(globalPersonId: string): PersonTrajectoryData | undefined {
    return this.trajectories.get(globalPersonId);
  }

  /**
   * Get all trajectories
   */
  getAllTrajectories(): Map<string, PersonTrajectoryData> {
    return new Map(this.trajectories);
  }

  /**
   * Clear trajectory for person
   */
  clearTrajectory(globalPersonId: string): void {
    this.trajectories.delete(globalPersonId);
    colorManager.removePersonColor(globalPersonId);
  }

  /**
   * Clear all trajectories
   */
  clearAllTrajectories(): void {
    this.trajectories.clear();
    colorManager.clearColors();
  }

  /**
   * Create new trajectory
   */
  private createNewTrajectory(globalPersonId: string): PersonTrajectoryData {
    return {
      globalPersonId,
      points: [],
      color: colorManager.getPersonColor(globalPersonId),
      isVisible: true,
      totalDistance: 0,
      averageSpeed: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update trajectory metadata
   */
  private updateTrajectoryMetadata(trajectory: PersonTrajectoryData): void {
    trajectory.lastUpdated = new Date().toISOString();

    if (trajectory.points.length < 2) {
      trajectory.totalDistance = 0;
      trajectory.averageSpeed = 0;
      return;
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < trajectory.points.length; i++) {
      const prev = trajectory.points[i - 1];
      const curr = trajectory.points[i];

      const dx = curr.position[0] - prev.position[0];
      const dy = curr.position[1] - prev.position[1];
      const distance = Math.sqrt(dx * dx + dy * dy);

      totalDistance += distance;
    }

    trajectory.totalDistance = totalDistance;

    // Calculate average speed (distance per second)
    const firstPoint = trajectory.points[0];
    const lastPoint = trajectory.points[trajectory.points.length - 1];
    const timeDiff =
      new Date(lastPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime();
    const timeInSeconds = timeDiff / 1000;

    trajectory.averageSpeed = timeInSeconds > 0 ? totalDistance / timeInSeconds : 0;
  }
}

// ============================================================================
// Data Validation and Sanitization
// ============================================================================

/**
 * Validate tracking payload
 */
export function validateTrackingPayload(payload: any): payload is WebSocketTrackingMessagePayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  // Check required fields
  if (
    typeof payload.global_frame_index !== 'number' ||
    typeof payload.scene_id !== 'string' ||
    typeof payload.timestamp_processed_utc !== 'string' ||
    !payload.cameras ||
    typeof payload.cameras !== 'object'
  ) {
    return false;
  }

  // Validate camera data
  for (const [cameraId, cameraData] of Object.entries(payload.cameras)) {
    if (!validateCameraData(cameraData)) {
      console.warn(`Invalid camera data for ${cameraId}`);
      return false;
    }
  }

  return true;
}

/**
 * Validate camera tracking data
 */
export function validateCameraData(data: any): data is CameraTrackingData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (typeof data.image_source !== 'string') {
    return false;
  }

  if (!Array.isArray(data.tracks)) {
    return false;
  }

  // Validate each track
  return data.tracks.every(validatePersonTrack);
}

/**
 * Validate person track data
 */
export function validatePersonTrack(track: any): track is TrackedPerson {
  if (!track || typeof track !== 'object') {
    return false;
  }

  // Check required fields
  if (
    typeof track.track_id !== 'number' ||
    !Array.isArray(track.bbox_xyxy) ||
    track.bbox_xyxy.length !== 4 ||
    !track.bbox_xyxy.every((coord: any) => typeof coord === 'number')
  ) {
    return false;
  }

  // Check optional fields
  if (track.confidence !== undefined && typeof track.confidence !== 'number') {
    return false;
  }

  if (track.global_id !== undefined && typeof track.global_id !== 'string') {
    return false;
  }

  if (track.map_coords !== undefined) {
    if (
      !Array.isArray(track.map_coords) ||
      track.map_coords.length !== 2 ||
      !track.map_coords.every((coord: any) => typeof coord === 'number')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize tracking payload
 */
export function sanitizeTrackingPayload(payload: any): WebSocketTrackingMessagePayload | null {
  try {
    if (!validateTrackingPayload(payload)) {
      return null;
    }

    // Sanitize camera data
    const sanitizedCameras: Record<string, CameraTrackingData> = {};

    Object.entries(payload.cameras).forEach(([cameraId, cameraData]) => {
      const sanitizedData = sanitizeCameraData(cameraData);
      if (sanitizedData) {
        sanitizedCameras[cameraId] = sanitizedData;
      }
    });

    return {
      global_frame_index: payload.global_frame_index,
      scene_id: payload.scene_id,
      timestamp_processed_utc: payload.timestamp_processed_utc,
      cameras: sanitizedCameras,
    };
  } catch (error) {
    console.error('Error sanitizing tracking payload:', error);
    return null;
  }
}

/**
 * Sanitize camera data
 */
export function sanitizeCameraData(data: any): CameraTrackingData | null {
  if (!validateCameraData(data)) {
    return null;
  }

  // Sanitize tracks
  const sanitizedTracks = data.tracks
    .map(sanitizePersonTrack)
    .filter((track): track is TrackedPerson => track !== null);

  return {
    image_source: data.image_source,
    frame_image_base64: data.frame_image_base64 || undefined,
    tracks: sanitizedTracks,
  };
}

/**
 * Sanitize person track data
 */
export function sanitizePersonTrack(track: any): TrackedPerson | null {
  if (!validatePersonTrack(track)) {
    return null;
  }

  // Clamp confidence to valid range
  let confidence = track.confidence;
  if (confidence !== undefined) {
    confidence = Math.max(0, Math.min(1, confidence));
  }

  // Ensure bounding box coordinates are valid
  const bbox = track.bbox_xyxy.map((coord: number) => Math.max(0, coord));

  return {
    track_id: track.track_id,
    global_id: track.global_id || undefined,
    bbox_xyxy: bbox as [number, number, number, number],
    confidence,
    class_id: track.class_id || 1, // Default to person class
    map_coords: track.map_coords || undefined,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get person statistics from tracking data
 */
export function getTrackingStatistics(
  processedCameras: Record<BackendCameraId, CameraTrackingDisplayData>
): {
  totalDetections: number;
  uniquePersons: number;
  averageConfidence: number;
  cameraStats: Record<BackendCameraId, { detections: number; avgConfidence: number }>;
} {
  let totalDetections = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  const uniquePersons = new Set<string>();
  const cameraStats: Record<BackendCameraId, { detections: number; avgConfidence: number }> = {};

  Object.entries(processedCameras).forEach(([cameraId, cameraData]) => {
    const backendCameraId = cameraId as BackendCameraId;
    let cameraConfidenceSum = 0;
    let cameraConfidenceCount = 0;

    cameraData.tracks.forEach((track) => {
      totalDetections++;

      if (track.global_id) {
        uniquePersons.add(track.global_id);
      }

      if (track.confidence !== undefined) {
        confidenceSum += track.confidence;
        confidenceCount++;
        cameraConfidenceSum += track.confidence;
        cameraConfidenceCount++;
      }
    });

    cameraStats[backendCameraId] = {
      detections: cameraData.tracks.length,
      avgConfidence: cameraConfidenceCount > 0 ? cameraConfidenceSum / cameraConfidenceCount : 0,
    };
  });

  return {
    totalDetections,
    uniquePersons: uniquePersons.size,
    averageConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    cameraStats,
  };
}

/**
 * Find person across all cameras
 */
export function findPersonAcrossCameras(
  globalPersonId: string,
  processedCameras: Record<BackendCameraId, CameraTrackingDisplayData>
): Array<{ cameraId: BackendCameraId; track: TrackedPersonDisplay }> {
  const results: Array<{ cameraId: BackendCameraId; track: TrackedPersonDisplay }> = [];

  Object.entries(processedCameras).forEach(([cameraId, cameraData]) => {
    const backendCameraId = cameraId as BackendCameraId;
    const track = cameraData.tracks.find((t) => t.global_id === globalPersonId);

    if (track) {
      results.push({ cameraId: backendCameraId, track });
    }
  });

  return results;
}

// ============================================================================
// Default Exports
// ============================================================================

// Create default trajectory processor instance
export const trajectoryProcessor = new TrajectoryProcessor();

export const trackingDataUtils = {
  process: {
    payload: processTrackingPayload,
    camera: processCameraData,
    person: processPersonTrack,
  },
  validate: {
    payload: validateTrackingPayload,
    camera: validateCameraData,
    person: validatePersonTrack,
  },
  sanitize: {
    payload: sanitizeTrackingPayload,
    camera: sanitizeCameraData,
    person: sanitizePersonTrack,
  },
  analyze: {
    statistics: getTrackingStatistics,
    findPerson: findPersonAcrossCameras,
  },
  trajectory: trajectoryProcessor,
  colors: colorManager,
};

export default trackingDataUtils;
