// TODO: BACKEND INTEGRATION REQUIRED
// This file implements the Detection API service with mock data for development.
// Once backend is available, update the implementation to use actual API endpoints.
// See PLANNING.md for backend integration requirements.

import { apiClient } from './api';
import { 
  DetectionResult, 
  DetectionStatistics, 
  DetectionRequest,
  PaginatedResponse,
  QueryOptions,
  ApiResponse
} from './types/api';
import { mockDataService } from './mock/mockDataService';
import { apiConfig, shouldUseMocks } from './config/apiConfig';

export class DetectionAPIService {
  private useMocks = shouldUseMocks();

  constructor() {
    console.log(`🔍 Detection API Service initialized (${this.useMocks ? 'MOCK' : 'LIVE'} mode)`);
    
    if (this.useMocks) {
      console.warn('⚠️  USING MOCK DATA - Switch to actual backend when available');
    }
  }

  /**
   * Get paginated detection results
   * @param options Query options for filtering and pagination
   * @returns Paginated detection results
   */
  async getDetections(options: QueryOptions = {}): Promise<PaginatedResponse<DetectionResult>> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      const { page = 1, pageSize = 10, filters } = options;
      const cameraId = filters?.cameraIds?.[0];
      
      console.log('🔍 [MOCK] Fetching detection results:', { page, pageSize, cameraId });
      return mockDataService.getDetections(cameraId, pageSize);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<DetectionResult>>(
        apiConfig.endpoints.detections, 
        {
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          ...options.filters
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch detections:', error);
      throw error;
    }
  }

  /**
   * Get detection result by ID
   * @param id Detection result ID
   * @returns Detection result or null if not found
   */
  async getDetection(id: string): Promise<DetectionResult | null> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔍 [MOCK] Fetching detection by ID:', id);
      
      // Generate mock detection for demonstration
      const mockDetection = mockDataService.generateLiveDetection('camera_1');
      return { ...mockDetection, id };
    }

    try {
      const response = await apiClient.get<DetectionResult>(
        apiConfig.endpoints.detection(id)
      );
      
      return response.data;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      console.error('❌ Failed to fetch detection:', error);
      throw error;
    }
  }

  /**
   * Get detection statistics
   * @returns Detection statistics
   */
  async getDetectionStatistics(): Promise<DetectionStatistics> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔍 [MOCK] Fetching detection statistics');
      return mockDataService.getDetectionStats();
    }

    try {
      const response = await apiClient.get<DetectionStatistics>(
        apiConfig.endpoints.detectionStats
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch detection statistics:', error);
      throw error;
    }
  }

  /**
   * Search detections with specific criteria
   * @param request Search request parameters
   * @returns Paginated search results
   */
  async searchDetections(request: DetectionRequest): Promise<PaginatedResponse<DetectionResult>> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔍 [MOCK] Searching detections:', request);
      
      // Filter mock data based on request
      const cameraId = request.cameraIds?.[0];
      return mockDataService.getDetections(cameraId, 10);
    }

    try {
      const response = await apiClient.post<PaginatedResponse<DetectionResult>>(
        apiConfig.endpoints.detectionsSearch,
        request
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to search detections:', error);
      throw error;
    }
  }

  /**
   * Get detections for specific camera
   * @param cameraId Camera ID
   * @param options Query options
   * @returns Detections for the camera
   */
  async getDetectionsByCamera(cameraId: string, options: QueryOptions = {}): Promise<PaginatedResponse<DetectionResult>> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        cameraIds: [cameraId]
      }
    };

    return this.getDetections(searchOptions);
  }

  /**
   * Get detections within date range
   * @param startTime Start time (ISO string)
   * @param endTime End time (ISO string)
   * @param options Query options
   * @returns Detections within date range
   */
  async getDetectionsByDateRange(
    startTime: string, 
    endTime: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<DetectionResult>> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        dateRange: { start: startTime, end: endTime }
      }
    };

    return this.getDetections(searchOptions);
  }

  /**
   * Get detections with minimum confidence
   * @param minConfidence Minimum confidence threshold (0-1)
   * @param options Query options
   * @returns High confidence detections
   */
  async getHighConfidenceDetections(
    minConfidence: number, 
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<DetectionResult>> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        confidence: { min: minConfidence, max: 1.0 }
      }
    };

    return this.getDetections(searchOptions);
  }

  /**
   * Export detection data
   * @param request Export request parameters
   * @param format Export format (csv, json, xlsx)
   * @returns Export file blob
   */
  async exportDetections(
    request: DetectionRequest, 
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔍 [MOCK] Exporting detections:', { request, format });
      
      const mockData = await mockDataService.getDetections(request.cameraIds?.[0], 100);
      const content = format === 'json' 
        ? JSON.stringify(mockData, null, 2)
        : this.convertToCSV(mockData.data);
      
      return new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
    }

    try {
      const response = await apiClient.post(
        apiConfig.endpoints.detectionsExport,
        { ...request, format },
        { responseType: 'blob' }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to export detections:', error);
      throw error;
    }
  }

  /**
   * Get live detection stream (for WebSocket integration)
   * @param cameraId Camera ID to stream from
   * @returns Detection result
   */
  generateLiveDetection(cameraId: string): DetectionResult {
    if (this.useMocks) {
      return mockDataService.generateLiveDetection(cameraId);
    }
    
    throw new Error('Live detection requires WebSocket connection to backend');
  }

  /**
   * Update detection processing configuration
   * @param config Detection configuration
   * @returns Updated configuration
   */
  async updateDetectionConfig(config: any): Promise<any> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔍 [MOCK] Updating detection config:', config);
      return { ...config, updated: true };
    }

    try {
      const response = await apiClient.put('/detection/config', config);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update detection config:', error);
      throw error;
    }
  }

  /**
   * Get detection processing performance metrics
   * @returns Performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔍 [MOCK] Fetching performance metrics');
      
      return {
        averageProcessingTime: 75 + Math.random() * 25,
        framesPerSecond: 28 + Math.random() * 4,
        detectionAccuracy: 0.85 + Math.random() * 0.1,
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      const response = await apiClient.get('/detection/metrics');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch performance metrics:', error);
      throw error;
    }
  }

  /**
   * Helper method to convert detection data to CSV format
   * @param detections Array of detection results
   * @returns CSV string
   */
  private convertToCSV(detections: DetectionResult[]): string {
    const headers = [
      'ID', 'Frame ID', 'Camera ID', 'Frame Index', 'Timestamp', 
      'Detection Count', 'Average Confidence', 'Processing Time'
    ];
    
    const rows = detections.map(detection => [
      detection.id,
      detection.frameId,
      detection.cameraId,
      detection.frameIndex,
      detection.timestamp,
      detection.detections.length,
      detection.confidence.toFixed(3),
      detection.processingTime.toFixed(2)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Switch between mock and live data modes
   * @param useMocks Whether to use mock data
   */
  setMockMode(useMocks: boolean): void {
    this.useMocks = useMocks;
    console.log(`🔍 Detection API Service switched to ${useMocks ? 'MOCK' : 'LIVE'} mode`);
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
export const detectionAPI = new DetectionAPIService();

// Export service class for custom instances
export { DetectionAPIService };