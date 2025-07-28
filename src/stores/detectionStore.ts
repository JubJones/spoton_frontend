export interface DetectionStore {
  // Frame data
  currentFrameData: any | null;
  frameIndices: Record<string, number>;
  frameHistory: any[];
  
  // Camera configuration
  cameraConfigs: Record<string, CameraConfig>;
  cameraStatuses: Record<string, 'active' | 'inactive' | 'error'>;
  activeCameras: string[];
  
  // Detection statistics
  detectionStats: {
    totalDetections: number;
    detectionsPerCamera: Record<string, number>;
    averageConfidence: number;
    detectionRate: number;
  };
  
  // Bounding boxes
  boundingBoxes: Record<string, BoundingBox[]>;
  showBoundingBoxes: boolean;
  confidenceThreshold: number;
}

export interface CameraConfig {
  id: string;
  name: string;
  basePath: string;
  startFrame: number;
  frameCount: number;
  extension: string;
  isActive: boolean;
  position: { x: number; y: number };
}

export interface BoundingBox {
  id: string;
  trackId: number;
  globalId: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  classId: number;
  timestamp: string;
}

export const createDetectionStore = (): DetectionStore => ({
  // Frame data
  currentFrameData: null,
  frameIndices: {
    camera1: 0,
    camera2: 0,
    camera3: 0,
    camera4: 0,
  },
  frameHistory: [],
  
  // Camera configuration
  cameraConfigs: {
    camera1: {
      id: 'camera1',
      name: 'Camera 1',
      basePath: '/frames/camera1/',
      startFrame: 0,
      frameCount: 51,
      extension: 'jpg',
      isActive: true,
      position: { x: 0, y: 0 },
    },
    camera2: {
      id: 'camera2',
      name: 'Camera 2',
      basePath: '/frames/camera2/',
      startFrame: 0,
      frameCount: 51,
      extension: 'jpg',
      isActive: true,
      position: { x: 1, y: 0 },
    },
    camera3: {
      id: 'camera3',
      name: 'Camera 3',
      basePath: '/frames/camera3/',
      startFrame: 0,
      frameCount: 51,
      extension: 'jpg',
      isActive: true,
      position: { x: 0, y: 1 },
    },
    camera4: {
      id: 'camera4',
      name: 'Camera 4',
      basePath: '/frames/camera4/',
      startFrame: 0,
      frameCount: 51,
      extension: 'jpg',
      isActive: true,
      position: { x: 1, y: 1 },
    },
  },
  
  cameraStatuses: {
    camera1: 'active',
    camera2: 'active',
    camera3: 'active',
    camera4: 'active',
  },
  
  activeCameras: ['camera1', 'camera2', 'camera3', 'camera4'],
  
  // Detection statistics
  detectionStats: {
    totalDetections: 0,
    detectionsPerCamera: {},
    averageConfidence: 0,
    detectionRate: 0,
  },
  
  // Bounding boxes
  boundingBoxes: {},
  showBoundingBoxes: true,
  confidenceThreshold: 0.5,
});