# SpotOn Frontend - API Integration Documentation

## Overview

This document provides comprehensive technical documentation for integrating the SpotOn frontend with the FastAPI backend system. The frontend is built with React 19, TypeScript, and Vite, designed to work seamlessly with the SpotOn person tracking backend.

## Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  FastAPI Server │◄──►│  AI Processing  │
│  (Frontend)     │    │   (Backend)     │    │   Pipeline      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │     Redis       │    │   TimescaleDB   │
│  Connection     │    │    Cache        │    │   Tracking      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Communication Flow
1. **Initialization**: Client establishes HTTP connection for health checks
2. **Task Creation**: POST to `/api/v1/processing-tasks/start`
3. **WebSocket Connection**: Real-time data via `/ws/tracking/{task_id}`
4. **Data Flow**: Tracking updates, system status, and control messages
5. **State Management**: Zustand stores with persistence

## API Integration Guide

### Base Configuration
```typescript
// Environment configuration
const API_CONFIG = {
  BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
  WS_BASE_URL: process.env.VITE_WS_BASE_URL || 'ws://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RECONNECT_INTERVAL: 5000,
};
```

### HTTP API Integration

#### 1. Health Check Endpoint
**Endpoint**: `GET /health`
**Purpose**: Verify backend system status
**Response**:
```typescript
interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  detector_model_status: 'loaded' | 'loading' | 'error';
  tracker_factory_status: 'ready' | 'initializing' | 'error';
  homography_matrices_status: 'loaded' | 'missing' | 'error';
  timestamp: string;
}
```

**Implementation**:
```typescript
import { ApiService } from '../services/apiService';

const apiService = new ApiService(API_CONFIG.BASE_URL);

// Check system health
const health = await apiService.checkHealth();
if (health?.status === 'healthy') {
  // System is ready
  console.log('Backend system is healthy');
} else {
  // Handle degraded or error state
  console.warn('Backend system issues detected', health);
}
```

#### 2. Processing Task Management
**Start Task Endpoint**: `POST /api/v1/processing-tasks/start`
**Request**:
```typescript
interface ProcessingTaskStartRequest {
  environment_id: 'campus' | 'factory';
}
```

**Response**:
```typescript
interface ProcessingTaskCreateResponse {
  task_id: string;
  websocket_url: string;
  status_url: string;
  message: string;
}
```

**Implementation**:
```typescript
// Start processing task
const taskRequest: ProcessingTaskStartRequest = {
  environment_id: 'campus'
};

try {
  const taskResponse = await apiService.startProcessingTask(taskRequest);
  
  // Store task information
  const { task_id, websocket_url } = taskResponse;
  
  // Connect to WebSocket for real-time updates
  const wsService = new WebSocketService();
  await wsService.connect(websocket_url);
  
} catch (error) {
  console.error('Failed to start processing task:', error);
  // Handle error - show user-friendly message
}
```

#### 3. Task Status Monitoring
**Endpoint**: `GET /api/v1/processing-tasks/{task_id}/status`
**Response**:
```typescript
interface TaskStatusResponse {
  task_id: string;
  status: 'QUEUED' | 'INITIALIZING' | 'DOWNLOADING' | 'EXTRACTING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
  current_step: string;
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

**Implementation**:
```typescript
// Poll task status
const pollTaskStatus = async (taskId: string) => {
  try {
    const status = await apiService.getTaskStatus(taskId);
    
    // Update UI based on status
    switch (status.status) {
      case 'PROCESSING':
        updateProgressBar(status.progress);
        break;
      case 'COMPLETED':
        onTaskCompleted();
        break;
      case 'FAILED':
        handleTaskError(status.details);
        break;
    }
  } catch (error) {
    console.error('Failed to get task status:', error);
  }
};

// Poll every 5 seconds
const statusInterval = setInterval(() => pollTaskStatus(taskId), 5000);
```

### WebSocket Integration

#### Connection Management
```typescript
import { WebSocketService } from '../services/websocketService';

class TrackingConnection {
  private wsService: WebSocketService;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.wsService = new WebSocketService();
    this.setupEventHandlers();
  }

  async connect(websocketUrl: string): Promise<void> {
    try {
      await this.wsService.connect(websocketUrl);
      this.reconnectAttempts = 0;
    } catch (error) {
      await this.handleConnectionError(error);
    }
  }

  private setupEventHandlers(): void {
    // Handle tracking updates
    this.wsService.onTrackingUpdate((payload) => {
      this.processTrackingUpdate(payload);
    });

    // Handle system status
    this.wsService.onSystemStatus((payload) => {
      this.updateSystemStatus(payload);
    });

    // Handle disconnection
    this.wsService.onDisconnect(async (code, reason) => {
      console.warn('WebSocket disconnected:', code, reason);
      await this.attemptReconnection();
    });

    // Handle errors
    this.wsService.onError((error) => {
      console.error('WebSocket error:', error);
    });
  }

  private async handleConnectionError(error: any): Promise<void> {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      setTimeout(() => this.connect(websocketUrl), delay);
    } else {
      throw new Error('Max reconnection attempts exceeded');
    }
  }
}
```

#### Message Handling
```typescript
interface WebSocketTrackingMessagePayload {
  global_frame_index: number;
  scene_id: 'campus' | 'factory';
  timestamp_processed_utc: string;
  cameras: {
    [camera_id: string]: CameraTrackingData;
  };
}

interface CameraTrackingData {
  image_source: string;
  frame_image_base64?: string;
  tracks: TrackedPerson[];
}

interface TrackedPerson {
  track_id: number;
  global_id?: string;
  bbox_xyxy: [number, number, number, number];
  confidence?: number;
  class_id?: number;
  map_coords?: [number, number];
}

// Process tracking updates
private processTrackingUpdate(payload: WebSocketTrackingMessagePayload): void {
  // Update camera displays
  Object.entries(payload.cameras).forEach(([cameraId, cameraData]) => {
    this.updateCameraDisplay(cameraId, cameraData);
  });

  // Update map visualization
  this.updateMapVisualization(payload);

  // Update person tracking state
  this.updatePersonTracking(payload);
}

private updateCameraDisplay(cameraId: string, cameraData: CameraTrackingData): void {
  // Update image source
  const imageSrc = cameraData.frame_image_base64 
    ? `data:image/jpeg;base64,${cameraData.frame_image_base64}`
    : `/frames/${cameraId}/${cameraData.image_source}`;

  // Update tracking overlays
  const boundingBoxes = cameraData.tracks.map(track => ({
    id: track.global_id || `${track.track_id}`,
    bbox: track.bbox_xyxy,
    confidence: track.confidence,
    highlighted: this.highlightedPersonIds.has(track.global_id || ''),
  }));

  // Dispatch to camera component
  this.cameraStore.updateCamera(cameraId, {
    imageSrc,
    tracks: cameraData.tracks,
    boundingBoxes,
  });
}
```

### Authentication Integration

#### JWT Token Management
```typescript
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class AuthManager {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiService.login(credentials);
    
    this.token = response.access_token;
    this.tokenExpiry = new Date(Date.now() + response.expires_in * 1000);
    
    // Set authorization header for future requests
    apiService.setAuthToken(this.token);
    
    return response;
  }

  isTokenValid(): boolean {
    return this.token !== null && 
           this.tokenExpiry !== null && 
           new Date() < this.tokenExpiry;
  }

  async refreshTokenIfNeeded(): Promise<void> {
    if (!this.isTokenValid()) {
      // Redirect to login or refresh token
      throw new Error('Authentication required');
    }
  }
}
```

### Error Handling Strategies

#### API Error Handling
```typescript
enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

class ApiErrorHandler {
  static handleError(error: any): ApiErrorType {
    // Network or connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return ApiErrorType.NETWORK_ERROR;
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return ApiErrorType.TIMEOUT_ERROR;
    }

    // HTTP status-based errors
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 401:
        case 403:
          return ApiErrorType.AUTHENTICATION_ERROR;
        case 400:
          return ApiErrorType.VALIDATION_ERROR;
        case 429:
          return ApiErrorType.RATE_LIMIT_ERROR;
        case 500:
        case 502:
        case 503:
        case 504:
          return ApiErrorType.SERVER_ERROR;
        default:
          return ApiErrorType.SERVER_ERROR;
      }
    }

    return ApiErrorType.SERVER_ERROR;
  }

  static getErrorMessage(errorType: ApiErrorType): string {
    const messages = {
      [ApiErrorType.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
      [ApiErrorType.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
      [ApiErrorType.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
      [ApiErrorType.VALIDATION_ERROR]: 'Invalid request data. Please check your input.',
      [ApiErrorType.RATE_LIMIT_ERROR]: 'Too many requests. Please wait and try again.',
      [ApiErrorType.SERVER_ERROR]: 'Server error occurred. Please try again later.',
    };

    return messages[errorType] || 'An unexpected error occurred.';
  }
}
```

#### WebSocket Error Recovery
```typescript
class WebSocketErrorRecovery {
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Maximum 30 seconds
  private reconnectMultiplier = 1.5;

  async handleConnectionError(error: any): Promise<void> {
    console.error('WebSocket connection error:', error);

    // Exponential backoff for reconnection
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    this.reconnectDelay = Math.min(
      this.reconnectDelay * this.reconnectMultiplier,
      this.maxReconnectDelay
    );

    try {
      await this.wsService.connect(this.websocketUrl);
      this.reconnectDelay = 1000; // Reset delay on successful connection
    } catch (retryError) {
      // Continue exponential backoff
      await this.handleConnectionError(retryError);
    }
  }

  handleMessageError(error: any, rawMessage: string): void {
    console.error('WebSocket message error:', error);
    
    // Log the problematic message for debugging
    console.warn('Problematic message:', rawMessage);
    
    // Continue processing other messages
    // Don't disconnect due to single message errors
  }
}
```

### Performance Optimization

#### Request Optimization
```typescript
class RequestOptimizer {
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5000; // 5 seconds

  async optimizedRequest(key: string, requestFn: () => Promise<any>): Promise<any> {
    const cached = this.requestCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await requestFn();
    this.requestCache.set(key, { data, timestamp: Date.now() });
    
    return data;
  }

  // Request batching for multiple API calls
  private pendingRequests = new Map<string, Promise<any>>();

  async batchRequest(key: string, requestFn: () => Promise<any>): Promise<any> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn();
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}
```

### Environment Configuration

#### Development Environment
```typescript
// .env.development
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

#### Production Environment
```typescript
// .env.production
VITE_API_BASE_URL=https://api.spoton.example.com
VITE_WS_BASE_URL=wss://api.spoton.example.com
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

#### Environment Detection
```typescript
class EnvironmentConfig {
  static get isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  static get isProduction(): boolean {
    return import.meta.env.PROD;
  }

  static get apiConfig() {
    return {
      baseURL: import.meta.env.VITE_API_BASE_URL,
      wsBaseURL: import.meta.env.VITE_WS_BASE_URL,
      timeout: this.isDevelopment ? 30000 : 15000,
      retryAttempts: this.isDevelopment ? 5 : 3,
    };
  }
}
```

## Testing Integration

### API Service Testing
```typescript
// Mock backend responses for testing
export const createMockApiService = () => {
  const mockResponses = {
    health: {
      status: 'healthy',
      detector_model_status: 'loaded',
      tracker_factory_status: 'ready',
      homography_matrices_status: 'loaded',
      timestamp: new Date().toISOString(),
    },
    startTask: {
      task_id: 'test_task_123',
      websocket_url: 'ws://localhost:8000/ws/tracking/test_task_123',
      status_url: '/api/v1/processing-tasks/test_task_123/status',
      message: 'Task created successfully',
    },
  };

  return {
    checkHealth: jest.fn().mockResolvedValue(mockResponses.health),
    startProcessingTask: jest.fn().mockResolvedValue(mockResponses.startTask),
    getTaskStatus: jest.fn().mockResolvedValue({
      task_id: 'test_task_123',
      status: 'PROCESSING',
      progress: 65,
      current_step: 'Processing frames',
      details: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  };
};
```

### WebSocket Testing
```typescript
// Mock WebSocket for testing
export class MockWebSocketService {
  private eventHandlers = new Map<string, Function>();

  onTrackingUpdate(handler: Function): void {
    this.eventHandlers.set('trackingUpdate', handler);
  }

  simulateTrackingUpdate(payload: any): void {
    const handler = this.eventHandlers.get('trackingUpdate');
    if (handler) {
      handler(payload);
    }
  }

  async connect(url: string): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  disconnect(): void {
    this.eventHandlers.clear();
  }
}
```

## Troubleshooting Guide

### Common Issues

#### 1. Connection Refused (ECONNREFUSED)
**Symptoms**: Cannot connect to backend API
**Causes**:
- Backend server not running
- Incorrect API base URL
- Network connectivity issues
- Firewall blocking connections

**Solutions**:
1. Verify backend server is running: `curl http://localhost:8000/health`
2. Check environment variables: `VITE_API_BASE_URL`
3. Test network connectivity
4. Check firewall settings

#### 2. WebSocket Connection Failed
**Symptoms**: Real-time updates not working
**Causes**:
- WebSocket URL incorrect
- Backend WebSocket server not ready
- Network proxy blocking WebSocket upgrades
- Authentication issues

**Solutions**:
1. Verify WebSocket URL in network tab
2. Check backend logs for WebSocket errors
3. Configure proxy to support WebSocket upgrades
4. Ensure proper authentication headers

#### 3. CORS Errors
**Symptoms**: Browser blocks API requests
**Causes**:
- Backend not configured for CORS
- Incorrect origin in CORS settings
- Preflight request failures

**Solutions**:
1. Configure backend CORS settings:
```python
# FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 4. High Memory Usage
**Symptoms**: Browser tab consuming excessive memory
**Causes**:
- Memory leaks in WebSocket handlers
- Accumulating tracking data
- Large image caching

**Solutions**:
1. Implement data cleanup in WebSocket handlers
2. Limit tracking history retention
3. Optimize image caching strategy
4. Use React.memo for expensive components

This documentation provides the foundation for integrating the SpotOn frontend with the backend system. For additional support, refer to the troubleshooting section or contact the development team.