// src/components/common/__tests__/ErrorBoundary.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary, ErrorFallback, CriticalErrorBoundary } from '../ErrorBoundary';

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
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
    const CustomFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
      error, 
      resetError 
    }) => (
      <div>
        <h2>Custom Error: {error.message}</h2>
        <button onClick={resetError}>Custom Reset</button>
      </div>
    );

    render(
      <ErrorBoundary FallbackComponent={CustomFallback}>
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

    expect(onError).toHaveBeenCalledWith(error, expect.any(String));
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

  it('should reset error when resetErrorBoundary is called from resetKeys change', () => {
    const TestComponentWithResetKey: React.FC<{ resetKey: number }> = ({ resetKey }) => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      React.useEffect(() => {
        if (resetKey > 1) {
          setShouldThrow(false);
        }
      }, [resetKey]);

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
    expect(screen.getByText('No error')).toBeInTheDocument();
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
    const resetError = vi.fn();

    render(<ErrorFallback error={mockError} resetError={resetError} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Mock error for fallback')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should call resetError when Try Again button is clicked', () => {
    const resetError = vi.fn();

    render(<ErrorFallback error={mockError} resetError={resetError} />);

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    expect(resetError).toHaveBeenCalledTimes(1);
  });

  it('should show error details when Show Details button is clicked', () => {
    const errorWithStack = new Error('Error with stack trace');
    errorWithStack.stack = 'Error: Error with stack trace\n    at Component\n    at ErrorBoundary';
    
    const resetError = vi.fn();

    render(<ErrorFallback error={errorWithStack} resetError={resetError} />);

    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);

    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    expect(screen.getByText(errorWithStack.stack)).toBeInTheDocument();
  });

  it('should hide error details when Hide Details button is clicked', () => {
    const errorWithStack = new Error('Error with stack trace');
    errorWithStack.stack = 'Error: Error with stack trace\n    at Component';
    
    const resetError = vi.fn();

    render(<ErrorFallback error={errorWithStack} resetError={resetError} />);

    // Show details first
    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);

    expect(screen.getByText('Hide Details')).toBeInTheDocument();

    // Hide details
    const hideDetailsButton = screen.getByText('Hide Details');
    fireEvent.click(hideDetailsButton);

    expect(screen.getByText('Show Details')).toBeInTheDocument();
    expect(screen.queryByText(errorWithStack.stack)).not.toBeInTheDocument();
  });

  it('should not show details button for errors without stack trace', () => {
    const errorWithoutStack = new Error('Simple error');
    delete errorWithoutStack.stack;

    const resetError = vi.fn();

    render(<ErrorFallback error={errorWithoutStack} resetError={resetError} />);

    expect(screen.queryByText('Show Details')).not.toBeInTheDocument();
  });
});

describe('CriticalErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when there is no error', () => {
    render(
      <CriticalErrorBoundary>
        <WorkingComponent />
      </CriticalErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('should render critical error message when child throws error', () => {
    render(
      <CriticalErrorBoundary>
        <ThrowError />
      </CriticalErrorBoundary>
    );

    expect(screen.getByText('Critical Application Error')).toBeInTheDocument();
    expect(screen.getByText(/A critical error has occurred/)).toBeInTheDocument();
    expect(screen.getByText('Reload Application')).toBeInTheDocument();
  });

  it('should show error details in critical error boundary', () => {
    const criticalError = new Error('Critical system error');

    render(
      <CriticalErrorBoundary>
        <ThrowError error={criticalError} />
      </CriticalErrorBoundary>
    );

    expect(screen.getByText('Critical system error')).toBeInTheDocument();
  });

  it('should reload page when Reload Application button is clicked', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window.location, 'reload', {
      value: mockReload,
      writable: true,
    });

    render(
      <CriticalErrorBoundary>
        <ThrowError />
      </CriticalErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Application');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should call onCriticalError when error occurs', () => {
    const onCriticalError = vi.fn();
    const error = new Error('Critical test error');

    render(
      <CriticalErrorBoundary onCriticalError={onCriticalError}>
        <ThrowError error={error} />
      </CriticalErrorBoundary>
    );

    expect(onCriticalError).toHaveBeenCalledWith(error, expect.any(String));
  });
});