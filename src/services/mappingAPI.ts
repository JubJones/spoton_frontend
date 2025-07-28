// TODO: BACKEND INTEGRATION REQUIRED
// This file implements the Mapping API service with mock data for development.
// Once backend is available, update the implementation to use actual API endpoints.
// See PLANNING.md for backend integration requirements.

import { apiClient } from './api';
import { 
  SpatialMapping, 
  MappingStatistics, 
  MappingRequest,
  Environment,
  CameraConfig,
  SpatialTrajectory,
  CameraPosition
} from './types/api';
import { mockDataService } from './mock/mockDataService';
import { apiConfig, shouldUseMocks } from './config/apiConfig';

export class MappingAPIService {
  private useMocks = shouldUseMocks();

  constructor() {
    console.log(`🗺️  Mapping API Service initialized (${this.useMocks ? 'MOCK' : 'LIVE'} mode)`);
    
    if (this.useMocks) {
      console.warn('⚠️  USING MOCK DATA - Switch to actual backend when available');
    }
  }

  /**
   * Get spatial mapping for environment
   * @param environmentId Environment ID
   * @returns Spatial mapping data
   */
  async getSpatialMapping(environmentId: string): Promise<SpatialMapping> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching spatial mapping for environment:', environmentId);
      return mockDataService.getSpatialMapping(environmentId);
    }

    try {
      const response = await apiClient.get<SpatialMapping>(
        apiConfig.endpoints.spatialMapping(environmentId)
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch spatial mapping:', error);
      throw error;
    }
  }

  /**
   * Get mapping statistics
   * @returns Mapping statistics
   */
  async getMappingStatistics(): Promise<MappingStatistics> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching mapping statistics');
      return mockDataService.getMappingStats();
    }

    try {
      const response = await apiClient.get<MappingStatistics>(
        apiConfig.endpoints.mappingStats
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch mapping statistics:', error);
      throw error;
    }
  }

  /**
   * Get environments list
   * @returns List of available environments
   */
  async getEnvironments(): Promise<Environment[]> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching environments list');
      return mockDataService.getEnvironments();
    }

    try {
      const response = await apiClient.get<Environment[]>(
        apiConfig.endpoints.environments
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch environments:', error);
      throw error;
    }
  }

  /**
   * Get environment by ID
   * @param environmentId Environment ID
   * @returns Environment details
   */
  async getEnvironment(environmentId: string): Promise<Environment | null> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching environment by ID:', environmentId);
      return mockDataService.getEnvironment(environmentId);
    }

    try {
      const response = await apiClient.get<Environment>(
        apiConfig.endpoints.environment(environmentId)
      );
      
      return response.data;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      console.error('❌ Failed to fetch environment:', error);
      throw error;
    }
  }

  /**
   * Get cameras for environment
   * @param environmentId Environment ID
   * @returns List of cameras in environment
   */
  async getEnvironmentCameras(environmentId: string): Promise<CameraConfig[]> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching cameras for environment:', environmentId);
      return mockDataService.getCameras(environmentId);
    }

    try {
      const response = await apiClient.get<CameraConfig[]>(
        apiConfig.endpoints.environmentCameras(environmentId)
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch environment cameras:', error);
      throw error;
    }
  }

  /**
   * Get camera positions in world coordinates
   * @param environmentId Environment ID
   * @returns Camera positions
   */
  async getCameraPositions(environmentId: string): Promise<CameraPosition[]> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching camera positions for environment:', environmentId);
      
      const mapping = await mockDataService.getSpatialMapping(environmentId);
      return mapping.cameraPositions;
    }

    try {
      const response = await apiClient.get<CameraPosition[]>(
        `${apiConfig.endpoints.spatialMapping(environmentId)}/cameras`
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch camera positions:', error);
      throw error;
    }
  }

  /**
   * Get spatial trajectories
   * @param environmentId Environment ID
   * @param options Query options
   * @returns Spatial trajectories
   */
  async getSpatialTrajectories(
    environmentId: string, 
    options: {
      startTime?: string;
      endTime?: string;
      personIds?: string[];
      includeInactive?: boolean;
    } = {}
  ): Promise<SpatialTrajectory[]> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching spatial trajectories:', { environmentId, options });
      
      const mapping = await mockDataService.getSpatialMapping(environmentId);
      return mapping.trajectoryPaths;
    }

    try {
      const response = await apiClient.get<SpatialTrajectory[]>(
        `${apiConfig.endpoints.spatialMapping(environmentId)}/trajectories`,
        options
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch spatial trajectories:', error);
      throw error;
    }
  }

  /**
   * Transform coordinates between coordinate systems
   * @param request Coordinate transformation request
   * @returns Transformed coordinates
   */
  async transformCoordinates(request: {
    points: Array<{ x: number; y: number }>;
    fromSystem: string;
    toSystem: string;
    environmentId: string;
  }): Promise<Array<{ x: number; y: number }>> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Transforming coordinates:', request);
      
      // Simple mock transformation (just return the same points)
      return request.points.map(point => ({
        x: point.x + Math.random() * 2 - 1, // Add small random offset
        y: point.y + Math.random() * 2 - 1
      }));
    }

    try {
      const response = await apiClient.post<Array<{ x: number; y: number }>>(
        apiConfig.endpoints.coordinateTransform,
        request
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to transform coordinates:', error);
      throw error;
    }
  }

  /**
   * Get trajectory analysis
   * @param environmentId Environment ID
   * @param analysisType Type of analysis
   * @returns Analysis results
   */
  async getTrajectoryAnalysis(
    environmentId: string,
    analysisType: 'heatmap' | 'flow' | 'dwell' | 'paths' = 'heatmap'
  ): Promise<any> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Fetching trajectory analysis:', { environmentId, analysisType });
      
      // Generate mock analysis data based on type
      switch (analysisType) {
        case 'heatmap':
          return {
            type: 'heatmap',
            data: Array.from({ length: 100 }, (_, i) => ({
              x: (i % 10) * 10,
              y: Math.floor(i / 10) * 10,
              intensity: Math.random()
            })),
            bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
          };
        
        case 'flow':
          return {
            type: 'flow',
            data: Array.from({ length: 20 }, (_, i) => ({
              from: { x: Math.random() * 100, y: Math.random() * 100 },
              to: { x: Math.random() * 100, y: Math.random() * 100 },
              count: Math.floor(Math.random() * 50) + 1
            }))
          };
        
        case 'dwell':
          return {
            type: 'dwell',
            data: Array.from({ length: 15 }, (_, i) => ({
              x: Math.random() * 100,
              y: Math.random() * 100,
              dwellTime: Math.random() * 30000 + 5000,
              count: Math.floor(Math.random() * 10) + 1
            }))
          };
        
        case 'paths':
          return {
            type: 'paths',
            data: Array.from({ length: 10 }, (_, i) => ({
              id: `path-${i}`,
              points: Array.from({ length: 5 }, () => ({
                x: Math.random() * 100,
                y: Math.random() * 100
              })),
              frequency: Math.floor(Math.random() * 20) + 1
            }))
          };
        
        default:
          return { type: analysisType, data: [] };
      }
    }

    try {
      const response = await apiClient.get(
        apiConfig.endpoints.trajectoryAnalysis,
        { environmentId, analysisType }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch trajectory analysis:', error);
      throw error;
    }
  }

  /**
   * Update environment configuration
   * @param environmentId Environment ID
   * @param config Environment configuration
   * @returns Updated environment
   */
  async updateEnvironmentConfig(environmentId: string, config: Partial<Environment>): Promise<Environment> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Updating environment config:', { environmentId, config });
      
      const existing = await mockDataService.getEnvironment(environmentId);
      if (!existing) {
        throw new Error('Environment not found');
      }
      
      return { ...existing, ...config, updatedAt: new Date().toISOString() };
    }

    try {
      const response = await apiClient.patch<Environment>(
        apiConfig.endpoints.environment(environmentId),
        config
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update environment config:', error);
      throw error;
    }
  }

  /**
   * Update camera configuration
   * @param cameraId Camera ID
   * @param config Camera configuration
   * @returns Updated camera
   */
  async updateCameraConfig(cameraId: string, config: Partial<CameraConfig>): Promise<CameraConfig> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Updating camera config:', { cameraId, config });
      
      const existing = await mockDataService.getCamera(cameraId);
      if (!existing) {
        throw new Error('Camera not found');
      }
      
      return { ...existing, ...config, updatedAt: new Date().toISOString() };
    }

    try {
      const response = await apiClient.patch<CameraConfig>(
        apiConfig.endpoints.camera(cameraId),
        config
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update camera config:', error);
      throw error;
    }
  }

  /**
   * Export mapping data
   * @param environmentId Environment ID
   * @param format Export format
   * @returns Export file blob
   */
  async exportMappingData(
    environmentId: string,
    format: 'json' | 'csv' | 'geojson' = 'json'
  ): Promise<Blob> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🗺️  [MOCK] Exporting mapping data:', { environmentId, format });
      
      const mapping = await mockDataService.getSpatialMapping(environmentId);
      let content: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(mapping, null, 2);
          break;
        case 'csv':
          content = this.convertMappingToCSV(mapping);
          break;
        case 'geojson':
          content = JSON.stringify(this.convertToGeoJSON(mapping), null, 2);
          break;
        default:
          content = JSON.stringify(mapping, null, 2);
      }
      
      return new Blob([content], { 
        type: format === 'json' ? 'application/json' : 
              format === 'csv' ? 'text/csv' : 
              'application/geo+json'
      });
    }

    try {
      const response = await apiClient.get(
        `${apiConfig.endpoints.spatialMapping(environmentId)}/export`,
        { format },
        { responseType: 'blob' }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to export mapping data:', error);
      throw error;
    }
  }

  /**
   * Generate live mapping data (for WebSocket integration)
   * @returns Live mapping data
   */
  generateLiveMapping(): SpatialMapping {
    if (this.useMocks) {
      return mockDataService.generateLiveMapping();
    }
    
    throw new Error('Live mapping requires WebSocket connection to backend');
  }

  /**
   * Helper method to convert mapping data to CSV format
   * @param mapping Spatial mapping data
   * @returns CSV string
   */
  private convertMappingToCSV(mapping: SpatialMapping): string {
    const headers = ['Type', 'ID', 'X', 'Y', 'Timestamp', 'Camera ID', 'Confidence'];
    const rows: string[][] = [];
    
    // Add camera positions
    mapping.cameraPositions.forEach(camera => {
      rows.push([
        'camera',
        camera.cameraId,
        camera.worldPosition.x.toString(),
        camera.worldPosition.y.toString(),
        '',
        camera.cameraId,
        '1.0'
      ]);
    });
    
    // Add trajectory points
    mapping.trajectoryPaths.forEach(trajectory => {
      trajectory.path.forEach(point => {
        rows.push([
          'trajectory',
          trajectory.personId,
          point.x.toString(),
          point.y.toString(),
          point.timestamp,
          point.cameraId,
          point.confidence.toString()
        ]);
      });
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Helper method to convert mapping data to GeoJSON format
   * @param mapping Spatial mapping data
   * @returns GeoJSON object
   */
  private convertToGeoJSON(mapping: SpatialMapping): any {
    const features: any[] = [];
    
    // Add camera positions as points
    mapping.cameraPositions.forEach(camera => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [camera.worldPosition.x, camera.worldPosition.y]
        },
        properties: {
          type: 'camera',
          cameraId: camera.cameraId,
          fieldOfView: camera.fieldOfView
        }
      });
    });
    
    // Add trajectory paths as line strings
    mapping.trajectoryPaths.forEach(trajectory => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: trajectory.path.map(point => [point.x, point.y])
        },
        properties: {
          type: 'trajectory',
          personId: trajectory.personId,
          globalId: trajectory.globalId,
          totalDistance: trajectory.totalDistance,
          averageSpeed: trajectory.averageSpeed
        }
      });
    });
    
    return {
      type: 'FeatureCollection',
      features
    };
  }

  /**
   * Switch between mock and live data modes
   * @param useMocks Whether to use mock data
   */
  setMockMode(useMocks: boolean): void {
    this.useMocks = useMocks;
    console.log(`🗺️  Mapping API Service switched to ${useMocks ? 'MOCK' : 'LIVE'} mode`);
  }

  /**
   * Get current mode status
   * @returns Current mode information
   */
  getModeStatus(): { useMocks: boolean; mode: string } {
    return {
      useMocks: this.useMocks,
      mode: this.useMocks ? 'MOCK' : 'LIVE'
    };
  }
}

// Export service instance
export const mappingAPI = new MappingAPIService();

// Export service class for custom instances
export { MappingAPIService };