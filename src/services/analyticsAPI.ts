// TODO: BACKEND INTEGRATION REQUIRED
// This file implements the Analytics API service with mock data for development.
// Once backend is available, update the implementation to use actual API endpoints.
// See PLANNING.md for backend integration requirements.

import { apiClient } from './api';
import { 
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
} from './types/api';
import { mockDataService } from './mock/mockDataService';
import { apiConfig, shouldUseMocks } from './config/apiConfig';

export class AnalyticsAPIService {
  private useMocks = shouldUseMocks();

  constructor() {
    console.log(`📊 Analytics API Service initialized (${this.useMocks ? 'MOCK' : 'LIVE'} mode)`);
    
    if (this.useMocks) {
      console.warn('⚠️  USING MOCK DATA - Switch to actual backend when available');
    }
  }

  /**
   * Get real-time analytics data
   * @param filters Analytics filters
   * @returns Real-time analytics data
   */
  async getRealTimeAnalytics(filters?: AnalyticsFilter): Promise<AnalyticsData> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching real-time analytics:', filters);
      return mockDataService.getRealTimeAnalytics(filters);
    }

    try {
      const response = await apiClient.get<AnalyticsData>(
        apiConfig.endpoints.analytics.realTime,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch real-time analytics:', error);
      throw error;
    }
  }

  /**
   * Get historical analytics data
   * @param timeRange Time range for historical data
   * @param filters Analytics filters
   * @returns Historical analytics data
   */
  async getHistoricalAnalytics(
    timeRange: AnalyticsTimeRange,
    filters?: AnalyticsFilter
  ): Promise<HistoricalData> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching historical analytics:', { timeRange, filters });
      return mockDataService.getHistoricalAnalytics(timeRange, filters);
    }

    try {
      const response = await apiClient.get<HistoricalData>(
        apiConfig.endpoints.analytics.historical,
        { 
          params: { 
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            ...filters 
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch historical analytics:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   * @returns System performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching performance metrics');
      return mockDataService.getPerformanceMetrics();
    }

    try {
      const response = await apiClient.get<PerformanceMetrics>(
        apiConfig.endpoints.analytics.performance
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   * @returns System health data
   */
  async getSystemHealth(): Promise<SystemHealth> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching system health');
      return mockDataService.getSystemHealth();
    }

    try {
      const response = await apiClient.get<SystemHealth>(
        apiConfig.endpoints.analytics.health
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw error;
    }
  }

  /**
   * Get person journey analytics
   * @param personId Person ID
   * @param timeRange Time range
   * @returns Person journey data
   */
  async getPersonJourney(
    personId: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<PersonJourney> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching person journey:', { personId, timeRange });
      return mockDataService.getPersonJourney(personId, timeRange);
    }

    try {
      const response = await apiClient.get<PersonJourney>(
        `${apiConfig.endpoints.analytics.journey}/${personId}`,
        { params: timeRange }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch person journey:', error);
      throw error;
    }
  }

  /**
   * Get behavioral analytics
   * @param filters Analytics filters
   * @returns Behavioral analytics data
   */
  async getBehavioralAnalytics(filters?: AnalyticsFilter): Promise<BehavioralAnalytics> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching behavioral analytics:', filters);
      return mockDataService.getBehavioralAnalytics(filters);
    }

    try {
      const response = await apiClient.get<BehavioralAnalytics>(
        apiConfig.endpoints.analytics.behavioral,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch behavioral analytics:', error);
      throw error;
    }
  }

  /**
   * Get dwell time analysis
   * @param filters Analytics filters
   * @returns Dwell time analysis data
   */
  async getDwellTimeAnalysis(filters?: AnalyticsFilter): Promise<DwellTimeAnalysis> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching dwell time analysis:', filters);
      return mockDataService.getDwellTimeAnalysis(filters);
    }

    try {
      const response = await apiClient.get<DwellTimeAnalysis>(
        apiConfig.endpoints.analytics.dwellTime,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dwell time analysis:', error);
      throw error;
    }
  }

  /**
   * Get traffic pattern analysis
   * @param timeRange Time range
   * @param filters Analytics filters
   * @returns Traffic pattern data
   */
  async getTrafficPatterns(
    timeRange: AnalyticsTimeRange,
    filters?: AnalyticsFilter
  ): Promise<TrafficPattern[]> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching traffic patterns:', { timeRange, filters });
      return mockDataService.getTrafficPatterns(timeRange, filters);
    }

    try {
      const response = await apiClient.get<TrafficPattern[]>(
        apiConfig.endpoints.analytics.trafficPatterns,
        { 
          params: { 
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            ...filters 
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch traffic patterns:', error);
      throw error;
    }
  }

  /**
   * Get heatmap data
   * @param timeRange Time range
   * @param filters Analytics filters
   * @returns Heatmap data
   */
  async getHeatmapData(
    timeRange: AnalyticsTimeRange,
    filters?: AnalyticsFilter
  ): Promise<HeatmapData> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Fetching heatmap data:', { timeRange, filters });
      return mockDataService.getHeatmapData(timeRange, filters);
    }

    try {
      const response = await apiClient.get<HeatmapData>(
        apiConfig.endpoints.analytics.heatmap,
        { 
          params: { 
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            ...filters 
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   * @param format Export format
   * @param filters Analytics filters
   * @param timeRange Time range
   * @returns Export response
   */
  async exportAnalytics(
    format: 'csv' | 'json' | 'pdf',
    filters?: AnalyticsFilter,
    timeRange?: AnalyticsTimeRange
  ): Promise<Blob> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Exporting analytics data:', { format, filters, timeRange });
      return mockDataService.exportAnalytics(format, filters, timeRange);
    }

    try {
      const response = await apiClient.post<Blob>(
        apiConfig.endpoints.analytics.export,
        {
          format,
          filters,
          timeRange
        },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  /**
   * Generate analytics report
   * @param reportType Report type
   * @param filters Analytics filters
   * @param timeRange Time range
   * @returns Generated report
   */
  async generateReport(
    reportType: 'summary' | 'detailed' | 'performance' | 'security',
    filters?: AnalyticsFilter,
    timeRange?: AnalyticsTimeRange
  ): Promise<ApiResponse<any>> {
    if (this.useMocks) {
      console.log('📊 [MOCK] Generating analytics report:', { reportType, filters, timeRange });
      return mockDataService.generateAnalyticsReport(reportType, filters, timeRange);
    }

    try {
      const response = await apiClient.post<ApiResponse<any>>(
        apiConfig.endpoints.analytics.report,
        {
          reportType,
          filters,
          timeRange
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to generate analytics report:', error);
      throw error;
    }
  }

  /**
   * Set mock mode (for development and testing)
   * @param useMocks Whether to use mock data
   */
  setMockMode(useMocks: boolean): void {
    this.useMocks = useMocks;
    console.log(`📊 Analytics API Service mode changed to: ${useMocks ? 'MOCK' : 'LIVE'}`);
  }
}

// Export singleton instance
export const analyticsAPI = new AnalyticsAPIService();