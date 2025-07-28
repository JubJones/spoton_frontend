import { WebSocketMessage, TrackingMessage } from './websocket';

export interface TrackingUpdateData {
  personId: number;
  globalId: number;
  cameraTransitions: CameraTransition[];
  currentPosition: TrackingPosition;
  trajectoryPath: TrajectoryPoint[];
  timestamp: string;
}

export interface CameraTransition {
  fromCamera: string;
  toCamera: string;
  transitionTime: number;
  confidence: number;
  timestamp: string;
}

export interface TrackingPosition {
  x: number;
  y: number;
  coordinateSystem: string;
  confidence: number;
  cameraId: string;
  timestamp: string;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: string;
  confidence: number;
  cameraId: string;
  globalId: number;
}

export interface PersonIdentity {
  globalId: number;
  localTracks: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  camerasSeen: string[];
  confidence: number;
  status: 'active' | 'inactive' | 'lost';
  currentCamera?: string;
}

export interface TrackingStatistics {
  totalPersons: number;
  activePersons: number;
  averageTrackingDuration: number;
  reidentificationAccuracy: number;
  cameraTransitions: number;
  lastUpdated: string;
}

export type TrackingUpdateHandler = (data: TrackingUpdateData) => void;
export type PersonUpdateHandler = (person: PersonIdentity) => void;
export type TransitionHandler = (transition: CameraTransition) => void;
export type TrackingErrorHandler = (error: Error, personId?: number) => void;

class TrackingHandlerService {
  private trackingHandlers: TrackingUpdateHandler[] = [];
  private personHandlers: PersonUpdateHandler[] = [];
  private transitionHandlers: TransitionHandler[] = [];
  private errorHandlers: TrackingErrorHandler[] = [];
  
  private persons: Map<number, PersonIdentity> = new Map();
  private trajectories: Map<number, TrajectoryPoint[]> = new Map();
  private cameraTransitions: CameraTransition[] = [];
  private statistics: TrackingStatistics = this.initializeStatistics();
  
  private readonly maxTrajectoryPoints = 100;
  private readonly maxTransitionHistory = 50;

  // Process WebSocket tracking message
  async processTrackingMessage(message: WebSocketMessage): Promise<void> {
    if (message.type !== 'tracking_update') {
      return;
    }

    try {
      const trackingMessage = message as TrackingMessage;
      const trackingData = this.processTrackingData(trackingMessage.data);
      
      // Update person identity
      this.updatePersonIdentity(trackingData);
      
      // Update trajectories
      this.updateTrajectories(trackingData);
      
      // Process camera transitions
      this.processCameraTransitions(trackingData);
      
      // Update statistics
      this.updateStatistics();
      
      // Notify handlers
      this.notifyTrackingHandlers(trackingData);
      
    } catch (error) {
      this.handleTrackingError(error as Error, (message as TrackingMessage).data.person_id);
    }
  }

  // Process tracking data from WebSocket message
  private processTrackingData(data: TrackingMessage['data']): TrackingUpdateData {
    const cameraTransitions: CameraTransition[] = data.camera_transitions.map(transition => ({
      fromCamera: transition.from_camera,
      toCamera: transition.to_camera,
      transitionTime: transition.transition_time,
      confidence: transition.confidence,
      timestamp: new Date().toISOString(),
    }));

    const currentPosition: TrackingPosition = {
      x: data.current_position.x,
      y: data.current_position.y,
      coordinateSystem: data.current_position.coordinate_system,
      confidence: data.current_position.confidence,
      cameraId: this.getCurrentCameraForPerson(data.person_id),
      timestamp: new Date().toISOString(),
    };

    const trajectoryPath: TrajectoryPoint[] = data.trajectory_path.map(point => ({
      x: point.x,
      y: point.y,
      timestamp: point.timestamp,
      confidence: point.confidence,
      cameraId: this.getCurrentCameraForPerson(data.person_id),
      globalId: data.global_id,
    }));

    return {
      personId: data.person_id,
      globalId: data.global_id,
      cameraTransitions,
      currentPosition,
      trajectoryPath,
      timestamp: new Date().toISOString(),
    };
  }

  // Update person identity
  private updatePersonIdentity(data: TrackingUpdateData): void {
    const existingPerson = this.persons.get(data.globalId);
    const now = new Date().toISOString();
    
    if (existingPerson) {
      // Update existing person
      existingPerson.lastSeen = now;
      existingPerson.confidence = Math.max(existingPerson.confidence, data.currentPosition.confidence);
      existingPerson.status = 'active';
      existingPerson.currentCamera = data.currentPosition.cameraId;
      
      // Add new cameras seen
      if (data.currentPosition.cameraId && !existingPerson.camerasSeen.includes(data.currentPosition.cameraId)) {
        existingPerson.camerasSeen.push(data.currentPosition.cameraId);
      }
      
      // Update local tracks
      if (data.currentPosition.cameraId) {
        existingPerson.localTracks[data.currentPosition.cameraId] = data.personId;
      }
    } else {
      // Create new person
      const newPerson: PersonIdentity = {
        globalId: data.globalId,
        localTracks: { [data.currentPosition.cameraId]: data.personId },
        firstSeen: now,
        lastSeen: now,
        camerasSeen: [data.currentPosition.cameraId],
        confidence: data.currentPosition.confidence,
        status: 'active',
        currentCamera: data.currentPosition.cameraId,
      };
      
      this.persons.set(data.globalId, newPerson);
    }
    
    // Notify person handlers
    const updatedPerson = this.persons.get(data.globalId);
    if (updatedPerson) {
      this.notifyPersonHandlers(updatedPerson);
    }
  }

  // Update trajectories
  private updateTrajectories(data: TrackingUpdateData): void {
    const existingTrajectory = this.trajectories.get(data.globalId) || [];
    
    // Add new trajectory points
    const newPoints = data.trajectoryPath.map(point => ({
      ...point,
      globalId: data.globalId,
    }));
    
    const updatedTrajectory = [...existingTrajectory, ...newPoints];
    
    // Limit trajectory points
    if (updatedTrajectory.length > this.maxTrajectoryPoints) {
      updatedTrajectory.splice(0, updatedTrajectory.length - this.maxTrajectoryPoints);
    }
    
    this.trajectories.set(data.globalId, updatedTrajectory);
  }

  // Process camera transitions
  private processCameraTransitions(data: TrackingUpdateData): void {
    data.cameraTransitions.forEach(transition => {
      // Add to transition history
      this.cameraTransitions.push(transition);
      
      // Limit transition history
      if (this.cameraTransitions.length > this.maxTransitionHistory) {
        this.cameraTransitions.shift();
      }
      
      // Notify transition handlers
      this.notifyTransitionHandlers(transition);
    });
  }

  // Update statistics
  private updateStatistics(): void {
    const activePersons = Array.from(this.persons.values()).filter(p => p.status === 'active');
    const now = new Date().toISOString();
    
    // Calculate average tracking duration
    let totalDuration = 0;
    let personCount = 0;
    
    this.persons.forEach(person => {
      if (person.status === 'active') {
        const duration = new Date(person.lastSeen).getTime() - new Date(person.firstSeen).getTime();
        totalDuration += duration;
        personCount++;
      }
    });
    
    this.statistics = {
      totalPersons: this.persons.size,
      activePersons: activePersons.length,
      averageTrackingDuration: personCount > 0 ? totalDuration / personCount : 0,
      reidentificationAccuracy: this.calculateReidentificationAccuracy(),
      cameraTransitions: this.cameraTransitions.length,
      lastUpdated: now,
    };
  }

  // Calculate reidentification accuracy
  private calculateReidentificationAccuracy(): number {
    const reidentifications = this.cameraTransitions.filter(t => t.confidence > 0.7);
    return this.cameraTransitions.length > 0 ? reidentifications.length / this.cameraTransitions.length : 0;
  }

  // Get current camera for person
  private getCurrentCameraForPerson(personId: number): string {
    // Find the person by local track ID
    for (const [, person] of this.persons) {
      for (const [cameraId, localTrackId] of Object.entries(person.localTracks)) {
        if (localTrackId === personId) {
          return cameraId;
        }
      }
    }
    return 'unknown';
  }

  // Initialize statistics
  private initializeStatistics(): TrackingStatistics {
    return {
      totalPersons: 0,
      activePersons: 0,
      averageTrackingDuration: 0,
      reidentificationAccuracy: 0,
      cameraTransitions: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Notify handlers
  private notifyTrackingHandlers(data: TrackingUpdateData): void {
    this.trackingHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in tracking handler:', error);
      }
    });
  }

  private notifyPersonHandlers(person: PersonIdentity): void {
    this.personHandlers.forEach(handler => {
      try {
        handler(person);
      } catch (error) {
        console.error('Error in person handler:', error);
      }
    });
  }

  private notifyTransitionHandlers(transition: CameraTransition): void {
    this.transitionHandlers.forEach(handler => {
      try {
        handler(transition);
      } catch (error) {
        console.error('Error in transition handler:', error);
      }
    });
  }

  // Handle errors
  private handleTrackingError(error: Error, personId?: number): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, personId);
      } catch (e) {
        console.error('Error in tracking error handler:', e);
      }
    });
  }

  // Public API
  onTrackingUpdate(handler: TrackingUpdateHandler): void {
    this.trackingHandlers.push(handler);
  }

  offTrackingUpdate(handler: TrackingUpdateHandler): void {
    const index = this.trackingHandlers.indexOf(handler);
    if (index > -1) {
      this.trackingHandlers.splice(index, 1);
    }
  }

  onPersonUpdate(handler: PersonUpdateHandler): void {
    this.personHandlers.push(handler);
  }

  offPersonUpdate(handler: PersonUpdateHandler): void {
    const index = this.personHandlers.indexOf(handler);
    if (index > -1) {
      this.personHandlers.splice(index, 1);
    }
  }

  onTransition(handler: TransitionHandler): void {
    this.transitionHandlers.push(handler);
  }

  offTransition(handler: TransitionHandler): void {
    const index = this.transitionHandlers.indexOf(handler);
    if (index > -1) {
      this.transitionHandlers.splice(index, 1);
    }
  }

  onError(handler: TrackingErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: TrackingErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  // Data access
  getPersons(): Map<number, PersonIdentity> {
    return new Map(this.persons);
  }

  getPerson(globalId: number): PersonIdentity | undefined {
    return this.persons.get(globalId);
  }

  getTrajectories(): Map<number, TrajectoryPoint[]> {
    return new Map(this.trajectories);
  }

  getTrajectory(globalId: number): TrajectoryPoint[] {
    return this.trajectories.get(globalId) || [];
  }

  getCameraTransitions(): CameraTransition[] {
    return [...this.cameraTransitions];
  }

  getStatistics(): TrackingStatistics {
    return { ...this.statistics };
  }

  // Cleanup
  cleanup(): void {
    this.persons.clear();
    this.trajectories.clear();
    this.cameraTransitions.splice(0);
    this.statistics = this.initializeStatistics();
  }

  // Person management
  markPersonAsLost(globalId: number): void {
    const person = this.persons.get(globalId);
    if (person) {
      person.status = 'lost';
      person.lastSeen = new Date().toISOString();
      this.notifyPersonHandlers(person);
    }
  }

  markPersonAsInactive(globalId: number): void {
    const person = this.persons.get(globalId);
    if (person) {
      person.status = 'inactive';
      person.lastSeen = new Date().toISOString();
      this.notifyPersonHandlers(person);
    }
  }

  removeOldPersons(maxAge: number): void {
    const now = Date.now();
    const personsToRemove: number[] = [];
    
    this.persons.forEach((person, globalId) => {
      const lastSeenTime = new Date(person.lastSeen).getTime();
      if (now - lastSeenTime > maxAge) {
        personsToRemove.push(globalId);
      }
    });
    
    personsToRemove.forEach(globalId => {
      this.persons.delete(globalId);
      this.trajectories.delete(globalId);
    });
  }
}

// Export service instance
export const trackingHandler = new TrackingHandlerService();

// Export service class for custom instances
export { TrackingHandlerService };