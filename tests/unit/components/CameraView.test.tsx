import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CameraView from '../../../src/components/detection/CameraView';

// Mock the camera API
jest.mock('../../../src/services/detectionAPI', () => ({
  detectionAPI: {
    getCameraFeed: jest.fn(),
    getDetections: jest.fn()
  }
}));

// Mock WebSocket
jest.mock('../../../src/services/websocket', () => ({
  websocketClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    onMessage: jest.fn(),
    sendMessage: jest.fn()
  }
}));

describe('CameraView Component', () => {
  const mockCamera = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders camera view with title', () => {
    render(<CameraView camera={mockCamera} />);
    
    expect(screen.getByText('Camera 1')).toBeInTheDocument();
    expect(screen.getByTestId('camera-feed')).toBeInTheDocument();
  });

  test('displays camera status', () => {
    render(<CameraView camera={mockCamera} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('handles camera feed click', async () => {
    const mockOnCameraClick = jest.fn();
    render(<CameraView camera={mockCamera} onCameraClick={mockOnCameraClick} />);
    
    fireEvent.click(screen.getByTestId('camera-feed'));
    
    await waitFor(() => {
      expect(mockOnCameraClick).toHaveBeenCalledWith(mockCamera.id);
    });
  });

  test('displays detection overlays', () => {
    const mockDetections = [
      {
        id: 'det-1',
        personId: 'person-1',
        confidence: 0.95,
        boundingBox: { x: 100, y: 100, width: 200, height: 300 },
        timestamp: Date.now()
      }
    ];

    render(<CameraView camera={mockCamera} detections={mockDetections} />);
    
    expect(screen.getByTestId('detection-overlay')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  test('handles camera disconnection', () => {
    const disconnectedCamera = { ...mockCamera, status: 'disconnected' as const };
    render(<CameraView camera={disconnectedCamera} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByTestId('camera-error')).toBeInTheDocument();
  });

  test('displays FPS counter', () => {
    render(<CameraView camera={mockCamera} showFPS={true} />);
    
    expect(screen.getByTestId('fps-counter')).toBeInTheDocument();
  });

  test('handles fullscreen toggle', async () => {
    const mockRequestFullscreen = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      value: mockRequestFullscreen,
      writable: true
    });

    render(<CameraView camera={mockCamera} />);
    
    fireEvent.click(screen.getByTestId('fullscreen-button'));
    
    await waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });
  });

  test('displays loading state', () => {
    render(<CameraView camera={mockCamera} loading={true} />);
    
    expect(screen.getByTestId('camera-loading')).toBeInTheDocument();
  });

  test('handles person selection', async () => {
    const mockOnPersonSelect = jest.fn();
    const mockDetections = [
      {
        id: 'det-1',
        personId: 'person-1',
        confidence: 0.95,
        boundingBox: { x: 100, y: 100, width: 200, height: 300 },
        timestamp: Date.now()
      }
    ];

    render(
      <CameraView 
        camera={mockCamera} 
        detections={mockDetections}
        onPersonSelect={mockOnPersonSelect}
      />
    );
    
    fireEvent.click(screen.getByTestId('detection-overlay'));
    
    await waitFor(() => {
      expect(mockOnPersonSelect).toHaveBeenCalledWith('person-1');
    });
  });

  test('displays camera controls', () => {
    render(<CameraView camera={mockCamera} showControls={true} />);
    
    expect(screen.getByTestId('camera-controls')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-in-button')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-out-button')).toBeInTheDocument();
  });

  test('handles zoom controls', async () => {
    const mockOnZoom = jest.fn();
    render(
      <CameraView 
        camera={mockCamera} 
        showControls={true}
        onZoom={mockOnZoom}
      />
    );
    
    fireEvent.click(screen.getByTestId('zoom-in-button'));
    
    await waitFor(() => {
      expect(mockOnZoom).toHaveBeenCalledWith('in');
    });
  });
});