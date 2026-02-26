// Application Configuration
// src/config/app.ts

import { DEFAULT_CONFIG } from '../types/api';

// ============================================================================
// Environment Variables and Configuration
// ============================================================================

/**
 * Application configuration loaded from environment variables
 */
export const APP_CONFIG = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || DEFAULT_CONFIG.API_BASE_URL,
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || DEFAULT_CONFIG.WS_BASE_URL,

  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG_MODE: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',

  // Performance Settings
  DETECTION_CONFIDENCE_THRESHOLD: parseFloat(
    import.meta.env.VITE_DETECTION_CONFIDENCE_THRESHOLD ||
    String(DEFAULT_CONFIG.DETECTION_CONFIDENCE_THRESHOLD)
  ),
  REID_SIMILARITY_THRESHOLD: parseFloat(
    import.meta.env.VITE_REID_SIMILARITY_THRESHOLD ||
    String(DEFAULT_CONFIG.REID_SIMILARITY_THRESHOLD)
  ),
  TARGET_FPS: parseInt(import.meta.env.VITE_TARGET_FPS || String(DEFAULT_CONFIG.TARGET_FPS)),
  FRAME_JPEG_QUALITY: parseInt(
    import.meta.env.VITE_FRAME_JPEG_QUALITY || String(DEFAULT_CONFIG.FRAME_JPEG_QUALITY)
  ),

  // UI Settings
  MAX_TRAJECTORY_POINTS: parseInt(import.meta.env.VITE_MAX_TRAJECTORY_POINTS || '100'),
  UPDATE_INTERVAL_MS: parseInt(import.meta.env.VITE_UPDATE_INTERVAL_MS || '100'),
  WEBSOCKET_RECONNECT_DELAY: parseInt(import.meta.env.VITE_WEBSOCKET_RECONNECT_DELAY || '3000'),

  // Development Settings
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  DEV_MODE: import.meta.env.NODE_ENV === 'development',
  PROD_MODE: import.meta.env.NODE_ENV === 'production',

  // Version Information
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  BUILD_TIME: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
  GIT_COMMIT: import.meta.env.VITE_GIT_COMMIT || 'unknown',
} as const;

// ============================================================================
// Application Constants
// ============================================================================

/**
 * Application metadata and branding
 */
export const APP_METADATA = {
  NAME: 'SpotOn Person Tracking System',
  SHORT_NAME: 'SpotOn',
  DESCRIPTION: 'Real-time multi-camera person tracking and analytics system',
  AUTHOR: 'SpotOn Development Team',
  COPYRIGHT: `© ${new Date().getFullYear()} SpotOn Technologies`,
  HOMEPAGE: 'https://spoton.example.com',
  SUPPORT_EMAIL: 'support@spoton.example.com',
} as const;

/**
 * UI Layout and Design Constants
 */
export const UI_CONSTANTS = {
  // Layout breakpoints (matches Tailwind CSS)
  BREAKPOINTS: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Z-index layers
  Z_INDEX: {
    BASE: 1,
    DROPDOWN: 10,
    STICKY: 20,
    FIXED: 30,
    MODAL_BACKDROP: 40,
    MODAL: 50,
    POPOVER: 60,
    TOOLTIP: 70,
    NOTIFICATION: 80,
    LOADING: 90,
  },

  // Animation durations (in milliseconds)
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    EXTRA_SLOW: 1000,
  },

  // Component sizes
  SIZES: {
    HEADER_HEIGHT: 64,
    SIDEBAR_WIDTH: 256,
    SIDEBAR_WIDTH_COLLAPSED: 64,
    FOOTER_HEIGHT: 48,
    CAMERA_VIEW_MIN_HEIGHT: 240,
    CAMERA_VIEW_ASPECT_RATIO: 16 / 9,
  },

  // Colors (matching person identification)
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#64748B',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#06B6D4',
  },
} as const;

/**
 * Performance and Resource Limits
 */
export const PERFORMANCE_LIMITS = {
  // WebSocket and networking
  MAX_WEBSOCKET_CONNECTIONS: 5,
  WEBSOCKET_TIMEOUT_MS: 30000,
  API_REQUEST_TIMEOUT_MS: 15000,
  MAX_RETRY_ATTEMPTS: 3,

  // Memory and caching
  MAX_CACHED_FRAMES: 100,
  MAX_TRAJECTORY_HISTORY: 1000,
  MAX_PERSON_THUMBNAILS: 50,
  CACHE_CLEANUP_INTERVAL_MS: 60000,

  // UI Performance
  MAX_CONCURRENT_ANIMATIONS: 10,
  THROTTLE_RESIZE_MS: 100,
  DEBOUNCE_SEARCH_MS: 300,
  MAX_RENDERED_PERSONS: 50,

  // File and data sizes
  MAX_IMAGE_SIZE_MB: 5,
  MAX_VIDEO_SEGMENT_MB: 50,
  MAX_ANALYTICS_DATA_POINTS: 1000,
} as const;

/**
 * Feature availability based on environment
 */
export const FEATURE_FLAGS = {
  // Core features (always available)
  REAL_TIME_TRACKING: true,
  MULTI_CAMERA_VIEW: true,
  PERSON_FOCUS: true,

  // Optional features (configurable)
  ANALYTICS_PAGE: APP_CONFIG.ENABLE_ANALYTICS,
  SETTINGS_PAGE: true,
  USER_MANAGEMENT: false, // Not implemented in Phase 1
  EXPORT_FUNCTIONALITY: false, // Future enhancement

  // Development features
  DEBUG_PANEL: APP_CONFIG.ENABLE_DEBUG_MODE,
  PERFORMANCE_MONITORING: APP_CONFIG.ENABLE_PERFORMANCE_MONITORING,

  // Experimental features (disabled by default)
  AI_INSIGHTS: false,
  PREDICTIVE_TRACKING: false,
  FACIAL_RECOGNITION: false, // Privacy concerns
} as const;

// ============================================================================
// Validation and Health Checks
// ============================================================================

/**
 * Validate application configuration
 */
export function validateAppConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required configuration checks
  if (!APP_CONFIG.API_BASE_URL) {
    errors.push('API_BASE_URL is not configured');
  }

  if (!APP_CONFIG.WS_BASE_URL) {
    errors.push('WS_BASE_URL is not configured');
  }

  // URL format validation
  try {
    new URL(APP_CONFIG.API_BASE_URL);
  } catch {
    errors.push('API_BASE_URL is not a valid URL');
  }

  // Performance settings validation
  if (
    APP_CONFIG.DETECTION_CONFIDENCE_THRESHOLD < 0 ||
    APP_CONFIG.DETECTION_CONFIDENCE_THRESHOLD > 1
  ) {
    warnings.push('DETECTION_CONFIDENCE_THRESHOLD should be between 0 and 1');
  }

  if (APP_CONFIG.REID_SIMILARITY_THRESHOLD < 0 || APP_CONFIG.REID_SIMILARITY_THRESHOLD > 1) {
    warnings.push('REID_SIMILARITY_THRESHOLD should be between 0 and 1');
  }

  if (APP_CONFIG.TARGET_FPS < 1 || APP_CONFIG.TARGET_FPS > 60) {
    warnings.push('TARGET_FPS should be between 1 and 60');
  }

  // Development warnings
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: APP_CONFIG.DEV_MODE,
    isProduction: APP_CONFIG.PROD_MODE,
    isTest: APP_CONFIG.NODE_ENV === 'test',

    // Environment-specific settings
    enableLogging: APP_CONFIG.DEV_MODE || APP_CONFIG.ENABLE_DEBUG_MODE,
    enableSourceMaps: APP_CONFIG.DEV_MODE,
    enableHotReload: APP_CONFIG.DEV_MODE,

    // Performance settings based on environment
    enablePerformanceMonitoring: APP_CONFIG.PROD_MODE || APP_CONFIG.ENABLE_PERFORMANCE_MONITORING,
    enableErrorReporting: APP_CONFIG.PROD_MODE,

    // Security settings
    enableSecurityHeaders: APP_CONFIG.PROD_MODE,
    enableCSRFProtection: APP_CONFIG.PROD_MODE,
  };
}

/**
 * Create runtime configuration summary
 */
export function createConfigSummary() {
  const validation = validateAppConfig();
  const envConfig = getEnvironmentConfig();

  return {
    metadata: APP_METADATA,
    environment: APP_CONFIG.NODE_ENV,
    version: APP_CONFIG.VERSION,
    buildTime: APP_CONFIG.BUILD_TIME,
    gitCommit: APP_CONFIG.GIT_COMMIT,

    endpoints: {
      api: APP_CONFIG.API_BASE_URL,
      websocket: APP_CONFIG.WS_BASE_URL,
    },

    features: FEATURE_FLAGS,
    performance: PERFORMANCE_LIMITS,
    validation,
    environmentConfig: envConfig,

    // System info
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Get API endpoint URL
 */
export function getApiUrl(path: string): string {
  return `${APP_CONFIG.API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Get WebSocket endpoint URL
 */
export function getWebSocketUrl(path: string): string {
  return `${APP_CONFIG.WS_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return APP_CONFIG.DEV_MODE;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return APP_CONFIG.PROD_MODE;
}

/**
 * Get performance limit value
 */
export function getPerformanceLimit(key: keyof typeof PERFORMANCE_LIMITS): number {
  return PERFORMANCE_LIMITS[key];
}

// ============================================================================
// Development and Debug Utilities
// ============================================================================

/**
 * Log configuration summary (development only)
 */
export function logConfigSummary(): void {
  if (!APP_CONFIG.DEV_MODE) return;

  const summary = createConfigSummary();
  console.group('🔧 SpotOn Configuration Summary');
  console.log('Environment:', summary.environment);
  console.log('Version:', summary.version);
  console.log('API Endpoint:', summary.endpoints.api);
  console.log('WebSocket Endpoint:', summary.endpoints.websocket);
  console.log('Features:', summary.features);

  if (summary.validation.warnings.length > 0) {
    console.warn('Configuration Warnings:', summary.validation.warnings);
  }

  if (summary.validation.errors.length > 0) {
    console.error('Configuration Errors:', summary.validation.errors);
  }

  console.groupEnd();
}

// Run validation and logging in development
if (APP_CONFIG.DEV_MODE) {
  const validation = validateAppConfig();

  if (validation.errors.length > 0) {
    console.error('Configuration errors detected:', validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn('Configuration warnings:', validation.warnings);
  }

  // Log summary after a short delay to ensure it appears after other startup logs
  setTimeout(logConfigSummary, 1000);
}

// Export configuration for external access
export default APP_CONFIG;
