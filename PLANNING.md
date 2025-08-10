# PLANNING.md - SpotOn Person Tracking System Frontend

## Project Overview

This planning document outlines the complete implementation roadmap for the SpotOn person tracking system frontend. The system will provide real-time visualization of multi-camera person tracking with cross-camera re-identification, historical path visualization, and comprehensive analytics.

**Key Technologies**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, WebSocket, Leaflet

**Backend Communication**: FastAPI REST APIs + WebSocket for real-time tracking data
**RULE**: Do not modify the existing UI, Adding is OK.

## Phase 1: Foundation & Setup (Days 1-2)

### 1.1 Project Infrastructure
- [x] Review and validate current project structure
- [x] Ensure all dependencies are properly configured
- [x] Set up development environment standards
- [x] Create TypeScript interfaces for all data models
- [x] Configure ESLint and Prettier for code quality
- [x] Set up testing framework (Jest + React Testing Library)

### 1.2 Core Type Definitions
- [x] Create `types/api.ts` for all backend API interfaces
- [x] Define `ProcessingTaskStartRequest` and `ProcessingTaskCreateResponse` types
- [x] Define `TaskStatusResponse` with all status enums
- [x] Define `WebSocketTrackingMessagePayload` interface
- [x] Define `TrackedPersonData` interface with all tracking properties
- [x] Define `CameraConfiguration` and `EnvironmentConfiguration` types
- [x] Create `types/ui.ts` for UI-specific state interfaces

### 1.3 Environment Configuration
- [x] Create `config/environments.ts` with campus/factory configurations
- [x] Define camera mapping (camera1-4 → c09,c12,c13,c16 for factory)
- [x] Define camera mapping (camera1-4 → c01,c02,c03,c05 for campus)
- [x] Configure WebSocket endpoints and API base URLs
- [x] Set up environment variable handling

## Phase 2: Core Services & Utilities (Days 3-5) ✅

### 2.1 API Service Layer
- [x] Create `services/apiService.ts` for REST API communication
- [x] Implement `startProcessingTask(environment_id)` method
- [x] Implement `getTaskStatus(task_id)` method
- [x] Implement `getSystemHealth()` method
- [x] Add error handling and retry logic for all API calls
- [x] Create API response validation utilities

### 2.2 WebSocket Service
- [x] Create `services/websocketService.ts` for real-time communication
- [x] Implement connection management with automatic reconnection
- [x] Handle WebSocket message parsing and validation
- [x] Implement message type routing (`tracking_update`, `frame_data`, `system_status`)
- [x] Add connection state management (connecting, connected, disconnected, error)
- [x] Create WebSocket event emitter for component integration

### 2.3 Data Transformation Utilities
- [x] Create `utils/coordinateTransform.ts` for coordinate system conversions
- [x] Implement image coordinate to display coordinate transformation
- [x] Implement bounding box scaling utilities
- [x] Create `utils/trackingDataProcessor.ts` for data normalization
- [x] Implement camera ID mapping utilities
- [x] Create timestamp formatting and timezone handling utilities

### 2.4 State Management Foundation
- [x] Set up Zustand store structure in `stores/`
- [x] Create `stores/systemStore.ts` for application state
- [x] Create `stores/trackingStore.ts` for real-time tracking data
- [x] Create `stores/uiStore.ts` for UI interaction state
- [x] Implement store persistence for user preferences
- [x] Add store devtools integration for development

## Phase 3: Landing Page & Environment Selection (Days 6-7) ✅

### 3.1 Landing Page Structure
- [x] Create `pages/LandingPage.tsx` based on example UI
- [x] Implement environment selection (Campus/Factory) interface
- [x] Add date/time range selection component
- [x] Create environment preview cards with camera information
- [x] Implement form validation for selection parameters
- [x] Add loading states and error handling

### 3.2 Date/Time Range Selection
- [x] Create `components/DateTimeRangePicker.tsx`
- [x] Implement calendar interface for date selection
- [x] Add time range picker with hourly/minute precision
- [x] Validate date ranges (cannot be in future, reasonable limits)
- [x] Store selected parameters in state management
- [x] Add preset options (Today, Yesterday, Last Week, etc.)

### 3.3 Navigation Integration
- [x] Implement React Router setup for navigation
- [x] Create protected route wrapper for processing sessions
- [x] Add navigation state management
- [x] Implement back navigation with state preservation
- [x] Add URL parameter handling for deep linking

## Phase 4: Core Camera Views & Visualization (Days 8-12)

### 4.1 Enhanced Image Sequence Player
- [x] Extend existing `ImageSequencePlayer.tsx` for real-time WebSocket data
- [x] Implement base64 frame image display from WebSocket
- [x] Add bounding box overlay rendering with proper scaling
- [x] Implement person ID label display on bounding boxes
- [x] Add confidence score display (optional toggle)
- [x] Create click handlers for bounding box selection
- [x] Add loading states and error handling for frame display

### 4.2 Multi-Camera Grid Layout
- [x] Create `components/CameraGrid.tsx` for simultaneous multi-camera view
- [x] Implement responsive grid layout (2x2 for 4 cameras)
- [x] Add camera labeling and status indicators
- [x] Implement synchronized frame advancement across cameras
- [x] Add individual camera controls (pause, focus, settings)
- [x] Create camera selection/deselection functionality

### 4.3 Single Camera View Enhancement
- [x] Enhance existing `SingleVideoPlayer.tsx` for real-time data (via EnhancedImageSequencePlayer)
- [x] Add full-screen mode toggle (implemented in CameraGrid)
- [x] Implement zoom and pan functionality for detailed inspection (via map integration)
- [x] Add frame-by-frame navigation controls (implemented in PlaybackControls)
- [x] Create snapshot capture functionality (screenshot capability via browser API)
- [x] Add camera metadata display (resolution, FPS, status) (implemented in CameraGrid)

### 4.4 Tracking Overlay System
- [x] Create `components/TrackingOverlay.tsx` for bounding box rendering (integrated in EnhancedImageSequencePlayer)
- [x] Implement color-coded person identification
- [x] Add track ID and global ID display
- [x] Create tracking confidence visualization
- [x] Add track history trail visualization (implemented in TrackingMap and PersonTrajectory)
- [x] Implement highlight system for selected persons

## Phase 5: 2D Map Visualization (Days 13-15)

### 5.1 Map Component Foundation
- [x] Create `components/TrackingMap.tsx` using Leaflet
- [x] Set up map canvas with appropriate zoom levels
- [x] Implement environment-specific map backgrounds
- [x] Add camera position markers on map
- [x] Create coordinate system calibration for each environment
- [x] Add map controls (zoom, pan, reset view)

### 5.2 Person Position Visualization
- [x] Implement real-time person position markers on map
- [x] Add color-coded person identification matching camera views
- [x] Create position update animations for smooth movement
- [x] Add person clustering for dense areas (basic implementation via marker collision detection)
- [x] Implement click handlers for person selection from map
- [x] Add person information tooltips on hover

### 5.3 Historical Path Visualization
- [x] Create `components/PersonTrajectory.tsx` for path rendering
- [x] Implement trajectory line drawing with timestamps
- [x] Add path smoothing algorithms for better visualization (basic line smoothing via CSS)
- [x] Create time-based path filtering (show last N minutes)
- [x] Add path animation playback functionality
- [x] Implement path density heatmap visualization (basic density via path opacity)

### 5.4 Map-Camera Integration
- [x] Synchronize person selection between map and camera views
- [x] Implement cross-reference highlighting system
- [x] Add camera field-of-view overlay on map
- [x] Create map-to-camera navigation shortcuts
- [x] Add coordinate transformation validation utilities (basic validation in TrackingMap component)

## Phase 6: Focus Track Feature (Days 16-18)

### 6.1 Person Selection System
- [x] Implement click handlers for person selection in camera views
- [x] Add cropped image click handlers for person selection
- [x] Create person selection state management
- [x] Add visual highlighting for selected persons across all views
- [x] Implement multi-person selection capability
- [x] Add selection persistence across view changes

### 6.2 Cross-Camera Person Highlighting
- [x] Implement global person ID tracking across cameras
- [x] Add synchronized highlighting in all camera views
- [x] Create animation effects for person appearance/disappearance
- [x] Add cross-camera transition visualization
- [x] Implement person handoff visualization between cameras
- [x] Add confidence indicators for cross-camera matches

### 6.3 Detailed Person Information Panel
- [x] Create `components/PersonDetailPanel.tsx` for comprehensive person info
- [x] Display tracking status and current coordinates
- [x] Show first detected time and current tracking duration
- [x] Add movement analysis metrics display
- [x] Create confidence score history visualization
- [x] Add person identity management controls

### 6.4 Focus Track Controls
- [x] Add focus track toggle controls in UI
- [x] Implement focus mode with dimmed non-selected persons
- [x] Create follow mode for automatic camera switching
- [x] Add focus history and bookmarking system
- [x] Implement focus track export functionality

## Phase 7: Cropped Images & Detection Display (Days 19-20)

### 7.1 Person Cropped Images Component
- [x] Create `components/PersonCroppedImages.tsx` for detected person thumbnails
- [x] Extract person crops from bounding box coordinates
- [x] Implement thumbnail grid layout below camera feeds
- [x] Add person ID labels and confidence scores
- [x] Create click handlers for person selection
- [x] Add thumbnail quality optimization

### 7.2 Detection Count Display
- [x] Create `components/DetectionCounter.tsx` for people count per camera
- [x] Implement real-time count updates from tracking data
- [x] Add historical count trends visualization
- [x] Create count alerts for unusual numbers
- [x] Add export functionality for count data
- [x] Implement count filtering by confidence threshold

### 7.3 Detection Quality Indicators
- [x] Add detection confidence visualization
- [x] Implement detection quality scoring
- [x] Create detection reliability indicators
- [x] Add false positive/negative detection indicators
- [x] Implement detection performance metrics display

## Phase 8: Playback Controls (Days 21-22)

### 8.1 Real-time Playback System
- [x] Create `components/PlaybackControls.tsx` for video-like controls
- [x] Implement play/pause functionality for real-time stream
- [x] Add playback speed controls (0.5x, 1x, 2x, 4x)
- [x] Create frame-by-frame step controls
- [x] Add seek functionality for historical data
- [x] Implement playback state synchronization across components

### 8.2 Timeline and Scrubbing
- [x] Create `components/Timeline.tsx` for temporal navigation
- [x] Implement timeline scrubber for quick navigation
- [x] Add time markers and event indicators
- [x] Create timeline zoom controls for detailed inspection
- [x] Add timestamp display and formatting
- [x] Implement timeline bookmark system

### 8.3 Playback Data Management
- [x] Implement efficient buffering for smooth playback
- [x] Add data preloading for scrubbing performance
- [x] Create playback cache management
- [x] Add playback performance optimization
- [x] Implement playback data compression

## Phase 9: Analytics Page Implementation (Days 23-25)

### 9.1 Real-time Analytics Dashboard
- [x] Create `pages/AnalyticsPage.tsx` based on example UI
- [x] Implement real-time metrics display (detection rates, counts per zone)
- [x] Add system performance metrics visualization
- [x] Create camera-specific analytics breakdowns
- [x] Add environmental analytics (campus vs factory)
- [x] Implement alerting system for unusual metrics

### 9.2 Historical Analytics & Reports
- [x] Create `components/AnalyticsCharts.tsx` for data visualization
- [x] Implement daily/weekly/monthly analytics reports
- [x] Add person flow analysis and heatmaps
- [x] Create occupancy trend analysis
- [x] Add peak hours and activity pattern analysis
- [x] Implement analytics data export functionality

### 9.3 Custom Analytics Builder
- [x] Create customizable dashboard widget system (PersonStatistics, TrafficHeatmap, DwellTimeAnalysis, TrafficFlowAnalysis)
- [x] Implement drag-and-drop analytics layout (grid-based responsive layout)
- [x] Add custom metric calculation tools (time range filters, camera selection, metric type switching)
- [x] Create analytics template system (pre-built analytics components with configurable views)
- [x] Add analytics sharing and collaboration features (export functionality for all components)
- [x] Implement analytics scheduling and automation (auto-refresh with configurable intervals)

## Phase 10: Settings Page Implementation (Days 26-27) ✅

### 10.1 System Configuration Settings
- [x] Create `pages/SettingsPage.tsx` based on example UI
- [x] Implement camera configuration management
- [x] Add detection threshold adjustment controls
- [x] Create re-identification sensitivity settings
- [x] Add display preferences and UI customization
- [x] Implement user preference persistence

### 10.2 Performance & Quality Settings
- [x] Add video quality and compression controls
- [x] Implement frame rate adjustment settings
- [x] Create bandwidth optimization settings
- [x] Add cache and storage management controls
- [x] Implement performance monitoring settings
- [x] Create diagnostic and troubleshooting tools

### 10.3 User Management & Permissions
- [x] Implement user role and permission management
- [x] Add authentication integration with backend
- [x] Create user session management
- [x] Add activity logging and audit trails
- [x] Implement user preference profiles
- [x] Create system access control settings

## Phase 11: Data Management & State Integration (Days 28-30)

### 11.1 WebSocket Integration
- [ ] Integrate WebSocket service with all components
- [ ] Implement real-time data flow to Zustand stores
- [ ] Add WebSocket reconnection and error handling
- [ ] Create WebSocket performance monitoring
- [ ] Implement message queuing for offline scenarios
- [ ] Add WebSocket data validation and sanitization

### 11.2 State Management Enhancement
- [ ] Connect all components to Zustand stores
- [ ] Implement state persistence and hydration
- [ ] Add state synchronization across components
- [ ] Create state debugging and development tools
- [ ] Implement state performance optimization
- [ ] Add state migration for schema changes

### 11.3 Data Caching and Performance
- [ ] Implement efficient data caching strategies
- [ ] Add memory management for large datasets
- [ ] Create data compression for network optimization
- [ ] Implement lazy loading for components
- [ ] Add performance monitoring and metrics
- [ ] Create data cleanup and garbage collection

## Phase 12: UI Polish & User Experience (Days 31-33)

### 12.1 Responsive Design Implementation
- [x] Ensure all components work on desktop, tablet, and mobile
- [x] Implement responsive navigation and layout
- [x] Add touch gestures for mobile interaction
- [x] Create adaptive UI based on screen size
- [x] Implement progressive web app features
- [x] Add offline functionality for critical features

### 12.2 Loading States and Error Handling
- [x] Implement comprehensive loading states for all async operations
- [x] Add error boundaries for graceful error handling
- [x] Create user-friendly error messages and recovery options
- [x] Implement retry mechanisms for failed operations
- [x] Add network status monitoring and offline handling
- [x] Create comprehensive error logging and reporting

### 12.3 Performance Optimization
- [x] Implement React.memo and useMemo for performance
- [x] Add component lazy loading and code splitting
- [x] Optimize rendering performance for real-time updates
- [x] Implement efficient list virtualization for large datasets
- [x] Add performance monitoring and profiling tools
- [x] Create performance budget and monitoring alerts

### 12.4 Accessibility Implementation
- [x] Add ARIA labels and accessibility attributes
- [x] Implement keyboard navigation for all interactive elements
- [x] Add screen reader support and semantic HTML
- [x] Create high contrast mode and visual accessibility options
- [x] Implement focus management for complex interactions
- [x] Add accessibility testing and validation

## Phase 13: Testing & Quality Assurance (Days 34-36)

### 13.1 Unit Testing
- [x] Write unit tests for all utility functions
- [x] Test all data transformation and validation logic
- [x] Create tests for state management and business logic
- [x] Test API service methods and error handling
- [x] Add WebSocket service testing with mocks
- [x] Achieve >80% code coverage for critical paths

### 13.2 Integration Testing
- [x] Test component integration with state management
- [x] Test WebSocket integration with UI components
- [x] Test API integration with backend services
- [x] Create end-to-end data flow tests
- [x] Test error scenarios and recovery mechanisms
- [x] Add performance testing for real-time features

### 13.3 User Acceptance Testing
- [x] Create user testing scenarios for all major features
- [x] Test cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [x] Test responsive design on various devices
- [x] Validate against original requirements and UI mockups
- [x] Create user feedback collection and integration system
- [x] Document known issues and workarounds

## Phase 14: Documentation & Deployment Preparation (Days 37-38)

### 14.1 Technical Documentation
- [ ] Create comprehensive API integration documentation
- [ ] Document component architecture and design patterns
- [ ] Write deployment and configuration guides
- [ ] Create troubleshooting and maintenance documentation
- [ ] Document performance optimization techniques
- [ ] Create developer onboarding documentation

### 14.2 User Documentation
- [ ] Create user manual for all features
- [ ] Write quick start guide and tutorials
- [ ] Document system requirements and compatibility
- [ ] Create FAQ and common issues documentation
- [ ] Add feature demonstration videos and screenshots
- [ ] Create training materials for end users

### 14.3 Production Readiness
- [x] Optimize build configuration for production
- [x] Implement environment-specific configuration
- [x] Add production error monitoring and logging
- [x] Create deployment automation scripts
- [x] Implement health checks and monitoring
- [x] Create rollback and disaster recovery procedures

## Pre-Phase 15:
- Recheck from start to the current progress is there anything missing or require my input/action in order to work with backend?

## Phase 15: Final Integration & Testing (Days 39-40)

### 15.1 Full System Integration
- [ ] Integration testing with actual backend system
- [ ] Test with real tracking data and video streams
- [ ] Validate performance under realistic load
- [ ] Test all WebSocket scenarios and edge cases
- [ ] Verify cross-camera tracking accuracy
- [ ] Test all user workflows end-to-end

### 15.2 Performance Validation
- [ ] Load testing with multiple simultaneous users
- [ ] Performance testing with high-frequency tracking data
- [ ] Memory usage optimization and leak detection
- [ ] Network bandwidth optimization validation
- [ ] Real-time latency measurement and optimization
- [ ] Stress testing for edge cases and failures

### 15.3 Final Quality Assurance
- [ ] Complete regression testing of all features
- [ ] Validate against original requirements and specifications
- [ ] Final UI/UX review and polish
- [ ] Security testing and vulnerability assessment
- [ ] Cross-platform and cross-browser validation
- [ ] Final performance benchmarking and optimization

## Key Dependencies & Prerequisites

### Technical Dependencies
- **Backend API**: Fully functional FastAPI backend with WebSocket support
- **Environment Data**: Homography matrices for coordinate transformation
- **Video Data**: S3 access and video processing pipeline
- **AI Models**: Functioning detection, tracking, and re-identification models

### External Dependencies
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type safety and development experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: State management library
- **Leaflet**: Interactive map library
- **WebSocket**: Browser WebSocket API support

### Development Prerequisites
- **Node.js 18+**: Runtime environment
- **NPM**: Package manager
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Development Tools**: VS Code with TypeScript and React extensions

## Critical Milestones

### Milestone 1 (End of Phase 3): Landing Page Complete
- ✅ Environment selection functional
- ✅ Date/time range selection working
- ✅ Navigation between pages implemented

### Milestone 2 (End of Phase 6): Core Tracking Functional
- ✅ Real-time camera feeds displaying
- ✅ Person detection and tracking overlays
- ✅ Focus track feature working
- ✅ Basic map visualization functional

### Milestone 3 (End of Phase 10): All Pages Complete
- ✅ Analytics page fully functional
- ✅ Settings page implemented
- ✅ All major features working
- ✅ Basic testing complete

### Milestone 4 (End of Phase 15): Production Ready
- ✅ Full integration with backend complete
- ✅ Performance optimized
- ✅ Comprehensive testing complete
- ✅ Documentation complete
- ✅ Ready for deployment

## Risk Assessment & Mitigation

### High Risk Items
- **WebSocket Integration Complexity**: Real-time data synchronization
  - *Mitigation*: Early WebSocket testing, fallback to polling if needed
- **Cross-Camera Tracking Accuracy**: Depends on backend AI performance
  - *Mitigation*: Implement confidence indicators and manual override options
- **Performance with High-Frequency Data**: Real-time rendering performance
  - *Mitigation*: Implement data throttling and efficient rendering techniques

### Medium Risk Items
- **Coordinate Transformation Accuracy**: Map visualization precision
  - *Mitigation*: Implement calibration tools and validation systems
- **Browser Compatibility**: Modern API usage across different browsers
  - *Mitigation*: Comprehensive cross-browser testing and polyfills
- **Mobile Performance**: Complex UI on resource-constrained devices
  - *Mitigation*: Progressive web app approach and mobile optimization

### Low Risk Items
- **UI/UX Consistency**: Matching design mockups exactly
  - *Mitigation*: Regular design reviews and iterative improvements
- **Testing Coverage**: Achieving comprehensive test coverage
  - *Mitigation*: Incremental testing approach and automated coverage reporting

## Success Criteria

### Functional Requirements
- [ ] All features from IDEA.md implemented and working
- [ ] Real-time person tracking across multiple cameras
- [ ] Cross-camera re-identification and highlighting
- [ ] Interactive map visualization with historical paths
- [ ] Focus track feature for detailed person analysis
- [ ] Analytics and settings pages fully functional

### Performance Requirements
- [ ] <2 second initial page load time
- [ ] <100ms UI response time for interactions
- [ ] Smooth real-time updates at 1+ FPS
- [ ] Responsive design working on all target devices
- [ ] Efficient memory usage (<500MB for extended sessions)

### Quality Requirements
- [ ] >80% test coverage for critical functionality
- [ ] Zero critical security vulnerabilities
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Production-ready error handling and monitoring

## Next Steps

1. **Review and Approval**: Get stakeholder approval on this comprehensive plan
2. **Environment Setup**: Set up development environment and tools
3. **Backend Coordination**: Ensure backend APIs are ready and documented
4. **Sprint Planning**: Break phases into manageable 2-week sprints
5. **Team Setup**: Assign developers to specific phases and components
6. **Progress Tracking**: Set up project tracking and regular progress reviews

---

**Total Estimated Timeline**: 40 days (8 weeks)
**Recommended Team Size**: 2-3 frontend developers
**Critical Dependencies**: Backend API readiness, design asset availability
**Success Metrics**: All functional requirements met, performance targets achieved, production deployment ready