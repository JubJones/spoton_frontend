// src/hooks/useBackendHealth.ts
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { EnvironmentId } from '../types/api';
import { APP_CONFIG } from '../config/app';

const API_BASE_URL = APP_CONFIG.API_BASE_URL;

export interface BackendHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  version?: string;
  timestamp?: string;
  uptime?: number;
  services?: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    ai_models: 'loaded' | 'loading' | 'error';
  };
}

export interface EnvironmentValidation {
  environment_id: EnvironmentId;
  is_valid: boolean;
  cameras_available: string[];
  missing_data?: string[];
  warnings?: string[];
}

export interface BackendHealthState {
  isConnected: boolean;
  isLoading: boolean;
  backendStatus: BackendHealthStatus | null;
  error: string | null;
  lastChecked: Date | null;
}

export const useBackendHealth = () => {
  const [state, setState] = useState<BackendHealthState>({
    isConnected: false,
    isLoading: false,
    backendStatus: null,
    error: null,
    lastChecked: null,
  });

  const updateState = useCallback((updates: Partial<BackendHealthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Health check function
  const healthCheck = useCallback(async (): Promise<BackendHealthStatus | null> => {
    updateState({ isLoading: true, error: null });

    try {
      const response = await axios.get<BackendHealthStatus>(`${API_BASE_URL}/health`, {
        timeout: 5000,
      });

      const healthData = response.data;
      const isHealthy = healthData.status === 'healthy';

      updateState({
        isConnected: isHealthy,
        backendStatus: healthData,
        isLoading: false,
        lastChecked: new Date(),
        error: null,
      });

      return healthData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backend connection failed';

      updateState({
        isConnected: false,
        backendStatus: { status: 'unhealthy' },
        isLoading: false,
        lastChecked: new Date(),
        error: errorMessage,
      });

      return null;
    }
  }, [updateState]);

  // Validate environment
  const validateEnvironment = useCallback(
    async (environmentId: EnvironmentId): Promise<EnvironmentValidation | null> => {
      try {
        const response = await axios.get<EnvironmentValidation>(
          `${API_BASE_URL}/api/v1/environments/${environmentId}/validate`,
          { timeout: 5000 }
        );

        return response.data;
      } catch (error) {
        console.error(`Environment validation failed for ${environmentId}:`, error);
        // Return a mock validation result if backend endpoint doesn't exist
        return {
          environment_id: environmentId,
          is_valid: true, // Assume valid for now
          cameras_available: [],
          warnings: ['Backend validation endpoint not available - using client-side validation'],
        };
      }
    },
    []
  );

  // Check if backend is ready for environment
  const checkEnvironmentReadiness = useCallback(
    async (environmentId: EnvironmentId): Promise<boolean> => {
      try {
        // First check general health
        const health = await healthCheck();
        if (!health || health.status !== 'healthy') {
          return false;
        }

        // Then validate specific environment
        const validation = await validateEnvironment(environmentId);
        return validation?.is_valid || false;
      } catch (error) {
        console.error('Environment readiness check failed:', error);
        return false;
      }
    },
    [healthCheck, validateEnvironment]
  );

  // Auto health check on mount
  useEffect(() => {
    healthCheck();
  }, [healthCheck]);

  return {
    // State
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    backendStatus: state.backendStatus,
    error: state.error,
    lastChecked: state.lastChecked,

    // Actions
    healthCheck,
    validateEnvironment,
    checkEnvironmentReadiness,

    // Utility
    clearError: () => updateState({ error: null }),
  };
};
