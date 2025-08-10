// SpotOn WebSocket Client - Backend Integration
// src/services/spotOnWebSocketClient.ts

import { WebSocketService, WebSocketConnectionState } from './websocketService';
import { 
  WebSocketTrackingMessagePayload, 
  StatusUpdatePayload,
  WEBSOCKET_ENDPOINTS,
  ConnectionEstablishedPayload,
} from '../types/api';
import { getWebSocketUrl } from '../config/app';

// ============================================================================
// SpotOn WebSocket Client
// ============================================================================

export class SpotOnWebSocketClient {
  private wsService: WebSocketService;
  private taskId: string;
  private connectionState: WebSocketConnectionState = WebSocketConnectionState.DISCONNECTED;
  private messageHandlers: Map<string, Function> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(taskId: string) {
    this.taskId = taskId;
    this.wsService = new WebSocketService({
      reconnectDelay: 2000,
      maxReconnectAttempts: this.maxReconnectAttempts,
      heartbeatInterval: 30000, // 30 seconds
    });

    this.setupEventListeners();
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  /**
   * Connect to WebSocket endpoint
   */
  async connect(): Promise<void> {
    const wsUrl = getWebSocketUrl(WEBSOCKET_ENDPOINTS.TRACKING(this.taskId));
    
    try {
      await this.wsService.connect(wsUrl);
      this.connectionState = WebSocketConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startPingInterval();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.connectionState = WebSocketConnectionState.ERROR;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    // Send unsubscribe message before disconnecting
    if (this.wsService.isConnected()) {
      this.wsService.send({ type: 'unsubscribe_tracking' });
    }

    this.wsService.disconnect();
    this.stopPingInterval();
    this.connectionState = WebSocketConnectionState.DISCONNECTED;
  }

  // ========================================================================
  // Message Handling
  // ========================================================================

  /**
   * Send message to server
   */
  send(message: any): boolean {
    return this.wsService.send(message);
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(message: any): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        handler(message.payload);
      } catch (error) {
        console.error(`Error in message handler for ${message.type}:`, error);
      }
    } else {
      console.log('Unhandled message type:', message.type);
    }
  }

  // ========================================================================
  // Event Handlers Registration
  // ========================================================================

  /**
   * Handle tracking updates
   */
  onTrackingUpdate(handler: (payload: WebSocketTrackingMessagePayload) => void): void {
    this.messageHandlers.set('tracking_update', handler);
  }

  /**
   * Handle status updates
   */
  onStatusUpdate(handler: (payload: StatusUpdatePayload) => void): void {
    this.messageHandlers.set('status_update', handler);
  }

  /**
   * Handle connection established
   */
  onConnectionEstablished(handler: (payload: ConnectionEstablishedPayload) => void): void {
    this.messageHandlers.set('connection_established', handler);
  }

  /**
   * Handle connection state changes
   */
  onConnectionStateChange(handler: (state: WebSocketConnectionState) => void): void {
    this.wsService.addEventListener('connection-state-changed', handler);
  }

  /**
   * Handle errors
   */
  onError(handler: (error: Error) => void): void {
    this.wsService.addEventListener('error', handler);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Setup WebSocket service event listeners
   */
  private setupEventListeners(): void {
    // Connection established
    this.wsService.addEventListener('connection-established', (payload) => {
      console.log('Connection established:', payload);
      this.handleMessage({ type: 'connection_established', payload });
    });

    // Tracking updates
    this.wsService.addEventListener('tracking-update', (payload) => {
      this.handleMessage({ type: 'tracking_update', payload });
    });

    // Status updates
    this.wsService.addEventListener('status-update', (payload) => {
      this.handleMessage({ type: 'status_update', payload });
    });

    // Connection state changes
    this.wsService.addEventListener('connection-state-changed', (state) => {
      this.connectionState = state;
      
      if (state === WebSocketConnectionState.CONNECTED) {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      } else if (state === WebSocketConnectionState.DISCONNECTED) {
        console.log('WebSocket disconnected');
        this.stopPingInterval();
      } else if (state === WebSocketConnectionState.ERROR) {
        console.log('WebSocket error state');
        this.handleConnectionError();
      }
    });

    // Reconnection attempts
    this.wsService.addEventListener('reconnect-attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt.attempt}/${attempt.maxAttempts}`);
      this.reconnectAttempts = attempt.attempt;
    });

    // Errors
    this.wsService.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleMessage({ type: 'error', payload: error });
    });

    // Pong responses
    this.wsService.addEventListener('pong', (payload) => {
      console.log('Pong received:', payload);
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.stopPingInterval();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      // Exponential backoff
      const delay = 2000 * Math.pow(2, this.reconnectAttempts);
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.connectionState = WebSocketConnectionState.ERROR;
    }
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.wsService.isConnected()) {
        this.wsService.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ========================================================================
  // Public API Methods
  // ========================================================================

  /**
   * Subscribe to tracking updates
   */
  subscribeToTracking(): void {
    this.wsService.subscribeToTracking();
  }

  /**
   * Unsubscribe from tracking updates
   */
  unsubscribeFromTracking(): void {
    this.wsService.unsubscribeFromTracking();
  }

  /**
   * Request current status
   */
  requestStatus(): void {
    this.wsService.requestStatus();
  }

  /**
   * Get connection state
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

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.wsService.getMetrics(),
      taskId: this.taskId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create SpotOn WebSocket client for task
 */
export function createSpotOnWebSocketClient(taskId: string): SpotOnWebSocketClient {
  return new SpotOnWebSocketClient(taskId);
}

// ============================================================================
// Usage Example Class
// ============================================================================

export class SpotOnWebSocketManager {
  private clients: Map<string, SpotOnWebSocketClient> = new Map();

  /**
   * Create or get WebSocket client for task
   */
  getClient(taskId: string): SpotOnWebSocketClient {
    if (!this.clients.has(taskId)) {
      const client = new SpotOnWebSocketClient(taskId);
      this.clients.set(taskId, client);
    }
    return this.clients.get(taskId)!;
  }

  /**
   * Remove client for task
   */
  removeClient(taskId: string): void {
    const client = this.clients.get(taskId);
    if (client) {
      client.disconnect();
      this.clients.delete(taskId);
    }
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
  }

  /**
   * Get all active clients
   */
  getActiveClients(): string[] {
    return Array.from(this.clients.keys()).filter(taskId => 
      this.clients.get(taskId)?.isConnected()
    );
  }
}

// Default export
export default SpotOnWebSocketClient;