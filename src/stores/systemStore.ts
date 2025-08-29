// System State Management - Application State
// src/stores/systemStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { AppState, EnvironmentId, TaskStatus, SystemHealthResponse, API_ENDPOINTS } from '../types/api';
import { apiService } from '../services/apiService';
import { statePersistenceService } from '../services/statePersistenceService';
import { dataCacheService } from '../services/dataCacheService';
import { offlineQueueService, queueApiRequest } from '../services/offlineQueueService';
import { dataValidationService } from '../services/dataValidationService';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

// ============================================================================
// System Store Interface
// ============================================================================

interface SystemState extends AppState {
  // Task Management
  taskId?: string;
  taskStatus?: TaskStatus;
  taskProgress: number;
  taskError?: string;

  // System Health
  systemHealth?: SystemHealthResponse;
  lastHealthCheck: number;

  // Actions
  actions: {
    // Environment selection
    setEnvironment: (environment: EnvironmentId) => void;
    setDateTimeRange: (range: AppState['dateTimeRange']) => void;

    // Task management
    startProcessingTask: (environment: EnvironmentId) => Promise<string>;
    updateTaskStatus: (taskId: string) => Promise<void>;
    clearTask: () => void;

    // System health
    checkSystemHealth: () => Promise<void>;

    // UI state
    setLoading: (loading: boolean) => void;
    setError: (error: string | undefined) => void;
    setConnectionStatus: (status: AppState['connectionStatus']) => void;

    // Phase 11: Enhanced integration methods
    updateTrackingStats: (stats: {
      lastFrameIndex?: number;
      lastUpdateTimestamp?: string;
      personCount?: number;
    }) => void;
    setTaskInfo: (info: {
      taskId: string;
      taskStatus: string;
      taskProgress: number;
      websocketUrl?: string;
      statusUrl?: string;
    }) => void;

    // Reset
    reset: () => void;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: Omit<SystemState, 'actions'> = {
  // Environment and task
  currentEnvironment: undefined,
  currentTaskId: undefined,
  taskId: undefined,
  taskStatus: undefined,
  taskProgress: 0,
  taskError: undefined,

  // UI state
  isLoading: false,
  error: undefined,
  connectionStatus: 'disconnected',

  // System health
  systemHealth: undefined,
  lastHealthCheck: 0,

  // Date/time selection
  dateTimeRange: undefined,
};

// ============================================================================
// System Store Implementation
// ============================================================================

export const useSystemStore = create<SystemState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        actions: {
          // ================================================================
          // Environment Management
          // ================================================================

          setEnvironment: (environment: EnvironmentId) => {
            // Validate environment ID
            const validationResult = dataValidationService.validateEnvironmentId(environment);
            if (!validationResult.isValid) {
              console.error('Invalid environment ID:', validationResult.errors);
              set({ error: 'Invalid environment selected' }, false, 'setEnvironment:error');
              return;
            }

            set(
              (state) => ({
                currentEnvironment: environment,
                // Clear previous task when changing environment
                taskId: undefined,
                taskStatus: undefined,
                taskProgress: 0,
                taskError: undefined,
                error: undefined,
              }),
              false,
              'setEnvironment'
            );

            // Cache validated environment selection (async operation in background)
            dataCacheService.set('current-environment', environment, {
              priority: 3, // High priority
              ttl: 24 * 60 * 60 * 1000, // 24 hours
              tags: ['environment', 'system'],
            }).catch(error => {
              console.warn('Failed to cache environment selection:', error);
            });
          },

          setDateTimeRange: (range: AppState['dateTimeRange']) => {
            set({ dateTimeRange: range }, false, 'setDateTimeRange');
          },

          // ================================================================
          // Task Management
          // ================================================================

          startProcessingTask: async (environment: EnvironmentId) => {
            // Monitor task processing performance
            return performanceMonitoringService
              .timeFunction(
                'user-interaction',
                'start-processing-task',
                async () => {
                  set(
                    {
                      isLoading: true,
                      error: undefined,
                      taskError: undefined,
                      currentEnvironment: environment,
                    },
                    false,
                    'startProcessingTask:start'
                  );

                  try {
                    const response = await performanceMonitoringService.timeFunction(
                      'network',
                      'api-start-task',
                      () => apiService.startProcessingTask({ environment_id: environment }),
                      { environment }
                    );

                    const taskData = {
                      taskId: response.result.task_id,
                      currentTaskId: response.result.task_id,
                      taskStatus: 'QUEUED' as const,
                      taskProgress: 0,
                      environment,
                      startedAt: Date.now(),
                    };

                    set(
                      {
                        ...taskData,
                        isLoading: false,
                      },
                      false,
                      'startProcessingTask:success'
                    );

                    // Monitor cache operation performance
                    await performanceMonitoringService.timeFunction(
                      'cache',
                      'cache-task-data',
                      () =>
                        dataCacheService.set('active-task', taskData, {
                          priority: 4, // Critical priority
                          ttl: 2 * 60 * 60 * 1000, // 2 hours
                          tags: ['task', `env-${environment}`],
                        }),
                      { dataSize: JSON.stringify(taskData).length }
                    );

                    // Start monitoring task status
                    get().actions.updateTaskStatus(response.result.task_id);

                    return response.result.task_id;
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error ? error.message : 'Failed to start task';
                    const errorData = {
                      error: errorMessage,
                      taskError: errorMessage,
                      timestamp: Date.now(),
                      environment,
                    };

                    set(
                      {
                        isLoading: false,
                        ...errorData,
                      },
                      false,
                      'startProcessingTask:error'
                    );

                    // Monitor error handling performance
                    if (error instanceof Error && error.name === 'NetworkError') {
                      await performanceMonitoringService.timeFunction(
                        'cache',
                        'queue-retry-request',
                        () =>
                          queueApiRequest(
                            API_ENDPOINTS.START_TASK,
                            { environment_id: environment },
                            {
                              priority: 3,
                              maxRetries: 3,
                            }
                          )
                      );
                    }

                    throw error;
                  }
                },
                { environment }
              )
              .then((result) => result.result);
          },

          updateTaskStatus: async (taskId: string) => {
            // Sanitize task ID input
            const sanitizedTaskId = dataValidationService.sanitizeUserInput(taskId);
            if (!sanitizedTaskId || sanitizedTaskId !== taskId) {
              console.error('Invalid task ID provided');
              set({ taskError: 'Invalid task ID format' }, false, 'updateTaskStatus:error');
              return;
            }

            try {
              const statusResponse = await apiService.getTaskStatus(sanitizedTaskId);

              // Validate status response structure
              const statusValidation = dataValidationService.validateAndSanitize(statusResponse, {
                type: 'object',
                required: true,
                properties: {
                  status: {
                    type: 'string',
                    required: true,
                    enum: [
                      'QUEUED',
                      'INITIALIZING',
                      'DOWNLOADING',
                      'EXTRACTING',
                      'PROCESSING',
                      'COMPLETED',
                      'FAILED',
                    ],
                  },
                  progress: { type: 'number', required: true, min: 0, max: 100 },
                  details: { type: 'object', required: false },
                },
              });

              if (!statusValidation.isValid) {
                console.error('Task status validation failed:', statusValidation.errors);
                throw new Error('Invalid task status data received from server');
              }

              const validatedResponse = statusValidation.sanitized;
              const statusData = {
                taskStatus: validatedResponse.status,
                taskProgress: validatedResponse.progress,
                taskError:
                  validatedResponse.status === 'FAILED'
                    ? `Task failed: ${validatedResponse.details?.error || 'Unknown error'}`
                    : undefined,
                lastStatusUpdate: Date.now(),
              };

              set(statusData, false, 'updateTaskStatus');

              // Cache validated task status for persistence across sessions
              await dataCacheService.set(
                `task-status-${sanitizedTaskId}`,
                {
                  ...statusData,
                  details: validatedResponse.details,
                },
                {
                  priority: 3,
                  ttl: 30 * 60 * 1000, // 30 minutes
                  tags: ['task-status', `task-${sanitizedTaskId}`],
                }
              );

              // Continue monitoring if task is still running
              if (
                ['QUEUED', 'INITIALIZING', 'DOWNLOADING', 'EXTRACTING', 'PROCESSING'].includes(
                  validatedResponse.status
                )
              ) {
                setTimeout(() => {
                  get().actions.updateTaskStatus(sanitizedTaskId);
                }, 2000); // Check every 2 seconds
              }
            } catch (error) {
              console.error('Failed to update task status:', error);

              const errorMessage = `Failed to get task status: ${error instanceof Error ? error.message : 'Unknown error'}`;
              set({ taskError: errorMessage }, false, 'updateTaskStatus:error');

              // Try to load cached status if available
              const cachedStatus = await dataCacheService.get(`task-status-${sanitizedTaskId}`);
              if (cachedStatus) {
                // Validate cached status before using
                const cachedValidation = dataValidationService.validateAndSanitize(cachedStatus, {
                  type: 'object',
                  properties: {
                    taskStatus: { type: 'string', required: true },
                    taskProgress: { type: 'number', required: true, min: 0, max: 100 },
                    lastStatusUpdate: { type: 'number', required: true },
                  },
                });

                if (cachedValidation.isValid) {
                  console.log('Using validated cached task status due to API failure');
                  set(cachedValidation.sanitized, false, 'updateTaskStatus:cached');
                }
              }

              // Queue status update for retry if network error
              if (error instanceof Error && error.name === 'NetworkError') {
                await queueApiRequest(
                  API_ENDPOINTS.TASK_STATUS(sanitizedTaskId),
                  {},
                  {
                    method: 'GET',
                    priority: 2,
                    maxRetries: 5,
                  }
                );
              }
            }
          },

          clearTask: async () => {
            const state = get();

            set(
              {
                taskId: undefined,
                currentTaskId: undefined,
                taskStatus: undefined,
                taskProgress: 0,
                taskError: undefined,
                connectionStatus: 'disconnected',
              },
              false,
              'clearTask'
            );

            // Clear task-related cache entries
            if (state.taskId) {
              await dataCacheService.deleteByTag(`task-${state.taskId}`);
              await dataCacheService.delete('active-task');
            }
          },

          // ================================================================
          // System Health
          // ================================================================

          checkSystemHealth: async () => {
            // Monitor system health check performance
            await performanceMonitoringService.timeFunction(
              'network',
              'system-health-check',
              async () => {
                try {
                  const healthResult = await performanceMonitoringService.timeFunction(
                    'network',
                    'api-health-request',
                    () => apiService.getSystemHealth()
                  );

                  const health = healthResult.result;

                  // Monitor validation performance
                  const validationResult = await performanceMonitoringService.timeFunction(
                    'user-interaction',
                    'data-validation',
                    () => dataValidationService.validateSystemHealth(health),
                    { dataType: 'system-health' }
                  );

                  if (!validationResult.result.isValid) {
                    console.error(
                      'System health data validation failed:',
                      validationResult.result.errors
                    );
                    throw new Error('Invalid health data received from server');
                  }

                  const healthData = {
                    systemHealth: validationResult.result.sanitized || health,
                    lastHealthCheck: Date.now(),
                  };

                  set(healthData, false, 'checkSystemHealth:success');

                  // Monitor cache operation performance
                  await performanceMonitoringService.timeFunction(
                    'cache',
                    'cache-health-data',
                    () =>
                      dataCacheService.set('system-health', healthData.systemHealth, {
                        priority: 2,
                        ttl: 5 * 60 * 1000, // 5 minutes
                        tags: ['system', 'health'],
                      }),
                    { dataSize: JSON.stringify(healthData.systemHealth).length }
                  );
                } catch (error) {
                  console.error('System health check failed:', error);

                  // Monitor cache read performance for error recovery
                  const cachedHealthResult = await performanceMonitoringService.timeFunction(
                    'cache',
                    'cache-health-read',
                    () => dataCacheService.get('system-health')
                  );

                  let errorHealth = cachedHealthResult.result;
                  if (!errorHealth) {
                    errorHealth = {
                      status: 'error',
                      detector_model_status: 'error',
                      tracker_factory_status: 'error',
                      homography_matrices_status: 'error',
                      timestamp: new Date().toISOString(),
                    };

                    // Validate fallback health data
                    const fallbackValidation =
                      dataValidationService.validateSystemHealth(errorHealth);
                    if (fallbackValidation.isValid) {
                      errorHealth = fallbackValidation.sanitized || errorHealth;
                    }
                  }

                  set(
                    {
                      systemHealth: errorHealth,
                      lastHealthCheck: Date.now(),
                    },
                    false,
                    'checkSystemHealth:error'
                  );

                  // Monitor error recovery performance
                  if (error instanceof Error && error.name === 'NetworkError') {
                    await performanceMonitoringService.timeFunction(
                      'cache',
                      'queue-health-retry',
                      () =>
                        queueApiRequest(
                          '/health',
                          {},
                          {
                            method: 'GET',
                            priority: 1, // Low priority for health checks
                            maxRetries: 3,
                          }
                        )
                    );
                  }
                }
              }
            );
          },

          // ================================================================
          // UI State Management
          // ================================================================

          setLoading: (loading: boolean) => {
            set({ isLoading: loading }, false, 'setLoading');
          },

          setError: (error: string | undefined) => {
            set({ error }, false, 'setError');
          },

          setConnectionStatus: (status: AppState['connectionStatus']) => {
            set({ connectionStatus: status }, false, 'setConnectionStatus');
          },

          // ================================================================
          // Phase 11: Enhanced Integration Methods
          // ================================================================

          updateTrackingStats: (stats) => {
            // Update system with real-time tracking statistics
            set(
              (state) => ({
                // Store tracking stats for system monitoring
                lastHealthCheck: Date.now(), // Update as activity indicator
                connectionStatus: 'connected' as const, // Confirm connectivity
              }),
              false,
              'updateTrackingStats'
            );

            console.log('📊 System tracking stats updated:', stats);
          },

          setTaskInfo: async (info) => {
            set(
              {
                taskId: info.taskId,
                currentTaskId: info.taskId,
                taskStatus: info.taskStatus as any,
                taskProgress: info.taskProgress,
                taskError: undefined, // Clear any previous error
              },
              false,
              'setTaskInfo'
            );

            // Cache the task info for persistence
            try {
              await dataCacheService.set('active-task', info, {
                priority: 1,
                ttl: 60 * 60 * 1000, // 1 hour
                tags: ['task', 'system'],
              });
            } catch (error) {
              console.warn('Failed to cache task info:', error);
            }

            console.log('🎯 Task info updated:', info.taskId, info.taskStatus);
          },

          // ================================================================
          // Reset
          // ================================================================

          reset: async () => {
            set({ ...initialState }, false, 'reset');

            // Clear all system-related cache
            await dataCacheService.deleteByTag('system');
            await dataCacheService.deleteByTag('task');

            // Reset offline queue
            await offlineQueueService.clear();
          },
        },
      }),
      {
        name: 'spoton-system-store',
        // Only persist certain fields
        partialize: (state) => ({
          currentEnvironment: state.currentEnvironment,
          dateTimeRange: state.dateTimeRange,
          lastHealthCheck: state.lastHealthCheck,
          taskId: state.taskId,
          currentTaskId: state.currentTaskId,
        }),
        // Merge persisted state with initial state
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...persistedState,
        }),
        version: 2,
        // Custom storage implementation using our enhanced service
        storage: {
          getItem: async (name: string): Promise<string | null> => {
            try {
              const data = await statePersistenceService.loadState(name);
              if (!data) return null;
              
              // Ensure we return a proper JSON string, avoiding circular references
              return JSON.stringify(data, (key, value) => {
                // Skip functions, undefined values, and circular references
                if (typeof value === 'function' || value === undefined) {
                  return null;
                }
                // Skip WebSocket objects and other complex objects
                if (value && typeof value === 'object' && value.constructor !== Object && value.constructor !== Array) {
                  return null;
                }
                return value;
              });
            } catch (error) {
              console.warn('Storage getItem error:', error);
              return null;
            }
          },
          setItem: async (name: string, value: string): Promise<void> => {
            try {
              // Value should already be a JSON string from Zustand persist
              let parsedValue;
              try {
                parsedValue = JSON.parse(value);
              } catch (parseError) {
                // If parsing fails, skip persisting this value to avoid corruption
                console.warn('Skipping persistence for invalid JSON:', typeof value === 'string' ? value.substring(0, 100) + '...' : value);
                return;
              }
              
              return await statePersistenceService.saveState(name, parsedValue, {
                version: 2,
                compression: true,
                ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
              });
            } catch (error) {
              console.warn('Storage setItem error:', error);
            }
          },
          removeItem: async (name: string): Promise<void> => {
            try {
              return await statePersistenceService.removeState(name);
            } catch (error) {
              console.warn('Storage removeItem error:', error);
            }
          },
        },
        migrate: (persistedState: any, version: number) => {
          if (version < 2) {
            // Migration from v1 to v2: add task persistence
            return {
              ...persistedState,
              taskId: undefined,
              currentTaskId: undefined,
            };
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'SystemStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// Selectors and Hooks
// ============================================================================

/**
 * Get system actions
 */
export const useSystemActions = () => useSystemStore((state) => state.actions);

/**
 * Get current environment
 */
export const useCurrentEnvironment = () => useSystemStore((state) => state.currentEnvironment);

/**
 * Get task information
 */
export const useTaskInfo = () => {
  return useSystemStore(
    (state) => ({
      taskId: state.taskId,
      taskStatus: state.taskStatus,
      taskProgress: state.taskProgress,
      taskError: state.taskError,
    }),
    shallow // Use Zustand's built-in shallow comparison
  );
};

/**
 * Individual task selectors to avoid object creation
 */
export const useTaskId = () => useSystemStore((state) => state.taskId);
export const useTaskStatus = () => useSystemStore((state) => state.taskStatus);
export const useTaskProgress = () => useSystemStore((state) => state.taskProgress);
export const useTaskError = () => useSystemStore((state) => state.taskError);

/**
 * Get system health
 */
export const useSystemHealth = () =>
  useSystemStore((state) => ({
    health: state.systemHealth,
    lastCheck: state.lastHealthCheck,
  }), shallow);

/**
 * Get UI state
 */
export const useUIState = () =>
  useSystemStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
    connectionStatus: state.connectionStatus,
  }), shallow);

/**
 * Get date/time range
 */
export const useDateTimeRange = () => useSystemStore((state) => state.dateTimeRange);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if system is ready for tracking
 */
export function useIsSystemReady(): boolean {
  return useSystemStore((state) => {
    return (
      state.currentEnvironment !== undefined &&
      state.taskId !== undefined &&
      state.taskStatus === 'COMPLETED' &&
      state.connectionStatus === 'connected'
    );
  });
}

/**
 * Check if task is processing
 */
export function useIsTaskProcessing(): boolean {
  return useSystemStore((state) => {
    return (
      state.taskStatus === 'PROCESSING' ||
      state.taskStatus === 'DOWNLOADING' ||
      state.taskStatus === 'EXTRACTING'
    );
  });
}

/**
 * Check if system has errors
 */
export function useHasSystemErrors(): boolean {
  return useSystemStore((state) => {
    return (
      state.error !== undefined ||
      state.taskError !== undefined ||
      state.systemHealth?.status === 'error'
    );
  });
}

// ============================================================================
// Dev Tools and Debugging
// ============================================================================

/**
 * Get store state for debugging
 */
export function getSystemStoreState() {
  return useSystemStore.getState();
}

/**
 * Subscribe to store changes
 */
export function subscribeToSystemStore(callback: (state: SystemState) => void) {
  return useSystemStore.subscribe(callback);
}

// ============================================================================
// Store Initialization
// ============================================================================

/**
 * Initialize system store with enhanced data management
 */
export async function initializeSystemStore() {
  const { actions } = useSystemStore.getState();

  // Initialize cache preloading
  try {
    // Try to restore cached environment
    const cachedEnvironment = await dataCacheService.get('current-environment');
    if (cachedEnvironment && !useSystemStore.getState().currentEnvironment) {
      actions.setEnvironment(cachedEnvironment);
    }

    // Try to restore active task data
    const cachedTask = await dataCacheService.get('active-task');
    if (cachedTask && cachedTask.taskId) {
      // Resume task monitoring if task is still active
      actions.updateTaskStatus(cachedTask.taskId);
    }
  } catch (error) {
    console.warn('Failed to restore cached system state:', error);
  }

  // Perform initial system health check
  actions.checkSystemHealth();

  // Set up periodic health checks (every 5 minutes)
  setInterval(
    () => {
      actions.checkSystemHealth();
    },
    5 * 60 * 1000
  );

  // Set up periodic cache cleanup (every 30 minutes)
  setInterval(
    async () => {
      try {
        const stats = dataCacheService.getStatistics();
        if (parseFloat(stats.hitRate.replace('%', '')) < 50) {
          console.log('Cache hit rate low, performing cleanup');
          await dataCacheService.deleteByTag('expired');
        }
      } catch (error) {
        console.warn('Cache cleanup failed:', error);
      }
    },
    30 * 60 * 1000
  );
}

// Export store for direct access if needed
export default useSystemStore;
