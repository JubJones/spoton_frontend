import { FrameData, CameraFrameData } from './frameHandler';

export interface SyncConfig {
  maxFrameAge: number;      // Maximum age of frame in milliseconds
  syncWindow: number;       // Time window for synchronization in milliseconds
  maxBufferSize: number;    // Maximum number of frames to buffer per camera
  targetFPS: number;        // Target frames per second for synchronization
  enableFrameSkipping: boolean; // Whether to skip frames to maintain sync
}

export interface SyncedFrame {
  frameIndex: number;
  timestamp: string;
  cameras: Record<string, CameraFrameData>;
  syncAccuracy: number;     // 0-1, how well synchronized the frame is
  missedCameras: string[];  // Cameras that didn't provide data for this frame
}

export interface SyncStatistics {
  totalFrames: number;
  syncedFrames: number;
  droppedFrames: number;
  averageSyncAccuracy: number;
  averageDelay: number;
  cameraStatistics: Record<string, CameraStats>;
}

export interface CameraStats {
  framesReceived: number;
  framesDropped: number;
  averageDelay: number;
  lastFrameTime: string;
  isActive: boolean;
}

export type SyncedFrameHandler = (frame: SyncedFrame) => void;
export type SyncErrorHandler = (error: Error) => void;

class FrameSynchronizer {
  private config: SyncConfig;
  private frameBuffers: Map<string, FrameData[]> = new Map();
  private syncedFrameHandlers: SyncedFrameHandler[] = [];
  private errorHandlers: SyncErrorHandler[] = [];
  private statistics: SyncStatistics = {
    totalFrames: 0,
    syncedFrames: 0,
    droppedFrames: 0,
    averageSyncAccuracy: 0,
    averageDelay: 0,
    cameraStatistics: {},
  };
  private lastSyncTime = 0;
  private frameTimeout: number | null = null;
  private isRunning = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      maxFrameAge: 5000,        // 5 seconds
      syncWindow: 100,          // 100ms
      maxBufferSize: 30,        // 30 frames per camera
      targetFPS: 30,            // 30 FPS
      enableFrameSkipping: true,
      ...config,
    };
  }

  // Start frame synchronization
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleSync();
  }

  // Stop frame synchronization
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.frameTimeout) {
      clearTimeout(this.frameTimeout);
      this.frameTimeout = null;
    }
  }

  // Add frame to synchronization buffer
  addFrame(frameData: FrameData): void {
    if (!this.isRunning) return;

    this.statistics.totalFrames++;
    
    // Process each camera in the frame
    Object.entries(frameData.cameras).forEach(([cameraId, cameraData]) => {
      this.addCameraFrame(cameraId, frameData, cameraData);
    });

    // Update statistics
    this.updateStatistics();
  }

  // Add camera frame to buffer
  private addCameraFrame(cameraId: string, frameData: FrameData, cameraData: CameraFrameData): void {
    // Initialize buffer for camera if not exists
    if (!this.frameBuffers.has(cameraId)) {
      this.frameBuffers.set(cameraId, []);
      this.statistics.cameraStatistics[cameraId] = {
        framesReceived: 0,
        framesDropped: 0,
        averageDelay: 0,
        lastFrameTime: '',
        isActive: true,
      };
    }

    const buffer = this.frameBuffers.get(cameraId)!;
    const stats = this.statistics.cameraStatistics[cameraId];

    // Update camera statistics
    stats.framesReceived++;
    stats.lastFrameTime = frameData.timestampUtc;
    stats.isActive = true;

    // Check if frame is too old
    const frameTime = new Date(frameData.timestampUtc).getTime();
    const currentTime = Date.now();
    const frameAge = currentTime - frameTime;

    if (frameAge > this.config.maxFrameAge) {
      stats.framesDropped++;
      this.statistics.droppedFrames++;
      return;
    }

    // Create frame entry with camera data
    const frameEntry: FrameData = {
      ...frameData,
      cameras: { [cameraId]: cameraData }
    };

    // Add to buffer
    buffer.push(frameEntry);

    // Remove old frames from buffer
    this.cleanupBuffer(cameraId);

    // Sort buffer by frame index
    buffer.sort((a, b) => a.frameIndex - b.frameIndex);
  }

  // Clean up old frames from buffer
  private cleanupBuffer(cameraId: string): void {
    const buffer = this.frameBuffers.get(cameraId)!;
    const currentTime = Date.now();
    const stats = this.statistics.cameraStatistics[cameraId];

    // Remove frames older than maxFrameAge
    let removed = 0;
    while (buffer.length > 0) {
      const frameTime = new Date(buffer[0].timestampUtc).getTime();
      const age = currentTime - frameTime;
      
      if (age > this.config.maxFrameAge) {
        buffer.shift();
        removed++;
      } else {
        break;
      }
    }

    // Remove excess frames if buffer is too large
    while (buffer.length > this.config.maxBufferSize) {
      buffer.shift();
      removed++;
    }

    // Update statistics
    stats.framesDropped += removed;
    this.statistics.droppedFrames += removed;
  }

  // Schedule next synchronization
  private scheduleSync(): void {
    if (!this.isRunning) return;

    const syncInterval = 1000 / this.config.targetFPS;
    this.frameTimeout = window.setTimeout(() => {
      this.performSync();
      this.scheduleSync();
    }, syncInterval);
  }

  // Perform frame synchronization
  private performSync(): void {
    try {
      const syncedFrame = this.createSyncedFrame();
      
      if (syncedFrame) {
        this.statistics.syncedFrames++;
        this.lastSyncTime = Date.now();
        
        // Notify handlers
        this.notifySyncedFrameHandlers(syncedFrame);
        
        // Update sync accuracy statistics
        this.updateSyncAccuracy(syncedFrame.syncAccuracy);
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Sync error'));
    }
  }

  // Create synchronized frame
  private createSyncedFrame(): SyncedFrame | null {
    const allCameras = Array.from(this.frameBuffers.keys());
    
    if (allCameras.length === 0) {
      return null;
    }

    // Find the best frame index to synchronize
    const targetFrameIndex = this.findBestFrameIndex();
    
    if (targetFrameIndex === null) {
      return null;
    }

    // Collect frames for synchronization
    const syncedCameras: Record<string, CameraFrameData> = {};
    const missedCameras: string[] = [];
    let totalDelay = 0;
    let framesToSync = 0;

    allCameras.forEach(cameraId => {
      const buffer = this.frameBuffers.get(cameraId)!;
      const frame = this.findBestFrameForSync(buffer, targetFrameIndex);
      
      if (frame) {
        const cameraData = frame.cameras[cameraId];
        if (cameraData) {
          syncedCameras[cameraId] = cameraData;
          
          // Calculate delay
          const frameTime = new Date(frame.timestampUtc).getTime();
          const delay = Date.now() - frameTime;
          totalDelay += delay;
          framesToSync++;
        } else {
          missedCameras.push(cameraId);
        }
      } else {
        missedCameras.push(cameraId);
      }
    });

    // Check if we have enough cameras for synchronization
    if (Object.keys(syncedCameras).length === 0) {
      return null;
    }

    // Calculate sync accuracy
    const syncAccuracy = (allCameras.length - missedCameras.length) / allCameras.length;
    
    // Calculate average delay
    const averageDelay = framesToSync > 0 ? totalDelay / framesToSync : 0;

    // Create synced frame
    const syncedFrame: SyncedFrame = {
      frameIndex: targetFrameIndex,
      timestamp: new Date().toISOString(),
      cameras: syncedCameras,
      syncAccuracy,
      missedCameras,
    };

    // Remove used frames from buffers
    this.removeUsedFrames(targetFrameIndex);

    return syncedFrame;
  }

  // Find the best frame index for synchronization
  private findBestFrameIndex(): number | null {
    const allFrameIndices = new Set<number>();
    
    // Collect all frame indices
    this.frameBuffers.forEach(buffer => {
      buffer.forEach(frame => {
        allFrameIndices.add(frame.frameIndex);
      });
    });

    if (allFrameIndices.size === 0) {
      return null;
    }

    // Find frame index with best camera coverage
    let bestFrameIndex: number | null = null;
    let bestCoverage = 0;

    Array.from(allFrameIndices).forEach(frameIndex => {
      let coverage = 0;
      
      this.frameBuffers.forEach(buffer => {
        const hasFrame = buffer.some(frame => {
          const timeDiff = Math.abs(frame.frameIndex - frameIndex);
          return timeDiff <= this.config.syncWindow / 33.33; // Assuming 30 FPS
        });
        
        if (hasFrame) coverage++;
      });

      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestFrameIndex = frameIndex;
      }
    });

    return bestFrameIndex;
  }

  // Find best frame for synchronization
  private findBestFrameForSync(buffer: FrameData[], targetFrameIndex: number): FrameData | null {
    if (buffer.length === 0) return null;

    // Find exact match first
    const exactMatch = buffer.find(frame => frame.frameIndex === targetFrameIndex);
    if (exactMatch) return exactMatch;

    // Find closest frame within sync window
    let closestFrame: FrameData | null = null;
    let closestDistance = Infinity;

    buffer.forEach(frame => {
      const distance = Math.abs(frame.frameIndex - targetFrameIndex);
      const timeDiff = distance * (1000 / this.config.targetFPS);
      
      if (timeDiff <= this.config.syncWindow && distance < closestDistance) {
        closestDistance = distance;
        closestFrame = frame;
      }
    });

    return closestFrame;
  }

  // Remove used frames from buffers
  private removeUsedFrames(frameIndex: number): void {
    this.frameBuffers.forEach((buffer, cameraId) => {
      const frameToRemove = buffer.findIndex(frame => frame.frameIndex === frameIndex);
      if (frameToRemove !== -1) {
        buffer.splice(frameToRemove, 1);
      }

      // Remove older frames
      if (this.config.enableFrameSkipping) {
        const oldFrames = buffer.filter(frame => frame.frameIndex < frameIndex);
        oldFrames.forEach(() => {
          const index = buffer.findIndex(frame => frame.frameIndex < frameIndex);
          if (index !== -1) {
            buffer.splice(index, 1);
            this.statistics.cameraStatistics[cameraId].framesDropped++;
          }
        });
      }
    });
  }

  // Update statistics
  private updateStatistics(): void {
    // Update camera activity status
    const currentTime = Date.now();
    
    Object.entries(this.statistics.cameraStatistics).forEach(([cameraId, stats]) => {
      const lastFrameTime = new Date(stats.lastFrameTime).getTime();
      const timeSinceLastFrame = currentTime - lastFrameTime;
      
      // Consider camera inactive if no frame received in last 5 seconds
      stats.isActive = timeSinceLastFrame < 5000;
    });
  }

  // Update sync accuracy
  private updateSyncAccuracy(accuracy: number): void {
    const currentAverage = this.statistics.averageSyncAccuracy;
    const totalSynced = this.statistics.syncedFrames;
    
    this.statistics.averageSyncAccuracy = 
      (currentAverage * (totalSynced - 1) + accuracy) / totalSynced;
  }

  // Handle errors
  private handleError(error: Error): void {
    console.error('Frame synchronization error:', error);
    
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in sync error handler:', e);
      }
    });
  }

  // Notify handlers
  private notifySyncedFrameHandlers(frame: SyncedFrame): void {
    this.syncedFrameHandlers.forEach(handler => {
      try {
        handler(frame);
      } catch (error) {
        console.error('Error in synced frame handler:', error);
      }
    });
  }

  // Public API
  onSyncedFrame(handler: SyncedFrameHandler): void {
    this.syncedFrameHandlers.push(handler);
  }

  offSyncedFrame(handler: SyncedFrameHandler): void {
    const index = this.syncedFrameHandlers.indexOf(handler);
    if (index > -1) {
      this.syncedFrameHandlers.splice(index, 1);
    }
  }

  onError(handler: SyncErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: SyncErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  // Get statistics
  getStatistics(): SyncStatistics {
    return { ...this.statistics };
  }

  // Get buffer status
  getBufferStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    
    this.frameBuffers.forEach((buffer, cameraId) => {
      status[cameraId] = buffer.length;
    });
    
    return status;
  }

  // Get sync quality
  getSyncQuality(): {
    overall: 'excellent' | 'good' | 'poor' | 'critical';
    accuracy: number;
    delay: number;
    activeCameras: number;
    totalCameras: number;
  } {
    const stats = this.statistics;
    const activeCameras = Object.values(stats.cameraStatistics)
      .filter(s => s.isActive).length;
    const totalCameras = Object.keys(stats.cameraStatistics).length;
    
    let overall: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';
    
    if (stats.averageSyncAccuracy < 0.5 || activeCameras < totalCameras * 0.5) {
      overall = 'critical';
    } else if (stats.averageSyncAccuracy < 0.7 || activeCameras < totalCameras * 0.7) {
      overall = 'poor';
    } else if (stats.averageSyncAccuracy < 0.9 || activeCameras < totalCameras * 0.9) {
      overall = 'good';
    }
    
    return {
      overall,
      accuracy: stats.averageSyncAccuracy,
      delay: stats.averageDelay,
      activeCameras,
      totalCameras,
    };
  }

  // Update configuration
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get configuration
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  // Reset synchronizer
  reset(): void {
    this.frameBuffers.clear();
    this.statistics = {
      totalFrames: 0,
      syncedFrames: 0,
      droppedFrames: 0,
      averageSyncAccuracy: 0,
      averageDelay: 0,
      cameraStatistics: {},
    };
    this.lastSyncTime = 0;
  }

  // Manual sync trigger
  syncNow(): SyncedFrame | null {
    return this.createSyncedFrame();
  }
}

// Export service instance
export const frameSynchronizer = new FrameSynchronizer();

// Export service class for custom instances
export { FrameSynchronizer };