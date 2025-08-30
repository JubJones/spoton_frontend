// Mock data for SpotOn frontend development
// This allows UI development independent of backend
// src/mocks/mockData.ts

import { 
  WebSocketTrackingMessagePayload,
  CameraFrame, 
  PersonTrack,
  BackendCameraId,
  EnvironmentId,
  TaskStatus,
  SystemHealthResponse
} from '../types/api';

// Mock camera IDs for different environments
export const MOCK_CAMERA_IDS = {
  factory: ['c09', 'c12', 'c13', 'c16'] as BackendCameraId[],
  campus: ['c01', 'c02', 'c03', 'c05'] as BackendCameraId[],
};

// Mock person IDs pool for realistic tracking
const MOCK_PERSON_IDS = [
  'person_001', 'person_002', 'person_003', 'person_004', 'person_005',
  'person_006', 'person_007', 'person_008', 'person_009', 'person_010'
];

// Generate random bbox within image bounds
const generateRandomBbox = (imageWidth = 1920, imageHeight = 1080): [number, number, number, number] => {
  const minWidth = 80;
  const minHeight = 160;
  const maxWidth = 200;
  const maxHeight = 400;
  
  const width = Math.random() * (maxWidth - minWidth) + minWidth;
  const height = Math.random() * (maxHeight - minHeight) + minHeight;
  
  const x1 = Math.random() * (imageWidth - width);
  const y1 = Math.random() * (imageHeight - height);
  
  return [x1, y1, x1 + width, y1 + height];
};

// Generate random map coordinates
const generateRandomMapCoords = (): [number, number] => {
  return [
    Math.random() * 100, // X coordinate (0-100%)
    Math.random() * 100  // Y coordinate (0-100%)
  ];
};

// Create a mock person track
const createMockPersonTrack = (
  trackId: number, 
  globalId: string, 
  cameraId: BackendCameraId
): PersonTrack => {
  return {
    track_id: trackId,
    global_id: globalId,
    bbox_xyxy: generateRandomBbox(),
    confidence: 0.7 + Math.random() * 0.3, // 0.7 to 1.0
    class_id: 1, // Person class
    map_coords: generateRandomMapCoords(),
    is_focused: false,
    detection_time: new Date().toISOString(),
    tracking_duration: Math.random() * 300, // 0-300 seconds
  };
};

// Create mock camera frame data
const createMockCameraFrame = (cameraId: BackendCameraId, frameIndex: number): CameraFrame => {
  const numTracks = Math.floor(Math.random() * 5); // 0-4 people per camera
  const tracks = [];
  
  for (let i = 0; i < numTracks; i++) {
    const personId = MOCK_PERSON_IDS[Math.floor(Math.random() * MOCK_PERSON_IDS.length)];
    tracks.push(createMockPersonTrack(i + 1, personId, cameraId));
  }
  
  return {
    image_source: `frame_${frameIndex.toString().padStart(6, '0')}.jpg`,
    frame_image_base64: undefined, // Will be populated by mock service
    cropped_persons: {},
    tracks
  };
};

// Mock tracking message generator
export const generateMockTrackingData = (
  environment: EnvironmentId,
  frameIndex: number = 0
): WebSocketTrackingMessagePayload => {
  const cameraIds = MOCK_CAMERA_IDS[environment];
  const cameras: Record<string, CameraFrame> = {};
  const personCountPerCamera: Record<string, number> = {};
  
  // Generate data for each camera
  cameraIds.forEach(cameraId => {
    const cameraFrame = createMockCameraFrame(cameraId, frameIndex);
    cameras[cameraId] = cameraFrame;
    personCountPerCamera[cameraId] = cameraFrame.tracks.length;
  });
  
  return {
    global_frame_index: frameIndex,
    scene_id: environment,
    timestamp_processed_utc: new Date().toISOString(),
    cameras,
    person_count_per_camera: personCountPerCamera,
    focus_person_id: null
  };
};

// Mock system health data
export const generateMockSystemHealth = (): SystemHealthResponse => {
  return {
    status: 'healthy',
    detector_model_loaded: true,
    'prototype_tracker_loaded (reid_model)': true,
    homography_matrices_precomputed: true,
    timestamp: new Date().toISOString()
  };
};

// Mock task status progression
export const MOCK_TASK_STATUSES: TaskStatus[] = [
  'INITIALIZING',
  'DOWNLOADING', 
  'EXTRACTING',
  'PROCESSING',
  'COMPLETED'
];

// Mock task progression
export const generateMockTaskStatus = (
  taskId: string,
  statusIndex: number = 0,
  progress: number = 0
) => {
  const status = MOCK_TASK_STATUSES[Math.min(statusIndex, MOCK_TASK_STATUSES.length - 1)];
  
  return {
    task_id: taskId,
    status,
    progress: Math.min(progress, 1.0),
    current_step: getStepDescription(status),
    details: {
      frames_processed: Math.floor(progress * 1000),
      total_frames: 1000,
      processing_fps: 12 + Math.random() * 8, // 12-20 FPS
    },
    created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    updated_at: new Date().toISOString()
  };
};

const getStepDescription = (status: TaskStatus): string => {
  switch (status) {
    case 'INITIALIZING': return 'Loading AI models and initializing cameras';
    case 'DOWNLOADING': return 'Downloading video data from S3 storage';
    case 'EXTRACTING': return 'Extracting frames from video files';
    case 'PROCESSING': return 'Running person detection and tracking';
    case 'COMPLETED': return 'Processing completed successfully';
    case 'FAILED': return 'Processing failed with errors';
    default: return 'Processing in progress';
  }
};

// Mock base64 image data (placeholder)
export const MOCK_BASE64_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

// Export mock data collections
export const MOCK_ENVIRONMENTS = ['factory', 'campus'] as EnvironmentId[];

export const MOCK_CAMERA_NAMES = {
  c09: 'Factory Camera 1',
  c12: 'Factory Camera 2', 
  c13: 'Factory Camera 3',
  c16: 'Factory Camera 4',
  c01: 'Campus Camera 1',
  c02: 'Campus Camera 2',
  c03: 'Campus Camera 3',
  c05: 'Campus Camera 4',
};

// Configuration for mock behavior
export const MOCK_CONFIG = {
  FRAME_INTERVAL_MS: 1000, // Update every 1 second
  TASK_PROGRESS_INTERVAL_MS: 2000, // Update task progress every 2 seconds
  MAX_PERSONS_PER_CAMERA: 4,
  MIN_PERSONS_PER_CAMERA: 0,
  WEBSOCKET_RECONNECT_INTERVAL_MS: 5000,
  SYSTEM_HEALTH_CHECK_INTERVAL_MS: 10000,
} as const;