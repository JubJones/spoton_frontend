export interface TrackingStore {
  // Person tracking
  persons: Record<number, PersonData>;
  selectedPersonId: number | null;
  trackingHistory: TrackingEvent[];
  
  // Cross-camera tracking
  identityMatches: IdentityMatch[];
  cameraTransitions: CameraTransition[];
  
  // Tracking statistics
  trackingStats: {
    totalPersons: number;
    activePersons: number;
    averageTrackingTime: number;
    reidentificationAccuracy: number;
  };
  
  // Trajectory data
  trajectories: Record<number, TrajectoryPoint[]>;
  showTrajectories: boolean;
  trajectoryHistoryLength: number;
}

export interface PersonData {
  globalId: number;
  localTracks: Record<string, number>; // camera_id -> track_id
  firstSeen: string;
  lastSeen: string;
  camerasSeen: string[];
  confidence: number;
  isActive: boolean;
  status: 'tracking' | 'lost' | 'completed';
}

export interface TrackingEvent {
  id: string;
  personId: number;
  cameraId: string;
  eventType: 'detection' | 'reidentification' | 'lost' | 'exit';
  timestamp: string;
  confidence: number;
  metadata?: any;
}

export interface IdentityMatch {
  personId: number;
  fromCamera: string;
  toCamera: string;
  confidence: number;
  timestamp: string;
  method: 'appearance' | 'trajectory' | 'hybrid';
}

export interface CameraTransition {
  personId: number;
  fromCamera: string;
  toCamera: string;
  transitionTime: number;
  path: TrajectoryPoint[];
  confidence: number;
}

export interface TrajectoryPoint {
  personId: number;
  cameraId: string;
  position: { x: number; y: number };
  mapCoords?: { x: number; y: number };
  timestamp: string;
  confidence: number;
}

export const createTrackingStore = (): TrackingStore => ({
  // Person tracking
  persons: {},
  selectedPersonId: null,
  trackingHistory: [],
  
  // Cross-camera tracking
  identityMatches: [],
  cameraTransitions: [],
  
  // Tracking statistics
  trackingStats: {
    totalPersons: 0,
    activePersons: 0,
    averageTrackingTime: 0,
    reidentificationAccuracy: 0,
  },
  
  // Trajectory data
  trajectories: {},
  showTrajectories: true,
  trajectoryHistoryLength: 100,
});