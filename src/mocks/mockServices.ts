// Mock services for SpotOn frontend development
// Simulates backend API and WebSocket behavior
// src/mocks/mockServices.ts

import {
  ProcessingTaskCreateResponse,
  TaskStatusResponse,
  SystemHealthResponse,
  WebSocketTrackingMessagePayload,
  EnvironmentId,
  WebSocketMessage,
  WebSocketMessageType,
  TaskStatus
} from '../types/api';

import {
  generateMockTrackingData,
  generateMockSystemHealth,
  generateMockTaskStatus,
  MOCK_BASE64_IMAGE,
  MOCK_CONFIG,
  MOCK_TASK_STATUSES
} from './mockData';

// Mock API delays to simulate network
const API_DELAY = 500; // 500ms
const WS_DELAY = 100; // 100ms for WebSocket messages

// Simulate network delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock task state
interface MockTaskState {
  taskId: string;
  environment: EnvironmentId;
  status: TaskStatus;
  progress: number;
  frameIndex: number;
  statusIndex: number;
  websocketListeners: Array<(message: WebSocketMessage) => void>;
  isProcessing: boolean;
  createdAt: Date;
}

class MockBackendService {
  private tasks: Map<string, MockTaskState> = new Map();
  private systemHealth: SystemHealthResponse = generateMockSystemHealth();
  private taskCounter = 0;

  // Generate unique task ID
  private generateTaskId(): string {
    return `task_${Date.now()}_${++this.taskCounter}`;
  }

  // Start processing task
  async startProcessingTask(environment: EnvironmentId): Promise<ProcessingTaskCreateResponse> {
    await delay(API_DELAY);
    
    const taskId = this.generateTaskId();
    const task: MockTaskState = {
      taskId,
      environment,
      status: 'INITIALIZING',
      progress: 0,
      frameIndex: 0,
      statusIndex: 0,
      websocketListeners: [],
      isProcessing: true,
      createdAt: new Date()
    };
    
    this.tasks.set(taskId, task);
    
    // Start task progression simulation
    this.simulateTaskProgression(taskId);
    
    console.log('🎭 Mock: Started processing task', taskId, 'for environment', environment);
    
    return {
      task_id: taskId,
      websocket_url: `ws://localhost:8000/ws/tracking/${taskId}`,
      status_url: `http://localhost:8000/api/v1/processing-tasks/${taskId}/status`,
      message: 'Processing task created successfully'
    };
  }

  // Get task status
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    await delay(API_DELAY);
    
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return generateMockTaskStatus(taskId, task.statusIndex, task.progress);
  }

  // Check system health
  async checkSystemHealth(): Promise<SystemHealthResponse> {
    await delay(API_DELAY);
    
    // Occasionally simulate system issues
    if (Math.random() < 0.05) { // 5% chance of system issues
      return {
        ...this.systemHealth,
        status: 'degraded',
        detector_model_loaded: Math.random() > 0.5,
      };
    }
    
    return this.systemHealth;
  }

  // WebSocket connection simulation
  connectWebSocket(taskId: string, onMessage: (message: WebSocketMessage) => void): () => void {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error('🎭 Mock WebSocket: Task not found', taskId);
      return () => {};
    }

    console.log('🎭 Mock WebSocket: Connected to task', taskId);
    
    // Add listener
    task.websocketListeners.push(onMessage);
    
    // Send connection established message
    setTimeout(() => {
      onMessage({
        type: 'connection_established',
        payload: {
          task_id: taskId,
          capabilities: ['tracking', 'focus', 'analytics'],
          supported_features: ['real_time_tracking', 'person_focus', 'cross_camera_reid']
        },
        timestamp: new Date().toISOString()
      });
    }, WS_DELAY);
    
    // Start sending tracking updates if task is processing
    if (task.status === 'PROCESSING') {
      this.startTrackingUpdates(taskId);
    }
    
    // Return disconnect function
    return () => {
      const index = task.websocketListeners.indexOf(onMessage);
      if (index > -1) {
        task.websocketListeners.splice(index, 1);
      }
      console.log('🎭 Mock WebSocket: Disconnected from task', taskId);
    };
  }

  // Simulate task progression through different stages
  private simulateTaskProgression(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const progressTask = () => {
      if (!task.isProcessing) return;

      // Advance progress within current status
      task.progress += 0.1 + Math.random() * 0.1; // 10-20% progress increments
      
      // Move to next status when progress reaches threshold
      if (task.progress >= 1.0 && task.statusIndex < MOCK_TASK_STATUSES.length - 1) {
        task.statusIndex++;
        task.status = MOCK_TASK_STATUSES[task.statusIndex];
        task.progress = 0;
        
        console.log('🎭 Mock: Task', taskId, 'progressed to', task.status);
        
        // Start tracking updates when processing begins
        if (task.status === 'PROCESSING') {
          this.startTrackingUpdates(taskId);
        }
        
        // Complete task
        if (task.status === 'COMPLETED') {
          task.isProcessing = false;
          task.progress = 1.0;
          console.log('🎭 Mock: Task', taskId, 'completed');
          return;
        }
      }
      
      // Send status update to WebSocket listeners
      this.broadcastStatusUpdate(taskId);
      
      // Continue progression
      setTimeout(progressTask, MOCK_CONFIG.TASK_PROGRESS_INTERVAL_MS);
    };
    
    // Start progression after initial delay
    setTimeout(progressTask, 1000);
  }

  // Start sending tracking updates
  private startTrackingUpdates(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const sendTrackingUpdate = () => {
      if (task.status !== 'PROCESSING' || !task.isProcessing) return;

      // Generate mock tracking data
      const trackingData = generateMockTrackingData(task.environment, task.frameIndex);
      
      // Add base64 images to cameras (simulate frame images)
      Object.keys(trackingData.cameras).forEach(cameraId => {
        trackingData.cameras[cameraId].frame_image_base64 = MOCK_BASE64_IMAGE;
      });

      // Broadcast to all WebSocket listeners
      const message: WebSocketMessage = {
        type: 'tracking_update',
        payload: trackingData,
        timestamp: new Date().toISOString()
      };

      task.websocketListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('🎭 Mock WebSocket: Error sending message to listener', error);
        }
      });

      task.frameIndex++;
      
      // Continue sending updates
      setTimeout(sendTrackingUpdate, MOCK_CONFIG.FRAME_INTERVAL_MS);
    };

    // Start sending updates
    sendTrackingUpdate();
  }

  // Broadcast status updates to WebSocket listeners
  private broadcastStatusUpdate(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const statusUpdate = generateMockTaskStatus(taskId, task.statusIndex, task.progress);
    const message: WebSocketMessage = {
      type: 'status_update',
      payload: statusUpdate,
      timestamp: new Date().toISOString()
    };

    task.websocketListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('🎭 Mock WebSocket: Error sending status update', error);
      }
    });
  }

  // Stop task (for cleanup)
  stopTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.isProcessing = false;
      task.status = 'COMPLETED';
      console.log('🎭 Mock: Task', taskId, 'stopped');
    }
  }

  // Get all active tasks (for debugging)
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

// Singleton instance
export const mockBackendService = new MockBackendService();

// Mock API functions that match the expected backend interface
export const mockAPI = {
  // System health
  async checkSystemHealth(): Promise<SystemHealthResponse> {
    return mockBackendService.checkSystemHealth();
  },

  // Processing tasks
  async startProcessingTask(environment: EnvironmentId): Promise<ProcessingTaskCreateResponse> {
    return mockBackendService.startProcessingTask(environment);
  },

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    return mockBackendService.getTaskStatus(taskId);
  },

  // WebSocket connection
  connectWebSocket(taskId: string, onMessage: (message: WebSocketMessage) => void): () => void {
    return mockBackendService.connectWebSocket(taskId, onMessage);
  },

  // Mock other endpoints as needed
  async getEnvironments() {
    await delay(API_DELAY);
    return [
      { id: 'factory', name: 'Factory Floor', camera_count: 4 },
      { id: 'campus', name: 'Campus Quad', camera_count: 4 }
    ];
  }
};

// mockBackendService is already exported above as a singleton

// Development helper to log mock status
if (import.meta.env.DEV) {
  (window as any).mockBackend = mockBackendService;
  console.log('🎭 Mock Backend Service available as window.mockBackend');
}