// UI State Management - User Interface State
// src/stores/uiStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  UIState,
  CameraDisplayConfig,
  MapDisplayConfig,
  ViewMode,
  FilterConfig,
  BackendCameraId,
} from '../types/ui';
import { dataCacheService } from '../services/dataCacheService';
import { statePersistenceService } from '../services/statePersistenceService';
import { dataValidationService, createSchema } from '../services/dataValidationService';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

// ============================================================================
// UI Store Interface
// ============================================================================

interface UIStoreState extends UIState {
  actions: {
    // View management
    setViewMode: (mode: ViewMode) => void;
    toggleFullscreen: (cameraId?: BackendCameraId) => void;

    // Camera display configuration
    updateCameraConfig: (cameraId: BackendCameraId, config: Partial<CameraDisplayConfig>) => void;
    resetCameraConfig: (cameraId?: BackendCameraId) => void;
    ensureCameraConfigs: (cameraIds: BackendCameraId[]) => void;

    // Map configuration
    updateMapConfig: (config: Partial<MapDisplayConfig>) => void;
    resetMapConfig: () => void;

    // Filter management
    updateFilters: (filters: Partial<FilterConfig>) => void;
    resetFilters: () => void;

    // Panel management
    togglePanel: (panelId: string) => void;
    setPanelVisible: (panelId: string, visible: boolean) => void;

    // Modal management
    openModal: (modalId: string, data?: any) => void;
    closeModal: (modalId?: string) => void;

    // Layout management
    setSidebarWidth: (width: number) => void;
    setGridLayout: (layout: 'grid' | 'list' | 'focus') => void;

    // User preferences
    setTheme: (theme: 'light' | 'dark' | 'auto') => void;
    setLanguage: (language: string) => void;
    toggleCompactMode: () => void;

    // Performance settings
    setFrameRate: (fps: number) => void;
    setQuality: (quality: 'low' | 'medium' | 'high') => void;
    enableHighPerformanceMode: (enabled: boolean) => void;

    // Accessibility
    setHighContrast: (enabled: boolean) => void;
    setReducedMotion: (enabled: boolean) => void;
    setFontSize: (size: 'small' | 'medium' | 'large') => void;

    // Reset
    reset: () => void;
  };
}

// ============================================================================
// Default Configurations
// ============================================================================

const createDefaultCameraConfig = (): CameraDisplayConfig => ({
  isVisible: true,
  showBoundingBoxes: true,
  showPersonIds: true,
  showConfidence: true,
  boundingBoxColor: '#FF6B6B',
  boundingBoxThickness: 2,
  opacity: 1,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  showGrid: false,
  gridColor: '#FFFFFF',
  gridOpacity: 0.3,
  zoom: 1,
  panX: 0,
  panY: 0,
});

const createDefaultMapConfig = (): MapDisplayConfig => ({
  isVisible: true,
  showTrajectories: true,
  showHeatmap: false,
  showZones: true,
  trajectoryColor: '#4ECDC4',
  trajectoryThickness: 2,
  trajectoryOpacity: 0.8,
  heatmapOpacity: 0.6,
  zoneOpacity: 0.3,
  zoom: 15,
  center: [0, 0],
  mapStyle: 'streets',
});

const createDefaultFilters = (): FilterConfig => ({
  confidenceThreshold: 0.3,
  showLowConfidence: true,
  personIdFilter: [],
  cameraFilter: [],
  timeRangeStart: undefined,
  timeRangeEnd: undefined,
  minTrajectoryLength: 0,
  maxTrajectoryLength: undefined,
});

// ============================================================================
// Initial State
// ============================================================================

const initialState: Omit<UIStoreState, 'actions'> = {
  // View configuration
  viewMode: 'dashboard',
  isFullscreen: false,
  fullscreenCameraId: undefined,

  // Camera configurations
  cameras: {
    c09: createDefaultCameraConfig(),
    c12: createDefaultCameraConfig(),
    c13: createDefaultCameraConfig(),
    c16: createDefaultCameraConfig(),
    c01: createDefaultCameraConfig(),
    c02: createDefaultCameraConfig(),
    c03: createDefaultCameraConfig(),
    c05: createDefaultCameraConfig(),
  },

  // Map configuration
  map: createDefaultMapConfig(),

  // Filter configuration
  filters: createDefaultFilters(),

  // Panel states
  panels: {
    'camera-controls': { isVisible: true, isCollapsed: false },
    'person-list': { isVisible: true, isCollapsed: false },
    'trajectory-panel': { isVisible: true, isCollapsed: false },
    'statistics-panel': { isVisible: true, isCollapsed: false },
    'filter-panel': { isVisible: false, isCollapsed: false },
    'settings-panel': { isVisible: false, isCollapsed: false },
  },

  // Modal states
  modals: {},

  // Layout configuration
  layout: {
    sidebarWidth: 300,
    gridLayout: 'grid',
    compactMode: false,
  },

  // User preferences
  preferences: {
    theme: 'light',
    language: 'en',
    frameRate: 30,
    quality: 'high',
    highPerformanceMode: false,
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
  },
};

// ============================================================================
// UI Store Implementation
// ============================================================================

export const useUIStore = create<UIStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        actions: {
          // ================================================================
          // View Management
          // ================================================================

          setViewMode: (mode: ViewMode) => {
            set({ viewMode: mode }, false, 'setViewMode');
          },

          toggleFullscreen: (cameraId?: BackendCameraId) => {
            set(
              (state) => {
                if (state.isFullscreen && state.fullscreenCameraId === cameraId) {
                  // Exit fullscreen
                  return {
                    isFullscreen: false,
                    fullscreenCameraId: undefined,
                  };
                } else {
                  // Enter fullscreen
                  return {
                    isFullscreen: true,
                    fullscreenCameraId: cameraId,
                  };
                }
              },
              false,
              'toggleFullscreen'
            );
          },

          // ================================================================
          // Camera Display Configuration
          // ================================================================

          updateCameraConfig: async (
            cameraId: BackendCameraId,
            config: Partial<CameraDisplayConfig>
          ) => {
            // Monitor camera config update performance
            await performanceMonitoringService.timeFunction(
              'user-interaction',
              'update-camera-config',
              async () => {
                // Validate camera ID
                const cameraIdValidation = dataValidationService.validateCameraId(cameraId);
                if (!cameraIdValidation.isValid) {
                  console.error('Invalid camera ID for config update:', cameraId);
                  return;
                }

                // Validate and sanitize camera configuration
                const configSchema = createSchema('object', {
                  properties: {
                    isVisible: { type: 'boolean' },
                    showBoundingBoxes: { type: 'boolean' },
                    showPersonIds: { type: 'boolean' },
                    showConfidence: { type: 'boolean' },
                    boundingBoxColor: { type: 'string', pattern: /^#[0-9A-F]{6}$/i },
                    boundingBoxThickness: { type: 'number', min: 1, max: 10 },
                    opacity: { type: 'number', min: 0, max: 1 },
                    brightness: { type: 'number', min: 0, max: 2 },
                    contrast: { type: 'number', min: 0, max: 2 },
                    saturation: { type: 'number', min: 0, max: 2 },
                    zoom: { type: 'number', min: 0.1, max: 10 },
                    panX: { type: 'number' },
                    panY: { type: 'number' },
                  },
                });

                const configValidation = dataValidationService.validateAndSanitize(
                  config,
                  configSchema
                );
                if (!configValidation.isValid) {
                  console.error('Camera config validation failed:', configValidation.errors);
                  return;
                }

                const updatedConfig = {
                  ...get().cameras[cameraId],
                  ...configValidation.sanitized,
                };

                set(
                  (state) => ({
                    cameras: {
                      ...state.cameras,
                      [cameraId]: updatedConfig,
                    },
                  }),
                  false,
                  'updateCameraConfig'
                );

                // Monitor cache operation performance
                await performanceMonitoringService.timeFunction(
                  'cache',
                  'cache-camera-config',
                  () =>
                    dataCacheService.set(`camera-config-${cameraId}`, updatedConfig, {
                      priority: 2,
                      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
                      tags: ['camera-config', `camera-${cameraId}`, 'validated'],
                    }),
                  { cameraId, configSize: JSON.stringify(updatedConfig).length }
                );
              },
              { cameraId, configKeys: Object.keys(config).length }
            );
          },

          resetCameraConfig: (cameraId?: BackendCameraId) => {
            if (cameraId) {
              // Reset specific camera
              set(
                (state) => ({
                  cameras: {
                    ...state.cameras,
                    [cameraId]: createDefaultCameraConfig(),
                  },
                }),
                false,
                'resetCameraConfig:single'
              );
            } else {
              // Reset all cameras
              set(
                {
                  cameras: {
                    c09: createDefaultCameraConfig(),
                    c12: createDefaultCameraConfig(),
                    c13: createDefaultCameraConfig(),
                    c16: createDefaultCameraConfig(),
                    c01: createDefaultCameraConfig(),
                    c02: createDefaultCameraConfig(),
                    c03: createDefaultCameraConfig(),
                    c05: createDefaultCameraConfig(),
                  },
                },
                false,
                'resetCameraConfig:all'
              );
            }
          },

          ensureCameraConfigs: (cameraIds: BackendCameraId[]) => {
            set(
              (state) => {
                if (!cameraIds.length) {
                  return {};
                }

                const additions: Partial<Record<BackendCameraId, CameraDisplayConfig>> = {};

                cameraIds.forEach((cameraId) => {
                  if (!state.cameras[cameraId]) {
                    additions[cameraId] = createDefaultCameraConfig();
                  }
                });

                if (Object.keys(additions).length === 0) {
                  return {};
                }

                return {
                  cameras: {
                    ...state.cameras,
                    ...additions,
                  },
                };
              },
              false,
              'ensureCameraConfigs'
            );
          },

          // ================================================================
          // Map Configuration
          // ================================================================

          updateMapConfig: async (config: Partial<MapDisplayConfig>) => {
            const updatedConfig = {
              ...get().map,
              ...config,
            };

            set(
              (state) => ({
                map: updatedConfig,
              }),
              false,
              'updateMapConfig'
            );

            // Cache map configuration
            await dataCacheService.set('map-config', updatedConfig, {
              priority: 2,
              ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
              tags: ['map-config', 'preferences'],
            });
          },

          resetMapConfig: () => {
            set({ map: createDefaultMapConfig() }, false, 'resetMapConfig');
          },

          // ================================================================
          // Filter Management
          // ================================================================

          updateFilters: async (filters: Partial<FilterConfig>) => {
            // Validate and sanitize filter configuration
            const filtersSchema = createSchema('object', {
              properties: {
                confidenceThreshold: { type: 'number', min: 0, max: 1 },
                showLowConfidence: { type: 'boolean' },
                personIdFilter: { type: 'array', items: { type: 'string' } },
                cameraFilter: { type: 'array', items: { type: 'string' } },
                timeRangeStart: { type: 'string' },
                timeRangeEnd: { type: 'string' },
                minTrajectoryLength: { type: 'number', min: 0 },
                maxTrajectoryLength: { type: 'number', min: 0 },
              },
            });

            const filtersValidation = dataValidationService.validateAndSanitize(
              filters,
              filtersSchema
            );
            if (!filtersValidation.isValid) {
              console.error('Filter configuration validation failed:', filtersValidation.errors);
              return;
            }

            const updatedFilters = {
              ...get().filters,
              ...filtersValidation.sanitized,
            };

            set(
              (state) => ({
                filters: updatedFilters,
              }),
              false,
              'updateFilters'
            );

            // Cache validated filter configuration
            await dataCacheService.set('filter-config', updatedFilters, {
              priority: 2,
              ttl: 24 * 60 * 60 * 1000, // 24 hours
              tags: ['filter-config', 'preferences', 'validated'],
            });
          },

          resetFilters: () => {
            set({ filters: createDefaultFilters() }, false, 'resetFilters');
          },

          // ================================================================
          // Panel Management
          // ================================================================

          togglePanel: (panelId: string) => {
            set(
              (state) => ({
                panels: {
                  ...state.panels,
                  [panelId]: {
                    ...state.panels[panelId],
                    isVisible: !state.panels[panelId]?.isVisible,
                  },
                },
              }),
              false,
              'togglePanel'
            );
          },

          setPanelVisible: (panelId: string, visible: boolean) => {
            set(
              (state) => ({
                panels: {
                  ...state.panels,
                  [panelId]: {
                    ...state.panels[panelId],
                    isVisible: visible,
                  },
                },
              }),
              false,
              'setPanelVisible'
            );
          },

          // ================================================================
          // Modal Management
          // ================================================================

          openModal: (modalId: string, data?: any) => {
            set(
              (state) => ({
                modals: {
                  ...state.modals,
                  [modalId]: {
                    isOpen: true,
                    data,
                  },
                },
              }),
              false,
              'openModal'
            );
          },

          closeModal: (modalId?: string) => {
            if (modalId) {
              // Close specific modal
              set(
                (state) => ({
                  modals: {
                    ...state.modals,
                    [modalId]: {
                      ...state.modals[modalId],
                      isOpen: false,
                    },
                  },
                }),
                false,
                'closeModal:single'
              );
            } else {
              // Close all modals
              set(
                (state) => {
                  const updatedModals = { ...state.modals };
                  Object.keys(updatedModals).forEach((key) => {
                    updatedModals[key].isOpen = false;
                  });
                  return { modals: updatedModals };
                },
                false,
                'closeModal:all'
              );
            }
          },

          // ================================================================
          // Layout Management
          // ================================================================

          setSidebarWidth: (width: number) => {
            set(
              (state) => ({
                layout: {
                  ...state.layout,
                  sidebarWidth: Math.max(200, Math.min(600, width)),
                },
              }),
              false,
              'setSidebarWidth'
            );
          },

          setGridLayout: (layout: 'grid' | 'list' | 'focus') => {
            set(
              (state) => ({
                layout: {
                  ...state.layout,
                  gridLayout: layout,
                },
              }),
              false,
              'setGridLayout'
            );
          },

          // ================================================================
          // User Preferences
          // ================================================================

          setTheme: async (theme: 'light' | 'dark' | 'auto') => {
            // Monitor theme change performance
            const previousTheme = get().preferences.theme;
            await performanceMonitoringService.timeFunction(
              'user-interaction',
              'set-theme',
              async () => {
                const updatedPreferences = {
                  ...get().preferences,
                  theme,
                };

                set(
                  (state) => ({
                    preferences: updatedPreferences,
                  }),
                  false,
                  'setTheme'
                );

                // Monitor cache operation performance
                await performanceMonitoringService.timeFunction(
                  'cache',
                  'cache-theme-preference',
                  () =>
                    dataCacheService.set('theme-preference', theme, {
                      priority: 4, // Critical for user experience
                      ttl: 365 * 24 * 60 * 60 * 1000, // 1 year
                      tags: ['theme', 'preferences'],
                    })
                );

                // Monitor DOM operation performance
                const domStartTime = performance.now();

                // Apply theme immediately to document
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  // Auto theme - respect system preference
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.classList.toggle('dark', isDark);
                }

                // Record DOM update performance
                performanceMonitoringService.recordRenderMetric({
                  componentName: 'ThemeProvider',
                  renderDuration: performance.now() - domStartTime,
                  updateType: 'update',
                  propsChanged: false,
                  stateChanged: true,
                });
              },
              { theme, previousTheme, themeChanged: theme !== previousTheme }
            );
          },

          setLanguage: (language: string) => {
            set(
              (state) => ({
                preferences: {
                  ...state.preferences,
                  language,
                },
              }),
              false,
              'setLanguage'
            );
          },

          toggleCompactMode: () => {
            set(
              (state) => ({
                layout: {
                  ...state.layout,
                  compactMode: !state.layout.compactMode,
                },
              }),
              false,
              'toggleCompactMode'
            );
          },

          // ================================================================
          // Performance Settings
          // ================================================================

          setFrameRate: async (fps: number) => {
            // Validate frame rate input
            if (typeof fps !== 'number' || !isFinite(fps)) {
              console.error('Invalid frame rate:', fps);
              return;
            }

            const validatedFps = Math.max(1, Math.min(60, Math.floor(fps)));

            if (validatedFps !== fps) {
              console.warn(`Frame rate adjusted from ${fps} to ${validatedFps}`);
            }

            const updatedPreferences = {
              ...get().preferences,
              frameRate: validatedFps,
            };

            set(
              (state) => ({
                preferences: updatedPreferences,
              }),
              false,
              'setFrameRate'
            );

            // Cache validated performance preferences
            await dataCacheService.set(
              'performance-preferences',
              {
                frameRate: validatedFps,
                quality: updatedPreferences.quality,
                highPerformanceMode: updatedPreferences.highPerformanceMode,
              },
              {
                priority: 2,
                ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
                tags: ['performance', 'preferences', 'validated'],
              }
            );
          },

          setQuality: (quality: 'low' | 'medium' | 'high') => {
            set(
              (state) => ({
                preferences: {
                  ...state.preferences,
                  quality,
                },
              }),
              false,
              'setQuality'
            );
          },

          enableHighPerformanceMode: async (enabled: boolean) => {
            const updatedPreferences = {
              ...get().preferences,
              highPerformanceMode: enabled,
            };

            set(
              (state) => ({
                preferences: updatedPreferences,
              }),
              false,
              'enableHighPerformanceMode'
            );

            // Cache performance preference
            await dataCacheService.set(
              'performance-preferences',
              {
                highPerformanceMode: enabled,
                frameRate: updatedPreferences.frameRate,
                quality: updatedPreferences.quality,
              },
              {
                priority: 3,
                ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
                tags: ['performance', 'preferences'],
              }
            );
          },

          // ================================================================
          // Accessibility
          // ================================================================

          setHighContrast: (enabled: boolean) => {
            set(
              (state) => ({
                preferences: {
                  ...state.preferences,
                  highContrast: enabled,
                },
              }),
              false,
              'setHighContrast'
            );
          },

          setReducedMotion: (enabled: boolean) => {
            set(
              (state) => ({
                preferences: {
                  ...state.preferences,
                  reducedMotion: enabled,
                },
              }),
              false,
              'setReducedMotion'
            );
          },

          setFontSize: (size: 'small' | 'medium' | 'large') => {
            set(
              (state) => ({
                preferences: {
                  ...state.preferences,
                  fontSize: size,
                },
              }),
              false,
              'setFontSize'
            );
          },

          // ================================================================
          // Reset
          // ================================================================

          reset: async () => {
            set({ ...initialState }, false, 'reset');

            // Clear UI-related cache
            await dataCacheService.deleteByTag('camera-config');
            await dataCacheService.deleteByTag('map-config');
            await dataCacheService.deleteByTag('filter-config');
            await dataCacheService.deleteByTag('theme');
            await dataCacheService.deleteByTag('performance');
            await dataCacheService.deleteByTag('preferences');
          },
        },
      }),
      {
        name: 'spoton-ui-store',
        // Persist user preferences and panel states
        partialize: (state) => ({
          panels: state.panels,
          layout: state.layout,
          preferences: state.preferences,
          filters: state.filters,
          map: state.map,
          cameras: state.cameras,
          viewMode: state.viewMode,
        }),
        // Merge persisted state with initial state
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...persistedState,
        }),
        version: 2,
        // Custom storage implementation using our enhanced service
        storage: {
          getItem: async (name: string): Promise<string | null> => {
            return statePersistenceService
              .loadState(name)
              .then((data) => (data ? JSON.stringify(data) : null))
              .catch(() => null);
          },
          setItem: async (name: string, value: string): Promise<void> => {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            let parsedValue: any;
            try {
              parsedValue = JSON.parse(serializedValue);
            } catch (error) {
              console.warn('⚠️ Failed to parse persisted UI store value, storing raw string', { name, value });
              parsedValue = serializedValue;
            }
            return statePersistenceService.saveState(name, parsedValue, {
              version: 2,
              compression: true,
              ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
            });
          },
          removeItem: async (name: string): Promise<void> => {
            return statePersistenceService.removeState(name);
          },
        },
        migrate: (persistedState: any, version: number) => {
          if (version < 2) {
            // Migration from v1 to v2: add viewMode persistence
            return {
              ...persistedState,
              viewMode: persistedState.viewMode || 'dashboard',
            };
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'UIStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// Selectors and Hooks
// ============================================================================

/**
 * Get UI actions
 */
export const useUIActions = () => useUIStore((state) => state.actions);

/**
 * Get view configuration
 */
export const useViewConfig = () =>
  useUIStore((state) => ({
    viewMode: state.viewMode,
    isFullscreen: state.isFullscreen,
    fullscreenCameraId: state.fullscreenCameraId,
  }));

/**
 * Get camera display configuration
 */
export const useCameraDisplayConfig = () => useUIStore((state) => state.cameras);

/**
 * Get specific camera configuration
 */
export const useCameraConfigById = (cameraId: BackendCameraId) =>
  useUIStore((state) => state.cameras[cameraId]);

/**
 * Get map configuration
 */
export const useMapConfig = () => useUIStore((state) => state.map);

/**
 * Get filter configuration
 */
export const useFilters = () => useUIStore((state) => state.filters);

/**
 * Get panel states
 */
export const usePanels = () => useUIStore((state) => state.panels);

/**
 * Get specific panel state
 */
export const usePanelState = (panelId: string) => useUIStore((state) => state.panels[panelId]);

/**
 * Get modal states
 */
export const useModals = () => useUIStore((state) => state.modals);

/**
 * Get specific modal state
 */
export const useModalState = (modalId: string) => useUIStore((state) => state.modals[modalId]);

/**
 * Get layout configuration
 */
export const useLayout = () => useUIStore((state) => state.layout);

/**
 * Get user preferences
 */
export const usePreferences = () => useUIStore((state) => state.preferences);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if any modal is open
 */
export function useIsAnyModalOpen(): boolean {
  return useUIStore((state) => Object.values(state.modals).some((modal) => modal.isOpen));
}

/**
 * Check if specific modal is open
 */
export function useIsModalOpen(modalId: string): boolean {
  return useUIStore((state) => state.modals[modalId]?.isOpen || false);
}

/**
 * Get visible cameras count
 */
export function useVisibleCamerasCount(): number {
  return useUIStore(
    (state) => Object.values(state.cameras).filter((camera) => camera.isVisible).length
  );
}

/**
 * Check if in high performance mode
 */
export function useIsHighPerformanceMode(): boolean {
  return useUIStore((state) => state.preferences.highPerformanceMode);
}

/**
 * Get current theme
 */
export function useCurrentTheme(): 'light' | 'dark' | 'auto' {
  return useUIStore((state) => state.preferences.theme);
}

/**
 * Check if compact mode is enabled
 */
export function useIsCompactMode(): boolean {
  return useUIStore((state) => state.layout.compactMode);
}

// ============================================================================
// Dev Tools and Debugging
// ============================================================================

/**
 * Get store state for debugging
 */
export function getUIStoreState() {
  return useUIStore.getState();
}

/**
 * Subscribe to store changes
 */
export function subscribeToUIStore(callback: (state: UIStoreState) => void) {
  return useUIStore.subscribe(callback);
}

// ============================================================================
// Store Initialization
// ============================================================================

/**
 * Initialize UI store with enhanced system integration
 */
export async function initializeUIStore() {
  const { actions } = useUIStore.getState();

  try {
    // Try to restore cached configurations
    const cachedTheme = await dataCacheService.get('theme-preference');
    const cachedPerformance = await dataCacheService.get('performance-preferences');
    const cachedFilters = await dataCacheService.get('filter-config');
    const cachedMapConfig = await dataCacheService.get('map-config');

    // Restore theme preference or detect system preference
    if (cachedTheme) {
      await actions.setTheme(cachedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      await actions.setTheme('dark');
    }

    // Restore performance preferences
    if (cachedPerformance) {
      await actions.enableHighPerformanceMode(cachedPerformance.highPerformanceMode || false);
      if (cachedPerformance.frameRate) {
        actions.setFrameRate(cachedPerformance.frameRate);
      }
      if (cachedPerformance.quality) {
        actions.setQuality(cachedPerformance.quality);
      }
    }

    // Restore filter configuration
    if (cachedFilters) {
      await actions.updateFilters(cachedFilters);
    }

    // Restore map configuration
    if (cachedMapConfig) {
      await actions.updateMapConfig(cachedMapConfig);
    }

    // Restore individual camera configurations
    const cameraIds: BackendCameraId[] = ['c09', 'c12', 'c13', 'c16', 'c01', 'c02', 'c03', 'c05'];
    for (const cameraId of cameraIds) {
      try {
        const cachedCameraConfig = await dataCacheService.get(`camera-config-${cameraId}`);
        if (cachedCameraConfig) {
          await actions.updateCameraConfig(cameraId, cachedCameraConfig);
        }
      } catch (error) {
        console.warn(`Failed to restore camera config for ${cameraId}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to restore cached UI state:', error);
  }

  // Detect system accessibility preferences
  if (window.matchMedia) {
    // Detect system motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      actions.setReducedMotion(true);
    }

    // Detect system high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      actions.setHighContrast(true);
    }

    // Set up theme change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
      const currentTheme = useUIStore.getState().preferences.theme;
      if (currentTheme === 'auto') {
        console.log('System theme changed:', e.matches ? 'dark' : 'light');
        // Apply theme change immediately
        document.documentElement.classList.toggle('dark', e.matches);
      }
    });

    // Set up reduced motion listener
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      actions.setReducedMotion(e.matches);
    });

    // Set up high contrast listener
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      actions.setHighContrast(e.matches);
    });
  }

  // Set up periodic UI preference backup
  setInterval(
    async () => {
      try {
        const state = useUIStore.getState();

        // Backup complete UI state for disaster recovery
        await dataCacheService.set(
          'ui-state-backup',
          {
            panels: state.panels,
            layout: state.layout,
            preferences: state.preferences,
            timestamp: Date.now(),
          },
          {
            priority: 1, // Low priority backup
            ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
            tags: ['backup', 'ui-state'],
          }
        );
      } catch (error) {
        console.warn('UI state backup failed:', error);
      }
    },
    60 * 60 * 1000
  ); // Every hour
}

// Export store for direct access if needed
export default useUIStore;
