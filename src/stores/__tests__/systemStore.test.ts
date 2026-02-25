// src/stores/__tests__/systemStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSystemStore, useSystemActions } from '../systemStore';

vi.mock('../../services/apiService', () => ({
  apiService: {
    startProcessingTask: vi.fn(),
    getTaskStatus: vi.fn(),
    getSystemHealth: vi.fn(),
  },
}));

vi.mock('../../services/dataCacheService', () => ({
  dataCacheService: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    deleteByTag: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/offlineQueueService', () => ({
  offlineQueueService: {
    clear: vi.fn(),
  },
  queueApiRequest: vi.fn(),
}));

vi.mock('../../services/dataValidationService', () => ({
  dataValidationService: {
    validateEnvironmentId: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    sanitizeUserInput: vi.fn().mockImplementation((value: string) => value),
    validateAndSanitize: vi.fn().mockImplementation((value: any) => ({ isValid: true, sanitized: value })),
    validateSystemHealth: vi.fn().mockReturnValue({ isValid: true, sanitized: undefined }),
  },
}));

vi.mock('../../services/statePersistenceService', () => ({
  statePersistenceService: {
    loadState: vi.fn().mockResolvedValue(null),
    saveState: vi.fn().mockResolvedValue(undefined),
    removeState: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('System store basics', () => {
  beforeEach(() => {
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
  });

  it('exposes initial state values', () => {
    const { result } = renderHook(() => useSystemStore());
    expect(result.current.currentEnvironment).toBeUndefined();
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.taskProgress).toBe(0);
  });

  it('allows setting the environment', () => {
    const { result } = renderHook(() => useSystemActions());

    act(() => {
      result.current.setEnvironment('factory');
    });

    const store = useSystemStore.getState();
    expect(store.currentEnvironment).toBe('factory');
    expect(store.taskId).toBeUndefined();
    expect(store.taskProgress).toBe(0);
  });

  it('updates UI flags with actions', () => {
    const actions = useSystemStore.getState().actions;

    act(() => {
      actions.setLoading(true);
      actions.setError('Something went wrong');
      actions.setConnectionStatus('connected');
    });

    const ui = useSystemStore.getState();
    expect(ui.isLoading).toBe(true);
    expect(ui.error).toBe('Something went wrong');
    expect(ui.connectionStatus).toBe('connected');
  });

  it('exposes task info selector', () => {
    act(() => {
      useSystemStore.setState({
        taskId: 'task-123',
        taskStatus: 'PROCESSING',
        taskProgress: 42,
        taskError: undefined,
      });
    });

    const state = useSystemStore.getState();
    expect(state.taskId).toBe('task-123');
    expect(state.taskStatus).toBe('PROCESSING');
    expect(state.taskProgress).toBe(42);
  });

  it('resets state when reset action is called', async () => {
    const { result } = renderHook(() => useSystemActions());

    act(() => {
      useSystemStore.setState({ currentEnvironment: 'factory', taskId: 'task-1' });
    });

    await act(async () => {
      await result.current.reset();
    });

    const store = useSystemStore.getState();
    expect(store.currentEnvironment).toBeUndefined();
    expect(store.taskId).toBeUndefined();
  });
});
