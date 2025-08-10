// Environment and Camera Configuration
// src/config/environments.ts

import {
  EnvironmentConfiguration,
  CameraConfiguration,
  EnvironmentId,
  BackendCameraId,
  FrontendCameraId,
} from '../types/api';

// ============================================================================
// Camera Mapping Configuration
// ============================================================================

/**
 * Maps frontend camera IDs to backend camera IDs for different environments
 */
export const CAMERA_MAPPINGS = {
  factory: {
    camera1: 'c09',
    camera2: 'c12',
    camera3: 'c13',
    camera4: 'c16',
  },
  campus: {
    camera1: 'c01',
    camera2: 'c02',
    camera3: 'c03',
    camera4: 'c05',
  },
} as const;

/**
 * Reverse mapping: backend camera IDs to frontend camera IDs
 */
export const REVERSE_CAMERA_MAPPINGS = {
  factory: {
    c09: 'camera1',
    c12: 'camera2',
    c13: 'camera3',
    c16: 'camera4',
  },
  campus: {
    c01: 'camera1',
    c02: 'camera2',
    c03: 'camera3',
    c05: 'camera4',
  },
} as const;

// ============================================================================
// Camera Configurations
// ============================================================================

/**
 * Factory environment camera configurations
 */
const FACTORY_CAMERAS: CameraConfiguration[] = [
  {
    id: 'c09',
    name: 'Factory Camera 1 (Entrance)',
    position: [12.5, 8.3], // Map coordinates
    resolution: [1920, 1080],
    field_of_view: 70,
    homography_available: true,
  },
  {
    id: 'c12',
    name: 'Factory Camera 2 (Assembly Line)',
    position: [25.7, 15.2],
    resolution: [1920, 1080],
    field_of_view: 65,
    homography_available: true,
  },
  {
    id: 'c13',
    name: 'Factory Camera 3 (Storage Area)',
    position: [18.9, 22.1],
    resolution: [1920, 1080],
    field_of_view: 75,
    homography_available: true,
  },
  {
    id: 'c16',
    name: 'Factory Camera 4 (Quality Control)',
    position: [35.4, 12.8],
    resolution: [1920, 1080],
    field_of_view: 68,
    homography_available: true,
  },
];

/**
 * Campus environment camera configurations
 */
const CAMPUS_CAMERAS: CameraConfiguration[] = [
  {
    id: 'c01',
    name: 'Campus Camera 1 (Main Entrance)',
    position: [15.2, 25.7], // Map coordinates
    resolution: [1920, 1080],
    field_of_view: 72,
    homography_available: true,
  },
  {
    id: 'c02',
    name: 'Campus Camera 2 (Library)',
    position: [28.4, 18.6],
    resolution: [1920, 1080],
    field_of_view: 68,
    homography_available: true,
  },
  {
    id: 'c03',
    name: 'Campus Camera 3 (Cafeteria)',
    position: [22.1, 35.9],
    resolution: [1920, 1080],
    field_of_view: 70,
    homography_available: true,
  },
  {
    id: 'c05',
    name: 'Campus Camera 4 (Courtyard)',
    position: [38.7, 28.3],
    resolution: [1920, 1080],
    field_of_view: 75,
    homography_available: true,
  },
];

// ============================================================================
// Environment Configurations
// ============================================================================

/**
 * Complete environment configurations with cameras and map settings
 */
export const ENVIRONMENT_CONFIGS: Record<EnvironmentId, EnvironmentConfiguration> = {
  factory: {
    id: 'factory',
    name: 'Factory Floor',
    scene_id: 's14',
    cameras: FACTORY_CAMERAS,
    map_bounds: [
      [0, 0],
      [50, 40],
    ], // [min_x, min_y], [max_x, max_y] in meters
    default_zoom: 12,
  },
  campus: {
    id: 'campus',
    name: 'University Campus',
    scene_id: 's47',
    cameras: CAMPUS_CAMERAS,
    map_bounds: [
      [0, 0],
      [60, 50],
    ], // [min_x, min_y], [max_x, max_y] in meters
    default_zoom: 10,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get backend camera ID from frontend camera ID for a specific environment
 */
export function getBackendCameraId(
  frontendId: FrontendCameraId,
  environment: EnvironmentId
): BackendCameraId {
  return CAMERA_MAPPINGS[environment][frontendId] as BackendCameraId;
}

/**
 * Get frontend camera ID from backend camera ID for a specific environment
 */
export function getFrontendCameraId(
  backendId: BackendCameraId,
  environment: EnvironmentId
): FrontendCameraId | undefined {
  const mapping = REVERSE_CAMERA_MAPPINGS[environment];
  return (mapping as any)[backendId] as FrontendCameraId | undefined;
}

/**
 * Get all backend camera IDs for an environment
 */
export function getEnvironmentCameraIds(environment: EnvironmentId): BackendCameraId[] {
  return ENVIRONMENT_CONFIGS[environment].cameras.map((camera) => camera.id);
}

/**
 * Get camera configuration by ID
 */
export function getCameraConfig(
  cameraId: BackendCameraId,
  environment: EnvironmentId
): CameraConfiguration | undefined {
  return ENVIRONMENT_CONFIGS[environment].cameras.find((camera) => camera.id === cameraId);
}

/**
 * Get camera display name
 */
export function getCameraDisplayName(
  cameraId: BackendCameraId,
  environment: EnvironmentId
): string {
  const config = getCameraConfig(cameraId, environment);
  return config?.name || `Camera ${cameraId}`;
}

/**
 * Check if camera has homography data available
 */
export function hasHomographyData(cameraId: BackendCameraId, environment: EnvironmentId): boolean {
  const config = getCameraConfig(cameraId, environment);
  return config?.homography_available || false;
}

/**
 * Get camera position on map
 */
export function getCameraPosition(
  cameraId: BackendCameraId,
  environment: EnvironmentId
): [number, number] | undefined {
  const config = getCameraConfig(cameraId, environment);
  return config?.position;
}

/**
 * Validate camera ID for environment
 */
export function isValidCameraForEnvironment(
  cameraId: BackendCameraId,
  environment: EnvironmentId
): boolean {
  return ENVIRONMENT_CONFIGS[environment].cameras.some((camera) => camera.id === cameraId);
}

/**
 * Get environment configuration
 */
export function getEnvironmentConfig(environment: EnvironmentId): EnvironmentConfiguration {
  return ENVIRONMENT_CONFIGS[environment];
}

/**
 * Get all available environments
 */
export function getAvailableEnvironments(): EnvironmentConfiguration[] {
  return Object.values(ENVIRONMENT_CONFIGS);
}

/**
 * Get scene ID for environment (used in backend communication)
 */
export function getSceneId(environment: EnvironmentId): string {
  return ENVIRONMENT_CONFIGS[environment].scene_id;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(environment: EnvironmentId): boolean {
  const config = ENVIRONMENT_CONFIGS[environment];

  if (!config) {
    console.error(`Environment '${environment}' not found`);
    return false;
  }

  if (config.cameras.length === 0) {
    console.error(`No cameras configured for environment '${environment}'`);
    return false;
  }

  if (config.cameras.length !== 4) {
    console.warn(`Environment '${environment}' has ${config.cameras.length} cameras, expected 4`);
  }

  // Validate camera mappings
  const frontendIds = Object.keys(CAMERA_MAPPINGS[environment]) as FrontendCameraId[];
  const backendIds = Object.values(CAMERA_MAPPINGS[environment]);

  if (frontendIds.length !== 4) {
    console.error(`Invalid frontend camera mapping for environment '${environment}'`);
    return false;
  }

  if (backendIds.some((id) => !config.cameras.find((camera) => camera.id === id))) {
    console.error(`Camera mapping mismatch for environment '${environment}'`);
    return false;
  }

  return true;
}

/**
 * Validate all environment configurations
 */
export function validateAllEnvironmentConfigs(): boolean {
  const environments = Object.keys(ENVIRONMENT_CONFIGS) as EnvironmentId[];
  return environments.every((env) => validateEnvironmentConfig(env));
}

// ============================================================================
// Constants for Display
// ============================================================================

/**
 * Camera display order (left to right, top to bottom in grid)
 */
export const CAMERA_DISPLAY_ORDER: FrontendCameraId[] = [
  'camera1',
  'camera2',
  'camera3',
  'camera4',
];

/**
 * Default camera resolution for display calculations
 */
export const DEFAULT_CAMERA_RESOLUTION: [number, number] = [1920, 1080];

/**
 * Default frame aspect ratio
 */
export const DEFAULT_ASPECT_RATIO = 16 / 9;

/**
 * Map configuration defaults
 */
export const MAP_DEFAULTS = {
  minZoom: 8,
  maxZoom: 18,
  defaultCenter: [25, 25] as [number, number],
  markerSize: 10,
  trajectoryWidth: 2,
  cameraIconSize: 20,
};

// ============================================================================
// Development and Testing Utilities
// ============================================================================

/**
 * Create mock environment for testing
 */
export function createMockEnvironment(id: EnvironmentId): EnvironmentConfiguration {
  return {
    ...ENVIRONMENT_CONFIGS[id],
    cameras: ENVIRONMENT_CONFIGS[id].cameras.map((camera) => ({
      ...camera,
      // Add mock properties for testing
    })),
  };
}

/**
 * Get all camera IDs across all environments (for testing)
 */
export function getAllCameraIds(): BackendCameraId[] {
  return [...FACTORY_CAMERAS.map((c) => c.id), ...CAMPUS_CAMERAS.map((c) => c.id)];
}

/**
 * Generate camera mapping validation report
 */
export function generateMappingReport(): {
  environment: EnvironmentId;
  frontend_to_backend: Record<FrontendCameraId, BackendCameraId>;
  backend_to_frontend: Record<string, FrontendCameraId>;
  camera_configs: CameraConfiguration[];
}[] {
  return Object.entries(ENVIRONMENT_CONFIGS).map(([envId, config]) => ({
    environment: envId as EnvironmentId,
    frontend_to_backend: CAMERA_MAPPINGS[envId as EnvironmentId],
    backend_to_frontend: REVERSE_CAMERA_MAPPINGS[envId as EnvironmentId],
    camera_configs: config.cameras,
  }));
}

// Validate configurations on module load (development only)
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
  if (!validateAllEnvironmentConfigs()) {
    console.error('Environment configuration validation failed!');
  } else {
    console.log('Environment configurations validated successfully');
  }
}
