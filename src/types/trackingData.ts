// src/types/trackingData.ts (or wherever you prefer to keep types)

export interface BoundingBox {
    track_id: number;
    global_id: number; // Or just use track_id if sufficient
    bbox_xyxy: [number, number, number, number]; // [x_min, y_min, x_max, y_max]
    confidence?: number; // Optional
    class_id?: number; // Optional
    // map_coords?: [number, number]; // Optional for now
  }
  
  // Represents the data for a single camera within a specific frame
  export interface CameraTrackingData {
    image_source?: string; // Optional
    tracks: BoundingBox[];
  }
  
  // Represents the overall data structure for one frame from the backend/mock
  export interface FrameTrackingData {
      frame_index: number; // Corresponds to the 0-based index used in GroupViewPage state
      cameras: {
          [cameraId: string]: CameraTrackingData; // e.g., cameras['c09']
      };
      // Add other top-level fields like timestamp if needed
  }