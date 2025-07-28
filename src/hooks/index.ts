// Real-time system hooks
export { useRealTimeSystem } from './useRealTimeSystem';
export type { RealTimeSystemConfig, RealTimeSystemReturn } from './useRealTimeSystem';

// WebSocket hook
export { useWebSocket } from './useWebSocket';
export type { WebSocketHookConfig, WebSocketHookReturn } from './useWebSocket';

// Frame synchronization hook
export { useFrameSync } from './useFrameSync';
export type { FrameSyncConfig, FrameSyncReturn } from './useFrameSync';

// Performance monitoring hook
export { usePerformanceMonitor } from './usePerformanceMonitor';
export type { PerformanceMonitorConfig, PerformanceMonitorReturn, PerformanceThresholds } from './usePerformanceMonitor';

// Error handling hook
export { useErrorHandler } from './useErrorHandler';
export type { ErrorHandlerConfig, ErrorHandlerReturn, ErrorInfo } from './useErrorHandler';