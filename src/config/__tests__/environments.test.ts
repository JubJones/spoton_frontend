// Configuration Tests
// src/config/__tests__/environments.test.ts

import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_CONFIGS,
  CAMERA_MAPPINGS,
  getBackendCameraId,
  getFrontendCameraId,
  validateAllEnvironmentConfigs,
  getAllCameraIds,
} from '../environments';
import { isValidEnvironmentId } from '../../types/api';

describe('Environment Configuration', () => {
  describe('Environment Configs', () => {
    it('should have factory and campus environments', () => {
      expect(ENVIRONMENT_CONFIGS).toHaveProperty('factory');
      expect(ENVIRONMENT_CONFIGS).toHaveProperty('campus');
    });

    it('should have valid environment IDs', () => {
      expect(isValidEnvironmentId('factory')).toBe(true);
      expect(isValidEnvironmentId('campus')).toBe(true);
      expect(isValidEnvironmentId('invalid')).toBe(false);
    });

    it('should have 4 cameras per environment', () => {
      expect(ENVIRONMENT_CONFIGS.factory.cameras).toHaveLength(4);
      expect(ENVIRONMENT_CONFIGS.campus.cameras).toHaveLength(4);
    });
  });

  describe('Camera Mappings', () => {
    it('should have correct camera mappings for factory', () => {
      expect(CAMERA_MAPPINGS.factory).toEqual({
        camera1: 'c09',
        camera2: 'c12',
        camera3: 'c13',
        camera4: 'c16',
      });
    });

    it('should have correct camera mappings for campus', () => {
      expect(CAMERA_MAPPINGS.campus).toEqual({
        camera1: 'c01',
        camera2: 'c02',
        camera3: 'c03',
        camera4: 'c05',
      });
    });

    it('should convert frontend to backend camera IDs', () => {
      expect(getBackendCameraId('camera1', 'factory')).toBe('c09');
      expect(getBackendCameraId('camera1', 'campus')).toBe('c01');
    });

    it('should convert backend to frontend camera IDs', () => {
      expect(getFrontendCameraId('c09', 'factory')).toBe('camera1');
      expect(getFrontendCameraId('c01', 'campus')).toBe('camera1');
    });
  });

  describe('Validation', () => {
    it('should validate all environment configurations', () => {
      expect(validateAllEnvironmentConfigs()).toBe(true);
    });

    it('should return all camera IDs', () => {
      const allIds = getAllCameraIds();
      expect(allIds).toContain('c09');
      expect(allIds).toContain('c01');
      expect(allIds).toHaveLength(8);
    });
  });
});
