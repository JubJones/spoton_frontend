// Test setup file for Vitest + React Testing Library
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebSocket for testing
const MockWebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 0, // CONNECTING
}));

// Add static constants to the mock
Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

global.WebSocket = MockWebSocket as any;

// Mock URL.createObjectURL for image testing
global.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock canvas for image processing tests
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
});

// Mock console methods to reduce test noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Keep error and warn for important messages
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

// Suppress React Router warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: React Router')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Add custom matchers
expect.extend({
  toBeInTheDocument: (received: any) => {
    const pass = received && document.body.contains(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be in the document`
          : `Expected element to be in the document`,
    };
  },
});

// Global test utilities
export const createMockWebSocket = () => {
  const mockWebSocket = {
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.CONNECTING,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
    url: 'ws://localhost:8000/test',
    protocol: '',
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  };

  return mockWebSocket;
};

export const createMockTrackingData = () => ({
  global_frame_index: 1,
  scene_id: 'factory' as const,
  timestamp_processed_utc: '2024-01-01T12:00:00Z',
  cameras: {
    c09: {
      image_source: 'frame_001.jpg',
      tracks: [
        {
          track_id: 1,
          global_id: 'person-1',
          bbox_xyxy: [100, 100, 200, 300] as [number, number, number, number],
          confidence: 0.85,
          class_id: 1,
          map_coords: [10.5, 20.3] as [number, number],
        },
      ],
    },
  },
});

export const createMockSystemHealth = () => ({
  status: 'healthy' as const,
  detector_model_status: 'loaded' as const,
  tracker_factory_status: 'ready' as const,
  homography_matrices_status: 'loaded' as const,
  timestamp: new Date().toISOString(),
});

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): any;
  }
}
