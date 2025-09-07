# SpotOn Frontend Implementation Planning

## Project Overview

This planning document outlines the implementation of the SpotOn frontend to integrate with the AI processing backend, focusing on real-time person detection, tracking, and visualization according to the CODEBASE.md requirements.

## Current State Analysis

### Existing Implementation
- **Group View Page**: Current implementation uses static frame sequences and mock JSON data
- **Camera Grid**: 2x2 grid showing camera feeds with basic bounding box overlays
- **Map Visualization**: 2x2 quadrant map showing tracking points per camera
- **Image Sequence Player**: Handles frame display with coordinate transformations for bounding boxes

### Current Limitations
1. Uses static file paths for frames and tracking data
2. No real backend integration with AI processing pipeline
3. Mock detection counters and status information
4. No person cropping functionality below camera frames
5. No real-time WebSocket communication with backend

## Implementation Requirements

Based on CODEBASE.md and FrontendGuideline.md, the frontend must:

1. **Backend Integration**: Replace static endpoints with actual AI processing backend endpoints
2. **Person Cropping**: Display cropped person images below each camera frame with tracking IDs
3. **Real-time Communication**: Implement WebSocket connection for live tracking data
4. **Health Monitoring**: Implement backend health checks before operations
5. **Task Management**: Integrate with backend processing task lifecycle

## Detailed Implementation Plan

### Phase 1: Backend API Integration

#### 1.1 Health Check System Implementation
- **File**: `src/services/healthCheckService.ts`
- **Purpose**: Monitor backend readiness before WebSocket connections
- **Implementation**:
  ```typescript
  interface HealthResponse {
    status: "healthy";
    detector_model_loaded: boolean;
    prototype_tracker_loaded: boolean;
    homography_matrices_precomputed: boolean;
  }
  
  export class HealthCheckService {
    async checkBackendHealth(): Promise<HealthResponse>
    async waitForHealthy(maxRetries: number, interval: number): Promise<boolean>
  }
  ```

#### 1.2 Task Management Service
- **File**: `src/services/taskManagementService.ts`
- **Purpose**: Manage processing task lifecycle
- **Implementation**:
  ```typescript
  interface ProcessingTaskRequest {
    environment_id: "campus" | "factory";
  }
  
  interface ProcessingTaskResponse {
    task_id: string;
    message: string;
    status_url: string;
    websocket_url: string;
  }
  
  export class TaskManagementService {
    async startProcessingTask(environmentId: string): Promise<ProcessingTaskResponse>
    async getTaskStatus(taskId: string): Promise<TaskStatus>
  }
  ```

#### 1.3 WebSocket Integration Service
- **File**: `src/services/websocketIntegrationService.ts`
- **Purpose**: Handle real-time communication with backend
- **Implementation**:
  ```typescript
  interface TrackingUpdateMessage {
    type: "tracking_update";
    payload: {
      global_frame_index: number;
      scene_id: string;
      timestamp_processed_utc: string;
      cameras: {
        [cameraId: string]: {
          image_source: string;
          frame_image_base64: string; // Base64 encoded frame
          tracks: Track[];
        };
      };
    };
  }
  
  interface StatusUpdateMessage {
    type: "status_update";
    payload: {
      task_id: string;
      status: "QUEUED" | "INITIALIZING" | "PROCESSING" | "COMPLETED" | "FAILED";
      progress: number;
      current_step: string;
      details?: string;
    };
  }
  
  export class WebSocketIntegrationService {
    connect(websocketUrl: string): void
    onTrackingUpdate(callback: (data: TrackingUpdateMessage) => void): void
    onStatusUpdate(callback: (data: StatusUpdateMessage) => void): void
    disconnect(): void
  }
  ```

### Phase 2: Component Updates for Backend Integration

#### 2.1 Updated ImageSequencePlayer Component
- **File**: `src/components/ImageSequencePlayer.tsx` (modify existing)
- **Changes**:
  ```typescript
  interface ImageSequencePlayerProps {
    cameraId: string;
    tracks: Track[] | null;
    frameImageBase64?: string; // New: Base64 frame from WebSocket
    taskId?: string; // New: Task ID for API integration
    className?: string;
    // Remove static file path props (basePath, startFrame, frameCount, etc.)
  }
  ```
- **Key Updates**:
  - Remove static file path logic
  - Use base64 image data from WebSocket tracking_update messages
  - Maintain existing bounding box overlay functionality
  - Add person cropping extraction functionality

#### 2.2 Person Cropping Component
- **File**: `src/components/PersonCroppedImages.tsx` (modify existing)
- **Purpose**: Display cropped person images below camera frames
- **Implementation**:
  ```typescript
  interface PersonCroppedImagesProps {
    frameImageBase64: string;
    tracks: Track[];
    cameraId: string;
    onPersonSelect?: (globalId: string) => void;
  }
  
  export const PersonCroppedImages: React.FC<PersonCroppedImagesProps> = ({
    frameImageBase64, tracks, cameraId, onPersonSelect
  }) => {
    // Extract person crops from base64 frame using bounding box coordinates
    // Display crops horizontally below camera frame
    // Show tracking ID labels
    // Handle click events for person selection
  }
  ```

#### 2.3 Updated Group View Page
- **File**: `src/pages/GroupViewPageRefactored.tsx` (new file)
- **Purpose**: Integrate with backend processing pipeline
- **Key Changes**:
  1. **Initialize Backend Connection**:
     ```typescript
     useEffect(() => {
       const initializeBackend = async () => {
         // 1. Check backend health
         const isHealthy = await healthCheckService.waitForHealthy(10, 3000);
         if (!isHealthy) {
           setError("Backend not available");
           return;
         }
         
         // 2. Start processing task
         const taskResponse = await taskManagementService.startProcessingTask("campus");
         setTaskId(taskResponse.task_id);
         
         // 3. Connect WebSocket
         websocketService.connect(taskResponse.websocket_url);
         websocketService.onTrackingUpdate(handleTrackingUpdate);
         websocketService.onStatusUpdate(handleStatusUpdate);
       };
       
       initializeBackend();
     }, []);
     ```

  2. **Handle Real-time Updates**:
     ```typescript
     const handleTrackingUpdate = (message: TrackingUpdateMessage) => {
       // Update camera frame data with base64 images and tracks
       setCameraData(message.payload.cameras);
       // Update map coordinates for visualization
       updateMapVisualization(message.payload.cameras);
     };
     
     const handleStatusUpdate = (message: StatusUpdateMessage) => {
       setProcessingStatus(message.payload.status);
       setProcessingProgress(message.payload.progress);
     };
     ```

  3. **Updated Camera Grid Rendering**:
     ```typescript
     {/* Camera Grid with Person Crops */}
     <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
       {Object.entries(cameraData).map(([jsonCameraId, data]) => {
         const appCameraId = jsonIdToAppCameraId[jsonCameraId];
         return (
           <div key={jsonCameraId} className="flex flex-col">
             {/* Camera Frame */}
             <ImageSequencePlayer
               cameraId={appCameraId}
               tracks={data.tracks}
               frameImageBase64={data.frame_image_base64}
               taskId={taskId}
               className="flex-1"
             />
             {/* Person Crops Below Frame */}
             <PersonCroppedImages
               frameImageBase64={data.frame_image_base64}
               tracks={data.tracks}
               cameraId={appCameraId}
               onPersonSelect={handlePersonSelect}
             />
           </div>
         );
       })}
     </div>
     ```

### Phase 3: Enhanced Features Implementation

#### 3.1 Environment Selection Integration
- **File**: `src/pages/SelectZonePage.tsx` (modify existing)
- **Changes**:
  - Update zone paths to pass environment_id parameter
  - Add environment validation
  - Connect to backend environment configuration

#### 3.2 Real-time Status Monitoring
- **File**: `src/components/ProcessingStatusPanel.tsx` (new)
- **Purpose**: Display processing status and progress
- **Features**:
  - Processing status indicators (QUEUED, PROCESSING, etc.)
  - Progress bar with current step information
  - Error handling and recovery options

#### 3.3 Enhanced Map Visualization
- **File**: `src/components/EnhancedTrackingMap.tsx` (new)
- **Purpose**: Improved map visualization with real-time updates
- **Features**:
  - Real-time coordinate updates from WebSocket
  - Person trajectory history
  - Cross-camera tracking visualization
  - Interactive person selection

#### 3.4 Detection Statistics Integration
- **File**: `src/components/RealTimeDetectionStats.tsx` (new)
- **Purpose**: Replace mock detection counters with real data
- **Features**:
  - Live detection counts per camera
  - Detection confidence statistics
  - Historical detection trends

### Phase 4: Error Handling and Resilience

#### 4.1 Connection Management
- **File**: `src/services/connectionManagerService.ts`
- **Purpose**: Handle WebSocket reconnection and error recovery
- **Features**:
  - Automatic reconnection with exponential backoff
  - Connection state monitoring
  - Graceful degradation for offline scenarios

#### 4.2 Data Validation Service
- **File**: `src/services/dataValidationService.ts`
- **Purpose**: Validate incoming WebSocket data
- **Features**:
  - Message type validation
  - Data integrity checks
  - Error logging and recovery

### Phase 5: Performance Optimization

#### 5.1 Frame Processing Optimization
- **Optimizations**:
  - Base64 image caching
  - Person crop extraction optimization
  - Canvas-based rendering for better performance
  - Memory management for long-running sessions

#### 5.2 State Management Optimization
- **File**: `src/stores/trackingStore.ts` (modify existing)
- **Improvements**:
  - Efficient state updates for real-time data
  - Selective re-rendering optimization
  - Memory-efficient data structures

## Implementation Sequence

### Week 1: Core Backend Integration
1. Implement health check service
2. Implement task management service
3. Implement WebSocket integration service
4. Update ImageSequencePlayer for base64 images

### Week 2: Component Integration
1. Create PersonCroppedImages component
2. Update GroupViewPage with backend integration
3. Implement ProcessingStatusPanel
4. Update SelectZonePage for environment selection

### Week 3: Enhanced Features
1. Implement EnhancedTrackingMap
2. Create RealTimeDetectionStats
3. Add error handling and resilience features
4. Implement connection management

### Week 4: Testing and Optimization
1. End-to-end testing with backend
2. Performance optimization
3. Error scenario testing
4. User experience refinements

## File Structure Changes

```
src/
├── components/
│   ├── ImageSequencePlayer.tsx           # Modified for backend integration
│   ├── PersonCroppedImages.tsx           # New: Person cropping display
│   ├── ProcessingStatusPanel.tsx         # New: Status monitoring
│   ├── EnhancedTrackingMap.tsx          # New: Enhanced map
│   └── RealTimeDetectionStats.tsx       # New: Live statistics
├── pages/
│   ├── GroupViewPageRefactored.tsx       # New: Backend-integrated view
│   └── SelectZonePage.tsx               # Modified for environment selection
├── services/
│   ├── healthCheckService.ts            # New: Backend health monitoring
│   ├── taskManagementService.ts         # New: Task lifecycle management
│   ├── websocketIntegrationService.ts   # New: Real-time communication
│   ├── connectionManagerService.ts      # New: Connection resilience
│   └── dataValidationService.ts         # New: Data integrity
├── stores/
│   └── trackingStore.ts                 # Modified for real-time state
└── types/
    ├── backend.ts                       # New: Backend API types
    └── websocket.ts                     # New: WebSocket message types
```

## Testing Strategy

### Unit Testing
- Service layer testing with mocked backend responses
- Component testing with mock WebSocket data
- Data validation testing

### Integration Testing
- End-to-end testing with actual backend
- WebSocket connection testing
- Error scenario testing

### Performance Testing
- Frame processing performance
- Memory usage monitoring
- WebSocket message handling performance

## Success Criteria

### Functional Requirements
1. ✅ Real-time person detection visualization
2. ✅ Cross-camera tracking with global IDs
3. ✅ Person cropping display below camera frames
4. ✅ Live map coordinate updates
5. ✅ Processing status monitoring
6. ✅ Error handling and recovery

### Performance Requirements
1. ✅ < 100ms frame update latency
2. ✅ Smooth real-time visualization
3. ✅ Memory efficient for long sessions
4. ✅ Responsive UI during processing

### Integration Requirements
1. ✅ Seamless backend health monitoring
2. ✅ Reliable WebSocket communication
3. ✅ Proper error handling and user feedback
4. ✅ Production-ready deployment compatibility

This planning document provides a comprehensive roadmap for implementing the SpotOn frontend with full backend integration, real-time person tracking, and enhanced user experience features as specified in the CODEBASE.md requirements.