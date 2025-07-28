# SpotOn Frontend Implementation Planning

## Project Overview
This document outlines the complete implementation plan for the SpotOn frontend application, from current state to production-ready deployment. The plan emphasizes **feature-based architecture** and **file-level implementation details** for the three core features:

### 🎯 **Core Features Coverage**
1. **Multi-View Person Detection**: Real-time display of person detection across 4 cameras with bounding box overlays
2. **Cross-Camera Re-Identification and Tracking**: Interactive person tracking visualization with persistent identity across cameras
3. **Unified Spatial Mapping**: 2D map visualization showing person trajectories and real-time positions

## 🏗️ **Target Architecture**
Based on feature-driven development with performance optimization:
```
src/
├── features/             # Feature-Based Organization
│   ├── detection/        # Multi-View Person Detection
│   ├── tracking/         # Cross-Camera Re-Identification
│   └── mapping/          # Unified Spatial Mapping
├── components/           # Reusable UI Components
├── stores/              # Zustand State Management
├── services/            # API & WebSocket Services
└── hooks/               # Custom React Hooks
```

## 🎨 **UI/UX Design Reference**
The `example_ui/` directory contains visual mockups and design specifications for all pages:

### Available UI Examples:
- **`Dashboard.png`** - Main Group View Page layout with 4-camera grid
- **`Dashboard - Select.png`** - Group View with person selection interface
- **`Dashboard - Select toggle.png`** - Group View with toggle controls
- **`Group view.png`** - Alternative Group View layout
- **`Detail view - expand.png`** - Individual person detail view
- **`Analytics (Optional).png`** - Analytics dashboard design
- **`Setting (Optional).png`** - Settings page configuration

### Implementation Reference:
When implementing each page component, refer to the corresponding UI example in `example_ui/` to ensure visual consistency and proper layout structure. These mockups serve as the definitive design specification for:
- Component placement and sizing
- Color schemes and styling
- Interactive element positioning
- Responsive layout patterns

## 📊 **Current vs Target Structure**
- ✅ **Well-Aligned**: React setup, TypeScript, Vite, basic components, routing
- 🔧 **Needs Refactoring**: Flat component structure → Feature-based organization
- ❌ **Missing Critical**: WebSocket client, state management, real-time integration, interactive features

---

## Phase 0: Architectural Refactoring (Week 1)
*Priority: Critical | Prerequisite for all development*

### 0.1 **Project Structure Refactoring**
- [ ] **Create Feature-Based Architecture**
  - **File Operations**: Create feature-based directory structure
    - `mkdir -p src/features/detection/{components,hooks,services,types}`
    - `mkdir -p src/features/tracking/{components,hooks,services,types}`
    - `mkdir -p src/features/mapping/{components,hooks,services,types}`
  - **Purpose**: Organize components by business feature rather than technical type
  - **Core Features**: Foundation for all three core features implementation

- [ ] **Create Component Architecture**
  - **File Operations**: Create atomic design structure
    - `mkdir -p src/components/{atoms,molecules,organisms,templates}`
    - `mkdir -p src/components/layout`
  - **Files to Create**:
    - `src/components/atoms/Button.tsx` - Basic button component
    - `src/components/atoms/Input.tsx` - Input field component
    - `src/components/molecules/LoadingSpinner.tsx` - Loading indicator
    - `src/components/layout/Header.tsx` - Application header
  - **Purpose**: Reusable UI components following atomic design principles

- [ ] **Create State Management Architecture**
  - **File Operations**: Create state management structure
    - `mkdir -p src/stores/slices`
    - `touch src/stores/{index.ts,appStore.ts,detectionStore.ts,trackingStore.ts,mappingStore.ts}`
  - **Files to Create**:
    - `src/stores/index.ts` - Main store configuration
    - `src/stores/appStore.ts` - Global application state
    - `src/stores/detectionStore.ts` - Detection feature state
    - `src/stores/trackingStore.ts` - Tracking feature state
    - `src/stores/mappingStore.ts` - Mapping feature state
  - **Purpose**: **Core Features** - State management for all three features

- [ ] **Create Services Architecture**
  - **File Operations**: Create service layer structure
    - `mkdir -p src/services/{api,websocket,utils}`
    - `touch src/services/{api.ts,websocket.ts,detectionAPI.ts,trackingAPI.ts,mappingAPI.ts}`
  - **Files to Create**:
    - `src/services/api.ts` - Base API client configuration
    - `src/services/websocket.ts` - WebSocket connection management
    - `src/services/detectionAPI.ts` - **Core Feature 1** - Detection API calls
    - `src/services/trackingAPI.ts` - **Core Feature 2** - Tracking API calls
    - `src/services/mappingAPI.ts` - **Core Feature 3** - Mapping API calls
  - **Purpose**: Centralized service layer for backend communication

### 0.2 **Core Feature Component Setup**
- [ ] **Multi-View Person Detection Components**
  - **Files to Create**:
    - `src/features/detection/components/CameraGrid.tsx` - 4-camera grid layout
    - `src/features/detection/components/CameraView.tsx` - Individual camera display
    - `src/features/detection/components/BoundingBoxOverlay.tsx` - Detection overlays
    - `src/features/detection/components/DetectionControls.tsx` - Detection controls
  - **Purpose**: **Core Feature 1** - Multi-camera person detection display
  - **UI Elements**: Camera grid, bounding boxes, detection statistics

- [ ] **Cross-Camera Re-Identification Components**
  - **Files to Create**:
    - `src/features/tracking/components/TrackingVisualization.tsx` - Person tracking display
    - `src/features/tracking/components/PersonTrajectory.tsx` - Individual person paths
    - `src/features/tracking/components/IdentityMatcher.tsx` - Identity matching UI
    - `src/features/tracking/components/TrackingTimeline.tsx` - Temporal tracking view
  - **Purpose**: **Core Feature 2** - Cross-camera person tracking visualization
  - **UI Elements**: Person trails, identity indicators, tracking timeline

- [ ] **Unified Spatial Mapping Components**
  - **Files to Create**:
    - `src/features/mapping/components/SpatialMap.tsx` - 2D map visualization
    - `src/features/mapping/components/CoordinateOverlay.tsx` - Coordinate display
    - `src/features/mapping/components/TrajectoryPath.tsx` - Person trajectory paths
    - `src/features/mapping/components/CameraPositions.tsx` - Camera position markers
  - **Purpose**: **Core Feature 3** - Unified spatial mapping visualization
  - **UI Elements**: Interactive 2D map, trajectory paths, coordinate system

---

## Phase 1: Foundation & Core Setup (Weeks 1-3)
*Priority: High | Parallel with: Backend Phase 1*

### 1.1 **Technology Stack Stabilization**
- [x] **React Version Management**
  - **Files to Modify**: `package.json`, `package-lock.json`, `vite.config.ts`
  - **Implementation Details**:
    - Downgrade React: `npm install react@18.2.0 react-dom@18.2.0`
    - Update TypeScript React types: `npm install @types/react@18.2.0 @types/react-dom@18.2.0`
    - Test component compatibility: verify existing components work with React 18
    - Update Vite configuration for React 18 optimization
  - **Purpose**: Stable foundation for production deployment

- [x] **Development Environment Enhancement**
  - **Files to Modify**: `vite.config.ts`, `tsconfig.json`, `eslint.config.js`
  - **Implementation Details**:
    - Configure Vite HMR: `server: { hmr: true }` for fast development
    - Add source maps: `build: { sourcemap: true }` for debugging
    - Configure ESLint rules: strict TypeScript rules, React hooks rules
    - Add Prettier integration: consistent code formatting
  - **Purpose**: Optimal development experience

- [x] **Dependency Management**
  - **Files to Modify**: `package.json`
  - **Dependencies to Add**:
    - `zustand@^4.4.0` - Lightweight state management
    - `leaflet@^1.9.4` - Interactive maps for spatial visualization
    - `@types/leaflet@^1.9.6` - TypeScript types for Leaflet
    - `react-leaflet@^4.2.1` - React components for Leaflet
  - **Installation Commands**:
    - `npm install zustand leaflet react-leaflet`
    - `npm install -D @types/leaflet`
  - **Purpose**: Core dependencies for all three features

---

## API Integration & Data Management

### 🌐 **HTTP API Integration**

#### **Environment & Configuration API**
- [ ] **Environment Service Implementation**
  - **Files to Create**: `src/services/environmentAPI.ts`
  - **API Endpoints**:
    - `GET /api/v1/environments` - Get available environments
    - `GET /api/v1/environments/{env_id}` - Get environment details
    - `GET /api/v1/environments/{env_id}/cameras` - Get camera configs
  - **Implementation Details**:
    - Axios-based HTTP client with TypeScript interfaces
    - Error handling with retry logic
    - Response caching for static configuration data
    - Authentication token management
  - **Purpose**: **Landing Page** - Environment selection and configuration
  - **Store Integration**: `src/stores/environmentStore.ts`

- [ ] **Camera Configuration API**
  - **Files to Create**: `src/services/cameraAPI.ts`
  - **API Endpoints**:
    - `GET /api/v1/cameras` - Get all cameras
    - `GET /api/v1/cameras/{camera_id}` - Get camera details
    - `GET /api/v1/cameras/{camera_id}/calibration` - Get homography data
  - **Implementation Details**:
    - Camera status monitoring and health checks
    - Calibration data fetching and validation
    - Camera settings management
    - Real-time camera availability updates
  - **Purpose**: **Settings Page** - Camera configuration and management
  - **Store Integration**: `src/stores/cameraStore.ts`

- [ ] **Zone & Layout API**
  - **Files to Create**: `src/services/zoneAPI.ts`
  - **API Endpoints**:
    - `GET /api/v1/zones` - Get all zones
    - `GET /api/v1/zones/{zone_id}/layout` - Get floor plan data
    - `GET /api/v1/zones/{zone_id}/cameras` - Get zone camera mappings
  - **Implementation Details**:
    - Floor plan data fetching and processing
    - Zone-based camera grouping
    - Spatial layout coordinate system setup
    - Zone metadata and configuration management
  - **Purpose**: **Group View Page** - Spatial mapping and floor plans
  - **Store Integration**: `src/stores/mappingStore.ts`

#### **Session Management API**
- [ ] **Session Service Implementation**
  - **Files to Create**: `src/services/sessionAPI.ts`
  - **API Endpoints**:
    - `POST /api/v1/sessions/start` - Start tracking session
    - `GET /api/v1/sessions/{session_id}/status` - Session status
    - `PUT /api/v1/sessions/{session_id}/pause` - Pause/resume
    - `DELETE /api/v1/sessions/{session_id}` - Stop session
  - **Implementation Details**:
    - Session lifecycle management
    - Session state synchronization
    - Auto-reconnection on session interruption
    - Session performance monitoring
  - **Purpose**: **Group View Page** - Session control and management
  - **Store Integration**: `src/stores/sessionStore.ts`

#### **Analytics & Historical Data API**
- [ ] **Analytics Service Implementation**
  - **Files to Create**: `src/services/analyticsAPI.ts`
  - **API Endpoints**:
    - `GET /api/v1/analytics/detections` - Historical detection data
    - `GET /api/v1/analytics/tracking` - Person tracking history
    - `GET /api/v1/analytics/heatmap` - Movement heat map data
    - `GET /api/v1/analytics/occupancy` - Occupancy trends
  - **Implementation Details**:
    - Time-range based data queries
    - Chart data formatting and aggregation
    - Export functionality for analytics data
    - Progressive loading for large datasets
  - **Purpose**: **Analytics Page** - Historical data analysis
  - **Store Integration**: `src/stores/analyticsStore.ts`

- [ ] **Journey & Tracking API**
  - **Files to Create**: `src/services/journeyAPI.ts`
  - **API Endpoints**:
    - `GET /api/v1/persons/{person_id}/journey` - Complete journey
    - `GET /api/v1/persons/{person_id}/trajectory` - Spatial trajectory
    - `GET /api/v1/persons/search` - Search persons by criteria
  - **Implementation Details**:
    - Individual person journey reconstruction
    - Trajectory path visualization data
    - Person search and filtering capabilities
    - Detailed tracking timeline generation
  - **Purpose**: **Detail View Page** - Individual person analysis
  - **Store Integration**: `src/stores/trackingStore.ts`

### 🔄 **WebSocket Integration**

#### **Real-Time Connection Management**
- [ ] **WebSocket Service Implementation**
  - **Files to Create**: `src/services/websocketService.ts`
  - **Connection Management**:
    - `wss://host/ws/tracking/{session_id}` - Real-time tracking data
    - `wss://host/ws/system/{session_id}` - System status updates
  - **Implementation Details**:
    - Automatic reconnection with exponential backoff
    - JWT authentication on WebSocket connection
    - Connection state monitoring and user feedback
    - Message queuing for offline scenarios
  - **Purpose**: Real-time data streaming for all frontend pages
  - **Store Integration**: Global WebSocket state management

- [ ] **Binary Frame Handler**
  - **Files to Create**: `src/services/frameHandler.ts`
  - **Message Type**: `frame_data`
  - **Implementation Details**:
    - Binary JPEG data processing and image blob creation
    - Frame metadata extraction and validation
    - Multi-camera frame synchronization
    - Performance monitoring (FPS, frame drops)
  - **Data Flow**: WebSocket → Frame Handler → Detection Store → Camera Components
  - **Purpose**: **Group View Page** - Live camera feeds with detection overlays

- [ ] **Tracking Update Handler**
  - **Files to Create**: `src/services/trackingHandler.ts`
  - **Message Type**: `tracking_update`
  - **Implementation Details**:
    - Person identity updates across cameras
    - Trajectory path reconstruction
    - Camera transition notifications
    - Real-time position updates
  - **Data Flow**: WebSocket → Tracking Handler → Tracking Store → Map Components
  - **Purpose**: **Detail View Page** - Person tracking updates

- [ ] **System Status Handler**
  - **Files to Create**: `src/services/statusHandler.ts`
  - **Message Type**: `system_status`
  - **Implementation Details**:
    - System health monitoring
    - Performance metrics display
    - Connection quality indicators
    - Resource usage alerts
  - **Data Flow**: WebSocket → Status Handler → System Store → UI Components
  - **Purpose**: **All Pages** - System health indicators

### 📊 **Data Models & Types**

#### **API Response Types**
- [ ] **Detection Types**
  - **Files to Create**: `src/types/detection.ts`
  - **TypeScript Interfaces**:
    ```typescript
    interface DetectionResponse {
      id: string;
      camera_id: string;
      bbox: BoundingBox;
      confidence: number;
      timestamp: string;
      class_id: number;
      person_crop?: string;
    }
    
    interface BoundingBox {
      x: number;
      y: number;
      width: number;
      height: number;
      normalized: boolean;
    }
    ```
  - **Purpose**: **Core Feature 1** - Multi-view person detection types

- [ ] **Tracking Types**
  - **Files to Create**: `src/types/tracking.ts`
  - **TypeScript Interfaces**:
    ```typescript
    interface PersonIdentity {
      global_id: number;
      local_tracks: Record<string, number>;
      first_seen: string;
      last_seen: string;
      cameras_seen: string[];
      confidence: number;
    }
    
    interface TrackData {
      track_id: number;
      global_id: number;
      bbox: BoundingBox;
      confidence: number;
      map_coords?: [number, number];
    }
    ```
  - **Purpose**: **Core Feature 2** - Cross-camera re-identification types

- [ ] **Mapping Types**
  - **Files to Create**: `src/types/mapping.ts`
  - **TypeScript Interfaces**:
    ```typescript
    interface MapCoordinate {
      x: number;
      y: number;
      coordinate_system: string;
      timestamp: string;
      confidence: number;
    }
    
    interface Trajectory {
      person_id: number;
      path_points: MapCoordinate[];
      start_time: string;
      end_time: string;
      total_distance: number;
      cameras_traversed: string[];
    }
    ```
  - **Purpose**: **Core Feature 3** - Unified spatial mapping types

#### **WebSocket Message Types**
- [ ] **WebSocket Protocol Types**
  - **Files to Create**: `src/types/websocket.ts`
  - **TypeScript Interfaces**:
    ```typescript
    interface FrameMessage {
      type: 'frame_data';
      frame_index: number;
      scene_id: string;
      timestamp_utc: string;
      cameras: Record<string, CameraFrame>;
    }
    
    interface TrackingMessage {
      type: 'tracking_update';
      person_id: number;
      global_id: number;
      camera_transitions: CameraTransition[];
      current_position: MapCoordinate;
      trajectory_path: MapCoordinate[];
    }
    
    interface SystemStatusMessage {
      type: 'system_status';
      cameras_active: number;
      processing_fps: number;
      connection_quality: string;
      memory_usage: number;
      gpu_utilization: number;
    }
    ```
  - **Purpose**: Type safety for all WebSocket communications

### 🔐 **Authentication & Security**

#### **Authentication Service**
- [ ] **Auth Service Implementation**
  - **Files to Create**: `src/services/authService.ts`
  - **API Endpoints**:
    - `POST /api/v1/auth/login` - User authentication
    - `POST /api/v1/auth/refresh` - Token refresh
    - `POST /api/v1/auth/logout` - User logout
  - **Implementation Details**:
    - JWT token storage and management
    - Automatic token refresh
    - Role-based access control
    - WebSocket authentication
  - **Purpose**: Secure API access for all features
  - **Store Integration**: `src/stores/authStore.ts`

#### **API Security**
- [ ] **HTTP Client Security**
  - **Files to Create**: `src/services/httpClient.ts`
  - **Implementation Details**:
    - Axios interceptors for authentication
    - Request/response logging
    - Error handling and retry logic
    - CORS configuration
  - **Purpose**: Secure HTTP communications

### 🎯 **Page-Specific API Integration**

#### **Landing Page Integration**
- [ ] **Environment Selection**
  - **Files to Modify**: `src/pages/SelectZonePage.tsx`
  - **UI Reference**: `example_ui/Dashboard.png` (for environment selection layout)
  - **API Integration**:
    - Environment list fetching: `environmentAPI.getEnvironments()`
    - Environment details loading: `environmentAPI.getEnvironment(envId)`
    - Camera availability checking: `cameraAPI.getCamerasByEnvironment(envId)`
  - **State Management**: `useEnvironmentStore()` hook
  - **Purpose**: **Core Feature Integration** - Environment-based system setup

#### **Group View Page Integration**
- [ ] **Real-Time Dashboard**
  - **Files to Modify**: `src/pages/GroupViewPage.tsx`
  - **UI Reference**: 
    - `example_ui/Dashboard.png` - Main 4-camera grid layout
    - `example_ui/Dashboard - Select.png` - Person selection interface
    - `example_ui/Dashboard - Select toggle.png` - Toggle controls
    - `example_ui/Group view.png` - Alternative layout reference
  - **API Integration**:
    - Session management: `sessionAPI.startSession()`, `sessionAPI.getStatus()`
    - Real-time frames: WebSocket `frame_data` messages
    - Tracking updates: WebSocket `tracking_update` messages
    - System status: WebSocket `system_status` messages
  - **State Management**: `useDetectionStore()`, `useTrackingStore()`, `useMappingStore()`
  - **Purpose**: **All Three Core Features** - Real-time multi-camera monitoring

#### **Detail View Page Integration**
- [ ] **Person Detail View**
  - **Files to Create**: `src/pages/DetailViewPage.tsx`
  - **UI Reference**: `example_ui/Detail view - expand.png` - Individual person detail layout
  - **API Integration**:
    - Person journey: `journeyAPI.getPersonJourney(personId)`
    - Trajectory data: `journeyAPI.getPersonTrajectory(personId)`
    - Real-time updates: WebSocket `tracking_update` messages
  - **State Management**: `usePersonStore()`, `useTrackingStore()`
  - **Purpose**: **Core Feature 2** - Individual person tracking analysis

#### **Analytics Page Integration**
- [ ] **Historical Analytics**
  - **Files to Create**: `src/pages/AnalyticsPage.tsx`
  - **UI Reference**: `example_ui/Analytics (Optional).png` - Analytics dashboard design
  - **API Integration**:
    - Detection analytics: `analyticsAPI.getDetectionStats()`
    - Tracking analytics: `analyticsAPI.getTrackingHistory()`
    - Heat map data: `analyticsAPI.getHeatmapData()`
    - Export functions: `analyticsAPI.exportData()`
  - **State Management**: `useAnalyticsStore()`
  - **Purpose**: **All Three Core Features** - Historical data analysis

#### **Settings Page Integration**
- [ ] **Configuration Management**
  - **Files to Create**: `src/pages/SettingsPage.tsx`
  - **UI Reference**: `example_ui/Setting (Optional).png` - Settings page configuration
  - **API Integration**:
    - Camera settings: `cameraAPI.getCameraSettings()`, `cameraAPI.updateSettings()`
    - Zone configuration: `zoneAPI.getZoneConfig()`, `zoneAPI.updateConfig()`
    - System settings: `systemAPI.getSettings()`, `systemAPI.updateSettings()`
  - **State Management**: `useSettingsStore()`
  - **Purpose**: System configuration and management

---

### 1.2 **Project Structure Refactoring**
- [ ] **Atomic Design Implementation**
  - Create atoms/ directory for basic UI components
  - Implement molecules/ for component combinations
  - Set up organisms/ for complex components
  - Establish templates/ for page layouts

- [ ] **TypeScript Enhancement**
  - Define comprehensive type definitions
  - Create tracking data interfaces
  - Add WebSocket message types
  - Implement camera and state interfaces

- [ ] **Utility Layer Setup**
  - Create utility functions for frame synchronization
  - Add performance monitoring utilities
  - Implement data formatting helpers
  - Add error handling utilities

### 1.3 Core Component Architecture
- [ ] **Component Library Foundation**
  - Create reusable Button, Input, Loading components
  - Implement Modal and Dialog components
  - Add Icon library and design system
  - Create responsive layout components

- [ ] **Page Template Structure**
  - Implement base page templates
  - Create navigation components
  - Add responsive header and footer
  - Implement breadcrumb navigation

- [ ] **Routing Enhancement**
  - Add route guards and authentication checks
  - Implement dynamic route parameters
  - Add error boundary for route errors
  - Create 404 and error pages

---

## Phase 2: Real-Time Integration (Weeks 2-4)
*Priority: High | Parallel with: Backend Phase 2*

### 2.1 WebSocket Client Implementation
- [x] **WebSocket Connection Management**
  - Implement WebSocket client with reconnection logic
  - Add connection state management
  - Create message queue for offline scenarios
  - Add exponential backoff for connection retries

- [x] **Binary Message Handling**
  - Implement binary frame data processing
  - Add JPEG blob creation from binary data
  - Create message type discrimination
  - Add frame data validation and error handling

- [x] **Health Check Integration**
  - Implement backend health polling
  - Add connection readiness detection
  - Create health status UI indicators
  - Add automatic connection retry on health recovery

### 2.2 State Management with Zustand
- [x] **App State Store**
  - Create main application state store
  - Implement connection state management
  - Add user interface state (active tabs, settings)
  - Create performance metrics state

- [x] **Camera State Management**
  - Implement camera data store
  - Add real-time frame data updates
  - Create camera selection and configuration
  - Add camera status monitoring

- [x] **Tracking State Management**
  - Create tracking data store
  - Implement person tracking state
  - Add tracking history management
  - Create selected person state

### 2.3 Real-Time Data Flow
- [x] **Frame Synchronization**
  - Implement multi-camera frame sync
  - Add frame index-based coordination
  - Create frame timing and performance monitoring
  - Add frame drop detection and handling

- [x] **Performance Monitoring**
  - Implement FPS tracking and display
  - Add connection quality monitoring
  - Create frame drop statistics
  - Add performance alerting for poor connections

- [x] **Error Handling & Recovery**
  - Implement connection error handling
  - Add data validation and recovery
  - Create graceful degradation for poor connections
  - Add user notification for connection issues

---

## Phase 3: Interactive Features (Weeks 3-5)
*Priority: Medium | Parallel with: Backend Phase 3*

### 3.1 Enhanced Camera Components
- [ ] **Camera View Enhancement**
  - Add click-to-track functionality
  - Implement bounding box interactions
  - Add zoom and pan capabilities
  - Create overlay toggle controls

- [ ] **Tracking Overlays**
  - Implement dynamic bounding box rendering
  - Add person ID labels and confidence scores
  - Create tracking trails and history
  - Add color-coded tracking visualization

- [ ] **Multi-Camera Grid**
  - Enhance 4-camera grid layout
  - Add camera-specific controls
  - Implement synchronized playback
  - Create camera selection and focus modes

### 3.2 Interactive Map Implementation
- [ ] **Leaflet.js Integration**
  - Replace mock map with interactive Leaflet map
  - Add real-time person position updates
  - Implement camera position markers
  - Create map zoom and pan controls

- [ ] **Real-Time Map Updates**
  - Connect tracking data to map positions
  - Implement smooth position transitions
  - Add person path visualization
  - Create map-based person selection

- [ ] **Map Interaction Features**
  - Add click-to-track from map
  - Implement area selection tools
  - Create map-based analytics
  - Add heat map visualization

### 3.3 Advanced UI Components
- [ ] **Control Panel Enhancement**
  - Add comprehensive playback controls
  - Implement timeline scrubbing
  - Create speed control options
  - Add bookmark and annotation features

- [ ] **Statistics Dashboard**
  - Implement real-time detection statistics
  - Add person count monitoring
  - Create performance metrics display
  - Add system status indicators

- [ ] **Settings and Configuration**
  - Create settings page with preferences
  - Add display configuration options
  - Implement notification settings
  - Add export and import configuration

---

## Phase 4: Analytics & Export Features (Weeks 4-6)
*Priority: Medium | Parallel with: Backend Phase 4*

### 4.1 Analytics Dashboard
- [ ] **Real-Time Analytics**
  - Implement live detection analytics
  - Add person behavior analysis
  - Create traffic flow visualization
  - Add anomaly detection displays

- [ ] **Historical Data Visualization**
  - Connect to backend analytics endpoints
  - Implement time-based analytics queries
  - Add chart and graph components
  - Create comparative analytics views

- [ ] **Performance Analytics**
  - Add system performance monitoring
  - Implement frame rate analytics
  - Create connection quality metrics
  - Add resource usage monitoring

### 4.2 Export and Screenshot Features
- [ ] **Screenshot Functionality**
  - Implement individual camera screenshots
  - Add multi-camera composite screenshots
  - Create annotated screenshot export
  - Add screenshot history and management

- [ ] **Data Export**
  - Implement tracking data export (CSV, JSON)
  - Add analytics data export
  - Create report generation
  - Add export scheduling and automation

- [ ] **Video Export**
  - Add video clip generation from frames
  - Implement time-range video export
  - Create annotated video export
  - Add video compression and quality options

### 4.3 Advanced Analytics Features
- [ ] **Person Journey Visualization**
  - Implement person path tracking
  - Add journey timeline visualization
  - Create cross-camera journey analysis
  - Add journey export and sharing

- [ ] **Behavioral Analytics**
  - Add dwell time analysis
  - Implement zone-based analytics
  - Create crowd density monitoring
  - Add behavioral pattern detection

- [ ] **Reporting System**
  - Create automated report generation
  - Add customizable report templates
  - Implement scheduled reporting
  - Add report sharing and distribution

---

## Phase 5: Production Readiness (Weeks 5-7)
*Priority: High | Parallel with: Backend Phase 5*

### 5.1 Performance Optimization
- [ ] **Component Optimization**
  - Implement React.memo for expensive components
  - Add useMemo and useCallback optimization
  - Create lazy loading for non-critical components
  - Add bundle splitting for better loading

- [ ] **Memory Management**
  - Implement binary data cleanup
  - Add frame buffer management
  - Create memory leak detection
  - Add garbage collection optimization

- [ ] **Rendering Optimization**
  - Implement virtual scrolling where needed
  - Add canvas optimization for overlays
  - Create efficient re-rendering strategies
  - Add frame skipping for performance

### 5.2 Accessibility & UX
- [ ] **WCAG 2.1 AA Compliance**
  - Add proper ARIA labels and roles
  - Implement keyboard navigation
  - Add screen reader support
  - Create high contrast mode

- [ ] **User Experience Enhancement**
  - Add loading states and progress indicators
  - Implement error messages and user feedback
  - Create guided tours and onboarding
  - Add context-sensitive help

- [ ] **Responsive Design Completion**
  - Optimize for tablet and mobile viewing
  - Add touch gesture support
  - Create responsive control layouts
  - Add device-specific optimizations

### 5.3 Testing & Quality Assurance
- [ ] **Unit Testing**
  - Implement component unit tests
  - Add utility function testing
  - Create state management tests
  - Add integration tests for critical paths

- [ ] **E2E Testing**
  - Implement Playwright tests for user workflows
  - Add WebSocket connection testing
  - Create performance testing scenarios
  - Add regression testing suites

- [ ] **Performance Testing**
  - Add real-time performance monitoring
  - Implement frame rate testing
  - Create memory usage testing
  - Add load testing for multiple cameras

---

## Phase 6: Deployment & Optimization (Weeks 6-8)
*Priority: Medium | Parallel with: Backend Phase 6*

### 6.1 Build & Deployment
- [ ] **Production Build Optimization**
  - Optimize Vite build configuration
  - Add code splitting and lazy loading
  - Implement asset optimization
  - Add bundle analysis and optimization

- [ ] **Static Asset Management**
  - Configure asset caching strategies
  - Add CDN integration preparation
  - Implement asset compression
  - Add progressive loading for images

- [ ] **Environment Configuration**
  - Create environment-specific builds
  - Add configuration management
  - Implement feature flags
  - Add deployment automation

### 6.2 Monitoring & Analytics
- [ ] **Application Monitoring**
  - Add real-user monitoring (RUM)
  - Implement error tracking and reporting
  - Create performance metrics collection
  - Add user behavior analytics

- [ ] **Performance Monitoring**
  - Implement Core Web Vitals tracking
  - Add real-time performance alerts
  - Create performance dashboards
  - Add performance regression detection

- [ ] **Security Implementation**
  - Add Content Security Policy (CSP)
  - Implement secure authentication flow
  - Add input validation and sanitization
  - Create security headers and protection

### 6.3 Documentation & Maintenance
- [ ] **User Documentation**
  - Create user manual and guides
  - Add context-sensitive help system
  - Implement in-app tutorials
  - Create troubleshooting guides

- [ ] **Technical Documentation**
  - Complete component library documentation
  - Add API integration guides
  - Create development setup guides
  - Add troubleshooting documentation

- [ ] **Maintenance Procedures**
  - Create update and deployment procedures
  - Add monitoring and alerting setup
  - Implement backup and recovery plans
  - Create incident response procedures

---

## Success Criteria

### Phase 1 Complete
- [ ] React 18.2 stable setup with TypeScript
- [ ] Atomic design component structure
- [ ] Development environment optimized
- [ ] Core routing and navigation working

### Phase 2 Complete
- [ ] WebSocket client connected to backend
- [ ] Binary frame data processing functional
- [ ] Zustand state management implemented
- [ ] Real-time data flow established

### Phase 3 Complete
- [ ] Interactive camera components working
- [ ] Leaflet.js map integration complete
- [ ] Click-to-track functionality implemented
- [ ] Enhanced UI components operational

### Phase 4 Complete
- [ ] Analytics dashboard functional
- [ ] Export and screenshot features working
- [ ] Historical data visualization complete
- [ ] Advanced analytics implemented

### Phase 5 Complete
- [ ] Performance optimization complete
- [ ] WCAG 2.1 AA compliance achieved
- [ ] Comprehensive testing implemented
- [ ] Production-ready quality assured

### Phase 6 Complete
- [ ] Production build optimized
- [ ] Monitoring and analytics active
- [ ] Security implementation complete
- [ ] Documentation and maintenance ready

## Dependencies & Integration Points

### Backend Dependencies
- WebSocket server with binary message support
- Health check endpoints for connection management
- Analytics APIs for historical data
- Authentication and authorization systems

### Third-Party Dependencies
- Leaflet.js for interactive maps
- Zustand for state management
- Performance monitoring libraries
- Testing frameworks (Vitest, Playwright)

### Technical Risks
- Real-time performance with 4 concurrent camera streams
- Binary data handling and memory management
- WebSocket connection stability
- Cross-browser compatibility

### Mitigation Strategies
- Implement progressive enhancement for features
- Add comprehensive error handling and recovery
- Create fallback mechanisms for poor connections
- Maintain performance monitoring throughout development

## UI/UX Implementation Notes

### Page Implementation Priority
1. **Landing Page** (Environment Selection) - Week 1
   - **UI Reference**: `example_ui/Dashboard.png` for layout patterns
2. **Group View Page** (Main Interface) - Weeks 2-4
   - **UI Reference**: `example_ui/Dashboard.png`, `example_ui/Dashboard - Select.png`, `example_ui/Dashboard - Select toggle.png`, `example_ui/Group view.png`
3. **Detail View Page** (Single Camera) - Weeks 3-5
   - **UI Reference**: `example_ui/Detail view - expand.png`
4. **Analytics Page** (Optional) - Weeks 4-6
   - **UI Reference**: `example_ui/Analytics (Optional).png`
5. **Settings Page** (Optional) - Weeks 5-7
   - **UI Reference**: `example_ui/Setting (Optional).png`

### Component Development Order
1. **Core Components** (Buttons, Inputs, Modals) - Week 1
   - **UI Reference**: Extract common elements from all `example_ui/*.png` files
2. **Camera Components** (Views, Overlays) - Weeks 2-3
   - **UI Reference**: `example_ui/Dashboard.png` for 4-camera grid layout
   - **UI Reference**: `example_ui/Dashboard - Select.png` for selection overlays
3. **Map Components** (Interactive Map) - Weeks 3-4
   - **UI Reference**: `example_ui/Group view.png` for map integration
4. **Analytics Components** (Charts, Dashboards) - Weeks 4-5
   - **UI Reference**: `example_ui/Analytics (Optional).png` for dashboard layout
5. **Advanced Components** (Export, Settings) - Weeks 5-6
   - **UI Reference**: `example_ui/Setting (Optional).png` for configuration panels

This planning document provides a comprehensive roadmap for frontend implementation, synchronized with backend development phases to ensure efficient parallel development and seamless integration.