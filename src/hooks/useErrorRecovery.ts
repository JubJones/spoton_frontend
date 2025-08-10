// src/hooks/useErrorRecovery.ts
import React, { useState, useCallback, useRef } from 'react';

interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: () => void;
  onMaxRetriesExceeded?: (error: Error) => void;
}

interface ErrorRecoveryState {
  isLoading: boolean;
  error: Error | null;
  attemptCount: number;
  isRetrying: boolean;
}

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onError,
    onSuccess,
    onMaxRetriesExceeded,
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isLoading: false,
    error: null,
    attemptCount: 0,
    isRetrying: false,
  });

  const timeoutRef = useRef<number | null>(null);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const calculateDelay = useCallback(
    (attempt: number) => {
      if (!exponentialBackoff) return retryDelay;
      return retryDelay * Math.pow(2, attempt - 1);
    },
    [retryDelay, exponentialBackoff]
  );

  const executeWithRecovery = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const attemptOperation = async (attempt: number): Promise<T> => {
        try {
          setState((prev) => ({ ...prev, attemptCount: attempt }));
          const result = await operation();

          setState({
            isLoading: false,
            error: null,
            attemptCount: 0,
            isRetrying: false,
          });

          if (onSuccess) {
            onSuccess();
          }

          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          if (onError) {
            onError(err, attempt);
          }

          if (attempt >= maxRetries) {
            setState({
              isLoading: false,
              error: err,
              attemptCount: attempt,
              isRetrying: false,
            });

            if (onMaxRetriesExceeded) {
              onMaxRetriesExceeded(err);
            }

            throw err;
          }

          // Schedule retry
          const delay = calculateDelay(attempt);
          setState((prev) => ({ ...prev, isRetrying: true, error: err }));

          return new Promise<T>((resolve, reject) => {
            timeoutRef.current = window.setTimeout(() => {
              setState((prev) => ({ ...prev, isRetrying: false }));
              attemptOperation(attempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          });
        }
      };

      return attemptOperation(1);
    },
    [maxRetries, calculateDelay, onError, onSuccess, onMaxRetriesExceeded]
  );

  const retry = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      clearTimeouts();
      return executeWithRecovery(operation);
    },
    [executeWithRecovery, clearTimeouts]
  );

  const reset = useCallback(() => {
    clearTimeouts();
    setState({
      isLoading: false,
      error: null,
      attemptCount: 0,
      isRetrying: false,
    });
  }, [clearTimeouts]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    ...state,
    executeWithRecovery,
    retry,
    reset,
    canRetry: state.attemptCount < maxRetries && !state.isLoading,
  };
}

// Hook for handling network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || null);

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || null);
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}

// Hook for handling async operations with loading states
export function useAsyncOperation<T = any, E = Error>() {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: E | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await operation();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const err = error as E;
      setState((prev) => ({ ...prev, loading: false, error: err }));
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isIdle: !state.loading && !state.error && !state.data,
  };
}
