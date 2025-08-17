// Service Discovery and Configuration Management - Critical Pre-Phase 15 Requirements  
// src/services/serviceDiscoveryService.ts

import { APP_CONFIG } from '../config/app';
import type { EnvironmentId } from '../types/api';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ServiceEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS';
  description: string;
  required: boolean;
  version?: string;
  parameters?: Record<string, any>;
  responseType?: string;
}

interface BackendCapabilities {
  personDetection: boolean;
  multiObjectTracking: boolean;
  crossCameraReId: boolean;
  realTimeProcessing: boolean;
  batchProcessing: boolean;
  homographyTransform: boolean;
  videoStreaming: boolean;
  webSocketSupport: boolean;
  healthMonitoring: boolean;
}

interface BackendConfiguration {
  version: string;
  environment: 'development' | 'staging' | 'production';
  endpoints: ServiceEndpoint[];
  capabilities: BackendCapabilities;
  supportedEnvironments: EnvironmentId[];
  performance: {
    maxConcurrentTasks: number;
    avgProcessingTime: number;
    maxFrameRate: number;
    supportedResolutions: string[];
  };
  limits: {
    maxTaskDuration: number;
    maxFileSize: number;
    maxConnections: number;
    rateLimits: Record<string, number>;
  };
}

interface ServiceDiscoveryResult {
  isAvailable: boolean;
  configuration: BackendConfiguration | null;
  discoveredAt: number;
  responseTime: number;
  errors: string[];
  warnings: string[];
}

interface ConfigurationValidation {
  isValid: boolean;
  missingEndpoints: string[];
  missingCapabilities: string[];
  versionMismatch: boolean;
  recommendations: string[];
}

// =============================================================================
// Service Discovery Service
// =============================================================================

class ServiceDiscoveryService {
  private cachedConfiguration: BackendConfiguration | null = null;
  private lastDiscovery: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private discoveryInProgress = false;

  // =============================================================================
  // Service Discovery
  // =============================================================================

  /**
   * Discover backend services and capabilities
   */
  async discoverServices(forceRefresh: boolean = false): Promise<ServiceDiscoveryResult> {
    // Return cached result if valid
    if (!forceRefresh && this.cachedConfiguration && 
        (Date.now() - this.lastDiscovery) < this.cacheTimeout) {
      return {
        isAvailable: true,
        configuration: this.cachedConfiguration,
        discoveredAt: this.lastDiscovery,
        responseTime: 0,
        errors: [],
        warnings: ['Using cached configuration'],
      };
    }

    if (this.discoveryInProgress) {
      throw new Error('Service discovery already in progress');
    }

    this.discoveryInProgress = true;
    const startTime = Date.now();

    console.log('🔍 Starting backend service discovery...');

    const result: ServiceDiscoveryResult = {
      isAvailable: false,
      configuration: null,
      discoveredAt: startTime,
      responseTime: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Try to get service info from backend
      const serviceInfo = await this.fetchServiceInfo();
      
      // Step 2: Discover available endpoints
      const endpoints = await this.discoverEndpoints();
      
      // Step 3: Test backend capabilities
      const capabilities = await this.testCapabilities();
      
      // Step 4: Get performance metrics
      const performance = await this.getPerformanceMetrics();
      
      // Step 5: Get system limits
      const limits = await this.getSystemLimits();

      // Construct configuration
      const configuration: BackendConfiguration = {
        version: serviceInfo.version || '1.0.0',
        environment: this.detectEnvironment(),
        endpoints,
        capabilities,
        supportedEnvironments: serviceInfo.supportedEnvironments || ['factory', 'campus'],
        performance,
        limits,
      };

      result.isAvailable = true;
      result.configuration = configuration;
      result.responseTime = Date.now() - startTime;

      // Cache the result
      this.cachedConfiguration = configuration;
      this.lastDiscovery = startTime;

      console.log(`✅ Service discovery completed (${result.responseTime}ms)`);
      console.log(`📊 Discovered ${endpoints.length} endpoints and ${Object.keys(capabilities).length} capabilities`);

    } catch (error) {
      console.error('❌ Service discovery failed:', error);
      result.errors.push(`Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try to use fallback configuration
      const fallbackConfig = this.getFallbackConfiguration();
      if (fallbackConfig) {
        result.configuration = fallbackConfig;
        result.warnings.push('Using fallback configuration due to discovery failure');
      }
    } finally {
      result.responseTime = Date.now() - startTime;
      this.discoveryInProgress = false;
    }

    return result;
  }

  // =============================================================================
  // Service Information Fetching
  // =============================================================================

  /**
   * Fetch service information from backend
   */
  private async fetchServiceInfo(): Promise<{
    version?: string;
    supportedEnvironments?: EnvironmentId[];
    [key: string]: any;
  }> {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/system/info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.warn(`Service info request failed: ${response.status}`);
        return {};
      }
    } catch (error) {
      console.warn('Failed to fetch service info:', error);
      return {};
    }
  }

  /**
   * Discover available API endpoints
   */
  private async discoverEndpoints(): Promise<ServiceEndpoint[]> {
    const knownEndpoints: ServiceEndpoint[] = [
      {
        name: 'Health Check',
        path: '/health',
        method: 'GET',
        description: 'System health and status check',
        required: true,
        responseType: 'application/json',
      },
      {
        name: 'System Info',
        path: '/system/info',
        method: 'GET',
        description: 'Backend system information',
        required: false,
        responseType: 'application/json',
      },
      {
        name: 'Start Processing Task',
        path: '/processing/start',
        method: 'POST',
        description: 'Start video processing task',
        required: true,
        parameters: { environment_id: 'string' },
        responseType: 'application/json',
      },
      {
        name: 'Task Status',
        path: '/processing/{task_id}/status',
        method: 'GET',
        description: 'Get processing task status',
        required: true,
        parameters: { task_id: 'string' },
        responseType: 'application/json',
      },
      {
        name: 'WebSocket Tracking',
        path: '/ws/tracking/{task_id}',
        method: 'WS',
        description: 'Real-time tracking data WebSocket',
        required: true,
        parameters: { task_id: 'string' },
      },
    ];

    const availableEndpoints: ServiceEndpoint[] = [];

    // Test each endpoint for availability
    for (const endpoint of knownEndpoints) {
      try {
        if (endpoint.method === 'WS') {
          // Skip WebSocket endpoints in HTTP discovery
          availableEndpoints.push(endpoint);
          continue;
        }

        const testUrl = `${APP_CONFIG.API_BASE_URL}${endpoint.path.replace('{task_id}', 'test')}`;
        
        const response = await fetch(testUrl, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          ...(endpoint.method === 'POST' && {
            body: JSON.stringify(endpoint.parameters || {}),
          }),
        });

        // Consider endpoint available if it doesn't return 404
        if (response.status !== 404) {
          availableEndpoints.push(endpoint);
          console.log(`✅ Endpoint available: ${endpoint.name}`);
        } else {
          console.warn(`❌ Endpoint not found: ${endpoint.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Endpoint test failed: ${endpoint.name}`, error);
        // Still add required endpoints even if test fails
        if (endpoint.required) {
          availableEndpoints.push(endpoint);
        }
      }
    }

    return availableEndpoints;
  }

  /**
   * Test backend capabilities
   */
  private async testCapabilities(): Promise<BackendCapabilities> {
    const capabilities: BackendCapabilities = {
      personDetection: false,
      multiObjectTracking: false,
      crossCameraReId: false,
      realTimeProcessing: false,
      batchProcessing: false,
      homographyTransform: false,
      videoStreaming: false,
      webSocketSupport: false,
      healthMonitoring: false,
    };

    try {
      // Test health endpoint for health monitoring
      const healthResponse = await fetch(`${APP_CONFIG.API_BASE_URL}/health`);
      if (healthResponse.ok) {
        capabilities.healthMonitoring = true;
        
        const healthData = await healthResponse.json();
        
        // Infer capabilities from health response
        if (healthData.detector_model_status === 'healthy') {
          capabilities.personDetection = true;
        }
        if (healthData.tracker_factory_status === 'healthy') {
          capabilities.multiObjectTracking = true;
        }
        if (healthData.homography_matrices_status === 'healthy') {
          capabilities.homographyTransform = true;
        }
      }

      // Test processing endpoint for processing capabilities
      try {
        const processingResponse = await fetch(`${APP_CONFIG.API_BASE_URL}/processing/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environment_id: 'factory' }),
        });
        
        if (processingResponse.status !== 404) {
          capabilities.realTimeProcessing = true;
          capabilities.batchProcessing = true;
        }
      } catch {
        // Processing endpoint test failed
      }

      // Test WebSocket capability
      try {
        const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/test`;
        const ws = new WebSocket(wsUrl);
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket test timeout'));
          }, 3000);

          ws.onopen = () => {
            capabilities.webSocketSupport = true;
            clearTimeout(timeout);
            ws.close();
            resolve();
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
          };
        });
      } catch {
        // WebSocket test failed
      }

      // Infer additional capabilities based on successful tests
      if (capabilities.personDetection && capabilities.multiObjectTracking) {
        capabilities.crossCameraReId = true; // Assume if both detection and tracking work
      }

      if (capabilities.realTimeProcessing || capabilities.webSocketSupport) {
        capabilities.videoStreaming = true; // Assume streaming if real-time processing works
      }

      console.log('📊 Capabilities discovered:', capabilities);

    } catch (error) {
      console.warn('Failed to test capabilities:', error);
    }

    return capabilities;
  }

  /**
   * Get performance metrics from backend
   */
  private async getPerformanceMetrics(): Promise<BackendConfiguration['performance']> {
    const defaultPerformance = {
      maxConcurrentTasks: 5,
      avgProcessingTime: 2000,
      maxFrameRate: 30,
      supportedResolutions: ['1920x1080', '1280x720', '640x480'],
    };

    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/system/performance`);
      if (response.ok) {
        const perfData = await response.json();
        return {
          maxConcurrentTasks: perfData.max_concurrent_tasks || defaultPerformance.maxConcurrentTasks,
          avgProcessingTime: perfData.avg_processing_time || defaultPerformance.avgProcessingTime,
          maxFrameRate: perfData.max_frame_rate || defaultPerformance.maxFrameRate,
          supportedResolutions: perfData.supported_resolutions || defaultPerformance.supportedResolutions,
        };
      }
    } catch (error) {
      console.warn('Failed to get performance metrics:', error);
    }

    return defaultPerformance;
  }

  /**
   * Get system limits from backend
   */
  private async getSystemLimits(): Promise<BackendConfiguration['limits']> {
    const defaultLimits = {
      maxTaskDuration: 3600000, // 1 hour
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      maxConnections: 100,
      rateLimits: {
        'processing/start': 10, // 10 per minute
        'health': 60, // 60 per minute
      },
    };

    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/system/limits`);
      if (response.ok) {
        const limitsData = await response.json();
        return {
          maxTaskDuration: limitsData.max_task_duration || defaultLimits.maxTaskDuration,
          maxFileSize: limitsData.max_file_size || defaultLimits.maxFileSize,
          maxConnections: limitsData.max_connections || defaultLimits.maxConnections,
          rateLimits: limitsData.rate_limits || defaultLimits.rateLimits,
        };
      }
    } catch (error) {
      console.warn('Failed to get system limits:', error);
    }

    return defaultLimits;
  }

  // =============================================================================
  // Configuration Validation
  // =============================================================================

  /**
   * Validate backend configuration against requirements
   */
  validateConfiguration(config: BackendConfiguration): ConfigurationValidation {
    const validation: ConfigurationValidation = {
      isValid: true,
      missingEndpoints: [],
      missingCapabilities: [],
      versionMismatch: false,
      recommendations: [],
    };

    // Required endpoints
    const requiredEndpoints = [
      'Health Check',
      'Start Processing Task',
      'Task Status',
      'WebSocket Tracking',
    ];

    const availableEndpointNames = config.endpoints.map(ep => ep.name);
    validation.missingEndpoints = requiredEndpoints.filter(
      name => !availableEndpointNames.includes(name)
    );

    // Required capabilities
    const requiredCapabilities: (keyof BackendCapabilities)[] = [
      'personDetection',
      'multiObjectTracking',
      'realTimeProcessing',
      'webSocketSupport',
      'healthMonitoring',
    ];

    validation.missingCapabilities = requiredCapabilities.filter(
      cap => !config.capabilities[cap]
    );

    // Version compatibility (assume 1.x.x is compatible)
    const version = config.version;
    if (!version.startsWith('1.')) {
      validation.versionMismatch = true;
      validation.recommendations.push(`Backend version ${version} may not be compatible. Expected 1.x.x`);
    }

    // Performance recommendations
    if (config.performance.maxConcurrentTasks < 3) {
      validation.recommendations.push('Consider increasing max concurrent tasks for better performance');
    }

    if (config.performance.avgProcessingTime > 5000) {
      validation.recommendations.push('Processing time is high - consider optimizing backend performance');
    }

    // Overall validation
    validation.isValid = 
      validation.missingEndpoints.length === 0 && 
      validation.missingCapabilities.length === 0 && 
      !validation.versionMismatch;

    return validation;
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Get fallback configuration when discovery fails
   */
  private getFallbackConfiguration(): BackendConfiguration | null {
    return {
      version: '1.0.0',
      environment: 'development',
      endpoints: [
        {
          name: 'Health Check',
          path: '/health',
          method: 'GET',
          description: 'System health check',
          required: true,
        },
        {
          name: 'Start Processing Task',
          path: '/processing/start',
          method: 'POST',
          description: 'Start processing task',
          required: true,
        },
        {
          name: 'Task Status',
          path: '/processing/{task_id}/status',
          method: 'GET',
          description: 'Task status',
          required: true,
        },
        {
          name: 'WebSocket Tracking',
          path: '/ws/tracking/{task_id}',
          method: 'WS',
          description: 'WebSocket tracking',
          required: true,
        },
      ],
      capabilities: {
        personDetection: true,
        multiObjectTracking: true,
        crossCameraReId: true,
        realTimeProcessing: true,
        batchProcessing: true,
        homographyTransform: true,
        videoStreaming: true,
        webSocketSupport: true,
        healthMonitoring: true,
      },
      supportedEnvironments: ['factory', 'campus'],
      performance: {
        maxConcurrentTasks: 5,
        avgProcessingTime: 2000,
        maxFrameRate: 30,
        supportedResolutions: ['1920x1080'],
      },
      limits: {
        maxTaskDuration: 3600000,
        maxFileSize: 1024 * 1024 * 1024,
        maxConnections: 100,
        rateLimits: {},
      },
    };
  }

  /**
   * Detect environment type
   */
  private detectEnvironment(): 'development' | 'staging' | 'production' {
    const apiUrl = APP_CONFIG.API_BASE_URL;
    
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      return 'development';
    } else if (apiUrl.includes('staging') || apiUrl.includes('dev')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  /**
   * Get cached configuration
   */
  getCachedConfiguration(): BackendConfiguration | null {
    if (this.cachedConfiguration && 
        (Date.now() - this.lastDiscovery) < this.cacheTimeout) {
      return this.cachedConfiguration;
    }
    return null;
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cachedConfiguration = null;
    this.lastDiscovery = 0;
    console.log('🧹 Service discovery cache cleared');
  }

  /**
   * Generate service discovery report
   */
  generateDiscoveryReport(result: ServiceDiscoveryResult): string {
    const config = result.configuration;
    if (!config) {
      return `# Service Discovery Report\n\n**Status**: ❌ FAILED\n**Errors**: ${result.errors.join(', ')}`;
    }

    const report = [
      '# Service Discovery Report',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      `**Discovery Time**: ${result.responseTime}ms`,
      `**Status**: ${result.isAvailable ? '✅ AVAILABLE' : '❌ UNAVAILABLE'}`,
      '',
      '## Backend Configuration',
      `- **Version**: ${config.version}`,
      `- **Environment**: ${config.environment}`,
      `- **Supported Environments**: ${config.supportedEnvironments.join(', ')}`,
      '',
      '## Available Endpoints',
      ...config.endpoints.map(ep => `- **${ep.name}** (${ep.method}): ${ep.path}`),
      '',
      '## Capabilities',
      ...Object.entries(config.capabilities).map(([key, value]) => 
        `- **${key}**: ${value ? '✅' : '❌'}`),
      '',
      '## Performance',
      `- **Max Concurrent Tasks**: ${config.performance.maxConcurrentTasks}`,
      `- **Avg Processing Time**: ${config.performance.avgProcessingTime}ms`,
      `- **Max Frame Rate**: ${config.performance.maxFrameRate} FPS`,
      `- **Supported Resolutions**: ${config.performance.supportedResolutions.join(', ')}`,
      '',
    ];

    if (result.warnings.length > 0) {
      report.push('## Warnings');
      result.warnings.forEach(warning => report.push(`- ⚠️ ${warning}`));
      report.push('');
    }

    if (result.errors.length > 0) {
      report.push('## Errors');  
      result.errors.forEach(error => report.push(`- ❌ ${error}`));
    }

    return report.join('\n');
  }

  /**
   * Check if discovery is in progress
   */
  isDiscoveryInProgress(): boolean {
    return this.discoveryInProgress;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const serviceDiscoveryService = new ServiceDiscoveryService();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick service availability check
 */
export async function checkServiceAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default serviceDiscoveryService;