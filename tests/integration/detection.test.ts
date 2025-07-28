import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import GroupViewPage from '../../src/pages/GroupViewPage';
import { detectionAPI } from '../../src/services/detectionAPI';
import { websocketClient } from '../../src/services/websocket';

// Mock the APIs
jest.mock('../../src/services/detectionAPI');
jest.mock('../../src/services/websocket');
jest.mock('../../src/services/mappingAPI');

const mockDetectionAPI = detectionAPI as jest.Mocked<typeof detectionAPI>;
const mockWebsocketClient = websocketClient as jest.Mocked<typeof websocketClient>;

describe('Detection Integration Tests', () => {
  const mockDetections = [
    {
      id: 'det-1',
      personId: 'person-1',
      cameraId: 'camera-1',
      confidence: 0.95,
      boundingBox: { x: 100, y: 100, width: 200, height: 300 },
      timestamp: Date.now(),
      features: {},
      metadata: {}
    },
    {
      id: 'det-2',
      personId: 'person-2',
      cameraId: 'camera-2',
      confidence: 0.88,
      boundingBox: { x: 150, y: 150, width: 180, height: 280 },
      timestamp: Date.now(),
      features: {},
      metadata: {}
    }
  ];

  const mockCameras = [
    {
      id: 'camera-1',
      name: 'Camera 1',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      fieldOfView: 60,
      status: 'active' as const,
      stream: {
        url: 'ws://localhost:8080/camera/1',
        quality: 'high' as const,
        fps: 30
      }
    },
    {
      id: 'camera-2',
      name: 'Camera 2',
      position: { x: 10, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      fieldOfView: 60,
      status: 'active' as const,
      stream: {
        url: 'ws://localhost:8080/camera/2',
        quality: 'high' as const,
        fps: 30
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDetectionAPI.getDetections.mockResolvedValue({
      detections: mockDetections,
      pagination: {
        page: 1,
        limit: 10,
        total: mockDetections.length,
        totalPages: 1
      }
    });

    mockWebsocketClient.connect.mockResolvedValue();
    mockWebsocketClient.onMessage.mockImplementation((callback) => {
      // Simulate receiving real-time detection data
      setTimeout(() => {
        callback({
          type: 'detection',
          data: mockDetections[0]
        });
      }, 100);
    });
  });

  test('loads and displays detection data', async () => {
    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    // Wait for API calls
    await waitFor(() => {
      expect(mockDetectionAPI.getDetections).toHaveBeenCalled();
    });

    // Check that detections are displayed
    await waitFor(() => {
      expect(screen.getByText('2 detections')).toBeInTheDocument();
    });
  });

  test('handles real-time detection updates', async () => {
    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    // Wait for WebSocket connection
    await waitFor(() => {
      expect(mockWebsocketClient.connect).toHaveBeenCalled();
    });

    // Check that real-time updates are processed
    await waitFor(() => {
      expect(mockWebsocketClient.onMessage).toHaveBeenCalled();
    });
  });

  test('filters detections by confidence', async () => {
    mockDetectionAPI.getDetections.mockResolvedValue({
      detections: mockDetections.filter(d => d.confidence >= 0.9),
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    });

    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockDetectionAPI.getDetections).toHaveBeenCalledWith(
        expect.objectContaining({
          confidenceThreshold: expect.any(Number)
        })
      );
    });
  });

  test('handles detection API errors', async () => {
    mockDetectionAPI.getDetections.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading detections/i)).toBeInTheDocument();
    });
  });

  test('handles WebSocket connection errors', async () => {
    mockWebsocketClient.connect.mockRejectedValue(new Error('WebSocket Error'));

    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/connection error/i)).toBeInTheDocument();
    });
  });

  test('updates detection statistics', async () => {
    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('detection-count')).toHaveTextContent('2');
    });

    await waitFor(() => {
      expect(screen.getByTestId('average-confidence')).toHaveTextContent('91.5%');
    });
  });

  test('handles person selection across cameras', async () => {
    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockDetectionAPI.getDetections).toHaveBeenCalled();
    });

    // Simulate person selection
    const personOverlay = screen.getByTestId('detection-overlay');
    personOverlay.click();

    await waitFor(() => {
      expect(screen.getByTestId('selected-person')).toHaveTextContent('person-1');
    });
  });

  test('displays detection history', async () => {
    const mockHistory = [
      ...mockDetections,
      {
        id: 'det-3',
        personId: 'person-1',
        cameraId: 'camera-1',
        confidence: 0.92,
        boundingBox: { x: 120, y: 120, width: 200, height: 300 },
        timestamp: Date.now() - 1000,
        features: {},
        metadata: {}
      }
    ];

    mockDetectionAPI.getDetections.mockResolvedValue({
      detections: mockHistory,
      pagination: {
        page: 1,
        limit: 10,
        total: mockHistory.length,
        totalPages: 1
      }
    });

    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Detection History')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('3 detections')).toBeInTheDocument();
    });
  });

  test('handles detection data pagination', async () => {
    mockDetectionAPI.getDetections.mockResolvedValue({
      detections: mockDetections,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3
      }
    });

    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });
  });

  test('performance with high detection volume', async () => {
    const manyDetections = Array.from({ length: 1000 }, (_, i) => ({
      id: `det-${i}`,
      personId: `person-${i % 10}`,
      cameraId: `camera-${i % 4}`,
      confidence: 0.8 + (Math.random() * 0.2),
      boundingBox: { x: 100, y: 100, width: 200, height: 300 },
      timestamp: Date.now() - i * 1000,
      features: {},
      metadata: {}
    }));

    mockDetectionAPI.getDetections.mockResolvedValue({
      detections: manyDetections,
      pagination: {
        page: 1,
        limit: 100,
        total: 1000,
        totalPages: 10
      }
    });

    const startTime = Date.now();
    
    render(
      <BrowserRouter>
        <GroupViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1000 detections')).toBeInTheDocument();
    });

    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(2000); // Should render within 2 seconds
  });
});