# SpotOn Frontend - Developer Onboarding Guide

## Welcome to SpotOn Frontend Development

This guide provides comprehensive onboarding information for developers joining the SpotOn frontend team. The SpotOn system is an intelligent multi-camera person tracking and analytics platform built with modern web technologies.

## Project Overview

### What is SpotOn?
SpotOn is a real-time person tracking and analytics system that processes video feeds from multiple cameras, performs AI-based person detection and re-identification, and provides interactive visualization through a web-based dashboard.

### Key Features
- **Real-time Tracking**: Live person detection and tracking across multiple cameras
- **Cross-Camera Re-identification**: Track individuals as they move between camera zones  
- **Interactive Visualization**: Map-based spatial tracking with historical path visualization
- **Analytics Dashboard**: Comprehensive metrics, heatmaps, and behavioral analysis
- **Multi-Environment Support**: Campus and factory environment configurations

### Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand
- **Maps**: Leaflet
- **Testing**: Vitest, React Testing Library, Playwright
- **Build Tools**: Vite, ESLint, Prettier

## Development Environment Setup

### Prerequisites
```bash
# Required software versions
Node.js >= 18.0.0
npm >= 8.0.0
Git >= 2.30.0

# Recommended tools
VS Code with extensions:
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- ESLint
- Prettier
```

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/your-org/spoton-frontend.git
cd spoton-frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.development

# Start development server
npm run dev
```

### Backend Dependencies
The frontend requires a running SpotOn backend service:

```bash
# Backend should be running at:
http://localhost:8000    # REST API
ws://localhost:8000      # WebSocket connection

# Verify backend health
curl http://localhost:8000/health
```

### Development Commands
```bash
# Development
npm run dev              # Start development server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality  
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run type-check      # TypeScript type checking

# Testing
npm test                # Run unit tests
npm test -- --coverage # Run tests with coverage
npx playwright test     # Run E2E tests
npx playwright test --ui # Run E2E tests with UI
```

## Project Architecture

### Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (buttons, inputs, etc.)
│   ├── accessibility/  # Accessibility-specific components
│   └── [feature]/      # Feature-specific components
├── pages/              # Route-based page components
│   ├── LandingPage.tsx
│   ├── GroupViewPage.tsx
│   ├── AnalyticsPage.tsx
│   └── SettingsPage.tsx
├── services/           # External service integrations
│   ├── apiService.ts   # REST API client
│   └── websocketService.ts # WebSocket client
├── stores/             # Zustand state management
│   ├── systemStore.ts  # Application state
│   ├── trackingStore.ts # Real-time tracking data
│   └── uiStore.ts      # UI interaction state
├── types/              # TypeScript type definitions
│   ├── api.ts          # Backend API types
│   ├── ui.ts           # UI-specific types
│   └── trackingData.ts # Tracking data types
├── utils/              # Utility functions
│   ├── coordinateTransform.ts
│   ├── trackingDataProcessor.ts
│   └── responsive.ts
├── hooks/              # Custom React hooks
├── config/             # Configuration files
└── App.tsx            # Main application component
```

### Component Architecture Patterns

#### Container-Presenter Pattern
```typescript
// Container: Handles data fetching and business logic
const CameraGridContainer: React.FC = () => {
  const { cameras, loading, error } = useCameraStore();
  const { selectPerson } = useTrackingActions();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <CameraGridPresenter 
      cameras={cameras}
      onPersonSelect={selectPerson}
    />
  );
};

// Presenter: Pure UI component
interface CameraGridPresenterProps {
  cameras: CameraData[];
  onPersonSelect: (personId: string) => void;
}

const CameraGridPresenter: React.FC<CameraGridPresenterProps> = ({
  cameras,
  onPersonSelect
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {cameras.map(camera => (
        <CameraView 
          key={camera.id}
          camera={camera}
          onPersonSelect={onPersonSelect}
        />
      ))}
    </div>
  );
};
```

#### Custom Hooks Pattern
```typescript
// Custom hook for WebSocket integration
export const useWebSocketTracking = (taskId: string) => {
  const [data, setData] = useState<TrackingData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  
  useEffect(() => {
    if (!taskId) return;
    
    const ws = new WebSocketService();
    
    ws.connect(`ws://localhost:8000/ws/tracking/${taskId}`)
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'));
    
    ws.onTrackingUpdate(setData);
    
    return () => ws.disconnect();
  }, [taskId]);
  
  return { data, status };
};

// Usage in component
const TrackingDashboard: React.FC = () => {
  const { currentTask } = useSystemStore();
  const { data, status } = useWebSocketTracking(currentTask?.task_id || '');
  
  return (
    <div>
      <ConnectionStatus status={status} />
      {data && <CameraGrid trackingData={data} />}
    </div>
  );
};
```

### State Management with Zustand
```typescript
// Store definition
interface TrackingState {
  trackingData: TrackingData | null;
  selectedPersonIds: Set<string>;
  highlightedPersonId: string | null;
}

interface TrackingActions {
  updateTrackingData: (data: TrackingData) => void;
  selectPerson: (personId: string) => void;
  clearSelection: () => void;
}

export const useTrackingStore = create<TrackingState & TrackingActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      trackingData: null,
      selectedPersonIds: new Set(),
      highlightedPersonId: null,
      
      // Actions
      updateTrackingData: (data) => set({ trackingData: data }),
      
      selectPerson: (personId) => set((state) => ({
        selectedPersonIds: new Set(state.selectedPersonIds).add(personId),
        highlightedPersonId: personId,
      })),
      
      clearSelection: () => set({
        selectedPersonIds: new Set(),
        highlightedPersonId: null,
      }),
    })
  )
);

// Usage in component
const PersonSelector: React.FC = () => {
  const { selectedPersonIds, selectPerson, clearSelection } = useTrackingStore();
  
  return (
    <div>
      <button onClick={() => selectPerson('person_1')}>
        Select Person 1
      </button>
      <button onClick={clearSelection}>
        Clear Selection ({selectedPersonIds.size} selected)
      </button>
    </div>
  );
};
```

## Key Concepts and Data Flow

### WebSocket Data Flow
```
Backend → WebSocket → Frontend
1. Backend processes video frames
2. Sends tracking updates via WebSocket
3. Frontend receives and processes updates
4. UI components render tracking data
5. User interactions sent back via WebSocket
```

### Tracking Data Structure
```typescript
interface WebSocketTrackingMessagePayload {
  global_frame_index: number;
  scene_id: 'campus' | 'factory';
  timestamp_processed_utc: string;
  cameras: {
    [camera_id: string]: CameraTrackingData;
  };
}

interface CameraTrackingData {
  image_source: string;
  frame_image_base64?: string;
  tracks: TrackedPerson[];
}

interface TrackedPerson {
  track_id: number;           // Camera-specific tracking ID
  global_id?: string;         // Cross-camera person ID
  bbox_xyxy: [number, number, number, number]; // Bounding box coordinates
  confidence?: number;        // Detection confidence (0-1)
  class_id?: number;         // Object class ID
  map_coords?: [number, number]; // Map position coordinates
}
```

### Coordinate Systems
The application works with multiple coordinate systems:

1. **Image Coordinates**: Original camera resolution (1920x1080)
2. **Display Coordinates**: Scaled for UI display
3. **Map Coordinates**: Real-world spatial coordinates
4. **Canvas Coordinates**: HTML5 Canvas rendering coordinates

```typescript
// Coordinate transformation example
const transformImageToDisplay = (
  imageCoords: [number, number],
  originalSize: { width: number; height: number },
  displaySize: { width: number; height: number }
): [number, number] => {
  const [x, y] = imageCoords;
  const scaleX = displaySize.width / originalSize.width;
  const scaleY = displaySize.height / originalSize.height;
  
  return [x * scaleX, y * scaleY];
};
```

## Development Workflows

### Feature Development Process
1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Implement Feature**: Follow component patterns and TypeScript conventions
3. **Add Tests**: Unit tests for utilities, integration tests for components
4. **Update Documentation**: Add JSDoc comments and update relevant docs
5. **Code Review**: Submit PR for team review
6. **Integration Testing**: Verify with backend integration
7. **Deployment**: Merge to main branch for deployment

### Code Style Guidelines

#### TypeScript Conventions
```typescript
// Use descriptive interfaces
interface PersonDetailPanelProps {
  personId: string;
  isVisible: boolean;
  onClose: () => void;
}

// Use proper error handling
const fetchPersonData = async (personId: string): Promise<PersonData> => {
  try {
    const response = await apiService.getPerson(personId);
    return response;
  } catch (error) {
    console.error(`Failed to fetch person ${personId}:`, error);
    throw new PersonDataError(`Unable to load person data: ${error.message}`);
  }
};

// Use proper typing for state
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<Error | null>(null);
const [data, setData] = useState<PersonData | null>(null);
```

#### Component Conventions
```typescript
// Use functional components with TypeScript
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
}

export const MyComponent: React.FC<ComponentProps> = ({
  required,
  optional = 0,
  children
}) => {
  // Use meaningful variable names
  const [isVisible, setIsVisible] = useState(false);
  
  // Group related useEffect hooks
  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    };
  }, []);
  
  // Use early returns for error states
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="component-container">
      {children}
    </div>
  );
};
```

#### CSS/Tailwind Conventions
```typescript
// Use consistent class ordering: layout → spacing → typography → colors → effects
const className = "flex flex-col gap-4 p-6 text-lg font-semibold text-gray-800 bg-white rounded-lg shadow-md";

// Use semantic color classes
const statusClasses = {
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

// Create reusable utility classes
const buttonVariants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};
```

### Testing Practices

#### Unit Testing with Vitest
```typescript
// Test utility functions
describe('coordinateTransform', () => {
  it('should correctly transform image coordinates to display coordinates', () => {
    const imageCoords: [number, number] = [960, 540]; // Center of 1920x1080
    const originalSize = { width: 1920, height: 1080 };
    const displaySize = { width: 640, height: 360 };
    
    const result = transformImageToDisplay(imageCoords, originalSize, displaySize);
    
    expect(result).toEqual([320, 180]); // Center of 640x360
  });
});

// Test components with mocked dependencies
describe('PersonDetailPanel', () => {
  it('should display person information when data is loaded', () => {
    const mockPerson: PersonData = {
      id: 'person_1',
      globalId: 'global_123',
      confidence: 0.95,
      firstSeen: new Date('2024-01-01T10:00:00Z'),
      lastSeen: new Date('2024-01-01T10:05:00Z'),
    };
    
    render(
      <PersonDetailPanel 
        personId="person_1"
        isVisible={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Person global_123')).toBeInTheDocument();
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
  });
});
```

#### Integration Testing with Playwright
```typescript
// Test user workflows
test('user can select environment and start tracking', async ({ page }) => {
  await page.goto('/');
  
  // Select campus environment
  await page.click('[data-testid="environment-campus"]');
  await expect(page.locator('[data-testid="environment-campus"]')).toHaveClass(/selected/);
  
  // Navigate to tracking view
  await page.click('[data-testid="start-tracking-button"]');
  await expect(page).toHaveURL(/.*group-view/);
  
  // Verify camera grid is displayed
  await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
});
```

## Common Patterns and Utilities

### Error Handling
```typescript
// Custom error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class WebSocketError extends Error {
  constructor(
    message: string,
    public code?: number,
    public reason?: string
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
    // Report to error monitoring service
    reportError(error, { errorInfo });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Performance Optimization
```typescript
// Memoized components
export const MemoizedCameraView = React.memo(
  CameraView,
  (prevProps, nextProps) => {
    return (
      prevProps.camera.id === nextProps.camera.id &&
      prevProps.trackingData === nextProps.trackingData &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

// Debounced handlers
const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const debouncedRef = useRef<ReturnType<typeof debounce>>();
  
  useEffect(() => {
    debouncedRef.current = debounce(callback, delay);
    return () => {
      debouncedRef.current?.cancel();
    };
  }, [callback, delay]);
  
  return debouncedRef.current as T;
};

// Usage
const handlePersonSearch = useDebouncedCallback((query: string) => {
  searchPersons(query);
}, 300);
```

### Accessibility Helpers
```typescript
// Screen reader announcements
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  
  document.body.appendChild(announcer);
  
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
};

// Focus management
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);
  
  return containerRef;
};
```

## Debugging and Troubleshooting

### Development Tools
- **React DevTools**: Browser extension for component inspection
- **Zustand DevTools**: State management debugging
- **Network Tab**: Monitor API calls and WebSocket connections
- **Console Logging**: Use structured logging with appropriate levels

### Common Issues and Solutions

#### WebSocket Connection Issues
```typescript
// Debug WebSocket connections
const debugWebSocket = (ws: WebSocket) => {
  ws.addEventListener('open', (event) => {
    console.log('WebSocket connected:', event);
  });
  
  ws.addEventListener('message', (event) => {
    console.log('WebSocket message received:', JSON.parse(event.data));
  });
  
  ws.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
  });
  
  ws.addEventListener('close', (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
  });
};
```

#### State Management Debugging
```typescript
// Add logging to store actions
const useTrackingStore = create<TrackingState & TrackingActions>()(
  devtools(
    (set, get) => ({
      updateTrackingData: (data) => {
        console.log('Updating tracking data:', data);
        set({ trackingData: data });
      },
      
      selectPerson: (personId) => {
        console.log('Selecting person:', personId);
        set((state) => ({
          selectedPersonIds: new Set(state.selectedPersonIds).add(personId),
        }));
      },
    }),
    { name: 'tracking-store' }
  )
);
```

### Performance Monitoring
```typescript
// Monitor component render performance
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    const renderStartTime = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - renderStartTime;
      console.log(`${Component.displayName || Component.name} rendered in ${renderTime}ms`);
    });
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  return WrappedComponent;
};
```

## Resources and References

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Vite Guide](https://vitejs.dev/guide)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Internal Resources
- **Project Wiki**: `/docs/README.md`
- **API Documentation**: `/docs/api-integration.md`
- **Component Architecture**: `/docs/component-architecture.md`
- **Deployment Guide**: `/docs/deployment-guide.md`

### Getting Help
- **Team Slack**: `#frontend-development`
- **Code Reviews**: Submit PRs with detailed descriptions
- **Pair Programming**: Schedule sessions with senior developers
- **Architecture Questions**: Reach out to the tech lead

### Next Steps for New Developers
1. **Set up development environment** following this guide
2. **Complete tutorial tasks** (see `/docs/tutorial-tasks.md`)
3. **Review existing codebase** focusing on major components
4. **Implement first feature** with code review and mentoring
5. **Participate in team rituals** (standups, retrospectives, planning)

Welcome to the team! We're excited to have you contribute to the SpotOn frontend development.