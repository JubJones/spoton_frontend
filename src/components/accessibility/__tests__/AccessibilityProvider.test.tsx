// src/components/accessibility/__tests__/AccessibilityProvider.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AccessibilityProvider, useAccessibility, SkipLink, ScreenReaderOnly } from '../AccessibilityProvider';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Test component that uses accessibility context
const TestComponent: React.FC = () => {
  const {
    settings,
    updateSetting,
    announceToScreenReader,
    getFocusableElements,
    trapFocus,
    skipToContent,
  } = useAccessibility();

  return (
    <div>
      <div data-testid="settings">{JSON.stringify(settings)}</div>
      <button
        data-testid="toggle-high-contrast"
        onClick={() => updateSetting('highContrast', !settings.highContrast)}
      >
        Toggle High Contrast
      </button>
      <button
        data-testid="announce"
        onClick={() => announceToScreenReader('Test announcement')}
      >
        Announce
      </button>
      <button
        data-testid="skip-content"
        onClick={skipToContent}
      >
        Skip to Content
      </button>
      <input data-testid="focusable-input" />
      <button data-testid="focusable-button">Focus Test</button>
    </div>
  );
};

describe('AccessibilityProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset document classes
    document.documentElement.className = '';

    // Mock querySelector for main content
    document.querySelector = vi.fn().mockImplementation((selector) => {
      if (selector === 'main, [role="main"], #main-content') {
        return {
          focus: vi.fn(),
          scrollIntoView: vi.fn(),
        };
      }
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  it('should provide default accessibility settings', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const settings = JSON.parse(screen.getByTestId('settings').textContent || '{}');

    expect(settings.reduceMotion).toBe(false);
    expect(settings.highContrast).toBe(false);
    expect(settings.largeText).toBe(false);
    expect(settings.focusVisible).toBe(true);
    expect(settings.screenReaderAnnouncements).toBe(true);
    expect(settings.keyboardNavigation).toBe(true);
  });

  it('should load settings from localStorage', () => {
    const savedSettings = {
      highContrast: true,
      largeText: true,
      reduceMotion: false,
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const settings = JSON.parse(screen.getByTestId('settings').textContent || '{}');

    expect(settings.highContrast).toBe(true);
    expect(settings.largeText).toBe(true);
  });

  it('should respect system preferences for reduced motion', () => {
    (window.matchMedia as any).mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const settings = JSON.parse(screen.getByTestId('settings').textContent || '{}');
    expect(settings.reduceMotion).toBe(true);
  });

  it('should update settings and save to localStorage', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const toggleButton = screen.getByTestId('toggle-high-contrast');

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'spotOnAccessibility',
        expect.stringContaining('"highContrast":true')
      );
    });
  });

  it('should apply CSS classes based on settings', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const toggleButton = screen.getByTestId('toggle-high-contrast');

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    });
  });

  it('should set CSS custom properties based on settings', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--focus-ring-color')).toBe('#f97316');
      expect(document.documentElement.style.getPropertyValue('--focus-ring-width')).toBe('2px');
    });

    const toggleButton = screen.getByTestId('toggle-high-contrast');

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--focus-ring-color')).toBe('#ffff00');
    });
  });

  it('should create live region for screen reader announcements', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const liveRegions = document.querySelectorAll('[aria-live]');
    expect(liveRegions.length).toBeGreaterThan(0);

    const liveRegion = liveRegions[0] as HTMLElement;
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
  });

  it('should make announcements to screen readers', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const announceButton = screen.getByTestId('announce');

    await act(async () => {
      fireEvent.click(announceButton);
    });

    await waitFor(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      const liveRegion = liveRegions[0] as HTMLElement;
      expect(liveRegion.textContent).toBe('Test announcement');
    }, { timeout: 200 });
  });

  it('should handle global keyboard shortcuts', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    // Test Alt + 1 (skip to content)
    await act(async () => {
      fireEvent.keyDown(document, { key: '1', altKey: true });
    });

    expect(document.querySelector).toHaveBeenCalledWith('main, [role="main"], #main-content');

    // Test Alt + Shift + H (toggle high contrast)
    await act(async () => {
      fireEvent.keyDown(document, { key: 'H', altKey: true, shiftKey: true });
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    });
  });

  it('should get focusable elements correctly', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Button 1</button>
      <input type="text" />
      <button disabled>Disabled Button</button>
      <a href="#test">Link</a>
      <div tabindex="0">Focusable Div</div>
      <div tabindex="-1">Non-focusable Div</div>
    `;

    // Mock computed styles
    window.getComputedStyle = vi.fn().mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    });

    // Mock offsetWidth/Height for visibility check
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 20,
    });

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const { result } = renderAccessibilityHook();
    const focusableElements = result.current.getFocusableElements(container);

    // Should find enabled button, input, link, and focusable div (not disabled button or tabindex="-1")
    expect(focusableElements.length).toBe(4);
  });

  it('should trap focus in a container', () => {
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');

    button1.textContent = 'First';
    button2.textContent = 'Last';

    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    // Mock computed styles and dimensions
    window.getComputedStyle = vi.fn().mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    });

    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 20,
    });

    button1.focus = vi.fn();
    button2.focus = vi.fn();

    const { result } = renderAccessibilityHook();
    const cleanup = result.current.trapFocus(container);

    expect(button1.focus).toHaveBeenCalled();

    // Simulate Tab on last element
    Object.defineProperty(document, 'activeElement', {
      value: button2,
      configurable: true,
    });

    fireEvent.keyDown(container, { key: 'Tab' });
    expect(button1.focus).toHaveBeenCalledTimes(2); // Initial focus + trap

    cleanup();
    document.body.removeChild(container);
  });

  it('should skip to main content', async () => {
    const mockMain = {
      focus: vi.fn(),
      scrollIntoView: vi.fn(),
    };

    document.querySelector = vi.fn().mockReturnValue(mockMain);

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const skipButton = screen.getByTestId('skip-content');

    await act(async () => {
      fireEvent.click(skipButton);
    });

    expect(mockMain.focus).toHaveBeenCalled();
    expect(mockMain.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('should throw error when used outside provider', () => {
    // Capture console.error to prevent test output pollution
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAccessibility must be used within AccessibilityProvider');

    console.error = originalError;
  });
});

describe('SkipLink', () => {
  it('should render skip link with correct attributes', () => {
    render(
      <SkipLink href="#main-content">Skip to main content</SkipLink>
    );

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    expect(skipLink).toHaveClass('absolute');
  });

  it('should scroll into view when focused', () => {
    const mockScrollIntoView = vi.fn();

    render(
      <SkipLink href="#main-content">Skip to main content</SkipLink>
    );

    const skipLink = screen.getByText('Skip to main content');
    skipLink.scrollIntoView = mockScrollIntoView;

    fireEvent.focus(skipLink);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });
});

describe('ScreenReaderOnly', () => {
  it('should render content with screen reader only styles', () => {
    render(
      <ScreenReaderOnly>Screen reader only content</ScreenReaderOnly>
    );

    const element = screen.getByText('Screen reader only content');
    expect(element).toHaveClass('absolute');
    expect(element).toHaveClass('left-[-10000px]');
  });

  it('should render with custom component type', () => {
    render(
      <ScreenReaderOnly as="div">Screen reader content</ScreenReaderOnly>
    );

    const element = screen.getByText('Screen reader content');
    expect(element.tagName.toLowerCase()).toBe('div');
  });
});



// Fix for the hook testing - use a proper test component
const HookTestComponent: React.FC<{
  onAccessibility: (accessibility: ReturnType<typeof useAccessibility>) => void;
}> = ({ onAccessibility }) => {
  const accessibility = useAccessibility();

  React.useEffect(() => {
    onAccessibility(accessibility);
  }, [accessibility, onAccessibility]);

  return null;
};

function renderAccessibilityHookProper() {
  let accessibilityHook: ReturnType<typeof useAccessibility>;

  const onAccessibility = (accessibility: ReturnType<typeof useAccessibility>) => {
    accessibilityHook = accessibility;
  };

  render(
    <AccessibilityProvider>
      <HookTestComponent onAccessibility={onAccessibility} />
    </AccessibilityProvider>
  );

  return {
    result: {
      current: accessibilityHook!,
    },
  };
}

// Update the test to use the proper hook renderer
function renderAccessibilityHook() {
  return renderAccessibilityHookProper();
}