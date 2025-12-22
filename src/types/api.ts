// Backend API Types - Based on FastAPI backend analysis
// src/types/api.ts

// ============================================================================
// Processing Task Types
// ============================================================================

export interface ProcessingTaskStartRequest {
  environment_id: 'campus' | 'factory';
}

export interface ProcessingTaskCreateResponse {
  task_id: string;
  websocket_url: string;
  status_url: string;
  message: string;
}

export type TaskStatus =
  | 'QUEUED'
  | 'INITIALIZING'
  | 'DOWNLOADING'
  | 'EXTRACTING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  progress: number; // 0.0-1.0 (backend format)
  current_step: string;
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Playback Control Types
// ============================================================================

export type PlaybackState = 'playing' | 'paused' | 'stopped';

export interface PlaybackStatusResponse {
  task_id: string;
  state: PlaybackState;
  last_transition_at: string;
  last_frame_index?: number;
  last_error?: string;
}

// ============================================================================
// Tracking Data Types
// ============================================================================

export interface TrackedPerson {
  track_id: number; // Camera-specific track ID
  global_id?: string; // Cross-camera unique ID (UUID)
  bbox_xyxy: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence?: number; // Detection confidence (0-1)
  class_id?: number; // Always 1 for person
  map_coords?: [number, number]; // Projected map coordinates [X, Y]
}

// Legacy compatibility - replaced by CameraFrame
export interface CameraTrackingData {
  image_source: string; // Frame filename (e.g., "frame_000042.jpg")
  frame_image_base64?: string; // Optional JPEG base64 data
  tracks: TrackedPerson[];
}

export interface CameraFrame {
  image_source: string;
  frame_image_base64?: string;
  cropped_persons?: Record<string, string>;
  tracks: PersonTrack[];
}

export interface PersonTrack {
  track_id: number;
  global_id: string;
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords: [number, number];
  is_focused: boolean;
  detection_time: string;
  tracking_duration: number;
}

export interface WebSocketTrackingMessagePayload {
  global_frame_index: number;
  scene_id: 'campus' | 'factory';
  timestamp_processed_utc: string;
  cameras: Record<string, CameraFrame>;
  person_count_per_camera: Record<string, number>;
  focus_person_id: string | null;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type WebSocketMessageType =
  | 'connection_established'
  | 'tracking_update'
  | 'status_update'
  | 'system_status'
  | 'control_message'
  | 'pong'
  | 'subscribe_tracking'
  | 'unsubscribe_tracking'
  | 'request_status'
  | 'ping';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: any;
  timestamp?: string;
}

// Client to Server message types
export interface WebSocketClientMessage {
  type: 'subscribe_tracking' | 'unsubscribe_tracking' | 'request_status' | 'ping';
}

// Server to Client message payloads
export interface ConnectionEstablishedPayload {
  task_id: string;
  capabilities: string[];
  supported_features: string[];
}

export interface StatusUpdatePayload {
  task_id: string;
  status: TaskStatus;
  progress: number;
  current_step: string;
  frames_processed: number;
  processing_fps: number;
  estimated_completion: string;
}

export interface PongPayload {
  timestamp: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserInfo {
  username: string;
  role: string;
  permissions: string[];
}

// ============================================================================
// System Health Types
// ============================================================================

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  detector_model_loaded?: boolean;
  'prototype_tracker_loaded (reid_model)'?: boolean;
  homography_matrices_precomputed?: boolean;
  // Legacy fields for backward compatibility
  detector_model_status?: 'loaded' | 'loading' | 'error';
  tracker_factory_status?: 'ready' | 'initializing' | 'error';
  homography_matrices_status?: 'loaded' | 'missing' | 'error';
  timestamp?: string;
}

// ============================================================================
// Environment Management Types
// ============================================================================

export interface Environment {
  environment_id: string;
  name: string;
  environment_type: string;
  description: string;
  is_active: boolean;
  camera_count: number;
  zone_count: number;
  has_data: boolean;
  last_updated: string;
}

export interface DateRange {
  earliest_date: string;
  latest_date: string;
  total_days: number;
  has_data: boolean;
  data_gaps?: Array<{ start: string; end: string }>;
}

export interface Camera {
  camera_id: string;
  name: string;
  location: string;
  is_active: boolean;
  resolution: string;
  fps: number;
  has_homography: boolean;
}

export interface Zone {
  zone_id: string;
  name: string;
  zone_type: string;
  coordinates: Array<[number, number]>;
}

export interface AnalysisSession {
  session_id: string;
  environment_id: string;
  time_range: {
    start: string;
    end: string;
  };
  status: string;
  data_points_available: number;
  estimated_processing_time_ms: number;
}

// ============================================================================
// Focus Tracking Types
// ============================================================================

export interface SetFocusRequest {
  global_person_id: string;
  cross_camera_sync: boolean;
  highlight_settings: {
    enabled: boolean;
    intensity: number;
    border_thickness?: number;
    border_color?: [number, number, number];
    glow_effect?: boolean;
    darken_background?: boolean;
  };
}

export interface FocusState {
  task_id: string;
  focused_person_id: string | null;
  has_active_focus: boolean;
  focus_duration: number;
  focus_state?: {
    start_time: string;
    settings: {
      intensity: number;
      cross_camera_sync: boolean;
    };
  };
}

export interface PersonDetails {
  global_person_id: string;
  first_detected: string;
  last_seen: string;
  tracking_duration: number;
  cameras_seen: string[];
  current_camera: string;
  total_detections: number;
  average_confidence: number;
  movement_metrics: {
    total_distance: number;
    average_speed: number;
    max_speed: number;
  };
  position_history: Array<{
    timestamp: string;
    camera_id: string;
    bbox: [number, number, number, number];
    map_coords: [number, number];
    confidence: number;
  }>;
}

// ============================================================================
// Playback Control Types
// ============================================================================

export interface PlaybackRequest {
  speed: number;
}

export interface SeekRequest {
  position?: number; // 0.0 to 1.0
  timestamp?: string; // ISO timestamp
}

export interface PlaybackStatus {
  task_id: string;
  has_session: boolean;
  is_playing: boolean;
  playback_speed: number;
  current_position: number;
  current_timestamp: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  can_seek: boolean;
  loop_enabled: boolean;
}

export interface PlaybackConfigRequest {
  start_time: string;
  end_time: string;
  loop_enabled: boolean;
}

// ============================================================================
// Media Content Types
// ============================================================================

export interface OverlayConfig {
  bbox_color: [number, number, number];
  bbox_thickness: number;
  focus_color: [number, number, number];
  show_person_id: boolean;
  show_confidence: boolean;
  overlay_quality: number;
}

// ============================================================================
// Analytics Types (Mock Implementation Ready)
// ============================================================================

export interface RealTimePerformanceMetrics {
  cache_hit_rate?: number;
  memory_usage?: number;
  processing_latency?: number;
  error_rate?: number;
  [key: string]: number | undefined;
}

export interface RealTimeMetrics {
  timestamp: string;
  active_persons: number;
  detection_rate: number;
  average_confidence: number;
  camera_loads: Record<string, number>;
  performance_metrics: RealTimePerformanceMetrics;
}

export interface RealTimeMetricsResponse {
  status: string;
  data: RealTimeMetrics;
  timestamp: string;
}

export interface ActivePersonsResponse {
  active_persons: ActivePerson[];
  total_count: number;
  camera_id: string | null;
  environment_id: string | null;
}

export interface ActivePerson {
  global_id: string;
  current_camera_id: string;
  first_detected_at: string;
  last_seen_at: string;
  confidence_score: number;
  track_duration: number; // seconds
}

export interface CameraLoads {
  cameras: Record<string, number>;
}

export interface SystemStatistics {
  total_processed: number;
  uptime: number;
}

export interface AnalyticsDashboardResponse {
  status: string;
  data: {
    generated_at: string;
    summary: {
      total_detections: number;
      average_confidence_percent: number;
      system_uptime_percent: number;
      uptime_delta_percent: number;
    };
    cameras: Array<{
      camera_id: string;
      detections: number;
      unique_entities: number;
      average_confidence_percent: number;
      uptime_percent: number;
    }>;
    charts: {
      detections_per_bucket: Array<{ timestamp: string; detections: number }>;
      average_confidence_trend: Array<{ timestamp: string; confidence_percent: number }>;
      uptime_trend: Array<{ date: string; uptime_percent: number }>;
    };
  };
}

// ============================================================================
// Export Types
// ============================================================================

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  PDF = 'pdf'
}

export interface ExportAnalyticsReportRequest {
  environment_id: 'campus' | 'factory';
  start_time: string;
  end_time: string;
  format: ExportFormat;
  include_zones?: boolean;
  include_heatmaps?: boolean;
  include_trajectories?: boolean;
  camera_ids?: string[];
}

export interface ExportJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  download_url?: string;
  message: string;
}

export interface ExportJobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0.0-1.0
  created_at: string;
  completed_at?: string;
  download_url?: string;
  file_size?: number;
  error_message?: string;
}

// ============================================================================
// Alert Configuration Types
// ============================================================================

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  channels: string[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack';
  name: string;
  configuration: Record<string, any>;
  enabled: boolean;
}

// ============================================================================
// Environment & Camera Configuration Types
// ============================================================================

export type EnvironmentId = 'campus' | 'factory';

export type CampusCameraId = 'c01' | 'c02' | 'c03' | 'c05';
export type FactoryCameraId = 'c09' | 'c12' | 'c13' | 'c16';
export type BackendCameraId = CampusCameraId | FactoryCameraId;

export type FrontendCameraId = 'camera1' | 'camera2' | 'camera3' | 'camera4';

export interface CameraConfiguration {
  id: BackendCameraId;
  name: string;
  position: [number, number]; // Map coordinates
  resolution: [number, number]; // [width, height]
  field_of_view: number; // degrees
  homography_available: boolean;
}

export interface EnvironmentConfiguration {
  id: EnvironmentId;
  name: string;
  scene_id: string; // s47 for campus, s14 for factory
  cameras: CameraConfiguration[];
  map_bounds: [[number, number], [number, number]]; // [[min_x, min_y], [max_x, max_y]]
  default_zoom: number;
}

// ============================================================================
// Detection Processing Environment Types
// ============================================================================

export interface DetectionProcessingEnvironmentCameraMetadata {
  display_name?: string;
  overlay_asset?: string;
  homography_available?: boolean;
}

export interface DetectionProcessingEnvironment {
  environment_id: EnvironmentId;
  display_name?: string;
  cameras: BackendCameraId[];
  camera_metadata?: Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>;
}

export interface DetectionProcessingEnvironmentsResponse {
  environments: DetectionProcessingEnvironment[];
  updated_at?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  error: string;
  message: string;
  status_code: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// Request/Response Wrappers
// ============================================================================

export interface APIResponse<T = any> {
  data: T;
  status: number | string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// Database Entity Types (Based on TimescaleDB Schema)
// ============================================================================

export interface TrackingEvent {
  id: string;
  global_person_id: string;
  track_id: number;
  camera_id: string;
  environment_id: string;
  position_x: number;
  position_y: number;
  world_x?: number;
  world_y?: number;
  bbox_x1: number;
  bbox_y1: number;
  bbox_x2: number;
  bbox_y2: number;
  detection_confidence: number;
  reid_confidence?: number;
  event_type: 'detection' | 'entry' | 'exit' | 'transition';
  timestamp: string;
}

export interface PersonIdentity {
  global_person_id: string;
  environment_id: string;
  first_seen_at: string;
  last_seen_at: string;
  first_seen_camera: string;
  last_seen_camera: string;
  cameras_seen: string[]; // JSON array
  primary_embedding?: number[]; // JSON array
  total_detections: number;
  total_tracking_time: number; // seconds
}

export interface PersonTrajectory {
  global_person_id: string;
  sequence_number: number;
  position_x: number;
  position_y: number;
  world_x?: number;
  world_y?: number;
  velocity_x?: number;
  velocity_y?: number;
  acceleration_x?: number;
  acceleration_y?: number;
  timestamp: string;
}

// ============================================================================
// Type Guards and Validation Helpers
// ============================================================================

export function isValidEnvironmentId(value: string): value is EnvironmentId {
  return value === 'campus' || value === 'factory';
}

export function isValidTaskStatus(value: string): value is TaskStatus {
  return [
    'QUEUED',
    'INITIALIZING',
    'DOWNLOADING',
    'EXTRACTING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
  ].includes(value);
}

export function isValidWebSocketMessageType(value: string): value is WebSocketMessageType {
  return [
    'connection_established',
    'tracking_update',
    'status_update',
    'system_status',
    'control_message',
    'pong',
    'subscribe_tracking',
    'unsubscribe_tracking',
    'request_status',
    'ping',
  ].includes(value);
}

export function isBackendCameraId(value: string): value is BackendCameraId {
  return ['c01', 'c02', 'c03', 'c05', 'c09', 'c12', 'c13', 'c16'].includes(value);
}

export function isFrontendCameraId(value: string): value is FrontendCameraId {
  return ['camera1', 'camera2', 'camera3', 'camera4'].includes(value);
}

// ============================================================================
// Constants for API Integration
// ============================================================================

export const API_ENDPOINTS = {
  // System
  ROOT: '/',
  HEALTH: '/health',

  // Processing tasks
  START_TASK: '/api/v1/processing-tasks/start',
  TASK_STATUS: (taskId: string) => `/api/v1/processing-tasks/${taskId}/status`,

  // Detection processing tasks
  DETECTION_ENVIRONMENTS: '/api/v1/detection-processing-tasks/environments',

  // Environment management
  ENVIRONMENTS: '/api/v1/environments/',
  ENVIRONMENT_DETAILS: (environmentId: string) => `/api/v1/environments/${environmentId}`,
  ENVIRONMENT_DATE_RANGES: (environmentId: string) => `/api/v1/environments/${environmentId}/date-ranges`,
  ENVIRONMENT_CAMERAS: (environmentId: string) => `/api/v1/environments/${environmentId}/cameras`,
  ENVIRONMENT_ZONES: (environmentId: string) => `/api/v1/environments/${environmentId}/zones`,
  ENVIRONMENT_SESSIONS: (environmentId: string) => `/api/v1/environments/${environmentId}/sessions`,

  // Authentication
  LOGIN: '/api/v1/auth/login',
  USER_INFO: '/api/v1/auth/me',
  PERMISSIONS: '/api/v1/auth/permissions/test',

  // Focus tracking
  SET_FOCUS: (taskId: string) => `/api/v1/focus/${taskId}`,
  GET_FOCUS: (taskId: string) => `/api/v1/focus/${taskId}`,
  CLEAR_FOCUS: (taskId: string) => `/api/v1/focus/${taskId}`,
  UPDATE_HIGHLIGHT_SETTINGS: (taskId: string) => `/api/v1/focus/${taskId}/highlight-settings`,
  PERSON_DETAILS: (globalPersonId: string) => `/api/v1/persons/${globalPersonId}/details`,

  // Playback controls
  PLAYBACK_PAUSE: (taskId: string) => `/api/v1/controls/${taskId}/pause`,
  PLAYBACK_RESUME: (taskId: string) => `/api/v1/controls/${taskId}/resume`,
  PLAYBACK_STATUS: (taskId: string) => `/api/v1/controls/${taskId}/status`,

  // Media content
  CAMERA_FRAME: (taskId: string, cameraId: string) => `/api/v1/media/frames/${taskId}/${cameraId}`,
  PERSON_IMAGE: (globalPersonId: string) => `/api/v1/media/persons/${globalPersonId}/image`,
  OVERLAY_CONFIG: '/api/v1/media/frames/overlay-config',

  // Analytics endpoints
  ANALYTICS_REAL_TIME_METRICS: '/api/v1/analytics/real-time/metrics',
  ANALYTICS_ACTIVE_PERSONS: '/api/v1/analytics/real-time/active-persons',
  ANALYTICS_CAMERA_LOADS: '/api/v1/analytics/real-time/camera-loads',
  ANALYTICS_SYSTEM_STATISTICS: '/api/v1/analytics/system/statistics',

  // Legacy compatibility
  REAL_TIME_METRICS: '/api/v1/analytics/real-time/metrics',
  ACTIVE_PERSONS: '/api/v1/analytics/real-time/active-persons',
  SYSTEM_STATISTICS: '/api/v1/analytics/system/statistics',
  ANALYTICS_DASHBOARD: '/api/v1/analytics/dashboard',
} as const;

export const WEBSOCKET_ENDPOINTS = {
  TRACKING: (taskId: string) => `/ws/tracking/${taskId}`,
  FRAMES: (taskId: string) => `/ws/frames/${taskId}`,
  SYSTEM: '/ws/system',
  FOCUS: (taskId: string) => `/ws/focus/${taskId}`,
  ANALYTICS: (taskId: string) => `/ws/analytics/${taskId}`,
} as const;

// Default configuration values - Using port 3847 (OrbStack backend)
export const DEFAULT_CONFIG = {
  API_BASE_URL: 'http://localhost:3847',
  WS_BASE_URL: 'ws://localhost:3847',
  DETECTION_CONFIDENCE_THRESHOLD: 0.7,
  REID_SIMILARITY_THRESHOLD: 0.65,
  TARGET_FPS: 23,
  FRAME_JPEG_QUALITY: 85,
} as const;
