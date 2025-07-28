export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  protocols?: string[];
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
  id?: string;
}

export interface FrameMessage extends WebSocketMessage {
  type: 'frame_data';
  data: {
    frame_index: number;
    scene_id: string;
    timestamp_utc: string;
    cameras: Record<string, {
      image_source: string;
      tracks: Array<{
        track_id: number;
        global_id: number;
        bbox_xyxy: [number, number, number, number];
        confidence: number;
        class_id: number;
        map_coords?: [number, number];
      }>;
    }>;
  };
}

export interface TrackingMessage extends WebSocketMessage {
  type: 'tracking_update';
  data: {
    person_id: number;
    global_id: number;
    camera_transitions: Array<{
      from_camera: string;
      to_camera: string;
      transition_time: number;
      confidence: number;
    }>;
    current_position: {
      x: number;
      y: number;
      coordinate_system: string;
      confidence: number;
    };
    trajectory_path: Array<{
      x: number;
      y: number;
      timestamp: string;
      confidence: number;
    }>;
  };
}

export interface SystemStatusMessage extends WebSocketMessage {
  type: 'system_status';
  data: {
    cameras_active: number;
    processing_fps: number;
    connection_quality: 'excellent' | 'good' | 'poor' | 'critical';
    memory_usage: number;
    gpu_utilization: number;
    last_updated: string;
  };
}

export interface HealthCheckMessage extends WebSocketMessage {
  type: 'health_check';
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'up' | 'down' | 'degraded'>;
    timestamp: string;
  };
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type MessageHandler = (message: WebSocketMessage) => void;
export type StatusHandler = (status: WebSocketStatus) => void;
export type ErrorHandler = (error: Error) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private statusHandlers: StatusHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';
  private lastHeartbeatTime: number = 0;
  private frameDropCount = 0;
  private performanceMetrics = {
    fps: 0,
    latency: 0,
    frameDrops: 0,
    messagesReceived: 0,
    bytesReceived: 0,
  };

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setStatus('connecting');
      
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        
        this.ws.onopen = () => {
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.lastHeartbeatTime = Date.now();
          this.startHeartbeat();
          this.processMessageQueue();
          this.resetPerformanceMetrics();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.setStatus('disconnected');
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.setStatus('error');
          const wsError = new Error(`WebSocket error: ${error}`);
          this.notifyErrorHandlers(wsError);
          reject(wsError);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
          this.updatePerformanceMetrics();
        };

      } catch (error) {
        this.setStatus('error');
        const wsError = error instanceof Error ? error : new Error('WebSocket connection failed');
        this.notifyErrorHandlers(wsError);
        reject(wsError);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.setStatus('disconnected');
  }

  send(message: WebSocketMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
      return false;
    }
  }

  onMessage(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  offMessage(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  onStatus(handler: StatusHandler): void {
    this.statusHandlers.push(handler);
  }

  offStatus(handler: StatusHandler): void {
    const index = this.statusHandlers.indexOf(handler);
    if (index > -1) {
      this.statusHandlers.splice(index, 1);
    }
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: ErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'critical' {
    return this.connectionQuality;
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  getFrameDropCount(): number {
    return this.frameDropCount;
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusHandlers.forEach(handler => handler(status));
  }

  private handleMessage(data: string | ArrayBuffer): void {
    try {
      let message: WebSocketMessage;
      
      if (typeof data === 'string') {
        message = JSON.parse(data);
      } else {
        // Handle binary data
        message = {
          type: 'binary',
          data: data,
          timestamp: new Date().toISOString(),
        };
      }

      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }

      // Route message to appropriate handlers
      const handlers = this.messageHandlers.get(message.type) || [];
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Message handler error:', error);
        }
      });

    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in error handler:', e);
      }
    });
  }

  private updatePerformanceMetrics(): void {
    this.performanceMetrics.messagesReceived++;
    
    const now = Date.now();
    if (this.lastHeartbeatTime > 0) {
      this.performanceMetrics.latency = now - this.lastHeartbeatTime;
    }

    // Update connection quality based on latency
    if (this.performanceMetrics.latency < 100) {
      this.connectionQuality = 'excellent';
    } else if (this.performanceMetrics.latency < 300) {
      this.connectionQuality = 'good';
    } else if (this.performanceMetrics.latency < 1000) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'critical';
    }
  }

  private resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      fps: 0,
      latency: 0,
      frameDrops: 0,
      messagesReceived: 0,
      bytesReceived: 0,
    };
    this.frameDropCount = 0;
  }

}

import { apiConfig } from './config/apiConfig';

// Default WebSocket client instance
export const websocketClient = new WebSocketClient({
  url: apiConfig.environment.wsUrl,
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
});

// Export class for custom instances
export { WebSocketClient };