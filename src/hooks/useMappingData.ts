// Mapping Data Hook - Integrates with detection endpoint WebSocket for 2D mapping
// src/hooks/useMappingData.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BackendCameraId } from '../types/api';

/**
 * Trail point representing a person's position in their movement history
 */
interface TrailPoint {
  x: number;
  y: number;
  frame_offset: number;
  timestamp: string;
}

/**
 * Mapping coordinate data from the detection endpoint
 */
export interface MappingCoordinate {
  detection_id: string;
  map_x: number;
  map_y: number;
  projection_successful: boolean;
  coordinate_system: string;
  foot_point?: {
    image_x: number;
    image_y: number;
  };
  trail?: TrailPoint[];
}

/**
 * Detection WebSocket message structure
 */
interface DetectionWebSocketMessage {
  type: string;
  task_id: string;
  camera_id: string;
  global_frame_index: number;
  timestamp_processed_utc: string;
  mode: string;
  camera_data: {
    frame_image_base64: string;
    original_frame_base64?: string;
    tracks: any[];
    frame_width: number;
    frame_height: number;
    timestamp: string;
  };
  detection_data?: any;
  future_pipeline_data?: {
    tracking_data?: any;
    reid_data?: any;
    homography_data?: any;
    mapping_coordinates?: MappingCoordinate[];
  };
}

/**
 * Mapping data state
 */
interface MappingDataState {
  // Mapping coordinates by camera
  mappingByCamera: Partial<Record<BackendCameraId, MappingCoordinate[]>>;
  // Statistics
  totalPersons: number;
  totalCamerasWithData: number;
  lastUpdate: Date | null;
  // Error handling
  processingErrors: string[];
}

/**
 * Hook configuration
 */
interface UseMappingDataConfig {
  enabled?: boolean;
  maxTrailLength?: number;
  maxAge?: number; // Max age in seconds for coordinate data
}

/**
 * Hook return type
 */
interface UseMappingDataReturn {
  mappingData: MappingDataState;
  getMappingForCamera: (cameraId: BackendCameraId) => MappingCoordinate[];
  getStatistics: () => {
    totalPersons: number;
    camerasWithData: BackendCameraId[];
    averageTrailLength: number;
    lastUpdateAge: number;
  };
  clearMappingData: () => void;
  isEnabled: boolean;
}

/**
 * Custom hook for managing 2D mapping data from detection WebSocket
 * 
 * This hook:
 * - Listens to WebSocket messages from the detection endpoint
 * - Extracts mapping coordinates from future_pipeline_data
 * - Manages per-camera mapping data with trail history
 * - Provides statistics and data access methods
 * - Handles data cleanup and error management
 */
export const useMappingData = (config: UseMappingDataConfig = {}): UseMappingDataReturn => {
  const {
    enabled = true,
    maxTrailLength = Infinity,
    maxAge = 30, // 30 seconds
  } = config;

  // State for mapping data
  const [mappingData, setMappingData] = useState<MappingDataState>({
    mappingByCamera: {},
    totalPersons: 0,
    totalCamerasWithData: 0,
    lastUpdate: null,
    processingErrors: [],
  });

  // Refs for cleanup and optimization
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedFrameRef = useRef<Partial<Record<BackendCameraId, number>>>({});

  // Process WebSocket message
  const processDetectionMessage = useCallback((message: DetectionWebSocketMessage) => {
    if (!enabled || message.type !== 'tracking_update') {
      return;
    }

    try {
      const { camera_id, global_frame_index, future_pipeline_data } = message;
      const cameraId = camera_id as BackendCameraId;

      // Check if this is a newer frame (avoid processing old messages)
      if (lastProcessedFrameRef.current[cameraId] &&
        global_frame_index <= lastProcessedFrameRef.current[cameraId]) {
        return;
      }
      lastProcessedFrameRef.current[cameraId] = global_frame_index;

      // Extract mapping coordinates
      const mappingCoordinates = future_pipeline_data?.mapping_coordinates || [];

      if (mappingCoordinates.length === 0) {
        // Clear mapping data for this camera if no coordinates
        setMappingData(prev => ({
          ...prev,
          mappingByCamera: {
            ...prev.mappingByCamera,
            [cameraId]: [],
          },
          lastUpdate: new Date(),
        }));
        return;
      }

      // Process and validate coordinates
      const validCoordinates = mappingCoordinates
        .filter(coord => coord.projection_successful)
        .map(coord => ({
          ...coord,
          // Ensure trail is limited to maxTrailLength
          trail: coord.trail?.slice(0, maxTrailLength) || [],
        }));

      // Update state
      setMappingData(prev => {
        // Get previous coordinates for this camera to build trails
        const prevCameraCoords = prev.mappingByCamera[cameraId] || [];

        // Enhance coordinates with local trail history if not provided by backend
        const enhancedCoordinates = validCoordinates.map(newCoord => {
          // If backend provided a trail, use it
          if (newCoord.trail && newCoord.trail.length > 0) {
            return newCoord;
          }

          // Otherwise try to find previous position for this ID
          const prevCoord = prevCameraCoords.find(p => p.detection_id === newCoord.detection_id);

          if (prevCoord) {
            // Create a trail point from the PREVIOUS position
            const newTrailPoint: TrailPoint = {
              x: prevCoord.map_x,
              y: prevCoord.map_y,
              frame_offset: 1,
              timestamp: new Date().toISOString()
            };

            // Prepend new point to existing trail (newest first) and limit length
            const existingTrail = prevCoord.trail || [];
            const newTrail = [newTrailPoint, ...existingTrail].slice(0, maxTrailLength);

            return {
              ...newCoord,
              trail: newTrail
            };
          }

          return newCoord;
        });

        const newMappingByCamera = {
          ...prev.mappingByCamera,
          [cameraId]: enhancedCoordinates,
        };

        // Calculate statistics
        const totalPersons = Object.values(newMappingByCamera)
          .reduce((sum, coords) => sum + coords.length, 0);

        const totalCamerasWithData = Object.values(newMappingByCamera)
          .filter(coords => coords.length > 0).length;

        return {
          ...prev,
          mappingByCamera: newMappingByCamera,
          totalPersons,
          totalCamerasWithData,
          lastUpdate: new Date(),
          processingErrors: prev.processingErrors.slice(-5), // Keep last 5 errors
        };
      });

    } catch (error) {
      console.error('Error processing mapping data:', error);

      setMappingData(prev => ({
        ...prev,
        processingErrors: [
          ...prev.processingErrors.slice(-4), // Keep last 4 errors
          `${new Date().toISOString()}: ${(error as Error).message}`,
        ],
      }));
    }
  }, [enabled, maxTrailLength]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!enabled) return;

    // Listen for custom WebSocket events
    const handleWebSocketMessage = (event: CustomEvent<DetectionWebSocketMessage>) => {
      processDetectionMessage(event.detail);
    };

    // Add event listener for WebSocket messages
    window.addEventListener('websocket-mapping-message', handleWebSocketMessage as EventListener);

    return () => {
      window.removeEventListener('websocket-mapping-message', handleWebSocketMessage as EventListener);
    };
  }, [processDetectionMessage, enabled]);

  // Cleanup old data periodically
  useEffect(() => {
    if (!enabled) return;

    cleanupIntervalRef.current = setInterval(() => {
      const now = new Date();

      setMappingData(prev => {
        if (!prev.lastUpdate) return prev;

        const ageInSeconds = (now.getTime() - prev.lastUpdate.getTime()) / 1000;

        // Clear data older than maxAge
        if (ageInSeconds > maxAge) {
          return {
            ...prev,
            mappingByCamera: {},
            totalPersons: 0,
            totalCamerasWithData: 0,
          };
        }

        return prev;
      });
    }, 5000); // Check every 5 seconds

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [enabled, maxAge]);

  // Get mapping data for specific camera
  const getMappingForCamera = useCallback((cameraId: BackendCameraId): MappingCoordinate[] => {
    return mappingData.mappingByCamera[cameraId] || [];
  }, [mappingData.mappingByCamera]);

  // Get statistics
  const getStatistics = useCallback(() => {
    const camerasWithData = Object.keys(mappingData.mappingByCamera).filter(
      cameraId => (mappingData.mappingByCamera[cameraId as BackendCameraId]?.length || 0) > 0
    ) as BackendCameraId[];

    const allTrails = Object.values(mappingData.mappingByCamera)
      .flat()
      .map(coord => coord.trail?.length || 0)
      .filter(length => length > 0);

    const averageTrailLength = allTrails.length > 0
      ? allTrails.reduce((sum, length) => sum + length, 0) / allTrails.length
      : 0;

    const lastUpdateAge = mappingData.lastUpdate
      ? (new Date().getTime() - mappingData.lastUpdate.getTime()) / 1000
      : 0;

    return {
      totalPersons: mappingData.totalPersons,
      camerasWithData,
      averageTrailLength: Math.round(averageTrailLength * 10) / 10,
      lastUpdateAge: Math.round(lastUpdateAge),
    };
  }, [mappingData]);

  // Clear all mapping data
  const clearMappingData = useCallback(() => {
    setMappingData({
      mappingByCamera: {},
      totalPersons: 0,
      totalCamerasWithData: 0,
      lastUpdate: null,
      processingErrors: [],
    });
    lastProcessedFrameRef.current = {};
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  return {
    mappingData,
    getMappingForCamera,
    getStatistics,
    clearMappingData,
    isEnabled: enabled,
  };
};

// Export types for external use
export type { DetectionWebSocketMessage, TrailPoint };