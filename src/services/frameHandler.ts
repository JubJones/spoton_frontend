import { WebSocketMessage, FrameMessage } from './websocket';

export interface FrameData {
  frameIndex: number;
  sceneId: string;
  timestampUtc: string;
  cameras: Record<string, CameraFrameData>;
}

export interface CameraFrameData {
  cameraId: string;
  imageBlob: Blob;
  imageUrl: string;
  tracks: TrackData[];
  metadata: FrameMetadata;
}

export interface TrackData {
  trackId: number;
  globalId: number;
  bboxXyxy: [number, number, number, number];
  confidence: number;
  classId: number;
  mapCoords?: [number, number];
}

export interface FrameMetadata {
  width: number;
  height: number;
  format: string;
  quality: number;
  timestamp: string;
}

export interface FrameHandlerConfig {
  maxFrameSize: number;
  supportedFormats: string[];
  enableMetadataExtraction: boolean;
  frameBufferSize: number;
  compressionQuality: number;
}

export type FrameHandler = (frameData: FrameData) => void;
export type FrameErrorHandler = (error: Error, frameIndex?: number) => void;

class FrameHandlerService {
  private config: FrameHandlerConfig;
  private frameHandlers: FrameHandler[] = [];
  private errorHandlers: FrameErrorHandler[] = [];
  private frameBuffer: Map<number, FrameData> = new Map();
  private droppedFrames = 0;
  private processedFrames = 0;
  private lastFrameTime = 0;
  private fpsCalculator = new FPSCalculator();

  constructor(config: Partial<FrameHandlerConfig> = {}) {
    this.config = {
      maxFrameSize: 5 * 1024 * 1024, // 5MB
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      enableMetadataExtraction: true,
      frameBufferSize: 10,
      compressionQuality: 0.8,
      ...config,
    };
  }

  // Process WebSocket frame message
  async processFrameMessage(message: WebSocketMessage): Promise<void> {
    if (message.type !== 'frame_data') {
      return;
    }

    try {
      const frameMessage = message as FrameMessage;
      const frameData = await this.processFrameData(frameMessage.data);
      
      // Add to buffer
      this.addToFrameBuffer(frameData);
      
      // Notify handlers
      this.notifyFrameHandlers(frameData);
      
      // Update statistics
      this.updateStatistics();
      
    } catch (error) {
      this.handleFrameError(error as Error);
    }
  }

  // Process binary frame data
  async processBinaryFrame(data: ArrayBuffer): Promise<FrameData> {
    try {
      // Validate frame size
      if (data.byteLength > this.config.maxFrameSize) {
        throw new Error(`Frame size ${data.byteLength} exceeds maximum ${this.config.maxFrameSize}`);
      }

      // Extract frame header (first 32 bytes)
      const headerView = new DataView(data, 0, 32);
      const frameIndex = headerView.getUint32(0, true);
      const sceneIdLength = headerView.getUint16(4, true);
      const timestampLength = headerView.getUint16(6, true);
      const cameraCount = headerView.getUint16(8, true);
      
      let offset = 32;
      
      // Extract scene ID
      const sceneIdBytes = new Uint8Array(data, offset, sceneIdLength);
      const sceneId = new TextDecoder().decode(sceneIdBytes);
      offset += sceneIdLength;
      
      // Extract timestamp
      const timestampBytes = new Uint8Array(data, offset, timestampLength);
      const timestampUtc = new TextDecoder().decode(timestampBytes);
      offset += timestampLength;
      
      // Extract camera data
      const cameras: Record<string, CameraFrameData> = {};
      
      for (let i = 0; i < cameraCount; i++) {
        const cameraData = await this.extractCameraData(data, offset);
        cameras[cameraData.cameraId] = cameraData;
        offset = cameraData.nextOffset;
      }
      
      return {
        frameIndex,
        sceneId,
        timestampUtc,
        cameras,
      };
      
    } catch (error) {
      throw new Error(`Failed to process binary frame: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract camera data from binary buffer
  private async extractCameraData(buffer: ArrayBuffer, offset: number): Promise<CameraFrameData & { nextOffset: number }> {
    const view = new DataView(buffer, offset);
    
    // Read camera header
    const cameraIdLength = view.getUint16(0, true);
    const imageSize = view.getUint32(2, true);
    const trackCount = view.getUint16(6, true);
    const metadataSize = view.getUint16(8, true);
    
    let currentOffset = offset + 10;
    
    // Extract camera ID
    const cameraIdBytes = new Uint8Array(buffer, currentOffset, cameraIdLength);
    const cameraId = new TextDecoder().decode(cameraIdBytes);
    currentOffset += cameraIdLength;
    
    // Extract image data
    const imageData = new Uint8Array(buffer, currentOffset, imageSize);
    const imageBlob = new Blob([imageData], { type: 'image/jpeg' });
    const imageUrl = URL.createObjectURL(imageBlob);
    currentOffset += imageSize;
    
    // Extract tracks
    const tracks: TrackData[] = [];
    for (let i = 0; i < trackCount; i++) {
      const trackView = new DataView(buffer, currentOffset);
      const trackId = trackView.getUint32(0, true);
      const globalId = trackView.getUint32(4, true);
      const x1 = trackView.getFloat32(8, true);
      const y1 = trackView.getFloat32(12, true);
      const x2 = trackView.getFloat32(16, true);
      const y2 = trackView.getFloat32(20, true);
      const confidence = trackView.getFloat32(24, true);
      const classId = trackView.getUint16(28, true);
      const hasMapCoords = trackView.getUint8(30);
      
      let mapCoords: [number, number] | undefined;
      if (hasMapCoords) {
        mapCoords = [
          trackView.getFloat32(31, true),
          trackView.getFloat32(35, true),
        ];
        currentOffset += 39;
      } else {
        currentOffset += 31;
      }
      
      tracks.push({
        trackId,
        globalId,
        bboxXyxy: [x1, y1, x2, y2],
        confidence,
        classId,
        mapCoords,
      });
    }
    
    // Extract metadata
    const metadataBytes = new Uint8Array(buffer, currentOffset, metadataSize);
    const metadataJson = new TextDecoder().decode(metadataBytes);
    const metadata = JSON.parse(metadataJson) as FrameMetadata;
    currentOffset += metadataSize;
    
    return {
      cameraId,
      imageBlob,
      imageUrl,
      tracks,
      metadata,
      nextOffset: currentOffset,
    };
  }

  // Process frame data from WebSocket message
  private async processFrameData(data: FrameMessage['data']): Promise<FrameData> {
    const cameras: Record<string, CameraFrameData> = {};
    
    for (const [cameraId, cameraData] of Object.entries(data.cameras)) {
      // Convert base64 image to blob
      const imageBlob = await this.base64ToBlob(cameraData.image_source);
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Convert tracks format
      const tracks: TrackData[] = cameraData.tracks.map(track => ({
        trackId: track.track_id,
        globalId: track.global_id,
        bboxXyxy: track.bbox_xyxy,
        confidence: track.confidence,
        classId: track.class_id,
        mapCoords: track.map_coords,
      }));
      
      cameras[cameraId] = {
        cameraId,
        imageBlob,
        imageUrl,
        tracks,
        metadata: {
          width: 1920,
          height: 1080,
          format: 'image/jpeg',
          quality: this.config.compressionQuality,
          timestamp: data.timestamp_utc,
        },
      };
    }
    
    return {
      frameIndex: data.frame_index,
      sceneId: data.scene_id,
      timestampUtc: data.timestamp_utc,
      cameras,
    };
  }

  // Convert base64 to blob
  private async base64ToBlob(base64: string): Promise<Blob> {
    const response = await fetch(base64);
    return response.blob();
  }

  // Add frame to buffer
  private addToFrameBuffer(frameData: FrameData): void {
    // Remove old frames if buffer is full
    if (this.frameBuffer.size >= this.config.frameBufferSize) {
      const oldestFrame = Math.min(...this.frameBuffer.keys());
      const oldFrame = this.frameBuffer.get(oldestFrame);
      if (oldFrame) {
        this.cleanupFrameData(oldFrame);
      }
      this.frameBuffer.delete(oldestFrame);
    }
    
    this.frameBuffer.set(frameData.frameIndex, frameData);
  }

  // Clean up frame data
  private cleanupFrameData(frameData: FrameData): void {
    // Revoke object URLs to prevent memory leaks
    Object.values(frameData.cameras).forEach(camera => {
      if (camera.imageUrl) {
        URL.revokeObjectURL(camera.imageUrl);
      }
    });
  }

  // Notify frame handlers
  private notifyFrameHandlers(frameData: FrameData): void {
    this.frameHandlers.forEach(handler => {
      try {
        handler(frameData);
      } catch (error) {
        console.error('Error in frame handler:', error);
      }
    });
  }

  // Handle frame errors
  private handleFrameError(error: Error, frameIndex?: number): void {
    this.droppedFrames++;
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, frameIndex);
      } catch (e) {
        console.error('Error in frame error handler:', e);
      }
    });
  }

  // Update statistics
  private updateStatistics(): void {
    this.processedFrames++;
    this.lastFrameTime = Date.now();
    this.fpsCalculator.update();
  }

  // Public API
  onFrame(handler: FrameHandler): void {
    this.frameHandlers.push(handler);
  }

  offFrame(handler: FrameHandler): void {
    const index = this.frameHandlers.indexOf(handler);
    if (index > -1) {
      this.frameHandlers.splice(index, 1);
    }
  }

  onError(handler: FrameErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: FrameErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  getStatistics() {
    return {
      processedFrames: this.processedFrames,
      droppedFrames: this.droppedFrames,
      fps: this.fpsCalculator.getFPS(),
      bufferSize: this.frameBuffer.size,
      lastFrameTime: this.lastFrameTime,
    };
  }

  getFrameBuffer(): Map<number, FrameData> {
    return new Map(this.frameBuffer);
  }

  cleanup(): void {
    // Clean up all frames in buffer
    this.frameBuffer.forEach(frameData => {
      this.cleanupFrameData(frameData);
    });
    this.frameBuffer.clear();
    
    // Reset statistics
    this.processedFrames = 0;
    this.droppedFrames = 0;
    this.fpsCalculator.reset();
  }
}

// FPS Calculator utility
class FPSCalculator {
  private timestamps: number[] = [];
  private readonly windowSize = 60; // 60 frames for FPS calculation

  update(): void {
    const now = Date.now();
    this.timestamps.push(now);
    
    // Keep only recent timestamps
    if (this.timestamps.length > this.windowSize) {
      this.timestamps.shift();
    }
  }

  getFPS(): number {
    if (this.timestamps.length < 2) {
      return 0;
    }
    
    const timeSpan = this.timestamps[this.timestamps.length - 1] - this.timestamps[0];
    const frameCount = this.timestamps.length - 1;
    
    return frameCount / (timeSpan / 1000);
  }

  reset(): void {
    this.timestamps = [];
  }
}

// Export service instance
export const frameHandler = new FrameHandlerService();

// Export service class for custom instances
export { FrameHandlerService };