// UI State and Component Types
// src/types/ui.ts

import { BackendCameraId, FrontendCameraId, EnvironmentId, TrackedPerson } from './api';

// ============================================================================
// UI State Types
// ============================================================================

export interface AppState {
  // Current environment and session
  currentEnvironment?: EnvironmentId;
  currentTaskId?: string;

  // UI state
  isLoading: boolean;
  error?: string;

  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Selected date/time range
  dateTimeRange?: {
    startDate: Date;
    endDate: Date;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  };
}

export interface TrackingState {
  // Current frame data
  currentFrameIndex: number;
  totalFrames: number;

  // Real-time tracking data
  latestTrackingUpdate?: {
    global_frame_index: number;
    scene_id: EnvironmentId;
    timestamp: string;
    cameras: Record<BackendCameraId, CameraTrackingDisplayData>;
  };

  // Playback state
  isPlaying: boolean;
  playbackSpeed: number; // 0.5x, 1x, 2x, 4x

  // Focus track feature
  focusedPersonId?: string; // global_person_id
  selectedPersons: Set<string>; // Set of global_person_ids

  // Historical data
  personTrajectories: Record<string, PersonTrajectoryData>; // global_person_id -> trajectory

  // Performance metrics
  fps: number;
  latency: number; // ms
}

export interface UIControlState {
  // View modes
  viewMode: 'multi-camera' | 'single-camera' | 'map-only';
  selectedCamera?: FrontendCameraId;

  // Display options
  showBoundingBoxes: boolean;
  showPersonIds: boolean;
  showConfidenceScores: boolean;
  showTrajectories: boolean;

  // Map display options
  mapZoomLevel: number;
  mapCenter: [number, number];
  showCameraFOV: boolean;

  // Panel states
  isAnalyticsPanelOpen: boolean;
  isSettingsPanelOpen: boolean;
  isPersonDetailPanelOpen: boolean;

  // Responsive UI
  isMobile: boolean;
  isTablet: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
}

// ============================================================================
// Component-Specific Types
// ============================================================================

export interface CameraTrackingDisplayData {
  cameraId: BackendCameraId;
  frameImageUrl?: string; // Base64 data URL or regular URL
  tracks: TrackedPersonDisplay[];
  isActive: boolean;
  lastUpdated: string;

  // Camera metadata
  resolution: [number, number];
  displaySize: [number, number];
  scaleFactor: [number, number]; // [scaleX, scaleY] for coordinate transformation
}

export interface TrackedPersonDisplay extends TrackedPerson {
  // Additional display properties
  displayBbox: [number, number, number, number]; // Scaled for display
  isSelected: boolean;
  isFocused: boolean;
  isHighlighted: boolean;

  // Visual properties
  color: string; // Hex color for consistent identification
  label: string; // Display label (e.g., "P1", "Person 23")

  // Computed properties
  center: [number, number]; // Center point of bounding box
  croppedImageUrl?: string; // Cropped person image

  // Tracking metadata
  firstSeenAt?: string;
  trackingDuration?: number; // seconds
  lastSeenCamera?: string;
}

export interface PersonTrajectoryData {
  globalPersonId: string;
  points: TrajectoryPoint[];
  color: string;
  isVisible: boolean;
  totalDistance: number; // meters
  averageSpeed: number; // m/s
  lastUpdated: string;
}

export interface TrajectoryPoint {
  position: [number, number]; // Map coordinates
  timestamp: string;
  cameraId: BackendCameraId;
  confidence: number;
}

// ============================================================================
// Input and Form Types
// ============================================================================

export interface EnvironmentSelectionForm {
  environmentId: EnvironmentId;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  timeRange: {
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
  selectedCameras: FrontendCameraId[];
}

export interface PlaybackControlState {
  isPlaying: boolean;
  currentTime: number; // seconds from start
  duration: number; // total seconds
  playbackRate: number;
  volume: number; // 0-1
  isMuted: boolean;

  // Seeking
  isSeekingActive: boolean;
  seekPosition: number; // 0-1 (percentage)
}

export interface PersonDetailData {
  globalPersonId: string;

  // Basic info
  currentStatus: 'active' | 'inactive' | 'lost';
  firstDetectedAt: string;
  lastSeenAt: string;
  trackingDuration: number; // seconds

  // Current position
  currentCameraId?: BackendCameraId;
  currentPosition?: [number, number];
  currentMapCoords?: [number, number];

  // Movement analysis
  totalDistance: number; // meters
  averageSpeed: number; // m/s
  visitedCameras: BackendCameraId[];

  // Confidence metrics
  averageDetectionConfidence: number;
  averageReIdConfidence: number;
  trackingReliability: 'high' | 'medium' | 'low';

  // Visual data
  thumbnailImages: PersonThumbnail[];
  mainImage?: string; // Best quality image URL
}

export interface PersonThumbnail {
  imageUrl: string;
  timestamp: string;
  cameraId: BackendCameraId;
  confidence: number;
  quality: 'high' | 'medium' | 'low';
}

// ============================================================================
// Event and Interaction Types
// ============================================================================

export interface CameraViewInteractionEvent {
  type: 'person_click' | 'bbox_click' | 'background_click' | 'zoom' | 'pan';
  cameraId: FrontendCameraId;
  position: [number, number]; // Click position in display coordinates
  personId?: string; // If person-related interaction
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
}

export interface MapInteractionEvent {
  type: 'person_click' | 'camera_click' | 'area_select' | 'zoom' | 'pan';
  position: [number, number]; // Map coordinates
  personId?: string;
  cameraId?: BackendCameraId;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
}

export interface TimelineInteractionEvent {
  type: 'seek' | 'play' | 'pause' | 'speed_change' | 'bookmark';
  timestamp: number; // seconds from start
  value?: number; // For speed changes, etc.
}

// ============================================================================
// Configuration and Settings Types
// ============================================================================

export interface UserSettings {
  // Display preferences
  theme: 'light' | 'dark' | 'auto';
  language: string; // ISO language code

  // Tracking display settings
  boundingBoxStyle: 'solid' | 'dashed' | 'dotted';
  personLabelFormat: 'id_only' | 'id_with_confidence' | 'custom';
  trajectoryLineWidth: number;

  // Performance settings
  maxTrajectoryPoints: number;
  updateInterval: number; // ms
  enableGPUAcceleration: boolean;

  // Notification settings
  enableSoundAlerts: boolean;
  showDesktopNotifications: boolean;
  alertThresholds: {
    highOccupancy: number;
    lowConfidence: number;
    connectionLoss: number; // seconds
  };

  // Privacy settings
  blurFaces: boolean;
  anonymizeData: boolean;
  dataRetentionDays: number;
}

export interface SystemConfiguration {
  // API settings
  apiBaseUrl: string;
  websocketUrl: string;
  authEnabled: boolean;

  // Performance settings
  maxConcurrentConnections: number;
  bufferSize: number;
  compressionEnabled: boolean;

  // Camera settings
  defaultResolution: [number, number];
  defaultFPS: number;
  qualitySettings: 'high' | 'medium' | 'low' | 'auto';

  // Map settings
  mapProvider: 'leaflet' | 'mapbox' | 'google';
  mapStyle: string;
  enableClustering: boolean;
  clusterRadius: number;
}

// ============================================================================
// Analytics and Metrics Types
// ============================================================================

export interface AnalyticsDashboardData {
  // Real-time metrics
  currentOccupancy: number;
  peakOccupancyToday: number;
  averageOccupancy: number;

  // Detection metrics
  totalDetectionsToday: number;
  detectionRate: number; // per hour
  falsePositiveRate: number;

  // Performance metrics
  systemUptime: number; // percentage
  averageLatency: number; // ms
  errorRate: number; // percentage

  // Camera-specific data
  cameraMetrics: Record<BackendCameraId, CameraAnalytics>;

  // Time-series data for charts
  occupancyTimeSeries: TimeSeriesPoint[];
  detectionTimeSeries: TimeSeriesPoint[];
  performanceTimeSeries: TimeSeriesPoint[];
}

export interface CameraAnalytics {
  cameraId: BackendCameraId;
  isActive: boolean;
  uptime: number; // percentage
  detectionCount: number;
  averageConfidence: number;
  processingLatency: number; // ms
  errorCount: number;
  lastErrorTime?: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

// ============================================================================
// Utility and Helper Types
// ============================================================================

export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number; // 0.0-1.0 (matching backend format)
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorCode?: string;
  canRetry: boolean;
  retryAction?: () => void;
}

// ============================================================================
// Type Guards and Validation
// ============================================================================

export function isValidFrontendCameraId(value: string): value is FrontendCameraId {
  return ['camera1', 'camera2', 'camera3', 'camera4'].includes(value);
}

export function isValidViewMode(value: string): value is UIControlState['viewMode'] {
  return ['multi-camera', 'single-camera', 'map-only'].includes(value);
}

export function isValidTheme(value: string): value is UserSettings['theme'] {
  return ['light', 'dark', 'auto'].includes(value);
}

export function isValidScreenSize(value: string): value is UIControlState['screenSize'] {
  return ['mobile', 'tablet', 'desktop'].includes(value);
}

// ============================================================================
// Default Values and Constants
// ============================================================================

export const DEFAULT_UI_STATE: UIControlState = {
  viewMode: 'multi-camera',
  showBoundingBoxes: true,
  showPersonIds: true,
  showConfidenceScores: false,
  showTrajectories: false,
  mapZoomLevel: 10,
  mapCenter: [0, 0],
  showCameraFOV: true,
  isAnalyticsPanelOpen: false,
  isSettingsPanelOpen: false,
  isPersonDetailPanelOpen: false,
  isMobile: false,
  isTablet: false,
  screenSize: 'desktop',
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'auto',
  language: 'en',
  boundingBoxStyle: 'solid',
  personLabelFormat: 'id_with_confidence',
  trajectoryLineWidth: 2,
  maxTrajectoryPoints: 100,
  updateInterval: 100,
  enableGPUAcceleration: true,
  enableSoundAlerts: false,
  showDesktopNotifications: true,
  alertThresholds: {
    highOccupancy: 50,
    lowConfidence: 0.3,
    connectionLoss: 5,
  },
  blurFaces: false,
  anonymizeData: false,
  dataRetentionDays: 30,
};

// Color palette for person identification
export const PERSON_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#85C1E9',
  '#D2B4DE',
] as const;

export const UI_BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
} as const;
