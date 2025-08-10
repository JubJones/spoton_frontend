// Offline Queue Service - Message Queuing and Offline Support
// src/services/offlineQueueService.ts

import { statePersistenceService } from './statePersistenceService';
import { dataCacheService } from './dataCacheService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface QueuedMessage {
  id: string;
  type: 'websocket' | 'api' | 'background';
  data: any;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timestamp: number;
  priority: QueuePriority;
  retries: number;
  maxRetries: number;
  expiresAt?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  enablePersistence: boolean;
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number;
  processingInterval: number;
}

export interface QueueMetrics {
  totalMessages: number;
  pendingMessages: number;
  processingMessages: number;
  completedMessages: number;
  failedMessages: number;
  averageProcessingTime: number;
  successRate: number;
  queueSize: number;
}

export interface NetworkStatus {
  online: boolean;
  connectionType: 'ethernet' | 'wifi' | 'cellular' | 'unknown';
  downlink?: number;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  saveData?: boolean;
  rtt?: number;
}

export enum QueuePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// ============================================================================
// Offline Queue Service
// ============================================================================

export class OfflineQueueService {
  private queue: QueuedMessage[] = [];
  private processingQueue: Set<string> = new Set();
  private config: QueueConfig;
  private metrics: QueueMetrics;
  private networkStatus: NetworkStatus;
  private processingTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxQueueSize: 1000,
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      enablePersistence: true,
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 5000,
      processingInterval: 1000,
      ...config,
    };

    this.metrics = {
      totalMessages: 0,
      pendingMessages: 0,
      processingMessages: 0,
      completedMessages: 0,
      failedMessages: 0,
      averageProcessingTime: 0,
      successRate: 0,
      queueSize: 0,
    };

    this.networkStatus = {
      online: navigator.onLine,
      connectionType: 'unknown',
    };

    this.initialize();
  }

  // ========================================================================
  // Initialization and Setup
  // ========================================================================

  private async initialize(): Promise<void> {
    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Restore queue from persistence
    if (this.config.enablePersistence) {
      await this.restoreQueue();
    }

    // Start processing
    this.startProcessing();

    // Set up batching if enabled
    if (this.config.enableBatching) {
      this.startBatching();
    }
  }

  private setupNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.networkStatus.online = true;
      this.emit('network-status-changed', this.networkStatus);
      console.log('Network connection restored');
      this.resumeProcessing();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.online = false;
      this.emit('network-status-changed', this.networkStatus);
      console.log('Network connection lost');
    });

    // Monitor connection quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      if (connection) {
        this.updateNetworkInfo(connection);

        connection.addEventListener('change', () => {
          this.updateNetworkInfo(connection);
          this.emit('network-status-changed', this.networkStatus);
        });
      }
    }
  }

  private updateNetworkInfo(connection: any): void {
    this.networkStatus = {
      ...this.networkStatus,
      connectionType: this.mapConnectionType(connection.type),
      downlink: connection.downlink,
      effectiveType: connection.effectiveType,
      saveData: connection.saveData,
      rtt: connection.rtt,
    };
  }

  private mapConnectionType(type: string): NetworkStatus['connectionType'] {
    switch (type) {
      case 'ethernet':
        return 'ethernet';
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      default:
        return 'unknown';
    }
  }

  // ========================================================================
  // Queue Management
  // ========================================================================

  /**
   * Add message to queue
   */
  async enqueue(
    type: QueuedMessage['type'],
    data: any,
    options: {
      priority?: QueuePriority;
      endpoint?: string;
      method?: QueuedMessage['method'];
      headers?: Record<string, string>;
      maxRetries?: number;
      expiresIn?: number;
      dependencies?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    // Check queue size limits
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority messages if possible
      const removedCount = this.removeOldMessages();
      if (removedCount === 0) {
        throw new Error('Queue is full and cannot accept new messages');
      }
    }

    const id = this.generateMessageId();
    const message: QueuedMessage = {
      id,
      type,
      data,
      endpoint: options.endpoint,
      method: options.method,
      headers: options.headers,
      timestamp: Date.now(),
      priority: options.priority || QueuePriority.NORMAL,
      retries: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      dependencies: options.dependencies,
      metadata: options.metadata,
    };

    // Insert message in priority order
    this.insertMessageByPriority(message);

    this.metrics.totalMessages++;
    this.metrics.pendingMessages++;
    this.updateQueueMetrics();

    // Persist queue if enabled
    if (this.config.enablePersistence) {
      await this.persistQueue();
    }

    this.emit('message-enqueued', { message });
    return id;
  }

  /**
   * Remove message from queue
   */
  async dequeue(messageId: string): Promise<boolean> {
    const index = this.queue.findIndex((msg) => msg.id === messageId);
    if (index === -1) return false;

    const message = this.queue[index];
    this.queue.splice(index, 1);

    this.metrics.pendingMessages--;
    this.updateQueueMetrics();

    // Update persistence
    if (this.config.enablePersistence) {
      await this.persistQueue();
    }

    this.emit('message-dequeued', { messageId, message });
    return true;
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): QueuedMessage | undefined {
    return this.queue.find((msg) => msg.id === messageId);
  }

  /**
   * Get all messages with optional filtering
   */
  getMessages(filter?: {
    type?: QueuedMessage['type'];
    priority?: QueuePriority;
    status?: MessageStatus;
  }): QueuedMessage[] {
    let messages = [...this.queue];

    if (filter) {
      if (filter.type) {
        messages = messages.filter((msg) => msg.type === filter.type);
      }
      if (filter.priority) {
        messages = messages.filter((msg) => msg.priority === filter.priority);
      }
      // Status filtering would require additional tracking
    }

    return messages;
  }

  /**
   * Clear all messages
   */
  async clear(): Promise<void> {
    const count = this.queue.length;
    this.queue = [];
    this.processingQueue.clear();

    this.metrics.pendingMessages = 0;
    this.metrics.processingMessages = 0;
    this.updateQueueMetrics();

    if (this.config.enablePersistence) {
      await this.persistQueue();
    }

    this.emit('queue-cleared', { count });
  }

  // ========================================================================
  // Message Processing
  // ========================================================================

  private startProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (this.networkStatus.online) {
        await this.processMessages();
      }
    }, this.config.processingInterval);
  }

  private async processMessages(): Promise<void> {
    const availableMessages = this.getAvailableMessages();

    // Process messages in batches if batching is enabled
    const batchSize = this.config.enableBatching ? this.config.batchSize : 1;
    const messagesToProcess = availableMessages.slice(0, batchSize);

    for (const message of messagesToProcess) {
      if (this.processingQueue.has(message.id)) {
        continue; // Already processing
      }

      try {
        await this.processMessage(message);
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error);
        await this.handleMessageFailure(message, error);
      }
    }
  }

  private async processMessage(message: QueuedMessage): Promise<void> {
    this.processingQueue.add(message.id);
    this.metrics.processingMessages++;

    const startTime = Date.now();

    try {
      // Check dependencies
      if (message.dependencies && !this.areDependenciesMet(message.dependencies)) {
        return; // Wait for dependencies
      }

      // Process based on message type
      switch (message.type) {
        case 'websocket':
          await this.processWebSocketMessage(message);
          break;
        case 'api':
          await this.processApiMessage(message);
          break;
        case 'background':
          await this.processBackgroundMessage(message);
          break;
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      // Message processed successfully
      await this.handleMessageSuccess(message, Date.now() - startTime);
    } catch (error) {
      await this.handleMessageFailure(message, error);
    } finally {
      this.processingQueue.delete(message.id);
      this.metrics.processingMessages--;
    }
  }

  private async processWebSocketMessage(message: QueuedMessage): Promise<void> {
    // This would integrate with the WebSocket manager service
    console.log('Processing WebSocket message:', message);

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In a real implementation, this would send the message via WebSocket
    throw new Error('WebSocket not available');
  }

  private async processApiMessage(message: QueuedMessage): Promise<void> {
    if (!message.endpoint) {
      throw new Error('API message requires endpoint');
    }

    const response = await fetch(message.endpoint, {
      method: message.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...message.headers,
      },
      body: JSON.stringify(message.data),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async processBackgroundMessage(message: QueuedMessage): Promise<void> {
    // Process background tasks
    console.log('Processing background message:', message);

    // This could include data synchronization, cleanup tasks, etc.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // ========================================================================
  // Message Handling
  // ========================================================================

  private async handleMessageSuccess(
    message: QueuedMessage,
    processingTime: number
  ): Promise<void> {
    // Remove from queue
    await this.dequeue(message.id);

    // Update metrics
    this.metrics.completedMessages++;
    this.updateProcessingTime(processingTime);
    this.updateQueueMetrics();

    this.emit('message-processed', { message, success: true, processingTime });
  }

  private async handleMessageFailure(message: QueuedMessage, error: any): Promise<void> {
    message.retries++;

    if (message.retries >= message.maxRetries) {
      // Message failed permanently
      await this.dequeue(message.id);
      this.metrics.failedMessages++;
      this.emit('message-failed', { message, error, permanent: true });
    } else {
      // Schedule retry
      const delay = this.calculateRetryDelay(message.retries);
      setTimeout(async () => {
        this.emit('message-retry', { message, attempt: message.retries });
      }, delay);
    }

    this.updateQueueMetrics();
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private insertMessageByPriority(message: QueuedMessage): void {
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < message.priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
  }

  private getAvailableMessages(): QueuedMessage[] {
    const now = Date.now();

    return this.queue.filter((message) => {
      // Check if expired
      if (message.expiresAt && now > message.expiresAt) {
        this.handleExpiredMessage(message);
        return false;
      }

      // Check if already processing
      if (this.processingQueue.has(message.id)) {
        return false;
      }

      return true;
    });
  }

  private areDependenciesMet(dependencies: string[]): boolean {
    // Check if all dependency messages have been completed
    return dependencies.every((depId) => {
      const message = this.getMessage(depId);
      return !message; // If message is not in queue, it's been processed
    });
  }

  private removeOldMessages(): number {
    const initialLength = this.queue.length;

    // Remove expired messages first
    this.queue = this.queue.filter((message) => {
      if (message.expiresAt && Date.now() > message.expiresAt) {
        this.handleExpiredMessage(message);
        return false;
      }
      return true;
    });

    // Remove oldest low-priority messages if still needed
    if (this.queue.length >= this.config.maxQueueSize) {
      const lowPriorityMessages = this.queue
        .filter((msg) => msg.priority === QueuePriority.LOW)
        .sort((a, b) => a.timestamp - b.timestamp);

      const toRemove = Math.min(
        lowPriorityMessages.length,
        this.queue.length - this.config.maxQueueSize + 10
      );

      for (let i = 0; i < toRemove; i++) {
        const msgToRemove = lowPriorityMessages[i];
        const index = this.queue.indexOf(msgToRemove);
        if (index > -1) {
          this.queue.splice(index, 1);
        }
      }
    }

    return initialLength - this.queue.length;
  }

  private handleExpiredMessage(message: QueuedMessage): void {
    this.metrics.failedMessages++;
    this.emit('message-expired', { message });
  }

  private calculateRetryDelay(retryCount: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelay;
    }

    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private updateProcessingTime(processingTime: number): void {
    // Update average processing time with exponential moving average
    const alpha = 0.1;
    this.metrics.averageProcessingTime =
      this.metrics.averageProcessingTime * (1 - alpha) + processingTime * alpha;
  }

  private updateQueueMetrics(): void {
    this.metrics.queueSize = this.queue.length;

    if (this.metrics.totalMessages > 0) {
      this.metrics.successRate =
        this.metrics.completedMessages /
        (this.metrics.completedMessages + this.metrics.failedMessages);
    }
  }

  // ========================================================================
  // Batching
  // ========================================================================

  private startBatching(): void {
    if (this.config.enableBatching) {
      this.batchTimer = setInterval(() => {
        this.processBatch();
      }, this.config.batchTimeout);
    }
  }

  private async processBatch(): Promise<void> {
    if (!this.networkStatus.online) return;

    const batchableMessages = this.queue
      .filter((msg) => msg.type === 'api' && !this.processingQueue.has(msg.id))
      .slice(0, this.config.batchSize);

    if (batchableMessages.length > 1) {
      try {
        await this.processBatchRequest(batchableMessages);
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    }
  }

  private async processBatchRequest(messages: QueuedMessage[]): Promise<void> {
    // Group messages by endpoint
    const endpointGroups = new Map<string, QueuedMessage[]>();

    messages.forEach((msg) => {
      const endpoint = msg.endpoint || 'default';
      if (!endpointGroups.has(endpoint)) {
        endpointGroups.set(endpoint, []);
      }
      endpointGroups.get(endpoint)!.push(msg);
    });

    // Process each endpoint group
    for (const [endpoint, groupMessages] of endpointGroups) {
      if (groupMessages.length > 1) {
        try {
          const batchData = groupMessages.map((msg) => ({
            id: msg.id,
            data: msg.data,
          }));

          const response = await fetch(`${endpoint}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch: batchData }),
          });

          if (response.ok) {
            // Mark all messages as processed
            for (const message of groupMessages) {
              await this.handleMessageSuccess(message, 0);
            }
          } else {
            throw new Error(`Batch request failed: ${response.statusText}`);
          }
        } catch (error) {
          // Fall back to individual processing
          console.warn('Batch processing failed, falling back to individual processing:', error);
        }
      }
    }
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  private async persistQueue(): Promise<void> {
    if (!this.config.enablePersistence) return;

    try {
      await statePersistenceService.saveState('offline-queue', this.queue, {
        compression: true,
        version: 1,
      });
    } catch (error) {
      console.warn('Failed to persist queue:', error);
    }
  }

  private async restoreQueue(): Promise<void> {
    try {
      const persistedQueue =
        await statePersistenceService.loadState<QueuedMessage[]>('offline-queue');

      if (persistedQueue && Array.isArray(persistedQueue)) {
        this.queue = persistedQueue.filter((msg) => {
          // Filter out expired messages
          if (msg.expiresAt && Date.now() > msg.expiresAt) {
            return false;
          }
          return true;
        });

        this.metrics.pendingMessages = this.queue.length;
        this.updateQueueMetrics();

        console.log(`Restored ${this.queue.length} messages from persistence`);
      }
    } catch (error) {
      console.warn('Failed to restore queue from persistence:', error);
    }
  }

  // ========================================================================
  // Event System
  // ========================================================================

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in queue event listener for ${event}:`, error);
        }
      });
    }
  }

  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get current queue metrics
   */
  getMetrics(): QueueMetrics {
    this.updateQueueMetrics();
    return { ...this.metrics };
  }

  /**
   * Get network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Manually trigger processing
   */
  async processNow(): Promise<void> {
    if (this.networkStatus.online) {
      await this.processMessages();
    }
  }

  /**
   * Pause processing
   */
  pause(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Resume processing
   */
  resumeProcessing(): void {
    if (!this.processingTimer) {
      this.startProcessing();
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.pause();

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Persist final state
    if (this.config.enablePersistence) {
      await this.persistQueue();
    }

    this.eventListeners.clear();
  }

  /**
   * Get queue statistics
   */
  getStatistics(): {
    queueSize: number;
    pendingMessages: number;
    processingMessages: number;
    successRate: string;
    averageProcessingTime: string;
    networkStatus: NetworkStatus;
    topPriorityMessage?: QueuedMessage;
  } {
    const metrics = this.getMetrics();

    return {
      queueSize: metrics.queueSize,
      pendingMessages: metrics.pendingMessages,
      processingMessages: metrics.processingMessages,
      successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
      averageProcessingTime: `${metrics.averageProcessingTime.toFixed(2)}ms`,
      networkStatus: this.getNetworkStatus(),
      topPriorityMessage:
        this.queue.find((msg) => msg.priority === QueuePriority.CRITICAL) || this.queue[0],
    };
  }
}

// ============================================================================
// Global Service Instance
// ============================================================================

export const offlineQueueService = new OfflineQueueService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Queue API request for offline processing
 */
export async function queueApiRequest(
  endpoint: string,
  data: any,
  options: {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    priority?: QueuePriority;
    maxRetries?: number;
  } = {}
): Promise<string> {
  return offlineQueueService.enqueue('api', data, {
    endpoint,
    method: options.method || 'POST',
    priority: options.priority || QueuePriority.NORMAL,
    maxRetries: options.maxRetries,
  });
}

/**
 * Queue WebSocket message for offline processing
 */
export async function queueWebSocketMessage(
  data: any,
  options: {
    priority?: QueuePriority;
    maxRetries?: number;
  } = {}
): Promise<string> {
  return offlineQueueService.enqueue('websocket', data, {
    priority: options.priority || QueuePriority.NORMAL,
    maxRetries: options.maxRetries,
  });
}

/**
 * Queue background task
 */
export async function queueBackgroundTask(
  taskData: any,
  options: {
    priority?: QueuePriority;
    expiresIn?: number;
  } = {}
): Promise<string> {
  return offlineQueueService.enqueue('background', taskData, {
    priority: options.priority || QueuePriority.LOW,
    expiresIn: options.expiresIn,
  });
}

export default OfflineQueueService;
