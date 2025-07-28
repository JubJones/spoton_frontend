// TODO: BACKEND INTEGRATION REQUIRED
// This file manages API configuration and environment settings.
// Update the production URLs once backend endpoints are available.
// See PLANNING.md for backend integration requirements.

import { ApiConfiguration, EnvironmentConfig } from '../types/api';

// Environment detection
export const getEnvironment = (): 'development' | 'staging' | 'production' => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('staging') || hostname.includes('dev')) {
      return 'staging';
    } else {
      return 'production';
    }
  }
  
  return import.meta.env.NODE_ENV === 'production' ? 'production' : 'development';
};

// Environment configurations
export const environmentConfigs: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    // TODO: Update with actual backend URLs when available
    apiUrl: 'http://localhost:8000/api/v1',
    wsUrl: 'ws://localhost:8000/ws',
    enableLogging: true,
    enableMocks: true, // Enable mock data for development
    mockDelay: 300
  },
  staging: {
    name: 'Staging',
    // TODO: Update with actual staging backend URLs when available
    apiUrl: 'https://staging-api.spoton.com/api/v1',
    wsUrl: 'wss://staging-api.spoton.com/ws',
    enableLogging: true,
    enableMocks: false, // Disable mocks for staging
    mockDelay: 0
  },
  production: {
    name: 'Production',
    // TODO: Update with actual production backend URLs when available
    apiUrl: 'https://api.spoton.com/api/v1',
    wsUrl: 'wss://api.spoton.com/ws',
    enableLogging: false,
    enableMocks: false, // Never use mocks in production
    mockDelay: 0
  }
};

// Get current environment configuration
export const getCurrentEnvironmentConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  return environmentConfigs[env];
};

// API Configuration
export const defaultApiConfig: ApiConfiguration = {
  baseUrl: getCurrentEnvironmentConfig().apiUrl,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  apiVersion: 'v1',
  enableMocks: getCurrentEnvironmentConfig().enableMocks,
  mockDataPath: '/src/services/mock'
};

// Feature flags
export const featureFlags = {
  enableRealTimeUpdates: true,
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  enableMockData: getCurrentEnvironmentConfig().enableMocks,
  enableDebugMode: getEnvironment() === 'development',
  enableHealthChecks: true,
  enableWebSocketReconnect: true,
  enableOfflineMode: false, // Future feature
  enableAdvancedAnalytics: getEnvironment() === 'production'
};

// API endpoints configuration
export const apiEndpoints = {
  // Environment endpoints
  environments: '/environments',
  environment: (id: string) => `/environments/${id}`,
  environmentCameras: (id: string) => `/environments/${id}/cameras`,
  
  // Detection endpoints
  detections: '/detections',
  detection: (id: string) => `/detections/${id}`,
  detectionStats: '/detections/statistics',
  detectionsSearch: '/detections/search',
  detectionsExport: '/detections/export',
  
  // Tracking endpoints
  tracking: '/tracking',
  trackingResult: (id: string) => `/tracking/${id}`,
  trackingStats: '/tracking/statistics',
  trackingSearch: '/tracking/search',
  trackingExport: '/tracking/export',
  personTrajectory: (personId: string) => `/tracking/person/${personId}/trajectory`,
  cameraTransitions: '/tracking/transitions',
  
  // Mapping endpoints
  mapping: '/mapping',
  spatialMapping: (environmentId: string) => `/mapping/spatial/${environmentId}`,
  mappingStats: '/mapping/statistics',
  coordinateTransform: '/mapping/transform',
  trajectoryAnalysis: '/mapping/trajectory-analysis',
  
  // Camera endpoints
  cameras: '/cameras',
  camera: (id: string) => `/cameras/${id}`,
  cameraCalibration: (id: string) => `/cameras/${id}/calibration`,
  cameraStatus: (id: string) => `/cameras/${id}/status`,
  
  // Health and system endpoints
  health: '/health',
  systemStatus: '/system/status',
  metrics: '/system/metrics',
  
  // Authentication endpoints (future)
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    profile: '/auth/profile'
  }
};

// WebSocket endpoints
export const wsEndpoints = {
  detections: '/ws/detections',
  tracking: '/ws/tracking',
  mapping: '/ws/mapping',
  system: '/ws/system'
};

// Request timeout configurations
export const timeoutConfig = {
  short: 5000,    // Quick requests (health checks, simple GETs)
  medium: 10000,  // Standard requests (data fetching, simple POSTs)
  long: 30000,    // Long requests (data processing, exports)
  upload: 60000   // File uploads, bulk operations
};

// Retry configurations
export const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'RATE_LIMIT_ERROR'
  ]
};

// Cache configurations
export const cacheConfig = {
  environments: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  },
  cameras: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 500
  },
  detections: {
    ttl: 30 * 1000, // 30 seconds (fresh data)
    maxSize: 1000
  },
  tracking: {
    ttl: 60 * 1000, // 1 minute
    maxSize: 1000
  },
  mapping: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  }
};

// Performance monitoring thresholds
export const performanceThresholds = {
  apiResponseTime: {
    good: 200,
    warning: 500,
    critical: 1000
  },
  websocketLatency: {
    good: 100,
    warning: 300,
    critical: 500
  },
  frameRate: {
    good: 25,
    warning: 15,
    critical: 10
  }
};

// Error codes and messages
export const errorCodes = {
  NETWORK_ERROR: 'Network connection failed',
  TIMEOUT_ERROR: 'Request timeout',
  SERVER_ERROR: 'Server error occurred',
  RATE_LIMIT_ERROR: 'Rate limit exceeded',
  VALIDATION_ERROR: 'Invalid request data',
  AUTHORIZATION_ERROR: 'Authorization failed',
  NOT_FOUND_ERROR: 'Resource not found',
  CONFLICT_ERROR: 'Resource conflict',
  MOCK_DATA_ERROR: 'Mock data generation failed'
};

// Development tools
export const devTools = {
  enableApiLogging: featureFlags.enableDebugMode,
  enablePerformanceLogging: featureFlags.enableDebugMode,
  enableErrorLogging: true,
  enableMockDataIndicator: featureFlags.enableMockData,
  enableNetworkInspection: featureFlags.enableDebugMode
};

// Export configuration getter
export const getApiConfig = (): ApiConfiguration => ({
  ...defaultApiConfig,
  baseUrl: getCurrentEnvironmentConfig().apiUrl,
  enableMocks: getCurrentEnvironmentConfig().enableMocks
});

// Export environment utilities
export const isProduction = (): boolean => getEnvironment() === 'production';
export const isDevelopment = (): boolean => getEnvironment() === 'development';
export const isStaging = (): boolean => getEnvironment() === 'staging';
export const shouldUseMocks = (): boolean => getCurrentEnvironmentConfig().enableMocks;

// Configuration validation
export const validateConfig = (config: Partial<ApiConfiguration>): boolean => {
  const requiredFields = ['baseUrl', 'timeout', 'retries'];
  return requiredFields.every(field => field in config);
};

// URL builders
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  const baseUrl = getCurrentEnvironmentConfig().apiUrl;
  let url = `${baseUrl}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

export const buildWsUrl = (endpoint: string): string => {
  const baseUrl = getCurrentEnvironmentConfig().wsUrl;
  return `${baseUrl}${endpoint}`;
};

// Export all configurations
export const apiConfig = {
  environment: getCurrentEnvironmentConfig(),
  api: getApiConfig(),
  endpoints: apiEndpoints,
  wsEndpoints,
  timeouts: timeoutConfig,
  retry: retryConfig,
  cache: cacheConfig,
  performance: performanceThresholds,
  errors: errorCodes,
  features: featureFlags,
  dev: devTools
};