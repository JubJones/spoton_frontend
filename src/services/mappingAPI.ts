import { apiClient, ApiResponse } from './api';

export interface MapCoordinate {
  x: number;
  y: number;
  coordinate_system: string;
  timestamp: string;
  confidence: number;
}

export interface Trajectory {
  person_id: number;
  path_points: MapCoordinate[];
  start_time: string;
  end_time: string;
  total_distance: number;
  cameras_traversed: string[];
}

export interface SpatialZone {
  id: string;
  name: string;
  polygon: Array<{ x: number; y: number }>;
  type: 'entry' | 'exit' | 'restricted' | 'monitoring';
  is_active: boolean;
  alert_threshold?: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  resolution: { width: number; height: number };
  time_range: { start: string; end: string };
  max_value: number;
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  normalized_value: number;
}

export interface CameraCalibration {
  camera_id: string;
  intrinsic_matrix: number[][];
  distortion_coefficients: number[];
  rotation_matrix: number[][];
  translation_vector: number[];
  homography_matrix: number[][];
  map_bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  last_updated: string;
}

export interface OccupancyData {
  zone_id: string;
  current_occupancy: number;
  max_occupancy: number;
  occupancy_rate: number;
  timestamp: string;
  persons_in_zone: number[];
}

export interface FloorPlan {
  id: string;
  name: string;
  image_url: string;
  dimensions: { width: number; height: number };
  scale: number; // pixels per meter
  origin: { x: number; y: number };
  zones: SpatialZone[];
  camera_positions: CameraPosition[];
}

export interface CameraPosition {
  camera_id: string;
  position: { x: number; y: number; z: number };
  orientation: { pitch: number; yaw: number; roll: number };
  field_of_view: number;
  coverage_area: Array<{ x: number; y: number }>;
}

class MappingAPIService {
  // Get floor plan data
  async getFloorPlan(planId: string): Promise<ApiResponse<FloorPlan>> {
    return apiClient.get(`/mapping/floorplan/${planId}`);
  }

  // Get all available floor plans
  async getFloorPlans(): Promise<ApiResponse<FloorPlan[]>> {
    return apiClient.get('/mapping/floorplans');
  }

  // Get camera calibration data
  async getCameraCalibration(cameraId: string): Promise<ApiResponse<CameraCalibration>> {
    return apiClient.get(`/mapping/camera/${cameraId}/calibration`);
  }

  // Get all camera calibrations
  async getAllCameraCalibrations(): Promise<ApiResponse<CameraCalibration[]>> {
    return apiClient.get('/mapping/cameras/calibration');
  }

  // Get spatial zones
  async getSpatialZones(): Promise<ApiResponse<SpatialZone[]>> {
    return apiClient.get('/mapping/zones');
  }

  // Create spatial zone
  async createSpatialZone(zone: Omit<SpatialZone, 'id'>): Promise<ApiResponse<SpatialZone>> {
    return apiClient.post('/mapping/zones', zone);
  }

  // Update spatial zone
  async updateSpatialZone(zoneId: string, zone: Partial<SpatialZone>): Promise<ApiResponse<SpatialZone>> {
    return apiClient.put(`/mapping/zones/${zoneId}`, zone);
  }

  // Delete spatial zone
  async deleteSpatialZone(zoneId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/mapping/zones/${zoneId}`);
  }

  // Get person trajectories
  async getPersonTrajectories(
    personId?: number,
    startTime?: string,
    endTime?: string
  ): Promise<ApiResponse<Trajectory[]>> {
    const params: any = {};
    if (personId) params.person_id = personId;
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    
    return apiClient.get('/mapping/trajectories', params);
  }

  // Get heatmap data
  async getHeatmapData(
    startTime: string,
    endTime: string,
    resolution?: { width: number; height: number }
  ): Promise<ApiResponse<HeatmapData>> {
    const params: any = { start_time: startTime, end_time: endTime };
    if (resolution) params.resolution = resolution;
    
    return apiClient.get('/mapping/heatmap', params);
  }

  // Get occupancy data
  async getOccupancyData(
    zoneId?: string,
    startTime?: string,
    endTime?: string
  ): Promise<ApiResponse<OccupancyData[]>> {
    const params: any = {};
    if (zoneId) params.zone_id = zoneId;
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    
    return apiClient.get('/mapping/occupancy', params);
  }

  // Get real-time occupancy
  async getRealTimeOccupancy(): Promise<ApiResponse<OccupancyData[]>> {
    return apiClient.get('/mapping/occupancy/realtime');
  }

  // Transform coordinates
  async transformCoordinates(
    coordinates: { x: number; y: number }[],
    fromSystem: string,
    toSystem: string,
    cameraId?: string
  ): Promise<ApiResponse<{ x: number; y: number }[]>> {
    return apiClient.post('/mapping/transform', {
      coordinates,
      from_system: fromSystem,
      to_system: toSystem,
      camera_id: cameraId
    });
  }

  // Get coordinate systems
  async getCoordinateSystems(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/mapping/coordinate-systems');
  }

  // Calibrate camera
  async calibrateCamera(
    cameraId: string,
    calibrationData: {
      reference_points: Array<{
        image_point: { x: number; y: number };
        world_point: { x: number; y: number };
      }>;
    }
  ): Promise<ApiResponse<CameraCalibration>> {
    return apiClient.post(`/mapping/camera/${cameraId}/calibrate`, calibrationData);
  }

  // Validate calibration
  async validateCalibration(
    cameraId: string,
    testPoints: Array<{
      image_point: { x: number; y: number };
      expected_world_point: { x: number; y: number };
    }>
  ): Promise<ApiResponse<{ accuracy: number; errors: number[] }>> {
    return apiClient.post(`/mapping/camera/${cameraId}/validate`, { test_points: testPoints });
  }

  // Get mapping statistics
  async getMappingStats(): Promise<ApiResponse<any>> {
    return apiClient.get('/mapping/stats');
  }

  // Export mapping data
  async exportMappingData(
    startTime: string,
    endTime: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<ApiResponse<Blob>> {
    const params = { start_time: startTime, end_time: endTime, format };
    return apiClient.get('/mapping/export', params);
  }
}

// Export service instance
export const mappingAPI = new MappingAPIService();

// Export service class for custom instances
export { MappingAPIService };