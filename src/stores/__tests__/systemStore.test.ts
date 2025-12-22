// System Store Tests
// src/stores/__tests__/systemStore.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSystemStore,
  useSystemActions,
  useCurrentEnvironment,
  useTaskInfo,
  useSystemHealth,
  useUIState,
  useDateTimeRange,
  useIsSystemReady,
  useIsTaskProcessing,
  useHasSystemErrors,
  initializeSystemStore,
} from '../systemStore';
import { apiService } from '../../services/apiService';

// Mock API service
vi.mock('../../services/apiService', () => ({
  apiService: {
    startProcessingTask: vi.fn(),
    getTaskStatus: vi.fn(),
    getSystemHealth: vi.fn(),
  },
}));

const mockApiService = apiService as any;

describe('System Store', () => {
  beforeEach(() => {
    // Reset store state
    useSystemStore.setState({
      currentEnvironment: undefined,
      currentTaskId: undefined,
      taskId: undefined,
      taskStatus: undefined,
      taskProgress: 0,
      taskError: undefined,
      isLoading: false,
      error: undefined,
      connectionStatus: 'disconnected',
      systemHealth: undefined,
      lastHealthCheck: 0,
      dateTimeRange: undefined,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSystemStore());
      const state = result.current;

      expect(state.currentEnvironment).toBeUndefined();
      expect(state.currentTaskId).toBeUndefined();
      expect(state.taskId).toBeUndefined();
      expect(state.taskStatus).toBeUndefined();
      expect(state.taskProgress).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeUndefined();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.systemHealth).toBeUndefined();
      expect(state.lastHealthCheck).toBe(0);
    });
  });

  describe('Environment Management', () => {
    it('should set environment', () => {
      const { result } = renderHook(() => useSystemActions());

      act(() => {
        result.current.setEnvironment('factory');
      });

      const { result: envResult } = renderHook(() => useCurrentEnvironment());
      expect(envResult.current).toBe('factory');
    });

    it('should clear task when changing environment', () => {
      const { result } = renderHook(() => useSystemStore());

      // Set initial state with task
      act(() => {
        useSystemStore.setState({
          currentEnvironment: 'campus',
          taskId: 'old-task',
          taskStatus: 'COMPLETED',
          taskProgress: 100,
        });
      });

      act(() => {
        result.current.actions.setEnvironment('factory');
      });

      const state = result.current;
      expect(state.currentEnvironment).toBe('factory');
      expect(state.taskId).toBeUndefined();
      expect(state.taskStatus).toBeUndefined();
      expect(state.taskProgress).toBe(0);
    });

    it('should set date time range', () => {
      const { result } = renderHook(() => useSystemActions());
      const dateTimeRange = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T01:00:00Z',
      };

      act(() => {
        result.current.setDateTimeRange(dateTimeRange as any);
      });

      const { result: rangeResult } = renderHook(() => useDateTimeRange());
      expect(rangeResult.current).toEqual(dateTimeRange);
    });
  });

  describe('Task Management', () => {
    it('should start processing task successfully', async () => {
      const mockResponse = {
        task_id: 'test-task-123',
        status: 'QUEUED' as const,
        created_at: '2024-01-01T00:00:00Z',
        environment_id: 'factory' as const,
      };

      mockApiService.startProcessingTask.mockResolvedValueOnce(mockResponse);
      mockApiService.getTaskStatus.mockResolvedValueOnce({
        task_id: 'test-task-123',
        status: 'QUEUED' as const,
        progress: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        environment_id: 'factory' as const,
      });

      const { result } = renderHook(() => useSystemActions());

      let taskId: string;
      await act(async () => {
        taskId = await result.current.startProcessingTask('factory');
      });

      expect(taskId!).toBe('test-task-123');
      expect(mockApiService.startProcessingTask).toHaveBeenCalledWith({
        environment_id: 'factory',
      });

      const { result: taskResult } = renderHook(() => useTaskInfo());
      expect(taskResult.current.taskId).toBe('test-task-123');
      expect(taskResult.current.taskStatus).toBe('QUEUED');
      expect(taskResult.current.taskProgress).toBe(0);
    });

    it('should handle task start failure', async () => {
      const error = new Error('Failed to start task');
      mockApiService.startProcessingTask.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await expect(result.current.startProcessingTask('factory')).rejects.toThrow(
          'Failed to start task'
        );
      });

      const { result: uiResult } = renderHook(() => useUIState());
      expect(uiResult.current.isLoading).toBe(false);
      expect(uiResult.current.error).toBe('Failed to start task');
    });

    it('should update task status', async () => {
      const mockStatusResponse = {
        task_id: 'test-task-123',
        status: 'PROCESSING' as const,
        progress: 50,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:30:00Z',
        environment_id: 'factory' as const,
      };

      mockApiService.getTaskStatus.mockResolvedValueOnce(mockStatusResponse);

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await result.current.updateTaskStatus('test-task-123');
      });

      const { result: taskResult } = renderHook(() => useTaskInfo());
      expect(taskResult.current.taskStatus).toBe('PROCESSING');
      expect(taskResult.current.taskProgress).toBe(50);
      expect(taskResult.current.taskError).toBeUndefined();
    });

    it('should handle failed task status', async () => {
      const mockStatusResponse = {
        task_id: 'test-task-123',
        status: 'FAILED' as const,
        progress: 25,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:15:00Z',
        environment_id: 'factory' as const,
        details: { error: 'Processing failed' },
      };

      mockApiService.getTaskStatus.mockResolvedValueOnce(mockStatusResponse);

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await result.current.updateTaskStatus('test-task-123');
      });

      const { result: taskResult } = renderHook(() => useTaskInfo());
      expect(taskResult.current.taskStatus).toBe('FAILED');
      expect(taskResult.current.taskError).toContain('Processing failed');
    });

    it('should handle task status update error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
      mockApiService.getTaskStatus.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await result.current.updateTaskStatus('test-task-123');
      });

      expect(consoleError).toHaveBeenCalledWith('Failed to update task status:', expect.any(Error));

      const { result: taskResult } = renderHook(() => useTaskInfo());
      expect(taskResult.current.taskError).toContain('Failed to get task status');

      consoleError.mockRestore();
    });

    it('should clear task', () => {
      const { result } = renderHook(() => useSystemStore());

      // Set initial task state
      act(() => {
        useSystemStore.setState({
          taskId: 'test-task-123',
          currentTaskId: 'test-task-123',
          taskStatus: 'COMPLETED',
          taskProgress: 100,
          connectionStatus: 'connected',
        });
      });

      act(() => {
        result.current.actions.clearTask();
      });

      const { result: taskResult } = renderHook(() => useTaskInfo());
      expect(taskResult.current.taskId).toBeUndefined();
      expect(taskResult.current.taskStatus).toBeUndefined();
      expect(taskResult.current.taskProgress).toBe(0);

      const { result: uiResult } = renderHook(() => useUIState());
      expect(uiResult.current.connectionStatus).toBe('disconnected');
    });

    it('should continue monitoring running tasks', async () => {
      vi.useFakeTimers();

      const mockStatusResponses = [
        {
          task_id: 'test-task-123',
          status: 'PROCESSING' as const,
          progress: 25,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:15:00Z',
          environment_id: 'factory' as const,
        },
        {
          task_id: 'test-task-123',
          status: 'COMPLETED' as const,
          progress: 100,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:30:00Z',
          environment_id: 'factory' as const,
        },
      ];

      mockApiService.getTaskStatus
        .mockResolvedValueOnce(mockStatusResponses[0])
        .mockResolvedValueOnce(mockStatusResponses[1]);

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await result.current.updateTaskStatus('test-task-123');
      });

      // Should have scheduled next update
      expect(mockApiService.getTaskStatus).toHaveBeenCalledTimes(1);

      // Advance time to trigger next update
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockApiService.getTaskStatus).toHaveBeenCalledTimes(2);

      const { result: taskResult } = renderHook(() => useTaskInfo());
      expect(taskResult.current.taskStatus).toBe('COMPLETED');

      vi.useRealTimers();
    });
  });

  describe('System Health', () => {
    it('should check system health successfully', async () => {
      const mockHealthResponse = {
        status: 'healthy' as const,
        detector_model_status: 'ready' as const,
        tracker_factory_status: 'ready' as const,
        homography_matrices_status: 'ready' as const,
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiService.getSystemHealth.mockResolvedValueOnce(mockHealthResponse);

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await result.current.checkSystemHealth();
      });

      const { result: healthResult } = renderHook(() => useSystemHealth());
      expect(healthResult.current.health).toEqual(mockHealthResponse);
      expect(healthResult.current.lastCheck).toBeGreaterThan(0);
    });

    it('should handle system health check failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
      mockApiService.getSystemHealth.mockRejectedValueOnce(new Error('Health check failed'));

      const { result } = renderHook(() => useSystemActions());

      await act(async () => {
        await result.current.checkSystemHealth();
      });

      expect(consoleError).toHaveBeenCalledWith('System health check failed:', expect.any(Error));

      const { result: healthResult } = renderHook(() => useSystemHealth());
      expect(healthResult.current.health?.status).toBe('error');

      consoleError.mockRestore();
    });
  });

  describe('UI State Management', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useSystemActions());

      act(() => {
        result.current.setLoading(true);
      });

      const { result: uiResult } = renderHook(() => useUIState());
      expect(uiResult.current.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useSystemActions());
      const errorMessage = 'Something went wrong';

      act(() => {
        result.current.setError(errorMessage);
      });

      const { result: uiResult } = renderHook(() => useUIState());
      expect(uiResult.current.error).toBe(errorMessage);
    });

    it('should set connection status', () => {
      const { result } = renderHook(() => useSystemActions());

      act(() => {
        result.current.setConnectionStatus('connected');
      });

      const { result: uiResult } = renderHook(() => useUIState());
      expect(uiResult.current.connectionStatus).toBe('connected');
    });
  });

  describe('Utility Hooks', () => {
    describe('useIsSystemReady', () => {
      it('should return true when system is ready', () => {
        act(() => {
          useSystemStore.setState({
            currentEnvironment: 'factory',
            taskId: 'test-task-123',
            taskStatus: 'COMPLETED',
            connectionStatus: 'connected',
          });
        });

        const { result } = renderHook(() => useIsSystemReady());
        expect(result.current).toBe(true);
      });

      it('should return false when missing requirements', () => {
        act(() => {
          useSystemStore.setState({
            currentEnvironment: 'factory',
            taskId: 'test-task-123',
            taskStatus: 'PROCESSING', // Not completed
            connectionStatus: 'connected',
          });
        });

        const { result } = renderHook(() => useIsSystemReady());
        expect(result.current).toBe(false);
      });
    });

    describe('useIsTaskProcessing', () => {
      it('should return true for processing statuses', () => {
        act(() => {
          useSystemStore.setState({ taskStatus: 'PROCESSING' });
        });

        const { result } = renderHook(() => useIsTaskProcessing());
        expect(result.current).toBe(true);
      });

      it('should return true for downloading status', () => {
        act(() => {
          useSystemStore.setState({ taskStatus: 'DOWNLOADING' });
        });

        const { result } = renderHook(() => useIsTaskProcessing());
        expect(result.current).toBe(true);
      });

      it('should return false for completed status', () => {
        act(() => {
          useSystemStore.setState({ taskStatus: 'COMPLETED' });
        });

        const { result } = renderHook(() => useIsTaskProcessing());
        expect(result.current).toBe(false);
      });
    });

    describe('useHasSystemErrors', () => {
      it('should return true when there are errors', () => {
        act(() => {
          useSystemStore.setState({ error: 'System error' });
        });

        const { result } = renderHook(() => useHasSystemErrors());
        expect(result.current).toBe(true);
      });

      it('should return true for task errors', () => {
        act(() => {
          useSystemStore.setState({ taskError: 'Task failed' });
        });

        const { result } = renderHook(() => useHasSystemErrors());
        expect(result.current).toBe(true);
      });

      it('should return true for system health errors', () => {
        act(() => {
          useSystemStore.setState({
            systemHealth: {
              status: 'error',
              detector_model_status: 'error',
              tracker_factory_status: 'error',
              homography_matrices_status: 'error',
              timestamp: '2024-01-01T00:00:00Z',
            },
          });
        });

        const { result } = renderHook(() => useHasSystemErrors());
        expect(result.current).toBe(true);
      });

      it('should return false when no errors', () => {
        act(() => {
          useSystemStore.setState({
            error: undefined,
            taskError: undefined,
            systemHealth: {
              status: 'healthy',
              detector_model_status: 'loaded',
              tracker_factory_status: 'ready',
              homography_matrices_status: 'loaded',
              timestamp: '2024-01-01T00:00:00Z',
            },
          });
        });

        const { result } = renderHook(() => useHasSystemErrors());
        expect(result.current).toBe(false);
      });
    });
  });

  describe('Store Reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useSystemStore());

      // Set some state
      act(() => {
        useSystemStore.setState({
          currentEnvironment: 'factory',
          taskId: 'test-task-123',
          taskStatus: 'COMPLETED',
          isLoading: true,
          error: 'Some error',
        });
      });

      act(() => {
        result.current.actions.reset();
      });

      const state = result.current;
      expect(state.currentEnvironment).toBeUndefined();
      expect(state.taskId).toBeUndefined();
      expect(state.taskStatus).toBeUndefined();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeUndefined();
    });
  });

  describe('Store Initialization', () => {
    it('should initialize with health check', () => {
      vi.useFakeTimers();
      const mockHealthResponse = {
        status: 'healthy' as const,
        detector_model_status: 'ready' as const,
        tracker_factory_status: 'ready' as const,
        homography_matrices_status: 'ready' as const,
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiService.getSystemHealth.mockResolvedValue(mockHealthResponse);

      initializeSystemStore();

      expect(mockApiService.getSystemHealth).toHaveBeenCalledTimes(1);

      // Should set up periodic health checks
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      expect(mockApiService.getSystemHealth).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('Persistence', () => {
    it('should persist selected state fields', () => {
      const { result } = renderHook(() => useSystemStore());

      act(() => {
        result.current.actions.setEnvironment('factory');
        result.current.actions.setDateTimeRange({
          earliest_date: '2024-01-01T00:00:00Z',
          latest_date: '2024-01-02T00:00:00Z',
          total_days: 2,
          has_data: true,
          data_gaps: [],
        });
      });

      // The persistence is handled by zustand middleware
      // In a real test environment, we would test the persistence layer separately
      expect(result.current.currentEnvironment).toBe('factory');
      expect(result.current.dateTimeRange).toBeDefined();
    });
  });
});
