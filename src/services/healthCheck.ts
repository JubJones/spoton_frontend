import { apiClient } from './api';

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealth>;
  timestamp: string;
  responseTime: number;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  details?: Record<string, unknown>;
  lastCheck: string;
  errors?: string[];
}

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
  endpoints: HealthEndpoint[];
}

export interface HealthEndpoint {
  name: string;
  url: string;
  critical: boolean;
  timeout: number;
  expectedStatus?: number;
  expectedResponse?: Record<string, unknown>;
}

export type HealthCheckHandler = (result: HealthCheckResult) => void;
export type HealthChangeHandler = (service: string, oldStatus: ServiceHealth['status'], newStatus: ServiceHealth['status']) => void;

class HealthCheckService {
  private config: HealthCheckConfig;
  private healthCheckHandlers: HealthCheckHandler[] = [];
  private healthChangeHandlers: HealthChangeHandler[] = [];
  private lastHealthCheck: HealthCheckResult | null = null;
  private healthCheckInterval: number | null = null;
  private isRunning = false;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3,
      endpoints: [
        {
          name: 'API Server',
          url: '/api/v1/health',
          critical: true,
          timeout: 5000,
          expectedStatus: 200,
        },
        {
          name: 'Detection Service',
          url: '/api/v1/detection/health',
          critical: true,
          timeout: 5000,
          expectedStatus: 200,
        },
        {
          name: 'Tracking Service',
          url: '/api/v1/tracking/health',
          critical: true,
          timeout: 5000,
          expectedStatus: 200,
        },
        {
          name: 'Mapping Service',
          url: '/api/v1/mapping/health',
          critical: false,
          timeout: 5000,
          expectedStatus: 200,
        },
        {
          name: 'WebSocket Server',
          url: '/ws/health',
          critical: true,
          timeout: 3000,
          expectedStatus: 200,
        },
      ],
      ...config,
    };
  }

  // Start health check monitoring
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Perform initial health check
    this.performHealthCheck();
    
    // Schedule recurring health checks
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);
  }

  // Stop health check monitoring
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Perform health check
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const services: Record<string, ServiceHealth> = {};
    const timestamp = new Date().toISOString();

    // Check each endpoint
    const healthCheckPromises = this.config.endpoints.map(endpoint => 
      this.checkEndpoint(endpoint)
    );

    const results = await Promise.allSettled(healthCheckPromises);

    // Process results
    results.forEach((result, index) => {
      const endpoint = this.config.endpoints[index];
      
      if (result.status === 'fulfilled') {
        services[endpoint.name] = result.value;
      } else {
        services[endpoint.name] = {
          status: 'down',
          responseTime: endpoint.timeout,
          lastCheck: timestamp,
          errors: [result.reason?.message || 'Unknown error'],
        };
      }
    });

    // Calculate overall health
    const overall = this.calculateOverallHealth(services);
    
    const healthResult: HealthCheckResult = {
      overall,
      services,
      timestamp,
      responseTime: Date.now() - startTime,
    };

    // Check for health changes
    this.checkHealthChanges(healthResult);
    
    // Update last health check
    this.lastHealthCheck = healthResult;
    
    // Notify handlers
    this.notifyHealthCheckHandlers(healthResult);
    
    return healthResult;
  }

  // Check individual endpoint
  private async checkEndpoint(endpoint: HealthEndpoint): Promise<ServiceHealth> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await Promise.race([
          apiClient.get(endpoint.url),
          this.timeoutPromise(endpoint.timeout),
        ]);

        const responseTime = Date.now() - startTime;

        // Check response status
        if (endpoint.expectedStatus && response.status !== endpoint.expectedStatus) {
          throw new Error(`Expected status ${endpoint.expectedStatus}, got ${response.status}`);
        }

        // Check response content if specified
        if (endpoint.expectedResponse) {
          const isValidResponse = this.validateResponse(response.data, endpoint.expectedResponse);
          if (!isValidResponse) {
            throw new Error('Response content does not match expected format');
          }
        }

        // Determine status based on response time
        let status: ServiceHealth['status'] = 'up';
        if (responseTime > endpoint.timeout * 0.8) {
          status = 'degraded';
        }

        return {
          status,
          responseTime,
          lastCheck: timestamp,
          details: {
            httpStatus: response.status,
            attempt: attempt + 1,
            data: response.data,
          },
        };

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // If this is the last attempt, return failure
        if (attempt === this.config.retries - 1) {
          return {
            status: 'down',
            responseTime,
            lastCheck: timestamp,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            details: {
              attempt: attempt + 1,
              totalAttempts: this.config.retries,
            },
          };
        }

        // Wait before retrying
        await this.delay(1000 * (attempt + 1));
      }
    }

    // This should never be reached, but TypeScript needs it
    return {
      status: 'down',
      responseTime: endpoint.timeout,
      lastCheck: timestamp,
      errors: ['Maximum retries exceeded'],
    };
  }

  // Create timeout promise
  private timeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
  }

  // Validate response content
  private validateResponse(actual: unknown, expected: Record<string, unknown>): boolean {
    try {
      if (typeof actual !== 'object' || actual === null) {
        return false;
      }

      const actualObj = actual as Record<string, unknown>;
      
      for (const [key, value] of Object.entries(expected)) {
        if (actualObj[key] !== value) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // Calculate overall health
  private calculateOverallHealth(services: Record<string, ServiceHealth>): HealthCheckResult['overall'] {
    const criticalEndpoints = this.config.endpoints.filter(e => e.critical);
    const criticalServices = criticalEndpoints.map(e => services[e.name]);

    // Check if any critical service is down
    const criticalDown = criticalServices.some(s => s.status === 'down');
    if (criticalDown) {
      return 'unhealthy';
    }

    // Check if any critical service is degraded
    const criticalDegraded = criticalServices.some(s => s.status === 'degraded');
    if (criticalDegraded) {
      return 'degraded';
    }

    // Check if any non-critical service is down
    const nonCriticalDown = Object.values(services).some(s => s.status === 'down');
    if (nonCriticalDown) {
      return 'degraded';
    }

    return 'healthy';
  }

  // Check for health changes
  private checkHealthChanges(newResult: HealthCheckResult): void {
    if (!this.lastHealthCheck) {
      return;
    }

    // Compare service statuses
    Object.entries(newResult.services).forEach(([serviceName, newHealth]) => {
      const oldHealth = this.lastHealthCheck?.services[serviceName];
      
      if (oldHealth && oldHealth.status !== newHealth.status) {
        this.notifyHealthChangeHandlers(serviceName, oldHealth.status, newHealth.status);
      }
    });
  }

  // Notify handlers
  private notifyHealthCheckHandlers(result: HealthCheckResult): void {
    this.healthCheckHandlers.forEach(handler => {
      try {
        handler(result);
      } catch (error) {
        console.error('Error in health check handler:', error);
      }
    });
  }

  private notifyHealthChangeHandlers(service: string, oldStatus: ServiceHealth['status'], newStatus: ServiceHealth['status']): void {
    this.healthChangeHandlers.forEach(handler => {
      try {
        handler(service, oldStatus, newStatus);
      } catch (error) {
        console.error('Error in health change handler:', error);
      }
    });
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  onHealthCheck(handler: HealthCheckHandler): void {
    this.healthCheckHandlers.push(handler);
  }

  offHealthCheck(handler: HealthCheckHandler): void {
    const index = this.healthCheckHandlers.indexOf(handler);
    if (index > -1) {
      this.healthCheckHandlers.splice(index, 1);
    }
  }

  onHealthChange(handler: HealthChangeHandler): void {
    this.healthChangeHandlers.push(handler);
  }

  offHealthChange(handler: HealthChangeHandler): void {
    const index = this.healthChangeHandlers.indexOf(handler);
    if (index > -1) {
      this.healthChangeHandlers.splice(index, 1);
    }
  }

  // Get current health status
  getCurrentHealth(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  // Get service health
  getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.lastHealthCheck?.services[serviceName] || null;
  }

  // Check if system is healthy
  isHealthy(): boolean {
    return this.lastHealthCheck?.overall === 'healthy';
  }

  // Check if system is degraded
  isDegraded(): boolean {
    return this.lastHealthCheck?.overall === 'degraded';
  }

  // Check if system is unhealthy
  isUnhealthy(): boolean {
    return this.lastHealthCheck?.overall === 'unhealthy';
  }

  // Update configuration
  updateConfig(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Get configuration
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  // Manual health check
  async checkNow(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }

  // Reset health check state
  reset(): void {
    this.lastHealthCheck = null;
  }
}

// Export service instance
export const healthCheck = new HealthCheckService();

// Export service class for custom instances
export { HealthCheckService };