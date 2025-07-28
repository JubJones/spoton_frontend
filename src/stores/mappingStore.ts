export interface MappingStore {
  // Map configuration
  mapDimensions: { width: number; height: number };
  mapBounds: MapBounds;
  coordinateSystem: 'camera' | 'world' | 'map';
  
  // Map points and visualization
  mapPoints: Record<string, MapPoint[]>; // camera_id -> points
  showMapPoints: boolean;
  pointColors: Record<string, string>;
  
  // Camera positions and coverage
  cameraPositions: Record<string, CameraPosition>;
  cameraFOVs: Record<string, FieldOfView>;
  showCameraFOVs: boolean;
  
  // Spatial mapping
  trajectoryPaths: Record<number, SpatialPath>;
  heatmapData: HeatmapCell[];
  occupancyZones: OccupancyZone[];
  
  // Coordinate transformations
  homographyMatrices: Record<string, Matrix3x3>;
  calibrationData: Record<string, CalibrationData>;
  
  // Map interaction
  selectedZone: string | null;
  zoomLevel: number;
  panPosition: { x: number; y: number };
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapPoint {
  id: string;
  personId: number;
  x: number;
  y: number;
  cameraId: string;
  timestamp: string;
  confidence: number;
}

export interface CameraPosition {
  id: string;
  x: number;
  y: number;
  rotation: number;
  height: number;
  isActive: boolean;
}

export interface FieldOfView {
  cameraId: string;
  vertices: Array<{ x: number; y: number }>;
  coverage: number;
  color: string;
}

export interface SpatialPath {
  personId: number;
  points: Array<{ x: number; y: number; timestamp: string }>;
  totalDistance: number;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  timestamp: string;
}

export interface OccupancyZone {
  id: string;
  name: string;
  polygon: Array<{ x: number; y: number }>;
  currentOccupancy: number;
  maxOccupancy: number;
  alertThreshold: number;
}

export interface Matrix3x3 {
  m11: number; m12: number; m13: number;
  m21: number; m22: number; m23: number;
  m31: number; m32: number; m33: number;
}

export interface CalibrationData {
  cameraId: string;
  intrinsicMatrix: Matrix3x3;
  distortionCoefficients: number[];
  rotationMatrix: Matrix3x3;
  translationVector: [number, number, number];
  lastUpdated: string;
}

export const createMappingStore = (): MappingStore => ({
  // Map configuration
  mapDimensions: { width: 0, height: 0 },
  mapBounds: { minX: 0, maxX: 1920, minY: 0, maxY: 1080 },
  coordinateSystem: 'camera',
  
  // Map points and visualization
  mapPoints: {},
  showMapPoints: true,
  pointColors: {
    'c09': '#06b6d4', // cyan
    'c12': '#ef4444', // red
    'c13': '#eab308', // yellow
    'c16': '#a855f7', // purple
  },
  
  // Camera positions and coverage
  cameraPositions: {},
  cameraFOVs: {},
  showCameraFOVs: false,
  
  // Spatial mapping
  trajectoryPaths: {},
  heatmapData: [],
  occupancyZones: [],
  
  // Coordinate transformations
  homographyMatrices: {},
  calibrationData: {},
  
  // Map interaction
  selectedZone: null,
  zoomLevel: 1,
  panPosition: { x: 0, y: 0 },
});