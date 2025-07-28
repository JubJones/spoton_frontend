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
  PaginatedResponse
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