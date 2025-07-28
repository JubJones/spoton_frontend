// TODO: BACKEND INTEGRATION REQUIRED
// This file implements the Tracking API service with mock data for development.
// Once backend is available, update the implementation to use actual API endpoints.
// See PLANNING.md for backend integration requirements.

import { apiClient } from './api';
import { 
  TrackingResult, 
  TrackingStatistics, 
  TrackingRequest,
  PaginatedResponse,
  QueryOptions,
  CameraTransition,
  TrajectoryPoint
} from './types/api';
import { mockDataService } from './mock/mockDataService';
import { apiConfig, shouldUseMocks } from './config/apiConfig';

export class TrackingAPIService {
  private useMocks = shouldUseMocks();

  constructor() {
    console.log(`🔀 Tracking API Service initialized (${this.useMocks ? 'MOCK' : 'LIVE'} mode)`);
    
    if (this.useMocks) {
      console.warn('⚠️  USING MOCK DATA - Switch to actual backend when available');
    }
  }

  /**
   * Get paginated tracking results
   * @param options Query options for filtering and pagination
   * @returns Paginated tracking results
   */
  async getTrackingResults(options: QueryOptions = {}): Promise<PaginatedResponse<TrackingResult>> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      const { page = 1, pageSize = 10, filters } = options;
      const personId = filters?.search;
      
      console.log('🔀 [MOCK] Fetching tracking results:', { page, pageSize, personId });
      return mockDataService.getTrackingResults(personId, pageSize);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<TrackingResult>>(
        apiConfig.endpoints.tracking, 
        {
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          ...options.filters
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch tracking results:', error);
      throw error;
    }
  }

  /**
   * Get tracking result by ID
   * @param id Tracking result ID
   * @returns Tracking result or null if not found
   */
  async getTrackingResult(id: string): Promise<TrackingResult | null> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Fetching tracking result by ID:', id);
      
      // Generate mock tracking result for demonstration
      const mockTracking = mockDataService.generateLiveTracking(`person-${id}`);
      return { ...mockTracking, id };
    }

    try {
      const response = await apiClient.get<TrackingResult>(
        apiConfig.endpoints.trackingResult(id)
      );
      
      return response.data;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      console.error('❌ Failed to fetch tracking result:', error);
      throw error;
    }
  }

  /**
   * Get tracking statistics
   * @returns Tracking statistics
   */
  async getTrackingStatistics(): Promise<TrackingStatistics> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Fetching tracking statistics');
      return mockDataService.getTrackingStats();
    }

    try {
      const response = await apiClient.get<TrackingStatistics>(
        apiConfig.endpoints.trackingStats
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch tracking statistics:', error);
      throw error;
    }
  }

  /**
   * Search tracking results with specific criteria
   * @param request Search request parameters
   * @returns Paginated search results
   */
  async searchTrackingResults(request: TrackingRequest): Promise<PaginatedResponse<TrackingResult>> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Searching tracking results:', request);
      
      // Filter mock data based on request
      const personId = request.personIds?.[0] || request.globalIds?.[0];
      return mockDataService.getTrackingResults(personId, 10);
    }

    try {
      const response = await apiClient.post<PaginatedResponse<TrackingResult>>(
        apiConfig.endpoints.trackingSearch,
        request
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to search tracking results:', error);
      throw error;
    }
  }

  /**
   * Get person trajectory by person ID
   * @param personId Person ID
   * @param includeTransitions Whether to include camera transitions
   * @returns Person trajectory points
   */
  async getPersonTrajectory(
    personId: string, 
    includeTransitions: boolean = true
  ): Promise<{
    trajectory: TrajectoryPoint[];
    transitions: CameraTransition[];
  }> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Fetching person trajectory:', { personId, includeTransitions });
      
      const mockTracking = mockDataService.generateLiveTracking(personId);
      return {
        trajectory: mockTracking.trajectory,
        transitions: includeTransitions ? mockTracking.cameraTransitions : []
      };
    }

    try {
      const response = await apiClient.get(
        apiConfig.endpoints.personTrajectory(personId),
        { includeTransitions }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch person trajectory:', error);
      throw error;
    }
  }

  /**
   * Get camera transitions
   * @param options Query options
   * @returns Camera transitions
   */
  async getCameraTransitions(options: QueryOptions = {}): Promise<PaginatedResponse<CameraTransition>> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Fetching camera transitions');
      
      // Generate mock transitions
      const transitions = Array.from({ length: options.pageSize || 10 }, (_, i) => ({
        id: `transition-${i + 1}`,
        fromCameraId: `camera_${Math.floor(Math.random() * 4) + 1}`,
        toCameraId: `camera_${Math.floor(Math.random() * 4) + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        confidence: 0.7 + Math.random() * 0.3,
        transitionType: 'direct' as const,
        duration: 2000 + Math.random() * 3000
      }));

      return {
        data: transitions,
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          totalCount: 500,
          totalPages: 50,
          hasNext: true,
          hasPrevious: false
        }
      };
    }

    try {
      const response = await apiClient.get<PaginatedResponse<CameraTransition>>(
        apiConfig.endpoints.cameraTransitions,
        {
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          ...options.filters
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch camera transitions:', error);
      throw error;
    }
  }

  /**
   * Get tracking results by camera
   * @param cameraId Camera ID
   * @param options Query options
   * @returns Tracking results for the camera
   */
  async getTrackingResultsByCamera(
    cameraId: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<TrackingResult>> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        cameraIds: [cameraId]
      }
    };

    return this.getTrackingResults(searchOptions);
  }

  /**
   * Get tracking results within date range
   * @param startTime Start time (ISO string)
   * @param endTime End time (ISO string)
   * @param options Query options
   * @returns Tracking results within date range
   */
  async getTrackingResultsByDateRange(
    startTime: string, 
    endTime: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<TrackingResult>> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        dateRange: { start: startTime, end: endTime }
      }
    };

    return this.getTrackingResults(searchOptions);
  }

  /**
   * Get active tracking results (currently being tracked)
   * @param options Query options
   * @returns Active tracking results
   */
  async getActiveTrackingResults(options: QueryOptions = {}): Promise<PaginatedResponse<TrackingResult>> {
    const searchOptions = {
      ...options,
      filters: {
        ...options.filters,
        status: 'active'
      }
    };

    return this.getTrackingResults(searchOptions);
  }

  /**
   * Export tracking data
   * @param request Export request parameters
   * @param format Export format (csv, json, xlsx)
   * @returns Export file blob
   */
  async exportTrackingData(
    request: TrackingRequest, 
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Exporting tracking data:', { request, format });
      
      const mockData = await mockDataService.getTrackingResults(request.personIds?.[0], 100);
      const content = format === 'json' 
        ? JSON.stringify(mockData, null, 2)
        : this.convertToCSV(mockData.data);
      
      return new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
    }

    try {
      const response = await apiClient.post(
        apiConfig.endpoints.trackingExport,
        { ...request, format },
        { responseType: 'blob' }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to export tracking data:', error);
      throw error;
    }
  }

  /**
   * Get live tracking stream (for WebSocket integration)
   * @param personId Person ID to track
   * @returns Tracking result
   */
  generateLiveTracking(personId: string): TrackingResult {
    if (this.useMocks) {
      return mockDataService.generateLiveTracking(personId);
    }
    
    throw new Error('Live tracking requires WebSocket connection to backend');
  }

  /**
   * Update tracking configuration
   * @param config Tracking configuration
   * @returns Updated configuration
   */
  async updateTrackingConfig(config: any): Promise<any> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Updating tracking config:', config);
      return { ...config, updated: true };
    }

    try {
      const response = await apiClient.put('/tracking/config', config);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update tracking config:', error);
      throw error;
    }
  }

  /**
   * Get tracking performance metrics
   * @returns Performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    if (this.useMocks) {
      // TODO: Replace with actual API call when backend is ready
      console.log('🔀 [MOCK] Fetching tracking performance metrics');
      
      return {
        averageTrackDuration: 45000 + Math.random() * 15000,
        reidentificationAccuracy: 0.85 + Math.random() * 0.1,
        trackingSuccessRate: 0.92 + Math.random() * 0.05,
        averageTransitionTime: 2500 + Math.random() * 1000,
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      const response = await apiClient.get('/tracking/metrics');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch tracking performance metrics:', error);
      throw error;
    }
  }

  /**
   * Helper method to convert tracking data to CSV format
   * @param trackingResults Array of tracking results
   * @returns CSV string
   */
  private convertToCSV(trackingResults: TrackingResult[]): string {
    const headers = [
      'ID', 'Person ID', 'Global ID', 'Status', 'Confidence', 
      'First Seen', 'Last Seen', 'Duration', 'Transitions', 'Trajectory Points'
    ];
    
    const rows = trackingResults.map(track => [
      track.id,
      track.personId,
      track.globalId,
      track.status,
      track.confidence.toFixed(3),
      track.firstSeen,
      track.lastSeen,
      track.totalDuration,
      track.cameraTransitions.length,
      track.trajectory.length
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Switch between mock and live data modes
   * @param useMocks Whether to use mock data
   */
  setMockMode(useMocks: boolean): void {
    this.useMocks = useMocks;
    console.log(`🔀 Tracking API Service switched to ${useMocks ? 'MOCK' : 'LIVE'} mode`);
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
export const trackingAPI = new TrackingAPIService();

// Export service class for custom instances
export { TrackingAPIService };