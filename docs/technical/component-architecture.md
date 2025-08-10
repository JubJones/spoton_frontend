# SpotOn Frontend - Component Architecture Documentation

## Overview

This document provides comprehensive technical documentation for the SpotOn frontend component architecture. The application is built using React 19 with TypeScript and follows a modular component-based architecture optimized for real-time person tracking visualization.

## Architecture Principles

### Component Hierarchy
```
App (Router Container)
├── LandingPage (Environment Selection)
├── EnvironmentSelectionPage (Date/Time Selection)
├── GroupViewPage (Main Dashboard)
│   ├── CameraGrid (Multi-Camera Display)
│   │   ├── EnhancedImageSequencePlayer (Individual Camera)
│   │   └── PersonCroppedImages (Detection Thumbnails)
│   ├── TrackingMap (Spatial Visualization)
│   ├── PersonDetailPanel (Detailed Person Info)
│   ├── PlaybackControls (Timeline Controls)
│   └── Timeline (Temporal Navigation)
├── AnalyticsPage (Analytics Dashboard)
│   ├── AnalyticsCharts (Data Visualization)
│   ├── PersonStatistics (Person Metrics)
│   ├── TrafficHeatmap (Spatial Analytics)
│   ├── DwellTimeAnalysis (Temporal Analytics)
│   └── TrafficFlowAnalysis (Movement Analytics)
└── SettingsPage (Configuration Management)
    ├── SystemSettings (System Configuration)
    ├── CameraSettings (Camera Management)
    ├── UserPreferences (User Configuration)
    ├── AlertSettings (Notification Management)
    └── ExportSettings (Data Export Configuration)
```

### Design Patterns

#### Container-Presenter Pattern
```typescript
// Container Component (Data Logic)
const CameraGridContainer: React.FC = () => {
  const { cameras, selectedPersonId, isLoading } = useCameraStore();
  const { updateCameraFocus, selectPerson } = useCameraActions();

  return (
    <CameraGridPresenter
      cameras={cameras}
      selectedPersonId={selectedPersonId}
      isLoading={isLoading}
      onCameraFocus={updateCameraFocus}
      onPersonSelect={selectPerson}
    />
  );
};

// Presenter Component (UI Logic)
interface CameraGridPresenterProps {
  cameras: CameraData[];
  selectedPersonId?: string;
  isLoading: boolean;
  onCameraFocus: (cameraId: string) => void;
  onPersonSelect: (personId: string) => void;
}

const CameraGridPresenter: React.FC<CameraGridPresenterProps> = ({
  cameras,
  selectedPersonId,
  isLoading,
  onCameraFocus,
  onPersonSelect,
}) => {
  // UI rendering logic only
};
```

#### Custom Hook Pattern
```typescript
// Encapsulate complex logic in custom hooks
export const useWebSocketTracking = (taskId: string) => {
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>('disconnected');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const wsService = new WebSocketService();
    
    const connect = async () => {
      try {
        setConnectionStatus('connecting');
        await wsService.connect(`ws://localhost:8000/ws/tracking/${taskId}`);
        setConnectionStatus('connected');
      } catch (err) {
        setError(err as Error);
        setConnectionStatus('error');
      }
    };

    wsService.onTrackingUpdate((data) => {
      setTrackingData(data);
    });

    connect();

    return () => {
      wsService.disconnect();
    };
  }, [taskId]);

  return { connectionStatus, trackingData, error };
};
```

#### Higher-Order Component Pattern
```typescript
// Error boundary wrapper
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Usage
export const SafeCameraGrid = withErrorBoundary(CameraGrid);
```

## Core Components

### 1. EnhancedImageSequencePlayer

**Purpose**: Display individual camera feeds with person tracking overlays

**Key Features**:
- Base64 image display from WebSocket
- Bounding box overlay rendering
- Person ID and confidence display
- Click handlers for person selection
- Coordinate transformation and scaling

**Props Interface**:
```typescript
interface EnhancedImageSequencePlayerProps {
  cameraId: string;
  trackingData?: CameraTrackingData;
  selectedPersonIds?: Set<string>;
  onPersonSelect?: (personId: string, cameraId: string) => void;
  onImageLoad?: () => void;
  className?: string;
}

interface CameraTrackingData {
  image_source: string;
  frame_image_base64?: string;
  tracks: TrackedPerson[];
}

interface TrackedPerson {
  track_id: number;
  global_id?: string;
  bbox_xyxy: [number, number, number, number];
  confidence?: number;
  class_id?: number;
  map_coords?: [number, number];
}
```

**Implementation Highlights**:
```typescript
const EnhancedImageSequencePlayer: React.FC<EnhancedImageSequencePlayerProps> = ({
  cameraId,
  trackingData,
  selectedPersonIds = new Set(),
  onPersonSelect,
  onImageLoad,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle image loading and canvas rendering
  const handleImageLoad = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !trackingData?.tracks) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set canvas size to match display size
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    // Calculate scaling factors
    const scaleX = canvas.width / 1920; // Original resolution
    const scaleY = canvas.height / 1080;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    trackingData.tracks.forEach(track => {
      const [x1, y1, x2, y2] = track.bbox_xyxy;
      const scaledX = x1 * scaleX;
      const scaledY = y1 * scaleY;
      const scaledWidth = (x2 - x1) * scaleX;
      const scaledHeight = (y2 - y1) * scaleY;

      // Determine box style based on selection
      const isSelected = selectedPersonIds.has(track.global_id || track.track_id.toString());
      const strokeColor = isSelected ? '#ff0000' : '#00ff00';
      const lineWidth = isSelected ? 3 : 2;

      // Draw bounding box
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw person ID label
      const personId = track.global_id || track.track_id.toString();
      const fontSize = Math.max(12, Math.min(16, scaledWidth / 8));
      
      ctx.fillStyle = strokeColor;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillText(
        personId,
        scaledX,
        scaledY - 5
      );

      // Draw confidence score if available
      if (track.confidence !== undefined) {
        const confidence = Math.round(track.confidence * 100);
        ctx.fillText(
          `${confidence}%`,
          scaledX,
          scaledY + scaledHeight + 15
        );
      }
    });

    onImageLoad?.();
  }, [trackingData, selectedPersonIds, onImageLoad]);

  // Handle canvas clicks for person selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!trackingData?.tracks || !onPersonSelect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = canvas.width / 1920;
    const scaleY = canvas.height / 1080;

    // Check if click is within any bounding box
    for (const track of trackingData.tracks) {
      const [x1, y1, x2, y2] = track.bbox_xyxy;
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;

      if (clickX >= scaledX1 && clickX <= scaledX2 && 
          clickY >= scaledY1 && clickY <= scaledY2) {
        const personId = track.global_id || track.track_id.toString();
        onPersonSelect(personId, cameraId);
        break;
      }
    }
  }, [trackingData, onPersonSelect, cameraId]);

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imageRef}
        src={getImageSrc()}
        alt={`Camera ${cameraId}`}
        className="w-full h-auto"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
      />
    </div>
  );
};
```

### 2. TrackingMap Component

**Purpose**: Interactive map visualization for spatial person tracking

**Key Features**:
- Leaflet-based interactive map
- Real-time person position markers
- Color-coded person identification
- Camera position indicators
- Historical path visualization

**Props Interface**:
```typescript
interface TrackingMapProps {
  environment: 'campus' | 'factory';
  trackingData?: WebSocketTrackingMessagePayload;
  selectedPersonIds?: Set<string>;
  onPersonSelect?: (personId: string) => void;
  showHistoricalPaths?: boolean;
  className?: string;
}
```

**Implementation Architecture**:
```typescript
const TrackingMap: React.FC<TrackingMapProps> = ({
  environment,
  trackingData,
  selectedPersonIds = new Set(),
  onPersonSelect,
  showHistoricalPaths = false,
  className = "",
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const pathsRef = useRef<Map<string, L.Polyline>>(new Map());

  // Initialize map
  useEffect(() => {
    const mapContainer = document.getElementById('tracking-map');
    if (!mapContainer || mapRef.current) return;

    // Create map with environment-specific configuration
    const mapConfig = getEnvironmentMapConfig(environment);
    const map = L.map('tracking-map', {
      center: mapConfig.center,
      zoom: mapConfig.initialZoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
    });

    // Add tile layer or custom background
    L.tileLayer(mapConfig.tileUrl, {
      attribution: mapConfig.attribution,
    }).addTo(map);

    // Add camera position markers
    mapConfig.cameras.forEach(camera => {
      const cameraIcon = L.divIcon({
        className: 'camera-marker',
        html: `<div class="camera-icon">${camera.id}</div>`,
        iconSize: [30, 30],
      });

      L.marker(camera.position, { icon: cameraIcon })
        .bindPopup(`Camera ${camera.id}`)
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [environment]);

  // Update person markers
  useEffect(() => {
    if (!mapRef.current || !trackingData) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Collect all active person positions
    const activePersons = new Map<string, { position: L.LatLng; cameraId: string }>();

    Object.entries(trackingData.cameras).forEach(([cameraId, cameraData]) => {
      cameraData.tracks.forEach(track => {
        if (track.map_coords && track.global_id) {
          const [x, y] = track.map_coords;
          activePersons.set(track.global_id, {
            position: L.latLng(y, x),
            cameraId,
          });
        }
      });
    });

    // Remove markers for persons no longer active
    currentMarkers.forEach((marker, personId) => {
      if (!activePersons.has(personId)) {
        map.removeLayer(marker);
        currentMarkers.delete(personId);
      }
    });

    // Add or update markers for active persons
    activePersons.forEach(({ position, cameraId }, personId) => {
      const isSelected = selectedPersonIds.has(personId);
      const markerColor = getPersonColor(personId, isSelected);

      let marker = currentMarkers.get(personId);
      
      if (marker) {
        // Update existing marker position
        marker.setLatLng(position);
        updateMarkerStyle(marker, markerColor, isSelected);
      } else {
        // Create new marker
        const markerIcon = createPersonMarkerIcon(personId, markerColor, isSelected);
        marker = L.marker(position, { icon: markerIcon })
          .bindPopup(`Person ${personId} (Camera ${cameraId})`)
          .on('click', () => onPersonSelect?.(personId));

        marker.addTo(map);
        currentMarkers.set(personId, marker);
      }
    });
  }, [trackingData, selectedPersonIds, onPersonSelect]);

  return (
    <div className={`tracking-map-container ${className}`}>
      <div id="tracking-map" className="w-full h-full rounded-lg" />
    </div>
  );
};
```

### 3. State Management Architecture

**Store Structure**:
```typescript
// System Store
interface SystemState {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;

  // Task management
  currentTask: ProcessingTask | null;
  taskStatus: TaskStatus | null;

  // Environment configuration
  selectedEnvironment: 'campus' | 'factory' | null;
  selectedDateRange: DateRange | null;

  // System health
  systemHealth: SystemHealthResponse | null;
  lastHealthCheck: Date | null;
}

interface SystemActions {
  setConnectionStatus: (status: SystemState['connectionStatus']) => void;
  setCurrentTask: (task: ProcessingTask | null) => void;
  updateTaskStatus: (status: TaskStatus) => void;
  setSelectedEnvironment: (env: 'campus' | 'factory') => void;
  setDateRange: (range: DateRange) => void;
  updateSystemHealth: (health: SystemHealthResponse) => void;
  clearError: () => void;
}

// Tracking Store
interface TrackingState {
  // Real-time tracking data
  currentFrame: number;
  trackingData: WebSocketTrackingMessagePayload | null;
  
  // Person tracking
  allPersons: Map<string, PersonTrackingInfo>;
  selectedPersonIds: Set<string>;
  highlightedPersonId: string | null;
  
  // Camera data
  cameraData: Map<string, CameraTrackingData>;
  activeCameras: Set<string>;
  focusedCamera: string | null;
  
  // Historical data
  trackingHistory: TrackingDataPoint[];
  personPaths: Map<string, PersonPath>;
}

interface TrackingActions {
  updateTrackingData: (data: WebSocketTrackingMessagePayload) => void;
  selectPerson: (personId: string) => void;
  deselectPerson: (personId: string) => void;
  clearSelection: () => void;
  setHighlightedPerson: (personId: string | null) => void;
  focusCamera: (cameraId: string) => void;
  addToHistory: (dataPoint: TrackingDataPoint) => void;
  updatePersonPath: (personId: string, position: Position) => void;
  clearHistory: () => void;
}

// UI Store
interface UIState {
  // Layout and display
  isFullscreen: boolean;
  sidebarCollapsed: boolean;
  activePanel: 'none' | 'person-detail' | 'settings' | 'analytics';
  
  // Playback controls
  isPlaying: boolean;
  playbackSpeed: number;
  currentTimestamp: number;
  
  // User preferences
  showBoundingBoxes: boolean;
  showConfidenceScores: boolean;
  showPersonIds: boolean;
  showHistoricalPaths: boolean;
  mapOpacity: number;
  
  // Loading and error states
  loadingStates: Map<string, boolean>;
  errors: Map<string, string>;
}

interface UIActions {
  toggleFullscreen: () => void;
  toggleSidebar: () => void;
  setActivePanel: (panel: UIState['activePanel']) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  updateTimestamp: (timestamp: number) => void;
  updatePreference: <K extends keyof UIState>(key: K, value: UIState[K]) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
}
```

**Store Implementation Pattern**:
```typescript
export const useSystemStore = create<SystemState & SystemActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isConnected: false,
        connectionStatus: 'disconnected',
        lastError: null,
        currentTask: null,
        taskStatus: null,
        selectedEnvironment: null,
        selectedDateRange: null,
        systemHealth: null,
        lastHealthCheck: null,

        // Actions
        setConnectionStatus: (status) => {
          set({ connectionStatus: status, isConnected: status === 'connected' });
        },

        setCurrentTask: (task) => {
          set({ currentTask: task });
        },

        updateTaskStatus: (status) => {
          set({ taskStatus: status });
        },

        setSelectedEnvironment: (env) => {
          set({ selectedEnvironment: env });
        },

        setDateRange: (range) => {
          set({ selectedDateRange: range });
        },

        updateSystemHealth: (health) => {
          set({ 
            systemHealth: health, 
            lastHealthCheck: new Date() 
          });
        },

        clearError: () => {
          set({ lastError: null });
        },
      }),
      {
        name: 'spoton-system-store',
        partialize: (state) => ({
          selectedEnvironment: state.selectedEnvironment,
          selectedDateRange: state.selectedDateRange,
        }),
      }
    )
  )
);
```

## Performance Optimization Patterns

### 1. Component Memoization
```typescript
// Memoize expensive components
export const MemoizedCameraGrid = React.memo(CameraGrid, (prevProps, nextProps) => {
  return (
    prevProps.cameras === nextProps.cameras &&
    prevProps.selectedPersonIds.size === nextProps.selectedPersonIds.size &&
    Array.from(prevProps.selectedPersonIds).every(id => 
      nextProps.selectedPersonIds.has(id)
    )
  );
});

// Memoize expensive calculations
const useMemoizedTrackingData = (rawData: WebSocketTrackingMessagePayload | null) => {
  return useMemo(() => {
    if (!rawData) return null;

    return {
      ...rawData,
      processedTracks: Object.entries(rawData.cameras).reduce((acc, [cameraId, cameraData]) => {
        acc[cameraId] = cameraData.tracks.map(track => ({
          ...track,
          displayId: track.global_id || track.track_id.toString(),
          colorKey: getPersonColorKey(track.global_id || track.track_id.toString()),
        }));
        return acc;
      }, {} as Record<string, ProcessedTrack[]>),
    };
  }, [rawData]);
};
```

### 2. Virtual Scrolling for Large Data Sets
```typescript
const VirtualizedPersonList: React.FC<{ persons: PersonData[] }> = ({ persons }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);

  const ITEM_HEIGHT = 80;
  const VISIBLE_ITEMS = 10;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const newStartIndex = Math.floor(scrollTop / ITEM_HEIGHT);
      const newEndIndex = Math.min(
        newStartIndex + VISIBLE_ITEMS,
        persons.length
      );

      setStartIndex(newStartIndex);
      setEndIndex(newEndIndex);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [persons.length]);

  const visiblePersons = persons.slice(startIndex, endIndex);
  const totalHeight = persons.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  return (
    <div 
      ref={containerRef}
      className="overflow-auto h-full"
      style={{ height: '400px' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visiblePersons.map((person, index) => (
            <PersonListItem 
              key={`${startIndex + index}-${person.id}`}
              person={person}
              style={{ height: ITEM_HEIGHT }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 3. Efficient Canvas Rendering
```typescript
const useCanvasRenderer = (canvasRef: RefObject<HTMLCanvasElement>) => {
  const animationFrameRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);

  const renderFrame = useCallback((
    tracks: TrackedPerson[],
    imageSize: { width: number; height: number },
    timestamp: number
  ) => {
    // Throttle rendering to 60fps maximum
    if (timestamp - lastRenderTimeRef.current < 16.67) {
      animationFrameRef.current = requestAnimationFrame(() =>
        renderFrame(tracks, imageSize, timestamp)
      );
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    lastRenderTimeRef.current = timestamp;

    // Use efficient canvas operations
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Batch similar operations
    const selectedTracks = [];
    const unselectedTracks = [];
    
    tracks.forEach(track => {
      if (selectedPersonIds.has(track.global_id)) {
        selectedTracks.push(track);
      } else {
        unselectedTracks.push(track);
      }
    });

    // Render unselected tracks first (lower z-index)
    renderTracks(ctx, unselectedTracks, false, imageSize);
    // Render selected tracks on top
    renderTracks(ctx, selectedTracks, true, imageSize);
  }, []);

  const scheduleRender = useCallback((
    tracks: TrackedPerson[],
    imageSize: { width: number; height: number }
  ) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame((timestamp) =>
      renderFrame(tracks, imageSize, timestamp)
    );
  }, [renderFrame]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return scheduleRender;
};
```

## Testing Patterns

### Component Testing
```typescript
describe('EnhancedImageSequencePlayer', () => {
  const mockTrackingData: CameraTrackingData = {
    image_source: 'test-image.jpg',
    frame_image_base64: 'base64testdata',
    tracks: [
      {
        track_id: 1,
        global_id: 'person_1',
        bbox_xyxy: [100, 100, 200, 200],
        confidence: 0.95,
      },
    ],
  };

  it('renders camera feed with tracking overlays', async () => {
    render(
      <EnhancedImageSequencePlayer
        cameraId="camera1"
        trackingData={mockTrackingData}
        selectedPersonIds={new Set(['person_1'])}
        onPersonSelect={jest.fn()}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'Camera camera1');

    const canvas = screen.getByRole('img').nextElementSibling;
    expect(canvas).toHaveClass('cursor-crosshair');
  });

  it('handles person selection on bounding box click', async () => {
    const mockOnPersonSelect = jest.fn();
    
    render(
      <EnhancedImageSequencePlayer
        cameraId="camera1"
        trackingData={mockTrackingData}
        onPersonSelect={mockOnPersonSelect}
      />
    );

    const canvas = screen.getByRole('img').nextElementSibling as HTMLCanvasElement;
    
    // Simulate click within bounding box coordinates
    fireEvent.click(canvas, {
      clientX: 150, // Within bbox [100, 100, 200, 200]
      clientY: 150,
    });

    expect(mockOnPersonSelect).toHaveBeenCalledWith('person_1', 'camera1');
  });
});
```

### Integration Testing
```typescript
describe('Camera Grid Integration', () => {
  beforeEach(() => {
    // Mock WebSocket service
    jest.spyOn(WebSocketService.prototype, 'connect').mockResolvedValue();
    jest.spyOn(WebSocketService.prototype, 'onTrackingUpdate').mockImplementation(
      (handler) => {
        // Simulate tracking update after short delay
        setTimeout(() => {
          handler(mockTrackingUpdate);
        }, 100);
      }
    );
  });

  it('integrates WebSocket data with camera grid display', async () => {
    render(<GroupViewPage />);

    // Wait for WebSocket connection and data
    await waitFor(() => {
      expect(screen.getByText('Camera c09')).toBeInTheDocument();
    });

    // Verify tracking data is displayed
    await waitFor(() => {
      const canvas = screen.getAllByRole('img')[0].nextElementSibling;
      expect(canvas).toBeInTheDocument();
    });

    // Test person selection across components
    const firstCamera = screen.getAllByRole('img')[0].nextElementSibling as HTMLCanvasElement;
    fireEvent.click(firstCamera, { clientX: 150, clientY: 150 });

    // Verify selection is reflected in person detail panel
    await waitFor(() => {
      expect(screen.getByText('Selected Person:')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### 1. Type Safety
- Use strict TypeScript configuration
- Define comprehensive interfaces for all data structures
- Use branded types for domain-specific values
- Implement runtime type validation for external data

### 2. Performance
- Implement React.memo for expensive components
- Use useMemo and useCallback appropriately
- Implement virtual scrolling for large lists
- Use efficient canvas rendering techniques
- Monitor and profile component performance

### 3. Error Handling
- Implement error boundaries around major component trees
- Use try-catch blocks for async operations
- Provide user-friendly error messages
- Implement retry mechanisms for transient errors
- Log errors appropriately for debugging

### 4. Accessibility
- Use semantic HTML elements
- Implement proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers
- Support high contrast mode

### 5. Testing
- Write comprehensive unit tests for utilities
- Test component integration with state management
- Implement E2E tests for critical user journeys
- Mock external dependencies appropriately
- Maintain >80% test coverage for critical paths

This component architecture provides a scalable, maintainable foundation for the SpotOn frontend application while supporting real-time person tracking visualization requirements.