// Coordinate Transform Utilities Tests
// src/utils/__tests__/coordinateTransform.test.ts

import { describe, it, expect } from 'vitest';
import {
  transformImageCoordinates,
  transformBoundingBox,
  transformBoundingBoxes,
  transformCameraCoordinates,
  transformCameraBoundingBox,
  calculateScaleFactors,
  calculateUniformScale,
  calculateDisplaySize,
  getBoundingBoxCenter,
  getBoundingBoxSize,
  getBoundingBoxArea,
  isPointInBoundingBox,
  calculateBoundingBoxIoU,
  isValidPoint,
  isValidBoundingBox,
  isValidSize,
  clampPoint,
  clampBoundingBox,
  arrayToBoundingBox,
  boundingBoxToArray,
  arrayToPoint,
  pointToArray,
  getRelativePosition,
  elementToImageCoordinates,
  batchTransformPoints,
  coordinateUtils,
  Point2D,
  BoundingBox,
  Size,
} from '../coordinateTransform';

// Mock camera config
vi.mock('../../config/environments', () => ({
  getCameraConfig: vi.fn((cameraId: string) => ({
    resolution: [1920, 1080],
    homography_matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  })),
}));

describe('Coordinate Transform Utilities', () => {
  describe('Basic Coordinate Transformation', () => {
    const sourceSize: Size = { width: 1920, height: 1080 };
    const targetSize: Size = { width: 640, height: 360 };

    it('should transform point coordinates without aspect ratio', () => {
      const point: Point2D = { x: 960, y: 540 };

      const transformed = transformImageCoordinates(point, sourceSize, targetSize, false);

      expect(transformed).toEqual({ x: 320, y: 180 });
    });

    it('should transform point coordinates with aspect ratio preserved', () => {
      const point: Point2D = { x: 960, y: 540 };

      const transformed = transformImageCoordinates(point, sourceSize, targetSize, true);

      // Aspect ratio is the same, so should scale uniformly
      expect(transformed.x).toBeCloseTo(320, 1);
      expect(transformed.y).toBeCloseTo(180, 1);
    });

    it('should handle aspect ratio mismatch with letterboxing', () => {
      const squareSource: Size = { width: 100, height: 100 };
      const wideTarget: Size = { width: 200, height: 100 };
      const point: Point2D = { x: 50, y: 50 };

      const transformed = transformImageCoordinates(point, squareSource, wideTarget, true);

      // Should center the image with letterboxing
      expect(transformed.x).toBeCloseTo(100, 1); // Centered horizontally
      expect(transformed.y).toBeCloseTo(50, 1); // Scaled vertically
    });

    it('should throw error for invalid source size', () => {
      const point: Point2D = { x: 100, y: 100 };
      const invalidSource: Size = { width: 0, height: 100 };

      expect(() => transformImageCoordinates(point, invalidSource, targetSize)).toThrow(
        'Source size must be positive'
      );
    });

    it('should throw error for invalid target size', () => {
      const point: Point2D = { x: 100, y: 100 };
      const invalidTarget: Size = { width: 100, height: -1 };

      expect(() => transformImageCoordinates(point, sourceSize, invalidTarget)).toThrow(
        'Target size must be positive'
      );
    });
  });

  describe('Bounding Box Transformation', () => {
    const sourceSize: Size = { width: 1000, height: 1000 };
    const targetSize: Size = { width: 500, height: 500 };

    it('should transform bounding box coordinates', () => {
      const bbox: BoundingBox = { x1: 100, y1: 100, x2: 200, y2: 200 };

      const transformed = transformBoundingBox(bbox, sourceSize, targetSize);

      expect(transformed).toEqual({
        x1: 50,
        y1: 50,
        x2: 100,
        y2: 100,
      });
    });

    it('should transform array of bounding boxes', () => {
      const bboxes: BoundingBox[] = [
        { x1: 0, y1: 0, x2: 100, y2: 100 },
        { x1: 200, y1: 200, x2: 300, y2: 300 },
      ];

      const transformed = transformBoundingBoxes(bboxes, sourceSize, targetSize);

      expect(transformed).toEqual([
        { x1: 0, y1: 0, x2: 50, y2: 50 },
        { x1: 100, y1: 100, x2: 150, y2: 150 },
      ]);
    });

    it('should round coordinates to integers', () => {
      const bbox: BoundingBox = { x1: 33.3, y1: 66.7, x2: 133.3, y2: 166.7 };
      const oddSize: Size = { width: 333, height: 333 };

      const transformed = transformBoundingBox(bbox, sourceSize, oddSize);

      // All coordinates should be integers
      expect(Number.isInteger(transformed.x1)).toBe(true);
      expect(Number.isInteger(transformed.y1)).toBe(true);
      expect(Number.isInteger(transformed.x2)).toBe(true);
      expect(Number.isInteger(transformed.y2)).toBe(true);
    });
  });

  describe('Camera-Specific Transformations', () => {
    it('should transform camera coordinates', () => {
      const point: Point2D = { x: 960, y: 540 };
      const targetSize: Size = { width: 640, height: 360 };

      const transformed = transformCameraCoordinates(point, 'c09' as any, 'factory', targetSize);

      expect(transformed.x).toBeDefined();
      expect(transformed.y).toBeDefined();
    });

    it('should transform camera bounding box', () => {
      const bbox: BoundingBox = { x1: 100, y1: 100, x2: 200, y2: 200 };
      const targetSize: Size = { width: 640, height: 360 };

      const transformed = transformCameraBoundingBox(bbox, 'c09' as any, 'factory', targetSize);

      expect(transformed.x1).toBeDefined();
      expect(transformed.y1).toBeDefined();
      expect(transformed.x2).toBeDefined();
      expect(transformed.y2).toBeDefined();
    });
  });

  describe('Scaling Utilities', () => {
    it('should calculate scale factors', () => {
      const sourceSize: Size = { width: 1000, height: 800 };
      const targetSize: Size = { width: 500, height: 200 };

      const factors = calculateScaleFactors(sourceSize, targetSize);

      expect(factors).toEqual({ x: 0.5, y: 0.25 });
    });

    it('should calculate uniform scale factor', () => {
      const sourceSize: Size = { width: 1000, height: 800 };
      const targetSize: Size = { width: 500, height: 200 };

      const scale = calculateUniformScale(sourceSize, targetSize);

      // Should use the smaller scale factor to maintain aspect ratio
      expect(scale).toBe(0.25);
    });

    it('should calculate display size with aspect ratio preservation', () => {
      const sourceSize: Size = { width: 1920, height: 1080 };
      const maxSize: Size = { width: 800, height: 600 };

      const displaySize = calculateDisplaySize(sourceSize, maxSize);

      // Should maintain 16:9 aspect ratio
      expect(displaySize.width / displaySize.height).toBeCloseTo(1920 / 1080, 2);
      expect(displaySize.width).toBeLessThanOrEqual(800);
      expect(displaySize.height).toBeLessThanOrEqual(600);
    });
  });

  describe('Bounding Box Utilities', () => {
    const bbox: BoundingBox = { x1: 10, y1: 20, x2: 50, y2: 80 };

    it('should get bounding box center', () => {
      const center = getBoundingBoxCenter(bbox);
      expect(center).toEqual({ x: 30, y: 50 });
    });

    it('should get bounding box size', () => {
      const size = getBoundingBoxSize(bbox);
      expect(size).toEqual({ width: 40, height: 60 });
    });

    it('should calculate bounding box area', () => {
      const area = getBoundingBoxArea(bbox);
      expect(area).toBe(2400); // 40 * 60
    });

    it('should check if point is inside bounding box', () => {
      expect(isPointInBoundingBox({ x: 30, y: 50 }, bbox)).toBe(true);
      expect(isPointInBoundingBox({ x: 5, y: 50 }, bbox)).toBe(false);
      expect(isPointInBoundingBox({ x: 30, y: 10 }, bbox)).toBe(false);
    });

    it('should handle reversed bounding box coordinates', () => {
      const reversedBbox: BoundingBox = { x1: 50, y1: 80, x2: 10, y2: 20 };
      expect(isPointInBoundingBox({ x: 30, y: 50 }, reversedBbox)).toBe(true);
    });
  });

  describe('IoU Calculation', () => {
    it('should calculate IoU for overlapping boxes', () => {
      const bbox1: BoundingBox = { x1: 0, y1: 0, x2: 10, y2: 10 }; // Area: 100
      const bbox2: BoundingBox = { x1: 5, y1: 5, x2: 15, y2: 15 }; // Area: 100

      const iou = calculateBoundingBoxIoU(bbox1, bbox2);

      // Intersection area: 25 (5x5), Union area: 175, IoU: 25/175 ≈ 0.143
      expect(iou).toBeCloseTo(0.143, 3);
    });

    it('should return 0 for non-overlapping boxes', () => {
      const bbox1: BoundingBox = { x1: 0, y1: 0, x2: 5, y2: 5 };
      const bbox2: BoundingBox = { x1: 10, y1: 10, x2: 15, y2: 15 };

      const iou = calculateBoundingBoxIoU(bbox1, bbox2);
      expect(iou).toBe(0);
    });

    it('should return 1 for identical boxes', () => {
      const bbox: BoundingBox = { x1: 0, y1: 0, x2: 10, y2: 10 };

      const iou = calculateBoundingBoxIoU(bbox, bbox);
      expect(iou).toBe(1);
    });

    it('should handle touching boxes', () => {
      const bbox1: BoundingBox = { x1: 0, y1: 0, x2: 5, y2: 5 };
      const bbox2: BoundingBox = { x1: 5, y1: 5, x2: 10, y2: 10 };

      const iou = calculateBoundingBoxIoU(bbox1, bbox2);
      expect(iou).toBe(0); // Touching but not overlapping
    });
  });

  describe('Validation Functions', () => {
    it('should validate points', () => {
      expect(isValidPoint({ x: 10, y: 20 })).toBe(true);
      expect(isValidPoint({ x: NaN, y: 20 })).toBe(false);
      expect(isValidPoint({ x: 10, y: Infinity })).toBe(false);
      expect(isValidPoint({ x: 'invalid', y: 20 } as any)).toBe(false);
    });

    it('should validate bounding boxes', () => {
      expect(isValidBoundingBox({ x1: 0, y1: 0, x2: 10, y2: 10 })).toBe(true);
      expect(isValidBoundingBox({ x1: NaN, y1: 0, x2: 10, y2: 10 })).toBe(false);
      expect(isValidBoundingBox({ x1: 0, y1: 0, x2: Infinity, y2: 10 })).toBe(false);
    });

    it('should validate sizes', () => {
      expect(isValidSize({ width: 100, height: 200 })).toBe(true);
      expect(isValidSize({ width: 0, height: 200 })).toBe(false);
      expect(isValidSize({ width: -100, height: 200 })).toBe(false);
      expect(isValidSize({ width: NaN, height: 200 })).toBe(false);
    });
  });

  describe('Clamping Functions', () => {
    it('should clamp points to bounds', () => {
      const bounds: Size = { width: 100, height: 100 };

      expect(clampPoint({ x: 50, y: 50 }, bounds)).toEqual({ x: 50, y: 50 });
      expect(clampPoint({ x: -10, y: 50 }, bounds)).toEqual({ x: 0, y: 50 });
      expect(clampPoint({ x: 50, y: 150 }, bounds)).toEqual({ x: 50, y: 100 });
    });

    it('should clamp bounding boxes to bounds', () => {
      const bounds: Size = { width: 100, height: 100 };
      const bbox: BoundingBox = { x1: -10, y1: -10, x2: 150, y2: 150 };

      const clamped = clampBoundingBox(bbox, bounds);
      expect(clamped).toEqual({ x1: 0, y1: 0, x2: 100, y2: 100 });
    });
  });

  describe('Format Conversion', () => {
    it('should convert array to bounding box', () => {
      const coords: [number, number, number, number] = [10, 20, 30, 40];
      const bbox = arrayToBoundingBox(coords);
      expect(bbox).toEqual({ x1: 10, y1: 20, x2: 30, y2: 40 });
    });

    it('should convert bounding box to array', () => {
      const bbox: BoundingBox = { x1: 10, y1: 20, x2: 30, y2: 40 };
      const coords = boundingBoxToArray(bbox);
      expect(coords).toEqual([10, 20, 30, 40]);
    });

    it('should convert array to point', () => {
      const coords: [number, number] = [10, 20];
      const point = arrayToPoint(coords);
      expect(point).toEqual({ x: 10, y: 20 });
    });

    it('should convert point to array', () => {
      const point: Point2D = { x: 10, y: 20 };
      const coords = pointToArray(point);
      expect(coords).toEqual([10, 20]);
    });
  });

  describe('DOM Utilities', () => {
    it('should get relative position from mouse event', () => {
      // Mock element and event
      const mockElement = {
        getBoundingClientRect: () => ({ left: 100, top: 50 }),
      } as HTMLElement;

      const mockEvent = {
        clientX: 150,
        clientY: 100,
      } as MouseEvent;

      const position = getRelativePosition(mockEvent, mockElement);
      expect(position).toEqual({ x: 50, y: 50 });
    });

    it('should get relative position from touch event', () => {
      const mockElement = {
        getBoundingClientRect: () => ({ left: 100, top: 50 }),
      } as HTMLElement;

      const mockEvent = {
        touches: [{ clientX: 150, clientY: 100 }],
      } as TouchEvent;

      const position = getRelativePosition(mockEvent, mockElement);
      expect(position).toEqual({ x: 50, y: 50 });
    });

    it('should convert element coordinates to image coordinates', () => {
      const elementPoint: Point2D = { x: 100, y: 50 };
      const elementSize: Size = { width: 200, height: 100 };
      const imageSize: Size = { width: 400, height: 200 };

      const imagePoint = elementToImageCoordinates(elementPoint, elementSize, imageSize, false);

      expect(imagePoint).toEqual({ x: 200, y: 100 });
    });
  });

  describe('Performance Utilities', () => {
    it('should batch transform multiple points', () => {
      const points: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 200 },
      ];
      const sourceSize: Size = { width: 400, height: 400 };
      const targetSize: Size = { width: 200, height: 200 };

      const transformed = batchTransformPoints(points, sourceSize, targetSize, false);

      expect(transformed).toEqual([
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ]);
    });

    it('should batch transform with aspect ratio preservation', () => {
      const points: Point2D[] = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
      ];
      const sourceSize: Size = { width: 400, height: 400 };
      const targetSize: Size = { width: 200, height: 200 };

      const transformed = batchTransformPoints(points, sourceSize, targetSize, true);

      // Should scale uniformly
      expect(transformed[0].x).toBeCloseTo(50, 1);
      expect(transformed[0].y).toBeCloseTo(50, 1);
      expect(transformed[1].x).toBeCloseTo(100, 1);
      expect(transformed[1].y).toBeCloseTo(100, 1);
    });
  });

  describe('Coordinate Utils Export', () => {
    it('should export coordinate utilities object', () => {
      expect(coordinateUtils).toBeDefined();
      expect(coordinateUtils.transform).toBeDefined();
      expect(coordinateUtils.calculate).toBeDefined();
      expect(coordinateUtils.bbox).toBeDefined();
      expect(coordinateUtils.validate).toBeDefined();
      expect(coordinateUtils.clamp).toBeDefined();
      expect(coordinateUtils.convert).toBeDefined();
      expect(coordinateUtils.dom).toBeDefined();
      expect(coordinateUtils.performance).toBeDefined();
    });

    it('should have all expected transform functions', () => {
      expect(coordinateUtils.transform.point).toBe(transformImageCoordinates);
      expect(coordinateUtils.transform.bbox).toBe(transformBoundingBox);
      expect(coordinateUtils.transform.bboxes).toBe(transformBoundingBoxes);
      expect(coordinateUtils.transform.camera).toBe(transformCameraCoordinates);
      expect(coordinateUtils.transform.cameraBbox).toBe(transformCameraBoundingBox);
    });

    it('should have all expected calculation functions', () => {
      expect(coordinateUtils.calculate.scaleFactors).toBe(calculateScaleFactors);
      expect(coordinateUtils.calculate.uniformScale).toBe(calculateUniformScale);
      expect(coordinateUtils.calculate.displaySize).toBe(calculateDisplaySize);
    });

    it('should have all expected bbox functions', () => {
      expect(coordinateUtils.bbox.center).toBe(getBoundingBoxCenter);
      expect(coordinateUtils.bbox.size).toBe(getBoundingBoxSize);
      expect(coordinateUtils.bbox.area).toBe(getBoundingBoxArea);
      expect(coordinateUtils.bbox.contains).toBe(isPointInBoundingBox);
      expect(coordinateUtils.bbox.iou).toBe(calculateBoundingBoxIoU);
    });
  });
});
