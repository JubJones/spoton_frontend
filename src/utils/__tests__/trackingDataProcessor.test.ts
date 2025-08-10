// Tracking Data Processor Tests
// src/utils/__tests__/trackingDataProcessor.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processTrackingPayload,
  processCameraData,
  processPersonTrack,
  createPersonLabel,
  TrajectoryProcessor,
  validateTrackingPayload,
  validateCameraData,
  validatePersonTrack,
  sanitizeTrackingPayload,
  sanitizeCameraData,
  sanitizePersonTrack,
  getTrackingStatistics,
  findPersonAcrossCameras,
  trackingDataUtils,
} from '../trackingDataProcessor';
import {
  WebSocketTrackingMessagePayload,
  CameraTrackingData,
  TrackedPerson,
  BackendCameraId,
} from '../../types/api';
import { CameraTrackingDisplayData } from '../../types/ui';

// Mock dependencies
vi.mock('../../config/environments', () => ({
  getCameraConfig: vi.fn((cameraId: string) => ({
    resolution: [1920, 1080],
    homography_matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  })),
  getBackendCameraId: vi.fn((frontendId: string) => frontendId),
  getFrontendCameraId: vi.fn((backendId: string) => backendId),
}));

vi.mock('../coordinateTransform', () => ({
  coordinateUtils: {
    calculate: {
      scaleFactors: vi.fn(() => ({ x: 0.5, y: 0.5 })),
    },
    convert: {
      arrayToBbox: vi.fn((array) => ({
        x1: array[0],
        y1: array[1],
        x2: array[2],
        y2: array[3],
      })),
      bboxToArray: vi.fn((bbox) => [bbox.x1, bbox.y1, bbox.x2, bbox.y2]),
      pointToArray: vi.fn((point) => [point.x, point.y]),
    },
    bbox: {
      center: vi.fn((bbox) => ({
        x: (bbox.x1 + bbox.x2) / 2,
        y: (bbox.y1 + bbox.y2) / 2,
      })),
    },
  },
}));

describe('Tracking Data Processor', () => {
  describe('processTrackingPayload', () => {
    const mockPayload: WebSocketTrackingMessagePayload = {
      global_frame_index: 100,
      scene_id: 'factory',
      timestamp_processed_utc: '2024-01-01T00:00:00Z',
      cameras: {
        c09: {
          image_source: 's3://bucket/frame.jpg',
          frame_image_base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          tracks: [
            {
              track_id: 1,
              global_id: 'person_001',
              bbox_xyxy: [100, 100, 200, 200],
              confidence: 0.85,
              class_id: 1,
              map_coords: [50.5, 25.3],
            },
            {
              track_id: 2,
              global_id: 'person_002',
              bbox_xyxy: [300, 150, 400, 250],
              confidence: 0.92,
              class_id: 1,
            },
          ],
        },
        c12: {
          image_source: 's3://bucket/frame2.jpg',
          tracks: [
            {
              track_id: 3,
              global_id: 'person_001', // Same person across cameras
              bbox_xyxy: [150, 200, 250, 300],
              confidence: 0.78,
              class_id: 1,
            },
          ],
        },
      },
    };

    const mockDisplaySizes = {
      c09: { width: 640, height: 480 },
      c12: { width: 640, height: 480 },
    } as Record<BackendCameraId, { width: number; height: number }>;

    it('should process tracking payload successfully', () => {
      const result = processTrackingPayload(mockPayload, mockDisplaySizes);

      expect(result.processedCameras).toHaveProperty('c09');
      expect(result.processedCameras).toHaveProperty('c12');
      expect(result.totalPersons).toBe(3); // 2 from c09 + 1 from c12
      expect(result.uniquePersons.size).toBe(2); // person_001 and person_002
      expect(result.uniquePersons.has('person_001')).toBe(true);
      expect(result.uniquePersons.has('person_002')).toBe(true);
    });

    it('should handle missing display sizes', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const incompleteDisplaySizes = {
        c09: { width: 640, height: 480 },
      } as Record<BackendCameraId, { width: number; height: number }>;

      const result = processTrackingPayload(mockPayload, incompleteDisplaySizes);

      expect(consoleWarn).toHaveBeenCalledWith('No display size configured for camera c12');
      expect(result.processedCameras).toHaveProperty('c09');
      expect(result.processedCameras).not.toHaveProperty('c12');

      consoleWarn.mockRestore();
    });

    it('should apply confidence threshold filter', () => {
      const config = { confidenceThreshold: 0.9 };
      const result = processTrackingPayload(mockPayload, mockDisplaySizes, config);

      // Only person_002 with confidence 0.92 should pass the filter
      const c09Tracks = result.processedCameras.c09.tracks;
      expect(c09Tracks).toHaveLength(1);
      expect(c09Tracks[0].global_id).toBe('person_002');
    });

    it('should disable person coloring when configured', () => {
      const config = { enablePersonColoring: false };
      const result = processTrackingPayload(mockPayload, mockDisplaySizes, config);

      const tracks = result.processedCameras.c09.tracks;
      tracks.forEach((track) => {
        expect(track.color).toBe('#FF6B6B'); // Default color
      });
    });
  });

  describe('processCameraData', () => {
    const mockCameraData: CameraTrackingData = {
      image_source: 's3://bucket/frame.jpg',
      frame_image_base64: 'base64data',
      tracks: [
        {
          track_id: 1,
          global_id: 'person_001',
          bbox_xyxy: [100, 100, 200, 200],
          confidence: 0.85,
          class_id: 1,
        },
      ],
    };

    const mockDisplaySize = { width: 640, height: 480 };
    const mockConfig = {
      enablePersonColoring: true,
      enableTrajectoryTracking: true,
      maxTrajectoryPoints: 100,
      confidenceThreshold: 0.3,
      displayScaling: true,
    };

    it('should process camera data successfully', () => {
      const result = processCameraData(
        mockCameraData,
        'c09' as BackendCameraId,
        'factory',
        mockDisplaySize,
        mockConfig
      );

      expect(result.cameraId).toBe('c09');
      expect(result.frameImageUrl).toBe('data:image/jpeg;base64,base64data');
      expect(result.tracks).toHaveLength(1);
      expect(result.isActive).toBe(true);
      expect(result.resolution).toEqual([1920, 1080]);
      expect(result.displaySize).toEqual([640, 480]);
      expect(result.scaleFactor).toEqual([0.5, 0.5]);
    });

    it('should handle missing frame image', () => {
      const dataWithoutImage = { ...mockCameraData, frame_image_base64: undefined };

      const result = processCameraData(
        dataWithoutImage,
        'c09' as BackendCameraId,
        'factory',
        mockDisplaySize,
        mockConfig
      );

      expect(result.frameImageUrl).toBeUndefined();
    });

    it('should filter tracks by confidence threshold', () => {
      const dataWithLowConfidence: CameraTrackingData = {
        ...mockCameraData,
        tracks: [
          { ...mockCameraData.tracks[0], confidence: 0.1 },
          { ...mockCameraData.tracks[0], track_id: 2, confidence: 0.9 },
        ],
      };

      const result = processCameraData(
        dataWithLowConfidence,
        'c09' as BackendCameraId,
        'factory',
        mockDisplaySize,
        { ...mockConfig, confidenceThreshold: 0.5 }
      );

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].track_id).toBe(2);
    });
  });

  describe('processPersonTrack', () => {
    const mockTrack: TrackedPerson = {
      track_id: 1,
      global_id: 'person_001',
      bbox_xyxy: [100, 100, 200, 200],
      confidence: 0.85,
      class_id: 1,
      map_coords: [50.5, 25.3],
    };

    const mockScaleFactors = { x: 0.5, y: 0.5 };
    const mockConfig = {
      enablePersonColoring: true,
      enableTrajectoryTracking: true,
      maxTrajectoryPoints: 100,
      confidenceThreshold: 0.3,
      displayScaling: true,
    };

    it('should process person track successfully', () => {
      const result = processPersonTrack(mockTrack, mockScaleFactors, mockConfig);

      expect(result.track_id).toBe(1);
      expect(result.global_id).toBe('person_001');
      expect(result.displayBbox).toEqual([50, 50, 100, 100]); // Scaled by 0.5
      expect(result.isSelected).toBe(false);
      expect(result.isFocused).toBe(false);
      expect(result.isHighlighted).toBe(false);
      expect(result.center).toEqual([75, 75]); // Center of scaled bbox
      expect(result.color).toBeDefined();
      expect(result.label).toContain('P-person_0'); // Shortened ID
    });

    it('should disable display scaling when configured', () => {
      const configNoScaling = { ...mockConfig, displayScaling: false };
      const result = processPersonTrack(mockTrack, mockScaleFactors, configNoScaling);

      expect(result.displayBbox).toEqual([100, 100, 200, 200]); // Original coordinates
    });

    it('should use default color when coloring is disabled', () => {
      const configNoColoring = { ...mockConfig, enablePersonColoring: false };
      const result = processPersonTrack(mockTrack, mockScaleFactors, configNoColoring);

      expect(result.color).toBe('#FF6B6B');
    });
  });

  describe('createPersonLabel', () => {
    it('should create label with global ID and confidence', () => {
      const track: TrackedPerson = {
        track_id: 1,
        global_id: 'person_001_very_long_id',
        bbox_xyxy: [0, 0, 100, 100],
        confidence: 0.85,
        class_id: 1,
      };

      const label = createPersonLabel(track);
      expect(label).toBe('P-person_0 (85%)');
    });

    it('should create label with global ID without confidence', () => {
      const track: TrackedPerson = {
        track_id: 1,
        global_id: 'person_001',
        bbox_xyxy: [0, 0, 100, 100],
        class_id: 1,
      };

      const label = createPersonLabel(track);
      expect(label).toBe('P-person_0');
    });

    it('should create label with track ID when no global ID', () => {
      const track: TrackedPerson = {
        track_id: 42,
        bbox_xyxy: [0, 0, 100, 100],
        confidence: 0.75,
        class_id: 1,
      };

      const label = createPersonLabel(track);
      expect(label).toBe('Track 42 (75%)');
    });

    it('should create label with track ID without confidence', () => {
      const track: TrackedPerson = {
        track_id: 42,
        bbox_xyxy: [0, 0, 100, 100],
        class_id: 1,
      };

      const label = createPersonLabel(track);
      expect(label).toBe('Track 42');
    });
  });

  describe('TrajectoryProcessor', () => {
    let processor: TrajectoryProcessor;

    beforeEach(() => {
      processor = new TrajectoryProcessor({
        enableTrajectoryTracking: true,
        maxTrajectoryPoints: 3,
      });
    });

    it('should create new trajectory for person', () => {
      processor.updateTrajectory(
        'person_001',
        [100, 200],
        [50.5, 25.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );

      const trajectory = processor.getTrajectory('person_001');
      expect(trajectory).toBeDefined();
      expect(trajectory!.globalPersonId).toBe('person_001');
      expect(trajectory!.points).toHaveLength(1);
      expect(trajectory!.points[0].position).toEqual([50.5, 25.3]);
      expect(trajectory!.points[0].cameraId).toBe('c09');
    });

    it('should update existing trajectory', () => {
      processor.updateTrajectory(
        'person_001',
        [100, 200],
        [50.5, 25.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );
      processor.updateTrajectory(
        'person_001',
        [110, 210],
        [51.0, 26.0],
        'c09' as BackendCameraId,
        0.8,
        '2024-01-01T00:01:00Z'
      );

      const trajectory = processor.getTrajectory('person_001');
      expect(trajectory!.points).toHaveLength(2);
      expect(trajectory!.totalDistance).toBeGreaterThan(0);
      expect(trajectory!.averageSpeed).toBeGreaterThan(0);
    });

    it('should limit trajectory length', () => {
      // Add 5 points (more than maxTrajectoryPoints = 3)
      for (let i = 0; i < 5; i++) {
        processor.updateTrajectory(
          'person_001',
          [100 + i, 200 + i],
          [50 + i, 25 + i],
          'c09' as BackendCameraId,
          0.85,
          `2024-01-01T00:0${i}:00Z`
        );
      }

      const trajectory = processor.getTrajectory('person_001');
      expect(trajectory!.points).toHaveLength(3); // Should be limited to maxTrajectoryPoints
      expect(trajectory!.points[0].position).toEqual([52, 27]); // Should keep latest points
    });

    it('should calculate trajectory distance and speed', () => {
      const timestamps = [
        '2024-01-01T00:00:00Z',
        '2024-01-01T00:01:00Z', // 1 minute later
      ];

      processor.updateTrajectory(
        'person_001',
        [0, 0],
        [0, 0],
        'c09' as BackendCameraId,
        0.85,
        timestamps[0]
      );
      processor.updateTrajectory(
        'person_001',
        [10, 0],
        [3, 4],
        'c09' as BackendCameraId,
        0.85,
        timestamps[1]
      ); // Distance: 5

      const trajectory = processor.getTrajectory('person_001');
      expect(trajectory!.totalDistance).toBe(5);
      expect(trajectory!.averageSpeed).toBeCloseTo(5 / 60, 3); // 5 units per 60 seconds
    });

    it('should clear specific trajectory', () => {
      processor.updateTrajectory(
        'person_001',
        [100, 200],
        [50.5, 25.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );
      processor.updateTrajectory(
        'person_002',
        [150, 250],
        [60.5, 35.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );

      processor.clearTrajectory('person_001');

      expect(processor.getTrajectory('person_001')).toBeUndefined();
      expect(processor.getTrajectory('person_002')).toBeDefined();
    });

    it('should clear all trajectories', () => {
      processor.updateTrajectory(
        'person_001',
        [100, 200],
        [50.5, 25.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );
      processor.updateTrajectory(
        'person_002',
        [150, 250],
        [60.5, 35.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );

      processor.clearAllTrajectories();

      expect(processor.getAllTrajectories().size).toBe(0);
    });

    it('should skip trajectory updates when disabled', () => {
      const disabledProcessor = new TrajectoryProcessor({ enableTrajectoryTracking: false });

      disabledProcessor.updateTrajectory(
        'person_001',
        [100, 200],
        [50.5, 25.3],
        'c09' as BackendCameraId,
        0.85,
        '2024-01-01T00:00:00Z'
      );

      expect(disabledProcessor.getTrajectory('person_001')).toBeUndefined();
    });
  });

  describe('Data Validation', () => {
    describe('validateTrackingPayload', () => {
      const validPayload = {
        global_frame_index: 100,
        scene_id: 'factory',
        timestamp_processed_utc: '2024-01-01T00:00:00Z',
        cameras: {
          c09: {
            image_source: 's3://bucket/frame.jpg',
            tracks: [],
          },
        },
      };

      it('should validate correct payload', () => {
        expect(validateTrackingPayload(validPayload)).toBe(true);
      });

      it('should reject null or undefined payload', () => {
        expect(validateTrackingPayload(null)).toBe(false);
        expect(validateTrackingPayload(undefined)).toBe(false);
        expect(validateTrackingPayload('string')).toBe(false);
      });

      it('should reject payload missing required fields', () => {
        const invalidPayload = { ...validPayload };
        delete (invalidPayload as any).scene_id;
        expect(validateTrackingPayload(invalidPayload)).toBe(false);
      });

      it('should reject payload with invalid camera data', () => {
        const invalidPayload = {
          ...validPayload,
          cameras: {
            c09: {
              // Missing image_source
              tracks: [],
            },
          },
        };
        expect(validateTrackingPayload(invalidPayload)).toBe(false);
      });
    });

    describe('validatePersonTrack', () => {
      const validTrack = {
        track_id: 1,
        bbox_xyxy: [100, 100, 200, 200],
        class_id: 1,
      };

      it('should validate correct track', () => {
        expect(validatePersonTrack(validTrack)).toBe(true);
      });

      it('should reject track with invalid bbox', () => {
        const invalidTrack = {
          ...validTrack,
          bbox_xyxy: [100, 100, 200], // Wrong length
        };
        expect(validatePersonTrack(invalidTrack)).toBe(false);
      });

      it('should reject track with invalid confidence', () => {
        const invalidTrack = {
          ...validTrack,
          confidence: 'high', // Should be number
        };
        expect(validatePersonTrack(invalidTrack)).toBe(false);
      });

      it('should validate track with optional fields', () => {
        const trackWithOptionals = {
          ...validTrack,
          global_id: 'person_001',
          confidence: 0.85,
          map_coords: [50.5, 25.3],
        };
        expect(validatePersonTrack(trackWithOptionals)).toBe(true);
      });
    });
  });

  describe('Data Sanitization', () => {
    describe('sanitizePersonTrack', () => {
      it('should sanitize valid track', () => {
        const track = {
          track_id: 1,
          global_id: 'person_001',
          bbox_xyxy: [100, 100, 200, 200],
          confidence: 0.85,
          class_id: 1,
        };

        const sanitized = sanitizePersonTrack(track);
        expect(sanitized).toEqual(track);
      });

      it('should clamp confidence to valid range', () => {
        const track = {
          track_id: 1,
          bbox_xyxy: [100, 100, 200, 200],
          confidence: 1.5, // > 1
          class_id: 1,
        };

        const sanitized = sanitizePersonTrack(track);
        expect(sanitized!.confidence).toBe(1);
      });

      it('should clamp negative coordinates', () => {
        const track = {
          track_id: 1,
          bbox_xyxy: [-50, -30, 200, 200],
          class_id: 1,
        };

        const sanitized = sanitizePersonTrack(track);
        expect(sanitized!.bbox_xyxy).toEqual([0, 0, 200, 200]);
      });

      it('should return null for invalid track', () => {
        const invalidTrack = {
          track_id: 'invalid', // Should be number
          bbox_xyxy: [100, 100, 200, 200],
          class_id: 1,
        };

        const sanitized = sanitizePersonTrack(invalidTrack);
        expect(sanitized).toBeNull();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getTrackingStatistics', () => {
      const mockProcessedCameras = {
        c09: {
          cameraId: 'c09' as BackendCameraId,
          tracks: [
            { global_id: 'person_001', confidence: 0.8 } as any,
            { global_id: 'person_002', confidence: 0.9 } as any,
          ],
        } as CameraTrackingDisplayData,
        c12: {
          cameraId: 'c12' as BackendCameraId,
          tracks: [
            { global_id: 'person_001', confidence: 0.7 } as any, // Same person
          ],
        } as CameraTrackingDisplayData,
      };

      it('should calculate tracking statistics', () => {
        const stats = getTrackingStatistics(mockProcessedCameras);

        expect(stats.totalDetections).toBe(3);
        expect(stats.uniquePersons).toBe(2);
        expect(stats.averageConfidence).toBeCloseTo(0.8, 1);
        expect(stats.cameraStats.c09.detections).toBe(2);
        expect(stats.cameraStats.c09.avgConfidence).toBeCloseTo(0.85, 2);
        expect(stats.cameraStats.c12.detections).toBe(1);
        expect(stats.cameraStats.c12.avgConfidence).toBe(0.7);
      });
    });

    describe('findPersonAcrossCameras', () => {
      const mockProcessedCameras = {
        c09: {
          cameraId: 'c09' as BackendCameraId,
          tracks: [{ global_id: 'person_001' } as any, { global_id: 'person_002' } as any],
        } as CameraTrackingDisplayData,
        c12: {
          cameraId: 'c12' as BackendCameraId,
          tracks: [
            { global_id: 'person_001' } as any, // Same person
          ],
        } as CameraTrackingDisplayData,
      };

      it('should find person across cameras', () => {
        const results = findPersonAcrossCameras('person_001', mockProcessedCameras);

        expect(results).toHaveLength(2);
        expect(results[0].cameraId).toBe('c09');
        expect(results[1].cameraId).toBe('c12');
        expect(results[0].track.global_id).toBe('person_001');
        expect(results[1].track.global_id).toBe('person_001');
      });

      it('should return empty array for non-existent person', () => {
        const results = findPersonAcrossCameras('person_999', mockProcessedCameras);
        expect(results).toHaveLength(0);
      });
    });
  });

  describe('trackingDataUtils Export', () => {
    it('should export tracking data utilities object', () => {
      expect(trackingDataUtils).toBeDefined();
      expect(trackingDataUtils.process).toBeDefined();
      expect(trackingDataUtils.validate).toBeDefined();
      expect(trackingDataUtils.sanitize).toBeDefined();
      expect(trackingDataUtils.analyze).toBeDefined();
      expect(trackingDataUtils.trajectory).toBeDefined();
      expect(trackingDataUtils.colors).toBeDefined();
    });

    it('should have all expected process functions', () => {
      expect(trackingDataUtils.process.payload).toBe(processTrackingPayload);
      expect(trackingDataUtils.process.camera).toBe(processCameraData);
      expect(trackingDataUtils.process.person).toBe(processPersonTrack);
    });

    it('should have all expected validation functions', () => {
      expect(trackingDataUtils.validate.payload).toBe(validateTrackingPayload);
      expect(trackingDataUtils.validate.camera).toBe(validateCameraData);
      expect(trackingDataUtils.validate.person).toBe(validatePersonTrack);
    });

    it('should have all expected analysis functions', () => {
      expect(trackingDataUtils.analyze.statistics).toBe(getTrackingStatistics);
      expect(trackingDataUtils.analyze.findPerson).toBe(findPersonAcrossCameras);
    });
  });
});
