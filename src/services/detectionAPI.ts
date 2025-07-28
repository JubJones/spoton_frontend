import { apiClient, ApiResponse } from './api';

export interface DetectionResponse {
  id: string;
  camera_id: string;
  bbox: BoundingBox;
  confidence: number;
  timestamp: string;
  class_id: number;
  person_crop?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  normalized: boolean;
}

export interface DetectionStats {
  total_detections: number;
  detections_per_camera: Record<string, number>;
  average_confidence: number;
  detection_rate: number;
  last_updated: string;
}

export interface CameraFrame {
  camera_id: string;
  frame_index: number;
  image_data: string; // base64 encoded image
  detections: DetectionResponse[];
  timestamp: string;
}

export interface FrameDataResponse {
  frame_index: number;
  scene_id: string;
  timestamp_utc: string;
  cameras: Record<string, CameraFrame>;
}

class DetectionAPIService {
  // Get current detections for all cameras
  async getCurrentDetections(): Promise<ApiResponse<DetectionResponse[]>> {
    return apiClient.get('/detections/current');
  }

  // Get detections for a specific camera
  async getCameraDetections(cameraId: string): Promise<ApiResponse<DetectionResponse[]>> {
    return apiClient.get(`/detections/camera/${cameraId}`);
  }

  // Get detection statistics
  async getDetectionStats(): Promise<ApiResponse<DetectionStats>> {
    return apiClient.get('/detections/stats');
  }

  // Get historical detections
  async getHistoricalDetections(
    startTime: string,
    endTime: string,
    cameraId?: string
  ): Promise<ApiResponse<DetectionResponse[]>> {
    const params: any = { start_time: startTime, end_time: endTime };
    if (cameraId) params.camera_id = cameraId;
    
    return apiClient.get('/detections/history', params);
  }

  // Get frame data for a specific frame
  async getFrameData(frameIndex: number, sceneId: string): Promise<ApiResponse<FrameDataResponse>> {
    return apiClient.get(`/frames/${sceneId}/${frameIndex}`);
  }

  // Update detection confidence threshold
  async updateConfidenceThreshold(threshold: number): Promise<ApiResponse<void>> {
    return apiClient.post('/detections/threshold', { threshold });
  }

  // Export detection data
  async exportDetectionData(
    startTime: string,
    endTime: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<ApiResponse<Blob>> {
    const params = { start_time: startTime, end_time: endTime, format };
    return apiClient.get('/detections/export', params);
  }

  // Get detection heatmap data
  async getDetectionHeatmap(
    startTime: string,
    endTime: string,
    cameraId?: string
  ): Promise<ApiResponse<any>> {
    const params: any = { start_time: startTime, end_time: endTime };
    if (cameraId) params.camera_id = cameraId;
    
    return apiClient.get('/detections/heatmap', params);
  }

  // Validate detection data
  async validateDetection(detectionId: string, isValid: boolean): Promise<ApiResponse<void>> {
    return apiClient.post(`/detections/${detectionId}/validate`, { is_valid: isValid });
  }

  // Get detection performance metrics
  async getPerformanceMetrics(): Promise<ApiResponse<any>> {
    return apiClient.get('/detections/performance');
  }
}

// Export service instance
export const detectionAPI = new DetectionAPIService();

// Export service class for custom instances
export { DetectionAPIService };