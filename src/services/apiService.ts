// API Service Layer - REST API Communication
// src/services/apiService.ts

import {
  ProcessingTaskStartRequest,
  ProcessingTaskCreateResponse,
  TaskStatusResponse,
  PlaybackStatusResponse,
  SystemHealthResponse,
  APIError,
  APIResponse,
  RealTimeMetrics,
  RealTimeMetricsResponse,
  ActivePerson,
  ActivePersonsResponse,
  SystemStatistics,
  LoginRequest,
  LoginResponse,
  UserInfo,
  API_ENDPOINTS,
  isValidTaskStatus,
  isValidEnvironmentId,
  isBackendCameraId,
  ExportAnalyticsReportRequest,
  ExportJobResponse,
  ExportJobStatusResponse,
  DetectionProcessingEnvironmentsResponse,
  DetectionProcessingEnvironment,
  DetectionProcessingEnvironmentCameraMetadata,
  BackendCameraId,
  EnvironmentId,
} from '../types/api';
import { getApiUrl, APP_CONFIG } from '../config/app';
import { MOCK_CONFIG } from '../config/mock';
import { mockAPI } from '../mocks/mockServices';

// ============================================================================
// API Service Configuration
// ============================================================================

interface APIServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableRetry: boolean;
}

const DEFAULT_CONFIG: APIServiceConfig = {
  baseUrl: APP_CONFIG.API_BASE_URL,
  timeout: 15000, // 15 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableRetry: true,
};

// Special config for long-running operations
const LONG_RUNNING_CONFIG: APIServiceConfig = {
  ...DEFAULT_CONFIG,
  timeout: 180000, // 3 minutes for task initialization
  retryAttempts: 2, // Fewer retries for long operations
  retryDelay: 3000, // 3 second delay between retries
};

const DEFAULT_DETECTION_ENVIRONMENTS: DetectionProcessingEnvironmentsResponse = {
  environments: [
    {
      environment_id: 'campus',
      cameras: ['c01', 'c02', 'c03', 'c05'] as BackendCameraId[],
      camera_metadata: {
        c01: { display_name: 'Campus Gate Camera' },
        c02: { display_name: 'Campus Plaza Camera' },
        c03: { display_name: 'Campus Walkway Camera' },
        c05: { display_name: 'Campus Commons Camera' },
      } as Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>,
    },
    {
      environment_id: 'factory',
      cameras: ['c09', 'c12', 'c13', 'c16'] as BackendCameraId[],
      camera_metadata: {
        c09: { display_name: 'Factory Camera 1 (Entrance)' },
        c12: { display_name: 'Factory Camera 2 (Assembly Line)' },
        c13: { display_name: 'Factory Camera 3 (Storage Area)' },
        c16: { display_name: 'Factory Camera 4 (Quality Control)' },
      } as Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>,
    },
  ],
};

// ============================================================================
// Error Classes
// ============================================================================

export class APIServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response,
    public data?: any
  ) {
    super(message);
    this.name = 'APIServiceError';
  }
}

export class NetworkError extends APIServiceError {
  constructor(message: string, originalError?: Error) {
    super(message, 0);
    this.name = 'NetworkError';
    this.cause = originalError;
  }
}

export class ValidationError extends APIServiceError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// HTTP Client Implementation
// ============================================================================

class HTTPClient {
  private config: APIServiceConfig;

  constructor(config: Partial<APIServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create AbortController with timeout
   */
  private createAbortController(timeout?: number): AbortController {
    const controller = new AbortController();
    const timeoutMs = timeout || this.config.timeout;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Clear timeout if request completes
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });

    return controller;
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return this.config.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Should retry based on status code and attempt count
   */
  private shouldRetry(status: number, attempt: number): boolean {
    if (!this.config.enableRetry || attempt >= this.config.retryAttempts) {
      return false;
    }

    // Retry on network errors, server errors, and specific client errors
    return (
      status === 0 || // Network error
      (status >= 500 && status < 600) || // Server errors
      status === 429 || // Rate limit
      status === 408 || // Timeout
      status === 409 // Conflict
    );
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<APIError> {
    try {
      const errorData = await response.json();
      return {
        error: errorData.error || 'API Error',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        status_code: response.status,
        timestamp: errorData.timestamp || new Date().toISOString(),
        details: errorData.details || {},
      };
    } catch {
      return {
        error: 'API Error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        status_code: response.status,
        timestamp: new Date().toISOString(),
        details: {},
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    config: Partial<APIServiceConfig> = {}
  ): Promise<T> {
    const mergedConfig = { ...this.config, ...config };
    const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= mergedConfig.retryAttempts; attempt++) {
      try {
        const controller = this.createAbortController(mergedConfig.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...options.headers,
          },
        });

        // Handle successful responses
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            return await response.json();
          } else {
            return (await response.text()) as unknown as T;
          }
        }

        // Handle error responses
        const errorData = await this.parseErrorResponse(response);

        // Check if we should retry
        if (this.shouldRetry(response.status, attempt)) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          continue;
        }

        // Throw specific error
        throw new APIServiceError(errorData.message, response.status, response, errorData);
      } catch (error) {
        lastError = error as Error;

        // Handle network errors
        if (error instanceof TypeError || error.name === 'AbortError') {
          const networkError = new NetworkError(
            error.name === 'AbortError' ? 'Request timeout' : 'Network error',
            error as Error
          );

          if (this.shouldRetry(0, attempt)) {
            const delay = this.calculateRetryDelay(attempt);
            await this.sleep(delay);
            continue;
          }

          throw networkError;
        }

        // Re-throw API service errors immediately
        if (error instanceof APIServiceError) {
          throw error;
        }

        // Handle other errors
        if (attempt === mergedConfig.retryAttempts) {
          throw new APIServiceError(
            `Request failed after ${mergedConfig.retryAttempts} attempts: ${error.message}`,
            0,
            undefined,
            error
          );
        }
      }
    }

    // This should never be reached, but just in case
    throw lastError || new APIServiceError('Unknown error occurred');
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config?: Partial<APIServiceConfig>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, config);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: Partial<APIServiceConfig>
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, config?: Partial<APIServiceConfig>): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: Partial<APIServiceConfig>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, config);
  }
}

// ============================================================================
// API Service Implementation
// ============================================================================

export class APIService {
  private http: HTTPClient;

  constructor(config?: Partial<APIServiceConfig>) {
    this.http = new HTTPClient(config);
  }

  // ========================================================================
  // Processing Tasks API
  // ========================================================================

  /**
   * Start a new processing task (uses extended timeout for model loading)
   */
  async startProcessingTask(
    request: ProcessingTaskStartRequest
  ): Promise<ProcessingTaskCreateResponse> {
    // Use mock service if enabled
    if (MOCK_CONFIG.services.api) {
      console.log('🎭 Using mock startProcessingTask');
      return mockAPI.startProcessingTask(request.environment_id);
    }

    try {
      const response = await this.http.post<ProcessingTaskCreateResponse>(
        API_ENDPOINTS.START_TASK,
        request,
        LONG_RUNNING_CONFIG // Use extended timeout for task initialization
      );

      // Validate response
      if (!response.task_id || !response.websocket_url || !response.status_url) {
        throw new ValidationError('Invalid response format from start processing task');
      }

      return response;
    } catch (error) {
      throw this.handleError('Failed to start processing task', error);
    }
  }

  /**
   * Get task status by ID
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    // Use mock service if enabled
    if (MOCK_CONFIG.services.api) {
      console.log('🎭 Using mock getTaskStatus');
      return mockAPI.getTaskStatus(taskId);
    }

    try {
      const response = await this.http.get<TaskStatusResponse>(API_ENDPOINTS.TASK_STATUS(taskId));

      // Validate response
      if (!response.task_id || !isValidTaskStatus(response.status)) {
        throw new ValidationError('Invalid task status response format');
      }

      return response;
    } catch (error) {
      throw this.handleError(`Failed to get task status for ${taskId}`, error);
    }
  }

  /**
   * Pause active processing task playback
   */
  async pauseTaskPlayback(taskId: string): Promise<PlaybackStatusResponse> {
    if (MOCK_CONFIG.services.api) {
      console.log('🎭 Using mock pauseTaskPlayback');
      return {
        task_id: taskId,
        state: 'paused',
        last_transition_at: new Date().toISOString(),
        last_frame_index: 0,
      };
    }

    try {
      return await this.http.post<PlaybackStatusResponse>(
        API_ENDPOINTS.PLAYBACK_PAUSE(taskId)
      );
    } catch (error) {
      throw this.handleError(`Failed to pause playback for ${taskId}`, error);
    }
  }

  /**
   * Resume processing task playback
   */
  async resumeTaskPlayback(taskId: string): Promise<PlaybackStatusResponse> {
    if (MOCK_CONFIG.services.api) {
      console.log('🎭 Using mock resumeTaskPlayback');
      return {
        task_id: taskId,
        state: 'playing',
        last_transition_at: new Date().toISOString(),
        last_frame_index: 0,
      };
    }

    try {
      return await this.http.post<PlaybackStatusResponse>(
        API_ENDPOINTS.PLAYBACK_RESUME(taskId)
      );
    } catch (error) {
      throw this.handleError(`Failed to resume playback for ${taskId}`, error);
    }
  }

  /**
   * Retrieve playback status for task
   */
  async getPlaybackStatus(taskId: string): Promise<PlaybackStatusResponse> {
    if (MOCK_CONFIG.services.api) {
      console.log('🎭 Using mock getPlaybackStatus');
      return {
        task_id: taskId,
        state: 'playing',
        last_transition_at: new Date().toISOString(),
        last_frame_index: 0,
      };
    }

    try {
      return await this.http.get<PlaybackStatusResponse>(
        API_ENDPOINTS.PLAYBACK_STATUS(taskId)
      );
    } catch (error) {
      throw this.handleError(`Failed to fetch playback status for ${taskId}`, error);
    }
  }

  /**
   * Get detection processing environments and their camera lists
   */
  async getDetectionProcessingEnvironments(): Promise<DetectionProcessingEnvironmentsResponse> {
    if (MOCK_CONFIG.services.api) {
      console.log('🎭 Using mock detection environments');
      return DEFAULT_DETECTION_ENVIRONMENTS;
    }

    try {
      const response = await this.http.get<any>(API_ENDPOINTS.DETECTION_ENVIRONMENTS);

      const payload = response?.data?.environments ? response.data : response;

      if (!payload || !Array.isArray(payload.environments)) {
        throw new ValidationError('Invalid detection environments response format');
      }

      const normalized: DetectionProcessingEnvironment[] = payload.environments
        .map((env: any) => {
          const envId = env?.environment_id;
          if (!isValidEnvironmentId(envId)) {
            console.warn('Ignoring unknown environment from detection endpoint:', envId);
            return null;
          }

          const rawCameras: string[] = Array.isArray(env?.cameras) ? env.cameras : [];
          const cameras = rawCameras.filter((cameraId): cameraId is BackendCameraId =>
            isBackendCameraId(cameraId)
          );

          const rawMetadata = env?.camera_metadata ?? {};
          const cameraMetadata: Partial<
            Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>
          > = {};

          cameras.forEach((cameraId) => {
            const metadataEntry = rawMetadata?.[cameraId] || {};
            cameraMetadata[cameraId] = {
              ...metadataEntry,
            };
          });

          return {
            environment_id: envId,
            display_name: env?.display_name,
            cameras,
            camera_metadata: Object.keys(cameraMetadata).length > 0 ? cameraMetadata : undefined,
          } as DetectionProcessingEnvironment;
        })
        .filter((env): env is DetectionProcessingEnvironment => Boolean(env) && env.cameras.length > 0);

      if (normalized.length === 0) {
        throw new ValidationError('Detection environment response did not include any valid environments');
      }

      // Merge with defaults to ensure known environments are always available
      const defaultsMap = new Map<EnvironmentId, DetectionProcessingEnvironment>(
        DEFAULT_DETECTION_ENVIRONMENTS.environments.map((env) => [env.environment_id, env])
      );

      normalized.forEach((env) => {
        const existing = defaultsMap.get(env.environment_id);
        if (!existing) {
          defaultsMap.set(env.environment_id, env);
          return;
        }

        const mergedCameras = env.cameras.length ? env.cameras : existing.cameras;
        const mergedMetadata = {
          ...(existing.camera_metadata || {}),
          ...(env.camera_metadata || {}),
        } as Partial<Record<BackendCameraId, DetectionProcessingEnvironmentCameraMetadata>>;

        defaultsMap.set(env.environment_id, {
          environment_id: env.environment_id,
          display_name: env.display_name ?? existing.display_name,
          cameras: mergedCameras,
          camera_metadata:
            Object.keys(mergedMetadata).length > 0 ? mergedMetadata : existing.camera_metadata,
        });
      });

      return {
        environments: Array.from(defaultsMap.values()),
        updated_at: payload?.updated_at,
      };
    } catch (error) {
      throw this.handleError('Failed to fetch detection processing environments', error);
    }
  }

  // ========================================================================
  // System Health API
  // ========================================================================

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthResponse> {
    // Use mock service if enabled
    if (MOCK_CONFIG.services.systemHealth) {
      console.log('🎭 Using mock getSystemHealth');
      return mockAPI.checkSystemHealth();
    }

    try {
      const response = await this.http.get<SystemHealthResponse>(API_ENDPOINTS.HEALTH);

      // Validate response - only status is required
      if (!response.status) {
        throw new ValidationError('Invalid system health response format');
      }

      return response;
    } catch (error) {
      throw this.handleError('Failed to get system health', error);
    }
  }

  // ========================================================================
  // Authentication API
  // ========================================================================

  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.http.post<LoginResponse>(API_ENDPOINTS.LOGIN, credentials);

      // Validate response
      if (!response.access_token || !response.token_type) {
        throw new ValidationError('Invalid login response format');
      }

      return response;
    } catch (error) {
      throw this.handleError('Failed to login', error);
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(token: string): Promise<UserInfo> {
    try {
      const response = await this.http.get<UserInfo>(API_ENDPOINTS.USER_INFO, {
        enableRetry: false, // Don't retry auth requests
      });

      return response;
    } catch (error) {
      throw this.handleError('Failed to get user info', error);
    }
  }

  // ========================================================================
  // Analytics API (Mock Implementation)
  // ========================================================================

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await this.http.get<RealTimeMetricsResponse>(
        API_ENDPOINTS.REAL_TIME_METRICS
      );

      if (!response || typeof response !== 'object' || !('data' in response)) {
        throw new ValidationError('Invalid real-time metrics response format');
      }

      if (response.status && response.status !== 'success') {
        throw new APIServiceError(
          'Backend returned an error for real-time metrics',
          500,
          undefined,
          response
        );
      }

      return response.data;
    } catch (error) {
      throw this.handleError('Failed to get real-time metrics', error);
    }
  }

  /**
   * Get active persons
   */
  async getActivePersons(): Promise<ActivePerson[]> {
    try {
      const response = await this.http.get<APIResponse<ActivePersonsResponse>>(
        API_ENDPOINTS.ACTIVE_PERSONS
      );

      if (!response || typeof response !== 'object' || !('data' in response)) {
        throw new ValidationError('Invalid active persons response format');
      }

      if (response.status && response.status !== 'success') {
        throw new APIServiceError(
          'Backend returned an error for active persons',
          500,
          undefined,
          response
        );
      }

      return response.data.active_persons;
    } catch (error) {
      throw this.handleError('Failed to get active persons', error);
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStatistics(): Promise<SystemStatistics> {
    try {
      const response = await this.http.get<SystemStatistics>(API_ENDPOINTS.SYSTEM_STATISTICS);
      return response;
    } catch (error) {
      throw this.handleError('Failed to get system statistics', error);
    }
  }

  // ========================================================================
  // Export API
  // ========================================================================

  /**
   * Create analytics export job
   */
  async createAnalyticsExport(
    request: ExportAnalyticsReportRequest
  ): Promise<ExportJobResponse> {
    try {
      const response = await this.http.post<ExportJobResponse>(
        '/api/v1/export/analytics-report',
        request
      );

      // Validate response
      if (!response.job_id || !response.status) {
        throw new ValidationError('Invalid export job response format');
      }

      return response;
    } catch (error) {
      throw this.handleError('Failed to create analytics export job', error);
    }
  }

  /**
   * Get export job status
   */
  async getExportJobStatus(jobId: string): Promise<ExportJobStatusResponse> {
    try {
      const response = await this.http.get<ExportJobStatusResponse>(
        `/api/v1/export/jobs/${jobId}/status`
      );

      // Validate response
      if (!response.job_id || !response.status) {
        throw new ValidationError('Invalid export job status response format');
      }

      return response;
    } catch (error) {
      throw this.handleError(`Failed to get export job status for ${jobId}`, error);
    }
  }

  /**
   * Download export file
   */
  async downloadExport(jobId: string): Promise<Blob> {
    try {
      const response = await this.http.request<Blob>(
        `/api/v1/export/jobs/${jobId}/download`,
        {
          method: 'GET',
        },
        {
          enableRetry: false, // Don't retry file downloads
        }
      );

      return response;
    } catch (error) {
      throw this.handleError(`Failed to download export file for job ${jobId}`, error);
    }
  }

  /**
   * Cancel export job
   */
  async cancelExportJob(jobId: string): Promise<{ message: string }> {
    try {
      const response = await this.http.delete<{ message: string }>(
        `/api/v1/export/jobs/${jobId}`
      );

      return response;
    } catch (error) {
      throw this.handleError(`Failed to cancel export job ${jobId}`, error);
    }
  }

  /**
   * List export jobs
   */
  async listExportJobs(
    limit: number = 50,
    offset: number = 0,
    statusFilter?: string
  ): Promise<{ jobs: ExportJobStatusResponse[]; total_count: number }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (statusFilter) {
        params.append('status_filter', statusFilter);
      }

      const response = await this.http.get<{ jobs: ExportJobStatusResponse[]; total_count: number }>(
        `/api/v1/export/jobs?${params.toString()}`
      );

      return response;
    } catch (error) {
      throw this.handleError('Failed to list export jobs', error);
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();

    try {
      await this.getSystemHealth();
      const latency = Date.now() - startTime;

      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return { success: false, latency, error: errorMessage };
    }
  }

  /**
   * Handle and transform errors
   */
  private handleError(context: string, error: any): Error {
    if (error instanceof APIServiceError) {
      return error;
    }

    if (error instanceof Error) {
      return new APIServiceError(`${context}: ${error.message}`, 0, undefined, error);
    }

    return new APIServiceError(`${context}: Unknown error`, 0, undefined, error);
  }

  /**
   * Update HTTP client configuration
   */
  updateConfig(config: Partial<APIServiceConfig>): void {
    this.http = new HTTPClient({ ...this.http['config'], ...config });
  }
}

// ============================================================================
// Default Export and Singleton
// ============================================================================

// Create default API service instance
export const apiService = new APIService();

// Export for direct usage
export default APIService;

// ============================================================================
// Request/Response Validation Utilities
// ============================================================================

/**
 * Validate API response structure
 */
export function validateAPIResponse<T>(
  response: any,
  requiredFields: string[]
): response is APIResponse<T> {
  if (!response || typeof response !== 'object') {
    return false;
  }

  return requiredFields.every((field) => field in response);
}

/**
 * Create standardized API error
 */
export function createAPIError(
  message: string,
  statusCode: number = 500,
  details: any = {}
): APIError {
  return {
    error: 'API Error',
    message,
    status_code: statusCode,
    timestamp: new Date().toISOString(),
    details,
  };
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Check if error is validation-related
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

// ============================================================================
// Development and Testing Utilities
// ============================================================================

/**
 * Mock API responses for development/testing
 */
export const mockResponses = {
  systemHealth: (): SystemHealthResponse => ({
    status: 'healthy',
    detector_model_status: 'loaded',
    tracker_factory_status: 'ready',
    homography_matrices_status: 'loaded',
    timestamp: new Date().toISOString(),
  }),

  taskStart: (environmentId: string): ProcessingTaskCreateResponse => ({
    task_id: `task-${Date.now()}`,
    websocket_url: `ws://localhost:3847/ws/tracking/task-${Date.now()}`,
    status_url: `http://localhost:3847/api/v1/processing-tasks/task-${Date.now()}/status`,
    message: `Processing task started for ${environmentId} environment`,
  }),

  taskStatus: (taskId: string): TaskStatusResponse => ({
    task_id: taskId,
    status: 'PROCESSING',
    progress: 0.45,
    current_step: 'Processing frames',
    details: { frames_processed: 123, total_frames: 275 },
    created_at: new Date(Date.now() - 30000).toISOString(),
    updated_at: new Date().toISOString(),
  }),

  playbackStatus: (
    taskId: string,
    state: PlaybackStatusResponse['state'] = 'playing'
  ): PlaybackStatusResponse => ({
    task_id: taskId,
    state,
    last_transition_at: new Date().toISOString(),
    last_frame_index: 128,
    last_error: undefined,
  }),

  realTimeMetrics: (): RealTimeMetrics => ({
    active_persons: 0,
    total_cameras: 8,
  }),

  activePersons: (): ActivePerson[] => [],

  systemStatistics: (): SystemStatistics => ({
    total_processed: 0,
    uptime: 3600,
  }),
};

/**
 * Create mock API service for testing
 */
export function createMockAPIService(): APIService {
  const mockService = new APIService();

  // Override methods with mock responses
  mockService.getSystemHealth = async () => mockResponses.systemHealth();
  mockService.startProcessingTask = async (request) =>
    mockResponses.taskStart(request.environment_id);
  mockService.getTaskStatus = async (taskId) => mockResponses.taskStatus(taskId);
  mockService.pauseTaskPlayback = async (taskId) =>
    mockResponses.playbackStatus(taskId, 'paused');
  mockService.resumeTaskPlayback = async (taskId) =>
    mockResponses.playbackStatus(taskId, 'playing');
  mockService.getPlaybackStatus = async (taskId) =>
    mockResponses.playbackStatus(taskId);
  mockService.getRealTimeMetrics = async () => mockResponses.realTimeMetrics();
  mockService.getActivePersons = async () => mockResponses.activePersons();
  mockService.getSystemStatistics = async () => mockResponses.systemStatistics();

  return mockService;
}
