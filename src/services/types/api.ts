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

// Analytics Types
export interface AnalyticsData {
  totalDetections: number;
  activeDetections: number;
  averageConfidence: number;
  detectionRate: number;
  falsePositiveRate: number;
  trackingAccuracy: number;
  systemPerformance: {
    fps: number;
    latency: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  timeSeriesData: TimeSeriesDataPoint[];
  heatmapData: HeatmapPoint[];
  cameraAnalytics: CameraAnalytics[];
  timestamp: string;
}

export interface TimeSeriesDataPoint {
  timestamp: number;
  detections: number;
  confidence: number;
  fps: number;
  tracking: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  detectionCount: number;
  dwellTime: number;
}

export interface CameraAnalytics {
  cameraId: string;
  cameraName: string;
  detectionCount: number;
  averageConfidence: number;
  fps: number;
  uptime: number;
  errorRate: number;
  lastActivity: string;
  performance: {
    processingTime: number;
    memoryUsage: number;
    temperature: number;
  };
}

export interface AnalyticsTimeRange {
  startTime: number;
  endTime: number;
  interval?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface AnalyticsFilter {
  cameraIds?: string[];
  personIds?: string[];
  confidenceThreshold?: number;
  dateRange?: AnalyticsTimeRange;
  eventTypes?: string[];
  zones?: string[];
}

export interface HistoricalData {
  timeRange: AnalyticsTimeRange;
  detectionTrends: TrendData[];
  trackingTrends: TrendData[];
  performanceTrends: TrendData[];
  alerts: AlertData[];
  summary: {
    totalDetections: number;
    uniquePersons: number;
    averageConfidence: number;
    peakHours: string[];
    mostActiveCamera: string;
  };
}

export interface TrendData {
  timestamp: number;
  value: number;
  metric: string;
  change: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface AlertData {
  id: string;
  type: 'performance' | 'security' | 'system' | 'detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  source: string;
  isAcknowledged: boolean;
}

export interface PerformanceMetrics {
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
    uptime: number;
  };
  application: {
    fps: number;
    latency: number;
    processingTime: number;
    errorRate: number;
    throughput: number;
  };
  cameras: CameraPerformance[];
  timestamp: string;
}

export interface CameraPerformance {
  cameraId: string;
  fps: number;
  latency: number;
  processingTime: number;
  errorRate: number;
  temperature: number;
  memoryUsage: number;
  uptime: number;
  lastFrameTime: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    database: ComponentHealth;
    webSocket: ComponentHealth;
    fileSystem: ComponentHealth;
    cameras: ComponentHealth;
    ai: ComponentHealth;
    tracking: ComponentHealth;
  };
  alerts: AlertData[];
  uptime: number;
  lastCheck: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  lastCheck: string;
  message?: string;
}

export interface PersonJourney {
  personId: string;
  globalId: string;
  startTime: string;
  endTime: string;
  totalDuration: number;
  cameraSequence: CameraVisit[];
  trajectory: TrajectoryPoint[];
  behaviorAnalysis: {
    averageSpeed: number;
    dwellTimes: DwellTime[];
    routePattern: string;
    anomalies: string[];
  };
  statistics: {
    totalDistance: number;
    averageConfidence: number;
    reidentificationAccuracy: number;
    cameraTransitions: number;
  };
}

export interface CameraVisit {
  cameraId: string;
  cameraName: string;
  entryTime: string;
  exitTime: string;
  duration: number;
  confidence: number;
  detectionCount: number;
}

export interface DwellTime {
  zone: string;
  duration: number;
  startTime: string;
  endTime: string;
  behavior: string;
}

export interface BehavioralAnalytics {
  dwellTimeAnalysis: DwellTimeAnalysis;
  routePatterns: RoutePattern[];
  anomalies: BehaviorAnomaly[];
  crowdAnalysis: CrowdAnalysis;
  timePatterns: TimePattern[];
  spatialAnalysis: SpatialAnalysis;
}

export interface DwellTimeAnalysis {
  averageDwellTime: number;
  dwellTimeDistribution: {
    zone: string;
    averageTime: number;
    medianTime: number;
    maxTime: number;
    visitorCount: number;
  }[];
  heatmap: HeatmapPoint[];
  trends: TrendData[];
}

export interface RoutePattern {
  id: string;
  path: string[];
  frequency: number;
  averageDuration: number;
  commonTimes: string[];
  userCount: number;
}

export interface BehaviorAnomaly {
  id: string;
  type: 'speed' | 'route' | 'dwell' | 'crowd' | 'security';
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
  location: string;
  confidence: number;
  personId?: string;
}

export interface CrowdAnalysis {
  currentCount: number;
  peakCount: number;
  averageCount: number;
  density: number;
  distribution: {
    zone: string;
    count: number;
    density: number;
  }[];
  trends: TrendData[];
}

export interface TimePattern {
  period: 'hour' | 'day' | 'week' | 'month';
  peak: string;
  low: string;
  averageActivity: number;
  patterns: {
    time: string;
    activity: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
}

export interface SpatialAnalysis {
  hotspots: HotspotData[];
  pathAnalysis: PathAnalysis[];
  zoneUtilization: ZoneUtilization[];
  flowAnalysis: FlowAnalysis;
}

export interface HotspotData {
  zone: string;
  intensity: number;
  duration: number;
  visitorCount: number;
  peakTime: string;
}

export interface PathAnalysis {
  pathId: string;
  frequency: number;
  averageSpeed: number;
  congestionLevel: number;
  alternativeRoutes: string[];
}

export interface ZoneUtilization {
  zone: string;
  utilizationRate: number;
  capacity: number;
  currentOccupancy: number;
  averageVisitDuration: number;
}

export interface FlowAnalysis {
  entryPoints: FlowPoint[];
  exitPoints: FlowPoint[];
  bottlenecks: FlowPoint[];
  flowRate: number;
  peakFlowTime: string;
}

export interface FlowPoint {
  location: string;
  count: number;
  rate: number;
  peakTime: string;
}

export interface TrafficPattern {
  id: string;
  name: string;
  timeRange: AnalyticsTimeRange;
  pattern: {
    hour: number;
    count: number;
    avgSpeed: number;
    congestion: number;
  }[];
  peakHours: string[];
  trends: TrendData[];
}

export interface HeatmapData {
  timeRange: AnalyticsTimeRange;
  resolution: {
    width: number;
    height: number;
  };
  data: HeatmapPoint[];
  maxIntensity: number;
  totalDetections: number;
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