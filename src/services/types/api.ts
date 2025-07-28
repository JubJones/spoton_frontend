// TODO: BACKEND INTEGRATION REQUIRED
// This file contains mock API type definitions. 
// Once backend is available, update these types to match actual API responses.
// See PLANNING.md for backend integration requirements.

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface TimestampedEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Environment & Configuration Types
export interface Environment extends TimestampedEntity {
  name: string;
  description: string;
  isActive: boolean;
  cameraCount: number;
  coordinateSystem: string;
  mapBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface CameraConfig extends TimestampedEntity {
  environmentId: string;
  cameraId: string;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  fieldOfView: number;
  isActive: boolean;
  calibrationMatrix: number[][];
  distortionCoefficients: number[];
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
}

// Detection Types
export interface DetectionResult extends TimestampedEntity {
  frameId: string;
  cameraId: string;
  frameIndex: number;
  timestamp: string;
  detections: PersonDetection[];
  processingTime: number;
  confidence: number;
}

export interface PersonDetection {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  attributes: {
    age?: number;
    gender?: string;
    clothing?: string[];
    pose?: string;
  };
  features: number[]; // Feature vector for re-identification
}

export interface DetectionStatistics {
  totalDetections: number;
  averageConfidence: number;
  detectionRate: number;
  falsePositiveRate: number;
  performanceMetrics: {
    averageProcessingTime: number;
    framesPerSecond: number;
    lastUpdated: string;
  };
}

// Tracking Types
export interface TrackingResult extends TimestampedEntity {
  personId: string;
  globalId: string;
  cameraTransitions: CameraTransition[];
  trajectory: TrajectoryPoint[];
  status: 'active' | 'lost' | 'completed';
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  totalDuration: number;
}

export interface CameraTransition {
  id: string;
  fromCameraId: string;
  toCameraId: string;
  timestamp: string;
  confidence: number;
  transitionType: 'direct' | 'inferred' | 'predicted';
  duration: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: string;
  cameraId: string;
  confidence: number;
  coordinateSystem: 'camera' | 'world';
}

export interface TrackingStatistics {
  totalTracks: number;
  activeTracks: number;
  completedTracks: number;
  averageTrackDuration: number;
  reidentificationAccuracy: number;
  cameraTransitions: number;
  lastUpdated: string;
}

// Mapping Types
export interface SpatialMapping extends TimestampedEntity {
  environmentId: string;
  coordinateSystem: string;
  transformationMatrix: number[][];
  cameraPositions: CameraPosition[];
  trajectoryPaths: SpatialTrajectory[];
  lastSynchronized: string;
}

export interface CameraPosition {
  cameraId: string;
  worldPosition: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  fieldOfView: number;
  viewingArea: {
    points: Array<{ x: number; y: number }>;
  };
}

export interface SpatialTrajectory {
  personId: string;
  globalId: string;
  path: Array<{
    x: number;
    y: number;
    timestamp: string;
    cameraId: string;
    confidence: number;
  }>;
  totalDistance: number;
  averageSpeed: number;
  dwellTime: number;
  startTime: string;
  endTime: string;
}

export interface MappingStatistics {
  totalTrajectories: number;
  averageTrajectoryLength: number;
  spatialCoverage: number;
  coordinateAccuracy: number;
  lastSynchronized: string;
}

// Request Types
export interface DetectionRequest {
  cameraIds?: string[];
  startTime?: string;
  endTime?: string;
  minConfidence?: number;
  includeAttributes?: boolean;
  includeFeatures?: boolean;
}

export interface TrackingRequest {
  personIds?: string[];
  globalIds?: string[];
  cameraIds?: string[];
  startTime?: string;
  endTime?: string;
  minConfidence?: number;
  includeTrajectory?: boolean;
  includeTransitions?: boolean;
}

export interface MappingRequest {
  environmentId: string;
  coordinateSystem?: string;
  includeTrajectories?: boolean;
  includeCameraPositions?: boolean;
  startTime?: string;
  endTime?: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: any;
}

export interface DetectionMessage extends WebSocketMessage {
  type: 'detection_update';
  data: DetectionResult;
}

export interface TrackingMessage extends WebSocketMessage {
  type: 'tracking_update';
  data: TrackingResult;
}

export interface MappingMessage extends WebSocketMessage {
  type: 'mapping_update';
  data: SpatialMapping;
}

export interface SystemStatusMessage extends WebSocketMessage {
  type: 'system_status';
  data: {
    camerasActive: number;
    processingFps: number;
    memoryUsage: number;
    gpuUtilization: number;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
    lastUpdated: string;
  };
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  fieldErrors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface NotFoundError extends ApiError {
  code: 'NOT_FOUND';
  resource: string;
  identifier: string;
}

export interface ConflictError extends ApiError {
  code: 'CONFLICT';
  conflictingResource: string;
  conflictingValue: string;
}

// Filter and Query Types
export interface DateRange {
  start: string;
  end: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  dateRange?: DateRange;
  cameraIds?: string[];
  confidence?: {
    min: number;
    max: number;
  };
  isActive?: boolean;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: SortOptions;
  filters?: FilterOptions;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    lastCheck: string;
  }>;
  version: string;
  uptime: number;
}

// Configuration Types
export interface ApiConfiguration {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  apiVersion: string;
  enableMocks: boolean;
  mockDataPath: string;
}

export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  wsUrl: string;
  enableLogging: boolean;
  enableMocks: boolean;
  mockDelay: number;
}

// Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
  meta?: {
    version: string;
    requestId: string;
    processingTime: number;
  };
}