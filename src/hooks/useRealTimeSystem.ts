import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useFrameSync } from './useFrameSync';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { useErrorHandler } from './useErrorHandler';
import { useDetectionStore } from '../stores';

export interface RealTimeSystemConfig {
  autoStart: boolean;
  websocketConfig: {
    autoConnect: boolean;
    reconnectOnMount: boolean;
    healthCheckEnabled: boolean;
  };
  frameSyncConfig: {
    enableSync: boolean;
    targetFPS: number;
    maxBufferSize: number;
  };
  performanceConfig: {
    enableAlerts: boolean;
    updateInterval: number;
    historyLength: number;
  };
  errorConfig: {
    maxErrors: number;
    autoRetry: boolean;
    logErrors: boolean;
  };
}

export interface RealTimeSystemReturn {
  // System state
  isActive: boolean;
  isHealthy: boolean;
  systemStatus: 'initializing' | 'active' | 'degraded' | 'error' | 'stopped';
  
  // WebSocket
  websocketStatus: string;
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  
  // Frame sync
  currentFrame: any;
  frameIndex: number;
  isPlaying: boolean;
  fps: number;
  
  // Performance
  currentMetrics: any;
  performanceHistory: any[];
  
  // Errors
  errors: any[];
  hasUnresolvedErrors: boolean;
  
  // Controls
  start: () => Promise<void>;
  stop: () => void;
  restart: () => Promise<void>;
  
  // Frame controls
  play: () => void;
  pause: () => void;
  nextFrame: () => void;
  previousFrame: () => void;
  
  // Utilities
  exportSystemData: () => string;
  clearHistory: () => void;
}

const defaultConfig: RealTimeSystemConfig = {
  autoStart: true,
  websocketConfig: {
    autoConnect: true,
    reconnectOnMount: true,
    healthCheckEnabled: true,
  },
  frameSyncConfig: {
    enableSync: true,
    targetFPS: 30,
    maxBufferSize: 60,
  },
  performanceConfig: {
    enableAlerts: true,
    updateInterval: 1000,
    historyLength: 100,
  },
  errorConfig: {
    maxErrors: 100,
    autoRetry: true,
    logErrors: true,
  },
};

export const useRealTimeSystem = (
  config: Partial<RealTimeSystemConfig> = {}
): RealTimeSystemReturn => {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [isActive, setIsActive] = useState(false);
  const [systemStatus, setSystemStatus] = useState<RealTimeSystemReturn['systemStatus']>('initializing');
  
  // Initialize all hooks
  const webSocket = useWebSocket(finalConfig.websocketConfig);
  const frameSync = useFrameSync(finalConfig.frameSyncConfig);
  const performanceMonitor = usePerformanceMonitor(finalConfig.performanceConfig);
  const errorHandler = useErrorHandler(finalConfig.errorConfig);
  
  // Get store state
  const store = useDetectionStore();

  // Calculate system health
  const isHealthy = webSocket.isConnected && 
                   performanceMonitor.isHealthy && 
                   !errorHandler.hasUnresolvedErrors &&
                   webSocket.connectionQuality !== 'critical';

  // Update system status based on various factors
  useEffect(() => {
    if (!isActive) {
      setSystemStatus('stopped');
      return;
    }

    if (!webSocket.isConnected) {
      setSystemStatus('error');
      return;
    }

    if (errorHandler.criticalErrorCount > 0) {
      setSystemStatus('error');
      return;
    }

    if (webSocket.connectionQuality === 'poor' || webSocket.connectionQuality === 'critical') {
      setSystemStatus('degraded');
      return;
    }

    if (performanceMonitor.currentMetrics.fps < 15) {
      setSystemStatus('degraded');
      return;
    }

    setSystemStatus('active');
  }, [
    isActive,
    webSocket.isConnected,
    webSocket.connectionQuality,
    errorHandler.criticalErrorCount,
    performanceMonitor.currentMetrics.fps,
  ]);

  // Start system
  const start = useCallback(async () => {
    try {
      setSystemStatus('initializing');
      
      // Connect WebSocket
      await webSocket.connect();
      
      // Start performance monitoring
      performanceMonitor.startMonitoring();
      
      // Start frame sync if not already playing
      if (!frameSync.isPlaying) {
        frameSync.play();
      }
      
      setIsActive(true);
      console.log('Real-time system started successfully');
      
    } catch (error) {
      console.error('Failed to start real-time system:', error);
      setSystemStatus('error');
      throw error;
    }
  }, [webSocket, performanceMonitor, frameSync]);

  // Stop system
  const stop = useCallback(() => {
    try {
      // Stop frame sync
      frameSync.pause();
      
      // Stop performance monitoring
      performanceMonitor.stopMonitoring();
      
      // Disconnect WebSocket
      webSocket.disconnect();
      
      setIsActive(false);
      setSystemStatus('stopped');
      
      console.log('Real-time system stopped');
      
    } catch (error) {
      console.error('Error stopping real-time system:', error);
    }
  }, [webSocket, performanceMonitor, frameSync]);

  // Restart system
  const restart = useCallback(async () => {
    console.log('Restarting real-time system...');
    stop();
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await start();
  }, [start, stop]);

  // Auto-start if configured
  useEffect(() => {
    if (finalConfig.autoStart && !isActive) {
      start().catch(error => {
        console.error('Auto-start failed:', error);
      });
    }
  }, [finalConfig.autoStart, isActive, start]);

  // Auto-restart on critical errors
  useEffect(() => {
    if (isActive && errorHandler.criticalErrorCount > 0) {
      console.log('Critical errors detected, attempting restart...');
      restart().catch(error => {
        console.error('Auto-restart failed:', error);
      });
    }
  }, [isActive, errorHandler.criticalErrorCount, restart]);

  // Export system data
  const exportSystemData = useCallback(() => {
    const data = {
      systemInfo: {
        isActive,
        isHealthy,
        systemStatus,
        timestamp: new Date().toISOString(),
      },
      websocket: {
        status: webSocket.status,
        isConnected: webSocket.isConnected,
        connectionQuality: webSocket.connectionQuality,
        performanceMetrics: webSocket.performanceMetrics,
      },
      frameSync: {
        currentFrame: frameSync.currentFrame,
        frameIndex: frameSync.frameIndex,
        isPlaying: frameSync.isPlaying,
        fps: frameSync.fps,
        droppedFrames: frameSync.droppedFrames,
      },
      performance: {
        currentMetrics: performanceMonitor.currentMetrics,
        healthStatus: performanceMonitor.healthStatus,
        alerts: performanceMonitor.alerts,
      },
      errors: errorHandler.exportErrors(),
      store: {
        frameIndices: store.frameIndices,
        cameraConfigs: store.cameraConfigs,
        detectionStats: store.detectionStats,
      },
    };

    return JSON.stringify(data, null, 2);
  }, [
    isActive,
    isHealthy,
    systemStatus,
    webSocket,
    frameSync,
    performanceMonitor,
    errorHandler,
    store,
  ]);

  // Clear history
  const clearHistory = useCallback(() => {
    performanceMonitor.clearHistory();
    errorHandler.clearErrors();
  }, [performanceMonitor, errorHandler]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stop();
      }
    };
  }, [isActive, stop]);

  return {
    // System state
    isActive,
    isHealthy,
    systemStatus,
    
    // WebSocket
    websocketStatus: webSocket.status,
    isConnected: webSocket.isConnected,
    connectionQuality: webSocket.connectionQuality,
    
    // Frame sync
    currentFrame: frameSync.currentFrame,
    frameIndex: frameSync.frameIndex,
    isPlaying: frameSync.isPlaying,
    fps: frameSync.fps,
    
    // Performance
    currentMetrics: performanceMonitor.currentMetrics,
    performanceHistory: performanceMonitor.performanceHistory,
    
    // Errors
    errors: errorHandler.errors,
    hasUnresolvedErrors: errorHandler.hasUnresolvedErrors,
    
    // Controls
    start,
    stop,
    restart,
    
    // Frame controls
    play: frameSync.play,
    pause: frameSync.pause,
    nextFrame: frameSync.nextFrame,
    previousFrame: frameSync.previousFrame,
    
    // Utilities
    exportSystemData,
    clearHistory,
  };
};