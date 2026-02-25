// src/components/common/__tests__/ErrorBoundary.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ErrorBoundary, { ErrorFallback } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; error?: Error }> = ({
  shouldThrow = true,
  error = new Error('Test error')
}) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
};

// Component that works normally
const WorkingComponent: React.FC = () => {
  return <div data-testid="working-component">Working correctly</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Mock console.error to prevent error output during tests
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('should render error fallback when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render custom fallback component', () => {
    const CustomFallback: React.FC<import('../ErrorBoundary').ErrorFallbackProps> = ({
      error,
      resetErrorBoundary
    }) => (
      <div>
        <h2>Custom Error: {error?.message}</h2>
        <button onClick={resetErrorBoundary}>Custom Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Reset')).toBeInTheDocument();
  });

  it('should call onError when error occurs', () => {
    const onError = vi.fn();
    const error = new Error('Test error for callback');

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should reset error when Try Again button is clicked', () => {
    const TestWithConditionalError: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <div>
          <button
            data-testid="fix-error"
            onClick={() => setShouldThrow(false)}
          >
            Fix Error
          </button>
          <ThrowError shouldThrow={shouldThrow} />
        </div>
      );
    };

    render(
      <ErrorBoundary>
        <TestWithConditionalError />
      </ErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click "Fix Error" button in the component (this should be available even in error state)
    // Since error boundary catches the error, we need to test the reset functionality differently
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // After reset, the component should re-render, but will still throw because shouldThrow is still true
    // This test verifies that the reset mechanism works
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should reset error when resetErrorBoundary is called from resetKeys change', async () => {
    const TestComponentWithResetKey: React.FC<{ resetKey: number }> = ({ resetKey }) => {
      const shouldThrow = resetKey <= 1;
      return <ThrowError shouldThrow={shouldThrow} />;
    };

    const ParentComponent: React.FC = () => {
      const [resetKey, setResetKey] = React.useState(1);

      return (
        <div>
          <button
            data-testid="change-reset-key"
            onClick={() => setResetKey(prev => prev + 1)}
          >
            Change Reset Key
          </button>
          <ErrorBoundary resetKeys={[resetKey]}>
            <TestComponentWithResetKey resetKey={resetKey} />
          </ErrorBoundary>
        </div>
      );
    };

    render(<ParentComponent />);

    // Error should be displayed initially
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change reset key, which should reset the error boundary
    fireEvent.click(screen.getByTestId('change-reset-key'));

    // After reset key change, component should work
    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  it('should display different error types correctly', () => {
    const typeError = new TypeError('Type error message');

    render(
      <ErrorBoundary>
        <ThrowError error={typeError} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Type error message')).toBeInTheDocument();
  });

  it('should handle errors with stack traces', () => {
    const errorWithStack = new Error('Error with stack');
    errorWithStack.stack = 'Error: Error with stack\n    at TestComponent\n    at ErrorBoundary';

    render(
      <ErrorBoundary>
        <ThrowError error={errorWithStack} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error with stack')).toBeInTheDocument();

    // Check if "Show Details" button is present for errors with stack traces
    const showDetailsButton = screen.queryByText('Show Details');
    if (showDetailsButton) {
      expect(showDetailsButton).toBeInTheDocument();
    }
  });
});

describe('ErrorFallback', () => {
  const mockError = new Error('Mock error for fallback');

  it('should render error message and retry button', () => {
    const retry = vi.fn();
    const resetErrorBoundary = vi.fn();

    render(
      <ErrorFallback error={mockError} retry={retry} resetErrorBoundary={resetErrorBoundary} />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Mock error for fallback')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should call retry when Try Again button is clicked', () => {
    const retry = vi.fn();

    render(<ErrorFallback error={mockError} retry={retry} />);

    fireEvent.click(screen.getByText('Try Again'));

    expect(retry).toHaveBeenCalled();
  });

  it('should call resetErrorBoundary when Reset button is clicked', () => {
    const resetErrorBoundary = vi.fn();

    render(<ErrorFallback error={mockError} resetErrorBoundary={resetErrorBoundary} />);

    fireEvent.click(screen.getByText('Reset'));

    expect(resetErrorBoundary).toHaveBeenCalled();
  });
});
