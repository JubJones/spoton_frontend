// WebSocket Service - Real-time Communication
// src/services/websocketService.ts

import {
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketTrackingMessagePayload,
  WebSocketClientMessage,
  ConnectionEstablishedPayload,
  StatusUpdatePayload,
  PongPayload,
  isValidWebSocketMessageType,
} from '../types/api';
import { getWebSocketUrl, APP_CONFIG } from '../config/app';
import { MOCK_CONFIG } from '../config/mock';
import { mockAPI } from '../mocks/mockServices';

// ============================================================================
// WebSocket Service Configuration
// ============================================================================

interface WebSocketConfig {
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageQueueSize: number;
  enableCompression: boolean;
  enableBinaryFrames: boolean;
}

const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  reconnectDelay: APP_CONFIG.WEBSOCKET_RECONNECT_DELAY,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000, // 30 seconds
  messageQueueSize: 100,
  enableCompression: true,
  enableBinaryFrames: true,
};

// ============================================================================
// WebSocket Connection States
// ============================================================================

export enum WebSocketConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  CLOSED = 'closed',
}

// ============================================================================
// Event Types and Payloads
// ============================================================================

export interface WebSocketEventMap {
  'connection-state-changed': WebSocketConnectionState;
  'message-received': WebSocketMessage;
  'connection-established': ConnectionEstablishedPayload;
  'tracking-update': WebSocketTrackingMessagePayload;
  'status-update': StatusUpdatePayload;
  'pong': PongPayload;
  'frame-data': Uint8Array;
  error: Error;
  'reconnect-attempt': { attempt: number; maxAttempts: number };
}

export type WebSocketEventListener<K extends keyof WebSocketEventMap> = (
  payload: WebSocketEventMap[K]
) => void;

// ============================================================================
// WebSocket Service Implementation
// ============================================================================

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private connectionState: WebSocketConnectionState = WebSocketConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private eventListeners: Map<string, Set<Function>> = new Map();
  private url: string = '';

  // Connection metrics
  private connectionStartTime: number = 0;
  private lastMessageTime: number = 0;
  private messageCount: number = 0;
  private errorCount: number = 0;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  /**
   * Connect to WebSocket endpoint (or mock service)
   */
  async connect(endpoint: string): Promise<void> {
    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      console.warn('WebSocket already connected');
      return;
    }

    // Use mock WebSocket if enabled
    if (MOCK_CONFIG.services.websocket) {
      return this.connectMock(endpoint);
    }

    this.url = endpoint.startsWith('ws') ? endpoint : getWebSocketUrl(endpoint);
    this.setConnectionState(WebSocketConnectionState.CONNECTING);
    this.connectionStartTime = Date.now();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.setupEventHandlers(resolve, reject);
      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Connect to mock WebSocket service
   */
  private async connectMock(endpoint: string): Promise<void> {
    console.log('🎭 Using mock WebSocket service for endpoint:', endpoint);
    
    // Extract task ID from endpoint for mock service
    const taskIdMatch = endpoint.match(/\/ws\/tracking\/(.+)$/);
    const taskId = taskIdMatch ? taskIdMatch[1] : 'mock-task';

    this.setConnectionState(WebSocketConnectionState.CONNECTING);
    this.connectionStartTime = Date.now();

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Connect to mock service
    const disconnect = mockAPI.connectWebSocket(taskId, (message) => {
      this.handleMockMessage(message);
    });

    // Store disconnect function
    (this as any).mockDisconnect = disconnect;

    this.setConnectionState(WebSocketConnectionState.CONNECTED);
    this.startHeartbeat();
    
    console.log('🎭 Mock WebSocket connected successfully');
  }

  /**
   * Handle mock WebSocket messages
   */
  private handleMockMessage(message: WebSocketMessage): void {
    this.lastMessageTime = Date.now();
    this.messageCount++;
    this.processMessage(message);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();

    // Handle mock disconnection
    if (MOCK_CONFIG.services.websocket && (this as any).mockDisconnect) {
      console.log('🎭 Disconnecting from mock WebSocket service');
      (this as any).mockDisconnect();
      (this as any).mockDisconnect = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.setConnectionState(WebSocketConnectionState.DISCONNECTED);
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): boolean {
    if (this.connectionState !== WebSocketConnectionState.CONNECTED || !this.ws) {
      // Queue message for later if disconnected
      if (this.messageQueue.length < this.config.messageQueueSize) {
        this.messageQueue.push(JSON.stringify(message));
      }
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Send binary data
   */
  sendBinary(data: ArrayBuffer | Uint8Array): boolean {
    if (!this.config.enableBinaryFrames) {
      console.warn('Binary frames not enabled');
      return false;
    }

    if (this.connectionState !== WebSocketConnectionState.CONNECTED || !this.ws) {
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      console.error('Failed to send binary WebSocket message:', error);
      return false;
    }
  }

  // ========================================================================
  // Event Handling
  // ========================================================================

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      console.log('WebSocket connected:', this.url);
      this.setConnectionState(WebSocketConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      resolve();
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.clearHeartbeatTimer();

      if (event.code !== 1000 && this.shouldReconnect()) {
        this.attemptReconnect();
      } else {
        this.setConnectionState(WebSocketConnectionState.CLOSED);
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      const error = new Error(`WebSocket error: ${event.type}`);
      this.handleConnectionError(error);
      reject(error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    this.lastMessageTime = Date.now();
    this.messageCount++;

    try {
      // Handle binary messages
      if (event.data instanceof ArrayBuffer || event.data instanceof Uint8Array) {
        this.emit('frame-data', new Uint8Array(event.data));
        return;
      }

      // Handle text messages
      if (typeof event.data === 'string') {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.processMessage(message);
        return;
      }

      console.warn('Received unknown message type:', typeof event.data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.errorCount++;
    }
  }

  /**
   * Process parsed WebSocket message
   */
  private processMessage(message: WebSocketMessage): void {
    // Validate message structure
    if (!message.type || !isValidWebSocketMessageType(message.type)) {
      console.warn('Invalid WebSocket message type:', message.type);
      return;
    }

    // Emit generic message event
    this.emit('message-received', message);

    // Emit specific message type events
    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket connection established:', message.payload);
        this.emit('connection-established', message.payload as ConnectionEstablishedPayload);
        // Auto-subscribe to tracking updates
        this.subscribeToTracking();
        break;

      case 'tracking_update':
        this.emit('tracking-update', message.payload as WebSocketTrackingMessagePayload);
        
        // Also emit mapping data if present (for 2D mapping feature)
        const trackingPayload = message.payload as any;
        if (trackingPayload.future_pipeline_data?.mapping_coordinates) {
          // Emit custom event for mapping data
          const mappingEvent = new CustomEvent('websocket-mapping-message', {
            detail: trackingPayload
          });
          window.dispatchEvent(mappingEvent);
        }
        break;

      case 'status_update':
        this.emit('status-update', message.payload as StatusUpdatePayload);
        break;

      case 'pong':
        console.log('Pong received from server');
        this.emit('pong', message.payload as PongPayload);
        break;

      case 'system_status':
        this.emit('system-status', message.payload);
        break;

      case 'control_message':
        this.emit('control-message', message.payload);
        break;

      default:
        console.warn('Unhandled message type:', message.type);
    }
  }

  // ========================================================================
  // Reconnection Logic
  // ========================================================================

  /**
   * Check if should attempt reconnection
   */
  private shouldReconnect(): boolean {
    return (
      this.reconnectAttempts < this.config.maxReconnectAttempts &&
      this.connectionState !== WebSocketConnectionState.CLOSED
    );
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (!this.shouldReconnect()) {
      this.setConnectionState(WebSocketConnectionState.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(WebSocketConnectionState.RECONNECTING);

    this.emit('reconnect-attempt', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
    });

    const delay = this.calculateReconnectDelay();
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url).catch((error) => {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelay;
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);

    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ========================================================================
  // Heartbeat Management
  // ========================================================================

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat message (ping)
   */
  private sendHeartbeat(): void {
    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      this.send({ type: 'ping' });
    }
  }

  /**
   * Subscribe to tracking updates
   */
  subscribeToTracking(): void {
    this.send({ type: 'subscribe_tracking' });
  }

  /**
   * Unsubscribe from tracking updates
   */
  unsubscribeFromTracking(): void {
    this.send({ type: 'unsubscribe_tracking' });
  }

  /**
   * Request current status
   */
  requestStatus(): void {
    this.send({ type: 'request_status' });
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ========================================================================
  // Message Queue Management
  // ========================================================================

  /**
   * Flush queued messages after reconnection
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0 && this.ws) {
      console.log(`Flushing ${this.messageQueue.length} queued messages`);

      this.messageQueue.forEach((message) => {
        try {
          this.ws!.send(message);
        } catch (error) {
          console.error('Failed to send queued message:', error);
        }
      });

      this.messageQueue = [];
    }
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: WebSocketConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection-state-changed', state);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === WebSocketConnectionState.CONNECTED;
  }

  // ========================================================================
  // Error Handling
  // ========================================================================

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    console.error('WebSocket connection error:', error);
    this.errorCount++;
    this.setConnectionState(WebSocketConnectionState.ERROR);
    this.emit('error', error);
  }

  // ========================================================================
  // Event System
  // ========================================================================

  /**
   * Add event listener
   */
  addEventListener<K extends keyof WebSocketEventMap>(
    event: K,
    listener: WebSocketEventListener<K>
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as Function);
  }

  /**
   * Remove event listener
   */
  removeEventListener<K extends keyof WebSocketEventMap>(
    event: K,
    listener: WebSocketEventListener<K>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener as Function);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit<K extends keyof WebSocketEventMap>(event: K, payload: WebSocketEventMap[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          (listener as Function)(payload);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventListeners.clear();
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      connectionState: this.connectionState,
      connectionTime: this.connectionStartTime > 0 ? Date.now() - this.connectionStartTime : 0,
      lastMessageTime: this.lastMessageTime,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.messageCount = 0;
    this.errorCount = 0;
    this.lastMessageTime = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create WebSocket service for tracking data
 */
export function createTrackingWebSocket(taskId: string): WebSocketService {
  return new WebSocketService({
    enableBinaryFrames: true,
    enableCompression: true,
  });
}

/**
 * Create WebSocket service for system monitoring
 */
export function createSystemWebSocket(): WebSocketService {
  return new WebSocketService({
    enableBinaryFrames: false,
    heartbeatInterval: 60000, // 1 minute for system monitoring
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse binary frame metadata
 */
export function parseBinaryFrame(data: Uint8Array): {
  metadata: any;
  frameData: Uint8Array;
} | null {
  try {
    // Read metadata length (first 4 bytes)
    const metadataLength = new DataView(data.buffer).getUint32(0, true);

    if (metadataLength > data.length - 4) {
      throw new Error('Invalid metadata length');
    }

    // Extract metadata JSON
    const metadataBytes = data.slice(4, 4 + metadataLength);
    const metadataJson = new TextDecoder().decode(metadataBytes);
    const metadata = JSON.parse(metadataJson);

    // Extract frame data
    const frameData = data.slice(4 + metadataLength);

    return { metadata, frameData };
  } catch (error) {
    console.error('Failed to parse binary frame:', error);
    return null;
  }
}

/**
 * Create binary frame with metadata
 */
export function createBinaryFrame(metadata: any, frameData: Uint8Array): Uint8Array {
  const metadataJson = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataJson);
  const metadataLength = metadataBytes.length;

  // Create combined buffer
  const totalLength = 4 + metadataLength + frameData.length;
  const result = new Uint8Array(totalLength);

  // Write metadata length (little-endian)
  new DataView(result.buffer).setUint32(0, metadataLength, true);

  // Write metadata
  result.set(metadataBytes, 4);

  // Write frame data
  result.set(frameData, 4 + metadataLength);

  return result;
}

// ============================================================================
// Default Export
// ============================================================================

export default WebSocketService;
