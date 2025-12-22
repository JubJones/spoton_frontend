// WebSocket Integration Hook - Connects WebSocket service to Zustand stores
// src/hooks/useWebSocketIntegration.ts

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { WebSocketService, WebSocketConnectionState } from '../services/websocketService';
import { apiService } from '../services/apiService';
import { getWebSocketUrl, APP_CONFIG } from '../config/app';
import type {
  WebSocketTrackingMessagePayload,
  ProcessingTaskCreateResponse,
  EnvironmentId
} from '../types/api';

// Store hooks
import { useSystemActions, useSystemStore } from '../stores/systemStore';
import { useTrackingActions } from '../stores/trackingStore';
import { shallow } from 'zustand/shallow';

// =============================================================================
// WebSocket Integration Hook
// =============================================================================

export interface UseWebSocketIntegrationConfig {
  autoConnect?: boolean;
  autoSubscribe?: boolean;
  reconnectOnError?: boolean;
  maxReconnectAttempts?: number;
}

export interface UseWebSocketIntegrationReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Connection control
  connect: (taskId: string) => Promise<void>;
  disconnect: () => void;

  // Task management
  startTask: (environmentId: EnvironmentId) => Promise<string | null>;

  // WebSocket messaging
  subscribeToTracking: () => void;
  unsubscribeFromTracking: () => void;
  requestStatus: () => void;

  // Metrics
  connectionMetrics: ReturnType<WebSocketService['getMetrics']>;
}

const DEFAULT_CONFIG: UseWebSocketIntegrationConfig = {
  autoConnect: true,
  autoSubscribe: true,
  reconnectOnError: true,
  maxReconnectAttempts: 10,
};

/**
 * WebSocket integration hook that connects WebSocket service to Zustand stores
 * Provides a unified interface for real-time data management
 */
export function useWebSocketIntegration(
  config: UseWebSocketIntegrationConfig = DEFAULT_CONFIG
): UseWebSocketIntegrationReturn {

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Store actions
  const systemActions = useSystemActions();
  const trackingActions = useTrackingActions();

  // Store state - use individual selectors to avoid object creation
  const currentEnvironment = useSystemStore((state) => state.currentEnvironment);
  const taskId = useSystemStore((state) => state.taskId);
  const taskStatus = useSystemStore((state) => state.taskStatus);
  const taskProgress = useSystemStore((state) => state.taskProgress);
  const systemHealth = useSystemStore((state) => state.systemHealth);

  // Create stable taskInfo object
  const taskInfo = useMemo(() => ({
    taskId,
    taskStatus,
    taskProgress,
  }), [taskId, taskStatus, taskProgress]);

  // WebSocket service reference
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectRef = useRef<((taskId: string) => Promise<void>) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  // Connection state
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isConnecting: false,
    connectionError: null as string | null,
  });

  // =============================================================================
  // WebSocket Event Handlers
  // =============================================================================

  const handleConnectionEstablished = useCallback((payload: any) => {
    console.log('🔌 WebSocket connection established:', payload);

    setConnectionState(prev => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      connectionError: null,
    }));

    // Reset reconnect attempts on successful connection
    reconnectAttemptsRef.current = 0;

    // Update tracking store with connection status
    trackingActions.setWebSocketState({
      isConnected: true,
      lastConnectedAt: new Date().toISOString(),
      connectionAttempts: 0,
    });

    // Auto-subscribe if configured
    if (mergedConfig.autoSubscribe && wsServiceRef.current) {
      wsServiceRef.current.subscribeToTracking();
    }
  }, [trackingActions, mergedConfig.autoSubscribe]);

  const handleTrackingUpdate = useCallback((payload: WebSocketTrackingMessagePayload) => {
    console.log('📊 Processing tracking update:', payload.global_frame_index);

    // Phase 11: Performance monitoring for tracking updates
    const startTime = performance.now();

    try {
      // Update tracking store with real-time data
      trackingActions.processTrackingUpdate(payload);

      // Update system stats
      systemActions.updateTrackingStats({
        lastFrameIndex: payload.global_frame_index,
        lastUpdateTimestamp: payload.timestamp_processed_utc,
        personCount: Object.values(payload.cameras).reduce(
          (total, camera) => total + camera.tracks.length, 0
        ),
      });

      // Log performance metrics
      const processingTime = performance.now() - startTime;
      if (processingTime > 50) { // Log if processing takes more than 50ms
        console.warn(`⚠️ Slow tracking update processing: ${processingTime.toFixed(1)}ms`);
      }

    } catch (error) {
      console.error('❌ Error processing tracking update:', error);
      setConnectionState(prev => ({
        ...prev,
        connectionError: `Failed to process tracking data: ${(error as Error).message}`,
      }));
    }
  }, [trackingActions, systemActions]);

  const handleStatusUpdate = useCallback((payload: any) => {
    console.log('📋 Status update received:', payload);

    if (payload.taskId === taskInfo.taskId) {
      systemActions.updateTaskStatus(payload.taskId);
    }
  }, [systemActions, taskInfo.taskId]);

  const handleConnectionError = useCallback((error: Error) => {
    console.error('🔌 WebSocket connection error:', error);

    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionError: error.message,
    }));

    trackingActions.setWebSocketState({
      isConnected: false,
      lastError: error.message,
      connectionAttempts: reconnectAttemptsRef.current + 1,
    });
  }, [trackingActions]);

  const handleConnectionStateChange = useCallback((state: string) => {
    console.log('🔌 WebSocket state changed:', state);

    const isConnectedState = state === 'connected';
    const isConnectingState = state === 'connecting' || state === 'reconnecting';

    setConnectionState(prev => ({
      ...prev,
      isConnected: isConnectedState,
      isConnecting: isConnectingState,
      connectionError: state === 'error' ? 'Connection failed' : null,
    }));
  }, []);

  const handleReconnectAttempt = useCallback(({ attempt, maxAttempts }: any) => {
    console.log(`🔄 Reconnection attempt ${attempt}/${maxAttempts}`);
    reconnectAttemptsRef.current = attempt;

    if (attempt >= maxAttempts && !mergedConfig.reconnectOnError) {
      console.warn('🚫 Maximum reconnection attempts reached');
      setConnectionState(prev => ({
        ...prev,
        connectionError: 'Maximum reconnection attempts reached',
      }));
    }
  }, [mergedConfig.reconnectOnError]);

  // =============================================================================
  // Connection Management
  // =============================================================================

  const connect = useCallback(async (taskId: string) => {
    console.log('🚀 Connecting to WebSocket for task:', taskId);

    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }

    try {
      setConnectionState(prev => ({ ...prev, isConnecting: true, connectionError: null }));

      // Create new WebSocket service instance
      const wsService = new WebSocketService({
        enableBinaryFrames: true,
        enableCompression: true,
        reconnectDelay: APP_CONFIG.WEBSOCKET_RECONNECT_DELAY,
        maxReconnectAttempts: mergedConfig.maxReconnectAttempts || 10,
      });

      // Set up event listeners
      wsService.addEventListener('connection-established', handleConnectionEstablished);
      wsService.addEventListener('tracking-update', handleTrackingUpdate);
      wsService.addEventListener('status-update', handleStatusUpdate);
      wsService.addEventListener('connection-state-changed', handleConnectionStateChange);
      wsService.addEventListener('error', handleConnectionError);
      wsService.addEventListener('reconnect-attempt', handleReconnectAttempt);

      // Connect to WebSocket endpoint
      const wsEndpoint = `/ws/tracking/${taskId}`;
      await wsService.connect(wsEndpoint);

      wsServiceRef.current = wsService;
      console.log('✅ WebSocket connected successfully');

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      handleConnectionError(error as Error);
    }
  }, [
    mergedConfig.maxReconnectAttempts,
    handleConnectionEstablished,
    handleTrackingUpdate,
    handleStatusUpdate,
    handleConnectionStateChange,
    handleConnectionError,
    handleReconnectAttempt,
  ]);

  // Store connect function in ref for stable access
  connectRef.current = connect;

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');

    if (wsServiceRef.current) {
      wsServiceRef.current.removeAllListeners();
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }

    setConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
    });

    trackingActions.setWebSocketState({
      isConnected: false,
      lastDisconnectedAt: new Date().toISOString(),
      connectionAttempts: 0,
    });
  }, [trackingActions]);

  // Store disconnect function in ref for stable access
  disconnectRef.current = disconnect;

  // =============================================================================
  // Task Management
  // =============================================================================

  const startTask = useCallback(async (environmentId: EnvironmentId): Promise<string | null> => {
    console.log('🚀 Starting processing task for environment:', environmentId);

    try {
      // Set initial loading state with user-friendly message
      systemActions.setTaskInfo({
        taskId: '',
        taskStatus: 'INITIALIZING',
        taskProgress: 10,
        websocketUrl: undefined,
        statusUrl: undefined,
      });
      systemActions.setError(undefined); // Clear any previous errors

      console.log('📡 Sending task start request...');

      // Start processing task via API (now with extended timeout)
      const response: ProcessingTaskCreateResponse = await apiService.startProcessingTask({
        environment_id: environmentId,
      });

      console.log('✅ Task started successfully:', response.task_id);

      // Update system store with task info
      await systemActions.setTaskInfo({
        taskId: response.task_id,
        taskStatus: 'QUEUED',
        taskProgress: 30,
        websocketUrl: response.websocket_url,
        statusUrl: response.status_url,
      });

      // Auto-connect WebSocket if configured
      if (mergedConfig.autoConnect) {
        console.log('🔌 Connecting to WebSocket...');
        systemActions.setTaskInfo({
          taskId: response.task_id,
          taskStatus: 'CONNECTING',
          taskProgress: 50,
          websocketUrl: response.websocket_url,
          statusUrl: response.status_url,
        });

        await connect(response.task_id);
      }

      return response.task_id;

    } catch (error) {
      console.error('❌ Failed to start processing task:', error);

      const err = error as Error;
      let errorMessage = 'Failed to start processing task';
      if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        errorMessage = 'Task initialization timed out. The system may be busy loading AI models. Please try again in a moment.';
      } else if (err.message?.includes('NetworkError')) {
        errorMessage = 'Network connection failed. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = `Failed to start task: ${err.message}`;
      }

      systemActions.setError(errorMessage);
      systemActions.setTaskInfo({
        taskId: '',
        taskStatus: 'FAILED',
        taskProgress: 0,
        websocketUrl: undefined,
        statusUrl: undefined,
      });

      return null;
    }
  }, [systemActions, connect, mergedConfig.autoConnect]);

  // =============================================================================
  // WebSocket Messaging
  // =============================================================================

  const subscribeToTracking = useCallback(() => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      wsServiceRef.current.subscribeToTracking();
      console.log('📊 Subscribed to tracking updates');
    } else {
      console.warn('⚠️ Cannot subscribe: WebSocket not connected');
    }
  }, []);

  const unsubscribeFromTracking = useCallback(() => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      wsServiceRef.current.unsubscribeFromTracking();
      console.log('📊 Unsubscribed from tracking updates');
    }
  }, []);

  const requestStatus = useCallback(() => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      wsServiceRef.current.requestStatus();
      console.log('📋 Status requested');
    }
  }, []);

  // =============================================================================
  // Cleanup and Effects
  // =============================================================================

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
      }
    };
  }, []); // Empty dependency array - cleanup function doesn't change

  // Auto-reconnect on system health recovery
  useEffect(() => {
    if (
      systemHealth?.status === 'healthy' &&
      taskInfo.taskId &&
      !connectionState.isConnected &&
      !connectionState.isConnecting &&
      mergedConfig.reconnectOnError &&
      connectRef.current
    ) {
      console.log('🔄 System healthy, attempting auto-reconnect');
      // Use stable reference to avoid infinite loop
      connectRef.current(taskInfo.taskId);
    }
  }, [
    systemHealth?.status,
    taskInfo.taskId,
    connectionState.isConnected,
    connectionState.isConnecting,
    mergedConfig.reconnectOnError,
    // connectRef.current is stable and won't cause re-renders
  ]);

  // =============================================================================
  // Return Interface
  // =============================================================================

  const connectionMetrics = wsServiceRef.current?.getMetrics() || {
    connectionState: WebSocketConnectionState.DISCONNECTED,
    connectionTime: 0,
    lastMessageTime: 0,
    messageCount: 0,
    errorCount: 0,
    reconnectAttempts: 0,
    queuedMessages: 0,
  };

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    connectionError: connectionState.connectionError,

    // Connection control
    connect,
    disconnect,

    // Task management
    startTask,

    // WebSocket messaging
    subscribeToTracking,
    unsubscribeFromTracking,
    requestStatus,

    // Metrics
    connectionMetrics,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Simple connection status hook
 */
export function useWebSocketConnection() {
  const { isConnected, connectionError } = useWebSocketIntegration({
    autoConnect: false,
    autoSubscribe: false
  });

  return { isConnected, connectionError };
}

/**
 * Task-focused WebSocket hook with automatic lifecycle management
 */
export function useTaskWebSocket(environmentId?: EnvironmentId) {
  const integration = useWebSocketIntegration({
    autoConnect: true,
    autoSubscribe: true,
    reconnectOnError: true,
  });

  // Auto-start task if environment is provided
  useEffect(() => {
    if (environmentId && !integration.isConnected && !integration.isConnecting) {
      integration.startTask(environmentId);
    }
  }, [environmentId, integration]);

  return integration;
}

export default useWebSocketIntegration;