// src/components/common/ErrorBoundary.tsx
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
  error?: Error;
  retry?: () => void;
  resetErrorBoundary?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  resetErrorBoundary,
}) => (
  <div className="min-h-[200px] flex items-center justify-center bg-gray-800 rounded-lg border border-red-500/20">
    <div className="text-center p-6 max-w-md">
      <div className="text-red-400 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h3>
      <p className="text-gray-300 text-sm mb-4">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <div className="space-x-3">
        {retry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Try Again
          </button>
        )}
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary if resetKeys have changed
    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some((key, index) => key !== prevResetKeys[index]);

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary if resetOnPropsChange is true and children changed
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    }, 100);
  };

  retry = () => {
    this.resetErrorBoundary();
    // Force a re-render by changing the key
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback: Fallback = ErrorFallback } = this.props;

    if (hasError) {
      return (
        <Fallback error={error} retry={this.retry} resetErrorBoundary={this.resetErrorBoundary} />
      );
    }

    return children;
  }
}

export default ErrorBoundary;
export type { ErrorFallbackProps };
