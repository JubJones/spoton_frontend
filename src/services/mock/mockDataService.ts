// TODO: BACKEND INTEGRATION REQUIRED
// This file provides mock data for development purposes.
// Once backend is available, remove this file and update all imports to use actual API services.
// See PLANNING.md for backend integration requirements.

import { 
  Environment, 
  CameraConfig, 
  DetectionResult, 
  TrackingResult, 
  SpatialMapping,
  PersonDetection,
  CameraTransition,
  TrajectoryPoint,
  DetectionStatistics,
  TrackingStatistics,
  MappingStatistics,
  HealthCheckResponse,
  PaginatedResponse,
  AnalyticsData,
  AnalyticsTimeRange,
  AnalyticsFilter,
  HistoricalData,
  PerformanceMetrics,
  SystemHealth,
  PersonJourney,
  BehavioralAnalytics,
  DwellTimeAnalysis,
  TrafficPattern,
  HeatmapData,
  ApiResponse
} from '../types/api';

// Mock delay to simulate network latency
const MOCK_DELAY = 300; // milliseconds

const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Generate random ID
const generateId = (): string => 
  Math.random().toString(36).substr(2, 9);

// Generate timestamp
const generateTimestamp = (): string => 
  new Date().toISOString();

// Mock Environment Data
export const mockEnvironments: Environment[] = [
  {
    id: 'env-1',
    name: 'Office Building A',
    description: 'Main office building with 4 cameras',
    isActive: true,
    cameraCount: 4,
    coordinateSystem: 'cartesian',
    mapBounds: {
      minX: -50,
      minY: -30,
      maxX: 50,
      maxY: 30
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'env-2',
    name: 'Retail Store B',
    description: 'Retail store with 6 cameras',
    isActive: true,
    cameraCount: 6,
    coordinateSystem: 'cartesian',
    mapBounds: {
      minX: -40,
      minY: -25,
      maxX: 40,
      maxY: 25
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock Camera Data
export const mockCameras: CameraConfig[] = [
  {
    id: 'cam-1',
    environmentId: 'env-1',
    cameraId: 'camera_1',
    name: 'Entrance Camera',
    position: { x: -20, y: 0, z: 3 },
    rotation: { pitch: -10, yaw: 0, roll: 0 },
    fieldOfView: 60,
    isActive: true,
    calibrationMatrix: [
      [800, 0, 320],
      [0, 800, 240],
      [0, 0, 1]
    ],
    distortionCoefficients: [0.1, -0.2, 0.01, -0.01],
    resolution: { width: 640, height: 480 },
    frameRate: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cam-2',
    environmentId: 'env-1',
    cameraId: 'camera_2',
    name: 'Lobby Camera',
    position: { x: 0, y: 0, z: 3 },
    rotation: { pitch: -15, yaw: 90, roll: 0 },
    fieldOfView: 70,
    isActive: true,
    calibrationMatrix: [
      [800, 0, 320],
      [0, 800, 240],
      [0, 0, 1]
    ],
    distortionCoefficients: [0.1, -0.2, 0.01, -0.01],
    resolution: { width: 640, height: 480 },
    frameRate: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cam-3',
    environmentId: 'env-1',
    cameraId: 'camera_3',
    name: 'Hallway Camera',
    position: { x: 20, y: 0, z: 3 },
    rotation: { pitch: -10, yaw: 180, roll: 0 },
    fieldOfView: 65,
    isActive: true,
    calibrationMatrix: [
      [800, 0, 320],
      [0, 800, 240],
      [0, 0, 1]
    ],
    distortionCoefficients: [0.1, -0.2, 0.01, -0.01],
    resolution: { width: 640, height: 480 },
    frameRate: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cam-4',
    environmentId: 'env-1',
    cameraId: 'camera_4',
    name: 'Exit Camera',
    position: { x: 0, y: 20, z: 3 },
    rotation: { pitch: -10, yaw: 270, roll: 0 },
    fieldOfView: 60,
    isActive: true,
    calibrationMatrix: [
      [800, 0, 320],
      [0, 800, 240],
      [0, 0, 1]
    ],
    distortionCoefficients: [0.1, -0.2, 0.01, -0.01],
    resolution: { width: 640, height: 480 },
    frameRate: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Generate mock detection data
export const generateMockDetection = (cameraId: string, frameIndex: number): DetectionResult => {
  const detectionCount = Math.floor(Math.random() * 3) + 1; // 1-3 detections
  const detections: PersonDetection[] = [];

  for (let i = 0; i < detectionCount; i++) {
    detections.push({
      id: generateId(),
      boundingBox: {
        x: Math.floor(Math.random() * 400) + 50,
        y: Math.floor(Math.random() * 200) + 50,
        width: Math.floor(Math.random() * 100) + 80,
        height: Math.floor(Math.random() * 120) + 160
      },
      confidence: 0.7 + Math.random() * 0.3,
      attributes: {
        age: Math.floor(Math.random() * 50) + 20,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        clothing: ['shirt', 'pants', 'shoes'],
        pose: 'standing'
      },
      features: Array.from({ length: 128 }, () => Math.random())
    });
  }

  return {
    id: generateId(),
    frameId: `frame-${frameIndex}`,
    cameraId,
    frameIndex,
    timestamp: generateTimestamp(),
    detections,
    processingTime: 50 + Math.random() * 100,
    confidence: detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length,
    createdAt: generateTimestamp(),
    updatedAt: generateTimestamp()
  };
};

// Generate mock tracking data
export const generateMockTracking = (personId: string): TrackingResult => {
  const trajectoryLength = Math.floor(Math.random() * 10) + 5;
  const trajectory: TrajectoryPoint[] = [];
  const transitions: CameraTransition[] = [];

  let currentCamera = 'camera_1';
  let currentX = Math.random() * 40 - 20;
  let currentY = Math.random() * 40 - 20;

  for (let i = 0; i < trajectoryLength; i++) {
    trajectory.push({
      x: currentX + (Math.random() - 0.5) * 4,
      y: currentY + (Math.random() - 0.5) * 4,
      timestamp: new Date(Date.now() - (trajectoryLength - i) * 1000).toISOString(),
      cameraId: currentCamera,
      confidence: 0.8 + Math.random() * 0.2,
      coordinateSystem: 'world'
    });

    // Random camera transition
    if (Math.random() < 0.3 && i > 0) {
      const newCamera = `camera_${Math.floor(Math.random() * 4) + 1}`;
      if (newCamera !== currentCamera) {
        transitions.push({
          id: generateId(),
          fromCameraId: currentCamera,
          toCameraId: newCamera,
          timestamp: new Date(Date.now() - (trajectoryLength - i) * 1000).toISOString(),
          confidence: 0.7 + Math.random() * 0.3,
          transitionType: 'direct',
          duration: 2000 + Math.random() * 3000
        });
        currentCamera = newCamera;
      }
    }
  }

  return {
    id: generateId(),
    personId,
    globalId: `global-${personId}`,
    cameraTransitions: transitions,
    trajectory,
    status: Math.random() > 0.7 ? 'active' : 'completed',
    confidence: 0.8 + Math.random() * 0.2,
    firstSeen: trajectory[0]?.timestamp || generateTimestamp(),
    lastSeen: trajectory[trajectory.length - 1]?.timestamp || generateTimestamp(),
    totalDuration: trajectoryLength * 1000,
    createdAt: generateTimestamp(),
    updatedAt: generateTimestamp()
  };
};

// Generate mock mapping data
export const generateMockMapping = (): SpatialMapping => {
  return {
    id: generateId(),
    environmentId: 'env-1',
    coordinateSystem: 'cartesian',
    transformationMatrix: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ],
    cameraPositions: mockCameras.map(cam => ({
      cameraId: cam.cameraId,
      worldPosition: cam.position,
      orientation: cam.rotation,
      fieldOfView: cam.fieldOfView,
      viewingArea: {
        points: [
          { x: cam.position.x - 10, y: cam.position.y - 10 },
          { x: cam.position.x + 10, y: cam.position.y - 10 },
          { x: cam.position.x + 10, y: cam.position.y + 10 },
          { x: cam.position.x - 10, y: cam.position.y + 10 }
        ]
      }
    })),
    trajectoryPaths: Array.from({ length: 5 }, (_, i) => ({
      personId: `person-${i + 1}`,
      globalId: `global-${i + 1}`,
      path: Array.from({ length: 10 }, (_, j) => ({
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 40,
        timestamp: new Date(Date.now() - (10 - j) * 2000).toISOString(),
        cameraId: `camera_${(j % 4) + 1}`,
        confidence: 0.8 + Math.random() * 0.2
      })),
      totalDistance: 50 + Math.random() * 100,
      averageSpeed: 1.2 + Math.random() * 0.8,
      dwellTime: 5000 + Math.random() * 10000,
      startTime: new Date(Date.now() - 20000).toISOString(),
      endTime: generateTimestamp()
    })),
    lastSynchronized: generateTimestamp(),
    createdAt: generateTimestamp(),
    updatedAt: generateTimestamp()
  };
};

// Mock statistics
export const mockDetectionStats: DetectionStatistics = {
  totalDetections: 1234,
  averageConfidence: 0.85,
  detectionRate: 0.92,
  falsePositiveRate: 0.08,
  performanceMetrics: {
    averageProcessingTime: 75,
    framesPerSecond: 28.5,
    lastUpdated: generateTimestamp()
  }
};

export const mockTrackingStats: TrackingStatistics = {
  totalTracks: 567,
  activeTracks: 12,
  completedTracks: 555,
  averageTrackDuration: 45000,
  reidentificationAccuracy: 0.89,
  cameraTransitions: 234,
  lastUpdated: generateTimestamp()
};

export const mockMappingStats: MappingStatistics = {
  totalTrajectories: 456,
  averageTrajectoryLength: 25.6,
  spatialCoverage: 0.78,
  coordinateAccuracy: 0.95,
  lastSynchronized: generateTimestamp()
};

// Mock health check
export const mockHealthCheck: HealthCheckResponse = {
  status: 'healthy',
  timestamp: generateTimestamp(),
  services: [
    {
      name: 'Detection Service',
      status: 'up',
      responseTime: 45,
      lastCheck: generateTimestamp()
    },
    {
      name: 'Tracking Service',
      status: 'up',
      responseTime: 32,
      lastCheck: generateTimestamp()
    },
    {
      name: 'Mapping Service',
      status: 'up',
      responseTime: 28,
      lastCheck: generateTimestamp()
    },
    {
      name: 'Database',
      status: 'up',
      responseTime: 12,
      lastCheck: generateTimestamp()
    }
  ],
  version: '1.0.0-mock',
  uptime: 86400000
};

// Mock Data Service Class
export class MockDataService {
  // Environment methods
  async getEnvironments(): Promise<Environment[]> {
    await delay(MOCK_DELAY);
    return mockEnvironments;
  }

  async getEnvironment(id: string): Promise<Environment | null> {
    await delay(MOCK_DELAY);
    return mockEnvironments.find(env => env.id === id) || null;
  }

  // Camera methods
  async getCameras(environmentId?: string): Promise<CameraConfig[]> {
    await delay(MOCK_DELAY);
    return environmentId 
      ? mockCameras.filter(cam => cam.environmentId === environmentId)
      : mockCameras;
  }

  async getCamera(id: string): Promise<CameraConfig | null> {
    await delay(MOCK_DELAY);
    return mockCameras.find(cam => cam.id === id) || null;
  }

  // Detection methods
  async getDetections(cameraId?: string, limit: number = 10): Promise<PaginatedResponse<DetectionResult>> {
    await delay(MOCK_DELAY);
    const detections = Array.from({ length: limit }, (_, i) => 
      generateMockDetection(cameraId || 'camera_1', i + 1)
    );

    return {
      data: detections,
      pagination: {
        page: 1,
        pageSize: limit,
        totalCount: 1000,
        totalPages: Math.ceil(1000 / limit),
        hasNext: true,
        hasPrevious: false
      }
    };
  }

  async getDetectionStats(): Promise<DetectionStatistics> {
    await delay(MOCK_DELAY);
    return mockDetectionStats;
  }

  // Tracking methods
  async getTrackingResults(personId?: string, limit: number = 10): Promise<PaginatedResponse<TrackingResult>> {
    await delay(MOCK_DELAY);
    const tracks = Array.from({ length: limit }, (_, i) => 
      generateMockTracking(personId || `person-${i + 1}`)
    );

    return {
      data: tracks,
      pagination: {
        page: 1,
        pageSize: limit,
        totalCount: 500,
        totalPages: Math.ceil(500 / limit),
        hasNext: true,
        hasPrevious: false
      }
    };
  }

  async getTrackingStats(): Promise<TrackingStatistics> {
    await delay(MOCK_DELAY);
    return mockTrackingStats;
  }

  // Mapping methods
  async getSpatialMapping(environmentId: string): Promise<SpatialMapping> {
    await delay(MOCK_DELAY);
    return generateMockMapping();
  }

  async getMappingStats(): Promise<MappingStatistics> {
    await delay(MOCK_DELAY);
    return mockMappingStats;
  }

  // Health check
  async getHealthCheck(): Promise<HealthCheckResponse> {
    await delay(MOCK_DELAY);
    return mockHealthCheck;
  }

  // Analytics methods
  async getRealTimeAnalytics(filters?: AnalyticsFilter): Promise<AnalyticsData> {
    await delay(MOCK_DELAY);
    return this.generateRealTimeAnalytics(filters);
  }

  async getHistoricalAnalytics(timeRange: AnalyticsTimeRange, filters?: AnalyticsFilter): Promise<HistoricalData> {
    await delay(MOCK_DELAY);
    return this.generateHistoricalAnalytics(timeRange, filters);
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    await delay(MOCK_DELAY);
    return this.generatePerformanceMetrics();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    await delay(MOCK_DELAY);
    return this.generateSystemHealth();
  }

  async getPersonJourney(personId: string, timeRange?: AnalyticsTimeRange): Promise<PersonJourney> {
    await delay(MOCK_DELAY);
    return this.generatePersonJourney(personId, timeRange);
  }

  async getBehavioralAnalytics(filters?: AnalyticsFilter): Promise<BehavioralAnalytics> {
    await delay(MOCK_DELAY);
    return this.generateBehavioralAnalytics(filters);
  }

  async getDwellTimeAnalysis(filters?: AnalyticsFilter): Promise<DwellTimeAnalysis> {
    await delay(MOCK_DELAY);
    return this.generateDwellTimeAnalysis(filters);
  }

  async getTrafficPatterns(timeRange: AnalyticsTimeRange, filters?: AnalyticsFilter): Promise<TrafficPattern[]> {
    await delay(MOCK_DELAY);
    return this.generateTrafficPatterns(timeRange, filters);
  }

  async getHeatmapData(timeRange: AnalyticsTimeRange, filters?: AnalyticsFilter): Promise<HeatmapData> {
    await delay(MOCK_DELAY);
    return this.generateHeatmapData(timeRange, filters);
  }

  async exportAnalytics(format: 'csv' | 'json' | 'pdf', filters?: AnalyticsFilter, timeRange?: AnalyticsTimeRange): Promise<Blob> {
    await delay(MOCK_DELAY);
    return this.generateExportData(format, filters, timeRange);
  }

  async generateAnalyticsReport(
    reportType: 'summary' | 'detailed' | 'performance' | 'security',
    filters?: AnalyticsFilter,
    timeRange?: AnalyticsTimeRange
  ): Promise<ApiResponse<any>> {
    await delay(MOCK_DELAY);
    return this.generateMockReport(reportType, filters, timeRange);
  }

  // Analytics data generators
  private generateRealTimeAnalytics(filters?: AnalyticsFilter): AnalyticsData {
    const now = Date.now();
    return {
      totalDetections: Math.floor(Math.random() * 1000) + 500,
      activeDetections: Math.floor(Math.random() * 50) + 10,
      averageConfidence: 0.7 + Math.random() * 0.3,
      detectionRate: Math.random() * 10 + 5,
      falsePositiveRate: Math.random() * 0.1,
      trackingAccuracy: 0.85 + Math.random() * 0.15,
      systemPerformance: {
        fps: 25 + Math.random() * 10,
        latency: Math.random() * 100 + 50,
        memoryUsage: Math.random() * 70 + 30,
        cpuUsage: Math.random() * 80 + 20
      },
      timeSeriesData: Array.from({ length: 20 }, (_, i) => ({
        timestamp: now - (19 - i) * 5000,
        detections: Math.floor(Math.random() * 20) + 5,
        confidence: 0.6 + Math.random() * 0.4,
        fps: 20 + Math.random() * 15,
        tracking: Math.floor(Math.random() * 10) + 1,
        memoryUsage: Math.random() * 80 + 20,
        cpuUsage: Math.random() * 90 + 10
      })),
      heatmapData: Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        intensity: Math.random(),
        detectionCount: Math.floor(Math.random() * 20) + 1,
        dwellTime: Math.random() * 300 + 30
      })),
      cameraAnalytics: Array.from({ length: 4 }, (_, i) => ({
        cameraId: `camera-${i + 1}`,
        cameraName: `Camera ${i + 1}`,
        detectionCount: Math.floor(Math.random() * 100) + 50,
        averageConfidence: 0.6 + Math.random() * 0.4,
        fps: 20 + Math.random() * 15,
        uptime: Math.random() * 100,
        errorRate: Math.random() * 0.05,
        lastActivity: new Date(now - Math.random() * 60000).toISOString(),
        performance: {
          processingTime: Math.random() * 100 + 20,
          memoryUsage: Math.random() * 70 + 30,
          temperature: Math.random() * 20 + 40
        }
      })),
      timestamp: new Date().toISOString()
    };
  }

  private generateHistoricalAnalytics(timeRange: AnalyticsTimeRange, filters?: AnalyticsFilter): HistoricalData {
    const duration = timeRange.endTime - timeRange.startTime;
    const pointCount = Math.min(100, Math.floor(duration / (60 * 1000))); // One point per minute, max 100

    return {
      timeRange,
      detectionTrends: Array.from({ length: pointCount }, (_, i) => ({
        timestamp: timeRange.startTime + (i * duration / pointCount),
        value: Math.floor(Math.random() * 50) + 10,
        metric: 'detections',
        change: (Math.random() - 0.5) * 10,
        trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
      })),
      trackingTrends: Array.from({ length: pointCount }, (_, i) => ({
        timestamp: timeRange.startTime + (i * duration / pointCount),
        value: Math.floor(Math.random() * 20) + 5,
        metric: 'tracking',
        change: (Math.random() - 0.5) * 5,
        trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
      })),
      performanceTrends: Array.from({ length: pointCount }, (_, i) => ({
        timestamp: timeRange.startTime + (i * duration / pointCount),
        value: 20 + Math.random() * 15,
        metric: 'fps',
        change: (Math.random() - 0.5) * 2,
        trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
      })),
      alerts: Array.from({ length: Math.floor(Math.random() * 10) }, (_, i) => ({
        id: `alert-${i}`,
        type: ['performance', 'security', 'system', 'detection'][Math.floor(Math.random() * 4)] as any,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        message: `Alert message ${i + 1}`,
        timestamp: timeRange.startTime + Math.random() * duration,
        source: `camera-${Math.floor(Math.random() * 4) + 1}`,
        isAcknowledged: Math.random() > 0.5
      })),
      summary: {
        totalDetections: Math.floor(Math.random() * 1000) + 500,
        uniquePersons: Math.floor(Math.random() * 200) + 50,
        averageConfidence: 0.7 + Math.random() * 0.3,
        peakHours: ['09:00', '12:00', '15:00', '18:00'],
        mostActiveCamera: `camera-${Math.floor(Math.random() * 4) + 1}`
      }
    };
  }

  private generatePerformanceMetrics(): PerformanceMetrics {
    return {
      system: {
        cpuUsage: Math.random() * 80 + 20,
        memoryUsage: Math.random() * 70 + 30,
        diskUsage: Math.random() * 60 + 20,
        networkUsage: Math.random() * 50 + 10,
        uptime: Math.random() * 100
      },
      application: {
        fps: 20 + Math.random() * 15,
        latency: Math.random() * 100 + 50,
        processingTime: Math.random() * 200 + 50,
        errorRate: Math.random() * 0.05,
        throughput: Math.random() * 1000 + 500
      },
      cameras: Array.from({ length: 4 }, (_, i) => ({
        cameraId: `camera-${i + 1}`,
        fps: 20 + Math.random() * 15,
        latency: Math.random() * 100 + 50,
        processingTime: Math.random() * 200 + 50,
        errorRate: Math.random() * 0.05,
        temperature: Math.random() * 20 + 40,
        memoryUsage: Math.random() * 70 + 30,
        uptime: Math.random() * 100,
        lastFrameTime: Date.now() - Math.random() * 5000
      })),
      timestamp: new Date().toISOString()
    };
  }

  private generateSystemHealth(): SystemHealth {
    const componentStatuses = ['healthy', 'warning', 'critical'] as const;
    const randomStatus = () => componentStatuses[Math.floor(Math.random() * componentStatuses.length)];
    
    return {
      overall: randomStatus(),
      components: {
        database: {
          status: randomStatus(),
          responseTime: Math.random() * 100 + 10,
          errorRate: Math.random() * 0.05,
          lastCheck: new Date().toISOString()
        },
        webSocket: {
          status: randomStatus(),
          responseTime: Math.random() * 50 + 5,
          errorRate: Math.random() * 0.02,
          lastCheck: new Date().toISOString()
        },
        fileSystem: {
          status: randomStatus(),
          responseTime: Math.random() * 20 + 2,
          errorRate: Math.random() * 0.01,
          lastCheck: new Date().toISOString()
        },
        cameras: {
          status: randomStatus(),
          responseTime: Math.random() * 200 + 50,
          errorRate: Math.random() * 0.1,
          lastCheck: new Date().toISOString()
        },
        ai: {
          status: randomStatus(),
          responseTime: Math.random() * 500 + 100,
          errorRate: Math.random() * 0.05,
          lastCheck: new Date().toISOString()
        },
        tracking: {
          status: randomStatus(),
          responseTime: Math.random() * 300 + 50,
          errorRate: Math.random() * 0.08,
          lastCheck: new Date().toISOString()
        }
      },
      alerts: Array.from({ length: Math.floor(Math.random() * 5) }, (_, i) => ({
        id: `alert-${i}`,
        type: ['performance', 'security', 'system', 'detection'][Math.floor(Math.random() * 4)] as any,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        message: `System alert ${i + 1}`,
        timestamp: Date.now() - Math.random() * 3600000,
        source: 'system',
        isAcknowledged: Math.random() > 0.5
      })),
      uptime: Math.random() * 100,
      lastCheck: new Date().toISOString()
    };
  }

  private generatePersonJourney(personId: string, timeRange?: AnalyticsTimeRange): PersonJourney {
    const now = Date.now();
    const startTime = timeRange?.startTime || (now - 3600000); // 1 hour ago
    const endTime = timeRange?.endTime || now;
    const duration = endTime - startTime;

    return {
      personId,
      globalId: `global-${personId}`,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalDuration: duration,
      cameraSequence: Array.from({ length: Math.floor(Math.random() * 6) + 2 }, (_, i) => ({
        cameraId: `camera-${(i % 4) + 1}`,
        cameraName: `Camera ${(i % 4) + 1}`,
        entryTime: new Date(startTime + (i * duration / 6)).toISOString(),
        exitTime: new Date(startTime + ((i + 1) * duration / 6)).toISOString(),
        duration: duration / 6,
        confidence: 0.7 + Math.random() * 0.3,
        detectionCount: Math.floor(Math.random() * 20) + 5
      })),
      trajectory: Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        timestamp: new Date(startTime + (i * duration / 20)).toISOString(),
        cameraId: `camera-${Math.floor(Math.random() * 4) + 1}`,
        confidence: 0.6 + Math.random() * 0.4,
        coordinateSystem: 'world' as const
      })),
      behaviorAnalysis: {
        averageSpeed: Math.random() * 2 + 0.5,
        dwellTimes: Array.from({ length: 3 }, (_, i) => ({
          zone: `zone-${i + 1}`,
          duration: Math.random() * 300 + 30,
          startTime: new Date(startTime + (i * duration / 3)).toISOString(),
          endTime: new Date(startTime + ((i + 1) * duration / 3)).toISOString(),
          behavior: ['walking', 'standing', 'sitting'][Math.floor(Math.random() * 3)]
        })),
        routePattern: 'standard',
        anomalies: []
      },
      statistics: {
        totalDistance: Math.random() * 100 + 50,
        averageConfidence: 0.7 + Math.random() * 0.3,
        reidentificationAccuracy: 0.8 + Math.random() * 0.2,
        cameraTransitions: Math.floor(Math.random() * 5) + 1
      }
    };
  }

  private generateBehavioralAnalytics(filters?: AnalyticsFilter): BehavioralAnalytics {
    return {
      dwellTimeAnalysis: this.generateDwellTimeAnalysis(filters),
      routePatterns: Array.from({ length: 5 }, (_, i) => ({
        id: `route-${i + 1}`,
        path: [`zone-${i + 1}`, `zone-${i + 2}`, `zone-${i + 3}`],
        frequency: Math.floor(Math.random() * 50) + 10,
        averageDuration: Math.random() * 300 + 60,
        commonTimes: ['09:00', '12:00', '15:00'],
        userCount: Math.floor(Math.random() * 100) + 20
      })),
      anomalies: Array.from({ length: Math.floor(Math.random() * 10) }, (_, i) => ({
        id: `anomaly-${i}`,
        type: ['speed', 'route', 'dwell', 'crowd', 'security'][Math.floor(Math.random() * 5)] as any,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        description: `Anomaly ${i + 1}`,
        timestamp: new Date().toISOString(),
        location: `zone-${Math.floor(Math.random() * 5) + 1}`,
        confidence: 0.5 + Math.random() * 0.5,
        personId: Math.random() > 0.5 ? `person-${Math.floor(Math.random() * 10) + 1}` : undefined
      })),
      crowdAnalysis: {
        currentCount: Math.floor(Math.random() * 50) + 10,
        peakCount: Math.floor(Math.random() * 100) + 50,
        averageCount: Math.floor(Math.random() * 30) + 15,
        density: Math.random() * 0.8 + 0.2,
        distribution: Array.from({ length: 5 }, (_, i) => ({
          zone: `zone-${i + 1}`,
          count: Math.floor(Math.random() * 20) + 5,
          density: Math.random() * 0.5 + 0.1
        })),
        trends: Array.from({ length: 10 }, (_, i) => ({
          timestamp: Date.now() - (9 - i) * 60000,
          value: Math.floor(Math.random() * 30) + 10,
          metric: 'crowd',
          change: (Math.random() - 0.5) * 5,
          trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
        }))
      },
      timePatterns: Array.from({ length: 4 }, (_, i) => ({
        period: ['hour', 'day', 'week', 'month'][i] as any,
        peak: `${Math.floor(Math.random() * 24)}:00`,
        low: `${Math.floor(Math.random() * 24)}:00`,
        averageActivity: Math.random() * 100 + 50,
        patterns: Array.from({ length: 24 }, (_, j) => ({
          time: `${j}:00`,
          activity: Math.random() * 100 + 10,
          trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
        }))
      })),
      spatialAnalysis: {
        hotspots: Array.from({ length: 5 }, (_, i) => ({
          zone: `zone-${i + 1}`,
          intensity: Math.random(),
          duration: Math.random() * 300 + 60,
          visitorCount: Math.floor(Math.random() * 50) + 10,
          peakTime: `${Math.floor(Math.random() * 24)}:00`
        })),
        pathAnalysis: Array.from({ length: 3 }, (_, i) => ({
          pathId: `path-${i + 1}`,
          frequency: Math.floor(Math.random() * 100) + 20,
          averageSpeed: Math.random() * 2 + 0.5,
          congestionLevel: Math.random(),
          alternativeRoutes: [`alt-route-${i + 1}`, `alt-route-${i + 2}`]
        })),
        zoneUtilization: Array.from({ length: 5 }, (_, i) => ({
          zone: `zone-${i + 1}`,
          utilizationRate: Math.random(),
          capacity: Math.floor(Math.random() * 100) + 50,
          currentOccupancy: Math.floor(Math.random() * 50) + 10,
          averageVisitDuration: Math.random() * 300 + 60
        })),
        flowAnalysis: {
          entryPoints: Array.from({ length: 3 }, (_, i) => ({
            location: `entry-${i + 1}`,
            count: Math.floor(Math.random() * 100) + 20,
            rate: Math.random() * 10 + 2,
            peakTime: `${Math.floor(Math.random() * 24)}:00`
          })),
          exitPoints: Array.from({ length: 3 }, (_, i) => ({
            location: `exit-${i + 1}`,
            count: Math.floor(Math.random() * 100) + 20,
            rate: Math.random() * 10 + 2,
            peakTime: `${Math.floor(Math.random() * 24)}:00`
          })),
          bottlenecks: Array.from({ length: 2 }, (_, i) => ({
            location: `bottleneck-${i + 1}`,
            count: Math.floor(Math.random() * 50) + 10,
            rate: Math.random() * 5 + 1,
            peakTime: `${Math.floor(Math.random() * 24)}:00`
          })),
          flowRate: Math.random() * 10 + 5,
          peakFlowTime: `${Math.floor(Math.random() * 24)}:00`
        }
      }
    };
  }

  private generateDwellTimeAnalysis(filters?: AnalyticsFilter): DwellTimeAnalysis {
    return {
      averageDwellTime: Math.random() * 300 + 60,
      dwellTimeDistribution: Array.from({ length: 5 }, (_, i) => ({
        zone: `zone-${i + 1}`,
        averageTime: Math.random() * 300 + 60,
        medianTime: Math.random() * 250 + 50,
        maxTime: Math.random() * 500 + 300,
        visitorCount: Math.floor(Math.random() * 100) + 20
      })),
      heatmap: Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        intensity: Math.random(),
        detectionCount: Math.floor(Math.random() * 50) + 10,
        dwellTime: Math.random() * 300 + 60
      })),
      trends: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - (9 - i) * 3600000,
        value: Math.random() * 300 + 60,
        metric: 'dwellTime',
        change: (Math.random() - 0.5) * 30,
        trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
      }))
    };
  }

  private generateTrafficPatterns(timeRange: AnalyticsTimeRange, filters?: AnalyticsFilter): TrafficPattern[] {
    return Array.from({ length: 3 }, (_, i) => ({
      id: `pattern-${i + 1}`,
      name: `Traffic Pattern ${i + 1}`,
      timeRange,
      pattern: Array.from({ length: 24 }, (_, j) => ({
        hour: j,
        count: Math.floor(Math.random() * 50) + 10,
        avgSpeed: Math.random() * 3 + 1,
        congestion: Math.random()
      })),
      peakHours: ['09:00', '12:00', '15:00', '18:00'],
      trends: Array.from({ length: 10 }, (_, j) => ({
        timestamp: Date.now() - (9 - j) * 3600000,
        value: Math.floor(Math.random() * 50) + 10,
        metric: 'traffic',
        change: (Math.random() - 0.5) * 10,
        trend: ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)] as any
      }))
    }));
  }

  private generateHeatmapData(timeRange: AnalyticsTimeRange, filters?: AnalyticsFilter): HeatmapData {
    return {
      timeRange,
      resolution: {
        width: 100,
        height: 100
      },
      data: Array.from({ length: 100 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        intensity: Math.random(),
        detectionCount: Math.floor(Math.random() * 50) + 5,
        dwellTime: Math.random() * 300 + 30
      })),
      maxIntensity: 1.0,
      totalDetections: Math.floor(Math.random() * 1000) + 500
    };
  }

  private generateExportData(format: string, filters?: AnalyticsFilter, timeRange?: AnalyticsTimeRange): Blob {
    const data = JSON.stringify({
      format,
      filters,
      timeRange,
      exportedAt: new Date().toISOString(),
      data: 'Mock export data'
    });
    
    return new Blob([data], { type: 'application/json' });
  }

  private generateMockReport(reportType: string, filters?: AnalyticsFilter, timeRange?: AnalyticsTimeRange): ApiResponse<any> {
    return {
      data: {
        reportType,
        filters,
        timeRange,
        generatedAt: new Date().toISOString(),
        content: 'Mock report content'
      },
      status: 200,
      timestamp: new Date().toISOString(),
      meta: {
        version: '1.0.0',
        requestId: generateId(),
        processingTime: Math.random() * 1000 + 500
      }
    };
  }

  // Utility methods
  generateLiveDetection(cameraId: string): DetectionResult {
    return generateMockDetection(cameraId, Math.floor(Math.random() * 1000));
  }

  generateLiveTracking(personId: string): TrackingResult {
    return generateMockTracking(personId);
  }

  generateLiveMapping(): SpatialMapping {
    return generateMockMapping();
  }
}

// Export singleton instance
export const mockDataService = new MockDataService();