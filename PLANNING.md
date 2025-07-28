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

## 📊 **Current Implementation Status**
- ✅ **Completed**: React setup, TypeScript, Vite, basic components, routing, feature-based architecture
- ✅ **Completed**: Mock API service layer with comprehensive data generation
- ✅ **Completed**: State management stores (Zustand) for all features
- ✅ **Completed**: WebSocket service foundation
- 🔧 **In Progress**: Real-time integration and interactive features
- ❌ **Pending**: Component integration, UI implementation, production optimization

---

## Phase 0: Architectural Refactoring ✅ COMPLETED
*Priority: Critical | Prerequisite for all development*

### ✅ **Project Structure Refactoring**
- **Feature-Based Architecture**: Feature-based directory structure created
- **Component Architecture**: Atomic design structure established
- **State Management Architecture**: Zustand stores implemented
- **Services Architecture**: API and WebSocket service layer created

### ✅ **Core Feature Component Setup**
- **Multi-View Person Detection Components**: Component structure planned
- **Cross-Camera Re-Identification Components**: Component structure planned
- **Unified Spatial Mapping Components**: Component structure planned

---

## Phase 1: Foundation & Core Setup ✅ COMPLETED
*Priority: High | Parallel with: Backend Phase 1*

### ✅ **Technology Stack Stabilization**
- **React Version Management**: React 18.2.0 stable setup
- **Development Environment Enhancement**: Vite, TypeScript, ESLint configured
- **Dependency Management**: Zustand, Leaflet, and core dependencies added

---

## Phase 2a: Mock API Integration ✅ COMPLETED
*Priority: High | Status: Complete*

### ✅ **Mock API Service Layer**
- **API Type Definitions**: Complete TypeScript interfaces in `src/services/types/api.ts`
- **Mock Data Service**: Comprehensive mock data generation in `src/services/mock/mockDataService.ts`
- **API Configuration**: Environment-based configuration in `src/services/config/apiConfig.ts`
- **Detection API**: Mock-enabled detection service in `src/services/detectionAPI.ts`
- **Tracking API**: Mock-enabled tracking service in `src/services/trackingAPI.ts`
- **Mapping API**: Mock-enabled mapping service in `src/services/mappingAPI.ts`

### ✅ **State Management Implementation**
- **App State Store**: Main application state in `src/stores/appStore.ts`
- **Detection Store**: Detection feature state in `src/stores/detectionStore.ts`
- **Tracking Store**: Tracking feature state in `src/stores/trackingStore.ts`
- **Mapping Store**: Mapping feature state in `src/stores/mappingStore.ts`

### ✅ **WebSocket Foundation**
- **WebSocket Service**: Base WebSocket implementation in `src/services/websocket.ts`
- **Frame Handler**: Frame processing logic in `src/services/frameHandler.ts`
- **Status Handler**: System status handling in `src/services/statusHandler.ts`
- **Tracking Handler**: Tracking updates in `src/services/trackingHandler.ts`

---

## Phase 2b: Real-Time Integration ✅ COMPLETED
*Priority: High | Parallel with: Backend Phase 2*

### ✅ **WebSocket Client Implementation**
- **WebSocket Connection Management**: WebSocket client with reconnection logic implemented
- **Binary Message Handling**: Binary frame data processing implemented
- **Health Check Integration**: Backend health polling implemented

### ✅ **Real-Time Data Flow**
- **Frame Synchronization**: Multi-camera frame sync implemented
- **Performance Monitoring**: FPS tracking and display implemented
- **Error Handling & Recovery**: Comprehensive error handling and recovery system implemented

---

## Phase 3: Interactive Features ✅ COMPLETED
*Priority: Medium | Parallel with: Backend Phase 3*

### ✅ **Enhanced Camera Components**
- ✅ **Camera View Enhancement**: Add click-to-track functionality
- ✅ **Tracking Overlays**: Implement dynamic bounding box rendering
- ✅ **Multi-Camera Grid**: Enhance 4-camera grid layout

### ✅ **Interactive Map Implementation**
- ✅ **Leaflet.js Integration**: Replace mock map with interactive Leaflet map
- ✅ **Real-Time Map Updates**: Connect tracking data to map positions
- ✅ **Map Interaction Features**: Add click-to-track from map

### ✅ **Advanced UI Components**
- ✅ **Control Panel Enhancement**: Add comprehensive playback controls
- ✅ **Statistics Dashboard**: Implement real-time detection statistics
- ✅ **Settings and Configuration**: Create settings page with preferences

---

## Phase 4: Analytics & Export Features (Weeks 4-6)
*Priority: Medium | Parallel with: Backend Phase 4*

### **Analytics Dashboard**
- **Real-Time Analytics**: Implement live detection analytics
- **Historical Data Visualization**: Connect to backend analytics endpoints
- **Performance Analytics**: Add system performance monitoring

### **Export and Screenshot Features**
- **Screenshot Functionality**: Implement individual camera screenshots
- **Data Export**: Implement tracking data export (CSV, JSON)
- **Video Export**: Add video clip generation from frames

### **Advanced Analytics Features**
- **Person Journey Visualization**: Implement person path tracking
- **Behavioral Analytics**: Add dwell time analysis
- **Reporting System**: Create automated report generation

---

## Phase 5: Production Readiness (Weeks 5-7)
*Priority: High | Parallel with: Backend Phase 5*

### **Performance Optimization**
- **Component Optimization**: Implement React.memo for expensive components
- **Memory Management**: Implement binary data cleanup
- **Rendering Optimization**: Implement virtual scrolling where needed

### **Accessibility & UX**
- **WCAG 2.1 AA Compliance**: Add proper ARIA labels and roles
- **User Experience Enhancement**: Add loading states and progress indicators
- **Responsive Design Completion**: Optimize for tablet and mobile viewing

### **Testing & Quality Assurance**
- **Unit Testing**: Implement component unit tests
- **E2E Testing**: Implement Playwright tests for user workflows
- **Performance Testing**: Add real-time performance monitoring

---

## Phase 6: Deployment & Optimization (Weeks 6-8)
*Priority: Medium | Parallel with: Backend Phase 6*

### **Build & Deployment**
- **Production Build Optimization**: Optimize Vite build configuration
- **Static Asset Management**: Configure asset caching strategies
- **Environment Configuration**: Create environment-specific builds

### **Monitoring & Analytics**
- **Application Monitoring**: Add real-user monitoring (RUM)
- **Performance Monitoring**: Implement Core Web Vitals tracking
- **Security Implementation**: Add Content Security Policy (CSP)

### **Documentation & Maintenance**
- **User Documentation**: Create user manual and guides
- **Technical Documentation**: Complete component library documentation
- **Maintenance Procedures**: Create update and deployment procedures

---

## Backend Integration Requirements

### 🔄 **Backend Integration Checklist**
**IMPORTANT**: The current implementation uses mock data for development purposes. When backend endpoints are available, update the following:

#### **API Configuration Updates** (`src/services/config/apiConfig.ts`)
- Update `apiUrl` for each environment (development, staging, production)
- Update `wsUrl` for WebSocket connections
- Set `enableMocks: false` for staging and production
- Verify API endpoint paths match backend implementation

#### **Service Integration Updates**
- **Detection API** (`src/services/detectionAPI.ts`): Remove mock data, integrate with live backend
- **Tracking API** (`src/services/trackingAPI.ts`): Replace mock tracking data with real backend calls
- **Mapping API** (`src/services/mappingAPI.ts`): Replace mock spatial mapping with real coordinate data

#### **WebSocket Integration**
- Create `src/services/websocket.ts` for real-time connections
- Update WebSocket URLs in `apiConfig.ts`
- Remove mock WebSocket data generation methods
- Implement proper error handling for WebSocket disconnections

#### **Authentication Integration** (Future requirement)
- Add JWT token management
- Update HTTP client interceptors
- Implement secure WebSocket authentication
- Add role-based access control

#### **Testing with Real Backend**
- Test all API endpoints with actual backend
- Verify data formats match TypeScript interfaces
- Test error handling with real error responses
- Validate performance with real data volumes

### 🚨 **Critical Notes for Backend Integration**
1. **Mode Switching**: Each API service has a `setMockMode(false)` method to switch to live data
2. **Environment Detection**: Services automatically detect environment and use appropriate mock/live mode
3. **Fallback Strategy**: Services include error handling that can gracefully degrade to mock data if backend is unavailable
4. **Performance Monitoring**: All services include timing and performance metrics for monitoring
5. **Data Validation**: Services validate data formats to ensure compatibility

### 📋 **Backend API Requirements Summary**
Based on the mock implementation, the backend must provide:

#### **Detection Endpoints**
- `GET /api/v1/detections` - Paginated detection results
- `GET /api/v1/detections/{id}` - Individual detection
- `POST /api/v1/detections/search` - Search with filters
- `POST /api/v1/detections/export` - Data export
- `GET /api/v1/detections/statistics` - Detection statistics

#### **Tracking Endpoints**
- `GET /api/v1/tracking` - Paginated tracking results
- `GET /api/v1/tracking/{id}` - Individual tracking result
- `POST /api/v1/tracking/search` - Search with filters
- `GET /api/v1/tracking/person/{personId}/trajectory` - Person trajectory
- `GET /api/v1/tracking/transitions` - Camera transitions
- `POST /api/v1/tracking/export` - Data export

#### **Mapping Endpoints**
- `GET /api/v1/mapping/spatial/{environmentId}` - Spatial mapping
- `GET /api/v1/mapping/statistics` - Mapping statistics
- `POST /api/v1/mapping/transform` - Coordinate transformation
- `GET /api/v1/mapping/trajectory-analysis` - Trajectory analysis

#### **Configuration Endpoints**
- `GET /api/v1/environments` - Environment list
- `GET /api/v1/environments/{id}` - Environment details
- `GET /api/v1/environments/{id}/cameras` - Environment cameras
- `GET /api/v1/cameras/{id}` - Camera details

#### **WebSocket Endpoints**
- `ws://host/ws/detections` - Live detection stream
- `ws://host/ws/tracking` - Live tracking updates
- `ws://host/ws/mapping` - Live mapping updates

---

## Future Requirements & Reference Information

### **HTTP API Integration Plans**

#### **Environment & Configuration API**
- **Environment Service Implementation**: `src/services/environmentAPI.ts`
- **API Endpoints**: Environment selection and configuration
- **Camera Configuration API**: `src/services/cameraAPI.ts`
- **Zone & Layout API**: `src/services/zoneAPI.ts`

#### **Session Management API**
- **Session Service Implementation**: `src/services/sessionAPI.ts`
- **API Endpoints**: Session lifecycle management

#### **Analytics & Historical Data API**
- **Analytics Service Implementation**: `src/services/analyticsAPI.ts`
- **Journey & Tracking API**: `src/services/journeyAPI.ts`

### **WebSocket Integration Plans**

#### **Real-Time Connection Management**
- **WebSocket Service Implementation**: `src/services/websocketService.ts`
- **Binary Frame Handler**: `src/services/frameHandler.ts`
- **Tracking Update Handler**: `src/services/trackingHandler.ts`
- **System Status Handler**: `src/services/statusHandler.ts`

### **Data Models & Types**

#### **API Response Types**
- **Detection Types**: `src/types/detection.ts`
- **Tracking Types**: `src/types/tracking.ts`
- **Mapping Types**: `src/types/mapping.ts`

#### **WebSocket Message Types**
- **WebSocket Protocol Types**: `src/types/websocket.ts`

### **Authentication & Security**

#### **Authentication Service**
- **Auth Service Implementation**: `src/services/authService.ts`
- **HTTP Client Security**: `src/services/httpClient.ts`

### **Page-Specific API Integration**

#### **Landing Page Integration**
- **Environment Selection**: `src/pages/SelectZonePage.tsx`
- **UI Reference**: `example_ui/Dashboard.png`

#### **Group View Page Integration**
- **Real-Time Dashboard**: `src/pages/GroupViewPage.tsx`
- **UI Reference**: `example_ui/Dashboard.png`, `example_ui/Dashboard - Select.png`

#### **Detail View Page Integration**
- **Person Detail View**: `src/pages/DetailViewPage.tsx`
- **UI Reference**: `example_ui/Detail view - expand.png`

#### **Analytics Page Integration**
- **Historical Analytics**: `src/pages/AnalyticsPage.tsx`
- **UI Reference**: `example_ui/Analytics (Optional).png`

#### **Settings Page Integration**
- **Configuration Management**: `src/pages/SettingsPage.tsx`
- **UI Reference**: `example_ui/Setting (Optional).png`

---

## Success Criteria

### Phase 0 ✅ Complete
- React 18.2 stable setup with TypeScript
- Atomic design component structure
- Development environment optimized
- Core routing and navigation working

### Phase 1 ✅ Complete
- Feature-based architecture implemented
- State management stores created
- Core dependencies installed
- Development environment stabilized

### Phase 2a ✅ Complete
- Mock API service layer implemented
- Type definitions complete
- Environment configuration ready
- Backend integration prepared

### Phase 2b ✅ Complete
- WebSocket client connected to backend
- Binary frame data processing functional
- Real-time data flow established
- Performance monitoring active

### Phase 3 ✅ Complete
- Interactive camera components working
- Leaflet.js map integration complete
- Click-to-track functionality implemented
- Enhanced UI components operational

### Phase 4 (Upcoming)
- Analytics dashboard functional
- Export and screenshot features working
- Historical data visualization complete
- Advanced analytics implemented

### Phase 5 (Upcoming)
- Performance optimization complete
- WCAG 2.1 AA compliance achieved
- Comprehensive testing implemented
- Production-ready quality assured

### Phase 6 (Upcoming)
- Production build optimized
- Monitoring and analytics active
- Security implementation complete
- Documentation and maintenance ready

---

## UI/UX Implementation Notes

### Page Implementation Priority
1. **Landing Page** (Environment Selection) - Phase 3
2. **Group View Page** (Main Interface) - Phase 3-4
3. **Detail View Page** (Single Camera) - Phase 4
4. **Analytics Page** (Optional) - Phase 5
5. **Settings Page** (Optional) - Phase 5

### Component Development Order
1. **Core Components** (Buttons, Inputs, Modals) - Phase 3
2. **Camera Components** (Views, Overlays) - Phase 3
3. **Map Components** (Interactive Map) - Phase 3-4
4. **Analytics Components** (Charts, Dashboards) - Phase 4
5. **Advanced Components** (Export, Settings) - Phase 5

This planning document provides a comprehensive roadmap for frontend implementation, synchronized with backend development phases to ensure efficient parallel development and seamless integration.