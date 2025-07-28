import { apiClient, ApiResponse } from './api';

export interface PersonIdentity {
  global_id: number;
  local_tracks: Record<string, number>;
  first_seen: string;
  last_seen: string;
  cameras_seen: string[];
  confidence: number;
  status: 'active' | 'inactive' | 'lost';
}

export interface TrackData {
  track_id: number;
  global_id: number;
  camera_id: string;
  bbox: BoundingBox;
  confidence: number;
  map_coords?: [number, number];
  timestamp: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  normalized: boolean;
}

export interface TrackingUpdate {
  person_id: number;
  global_id: number;
  camera_transitions: CameraTransition[];
  current_position: MapCoordinate;
  trajectory_path: MapCoordinate[];
  timestamp: string;
}

export interface CameraTransition {
  person_id: number;
  from_camera: string;
  to_camera: string;
  transition_time: number;
  confidence: number;
  timestamp: string;
}

export interface MapCoordinate {
  x: number;
  y: number;
  coordinate_system: string;
  timestamp: string;
  confidence: number;
}

export interface TrackingStats {
  total_persons: number;
  active_persons: number;
  average_tracking_duration: number;
  reidentification_accuracy: number;
  camera_transitions: number;
  last_updated: string;
}

export interface PersonJourney {
  person_id: number;
  global_id: number;
  journey_path: JourneyPoint[];
  start_time: string;
  end_time: string;
  total_duration: number;
  cameras_visited: string[];
  total_distance: number;
}

export interface JourneyPoint {
  camera_id: string;
  position: MapCoordinate;
  timestamp: string;
  duration: number;
  event_type: 'entry' | 'exit' | 'reidentification';
}

class TrackingAPIService {
  // Get all active persons
  async getActivePersons(): Promise<ApiResponse<PersonIdentity[]>> {
    return apiClient.get('/tracking/persons/active');
  }

  // Get person details by ID
  async getPersonDetails(personId: number): Promise<ApiResponse<PersonIdentity>> {
    return apiClient.get(`/tracking/persons/${personId}`);
  }

  // Get person journey
  async getPersonJourney(personId: number): Promise<ApiResponse<PersonJourney>> {
    return apiClient.get(`/tracking/persons/${personId}/journey`);
  }

  // Get person trajectory
  async getPersonTrajectory(personId: number): Promise<ApiResponse<MapCoordinate[]>> {
    return apiClient.get(`/tracking/persons/${personId}/trajectory`);
  }

  // Search persons by criteria
  async searchPersons(criteria: {
    camera_id?: string;
    start_time?: string;
    end_time?: string;
    min_confidence?: number;
    status?: string;
  }): Promise<ApiResponse<PersonIdentity[]>> {
    return apiClient.get('/tracking/persons/search', criteria);
  }

  // Get tracking statistics
  async getTrackingStats(): Promise<ApiResponse<TrackingStats>> {
    return apiClient.get('/tracking/stats');
  }

  // Get current tracking updates
  async getCurrentTrackingUpdates(): Promise<ApiResponse<TrackingUpdate[]>> {
    return apiClient.get('/tracking/updates/current');
  }

  // Get camera transitions
  async getCameraTransitions(
    startTime?: string,
    endTime?: string
  ): Promise<ApiResponse<CameraTransition[]>> {
    const params: any = {};
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    
    return apiClient.get('/tracking/transitions', params);
  }

  // Get reidentification matches
  async getReidentificationMatches(
    personId?: number,
    confidence?: number
  ): Promise<ApiResponse<any[]>> {
    const params: any = {};
    if (personId) params.person_id = personId;
    if (confidence) params.min_confidence = confidence;
    
    return apiClient.get('/tracking/reidentification', params);
  }

  // Start tracking session
  async startTrackingSession(config: {
    cameras: string[];
    confidence_threshold: number;
    reidentification_enabled: boolean;
  }): Promise<ApiResponse<{ session_id: string }>> {
    return apiClient.post('/tracking/session/start', config);
  }

  // Stop tracking session
  async stopTrackingSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/tracking/session/${sessionId}/stop`);
  }

  // Get tracking session status
  async getSessionStatus(sessionId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/tracking/session/${sessionId}/status`);
  }

  // Update tracking configuration
  async updateTrackingConfig(config: {
    confidence_threshold?: number;
    reidentification_enabled?: boolean;
    max_tracking_duration?: number;
  }): Promise<ApiResponse<void>> {
    return apiClient.post('/tracking/config', config);
  }

  // Export tracking data
  async exportTrackingData(
    startTime: string,
    endTime: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<ApiResponse<Blob>> {
    const params = { start_time: startTime, end_time: endTime, format };
    return apiClient.get('/tracking/export', params);
  }

  // Get tracking performance metrics
  async getTrackingPerformance(): Promise<ApiResponse<any>> {
    return apiClient.get('/tracking/performance');
  }

  // Validate tracking result
  async validateTracking(
    personId: number,
    cameraId: string,
    isValid: boolean
  ): Promise<ApiResponse<void>> {
    return apiClient.post(`/tracking/validate`, {
      person_id: personId,
      camera_id: cameraId,
      is_valid: isValid
    });
  }
}

// Export service instance
export const trackingAPI = new TrackingAPIService();

// Export service class for custom instances
export { TrackingAPIService };