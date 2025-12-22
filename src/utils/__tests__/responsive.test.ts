// src/utils/__tests__/responsive.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  BREAKPOINTS,
  getResponsiveClasses,
  getResponsiveValue,
  useViewportSize,
  useTouchGestures,
  type ScreenSize,
  type ResponsiveConfig,
} from '../responsive';

// Mock window and document for testing
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  matchMedia: vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
};

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.innerWidth,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockWindow.innerHeight,
});

Object.defineProperty(window, 'addEventListener', {
  value: mockWindow.addEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockWindow.removeEventListener,
});

describe('Responsive Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.innerWidth = 1024;
    mockWindow.innerHeight = 768;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BREAKPOINTS', () => {
    it('should have correct breakpoint values', () => {
      expect(BREAKPOINTS.mobile).toBe(640);
      expect(BREAKPOINTS.tablet).toBe(768);
      expect(BREAKPOINTS.desktop).toBe(1024);
      expect(BREAKPOINTS.largeDesktop).toBe(1280);
    });
  });

  describe('getResponsiveValue', () => {
    it('should return mobile value for mobile screen', () => {
      const config: ResponsiveConfig<string> = {
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value',
        largeDesktop: 'largedesktop-value',
      };

      const result = getResponsiveValue(config, 'mobile');
      expect(result).toBe('mobile-value');
    });

    it('should return tablet value for tablet screen when available', () => {
      const config: ResponsiveConfig<string> = {
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value',
      };

      const result = getResponsiveValue(config, 'tablet');
      expect(result).toBe('tablet-value');
    });

    it('should return desktop value for desktop screen when available', () => {
      const config: ResponsiveConfig<string> = {
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value',
      };

      const result = getResponsiveValue(config, 'desktop');
      expect(result).toBe('desktop-value');
    });

    it('should return largeDesktop value for largeDesktop screen when available', () => {
      const config: ResponsiveConfig<string> = {
        mobile: 'mobile-value',
        desktop: 'desktop-value',
        largeDesktop: 'largedesktop-value',
      };

      const result = getResponsiveValue(config, 'largeDesktop');
      expect(result).toBe('largedesktop-value');
    });

    it('should fallback to mobile value when specific value not available', () => {
      const config: ResponsiveConfig<string> = {
        mobile: 'mobile-value',
      };

      expect(getResponsiveValue(config, 'tablet')).toBe('mobile-value');
      expect(getResponsiveValue(config, 'desktop')).toBe('mobile-value');
      expect(getResponsiveValue(config, 'largeDesktop')).toBe('mobile-value');
    });

    it('should cascade values correctly', () => {
      const config: ResponsiveConfig<number> = {
        mobile: 100,
        tablet: 200,
      };

      // Desktop should get tablet value since desktop not specified
      expect(getResponsiveValue(config, 'desktop')).toBe(200);
      expect(getResponsiveValue(config, 'largeDesktop')).toBe(200);
    });
  });

  describe('getResponsiveClasses', () => {
    it('should return mobile classes for mobile screen size', () => {
      const classes = getResponsiveClasses('mobile');

      expect(classes.container).toContain('flex-col');
      expect(classes.container).toContain('p-2');
      expect(classes.cameraSection).toContain('w-full');
      expect(classes.controlsSection).toContain('flex-col');
    });

    it('should return tablet classes for tablet screen size', () => {
      const classes = getResponsiveClasses('tablet');

      expect(classes.container).toContain('lg:flex-row');
      expect(classes.container).toContain('p-4');
      expect(classes.cameraSection).toContain('lg:w-2/3');
    });

    it('should return desktop classes for desktop screen size', () => {
      const classes = getResponsiveClasses('desktop');

      expect(classes.container).toContain('lg:flex-row');
      expect(classes.container).toContain('lg:p-6');
      expect(classes.cameraSection).toContain('w-2/3');
      expect(classes.sidebarSection).toContain('w-1/3');
    });

    it('should handle camera grid classes correctly', () => {
      const mobileClasses = getResponsiveClasses('mobile');
      const tabletClasses = getResponsiveClasses('tablet');
      const desktopClasses = getResponsiveClasses('desktop');

      expect(mobileClasses.cameraGrid).toContain('grid-cols-1');
      expect(tabletClasses.cameraGrid).toContain('sm:grid-cols-2');
      expect(desktopClasses.cameraGrid).toContain('sm:grid-cols-2');
    });
  });

  describe('useViewportSize', () => {
    it('should return initial viewport size', () => {
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
      expect(result.current.screenSize).toBe('desktop');
    });

    it('should determine correct screen size based on width', () => {
      // Test mobile
      mockWindow.innerWidth = 500;
      const { result: mobileResult } = renderHook(() => useViewportSize());
      expect(mobileResult.current.screenSize).toBe('mobile');

      // Test tablet
      mockWindow.innerWidth = 800;
      const { result: tabletResult } = renderHook(() => useViewportSize());
      expect(tabletResult.current.screenSize).toBe('tablet');

      // Test desktop
      mockWindow.innerWidth = 1200;
      const { result: desktopResult } = renderHook(() => useViewportSize());
      expect(desktopResult.current.screenSize).toBe('desktop');
    });

    it('should set up resize event listener', () => {
      renderHook(() => useViewportSize());
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should clean up resize event listener on unmount', () => {
      const { unmount } = renderHook(() => useViewportSize());
      unmount();
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('useTouchGestures', () => {
    let handlers: any;

    beforeEach(() => {
      handlers = {
        onSwipeLeft: vi.fn(),
        onSwipeRight: vi.fn(),
        onSwipeUp: vi.fn(),
        onSwipeDown: vi.fn(),
        onDoubleTap: vi.fn(),
        onPinchZoom: vi.fn(),
      };
    });

    it('should return touch event handlers', () => {
      const { result } = renderHook(() => useTouchGestures(handlers));

      expect(result.current.onTouchStart).toBeTypeOf('function');
      expect(result.current.onTouchEnd).toBeTypeOf('function');
    });

    it('should detect horizontal swipes', () => {
      const { result } = renderHook(() => useTouchGestures(handlers));

      // Simulate touch start
      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      // Simulate swipe right
      const touchEndEvent = {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      } as unknown as React.TouchEvent;

      // Mock Date.now to ensure consistent timing
      const mockNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow + 100);

      act(() => {
        result.current.onTouchEnd(touchEndEvent);
      });

      expect(handlers.onSwipeRight).toHaveBeenCalled();
    });

    it('should detect vertical swipes', () => {
      const { result } = renderHook(() => useTouchGestures(handlers));

      // Simulate touch start
      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      // Simulate swipe down
      const touchEndEvent = {
        changedTouches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      // Mock Date.now to ensure swipe is detected
      const mockNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow + 100);

      act(() => {
        result.current.onTouchEnd(touchEndEvent);
      });

      expect(handlers.onSwipeDown).toHaveBeenCalled();
    });

    it('should not trigger swipe for slow movements', () => {
      const { result } = renderHook(() => useTouchGestures(handlers));

      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      const touchEndEvent = {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      } as unknown as React.TouchEvent;

      // Mock Date.now to simulate slow movement (>500ms)
      const mockNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow + 600);

      act(() => {
        result.current.onTouchEnd(touchEndEvent);
      });

      expect(handlers.onSwipeRight).not.toHaveBeenCalled();
    });

    it('should not trigger swipe for small movements', () => {
      const { result } = renderHook(() => useTouchGestures(handlers));

      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      // Small movement (less than 50px)
      const touchEndEvent = {
        changedTouches: [{ clientX: 120, clientY: 100 }],
      } as unknown as React.TouchEvent;

      const mockNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow + 100);

      act(() => {
        result.current.onTouchEnd(touchEndEvent);
      });

      expect(handlers.onSwipeRight).not.toHaveBeenCalled();
    });
  });
});