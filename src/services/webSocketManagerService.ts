// WebSocket Manager Service - Enhanced Connection Management
// src/services/webSocketManagerService.ts

import { WebSocketService, WebSocketConnectionState } from './websocketService';
import { statePersistenceService } from './statePersistenceService';
import {
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketTrackingMessagePayload,
  SystemStatusPayload,
} from '../types/api';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WebSocketConnectionInfo {
  id: string;
  taskId?: string;
  endpoint: string;
  service: WebSocketService;
  state: WebSocketConnectionState;
  connectedAt?: number;
  lastMessageAt?: number;
  messageCount: number;
  errorCount: number;
  reconnectAttempts: number;
}

export interface WebSocketManagerConfig {
  maxConnections: number;
  connectionTimeout: number;
  enableMetrics: boolean;
  enablePersistence: boolean;
  enableMessageQueue: boolean;
  messageQueueSize: number;
  metricsInterval: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalErrors: number;
  averageLatency: number;
  uptime: number;
}

export interface QueuedMessage {
  connectionId: string;
  message: WebSocketMessage;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface WebSocketManagerEvents {
  'connection-established': { connectionId: string; info: WebSocketConnectionInfo };
  'connection-lost': { connectionId: string; reason: string };
  'message-received': { connectionId: string; message: WebSocketMessage };
  'metrics-updated': ConnectionMetrics;
  'queue-processed': { processed: number; failed: number };
  error: { connectionId: string; error: Error };
}

// ============================================================================
// WebSocket Manager Service
// ============================================================================

export class WebSocketManagerService {
  private connections: Map<string, WebSocketConnectionInfo> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private eventListeners: Map<string, Set<Function>> = new Map();
  private metricsTimer: NodeJS.Timeout | null = null;
  private queueTimer: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  private config: WebSocketManagerConfig = {
    maxConnections: 5,
    connectionTimeout: 30000,
    enableMetrics: true,
    enablePersistence: true,
    enableMessageQueue: true,
    messageQueueSize: 1000,
    metricsInterval: 5000,
  };

  constructor(config: Partial<WebSocketManagerConfig> = {}) {
    this.config = { ...this.config, ...config };

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    if (this.config.enableMessageQueue) {
      this.startQueueProcessing();
    }

    // Restore connections from persistence
    if (this.config.enablePersistence) {
      this.restorePersistedConnections();
    }
  }

  // ========================================================================
  // Connection Management
  // ========================================================================

  /**
   * Create new WebSocket connection
   */
  async createConnection(
    connectionId: string,
    endpoint: string,
    taskId?: string
  ): Promise<WebSocketConnectionInfo> {
    // Check connection limits
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error(`Maximum connections limit reached (${this.config.maxConnections})`);
    }

    // Check if connection already exists
    if (this.connections.has(connectionId)) {
      throw new Error(`Connection ${connectionId} already exists`);
    }

    // Create WebSocket service
    const service = new WebSocketService({
      enableBinaryFrames: true,
      enableCompression: true,
    });

    const connectionInfo: WebSocketConnectionInfo = {
      id: connectionId,
      taskId,
      endpoint,
      service,
      state: WebSocketConnectionState.DISCONNECTED,
      messageCount: 0,
      errorCount: 0,
      reconnectAttempts: 0,
    };

    // Set up event listeners
    this.setupConnectionEventHandlers(connectionInfo);

    // Store connection info
    this.connections.set(connectionId, connectionInfo);

    // Connect to WebSocket
    try {
      await service.connect(endpoint);
      connectionInfo.state = WebSocketConnectionState.CONNECTED;
      connectionInfo.connectedAt = Date.now();

      // Persist connection info
      if (this.config.enablePersistence) {
        await this.persistConnectionInfo(connectionInfo);
      }

      // Emit event
      this.emit('connection-established', { connectionId, info: connectionInfo });

      return connectionInfo;
    } catch (error) {
      // Clean up on connection failure
      this.connections.delete(connectionId);
      throw error;
    }
  }

  /**
   * Close WebSocket connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`Connection ${connectionId} not found`);
      return;
    }

    // Disconnect WebSocket service
    connection.service.disconnect();
    connection.state = WebSocketConnectionState.CLOSED;

    // Remove from active connections
    this.connections.delete(connectionId);

    // Remove from persistence
    if (this.config.enablePersistence) {
      await statePersistenceService.removeState(`ws-connection-${connectionId}`);
    }

    // Clear queued messages for this connection
    this.messageQueue = this.messageQueue.filter((msg) => msg.connectionId !== connectionId);

    // Emit event
    this.emit('connection-lost', { connectionId, reason: 'Manual disconnect' });
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WebSocketConnectionInfo | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get active connections
   */
  getActiveConnections(): WebSocketConnectionInfo[] {
    return this.getAllConnections().filter(
      (conn) => conn.state === WebSocketConnectionState.CONNECTED
    );
  }

  // ========================================================================
  // Message Handling
  // ========================================================================

  /**
   * Send message to specific connection
   */
  async sendMessage(connectionId: string, message: any): Promise<boolean> {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      console.warn(`Connection ${connectionId} not found`);
      return false;
    }

    // Try to send immediately if connected
    if (connection.state === WebSocketConnectionState.CONNECTED) {
      const success = connection.service.send(message);
      if (success) {
        return true;
      }
    }

    // Queue message if not connected or send failed
    if (this.config.enableMessageQueue) {
      return this.queueMessage(connectionId, message);
    }

    return false;
  }

  /**
   * Send message to all active connections
   */
  async broadcastMessage(message: any): Promise<number> {
    let successCount = 0;
    const activeConnections = this.getActiveConnections();

    for (const connection of activeConnections) {
      const success = await this.sendMessage(connection.id, message);
      if (success) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(connectionId: string, message: any): boolean {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      // Remove oldest message to make room
      this.messageQueue.shift();
    }

    const queuedMessage: QueuedMessage = {
      connectionId,
      message: {
        type: 'queued_message',
        payload: message,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    this.messageQueue.push(queuedMessage);
    return true;
  }

  // ========================================================================
  // Event Handling
  // ========================================================================

  /**
   * Set up event handlers for a connection
   */
  private setupConnectionEventHandlers(connectionInfo: WebSocketConnectionInfo): void {
    const { service, id: connectionId } = connectionInfo;

    service.addEventListener('connection-state-changed', (state) => {
      connectionInfo.state = state;

      if (state === WebSocketConnectionState.CONNECTED) {
        connectionInfo.connectedAt = Date.now();
        this.emit('connection-established', { connectionId, info: connectionInfo });
      } else if (
        state === WebSocketConnectionState.ERROR ||
        state === WebSocketConnectionState.CLOSED
      ) {
        this.emit('connection-lost', { connectionId, reason: state });
      }
    });

    service.addEventListener('message-received', (message) => {
      connectionInfo.messageCount++;
      connectionInfo.lastMessageAt = Date.now();
      this.emit('message-received', { connectionId, message });
    });

    service.addEventListener('error', (error) => {
      connectionInfo.errorCount++;
      this.emit('error', { connectionId, error });
    });

    service.addEventListener('reconnect-attempt', ({ attempt }) => {
      connectionInfo.reconnectAttempts = attempt;
    });

    // Handle specific message types
    service.addEventListener('tracking-update', (payload) => {
      // Forward to application handlers
      this.handleTrackingUpdate(connectionId, payload);
    });

    service.addEventListener('system-status', (payload) => {
      // Forward to application handlers
      this.handleSystemStatus(connectionId, payload);
    });
  }

  /**
   * Handle tracking update messages
   */
  private handleTrackingUpdate(
    connectionId: string,
    payload: WebSocketTrackingMessagePayload
  ): void {
    // This can be extended to provide centralized tracking update handling
    console.debug(`Tracking update from ${connectionId}:`, {
      timestamp: payload.timestamp_processed_utc,
      cameras: Object.keys(payload.frame_data || {}),
    });
  }

  /**
   * Handle system status messages
   */
  private handleSystemStatus(connectionId: string, payload: SystemStatusPayload): void {
    // This can be extended to provide centralized system status handling
    console.debug(`System status from ${connectionId}:`, payload);
  }

  // ========================================================================
  // Queue Processing
  // ========================================================================

  /**
   * Start queue processing timer
   */
  private startQueueProcessing(): void {
    this.queueTimer = setInterval(() => {
      this.processMessageQueue();
    }, 1000); // Process queue every second
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) {
      return;
    }

    const toProcess = [...this.messageQueue];
    const processed: QueuedMessage[] = [];
    const failed: QueuedMessage[] = [];

    for (const queuedMessage of toProcess) {
      const connection = this.connections.get(queuedMessage.connectionId);

      if (!connection || connection.state !== WebSocketConnectionState.CONNECTED) {
        // Connection not available, leave in queue
        continue;
      }

      const success = connection.service.send(queuedMessage.message);

      if (success) {
        processed.push(queuedMessage);
      } else {
        queuedMessage.retries++;

        if (queuedMessage.retries >= queuedMessage.maxRetries) {
          failed.push(queuedMessage);
        }
        // Otherwise, leave in queue for retry
      }
    }

    // Remove processed and failed messages from queue
    this.messageQueue = this.messageQueue.filter(
      (msg) => !processed.includes(msg) && !failed.includes(msg)
    );

    // Emit processing results
    if (processed.length > 0 || failed.length > 0) {
      this.emit('queue-processed', {
        processed: processed.length,
        failed: failed.length,
      });
    }
  }

  // ========================================================================
  // Metrics and Monitoring
  // ========================================================================

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const metrics = this.calculateMetrics();
      this.emit('metrics-updated', metrics);
    }, this.config.metricsInterval);
  }

  /**
   * Calculate connection metrics
   */
  private calculateMetrics(): ConnectionMetrics {
    const connections = this.getAllConnections();
    const activeConnections = this.getActiveConnections();

    let totalMessages = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    for (const connection of connections) {
      totalMessages += connection.messageCount;
      totalErrors += connection.errorCount;

      if (connection.lastMessageAt && connection.connectedAt) {
        totalLatency += connection.lastMessageAt - connection.connectedAt;
        latencyCount++;
      }
    }

    return {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      totalMessages,
      totalErrors,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConnectionMetrics {
    return this.calculateMetrics();
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  /**
   * Persist connection information
   */
  private async persistConnectionInfo(connectionInfo: WebSocketConnectionInfo): Promise<void> {
    try {
      const persistData = {
        id: connectionInfo.id,
        taskId: connectionInfo.taskId,
        endpoint: connectionInfo.endpoint,
        connectedAt: connectionInfo.connectedAt,
      };

      await statePersistenceService.saveState(`ws-connection-${connectionInfo.id}`, persistData, {
        version: 1,
        compression: true,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
      });
    } catch (error) {
      console.warn('Failed to persist connection info:', error);
    }
  }

  /**
   * Restore persisted connections
   */
  private async restorePersistedConnections(): Promise<void> {
    try {
      const stats = await statePersistenceService.getStorageStats();
      const connectionKeys = stats.keyDetails
        .filter((detail) => detail.key.startsWith('ws-connection-'))
        .map((detail) => detail.key);

      for (const key of connectionKeys) {
        try {
          const persistData = await statePersistenceService.loadState(key);
          if (persistData && persistData.id && persistData.endpoint) {
            // Attempt to restore connection (will fail silently if server not available)
            console.log(`Attempting to restore connection: ${persistData.id}`);
            // Note: In a real implementation, you might want to validate
            // that the server is still available before attempting to reconnect
          }
        } catch (error) {
          console.warn(`Failed to restore connection from ${key}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to restore persisted connections:', error);
    }
  }

  // ========================================================================
  // Event System
  // ========================================================================

  /**
   * Add event listener
   */
  addEventListener<K extends keyof WebSocketManagerEvents>(
    event: K,
    listener: (payload: WebSocketManagerEvents[K]) => void
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as Function);
  }

  /**
   * Remove event listener
   */
  removeEventListener<K extends keyof WebSocketManagerEvents>(
    event: K,
    listener: (payload: WebSocketManagerEvents[K]) => void
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener as Function);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit<K extends keyof WebSocketManagerEvents>(
    event: K,
    payload: WebSocketManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          (listener as Function)(payload);
        } catch (error) {
          console.error(`Error in WebSocket manager event listener for ${event}:`, error);
        }
      });
    }
  }

  // ========================================================================
  // Cleanup and Shutdown
  // ========================================================================

  /**
   * Shutdown the WebSocket manager
   */
  async shutdown(): Promise<void> {
    // Close all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      await this.closeConnection(connectionId);
    }

    // Clear timers
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.queueTimer) {
      clearInterval(this.queueTimer);
      this.queueTimer = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    // Clear message queue
    this.messageQueue = [];
  }

  /**
   * Health check for the manager
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: ConnectionMetrics;
  }> {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    // Check for stale connections
    const now = Date.now();
    for (const connection of this.connections.values()) {
      if (
        connection.state === WebSocketConnectionState.CONNECTED &&
        connection.lastMessageAt &&
        now - connection.lastMessageAt > 60000 // 1 minute
      ) {
        issues.push(`Connection ${connection.id} has not received messages for over 1 minute`);
      }
    }

    // Check error rates
    if (metrics.totalErrors > 0 && metrics.totalMessages > 0) {
      const errorRate = metrics.totalErrors / metrics.totalMessages;
      if (errorRate > 0.1) {
        // 10% error rate
        issues.push(`High error rate detected: ${(errorRate * 100).toFixed(1)}%`);
      }
    }

    // Check queue size
    if (this.messageQueue.length > this.config.messageQueueSize * 0.8) {
      issues.push(
        `Message queue is getting full: ${this.messageQueue.length}/${this.config.messageQueueSize}`
      );
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }
}

// ============================================================================
// Global Service Instance
// ============================================================================

export const webSocketManagerService = new WebSocketManagerService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create tracking WebSocket connection
 */
export async function createTrackingConnection(taskId: string): Promise<WebSocketConnectionInfo> {
  const connectionId = `tracking-${taskId}`;
  const endpoint = `/tracking/${taskId}`;

  return webSocketManagerService.createConnection(connectionId, endpoint, taskId);
}

/**
 * Create system monitoring WebSocket connection
 */
export async function createSystemConnection(): Promise<WebSocketConnectionInfo> {
  const connectionId = 'system-monitor';
  const endpoint = '/system/status';

  return webSocketManagerService.createConnection(connectionId, endpoint);
}

/**
 * Get tracking connection for task
 */
export function getTrackingConnection(taskId: string): WebSocketConnectionInfo | undefined {
  return webSocketManagerService.getConnection(`tracking-${taskId}`);
}

/**
 * Close tracking connection for task
 */
export async function closeTrackingConnection(taskId: string): Promise<void> {
  return webSocketManagerService.closeConnection(`tracking-${taskId}`);
}

export default WebSocketManagerService;
