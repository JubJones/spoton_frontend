# SpotOn Frontend System Design

## 1. Introduction

This document outlines the architecture for the SpotOn frontend application. The frontend is a **real-time multi-camera tracking visualization system** built with React and TypeScript, designed to display live person tracking data from up to 4 cameras at <10 FPS with minimal latency.

The primary goals of this frontend design are:
*   **Real-Time Performance:** Optimized for <10 FPS streaming with immediate frame display
*   **Responsive Design:** Adaptive UI that works across desktop and tablet devices
*   **Scalable Architecture:** Component-based design for easy extension and maintenance
*   **User Experience:** Intuitive interface for security and analytics professionals
*   **Performance:** Efficient binary data handling and GPU-accelerated rendering where possible
*   **Reliability:** Robust WebSocket management with automatic reconnection

## 2. High-Level Architecture

The frontend follows a modern React architecture with real-time streaming capabilities, optimized for performance and maintainability.

### Core System Components:
1.  **Real-Time Streaming Layer:** Binary WebSocket handling with frame synchronization
2.  **State Management:** Zustand-based global state with real-time updates
3.  **Component Architecture:** Modular React components with TypeScript
4.  **Visualization Engine:** Canvas-based rendering for tracking overlays and maps
5.  **Performance Optimization:** Frame skipping, adaptive quality, and memory management

## 3. Technology Stack

### Core Technologies:
*   **Framework:** React 18.2 (downgraded from 19 for stability)
*   **Language:** TypeScript 5.7 with strict typing
*   **Build Tool:** Vite 6.2 with hot module replacement
*   **Styling:** Tailwind CSS 3.4 for responsive design
*   **Routing:** React Router DOM 7.5 for SPA navigation

### Real-Time & Performance:
*   **WebSocket:** Native WebSocket API with binary message support
*   **State Management:** Zustand 4.x for lightweight global state
*   **Visualization:** Leaflet.js for interactive maps + Canvas for overlays
*   **Performance:** React.memo, useMemo, useCallback for optimization

### Development Tools:
*   **Linting:** ESLint 9.x with TypeScript rules
*   **Testing:** Vitest (planned) for unit and integration testing
*   **Hot Reload:** Vite dev server with fast refresh
*   **Build:** Vite production build with code splitting

## 4. Architecture Patterns

### Component Architecture:
*   **Atomic Design:** Atoms → Molecules → Organisms → Templates → Pages
*   **Composition Pattern:** Flexible component composition over inheritance
*   **Render Props:** For complex data sharing between components
*   **Custom Hooks:** Reusable logic extraction for real-time features

### State Management Pattern:
*   **Zustand Store:** Lightweight alternative to Redux for global state
*   **Local State:** React useState for component-specific state
*   **Derived State:** Computed values using useMemo for performance
*   **Real-Time Updates:** WebSocket integration with state synchronization

### Performance Patterns:
*   **Memoization:** React.memo for expensive component renders
*   **Lazy Loading:** React.lazy for code splitting and route-based loading
*   **Virtual Scrolling:** For large lists (future enhancement)
*   **Frame Skipping:** Drop frames when rendering falls behind

## 5. Project Structure

```
spoton_frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── atoms/          # Basic UI elements (Button, Input, etc.)
│   │   ├── molecules/      # Component combinations (CameraView, TrackingOverlay)
│   │   ├── organisms/      # Complex components (CameraGrid, MapView)
│   │   └── templates/      # Page layouts and structures
│   ├── pages/              # Route-based page components
│   │   ├── LandingPage.tsx
│   │   ├── GroupViewPage.tsx
│   │   └── DetailViewPage.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useWebSocket.ts
│   │   ├── useRealTimeData.ts
│   │   └── usePerformanceMonitor.ts
│   ├── stores/             # Zustand state management
│   │   ├── appStore.ts
│   │   ├── cameraStore.ts
│   │   └── trackingStore.ts
│   ├── services/           # API and WebSocket services
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── frameProcessor.ts
│   ├── types/              # TypeScript type definitions
│   │   ├── tracking.ts
│   │   ├── camera.ts
│   │   └── websocket.ts
│   ├── utils/              # Utility functions
│   │   ├── frameSync.ts
│   │   ├── performance.ts
│   │   └── formatters.ts
│   └── assets/             # Static assets
├── public/                 # Static files
├── tests/                  # Test files (planned)
└── docs/                   # Documentation
```

## 6. Real-Time Data Flow

### WebSocket Communication Strategy:
1.  **Connection Management:**
    *   Automatic reconnection with exponential backoff
    *   Health check polling before connection attempts
    *   Connection state tracking and user feedback

2.  **Binary Message Handling:**
    ```typescript
    interface BinaryFrameMessage {
      camera_id: string;
      frame_index: number;
      jpeg_data: ArrayBuffer;
    }
    
    interface TrackingMetadata {
      type: 'tracking_update';
      global_frame_index: number;
      scene_id: string;
      timestamp_processed_utc: string;
      cameras: {
        [camera_id: string]: {
          tracks: TrackedPerson[];
        };
      };
    }
    ```

3.  **Frame Synchronization:**
    *   Frame index-based synchronization across cameras
    *   Automatic frame skipping if rendering falls behind
    *   Performance monitoring and adaptive quality

### State Management with Zustand:
```typescript
interface AppState {
  // Connection state
  wsConnection: WebSocketConnection | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Camera data
  cameras: CameraState[];
  currentFrameIndex: number;
  
  // Tracking data
  trackingData: TrackingFrame[];
  selectedPersonId: number | null;
  
  // UI state
  activeTab: 'all' | string;
  isPlaying: boolean;
  
  // Performance metrics
  frameRate: number;
  droppedFrames: number;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  updateFrame: (frameData: FrameData) => void;
  selectPerson: (personId: number) => void;
}
```

## 7. Component Architecture

### Page Components:

#### LandingPage (Environment Selection):
*   **Purpose:** Environment and time range selection
*   **Features:** Campus/Factory selection, date/time picker
*   **Navigation:** Routes to GroupViewPage with parameters

#### GroupViewPage (Multi-Camera View):
*   **Purpose:** Main tracking interface with 4-camera grid
*   **Features:** 
    *   Real-time camera feeds with tracking overlays
    *   Interactive 2D map with person locations
    *   Detection statistics and controls
    *   Tab-based camera switching
*   **Performance:** Optimized for simultaneous 4-camera rendering

#### DetailViewPage (Single Camera Focus):
*   **Purpose:** Detailed view of single camera with enhanced controls
*   **Features:**
    *   Full-screen camera view with detailed tracking
    *   Person history and path visualization
    *   Advanced analytics and export options

### Core Components:

#### CameraView Component:
```typescript
interface CameraViewProps {
  cameraId: string;
  streamUrl?: string;
  tracks: TrackedPerson[];
  onPersonSelect: (personId: number) => void;
  showOverlays: boolean;
  className?: string;
}
```

#### TrackingOverlay Component:
```typescript
interface TrackingOverlayProps {
  tracks: TrackedPerson[];
  imageSize: { width: number; height: number };
  onPersonClick: (personId: number) => void;
  selectedPersonId?: number;
}
```

#### MapView Component:
```typescript
interface MapViewProps {
  cameras: CameraPosition[];
  trackingData: GlobalTrackingData;
  selectedPersonId?: number;
  onPersonSelect: (personId: number) => void;
}
```

## 8. Performance Optimization

### Rendering Optimization:
*   **Frame Skipping:** Drop frames when rendering falls behind target FPS
*   **Memoization:** React.memo for expensive camera views
*   **Canvas Optimization:** Efficient overlay rendering with requestAnimationFrame
*   **Image Optimization:** Adaptive JPEG quality based on performance

### Memory Management:
*   **Frame Buffer:** Limited frame history to prevent memory leaks
*   **Garbage Collection:** Explicit cleanup of binary data and image objects
*   **Component Unmounting:** Proper cleanup of WebSocket connections and timers

### Network Optimization:
*   **Binary Streaming:** Direct binary data handling without base64 conversion
*   **Connection Pooling:** Reuse WebSocket connections across components
*   **Adaptive Quality:** Request lower quality frames under poor network conditions

## 9. Real-Time Features

### WebSocket Integration:
```typescript
// Custom hook for real-time data
export const useRealTimeData = () => {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [frameData, setFrameData] = useState<FrameData[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(WEBSOCKET_URL);
    
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Handle binary frame data
        handleBinaryFrame(event.data);
      } else {
        // Handle JSON metadata
        const metadata = JSON.parse(event.data);
        handleTrackingMetadata(metadata);
      }
    };
    
    return () => ws.close();
  }, []);
  
  return { frameData, connectionStatus };
};
```

### Frame Synchronization:
*   **Global Frame Index:** Synchronize cameras using backend-provided frame indices
*   **Timestamp Correlation:** Handle clock drift and network delays
*   **Adaptive Sync:** Maintain synchronization even with frame drops

## 10. User Experience Design

### Responsive Design:
*   **Desktop First:** Optimized for 1920x1080 and higher resolutions
*   **Tablet Support:** Responsive layout for iPad and similar devices
*   **Mobile Considerations:** Basic support for mobile viewing (future enhancement)

### Interactive Features:
*   **Click-to-Track:** Click on person to follow across cameras
*   **Zoom and Pan:** Interactive map navigation
*   **Playback Controls:** Play/pause, speed control, timeline scrubbing
*   **Export Functions:** Screenshot capture and data export

### Accessibility:
*   **WCAG 2.1 AA:** Compliance with accessibility standards
*   **Keyboard Navigation:** Full keyboard support for all features
*   **Screen Reader:** Proper ARIA labels and semantic HTML
*   **Color Contrast:** High contrast mode for better visibility

## 11. Development and Testing

### Development Environment:
*   **Hot Reload:** Vite dev server with fast refresh
*   **Type Safety:** Strict TypeScript configuration
*   **Code Quality:** ESLint and Prettier for consistent formatting
*   **Performance Monitoring:** Built-in performance profiling

### Testing Strategy:
*   **Unit Tests:** Component testing with Vitest
*   **Integration Tests:** WebSocket and API integration testing
*   **E2E Tests:** Playwright for full workflow testing
*   **Performance Tests:** Frame rate and memory usage testing

### Build and Deployment:
*   **Production Build:** Optimized Vite build with code splitting
*   **Static Hosting:** Nginx serving with reverse proxy to backend
*   **Docker Support:** Containerized development and deployment
*   **CI/CD:** Automated testing and deployment pipeline

## 12. Future Enhancements

### Performance Improvements:
*   **WebGL Rendering:** GPU-accelerated overlay rendering
*   **WebRTC Integration:** Lower latency streaming for critical applications
*   **Service Workers:** Background processing and caching
*   **Web Assembly:** High-performance image processing

### Feature Additions:
*   **Multi-Session Support:** Multiple concurrent tracking sessions
*   **Advanced Analytics:** Person behavior analysis and reporting
*   **Mobile App:** React Native mobile application
*   **AI Insights:** Integration with ML models for predictive analytics

### Scalability:
*   **Micro-Frontend:** Component federation for larger applications
*   **Edge Computing:** CDN-based streaming for global deployment
*   **Real-Time Collaboration:** Multi-user tracking and annotations
*   **Cloud Integration:** AWS/GCP cloud-native deployment

## 13. Security Considerations

### Data Security:
*   **WebSocket Security:** WSS (WebSocket Secure) for production
*   **Authentication:** JWT token-based authentication
*   **Authorization:** Role-based access control
*   **Data Encryption:** End-to-end encryption for sensitive data

### Privacy:
*   **GDPR Compliance:** Data protection and user consent
*   **Data Retention:** Automatic cleanup of personal data
*   **Anonymization:** Person tracking without identity storage
*   **Audit Logging:** Security event logging and monitoring

This design provides a solid foundation for building a high-performance, real-time person tracking visualization system that can handle the demands of security and analytics professionals while maintaining excellent user experience and development productivity.