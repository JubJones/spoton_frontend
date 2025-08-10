// Task Management Service - Processing Lifecycle Integration
// src/services/taskManagementService.ts

import { APIService } from './apiService';
import { SpotOnWebSocketClient } from './spotOnWebSocketClient';
import { 
  ProcessingTaskStartRequest,
  ProcessingTaskCreateResponse,
  TaskStatusResponse,
  TaskStatus,
  WebSocketTrackingMessagePayload,
  StatusUpdatePayload,
  ConnectionEstablishedPayload,
} from '../types/api';

// ============================================================================
// Task Management Types
// ============================================================================

export interface TaskConfig {
  environment_id: 'campus' | 'factory';
  autoConnect?: boolean;
  autoSubscribe?: boolean;
  statusPollingInterval?: number;
  maxStatusChecks?: number;
}

export interface TaskState {
  task: ProcessingTaskCreateResponse | null;
  status: TaskStatusResponse | null;
  wsClient: SpotOnWebSocketClient | null;
  isConnected: boolean;
  isSubscribed: boolean;
  connectionStartTime?: number;
  lastStatusUpdate?: number;
  lastTrackingUpdate?: number;
  errorCount: number;
  reconnectAttempts: number;
}

export interface TaskEvents {
  'task-created': ProcessingTaskCreateResponse;
  'status-changed': TaskStatusResponse;
  'processing-ready': TaskStatusResponse;
  'websocket-connected': ConnectionEstablishedPayload;
  'websocket-disconnected': void;
  'tracking-update': WebSocketTrackingMessagePayload;
  'task-completed': TaskStatusResponse;
  'task-failed': { status: TaskStatusResponse; error: string };
  'error': Error;
}

export type TaskEventListener<T extends keyof TaskEvents> = (payload: TaskEvents[T]) => void;

// ============================================================================
// Task Management Service
// ============================================================================

export class TaskManagementService {
  private apiService: APIService;
  private currentState: TaskState;
  private eventListeners: Map<keyof TaskEvents, Set<Function>> = new Map();
  private statusPollingTimer: NodeJS.Timeout | null = null;
  private config: TaskConfig | null = null;

  constructor(apiService?: APIService) {
    this.apiService = apiService || new APIService();
    this.currentState = this.createInitialState();
  }

  // ========================================================================
  // Task Lifecycle Management
  // ========================================================================

  /**
   * Start complete task lifecycle: create task -> monitor -> connect WebSocket
   */
  async startTaskWithLifecycle(config: TaskConfig): Promise<void> {
    this.config = config;
    
    try {
      console.log('🚀 Starting task lifecycle for environment:', config.environment_id);

      // Step 1: Create processing task
      await this.createTask(config);

      // Step 2: Monitor task status until ready
      if (this.config.autoConnect !== false) {
        await this.monitorTaskStatus();
      }

      // Step 3: Connect WebSocket when processing starts
      if (this.config.autoConnect !== false && this.isTaskReadyForWebSocket()) {
        await this.connectWebSocket();
      }

      console.log('✅ Task lifecycle completed successfully');

    } catch (error) {
      console.error('❌ Task lifecycle failed:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Create processing task
   */
  async createTask(config: TaskConfig): Promise<ProcessingTaskCreateResponse> {
    try {
      console.log('Creating processing task for environment:', config.environment_id);

      const request: ProcessingTaskStartRequest = {
        environment_id: config.environment_id,
      };

      const response = await this.apiService.startProcessingTask(request);

      // Update state
      this.currentState.task = response;
      this.currentState.errorCount = 0;

      console.log('✅ Task created:', {
        taskId: response.task_id,
        message: response.message,
      });

      this.emit('task-created', response);
      return response;

    } catch (error) {
      console.error('Failed to create task:', error);
      this.currentState.errorCount++;
      throw error;
    }
  }

  /**
   * Monitor task status until ready for WebSocket connection
   */
  async monitorTaskStatus(): Promise<void> {
    if (!this.currentState.task) {
      throw new Error('No task to monitor');
    }

    const config = this.config || { environment_id: 'campus' };
    const pollingInterval = config.statusPollingInterval || 2000; // 2 seconds
    const maxChecks = config.maxStatusChecks || 30; // 1 minute total
    let checkCount = 0;

    console.log('👀 Starting task status monitoring...');

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          checkCount++;
          
          if (checkCount > maxChecks) {
            reject(new Error('Task monitoring timeout - max status checks exceeded'));
            return;
          }

          const status = await this.getTaskStatus();
          
          console.log(`Status check ${checkCount}: ${status.status} (${Math.round(status.progress * 100)}%)`);
          console.log(`Step: ${status.current_step}`);

          // Handle different status states
          switch (status.status) {
            case 'PROCESSING':
              console.log('✅ Task ready for WebSocket connection');
              resolve();
              return;

            case 'COMPLETED':
              console.log('✅ Task completed successfully');
              this.emit('task-completed', status);
              resolve();
              return;

            case 'FAILED':
              const error = new Error(`Task failed: ${status.details || 'Unknown error'}`);
              console.error('❌ Task failed:', status.details);
              this.emit('task-failed', { status, error: error.message });
              reject(error);
              return;

            case 'QUEUED':
            case 'INITIALIZING':
            case 'DOWNLOADING':
            case 'EXTRACTING':
              // Continue monitoring
              console.log(`⏳ Task ${status.status.toLowerCase()}... (${Math.round(status.progress * 100)}%)`);
              this.statusPollingTimer = setTimeout(checkStatus, pollingInterval);
              break;

            default:
              console.warn('⚠️ Unknown task status:', status.status);
              this.statusPollingTimer = setTimeout(checkStatus, pollingInterval);
          }

        } catch (error) {
          console.error('Status check failed:', error);
          this.currentState.errorCount++;
          
          if (this.currentState.errorCount < 3) {
            // Retry after longer delay
            this.statusPollingTimer = setTimeout(checkStatus, pollingInterval * 2);
          } else {
            reject(error);
          }
        }
      };

      // Start monitoring
      checkStatus();
    });
  }

  /**
   * Get current task status
   */
  async getTaskStatus(): Promise<TaskStatusResponse> {
    if (!this.currentState.task) {
      throw new Error('No active task');
    }

    try {
      const status = await this.apiService.getTaskStatus(this.currentState.task.task_id);
      
      // Update state
      this.currentState.status = status;
      this.currentState.lastStatusUpdate = Date.now();

      this.emit('status-changed', status);
      return status;

    } catch (error) {
      console.error('Failed to get task status:', error);
      throw error;
    }
  }

  // ========================================================================
  // WebSocket Management
  // ========================================================================

  /**
   * Connect WebSocket for real-time updates
   */
  async connectWebSocket(): Promise<void> {
    if (!this.currentState.task) {
      throw new Error('No active task for WebSocket connection');
    }

    if (this.currentState.wsClient && this.currentState.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('🔌 Connecting WebSocket for task:', this.currentState.task.task_id);
      
      // Create WebSocket client
      this.currentState.wsClient = new SpotOnWebSocketClient(this.currentState.task.task_id);
      this.setupWebSocketHandlers();

      // Connect
      this.currentState.connectionStartTime = Date.now();
      await this.currentState.wsClient.connect();

      this.currentState.isConnected = true;
      this.currentState.reconnectAttempts = 0;

      console.log('✅ WebSocket connected successfully');

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.currentState.errorCount++;
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.currentState.wsClient) {
      console.log('🔌 Disconnecting WebSocket...');
      
      this.currentState.wsClient.disconnect();
      this.currentState.wsClient = null;
      this.currentState.isConnected = false;
      this.currentState.isSubscribed = false;

      this.emit('websocket-disconnected');
      console.log('✅ WebSocket disconnected');
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.currentState.wsClient) return;

    // Connection established
    this.currentState.wsClient.onConnectionEstablished((payload) => {
      console.log('🎉 WebSocket connection established');
      this.emit('websocket-connected', payload);

      // Auto-subscribe if enabled
      if (this.config?.autoSubscribe !== false) {
        this.subscribeToTracking();
      }
    });

    // Tracking updates
    this.currentState.wsClient.onTrackingUpdate((payload) => {
      this.currentState.lastTrackingUpdate = Date.now();
      this.emit('tracking-update', payload);
    });

    // Status updates via WebSocket
    this.currentState.wsClient.onStatusUpdate((payload) => {
      console.log('📊 WebSocket status update:', payload.status, `(${Math.round(payload.progress * 100)}%)`);
      
      // Update cached status
      if (this.currentState.status) {
        this.currentState.status.status = payload.status;
        this.currentState.status.progress = payload.progress;
        this.currentState.status.current_step = payload.current_step;
        this.currentState.status.updated_at = new Date().toISOString();
      }

      this.emit('status-changed', this.currentState.status!);

      // Handle completion/failure via WebSocket
      if (payload.status === 'COMPLETED') {
        this.emit('task-completed', this.currentState.status!);
      } else if (payload.status === 'FAILED') {
        this.emit('task-failed', { 
          status: this.currentState.status!, 
          error: 'Task failed (WebSocket update)' 
        });
      }
    });

    // Connection state changes
    this.currentState.wsClient.onConnectionStateChange((state) => {
      console.log(`🔗 WebSocket state: ${state}`);
      
      this.currentState.isConnected = state === 'connected';
      
      if (!this.currentState.isConnected) {
        this.currentState.isSubscribed = false;
        this.currentState.reconnectAttempts++;
      }
    });

    // Errors
    this.currentState.wsClient.onError((error) => {
      console.error('🔌 WebSocket error:', error);
      this.currentState.errorCount++;
      this.emit('error', error);
    });
  }

  /**
   * Subscribe to tracking updates
   */
  subscribeToTracking(): void {
    if (this.currentState.wsClient && this.currentState.isConnected) {
      console.log('📡 Subscribing to tracking updates...');
      this.currentState.wsClient.subscribeToTracking();
      this.currentState.isSubscribed = true;
    }
  }

  /**
   * Unsubscribe from tracking updates
   */
  unsubscribeFromTracking(): void {
    if (this.currentState.wsClient && this.currentState.isConnected) {
      console.log('📡 Unsubscribing from tracking updates...');
      this.currentState.wsClient.unsubscribeFromTracking();
      this.currentState.isSubscribed = false;
    }
  }

  // ========================================================================
  // Task State Management
  // ========================================================================

  /**
   * Get current task state
   */
  getTaskState(): TaskState {
    return { ...this.currentState };
  }

  /**
   * Check if task is ready for WebSocket connection
   */
  isTaskReadyForWebSocket(): boolean {
    return this.currentState.status?.status === 'PROCESSING';
  }

  /**
   * Check if task is active
   */
  isTaskActive(): boolean {
    const status = this.currentState.status?.status;
    return status === 'PROCESSING' || 
           status === 'QUEUED' || 
           status === 'INITIALIZING' || 
           status === 'DOWNLOADING' || 
           status === 'EXTRACTING';
  }

  /**
   * Check if WebSocket is ready
   */
  isWebSocketReady(): boolean {
    return this.currentState.isConnected && this.currentState.isSubscribed;
  }

  /**
   * Get task metrics
   */
  getTaskMetrics() {
    const connectionTime = this.currentState.connectionStartTime ? 
      Date.now() - this.currentState.connectionStartTime : 0;

    const timeSinceLastStatus = this.currentState.lastStatusUpdate ?
      Date.now() - this.currentState.lastStatusUpdate : null;

    const timeSinceLastTracking = this.currentState.lastTrackingUpdate ?
      Date.now() - this.currentState.lastTrackingUpdate : null;

    return {
      taskId: this.currentState.task?.task_id,
      taskStatus: this.currentState.status?.status,
      taskProgress: this.currentState.status?.progress,
      isConnected: this.currentState.isConnected,
      isSubscribed: this.currentState.isSubscribed,
      connectionTime,
      timeSinceLastStatus,
      timeSinceLastTracking,
      errorCount: this.currentState.errorCount,
      reconnectAttempts: this.currentState.reconnectAttempts,
      wsMetrics: this.currentState.wsClient?.getMetrics(),
    };
  }

  // ========================================================================
  // Cleanup and Reset
  // ========================================================================

  /**
   * Stop task and cleanup resources
   */
  stopTask(): void {
    console.log('🛑 Stopping task and cleaning up...');

    // Stop status polling
    if (this.statusPollingTimer) {
      clearTimeout(this.statusPollingTimer);
      this.statusPollingTimer = null;
    }

    // Disconnect WebSocket
    this.disconnectWebSocket();

    // Reset state
    this.currentState = this.createInitialState();
    this.config = null;

    console.log('✅ Task stopped and cleanup completed');
  }

  /**
   * Reset service to initial state
   */
  reset(): void {
    this.stopTask();
    this.removeAllListeners();
  }

  /**
   * Create initial task state
   */
  private createInitialState(): TaskState {
    return {
      task: null,
      status: null,
      wsClient: null,
      isConnected: false,
      isSubscribed: false,
      errorCount: 0,
      reconnectAttempts: 0,
    };
  }

  // ========================================================================
  // Event System
  // ========================================================================

  /**
   * Add event listener
   */
  addEventListener<T extends keyof TaskEvents>(
    event: T, 
    listener: TaskEventListener<T>
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as Function);
  }

  /**
   * Remove event listener
   */
  removeEventListener<T extends keyof TaskEvents>(
    event: T, 
    listener: TaskEventListener<T>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener as Function);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventListeners.clear();
  }

  /**
   * Emit event to listeners
   */
  private emit<T extends keyof TaskEvents>(event: T, payload: TaskEvents[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as Function)(payload);
        } catch (error) {
          console.error(`Error in task event listener for ${event}:`, error);
        }
      });
    }
  }
}

// ============================================================================
// Utility Functions and Factories
// ============================================================================

/**
 * Create task management service
 */
export function createTaskManagementService(apiService?: APIService): TaskManagementService {
  return new TaskManagementService(apiService);
}

/**
 * Quick task start with default configuration
 */
export async function startTaskQuick(environmentId: 'campus' | 'factory'): Promise<TaskManagementService> {
  const service = createTaskManagementService();
  
  await service.startTaskWithLifecycle({
    environment_id: environmentId,
    autoConnect: true,
    autoSubscribe: true,
  });

  return service;
}

/**
 * Task status checker utility
 */
export async function checkTaskStatus(taskId: string): Promise<TaskStatus> {
  const apiService = new APIService();
  const status = await apiService.getTaskStatus(taskId);
  return status.status;
}

// Default export
export default TaskManagementService;