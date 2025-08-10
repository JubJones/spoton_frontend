// src/utils/responsive.ts
export interface ViewportBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

export const BREAKPOINTS: ViewportBreakpoints = {
  mobile: 640, // sm:
  tablet: 768, // md:
  desktop: 1024, // lg:
  largeDesktop: 1280, // xl:
};

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

export interface ResponsiveConfig<T = any> {
  mobile: T;
  tablet?: T;
  desktop?: T;
  largeDesktop?: T;
}

export interface DefaultResponsiveConfig {
  mobile: {
    cameraGrid: '1x1' | '2x1';
    mapHeight: string;
    sidebarPosition: 'bottom' | 'right';
    showDetails: boolean;
  };
  tablet: {
    cameraGrid: '2x2' | '1x4';
    mapHeight: string;
    sidebarPosition: 'right' | 'bottom';
    showDetails: boolean;
  };
  desktop: {
    cameraGrid: '2x2' | '1x4' | 'focus';
    mapHeight: string;
    sidebarPosition: 'right';
    showDetails: boolean;
  };
}

export const RESPONSIVE_CONFIG: DefaultResponsiveConfig = {
  mobile: {
    cameraGrid: '1x1',
    mapHeight: '200px',
    sidebarPosition: 'bottom',
    showDetails: false,
  },
  tablet: {
    cameraGrid: '2x2',
    mapHeight: '300px',
    sidebarPosition: 'right',
    showDetails: true,
  },
  desktop: {
    cameraGrid: '2x2',
    mapHeight: '400px',
    sidebarPosition: 'right',
    showDetails: true,
  },
};

export function useViewportSize(): { width: number; height: number; screenSize: ScreenSize } {
  const [viewport, setViewport] = React.useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  React.useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const screenSize = React.useMemo((): ScreenSize => {
    if (viewport.width < BREAKPOINTS.mobile) return 'mobile';
    if (viewport.width < BREAKPOINTS.tablet) return 'mobile';
    if (viewport.width < BREAKPOINTS.desktop) return 'tablet';
    return 'desktop';
  }, [viewport.width]);

  return { ...viewport, screenSize };
}

export function getResponsiveClasses(screenSize: ScreenSize) {
  const config = RESPONSIVE_CONFIG[screenSize as keyof DefaultResponsiveConfig] || RESPONSIVE_CONFIG.mobile;

  return {
    container:
      screenSize === 'mobile'
        ? 'flex flex-col p-2 gap-2'
        : 'flex flex-col lg:flex-row p-4 lg:p-6 gap-4',

    cameraSection:
      screenSize === 'mobile'
        ? 'w-full order-1'
        : screenSize === 'tablet'
          ? 'w-full lg:w-2/3 order-1'
          : 'w-2/3 order-1',

    sidebarSection:
      screenSize === 'mobile'
        ? 'w-full order-2'
        : screenSize === 'tablet'
          ? 'w-full lg:w-1/3 order-2'
          : 'w-1/3 order-2',

    cameraGrid: getCameraGridClasses(config.cameraGrid, screenSize),

    controlsSection:
      screenSize === 'mobile'
        ? 'flex flex-col gap-2 mb-2'
        : 'flex flex-row justify-between items-center mb-4',

    headerSection:
      screenSize === 'mobile'
        ? 'flex flex-col gap-2 text-center'
        : 'flex flex-row justify-between items-center',
  };
}

function getCameraGridClasses(gridType: string, screenSize: ScreenSize): string {
  const baseClasses = 'w-full h-full';

  switch (gridType) {
    case '1x1':
      return `${baseClasses} grid grid-cols-1 gap-2`;
    case '2x1':
      return `${baseClasses} grid grid-cols-1 sm:grid-cols-2 gap-2`;
    case '2x2':
      return `${baseClasses} grid grid-cols-1 sm:grid-cols-2 gap-2`;
    case '1x4':
      return screenSize === 'mobile'
        ? `${baseClasses} grid grid-cols-1 gap-2 max-h-[80vh] overflow-y-auto`
        : `${baseClasses} grid grid-cols-2 lg:grid-cols-4 gap-2`;
    case 'focus':
      return `${baseClasses} flex flex-col gap-2`;
    default:
      return `${baseClasses} grid grid-cols-1 sm:grid-cols-2 gap-2`;
  }
}

// Touch gesture utilities for mobile
export interface TouchGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onDoubleTap?: () => void;
}

export function useTouchGestures(handlers: TouchGestureHandlers) {
  const touchStart = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = React.useRef<number>(0);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  }, []);

  const handleTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current || e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Date.now() - touchStart.current.time;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Swipe detection
      if (deltaTime < 500 && (absX > 50 || absY > 50)) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown();
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp();
          }
        }
      }

      // Double tap detection
      const now = Date.now();
      if (now - lastTap.current < 300 && absX < 20 && absY < 20) {
        if (handlers.onDoubleTap) {
          handlers.onDoubleTap();
        }
      }
      lastTap.current = now;

      touchStart.current = null;
    },
    [handlers]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// React import fix
import React from 'react';

// Generic responsive value getter
export function getResponsiveValue<T>(config: ResponsiveConfig<T>, screenSize: ScreenSize): T {
  if (config.largeDesktop && screenSize === 'largeDesktop') {
    return config.largeDesktop;
  }
  if (config.desktop && (screenSize === 'desktop' || screenSize === 'largeDesktop')) {
    return config.desktop;
  }
  if (config.tablet && (screenSize === 'tablet' || screenSize === 'desktop' || screenSize === 'largeDesktop')) {
    return config.tablet;
  }
  return config.mobile;
}
