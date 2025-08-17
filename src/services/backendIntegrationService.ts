// Backend Integration Service - Critical Pre-Phase 15 Requirements
// src/services/backendIntegrationService.ts

import { APP_CONFIG } from '../config/app';
import { apiService } from './apiService';
import { WebSocketService } from './websocketService';
import type { SystemHealthResponse, EnvironmentId } from '../types/api';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface BackendConnectionStatus {
  api: 'connected' | 'disconnected' | 'error' | 'unknown';
  websocket: 'connected' | 'disconnected' | 'error' | 'unknown';
  health: 'healthy' | 'degraded' | 'error' | 'unknown';
  lastChecked: number;
  latency: {
    api: number;
    websocket: number;
  };
  errors: string[];
}

interface BackendValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  status: BackendConnectionStatus;
}

interface BackendEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  required: boolean;
  testData?: any;
}

// =============================================================================
// Backend Integration Service
// =============================================================================

class BackendIntegrationService {
  private connectionStatus: BackendConnectionStatus;
  private validationInProgress = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connectionStatus = {
      api: 'unknown',
      websocket: 'unknown', 
      health: 'unknown',
      lastChecked: 0,
      latency: { api: 0, websocket: 0 },
      errors: [],
    };
  }

  // =============================================================================
  // Configuration Validation
  // =============================================================================

  /**
   * Validate environment configuration and URLs
   */
  validateConfiguration(): { isValid: boolean; issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check API Base URL
    if (!APP_CONFIG.API_BASE_URL) {
      issues.push('API_BASE_URL not configured');
    } else {
      // Validate URL format
      try {
        const apiUrl = new URL(APP_CONFIG.API_BASE_URL);
        if (apiUrl.protocol !== 'http:' && apiUrl.protocol !== 'https:') {
          issues.push(`Invalid API URL protocol: ${apiUrl.protocol}`);
        }
        
        // Check for common port misconfigurations
        if (apiUrl.port === '3847') {
          warnings.push('API configured for port 3847 - backend typically runs on port 8000');
        }
      } catch (error) {
        issues.push(`Invalid API URL format: ${APP_CONFIG.API_BASE_URL}`);
      }
    }

    // Check WebSocket URL
    if (!APP_CONFIG.WS_BASE_URL) {
      issues.push('WS_BASE_URL not configured');
    } else {
      try {
        const wsUrl = new URL(APP_CONFIG.WS_BASE_URL);
        if (wsUrl.protocol !== 'ws:' && wsUrl.protocol !== 'wss:') {
          issues.push(`Invalid WebSocket URL protocol: ${wsUrl.protocol}`);
        }
      } catch (error) {
        issues.push(`Invalid WebSocket URL format: ${APP_CONFIG.WS_BASE_URL}`);
      }
    }

    // Check environment file exists
    if (typeof window !== 'undefined') {
      const envVars = [
        'VITE_API_BASE_URL',
        'VITE_WS_BASE_URL', 
        'VITE_ENVIRONMENT',
      ];
      
      envVars.forEach(envVar => {
        if (!import.meta.env[envVar]) {
          warnings.push(`Environment variable ${envVar} not set`);
        }
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  // =============================================================================
  // Backend Endpoint Validation
  // =============================================================================

  /**
   * Test all critical backend endpoints
   */
  async testBackendEndpoints(): Promise<{ success: boolean; results: Record<string, any> }> {
    const endpoints: BackendEndpoint[] = [
      {
        name: 'Health Check',
        url: '/health',
        method: 'GET',
        required: true,
      },
      {
        name: 'Processing Task Start',
        url: '/processing/start',
        method: 'POST',
        required: true,
        testData: { environment_id: 'factory' as EnvironmentId },
      },
      {
        name: 'System Info',
        url: '/system/info',
        method: 'GET',
        required: false,
      },
    ];

    const results: Record<string, any> = {};
    let allSuccess = true;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing endpoint: ${endpoint.name}`);
        const startTime = Date.now();

        let response;
        if (endpoint.method === 'GET') {
          response = await fetch(`${APP_CONFIG.API_BASE_URL}${endpoint.url}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else if (endpoint.method === 'POST') {
          response = await fetch(`${APP_CONFIG.API_BASE_URL}${endpoint.url}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(endpoint.testData || {}),
          });
        }

        const latency = Date.now() - startTime;
        const success = response?.ok || false;

        results[endpoint.name] = {
          success,
          status: response?.status || 0,
          statusText: response?.statusText || 'Unknown',
          latency,
          required: endpoint.required,
          url: endpoint.url,
        };

        if (endpoint.required && !success) {
          allSuccess = false;
          console.error(`❌ Required endpoint failed: ${endpoint.name}`);
        } else if (success) {
          console.log(`✅ Endpoint test passed: ${endpoint.name} (${latency}ms)`);
        }
      } catch (error) {
        results[endpoint.name] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          required: endpoint.required,
          url: endpoint.url,
        };

        if (endpoint.required) {
          allSuccess = false;
        }
        console.error(`❌ Endpoint test failed: ${endpoint.name}`, error);
      }
    }

    return { success: allSuccess, results };
  }

  // =============================================================================
  // WebSocket Connection Validation
  // =============================================================================

  /**
   * Test WebSocket connection capability
   */
  async testWebSocketConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const wsUrl = `${APP_CONFIG.WS_BASE_URL}/ws/test`;
      
      console.log(`🔍 Testing WebSocket connection: ${wsUrl}`);

      try {
        const ws = new WebSocket(wsUrl);
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            ws.close();
            resolve({
              success: false,
              latency: Date.now() - startTime,
              error: 'Connection timeout',
            });
          }
        }, 5000); // 5 second timeout

        ws.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const latency = Date.now() - startTime;
            ws.close();
            console.log(`✅ WebSocket connection successful (${latency}ms)`);
            resolve({ success: true, latency });
          }
        };

        ws.onerror = (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.error('❌ WebSocket connection error:', error);
            resolve({
              success: false,
              latency: Date.now() - startTime,
              error: 'WebSocket connection failed',
            });
          }
        };

        ws.onclose = (event) => {
          if (!resolved && event.code !== 1000) {
            resolved = true;
            clearTimeout(timeout);
            resolve({
              success: false,
              latency: Date.now() - startTime,
              error: `WebSocket closed unexpectedly: ${event.code}`,
            });
          }
        };
      } catch (error) {
        console.error('❌ WebSocket test setup failed:', error);
        resolve({
          success: false,
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  // =============================================================================
  // Comprehensive Backend Validation
  // =============================================================================

  /**
   * Perform comprehensive backend validation
   */
  async validateBackendIntegration(): Promise<BackendValidationResult> {
    if (this.validationInProgress) {
      throw new Error('Backend validation already in progress');
    }

    this.validationInProgress = true;
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      console.log('🚀 Starting comprehensive backend validation...');

      // 1. Configuration validation
      console.log('📋 Step 1: Validating configuration...');
      const configValidation = this.validateConfiguration();
      issues.push(...configValidation.issues);
      warnings.push(...configValidation.warnings);

      // 2. API endpoint testing
      console.log('🌐 Step 2: Testing API endpoints...');
      const apiStartTime = Date.now();
      const endpointTests = await this.testBackendEndpoints();
      const apiLatency = Date.now() - apiStartTime;

      if (!endpointTests.success) {
        issues.push('One or more required API endpoints failed');
        const failedEndpoints = Object.entries(endpointTests.results)
          .filter(([, result]) => !result.success && result.required)
          .map(([name]) => name);
        
        if (failedEndpoints.length > 0) {
          recommendations.push(`Check backend service status for: ${failedEndpoints.join(', ')}`);
        }
      }

      // 3. WebSocket connection testing
      console.log('🔌 Step 3: Testing WebSocket connection...');
      const wsTest = await this.testWebSocketConnection();
      
      if (!wsTest.success) {
        issues.push(`WebSocket connection failed: ${wsTest.error}`);
        recommendations.push('Ensure backend WebSocket server is running and accessible');
      }

      // 4. System health check
      console.log('🏥 Step 4: Checking system health...');
      let healthStatus: SystemHealthResponse | null = null;
      try {
        healthStatus = await apiService.getSystemHealth();
        
        if (healthStatus.status !== 'healthy') {
          warnings.push(`Backend system health is ${healthStatus.status}`);
        }
        
        // Check individual components
        const unhealthyComponents = [];
        if (healthStatus.detector_model_status !== 'healthy') {
          unhealthyComponents.push('detector model');
        }
        if (healthStatus.tracker_factory_status !== 'healthy') {
          unhealthyComponents.push('tracker factory');
        }
        if (healthStatus.homography_matrices_status !== 'healthy') {
          unhealthyComponents.push('homography matrices');
        }
        
        if (unhealthyComponents.length > 0) {
          warnings.push(`Backend components unhealthy: ${unhealthyComponents.join(', ')}`);
          recommendations.push('Check backend logs and ensure all AI models are loaded');
        }
      } catch (error) {
        issues.push('Unable to retrieve system health status');
        recommendations.push('Verify backend /health endpoint is accessible');
      }

      // Update connection status
      this.connectionStatus = {
        api: endpointTests.success ? 'connected' : 'error',
        websocket: wsTest.success ? 'connected' : 'error',
        health: healthStatus?.status === 'healthy' ? 'healthy' : 'error',
        lastChecked: Date.now(),
        latency: {
          api: apiLatency,
          websocket: wsTest.latency,
        },
        errors: [...issues],
      };

      // Generate final recommendations
      if (issues.length === 0 && warnings.length === 0) {
        recommendations.push('Backend integration is fully operational');
      } else if (issues.length > 0) {
        recommendations.push('Resolve critical issues before proceeding');
        recommendations.push('Check backend service is running on correct port (8000)');
        recommendations.push('Verify .env.local configuration matches backend setup');
      }

      console.log('✅ Backend validation completed');
      
      return {
        isValid: issues.length === 0,
        issues,
        warnings,
        recommendations,
        status: this.connectionStatus,
      };
    } finally {
      this.validationInProgress = false;
    }
  }

  // =============================================================================
  // Health Monitoring
  // =============================================================================

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.stopHealthMonitoring();
    }

    console.log(`🔄 Starting health monitoring (${intervalMs}ms interval)`);
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const quickValidation = await this.quickHealthCheck();
        
        if (!quickValidation.isHealthy) {
          console.warn('⚠️ Backend health check failed, attempting reconnection');
          this.attemptReconnection();
        } else {
          this.reconnectAttempts = 0; // Reset on success
        }
      } catch (error) {
        console.error('❌ Health monitoring error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      console.log('🛑 Health monitoring stopped');
    }
  }

  /**
   * Quick health check for monitoring
   */
  private async quickHealthCheck(): Promise<{ isHealthy: boolean; latency: number }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const latency = Date.now() - startTime;
      const isHealthy = response.ok;
      
      this.connectionStatus.latency.api = latency;
      this.connectionStatus.api = isHealthy ? 'connected' : 'error';
      this.connectionStatus.lastChecked = Date.now();
      
      return { isHealthy, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.connectionStatus.api = 'error';
      this.connectionStatus.lastChecked = Date.now();
      
      return { isHealthy: false, latency };
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Cap at 30s
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      const validation = await this.quickHealthCheck();
      if (validation.isHealthy) {
        console.log('✅ Reconnection successful');
        this.reconnectAttempts = 0;
      }
    }, delay);
  }

  // =============================================================================
  // Service Discovery
  // =============================================================================

  /**
   * Discover backend service endpoints
   */
  async discoverServices(): Promise<{ endpoints: string[]; capabilities: string[] }> {
    try {
      // Try to get service info from backend
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/system/info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const serviceInfo = await response.json();
        return {
          endpoints: serviceInfo.endpoints || [],
          capabilities: serviceInfo.capabilities || [],
        };
      }
    } catch (error) {
      console.warn('Service discovery failed, using defaults:', error);
    }

    // Fallback to known endpoints
    return {
      endpoints: [
        '/health',
        '/processing/start',
        '/processing/{task_id}/status',
        '/ws/tracking/{task_id}',
      ],
      capabilities: [
        'person_detection',
        'multi_object_tracking', 
        'cross_camera_reid',
        'real_time_processing',
      ],
    };
  }

  // =============================================================================
  // Getters and Utilities
  // =============================================================================

  /**
   * Get current connection status
   */
  getConnectionStatus(): BackendConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if backend is ready
   */
  isBackendReady(): boolean {
    return (
      this.connectionStatus.api === 'connected' &&
      this.connectionStatus.health === 'healthy'
    );
  }

  /**
   * Get connection latency metrics
   */
  getLatencyMetrics(): { api: number; websocket: number } {
    return { ...this.connectionStatus.latency };
  }

  /**
   * Generate integration report
   */
  generateIntegrationReport(): string {
    const status = this.connectionStatus;
    const report = [
      '# Backend Integration Status Report',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      `**Last Check**: ${new Date(status.lastChecked).toISOString()}`,
      '',
      '## Connection Status',
      `- **API**: ${status.api} (${status.latency.api}ms)`,
      `- **WebSocket**: ${status.websocket} (${status.latency.websocket}ms)`,
      `- **Health**: ${status.health}`,
      '',
      '## Configuration',
      `- **API URL**: ${APP_CONFIG.API_BASE_URL}`,
      `- **WebSocket URL**: ${APP_CONFIG.WS_BASE_URL}`,
      '',
    ];

    if (status.errors.length > 0) {
      report.push('## Errors');
      status.errors.forEach(error => report.push(`- ${error}`));
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Cleanup service
   */
  dispose(): void {
    this.stopHealthMonitoring();
    console.log('🧹 Backend Integration Service disposed');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const backendIntegrationService = new BackendIntegrationService();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick backend connectivity check
 */
export async function checkBackendConnectivity(): Promise<boolean> {
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

/**
 * Validate backend URL format
 */
export function validateBackendUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { isValid: false, error: 'URL must use http or https protocol' };
    }
    
    if (!parsedUrl.hostname) {
      return { isValid: false, error: 'URL must have a valid hostname' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

export default backendIntegrationService;