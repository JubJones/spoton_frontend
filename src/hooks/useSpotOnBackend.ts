import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type {
  SystemHealthResponse,
  ProcessingTaskCreateResponse,
  TaskStatusResponse,
  WebSocketMessage,
  WebSocketTrackingMessagePayload,
  RealTimeMetrics,
  ActivePerson,
  EnvironmentId,
} from '../types/api';
import { useBackendHealth } from './useBackendHealth';
import { APP_CONFIG } from '../config/app';
import { MOCK_CONFIG } from '../config/mock';
import { mockAPI } from '../mocks/mockServices';

// Real backend configuration - FIXED to use environment variables
const API_BASE_URL = APP_CONFIG.API_BASE_URL;
const WS_BASE_URL = APP_CONFIG.WS_BASE_URL;

export interface SpotOnBackendState {
  // Connection status
  isConnected: boolean;
  isHealthy: boolean;

  // Task management
  currentTaskId: string | null;
  taskStatus: TaskStatusResponse | null;

  // Real-time data
  latestTrackingData: WebSocketTrackingMessagePayload | null;
  connectionEstablished: boolean;

  // Binary frame support
  binaryFramesEnabled: boolean;
  compressionEnabled: boolean;

  // Error handling
  error: string | null;
  lastError: Error | null;
}

export interface SpotOnBackendActions {
  // Health checks
  checkHealth: () => Promise<SystemHealthResponse | null>;

  // Task management
  startProcessingTask: (
    environmentId?: EnvironmentId
  ) => Promise<ProcessingTaskCreateResponse | null>;
  getTaskStatus: (taskId: string) => Promise<TaskStatusResponse | null>;

  // WebSocket connection
  connectWebSocket: (taskId: string) => void;
  disconnectWebSocket: () => void;

  // Analytics (mock endpoints)
  getRealtimeMetrics: () => Promise<RealTimeMetrics | null>;
  getActivePersons: () => Promise<ActivePerson[] | null>;

  // Error handling
  clearError: () => void;
}

// Full hook implementation
const useSpotOnBackendInternal = (): [SpotOnBackendState, SpotOnBackendActions] => {
  // Use the new health check hook
  const {
    isConnected: healthConnected,
    backendStatus,
    healthCheck: performHealthCheck,
    error: healthError,
  } = useBackendHealth();

  // State management
  const [state, setState] = useState<SpotOnBackendState>({
    isConnected: false,
    isHealthy: false,
    currentTaskId: null,
    taskStatus: null,
    latestTrackingData: null,
    connectionEstablished: false,
    binaryFramesEnabled: false,
    compressionEnabled: false,
    error: null,
    lastError: null,
  });

  // Sync health state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isConnected: healthConnected,
      isHealthy: backendStatus?.status === 'healthy',
      error: healthError,
    }));
  }, [healthConnected, backendStatus, healthError]);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to update state
  const updateState = useCallback((updates: Partial<SpotOnBackendState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Error handling
  const handleError = useCallback(
    (error: Error, context?: string) => {
      console.error(`SpotOn Backend Error${context ? ` (${context})` : ''}:`, error);
      updateState({
        error: error.message,
        lastError: error,
        isConnected: false,
      });
    },
    [updateState]
  );

  // Health check (delegate to health hook)
  const checkHealth = useCallback(async (): Promise<SystemHealthResponse | null> => {
    const result = await performHealthCheck();
    if (result) {
      // Convert to expected format
      return {
        status: result.status,
        detector_model_status: result.services?.ai_models === 'loaded' ? 'loaded' : 'loading',
        tracker_factory_status: 'ready',
        homography_matrices_status: 'loaded',
        timestamp: result.timestamp || new Date().toISOString(),
      } as SystemHealthResponse;
    }
    return null;
  }, [performHealthCheck]);

  // Start processing task
  const startProcessingTask = useCallback(
    async (
      environmentId: EnvironmentId = 'factory'
    ): Promise<ProcessingTaskCreateResponse | null> => {
      try {
        const response = await axios.post<ProcessingTaskCreateResponse>(
          `${API_BASE_URL}/api/v1/processing-tasks/start`,
          { environment_id: environmentId },
          { timeout: 10000 }
        );

        const taskData = response.data;
        updateState({
          currentTaskId: taskData.task_id,
          error: null,
        });

        return taskData;
      } catch (error) {
        handleError(error as Error, 'Start Task');
        return null;
      }
    },
    [updateState, handleError]
  );

  // Get task status
  const getTaskStatus = useCallback(
    async (taskId: string): Promise<TaskStatusResponse | null> => {
      try {
        const response = await axios.get<TaskStatusResponse>(
          `${API_BASE_URL}/api/v1/processing-tasks/${taskId}/status`,
          { timeout: 5000 }
        );

        const statusData = response.data;
        updateState({
          taskStatus: statusData,
          error: null,
        });

        return statusData;
      } catch (error) {
        handleError(error as Error, 'Task Status');
        return null;
      }
    },
    [updateState, handleError]
  );

  // WebSocket connection management
  const connectWebSocket = useCallback(
    (taskId: string) => {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      try {
        const wsUrl = `${WS_BASE_URL}/ws/tracking/${taskId}`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          updateState({
            isConnected: true,
            error: null,
          });
        };

        ws.onmessage = (event) => {
          try {
            // Handle both text and binary messages
            if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
              // Binary frame data - decode metadata and handle frame
              handleBinaryFrame(event.data);
              return;
            }

            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message:', message);

            switch (message.type) {
              case 'connection_established':
                updateState({
                  connectionEstablished: true,
                  binaryFramesEnabled: message.capabilities.includes('binary_frames'),
                  compressionEnabled: message.capabilities.includes('message_compression'),
                });
                break;

              case 'tracking_update':
                updateState({
                  latestTrackingData: message.payload,
                });
                break;

              case 'status_update':
                // Handle status updates from WebSocket
                console.log('Status update:', message.payload);
                break;

              case 'system_status':
                console.log('System status:', message.data);
                break;

              default:
                console.log('Unknown message type:', message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        // Handle binary frames (enhanced WebSocket protocol)
        const handleBinaryFrame = (data: ArrayBuffer | Blob) => {
          console.log('Received binary frame data:', data);
          // For now, just log the binary data
          // In a full implementation, you would:
          // 1. Extract metadata header
          // 2. Decompress if needed
          // 3. Parse frame data
          // 4. Update state with frame image
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          updateState({
            isConnected: false,
            connectionEstablished: false,
          });

          // Attempt to reconnect after 3 seconds unless manually closed
          if (event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Attempting WebSocket reconnection...');
              connectWebSocket(taskId);
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          updateState({
            isConnected: false,
            error: 'WebSocket connection failed',
          });
        };
      } catch (error) {
        handleError(error as Error, 'WebSocket Connection');
      }
    },
    [updateState, handleError]
  );

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    updateState({
      isConnected: false,
      connectionEstablished: false,
    });
  }, [updateState]);

  // Get realtime metrics
  const getRealtimeMetrics = useCallback(async (): Promise<RealTimeMetrics | null> => {
    try {
      const response = await axios.get<RealTimeMetrics>(
        `${API_BASE_URL}/api/v1/analytics/real-time/metrics`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      handleError(error as Error, 'Realtime Metrics');
      return null;
    }
  }, [handleError]);

  // Get active persons
  const getActivePersons = useCallback(async (): Promise<ActivePerson[] | null> => {
    try {
      const response = await axios.get<ActivePerson[]>(
        `${API_BASE_URL}/api/v1/analytics/real-time/active-persons`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      handleError(error as Error, 'Active Persons');
      return null;
    }
  }, [handleError]);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null, lastError: null });
  }, [updateState]);

  // Automatic health checks
  useEffect(() => {
    // Initial health check
    checkHealth();

    // Periodic health checks every 30 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      checkHealth();
    }, 30000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [checkHealth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [disconnectWebSocket]);

  // Return state and actions
  return [
    state,
    {
      checkHealth,
      startProcessingTask,
      getTaskStatus,
      connectWebSocket,
      disconnectWebSocket,
      getRealtimeMetrics,
      getActivePersons,
      clearError,
    },
  ];
};

// Simplified hook for landing/environment pages with mock support
export const useSpotOnBackend = () => {
  const [state, actions] = useSpotOnBackendInternal();

  // In mock mode, always return connected and healthy
  if (MOCK_CONFIG.enabled) {
    return {
      isConnected: true,
      backendStatus: {
        status: 'healthy',
      },
      healthCheck: async () => {
        console.log('🎭 Mock health check - always healthy');
        return await mockAPI.checkSystemHealth();
      },
      error: null,
    };
  }

  return {
    isConnected: state.isConnected,
    backendStatus: {
      status: state.isHealthy ? 'healthy' : 'unhealthy',
    },
    healthCheck: actions.checkHealth,
    error: state.error,
  };
};

// Export the full hook with original interface for complex components
export const useSpotOnBackendFull = (): [SpotOnBackendState, SpotOnBackendActions] => {
  return useSpotOnBackendInternal();
};

// Utility functions for camera ID conversion should now use the functions from config/environments.ts
// These are kept for backward compatibility but will be deprecated
export const backendToFrontendCameraId = (backendId: string): string => {
  // Simple mapping - should use getFrontendCameraId from environments config instead
  const mappings: Record<string, string> = {
    c09: 'camera1',
    c12: 'camera2',
    c13: 'camera3',
    c16: 'camera4', // factory
    c01: 'camera1',
    c02: 'camera2',
    c03: 'camera3',
    c05: 'camera4', // campus
  };
  return mappings[backendId] || backendId;
};

export const frontendToBackendCameraId = (frontendId: string): string => {
  // This is environment-specific and should use getBackendCameraId from environments config
  return frontendId; // Placeholder - proper implementation requires environment context
};
