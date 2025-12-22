// Environment Management Service - Backend Integration
// src/services/environmentService.ts

import { APIService } from './apiService';
import {
  Environment,
  DateRange,
  Camera,
  Zone,
  AnalysisSession,
  EnvironmentId
} from '../types/api';
import {
  getEnvironmentConfig,
  getAvailableEnvironments,
  validateEnvironmentConfig
} from '../config/environments';
import { MOCK_CONFIG } from '../config/mock';

/**
 * Service for managing environments and their data
 */
export class EnvironmentService {
  private apiService: APIService;
  private environmentCache: Map<string, Environment> = new Map();
  private cameraCache: Map<string, Camera[]> = new Map();
  private dateRangeCache: Map<string, DateRange> = new Map();

  constructor(apiService?: APIService) {
    this.apiService = apiService || new APIService();
  }

  // ========================================================================
  // Environment Management
  // ========================================================================

  /**
   * Get all available environments from backend
   */
  async getEnvironments(options: {
    activeOnly?: boolean;
    includeDataCheck?: boolean;
    useCache?: boolean;
  } = {}): Promise<Environment[]> {
    const { activeOnly = true, includeDataCheck = true, useCache = false } = options;
    const cacheKey = `envs_${activeOnly}_${includeDataCheck}`;

    if (useCache && this.environmentCache.has(cacheKey)) {
      return [this.environmentCache.get(cacheKey)!];
    }

    try {
      const environments = await this.apiService.getEnvironments({
        active_only: activeOnly,
        include_data_check: includeDataCheck,
      });

      // Cache results
      environments.forEach(env => {
        this.environmentCache.set(env.environment_id, env);
      });

      return environments;
    } catch (error) {
      console.error('Failed to get environments from backend:', error);

      // Fallback to local configuration
      console.log('Using fallback local environment configuration');
      return this.getFallbackEnvironments();
    }
  }

  /**
   * Get specific environment details
   */
  async getEnvironmentDetails(
    environmentId: string,
    options: { includeValidation?: boolean; useCache?: boolean } = {}
  ): Promise<Environment> {
    const { includeValidation = true, useCache = false } = options;

    if (useCache && this.environmentCache.has(environmentId)) {
      return this.environmentCache.get(environmentId)!;
    }

    try {
      const environment = await this.apiService.getEnvironmentDetails(
        environmentId,
        includeValidation
      );

      // Cache result
      this.environmentCache.set(environmentId, environment);

      return environment;
    } catch (error) {
      console.error(`Failed to get environment details for ${environmentId}:`, error);

      // Fallback to local configuration
      return this.getFallbackEnvironmentDetails(environmentId as EnvironmentId);
    }
  }

  /**
   * Get environment cameras
   */
  async getEnvironmentCameras(
    environmentId: string,
    options: { activeOnly?: boolean; useCache?: boolean } = {}
  ): Promise<Camera[]> {
    const { activeOnly = true, useCache = false } = options;
    const cacheKey = `${environmentId}_cameras_${activeOnly}`;

    if (useCache && this.cameraCache.has(cacheKey)) {
      return this.cameraCache.get(cacheKey)!;
    }

    try {
      const cameras = await this.apiService.getEnvironmentCameras(environmentId, activeOnly);

      // Cache result
      this.cameraCache.set(cacheKey, cameras);

      return cameras;
    } catch (error) {
      console.error(`Failed to get cameras for ${environmentId}:`, error);

      // Fallback to local configuration
      return this.getFallbackCameras(environmentId as EnvironmentId);
    }
  }

  /**
   * Get environment zones
   */
  async getEnvironmentZones(
    environmentId: string,
    zoneType?: string
  ): Promise<Zone[]> {
    try {
      return await this.apiService.getEnvironmentZones(environmentId, zoneType);
    } catch (error) {
      console.error(`Failed to get zones for ${environmentId}:`, error);
      return [];
    }
  }

  /**
   * Get available date ranges for environment
   */
  async getEnvironmentDateRanges(
    environmentId: string,
    options: { detailed?: boolean; useCache?: boolean } = {}
  ): Promise<DateRange> {
    const { detailed = false, useCache = false } = options;
    const cacheKey = `${environmentId}_dates_${detailed}`;

    if (useCache && this.dateRangeCache.has(cacheKey)) {
      return this.dateRangeCache.get(cacheKey)!;
    }

    try {
      const dateRange = await this.apiService.getEnvironmentDateRanges(environmentId, detailed);

      // Cache result
      this.dateRangeCache.set(cacheKey, dateRange);

      return dateRange;
    } catch (error) {
      console.error(`Failed to get date ranges for ${environmentId}:`, error);

      // Fallback to default date range
      return this.getFallbackDateRange();
    }
  }

  // ========================================================================
  // Analysis Session Management
  // ========================================================================

  /**
   * Create analysis session for environment
   */
  async createAnalysisSession(
    environmentId: string,
    session: {
      start_time: string;
      end_time: string;
      session_name: string;
      description: string;
    }
  ): Promise<AnalysisSession> {
    try {
      return await this.apiService.createAnalysisSession(environmentId, session);
    } catch (error) {
      console.error(`Failed to create analysis session for ${environmentId}:`, error);
      throw error;
    }
  }

  // ========================================================================
  // Validation and Health Checks
  // ========================================================================

  /**
   * Validate environment configuration (mock-aware)
   */
  async validateEnvironment(environmentId: string): Promise<{
    isValid: boolean;
    localConfigValid: boolean;
    backendAccessible: boolean;
    hasData: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate local configuration
    const localConfigValid = validateEnvironmentConfig(environmentId as EnvironmentId);
    if (!localConfigValid) {
      errors.push(`Local configuration invalid for ${environmentId}`);
    }

    // In mock mode, always return valid backend connection
    if (MOCK_CONFIG.enabled) {
      console.log('🎭 Mock environment validation - always valid');
      return {
        isValid: localConfigValid,
        localConfigValid,
        backendAccessible: true,
        hasData: true,
        errors,
        warnings: [],
      };
    }

    // Try to access backend
    let backendAccessible = false;
    let hasData = false;

    try {
      const environment = await this.getEnvironmentDetails(environmentId, { useCache: false });
      backendAccessible = true;
      hasData = environment.has_data;

      if (!environment.is_active) {
        warnings.push(`Environment ${environmentId} is not active`);
      }

      if (environment.camera_count < 4) {
        warnings.push(`Environment ${environmentId} has only ${environment.camera_count} cameras`);
      }

    } catch (error) {
      warnings.push(`Backend not accessible for ${environmentId}: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      localConfigValid,
      backendAccessible,
      hasData,
      errors,
      warnings,
    };
  }

  /**
   * Health check for all environments
   */
  async performHealthCheck(): Promise<{
    overallHealth: 'healthy' | 'degraded' | 'error';
    environments: Array<{
      id: string;
      status: 'healthy' | 'degraded' | 'error';
      details: any;
    }>;
  }> {
    const environmentIds = ['campus', 'factory'];
    const results = [];

    for (const envId of environmentIds) {
      try {
        const validation = await this.validateEnvironment(envId);

        let status: 'healthy' | 'degraded' | 'error' = 'healthy';
        if (validation.errors.length > 0) {
          status = 'error';
        } else if (validation.warnings.length > 0) {
          status = 'degraded';
        }

        results.push({
          id: envId,
          status,
          details: validation,
        });
      } catch (error) {
        results.push({
          id: envId,
          status: 'error' as const,
          details: { error: (error as any).message },
        });
      }
    }

    // Determine overall health
    const hasError = results.some(r => r.status === 'error');
    const hasDegraded = results.some(r => r.status === 'degraded');

    const overallHealth = hasError ? 'error' : hasDegraded ? 'degraded' : 'healthy';

    return {
      overallHealth,
      environments: results,
    };
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.environmentCache.clear();
    this.cameraCache.clear();
    this.dateRangeCache.clear();
  }

  /**
   * Clear cache for specific environment
   */
  clearEnvironmentCache(environmentId: string): void {
    // Clear environment cache
    this.environmentCache.delete(environmentId);

    // Clear related caches
    Array.from(this.cameraCache.keys())
      .filter(key => key.startsWith(environmentId))
      .forEach(key => this.cameraCache.delete(key));

    Array.from(this.dateRangeCache.keys())
      .filter(key => key.startsWith(environmentId))
      .forEach(key => this.dateRangeCache.delete(key));
  }

  // ========================================================================
  // Fallback Methods (Local Configuration)
  // ========================================================================

  /**
   * Get fallback environments from local configuration
   */
  private getFallbackEnvironments(): Environment[] {
    const localEnvs = getAvailableEnvironments();

    return localEnvs.map(config => ({
      environment_id: config.id,
      name: config.name,
      environment_type: config.id === 'factory' ? 'industrial' : 'indoor',
      description: `${config.name} - ${config.cameras.length} cameras`,
      is_active: true,
      camera_count: config.cameras.length,
      zone_count: 0, // Unknown from local config
      has_data: true, // Assume true for fallback
      last_updated: new Date().toISOString(),
    }));
  }

  /**
   * Get fallback environment details from local configuration
   */
  private getFallbackEnvironmentDetails(environmentId: EnvironmentId): Environment {
    const config = getEnvironmentConfig(environmentId);

    return {
      environment_id: config.id,
      name: config.name,
      environment_type: config.id === 'factory' ? 'industrial' : 'indoor',
      description: `${config.name} - ${config.cameras.length} cameras`,
      is_active: true,
      camera_count: config.cameras.length,
      zone_count: 0,
      has_data: true,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get fallback cameras from local configuration
   */
  private getFallbackCameras(environmentId: EnvironmentId): Camera[] {
    const config = getEnvironmentConfig(environmentId);

    return config.cameras.map(camera => ({
      camera_id: camera.id,
      name: camera.name,
      location: camera.name,
      is_active: true,
      resolution: `${camera.resolution[0]}x${camera.resolution[1]}`,
      fps: 30, // Default FPS
      has_homography: camera.homography_available,
    }));
  }

  /**
   * Get fallback date range
   */
  private getFallbackDateRange(): DateRange {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      earliest_date: yesterday.toISOString(),
      latest_date: now.toISOString(),
      total_days: 1,
      has_data: true,
      data_gaps: [],
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default environment service instance
 */
export function createEnvironmentService(apiService?: APIService): EnvironmentService {
  return new EnvironmentService(apiService);
}

/**
 * Quick environment validation
 */
export async function validateEnvironmentQuick(environmentId: string): Promise<boolean> {
  const service = createEnvironmentService();
  try {
    const validation = await service.validateEnvironment(environmentId);
    return validation.isValid;
  } catch (error) {
    console.error('Environment validation failed:', error);
    return false;
  }
}

/**
 * Get environment info summary
 */
export async function getEnvironmentSummary(environmentId: string): Promise<{
  id: string;
  name: string;
  status: 'available' | 'degraded' | 'unavailable';
  cameraCount: number;
  hasData: boolean;
  dataRange?: { start: string; end: string };
}> {
  const service = createEnvironmentService();

  try {
    const [environment, cameras, dateRange] = await Promise.all([
      service.getEnvironmentDetails(environmentId),
      service.getEnvironmentCameras(environmentId),
      service.getEnvironmentDateRanges(environmentId).catch(() => null),
    ]);

    let status: 'available' | 'degraded' | 'unavailable' = 'available';

    if (!environment.is_active || cameras.length < 4) {
      status = 'degraded';
    }

    if (!environment.has_data) {
      status = 'unavailable';
    }

    return {
      id: environment.environment_id,
      name: environment.name,
      status,
      cameraCount: cameras.length,
      hasData: environment.has_data,
      dataRange: dateRange ? {
        start: dateRange.earliest_date,
        end: dateRange.latest_date,
      } : undefined,
    };
  } catch (error) {
    console.error(`Failed to get environment summary for ${environmentId}:`, error);

    return {
      id: environmentId,
      name: environmentId,
      status: 'unavailable',
      cameraCount: 0,
      hasData: false,
    };
  }
}

// Default export
export default EnvironmentService;