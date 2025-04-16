// src/mockData/bboxData.ts

import { FrameTrackingData } from '../types/trackingData';

// Map Frame Index -> Full Frame Data
// We'll store data indexed by the 0-based frame index used in GroupViewPage state.
// For camera 'c09' (frontend 'camera1'), frames 0 to 50.
export const mockTrackingData: Record<number, FrameTrackingData> = {};

// --- Populate data for Camera 'c09' (frontend 'camera1') ---

// Example for frame index 0 (maps to image file 000000.jpg if startFrame=0)
mockTrackingData[0] = {
  frame_index: 0,
  // scene_id: "s10", // Optional
  // timestamp_processed_utc: "2025-04-16T03:58:04.412119+00:00", // Optional
  cameras: {
    "c09": { // Match the camera ID from your backend data source
      image_source: "000000.jpg",
      tracks: [
        { track_id: 1, global_id: 1, bbox_xyxy: [840.24, 333.15, 1040.86, 897.52], confidence: 0.99 },
        { track_id: 2, global_id: 2, bbox_xyxy: [519.58, 230.65, 608.94, 487.78], confidence: 0.99 },
      ]
    },
    // Add data for other cameras in this frame if needed (e.g., "c10", etc.)
  }
};

// Example for frame index 1 (e.g., image file 000001.jpg) - ADJUST BBOXES
mockTrackingData[1] = {
  frame_index: 1,
  cameras: {
    "c09": {
      image_source: "000001.jpg",
      tracks: [
        { track_id: 1, global_id: 1, bbox_xyxy: [845.1, 338.2, 1045.5, 902.1], confidence: 0.99 }, // Slightly moved
        // Person 2 might have left or moved
        { track_id: 3, global_id: 3, bbox_xyxy: [200.0, 150.0, 280.0, 400.0], confidence: 0.98 }, // New person
      ]
    },
  }
};

// ... Add mock data for other frame indices (2, 3, ..., 50) for camera 'c09' ...
// You can copy/paste and slightly adjust the coordinates for simulation.
// For indices with no detections, provide an empty 'tracks' array:
// mockTrackingData[X] = { frame_index: X, cameras: { "c09": { tracks: [] } } };

// If a frame index is missing from mockTrackingData, we'll assume no boxes.