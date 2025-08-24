// Enhanced GroupViewPage with Phase 11 Data Management & State Integration
// src/pages/GroupViewPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ImageSequencePlayer from '../components/ImageSequencePlayer';
import ErrorBoundary from '../components/common/ErrorBoundary';
import {
  LoadingOverlay,
  CameraSkeleton,
  ConnectionStatus,
} from '../components/common/LoadingStates';
import { useViewportSize, getResponsiveClasses } from '../utils/responsive';
import { useErrorRecovery, useNetworkStatus } from '../hooks/useErrorRecovery';

// Phase 11 Integration: WebSocket and Store Integration
import { useWebSocketIntegration } from '../hooks/useWebSocketIntegration';

// Phase 11 Integration: Performance Optimization
import { 
  useAdvancedPerformance, 
  useRenderPerformance, 
  useTrackingDataPerformance 
} from '../hooks/usePerformanceOptimization';

// Zustand Store Hooks - Phase 11 State Management
import {
  useSystemActions,
  useCurrentEnvironment,
  useTaskInfo,
  useTaskId,
  useTaskStatus,
  useTaskProgress,
  useTaskError,
  useSystemHealth,
  useIsSystemReady,
  useIsTaskProcessing,
  useHasSystemErrors,
} from '../stores/systemStore';

import {
  useTrackingActions,
  useCameraData,
  usePersonTracking,
  useTrackingStatistics,
  useIsTrackingActive,
} from '../stores/trackingStore';

// Configuration and Types
import type { EnvironmentId, BackendCameraId } from '../types/api';
import { 
  getCameraMapping, 
  getEnvironmentConfig, 
  getFrontendCameraId, 
  getBackendCameraId 
} from '../config/environments';


// =============================================================================
// Constants and Configuration
// =============================================================================

const ZONE_NAMES = {
  campus: 'Campus',
  factory: 'Factory',
} as const;

const CAMERA_NAMES = ['Camera 1', 'Camera 2', 'Camera 3', 'Camera 4'];
const FRONTEND_CAMERA_IDS = ['camera1', 'camera2', 'camera3', 'camera4'];

type TabType = 'all' | string;

// =============================================================================
// Enhanced GroupViewPage Component with Phase 11 Integration
// =============================================================================

const GroupViewPage: React.FC = () => {
  // URL Parameters
  const [searchParams] = useSearchParams();
  const environmentParam = searchParams.get('environment') as EnvironmentId;
  
  // Local UI State
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Zustand Store Hooks - System Store
  const systemActions = useSystemActions();
  const currentEnvironment = useCurrentEnvironment();
  // const taskInfo = useTaskInfo();
  const taskId = useTaskId();
  const taskStatus = useTaskStatus();
  const taskProgress = useTaskProgress();
  const taskError = useTaskError();
  
  // Create stable taskInfo object
  const taskInfo = useMemo(() => ({
    taskId,
    taskStatus,
    taskProgress,
    taskError,
  }), [taskId, taskStatus, taskProgress, taskError]);
  // const systemHealth = useSystemHealth();
  const isSystemReady = useIsSystemReady();
  const isTaskProcessing = useIsTaskProcessing();
  const hasSystemErrors = useHasSystemErrors();
  
  // Zustand Store Hooks - Tracking Store - TEMPORARILY DISABLED
  const trackingActions = useTrackingActions();
  const cameraData = useCameraData();
  // const personTracking = usePersonTracking();
  // const trackingStats = useTrackingStatistics();
  const isTrackingActive = useIsTrackingActive();
  
  // Phase 11: WebSocket Integration Hook - RE-ENABLED
  const webSocketIntegration = useWebSocketIntegration({
    autoConnect: true,
    autoSubscribe: true,
    reconnectOnError: true,
  });
  
  // Mock minimal data for components that don't have full implementation yet
  const systemHealth = { health: { status: 'unknown' } };
  const personTracking = { selectedPersonId: null, focusedPersonId: null, highlightedPersonId: null, trajectories: {} };
  const trackingStats = { totalDetections: 0, uniquePersonCount: 0, averageConfidence: 0, lastUpdateTimestamp: null, isTrackingActive: false };
  
  // Phase 11: Performance Optimization Hooks - TEMPORARILY DISABLED
  // const [performanceState, performanceActions] = useAdvancedPerformance({
  //   enableAutoOptimization: false, // Disabled to prevent optimization loops
  //   memoryThreshold: 80,
  //   updateInterval: 2000,
  // });
  
  // const getPerformanceMetrics = useRenderPerformance('GroupViewPage');
  // const { optimizeTrackingUpdate } = useTrackingDataPerformance();

  // Responsive and Error Handling
  const { screenSize } = useViewportSize();
  const { isOnline } = useNetworkStatus();
  const { error, isLoading, executeWithRecovery, retry, reset } = useErrorRecovery({
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
  });
  
  const responsiveClasses = getResponsiveClasses(screenSize);
  
  // Environment Configuration
  const environment = currentEnvironment || environmentParam || 'factory';
  const environmentConfig = getEnvironmentConfig(environment);
  const zoneName = ZONE_NAMES[environment] || 'Unknown Zone';
  const cameraMapping = getCameraMapping(environment);

  // =============================================================================
  // Phase 11: Backend Integration and Task Management
  // =============================================================================

  
  // Initialize system and start task when component mounts - RE-ENABLED
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await executeWithRecovery(async () => {
          // Set environment if not already set
          if (!currentEnvironment && environmentParam) {
            systemActions.setEnvironment(environmentParam);
          }
          
          // Check system health first
          await systemActions.checkSystemHealth();
          
          // Start processing task if environment is set and no task is running
          if (environment && !taskId && !webSocketIntegration.isConnected) {
            console.log('🚀 Starting processing task for environment:', environment);
            const newTaskId = await webSocketIntegration.startTask(environment);
            
            if (newTaskId) {
              console.log('✅ Task and WebSocket initialized successfully:', newTaskId);
              setIsInitialized(true);
            }
          }
        });
      } catch (error) {
        console.error('❌ System initialization failed:', error);
      }
    };
    
    if (!isInitialized && environment && !isLoading) {
      initializeSystem();
    }
  }, [
    environment,
    environmentParam,
    isInitialized,
    isLoading,
    // Remove problematic dependencies that cause loops
  ]);
  
  // Monitor task progress - TEMPORARILY DISABLED
  // useEffect(() => {
  //   if (taskInfo.taskId && taskInfo.taskStatus !== 'COMPLETED' && isTaskProcessing) {
  //     const monitorTask = async () => {
  //       try {
  //         await systemActions.updateTaskStatus(taskInfo.taskId!);
  //       } catch (error) {
  //         console.error('Failed to monitor task status:', error);
  //       }
  //     };
  //     
  //     const interval = setInterval(monitorTask, 2000);
  //     return () => clearInterval(interval);
  //   }
  // }, [taskInfo.taskId, taskInfo.taskStatus, isTaskProcessing, systemActions]);

  // =============================================================================
  // UI Event Handlers
  // =============================================================================
  
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);
  
  const handlePersonSelection = useCallback((globalPersonId: string | undefined) => {
    trackingActions.selectPerson(globalPersonId);
    
    if (globalPersonId) {
      trackingActions.focusPerson(globalPersonId);
      console.log('👤 Person selected and focused:', globalPersonId);
    }
  }, [trackingActions]);
  
  const handleRetry = useCallback(async () => {
    reset();
    
    // Clear any cached data and restart
    await trackingActions.clearTrackingData();
    
    if (taskInfo.taskId) {
      await webSocketIntegration.connect(taskInfo.taskId);
    } else if (environment) {
      // Restart the entire process
      const taskId = await webSocketIntegration.startTask(environment);
      if (taskId) {
        console.log('♾️ System restarted successfully');
      }
    }
  }, [reset, environment, taskInfo.taskId, webSocketIntegration, trackingActions]);

  // =============================================================================
  // Data Processing and Utilities
  // =============================================================================
  
  const getTrackingDataForCamera = useCallback((frontendCameraId: string): any[] => {
    const backendCameraId = getBackendCameraId(frontendCameraId as any, environment);
    const cameraTrackingData = cameraData[backendCameraId];
    
    if (!cameraTrackingData || !cameraTrackingData.tracks) {
      return [];
    }
    
    // Convert to legacy format expected by ImageSequencePlayer
    return cameraTrackingData.tracks.map(track => ({
      trackId: track.track_id,
      x1: track.bbox_xyxy[0],
      y1: track.bbox_xyxy[1],
      x2: track.bbox_xyxy[2],
      y2: track.bbox_xyxy[3],
      globalId: track.global_id,
      confidence: track.confidence,
      mapCoords: track.map_coords,
      isSelected: track.isSelected,
      isFocused: track.isFocused,
      isHighlighted: track.isHighlighted,
    }));
  }, [cameraData, environment]);
  
  const getFrameImageForCamera = useCallback((frontendCameraId: string): string | undefined => {
    const backendCameraId = getBackendCameraId(frontendCameraId as any, environment);
    const cameraTrackingData = cameraData[backendCameraId];
    
    return cameraTrackingData?.frameImage;
  }, [cameraData, environment]);
  
  const getMockDetections = useCallback(() => {
    return CAMERA_NAMES.map((_, index) => {
      const frontendId = FRONTEND_CAMERA_IDS[index];
      return getTrackingDataForCamera(frontendId).length;
    });
  }, [getTrackingDataForCamera]);

  // =============================================================================
  // Render Helpers
  // =============================================================================
  
  const renderCameraView = useCallback((frontendCameraId: string) => {
    const tracks = getTrackingDataForCamera(frontendCameraId);
    const base64Image = getFrameImageForCamera(frontendCameraId);
    
    return (
      <ErrorBoundary key={frontendCameraId}>
        <ImageSequencePlayer
          cameraId={frontendCameraId}
          basePath="" // Not used in real-time mode
          startFrame={0}
          frameCount={1}
          currentFrameIndex={0}
          imageExtension="jpg"
          tracks={tracks}
          base64Image={base64Image}
          className="min-h-0"
          onPersonClick={handlePersonSelection}
        />
      </ErrorBoundary>
    );
  }, [getTrackingDataForCamera, getFrameImageForCamera, handlePersonSelection]);
  
  const renderMapVisualization = useCallback(() => {
    return (
      <div className="bg-gray-700 rounded-md h-1/2 grid grid-cols-2 grid-rows-2 gap-px overflow-hidden">
        {FRONTEND_CAMERA_IDS.map((frontendCameraId, index) => {
          const backendCameraId = getBackendCameraId(frontendCameraId as any, environment);
          const cameraTrackingData = cameraData[backendCameraId];
          const cameraName = CAMERA_NAMES[index];
          
          // Calculate map points for this camera's quadrant
          const quadrantPoints = cameraTrackingData?.tracks?.map(track => ({
            x: track.map_coords?.[0] || 0,
            y: track.map_coords?.[1] || 0,
            globalId: track.global_id,
            isSelected: track.isSelected,
            isFocused: track.isFocused,
            isHighlighted: track.isHighlighted,
          })) || [];
          
          const quadrantColor = cameraMapping.colors[backendCameraId] || 'bg-gray-500';
          
          return (
            <div
              key={frontendCameraId}
              className="relative w-full h-full bg-gray-800 p-1"
              title={`Map - ${cameraName}`}
            >
              <div className="absolute top-1 left-1 text-xs text-gray-400 opacity-75 pointer-events-none">
                {cameraName}
              </div>
              
              {quadrantPoints.map((point) => (
                <div
                  key={point.globalId}
                  title={`ID: ${point.globalId} (from ${cameraName})`}
                  className={`absolute w-2 h-2 ${
                    point.isSelected ? 'bg-orange-400' :
                    point.isFocused ? 'bg-yellow-400' :
                    point.isHighlighted ? 'bg-red-400' :
                    quadrantColor
                  } rounded-full shadow-md ${
                    point.isSelected || point.isFocused ? 'ring-2 ring-white' : ''
                  }`}
                  style={{
                    left: `${Math.max(0, Math.min(100, point.x))}%`,
                    top: `${Math.max(0, Math.min(100, point.y))}%`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }, [cameraData, environment, cameraMapping]);


  return (
    <ErrorBoundary>
      <div
        className={`flex flex-col h-screen bg-gray-900 text-gray-200 ${responsiveClasses.container}`}
      >
        {/* Header Section - Responsive */}
        <header className={`mb-4 flex-shrink-0 ${responsiveClasses.headerSection}`}>
          <Link
            to="/"
            className={`flex items-center hover:text-orange-400 ${
              screenSize === 'mobile' ? 'text-base' : 'text-lg'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Back
          </Link>

          <h1 className={`font-semibold ${screenSize === 'mobile' ? 'text-xl' : 'text-2xl'}`}>
            {zoneName}
          </h1>

          {/* Enhanced Connection Status */}
          <div className="flex items-center space-x-4">
            <ConnectionStatus
              status={
                hasSystemErrors ? 'error' :
                !isOnline ? 'disconnected' :
                isTrackingActive && webSocketIntegration.isConnected ? 'connected' :
                isTaskProcessing ? 'connecting' :
                'disconnected'
              }
              compact={screenSize === 'mobile'}
            />
            
            {/* System Health Indicators */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`flex items-center ${
                systemHealth?.health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'
              }`}>
                <span className={`h-2 w-2 rounded-full mr-1 ${
                  systemHealth?.health?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                }`}></span>
                {systemHealth?.health?.status === 'healthy' ? 'System OK' : 'System Error'}
              </div>
              
              {isTaskProcessing && (
                <div className="flex items-center text-yellow-400">
                  <span className="h-2 w-2 bg-yellow-400 rounded-full mr-1 animate-pulse"></span>
                  Processing ({Math.round((taskInfo.taskProgress || 0) * 100)}%)
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Info Bar with Real-time Statistics */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
            <div>
              Cameras: <span className="font-semibold">{Object.keys(cameraMapping.frontendToBackend).length}</span>
            </div>
            <div className="flex space-x-4">
              <span className="text-green-400 flex items-center">
                <span className="h-2 w-2 bg-green-400 rounded-full mr-1"></span>
                Active: {Object.values(cameraData).filter(cam => cam.isActive).length}
              </span>
              <span className="text-gray-400 flex items-center">
                <span className="h-2 w-2 bg-gray-400 rounded-full mr-1"></span>
                Detections: {trackingStats.totalDetections}
              </span>
              <span className="text-blue-400 flex items-center">
                <span className="h-2 w-2 bg-blue-400 rounded-full mr-1"></span>
                Persons: {trackingStats.uniquePersonCount}
              </span>
            </div>
            <div>
              Environment: <span className="font-semibold">{zoneName}</span>
            </div>
          </div>
          
          {/* Real-time Controls */}
          <div className="flex space-x-2 flex-shrink-0">
            <div className="text-sm text-gray-300">
              {isTrackingActive ? (
                <span className="text-green-400">● LIVE</span>
              ) : (
                <span className="text-red-400">● OFFLINE</span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mb-4 border-b border-gray-700 flex-shrink-0">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('all')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              View all
            </button>
            {FRONTEND_CAMERA_IDS.map((id, index) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }`}
              >
                {CAMERA_NAMES[index]}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-grow min-h-0 gap-4">
          {/* Camera Views Section */}
          <div className={`bg-gray-800 rounded-md p-1 flex items-center justify-center ${responsiveClasses.cameraSection}`} data-testid="camera-grid">
            <LoadingOverlay
              isLoading={!isTrackingActive && isTaskProcessing}
              message={
                isTaskProcessing 
                  ? `Processing... ${Math.round((taskInfo.taskProgress || 0) * 100)}%` 
                  : "Loading camera feeds..."
              }
            >
              {hasSystemErrors || error || webSocketIntegration.connectionError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-400 mb-2">System Error</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      {webSocketIntegration.connectionError || error?.message || taskInfo.taskError || 'System unavailable'}
                    </p>
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'all' && (
                    <div
                      className={`gap-1 w-full h-full ${
                        screenSize === 'mobile'
                          ? 'grid grid-cols-1'
                          : 'grid grid-cols-2 grid-rows-2'
                      }`}
                    >
                      {FRONTEND_CAMERA_IDS.map(renderCameraView)}
                    </div>
                  )}
                  {/* Single camera view */}
                  {FRONTEND_CAMERA_IDS.includes(activeTab) && (
                    <div className="w-full h-full">
                      {renderCameraView(activeTab)}
                    </div>
                  )}
                </>
              )}
            </LoadingOverlay>
          </div>

          {/* Right Sidebar with Map and Statistics */}
          <div className={`flex flex-col gap-4 ${responsiveClasses.sidebarSection}`}>
            {/* Map Visualization */}
            <div data-testid="tracking-map">
              {renderMapVisualization()}
            </div>

            {/* Statistics Panels */}
            <div className="flex flex-grow gap-4 h-1/2">
              {/* Detection Statistics */}
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col">
                <h3 className="text-sm font-semibold mb-3 text-gray-400">Detections per camera</h3>
                <div className="space-y-2 text-xs flex-grow overflow-y-auto">
                  {CAMERA_NAMES.map((name, idx) => {
                    const frontendId = FRONTEND_CAMERA_IDS[idx];
                    const detectionCount = getTrackingDataForCamera(frontendId).length;
                    const maxDetections = Math.max(1, ...getMockDetections());
                    
                    return (
                      <div key={name} className="flex items-center justify-between">
                        <span>{name}</span>
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-gray-700 rounded-full mr-2">
                            <div
                              className="h-2 bg-green-500 rounded-full transition-all duration-300"
                              style={{
                                width: `${(detectionCount / maxDetections) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="font-mono">{detectionCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Selected Person Info */}
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-400">
                      {personTracking.selectedPersonId ? 'Selected Person' : 'No Selection'}
                    </h3>
                    <span className={`text-xs font-semibold flex items-center ${
                      personTracking.selectedPersonId ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full mr-1 ${
                        personTracking.selectedPersonId ? 'bg-orange-400' : 'bg-gray-400'
                      }`}></span>
                      {personTracking.selectedPersonId ? 'Tracking' : 'Standby'}
                    </span>
                  </div>
                  
                  {personTracking.selectedPersonId ? (
                    <>
                      <p className="text-xs">
                        Person ID: <span className="font-bold">{personTracking.selectedPersonId}</span>
                      </p>
                      <p className="text-xs mt-1">
                        Confidence: {Math.round((trackingStats.averageConfidence || 0) * 100)}%
                      </p>
                      <p className="text-xs mt-1">
                        Last seen: {trackingStats.lastUpdateTimestamp ? 
                          new Date(trackingStats.lastUpdateTimestamp).toLocaleTimeString() : 'Unknown'
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Click on a person in any camera view to select and track them
                    </p>
                  )}
                </div>
                
                {personTracking.selectedPersonId && (
                  <button 
                    onClick={() => handlePersonSelection(undefined)}
                    className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-semibold mt-3 transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default GroupViewPage;
