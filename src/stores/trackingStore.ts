// Tracking State Management - Real-time Tracking Data
// src/stores/trackingStore.ts

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  TrackingState,
  CameraTrackingDisplayData,
  TrackedPersonDisplay,
  PersonTrajectoryData,
  BackendCameraId,
  WebSocketTrackingMessagePayload,
} from '../types/ui';
import { EnvironmentId, WebSocketConnectionState } from '../types/api';
import { trajectoryProcessor, trackingDataUtils } from '../utils/trackingDataProcessor';
import { WebSocketService, createTrackingWebSocket } from '../services/websocketService';
import {
  webSocketManagerService,
  createTrackingConnection,
} from '../services/webSocketManagerService';
import { dataCacheService, frameCacheService } from '../services/dataCacheService';
import { offlineQueueService, queueWebSocketMessage } from '../services/offlineQueueService';
import { statePersistenceService } from '../services/statePersistenceService';
import { dataValidationService } from '../services/dataValidationService';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

// ============================================================================
// Tracking Store Interface
// ============================================================================

interface TrackingStoreState extends TrackingState {
  // WebSocket connection
  wsService?: WebSocketService;
  wsConnectionState: WebSocketConnectionState;

  // Display configuration
  displaySizes: Record<BackendCameraId, { width: number; height: number }>;

  // Actions
  actions: {
    // WebSocket management
    connectWebSocket: (taskId: string) => Promise<void>;
    disconnectWebSocket: () => void;

    // Tracking data updates
    updateTrackingData: (payload: WebSocketTrackingMessagePayload) => void;
    processTrackingUpdate: (payload: WebSocketTrackingMessagePayload) => void;
    clearTrackingData: () => void;
    
    // WebSocket state management
    setWebSocketState: (state: Partial<{ 
      isConnected: boolean;
      lastConnectedAt?: string;
      lastDisconnectedAt?: string;
      lastError?: string;
      connectionAttempts?: number;
    }>) => void;

    // Person management
    selectPerson: (globalPersonId: string | undefined) => void;
    focusPerson: (globalPersonId: string | undefined) => void;
    highlightPerson: (globalPersonId: string | undefined) => void;

    // Camera display management
    setCameraDisplaySize: (
      cameraId: BackendCameraId,
      size: { width: number; height: number }
    ) => void;
    toggleCameraVisibility: (cameraId: BackendCameraId) => void;

    // Trajectory management
    toggleTrajectoryVisibility: (globalPersonId?: string) => void;
    clearTrajectories: () => void;

    // Statistics and analysis
    getPersonStatistics: () => ReturnType<typeof trackingDataUtils.analyze.statistics>;
    findPersonAcrossCameras: (
      globalPersonId: string
    ) => ReturnType<typeof trackingDataUtils.analyze.findPerson>;

    // Display filters
    setConfidenceThreshold: (threshold: number) => void;
    setShowPersonIds: (show: boolean) => void;
    setShowTrajectories: (show: boolean) => void;

    // Reset
    reset: () => void;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: Omit<TrackingStoreState, 'actions'> = {
  // Camera data
  cameras: {},

  // Person tracking
  selectedPersonId: undefined,
  focusedPersonId: undefined,
  highlightedPersonId: undefined,
  personTrajectories: {},

  // Statistics
  totalDetections: 0,
  uniquePersonCount: 0,
  averageConfidence: 0,

  // Display state
  isTrackingActive: false,
  lastUpdateTimestamp: undefined,

  // WebSocket state
  wsConnectionState: 'disconnected' as WebSocketConnectionState,
  displaySizes: {} as Record<BackendCameraId, { width: number; height: number }>,

  // Display configuration
  confidenceThreshold: 0.3,
  showPersonIds: true,
  showTrajectories: true,
};

// ============================================================================
// Tracking Store Implementation
// ============================================================================

export const useTrackingStore = create<TrackingStoreState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      actions: {
        // ================================================================
        // WebSocket Management
        // ================================================================

        connectWebSocket: async (taskId: string) => {
          const state = get();

          // Disconnect existing connection
          if (state.wsService) {
            state.wsService.disconnect();
          }

          try {
            // Use the enhanced WebSocket manager
            const connectionInfo = await createTrackingConnection(taskId);

            // Set up event listeners on the connection
            webSocketManagerService.addEventListener(
              'connection-established',
              ({ connectionId, info }) => {
                if (connectionId === `tracking-${taskId}`) {
                  set({ wsConnectionState: 'connected' }, false, 'ws:connection-established');
                  console.log('Tracking connection established:', info);
                }
              }
            );

            webSocketManagerService.addEventListener(
              'connection-lost',
              ({ connectionId, reason }) => {
                if (connectionId === `tracking-${taskId}`) {
                  set({ wsConnectionState: 'disconnected' }, false, 'ws:connection-lost');
                  console.log('Tracking connection lost:', reason);
                }
              }
            );

            webSocketManagerService.addEventListener(
              'message-received',
              ({ connectionId, message }) => {
                if (connectionId === `tracking-${taskId}` && message.type === 'tracking_update') {
                  // Monitor WebSocket message processing performance
                  performanceMonitoringService.recordWebSocketMetric({
                    messageType: message.type,
                    messageSize: JSON.stringify(message.payload).length,
                    processingDuration: 0, // Will be updated in updateTrackingData
                    connectionId,
                  });

                  get().actions.updateTrackingData(message.payload);
                }
              }
            );

            webSocketManagerService.addEventListener('error', ({ connectionId, error }) => {
              if (connectionId === `tracking-${taskId}`) {
                console.error('Tracking WebSocket error:', error);
                set({ wsConnectionState: 'error' }, false, 'ws:error');
              }
            });

            // Keep reference to the service for compatibility
            const wsService = connectionInfo.service;

            set(
              {
                wsService,
                isTrackingActive: true,
                wsConnectionState: connectionInfo.state,
              },
              false,
              'connectWebSocket'
            );

            // Cache connection info for recovery
            await dataCacheService.set(
              'tracking-connection',
              {
                taskId,
                connectionId: connectionInfo.id,
                connectedAt: Date.now(),
              },
              {
                priority: 4, // Critical priority
                ttl: 2 * 60 * 60 * 1000, // 2 hours
                tags: ['websocket', 'tracking'],
              }
            );
          } catch (error) {
            console.error('Failed to connect tracking WebSocket:', error);
            set({ wsConnectionState: 'error' }, false, 'connectWebSocket:error');

            // Try to restore from cached data if available
            const cachedData = await dataCacheService.get('last-tracking-data');
            if (cachedData) {
              console.log('Using cached tracking data due to connection failure');
              get().actions.updateTrackingData(cachedData);
            }

            throw error;
          }
        },

        disconnectWebSocket: async () => {
          const state = get();

          // Disconnect from WebSocket manager
          const cachedConnection = await dataCacheService.get('tracking-connection');
          if (cachedConnection && cachedConnection.taskId) {
            try {
              await webSocketManagerService.closeConnection(`tracking-${cachedConnection.taskId}`);
            } catch (error) {
              console.warn('Failed to close WebSocket connection:', error);
            }
          }

          if (state.wsService) {
            state.wsService.disconnect();
          }

          set(
            {
              wsService: undefined,
              wsConnectionState: 'disconnected',
              isTrackingActive: false,
            },
            false,
            'disconnectWebSocket'
          );

          // Clear tracking-related cache
          await dataCacheService.deleteByTag('tracking');
        },

        // ================================================================
        // Tracking Data Updates
        // ================================================================

        updateTrackingData: async (payload: WebSocketTrackingMessagePayload) => {
          // Monitor complete tracking data update performance
          await performanceMonitoringService.timeFunction(
            'websocket',
            'update-tracking-data',
            async () => {
              const state = get();
              const payloadSize = JSON.stringify(payload).length;

              try {
                // Monitor data validation performance
                const validationResult = await performanceMonitoringService.timeFunction(
                  'user-interaction',
                  'validate-tracking-data',
                  () => dataValidationService.validateTrackingData(payload),
                  { dataSize: payloadSize }
                );

                if (!validationResult.result.isValid) {
                  console.error('Tracking data validation failed:', validationResult.result.errors);
                  console.warn(
                    'Tracking data validation warnings:',
                    validationResult.result.warnings
                  );

                  // Try to use sanitized version if available
                  if (!validationResult.result.sanitized) {
                    throw new Error('Invalid tracking data received and could not be sanitized');
                  }
                }

                const validatedPayload = validationResult.result.sanitized || payload;

                // Monitor frame data validation performance
                if (validatedPayload.frame_data) {
                  await performanceMonitoringService.timeFunction(
                    'user-interaction',
                    'validate-frame-data',
                    async () => {
                      Object.entries(validatedPayload.frame_data).forEach(
                        ([cameraId, frameData]) => {
                          // Validate camera ID
                          const cameraIdValidation =
                            dataValidationService.validateCameraId(cameraId);
                          if (!cameraIdValidation.isValid) {
                            console.warn(`Invalid camera ID detected: ${cameraId}`);
                            return;
                          }

                          // Validate each track in frame data
                          if (frameData.tracks && Array.isArray(frameData.tracks)) {
                            frameData.tracks = frameData.tracks.filter((track: any) => {
                              const trackValidation =
                                dataValidationService.validatePersonTrack(track);
                              if (!trackValidation.isValid) {
                                console.warn(
                                  `Invalid track data for camera ${cameraId}:`,
                                  trackValidation.errors
                                );
                                return false;
                              }
                              return true;
                            });
                          }
                        }
                      );
                    },
                    { frameCount: Object.keys(validatedPayload.frame_data).length }
                  );
                }

                // Monitor payload processing performance
                const processingResult = await performanceMonitoringService.timeFunction(
                  'render',
                  'process-tracking-payload',
                  () =>
                    trackingDataUtils.process.payload(validatedPayload, state.displaySizes, {
                      confidenceThreshold: state.confidenceThreshold,
                      enablePersonColoring: true,
                      enableTrajectoryTracking: state.showTrajectories,
                      displayScaling: true,
                    }),
                  {
                    frameCount: validatedPayload.frame_data
                      ? Object.keys(validatedPayload.frame_data).length
                      : 0,
                    displaySizes: Object.keys(state.displaySizes).length,
                  }
                );

                const result = processingResult.result;

                // Monitor frame caching performance
                if (validatedPayload.frame_data) {
                  await performanceMonitoringService.timeFunction(
                    'cache',
                    'cache-frame-data',
                    async () => {
                      await Promise.all(
                        Object.entries(validatedPayload.frame_data).map(
                          async ([cameraId, frameData]) => {
                            if (frameData.image_url) {
                              // Sanitize image URL
                              const sanitizedUrl = dataValidationService.sanitizeUserInput(
                                frameData.image_url
                              );

                              // Cache frame image URL with validation
                              await frameCacheService.set(
                                `frame-${cameraId}-${validatedPayload.timestamp_processed_utc}`,
                                {
                                  url: sanitizedUrl,
                                  timestamp: validatedPayload.timestamp_processed_utc,
                                  tracks: frameData.tracks || [],
                                  cameraId: cameraId,
                                },
                                {
                                  priority: 2,
                                  ttl: 10 * 60 * 1000, // 10 minutes
                                  tags: ['frame', `camera-${cameraId}`, 'validated'],
                                }
                              );
                            }
                          }
                        )
                      );
                    },
                    { frameCount: Object.keys(validatedPayload.frame_data).length }
                  );
                }

                // Monitor trajectory updates
                if (state.showTrajectories) {
                  await performanceMonitoringService.timeFunction(
                    'render',
                    'update-trajectories',
                    () => {
                      let trackCount = 0;
                      Object.values(result.processedCameras).forEach((cameraData) => {
                        cameraData.tracks.forEach((track) => {
                          if (track.global_id && track.center && Array.isArray(track.center)) {
                            // Validate trajectory coordinates
                            const centerValidation = track.center.every(
                              (coord) => typeof coord === 'number' && isFinite(coord) && coord >= 0
                            );

                            if (centerValidation) {
                              trajectoryProcessor.updateTrajectory(
                                track.global_id,
                                track.center,
                                track.map_coords,
                                cameraData.cameraId,
                                Math.max(0, Math.min(1, track.confidence || 0)), // Clamp confidence
                                validatedPayload.timestamp_processed_utc
                              );
                              trackCount++;
                            } else {
                              console.warn(
                                `Invalid trajectory coordinates for track ${track.global_id}`
                              );
                            }
                          }
                        });
                      });
                    },
                    { trackCount: 0 } // Will be updated during execution
                  );
                }

                // Monitor trajectory processing
                const trajectoryResult = await performanceMonitoringService.timeFunction(
                  'render',
                  'process-trajectories',
                  () => {
                    const trajectories = trajectoryProcessor.getAllTrajectories();
                    const personTrajectories: Record<string, PersonTrajectoryData> = {};
                    trajectories.forEach((trajectory, globalPersonId) => {
                      // Validate global person ID
                      const sanitizedPersonId =
                        dataValidationService.sanitizeUserInput(globalPersonId);
                      if (sanitizedPersonId === globalPersonId) {
                        personTrajectories[globalPersonId] = trajectory;
                      }
                    });
                    return personTrajectories;
                  },
                  { trajectoryCount: trajectoryProcessor.getAllTrajectories().size }
                );

                // Monitor statistics calculation
                const statisticsResult = await performanceMonitoringService.timeFunction(
                  'user-interaction',
                  'calculate-statistics',
                  () => {
                    const statistics = trackingDataUtils.analyze.statistics(
                      result.processedCameras
                    );

                    // Sanitize statistics to ensure valid numbers
                    return {
                      totalDetections: Math.max(0, Math.floor(statistics.totalDetections || 0)),
                      uniquePersons: Math.max(0, Math.floor(statistics.uniquePersons || 0)),
                      averageConfidence: Math.max(
                        0,
                        Math.min(1, statistics.averageConfidence || 0)
                      ),
                    };
                  }
                );

                const newState = {
                  cameras: result.processedCameras,
                  personTrajectories: trajectoryResult.result,
                  totalDetections: statisticsResult.result.totalDetections,
                  uniquePersonCount: statisticsResult.result.uniquePersons,
                  averageConfidence: statisticsResult.result.averageConfidence,
                  lastUpdateTimestamp: validatedPayload.timestamp_processed_utc,
                };

                set(newState, false, 'updateTrackingData');

                // Monitor data caching performance
                await Promise.all([
                  performanceMonitoringService.timeFunction(
                    'cache',
                    'cache-tracking-data',
                    () =>
                      dataCacheService.set('last-tracking-data', validatedPayload, {
                        priority: 3,
                        ttl: 30 * 60 * 1000, // 30 minutes
                        tags: ['tracking-data', 'latest', 'validated'],
                      }),
                    { dataSize: JSON.stringify(validatedPayload).length }
                  ),

                  performanceMonitoringService.timeFunction(
                    'cache',
                    'cache-statistics',
                    () =>
                      dataCacheService.set('tracking-statistics', statisticsResult.result, {
                        priority: 2,
                        ttl: 5 * 60 * 1000, // 5 minutes
                        tags: ['statistics', 'tracking', 'validated'],
                      }),
                    { dataSize: JSON.stringify(statisticsResult.result).length }
                  ),
                ]);
              } catch (error) {
                console.error('Failed to update tracking data:', error);

                // Monitor error recovery performance
                await performanceMonitoringService.timeFunction(
                  'cache',
                  'queue-tracking-retry',
                  () =>
                    queueWebSocketMessage(payload, {
                      priority: 2,
                      maxRetries: 3,
                    })
                );

                throw error;
              }
            },
            {
              payloadSize: JSON.stringify(payload).length,
              frameDataKeys: payload.frame_data ? Object.keys(payload.frame_data).length : 0,
            }
          );
        },

        clearTrackingData: async () => {
          trajectoryProcessor.clearAllTrajectories();

          set(
            {
              cameras: {},
              personTrajectories: {},
              totalDetections: 0,
              uniquePersonCount: 0,
              averageConfidence: 0,
              selectedPersonId: undefined,
              focusedPersonId: undefined,
              highlightedPersonId: undefined,
              lastUpdateTimestamp: undefined,
            },
            false,
            'clearTrackingData'
          );

          // Clear tracking-related cache
          await dataCacheService.deleteByTag('tracking-data');
          await dataCacheService.deleteByTag('statistics');
          await frameCacheService.deleteByTag('frame');
        },

        // ================================================================
        // Person Management
        // ================================================================

        selectPerson: (globalPersonId: string | undefined) => {
          // Validate and sanitize person ID if provided
          let validatedPersonId = globalPersonId;
          if (globalPersonId) {
            validatedPersonId = dataValidationService.sanitizeUserInput(globalPersonId);
            if (!validatedPersonId || validatedPersonId !== globalPersonId) {
              console.warn('Invalid person ID provided for selection:', globalPersonId);
              return;
            }
          }

          set(
            (state) => {
              // Update person selection in camera data
              const updatedCameras = { ...state.cameras };

              Object.values(updatedCameras).forEach((cameraData) => {
                cameraData.tracks.forEach((track) => {
                  track.isSelected = track.global_id === validatedPersonId;
                });
              });

              return {
                selectedPersonId: validatedPersonId,
                cameras: updatedCameras,
              };
            },
            false,
            'selectPerson'
          );
        },

        focusPerson: (globalPersonId: string | undefined) => {
          // Validate and sanitize person ID if provided
          let validatedPersonId = globalPersonId;
          if (globalPersonId) {
            validatedPersonId = dataValidationService.sanitizeUserInput(globalPersonId);
            if (!validatedPersonId || validatedPersonId !== globalPersonId) {
              console.warn('Invalid person ID provided for focus:', globalPersonId);
              return;
            }
          }

          set(
            (state) => {
              // Update person focus in camera data
              const updatedCameras = { ...state.cameras };

              Object.values(updatedCameras).forEach((cameraData) => {
                cameraData.tracks.forEach((track) => {
                  track.isFocused = track.global_id === validatedPersonId;
                });
              });

              return {
                focusedPersonId: validatedPersonId,
                cameras: updatedCameras,
              };
            },
            false,
            'focusPerson'
          );
        },

        highlightPerson: (globalPersonId: string | undefined) => {
          set(
            (state) => {
              // Update person highlight in camera data
              const updatedCameras = { ...state.cameras };

              Object.values(updatedCameras).forEach((cameraData) => {
                cameraData.tracks.forEach((track) => {
                  track.isHighlighted = track.global_id === globalPersonId;
                });
              });

              return {
                highlightedPersonId: globalPersonId,
                cameras: updatedCameras,
              };
            },
            false,
            'highlightPerson'
          );
        },

        // ================================================================
        // Phase 11: Enhanced WebSocket Integration Methods
        // ================================================================

        processTrackingUpdate: (payload: WebSocketTrackingMessagePayload) => {
          // Enhanced version of updateTrackingData with additional processing
          const startTime = Date.now();
          
          try {
            // Call existing updateTrackingData method
            get().actions.updateTrackingData(payload);
            
            // Additional processing for Phase 11 integration
            set(
              (state) => ({
                isTrackingActive: true,
                lastUpdateTimestamp: payload.timestamp_processed_utc,
                wsConnectionState: 'connected',
              }),
              false,
              'processTrackingUpdate'
            );

            console.log(`📊 Processed tracking update in ${Date.now() - startTime}ms`);
          } catch (error) {
            console.error('❌ Error processing tracking update:', error);
            throw error;
          }
        },

        setWebSocketState: (newState) => {
          set(
            (state) => ({
              wsConnectionState: newState.isConnected ? 'connected' : 'disconnected',
              isTrackingActive: newState.isConnected || state.isTrackingActive,
              // Store additional WebSocket state if needed in future
            }),
            false,
            'setWebSocketState'
          );
        },

        // ================================================================
        // Camera Display Management
        // ================================================================

        setCameraDisplaySize: (
          cameraId: BackendCameraId,
          size: { width: number; height: number }
        ) => {
          set(
            (state) => ({
              displaySizes: {
                ...state.displaySizes,
                [cameraId]: size,
              },
            }),
            false,
            'setCameraDisplaySize'
          );
        },

        toggleCameraVisibility: (cameraId: BackendCameraId) => {
          set(
            (state) => {
              const cameraData = state.cameras[cameraId];
              if (cameraData) {
                return {
                  cameras: {
                    ...state.cameras,
                    [cameraId]: {
                      ...cameraData,
                      isActive: !cameraData.isActive,
                    },
                  },
                };
              }
              return state;
            },
            false,
            'toggleCameraVisibility'
          );
        },

        // ================================================================
        // Trajectory Management
        // ================================================================

        toggleTrajectoryVisibility: (globalPersonId?: string) => {
          if (globalPersonId) {
            // Toggle specific person trajectory
            set(
              (state) => {
                const trajectory = state.personTrajectories[globalPersonId];
                if (trajectory) {
                  return {
                    personTrajectories: {
                      ...state.personTrajectories,
                      [globalPersonId]: {
                        ...trajectory,
                        isVisible: !trajectory.isVisible,
                      },
                    },
                  };
                }
                return state;
              },
              false,
              'toggleTrajectoryVisibility:person'
            );
          } else {
            // Toggle all trajectories
            set(
              (state) => ({
                showTrajectories: !state.showTrajectories,
              }),
              false,
              'toggleTrajectoryVisibility:all'
            );
          }
        },

        clearTrajectories: () => {
          trajectoryProcessor.clearAllTrajectories();

          set({ personTrajectories: {} }, false, 'clearTrajectories');
        },

        // ================================================================
        // Statistics and Analysis
        // ================================================================

        getPersonStatistics: () => {
          const state = get();
          return trackingDataUtils.analyze.statistics(state.cameras);
        },

        findPersonAcrossCameras: (globalPersonId: string) => {
          const state = get();
          return trackingDataUtils.analyze.findPerson(globalPersonId, state.cameras);
        },

        // ================================================================
        // Display Filters
        // ================================================================

        setConfidenceThreshold: async (threshold: number) => {
          // Validate threshold input
          if (typeof threshold !== 'number' || !isFinite(threshold)) {
            console.error('Invalid confidence threshold:', threshold);
            return;
          }

          const newThreshold = Math.max(0, Math.min(1, threshold));

          // Validate the clamped value is reasonable
          if (Math.abs(newThreshold - threshold) > 0.001) {
            console.warn(`Confidence threshold clamped from ${threshold} to ${newThreshold}`);
          }

          set({ confidenceThreshold: newThreshold }, false, 'setConfidenceThreshold');

          // Cache validated display preferences
          try {
            const currentConfig = (await dataCacheService.get('display-config')) || {};
            const updatedConfig = {
              ...currentConfig,
              confidenceThreshold: newThreshold,
            };

            // Validate config before caching
            const configValidation = dataValidationService.validateAndSanitize(updatedConfig, {
              type: 'object',
              properties: {
                confidenceThreshold: { type: 'number', min: 0, max: 1 },
                showPersonIds: { type: 'boolean', required: false },
                showTrajectories: { type: 'boolean', required: false },
              },
            });

            if (configValidation.isValid) {
              await dataCacheService.set('display-config', configValidation.sanitized, {
                priority: 2,
                ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
                tags: ['display', 'preferences', 'validated'],
              });
            }
          } catch (error) {
            console.warn('Failed to cache display config:', error);
          }
        },

        setShowPersonIds: async (show: boolean) => {
          set({ showPersonIds: show }, false, 'setShowPersonIds');

          // Cache display preferences
          const currentConfig = (await dataCacheService.get('display-config')) || {};
          await dataCacheService.set(
            'display-config',
            {
              ...currentConfig,
              showPersonIds: show,
            },
            {
              priority: 2,
              ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
              tags: ['display', 'preferences'],
            }
          );
        },

        setShowTrajectories: async (show: boolean) => {
          set({ showTrajectories: show }, false, 'setShowTrajectories');

          // Cache display preferences
          const currentConfig = (await dataCacheService.get('display-config')) || {};
          await dataCacheService.set(
            'display-config',
            {
              ...currentConfig,
              showTrajectories: show,
            },
            {
              priority: 2,
              ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
              tags: ['display', 'preferences'],
            }
          );
        },

        // ================================================================
        // Reset
        // ================================================================

        reset: async () => {
          const state = get();

          // Disconnect WebSocket
          await get().actions.disconnectWebSocket();

          // Clear trajectories
          trajectoryProcessor.clearAllTrajectories();

          // Clear all tracking-related cache and queued data
          await dataCacheService.deleteByTag('tracking');
          await dataCacheService.deleteByTag('frame');
          await dataCacheService.deleteByTag('statistics');
          await frameCacheService.clear();

          set({ ...initialState }, false, 'reset');
        },
      },
    })),
    {
      name: 'TrackingStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// Selectors and Hooks
// ============================================================================

/**
 * Get tracking actions
 */
export const useTrackingActions = () => useTrackingStore((state) => state.actions);

/**
 * Get WebSocket connection state
 */
export const useWebSocketState = () =>
  useTrackingStore((state) => ({
    connectionState: state.wsConnectionState,
    isConnected: state.wsConnectionState === 'connected',
    service: state.wsService,
  }));

/**
 * Get camera tracking data
 */
export const useCameraData = () => useTrackingStore((state) => state.cameras);

/**
 * Get specific camera data
 */
export const useCameraDataById = (cameraId: BackendCameraId) =>
  useTrackingStore((state) => state.cameras[cameraId]);

/**
 * Get person tracking data
 */
export const usePersonTracking = () =>
  useTrackingStore((state) => ({
    selectedPersonId: state.selectedPersonId,
    focusedPersonId: state.focusedPersonId,
    highlightedPersonId: state.highlightedPersonId,
    trajectories: state.personTrajectories,
  }));

/**
 * Get tracking statistics
 */
export const useTrackingStatistics = () =>
  useTrackingStore((state) => ({
    totalDetections: state.totalDetections,
    uniquePersonCount: state.uniquePersonCount,
    averageConfidence: state.averageConfidence,
    lastUpdateTimestamp: state.lastUpdateTimestamp,
    isTrackingActive: state.isTrackingActive,
  }));

/**
 * Get display configuration
 */
export const useDisplayConfig = () =>
  useTrackingStore((state) => ({
    confidenceThreshold: state.confidenceThreshold,
    showPersonIds: state.showPersonIds,
    showTrajectories: state.showTrajectories,
    displaySizes: state.displaySizes,
  }));

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if tracking is active
 */
export function useIsTrackingActive(): boolean {
  return useTrackingStore(
    (state) => state.isTrackingActive && state.wsConnectionState === 'connected'
  );
}

/**
 * Get active persons count
 */
export function useActivePersonsCount(): number {
  return useTrackingStore((state) => {
    let count = 0;
    Object.values(state.cameras).forEach((cameraData) => {
      count += cameraData.tracks.length;
    });
    return count;
  });
}

/**
 * Check if person is visible in any camera
 */
export function useIsPersonVisible(globalPersonId: string): boolean {
  return useTrackingStore((state) => {
    return Object.values(state.cameras).some((cameraData) =>
      cameraData.tracks.some((track) => track.global_id === globalPersonId)
    );
  });
}

/**
 * Get person trajectory
 */
export function usePersonTrajectory(globalPersonId: string): PersonTrajectoryData | undefined {
  return useTrackingStore((state) => state.personTrajectories[globalPersonId]);
}

// ============================================================================
// Dev Tools and Debugging
// ============================================================================

/**
 * Get store state for debugging
 */
export function getTrackingStoreState() {
  return useTrackingStore.getState();
}

/**
 * Subscribe to store changes
 */
export function subscribeToTrackingStore(callback: (state: TrackingStoreState) => void) {
  return useTrackingStore.subscribe(callback);
}

/**
 * Subscribe to specific state changes
 */
export function subscribeToPersonSelection(callback: (selectedPersonId?: string) => void) {
  return useTrackingStore.subscribe((state) => state.selectedPersonId, callback, {
    fireImmediately: true,
  });
}

// ============================================================================
// Store Initialization
// ============================================================================

/**
 * Initialize tracking store with enhanced data management
 */
export async function initializeTrackingStore() {
  // Set default display sizes for all cameras
  const defaultSize = { width: 640, height: 480 };
  const cameraIds: BackendCameraId[] = ['c09', 'c12', 'c13', 'c16', 'c01', 'c02', 'c03', 'c05'];

  cameraIds.forEach((cameraId) => {
    useTrackingStore.getState().actions.setCameraDisplaySize(cameraId, defaultSize);
  });

  // Try to restore cached tracking data
  try {
    const cachedTrackingData = await dataCacheService.get('last-tracking-data');
    if (cachedTrackingData) {
      console.log('Restoring cached tracking data');
      await useTrackingStore.getState().actions.updateTrackingData(cachedTrackingData);
    }

    // Try to restore display preferences
    const cachedDisplayConfig = await dataCacheService.get('display-config');
    if (cachedDisplayConfig) {
      const { actions } = useTrackingStore.getState();
      if (cachedDisplayConfig.confidenceThreshold !== undefined) {
        actions.setConfidenceThreshold(cachedDisplayConfig.confidenceThreshold);
      }
      if (cachedDisplayConfig.showPersonIds !== undefined) {
        actions.setShowPersonIds(cachedDisplayConfig.showPersonIds);
      }
      if (cachedDisplayConfig.showTrajectories !== undefined) {
        actions.setShowTrajectories(cachedDisplayConfig.showTrajectories);
      }
    }
  } catch (error) {
    console.warn('Failed to restore cached tracking state:', error);
  }

  // Set up periodic cache optimization
  setInterval(
    async () => {
      try {
        // Clean old frame cache entries (older than 30 minutes)
        const frameStats = frameCacheService.getStatistics();
        const cacheHitRate = parseFloat(frameStats.hitRate.replace('%', ''));

        if (cacheHitRate < 30) {
          // Low hit rate indicates stale data
          console.log('Frame cache hit rate low, performing cleanup');
          const now = Date.now();
          const thirtyMinutesAgo = now - 30 * 60 * 1000;

          // This would require additional metadata in cache entries to filter by time
          // For now, we'll just clear frames older than the current session
          await frameCacheService.deleteByTag('expired');
        }
      } catch (error) {
        console.warn('Frame cache optimization failed:', error);
      }
    },
    10 * 60 * 1000
  ); // Every 10 minutes
}

// Export store for direct access if needed
export default useTrackingStore;
