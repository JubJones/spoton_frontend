// API Service Tests
// src/services/__tests__/apiService.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIService } from '../apiService';
import {
  ProcessingTaskStartRequest,
  ProcessingTaskCreateResponse,
  TaskStatusResponse,
  SystemHealthResponse,
} from '../../types/api';

// Mock fetch globally
global.fetch = vi.fn();

describe('APIService', () => {
  let apiService: APIService;
  const mockFetch = fetch as vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    apiService = new APIService({
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 100,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default config', () => {
      const service = new APIService();
      expect(service).toBeInstanceOf(APIService);
    });

    it('should create instance with custom config', () => {
      const customConfig = { timeout: 10000, retryAttempts: 5, retryDelay: 500 };
      const service = new APIService(customConfig);
      expect(service).toBeInstanceOf(APIService);
    });

    it('should update configuration', () => {
      const newConfig = { timeout: 8000 };
      apiService.updateConfig(newConfig);
      // Configuration update should not throw
      expect(() => apiService.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('startProcessingTask', () => {
    const mockRequest: ProcessingTaskStartRequest = {
      environment_id: 'factory',
      datetime_range: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T01:00:00Z',
      },
    };

    const mockResponse: ProcessingTaskCreateResponse = {
      task_id: 'test-task-123',
      status: 'QUEUED',
      created_at: '2024-01-01T00:00:00Z',
      environment_id: 'factory',
    };

    it('should start processing task successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.startProcessingTask(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid environment_id' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiService.startProcessingTask(mockRequest)).rejects.toThrow(
        'API request failed: 400 Bad Request'
      );
    });

    it('should retry on network failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => mockResponse,
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

      const result = await apiService.startProcessingTask(mockRequest);

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result).toEqual(mockResponse);
    });

    it('should handle timeout', async () => {
      const slowApiService = new APIService({ timeout: 100, retryAttempts: 0 });

      // Mock a slow response
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 200)));

      await expect(slowApiService.startProcessingTask(mockRequest)).rejects.toThrow(
        'Request timeout'
      );
    });
  });

  describe('getTaskStatus', () => {
    const taskId = 'test-task-123';
    const mockResponse: TaskStatusResponse = {
      task_id: taskId,
      status: 'PROCESSING',
      progress: 50,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:30:00Z',
      environment_id: 'factory',
    };

    it('should get task status successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.getTaskStatus(taskId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/v1/tasks/${taskId}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle task not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Task not found' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiService.getTaskStatus(taskId)).rejects.toThrow(
        'API request failed: 404 Not Found'
      );
    });
  });

  describe('getSystemHealth', () => {
    const mockResponse: SystemHealthResponse = {
      status: 'healthy',
      detector_model_status: 'ready',
      tracker_factory_status: 'ready',
      homography_matrices_status: 'ready',
      timestamp: '2024-01-01T00:00:00Z',
    };

    it('should get system health successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.getSystemHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle health check failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Health check failed' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiService.getSystemHealth()).rejects.toThrow(
        'API request failed: 503 Service Unavailable'
      );
    });
  });

  describe('cancelTask', () => {
    const taskId = 'test-task-123';

    it('should cancel task successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Task canceled successfully' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.cancelTask(taskId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/v1/tasks/${taskId}/cancel`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );

      expect(result).toEqual({ message: 'Task canceled successfully' });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiService.getSystemHealth()).rejects.toThrow('Invalid JSON');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      await expect(apiService.getSystemHealth()).rejects.toThrow('Network connection failed');
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.getSystemHealth();
      expect(result).toEqual({});
    });
  });

  describe('Request Validation', () => {
    it('should validate processing task request', async () => {
      const invalidRequest = {} as ProcessingTaskStartRequest;

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Missing environment_id' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiService.startProcessingTask(invalidRequest)).rejects.toThrow(
        'API request failed: 400 Bad Request'
      );
    });

    it('should handle missing task ID', async () => {
      await expect(apiService.getTaskStatus('')).rejects.toThrow('Task ID is required');
    });
  });

  describe('Performance Metrics', () => {
    it('should track request metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await apiService.getSystemHealth();

      const metrics = apiService.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.lastRequestTime).toBeGreaterThan(0);
    });

    it('should track error metrics', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await apiService.getSystemHealth();
      } catch (error) {
        // Expected error
      }

      const metrics = apiService.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should reset metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await apiService.getSystemHealth();
      apiService.resetMetrics();

      const metrics = apiService.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });
});
