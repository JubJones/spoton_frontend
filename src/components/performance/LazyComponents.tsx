// src/components/performance/LazyComponents.tsx
import React, { Suspense } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

// Lazy load major components to enable code splitting
export const LazyAnalyticsPage = React.lazy(() => import('../../pages/AnalyticsPage'));
export const LazySettingsPage = React.lazy(() => import('../../pages/SettingsPage'));
export const LazyTrackingMap = React.lazy(() => import('../TrackingMap'));
export const LazyPersonDetailPanel = React.lazy(() => import('../PersonDetailPanel'));
export const LazyAnalyticsCharts = React.lazy(() => import('../AnalyticsCharts'));
export const LazyTrafficHeatmap = React.lazy(() => import('../TrafficHeatmap'));
export const LazyPersonTrajectory = React.lazy(() => import('../PersonTrajectory'));

// Higher-order component for wrapping lazy components with suspense
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  minHeight = '200px',
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center bg-gray-800 rounded-lg" style={{ minHeight }}>
      <LoadingSpinner size="medium" color="orange" text="Loading component..." />
    </div>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
};

// Preload function for important components
export const preloadComponents = {
  analytics: () => import('../../pages/AnalyticsPage'),
  settings: () => import('../../pages/SettingsPage'),
  trackingMap: () => import('../TrackingMap'),
  personDetail: () => import('../PersonDetailPanel'),
  charts: () => import('../AnalyticsCharts'),
};

// Hook for preloading components on hover or user intent
export function useComponentPreloader() {
  const preloadComponent = React.useCallback((componentKey: keyof typeof preloadComponents) => {
    preloadComponents[componentKey]().catch((error) => {
      console.warn(`Failed to preload component ${componentKey}:`, error);
    });
  }, []);

  return preloadComponent;
}

// Performance monitoring for lazy components
interface ComponentLoadTiming {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

const loadTimings: ComponentLoadTiming[] = [];

export function trackComponentLoad(componentName: string) {
  const timing: ComponentLoadTiming = {
    name: componentName,
    startTime: performance.now(),
  };

  loadTimings.push(timing);

  return () => {
    timing.endTime = performance.now();
    timing.duration = timing.endTime - timing.startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Component ${componentName} loaded in ${timing.duration.toFixed(2)}ms`);
    }
  };
}

// Get performance metrics for lazy loaded components
export function getComponentLoadMetrics() {
  const completedLoads = loadTimings.filter((t) => t.duration !== undefined);

  if (completedLoads.length === 0) {
    return null;
  }

  const durations = completedLoads.map((t) => t.duration!);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  return {
    totalComponents: completedLoads.length,
    averageLoadTime: avgDuration,
    maxLoadTime: maxDuration,
    minLoadTime: minDuration,
    componentDetails: completedLoads.map((t) => ({
      name: t.name,
      duration: t.duration!,
    })),
  };
}
