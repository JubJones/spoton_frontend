import { useEffect, useRef, useState } from 'react';
import { websocketClient, WebSocketStatus, WebSocketMessage } from '../services/websocket';
import { frameHandler } from '../services/frameHandler';
import { trackingHandler } from '../services/trackingHandler';
import { statusHandler } from '../services/statusHandler';
import { healthCheck } from '../services/healthCheck';

export interface WebSocketHookConfig {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
  healthCheckEnabled?: boolean;
}

export interface WebSocketHookReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: WebSocketMessage) => boolean;
  lastMessage: WebSocketMessage | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  performanceMetrics: {
    fps: number;
    latency: number;
    frameDrops: number;
    messagesReceived: number;
    bytesReceived: number;
  };
}

export const useWebSocket = (config: WebSocketHookConfig = {}): WebSocketHookReturn => {
  const {
    autoConnect = true,
    reconnectOnMount = true,
    healthCheckEnabled = true,
  } = config;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'critical'>('excellent');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    latency: 0,
    frameDrops: 0,
    messagesReceived: 0,
    bytesReceived: 0,
  });

  const isInitialized = useRef(false);
  const messageHandlerRef = useRef<((message: WebSocketMessage) => void) | null>(null);
  const statusHandlerRef = useRef<((status: WebSocketStatus) => void) | null>(null);

  // Initialize WebSocket handlers
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Status handler
    statusHandlerRef.current = (newStatus: WebSocketStatus) => {
      setStatus(newStatus);
    };

    // Message handler
    messageHandlerRef.current = (message: WebSocketMessage) => {
      setLastMessage(message);
      
      // Route message to appropriate handler
      switch (message.type) {
        case 'frame_data':
          frameHandler.processFrameMessage(message);
          break;
        case 'tracking_update':
          trackingHandler.processTrackingMessage(message);
          break;
        case 'system_status':
          statusHandler.processSystemStatusMessage(message);
          break;
        case 'health_check':
          // Handle health check messages
          break;
      }
    };

    // Register handlers
    websocketClient.onStatus(statusHandlerRef.current);
    websocketClient.onMessage('frame_data', messageHandlerRef.current);
    websocketClient.onMessage('tracking_update', messageHandlerRef.current);
    websocketClient.onMessage('system_status', messageHandlerRef.current);
    websocketClient.onMessage('health_check', messageHandlerRef.current);

    // Performance metrics update
    const metricsInterval = setInterval(() => {
      setPerformanceMetrics(websocketClient.getPerformanceMetrics());
      setConnectionQuality(websocketClient.getConnectionQuality());
    }, 1000);

    // Start health check if enabled
    if (healthCheckEnabled) {
      healthCheck.start();
    }

    // Auto-connect
    if (autoConnect && reconnectOnMount) {
      websocketClient.connect().catch(error => {
        console.error('Failed to auto-connect WebSocket:', error);
      });
    }

    return () => {
      clearInterval(metricsInterval);
      
      // Cleanup handlers
      if (statusHandlerRef.current) {
        websocketClient.offStatus(statusHandlerRef.current);
      }
      if (messageHandlerRef.current) {
        websocketClient.offMessage('frame_data', messageHandlerRef.current);
        websocketClient.offMessage('tracking_update', messageHandlerRef.current);
        websocketClient.offMessage('system_status', messageHandlerRef.current);
        websocketClient.offMessage('health_check', messageHandlerRef.current);
      }
      
      if (healthCheckEnabled) {
        healthCheck.stop();
      }
    };
  }, [autoConnect, reconnectOnMount, healthCheckEnabled]);

  // Connect function
  const connect = async (): Promise<void> => {
    return websocketClient.connect();
  };

  // Disconnect function
  const disconnect = (): void => {
    websocketClient.disconnect();
  };

  // Send function
  const send = (message: WebSocketMessage): boolean => {
    return websocketClient.send(message);
  };

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    send,
    lastMessage,
    connectionQuality,
    performanceMetrics,
  };
};