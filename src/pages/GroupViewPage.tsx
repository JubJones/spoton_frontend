// src/pages/GroupViewPage.tsx
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import DetectionPersonList from "../components/DetectionPersonList";
// import ImageSequencePlayer from "../components/ImageSequencePlayer"; // Not used in this version
import { CameraMapPair } from "../components/mapping";
import { useMappingData } from "../hooks/useMappingData";
import TaskPlaybackControls from "../components/TaskPlaybackControls";
import type { BackendCameraId, EnvironmentId, PlaybackStatusResponse } from "../types/api";
import { DEFAULT_CONFIG, WEBSOCKET_ENDPOINTS, API_ENDPOINTS } from "../types/api";
import { useCameraConfig } from "../context/CameraConfigContext";

// --- Type Definitions ---
interface Track {
  track_id: number;
  global_id?: string; // Optional for detection mode (no tracking yet)
  bbox_xyxy: [number, number, number, number];
  confidence: number;
  class_id: number;
  map_coords?: [number, number]; // Optional for detection mode
  detection_class?: string; // Detection-specific field
  detection_score?: number; // Detection-specific field
}

interface CameraData {
  frame_image_base64?: string;  // Contains annotated frame with bounding boxes
  original_frame_base64?: string; // Original frame without annotations
  tracks: Track[]; // Will be empty for detection mode
  frame_width?: number;
  frame_height?: number;
  timestamp?: string;
}

// Aggregate frame data built incrementally from per-camera messages
interface CurrentFrameAggregate {
  global_frame_index: number;
  timestamp_processed_utc: string;
  cameras: Record<string, CameraData>;
}

// Updated interface for unified message format (per-camera messages)
interface DetectionFrameData {
  type: string;
  task_id: string;
  camera_id: string; // NEW: Per-camera messages
  global_frame_index: number;
  timestamp_processed_utc: string;
  mode: string; // Should be 'detection_streaming'
  camera_data: CameraData; // NEW: Single camera data per message
  detection_data?: {
    detections: Array<{
      detection_id: string;
      class_name: string;
      class_id: number;
      confidence: number;
      bbox: {
        x1: number; y1: number; x2: number; y2: number;
        width: number; height: number;
        center_x: number; center_y: number;
      };
      track_id: null;
      global_id: null;
      map_coords: { map_x: number; map_y: number };
    }>;
    detection_count: number;
    processing_time_ms: number;
  };
}

interface SystemHealth {
  status: string;
  detector_model_loaded?: boolean;
  redis_connected?: boolean;
  processing_tasks_active?: number;
}

interface DetectionListItem {
  detection_id: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
    center_x: number;
    center_y: number;
  };
  map_coords?: {
    map_x: number;
    map_y: number;
  };
  class_name: string;
  class_id: number;
  track_id?: number;
  global_id?: string | null;
  tracking_key?: string;
  track_assignment_iou?: number;
  track_assignment_center_distance?: number;
  metadata?: Record<string, unknown>;
}

interface DetectionStoreEntry {
  camera_id: string;
  frame_image_base64?: string;
  detections: DetectionListItem[];
  processing_time_ms: number;
}

interface DetectionTask {
  task_id: string;
  status: string; // QUEUED, INITIALIZING, PROCESSING, COMPLETED, FAILED
  environment_id: string;
  created_at: string;
}
// --- End Type Definitions ---

// --- Configuration ---
const BACKEND_BASE_URL = "http://localhost:3847";  // Updated to match Docker backend port
const BACKEND_WS_URL = "ws://localhost:3847";

type TabType = "all" | BackendCameraId;
const MAP_SOURCE_WIDTH = 1920; // Source width for map_coords (per camera)
const MAP_SOURCE_HEIGHT = 1080; // Source height for map_coords (per camera)

// --- MODIFIED: Type for storing calculated map points (per camera) ---

const normalizeGlobalId = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const stringValue = String(value);
  return stringValue.length > 0 ? stringValue : undefined;
};
interface SingleCameraMapPoint {
  x: number;         // Scaled x-coordinate for display within a quadrant
  y: number;         // Scaled y-coordinate for display within a quadrant
  globalId: number;
}

const defaultDotColor = 'bg-gray-500';

const BBOX_MATCH_TOLERANCE = 36;

const calculateIoU = (a: [number, number, number, number], b: [number, number, number, number]): number => {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  if ([ax1, ay1, ax2, ay2, bx1, by1, bx2, by2].some((value) => typeof value !== 'number' || Number.isNaN(value))) {
    return 0;
  }
  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;
  const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
  const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
  const denom = areaA + areaB - interArea;
  if (!Number.isFinite(denom) || denom <= 0) {
    return 0;
  }
  const iou = interArea / denom;
  return Number.isFinite(iou) ? iou : 0;
};

interface FocusedPersonState {
  cameraId: BackendCameraId;
  trackKey: string | null;
  detectionKey?: string;
  bbox: [number, number, number, number];
  globalId?: string;
}

// --- GroupViewPage Component ---

interface CameraStreamViewProps {
  taskId: string | null;
  cameraId: string;
  isStreaming: boolean;
  tracks: Track[];
  onTrackClick: (track: Track) => void;
  focusedPerson: FocusedPersonState | null;
  onFrameCapture?: (cameraId: string, frameBase64: string) => void;
}

// Memoized to prevent re-renders when props haven't changed
const CameraStreamView = memo<CameraStreamViewProps>(({ taskId, cameraId, isStreaming, tracks, onTrackClick, focusedPerson, onFrameCapture }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  // Ref for tracking RAF to prevent memory leaks
  const rafRef = useRef<number | null>(null);

  // Frame capture - interval-based for MJPEG (load event doesn't fire per frame)
  // Throttled to 2fps (500ms) for performance
  useEffect(() => {
    if (!isStreaming || !taskId || !onFrameCapture) return;

    const captureFrame = () => {
      const img = imgRef.current;
      const captureCanvas = captureCanvasRef.current;
      if (!img || !captureCanvas || img.naturalWidth === 0) return;

      const ctx = captureCanvas.getContext('2d');
      if (!ctx) return;

      try {
        // Set canvas to match image natural dimensions
        captureCanvas.width = img.naturalWidth;
        captureCanvas.height = img.naturalHeight;

        // Draw the current MJPEG frame to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to base64
        const frameBase64 = captureCanvas.toDataURL('image/jpeg', 0.7);
        onFrameCapture(cameraId, frameBase64);
      } catch {
        // Cross-origin or security error - ignore silently
      }
    };

    // Initial capture after stream loads
    const initialTimeout = setTimeout(captureFrame, 1000);

    // Capture at 2fps (500ms) - more efficient than before
    const interval = setInterval(captureFrame, 500);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isStreaming, taskId, cameraId, onFrameCapture]);

  // Canvas drawing with requestAnimationFrame for smooth rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    // Draw function - called via RAF
    const draw = () => {
      const { width, height } = container.getBoundingClientRect();

      // Only resize canvas if dimensions changed
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isStreaming || !taskId) return;

      // Draw Logic - Image source dimensions are 1920x1080
      const srcW = 1920;
      const srcH = 1080;

      // Calculate letterboxing
      const srcRatio = srcW / srcH;
      const containerRatio = width / height;

      let drawW: number, drawH: number, offsetX: number, offsetY: number;

      if (containerRatio > srcRatio) {
        drawH = height;
        drawW = height * srcRatio;
        offsetX = (width - drawW) / 2;
        offsetY = 0;
      } else {
        drawW = width;
        drawH = width / srcRatio;
        offsetX = 0;
        offsetY = (height - drawH) / 2;
      }

      // Draw tracks
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const [x1, y1, x2, y2] = track.bbox_xyxy;

        // Map 1920x1080 coords to drawn image rect
        const dx1 = offsetX + (x1 / srcW) * drawW;
        const dy1 = offsetY + (y1 / srcH) * drawH;
        const dx2 = offsetX + (x2 / srcW) * drawW;
        const dy2 = offsetY + (y2 / srcH) * drawH;

        const w = dx2 - dx1;
        const h = dy2 - dy1;

        // Check focus - highlight by global_id across ALL cameras
        let isFocused = false;
        if (focusedPerson) {
          const globalId = track.global_id !== undefined ? String(track.global_id) : undefined;
          const personGlobalId = focusedPerson.globalId;

          if (personGlobalId && globalId && globalId === personGlobalId) {
            isFocused = true;
          }

          if (!isFocused && focusedPerson.cameraId === cameraId) {
            if (focusedPerson.trackKey && focusedPerson.trackKey.includes(String(track.track_id))) {
              isFocused = true;
            }
          }
        }

        ctx.strokeStyle = isFocused ? '#FFD700' : '#32CD32';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx1, dy1, w, h);

        // ID Label
        ctx.font = 'bold 12px sans-serif';
        const labelText = `ID: ${track.global_id ?? track.track_id}`;
        const textMetrics = ctx.measureText(labelText);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(dx1, dy1 - 16, textMetrics.width + 4, 16);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, dx1 + 2, dy1 - 4);
      }
    };

    // Schedule draw with RAF
    const scheduleRafDraw = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    // Debounced resize handler (100ms)
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(scheduleRafDraw, 100);
    };

    // Initial draw
    scheduleRafDraw();

    // Listen for resize with debounce
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tracks, isStreaming, taskId, focusedPerson, cameraId]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {/* Hidden canvas for frame capture */}
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {isStreaming && taskId ? (
        <img
          ref={imgRef}
          src={`${BACKEND_BASE_URL}/api/v1/stream/${taskId}/${cameraId}`}
          className="w-full h-full object-contain"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="text-gray-500">Waiting for stream...</div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer"
        onClick={(e) => {
          // Hit testing for tracks?
          // For now just pass generic click or unimplemented.
          // Implementing hit-testing on canvas is complex.
          // Fallback: If user clicks, maybe just clear focus?
        }}
      />
    </div>
  );
});

// Display name for React DevTools
CameraStreamView.displayName = 'CameraStreamView';

const GroupViewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrameData, setCurrentFrameData] = useState<CurrentFrameAggregate | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatusResponse | null>(null);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const focusWsRef = useRef<WebSocket | null>(null);

  // Camera frame data stored as base64 strings - REMOVED
  // const [cameraFrames, setCameraFrames] = useState<{ [jsonCameraId: string]: string }>({});

  // Add debugging states for image rendering - REMOVED
  // const [imageLoadingStates, setImageLoadingStates] = useState<{ [jsonCameraId: string]: 'loading' | 'loaded' | 'error' | 'none' }>({});
  // const [imageDebugInfo, setImageDebugInfo] = useState<{ [jsonCameraId: string]: any }>({});

  const overallMapContainerRef = useRef<HTMLDivElement>(null);
  const [overallMapDimensions, setOverallMapDimensions] = useState({ width: 0, height: 0 });

  // State to store points per camera
  const [perCameraMapPoints, setPerCameraMapPoints] = useState<{ [jsonCameraId: string]: SingleCameraMapPoint[] }>({});

  // State to store detection data for PersonList component
  const [detectionData, setDetectionData] = useState<{ [camera_id: string]: DetectionStoreEntry }>({});

  // State to store captured frames from MJPEG streams for person cropping
  const [capturedFrames, setCapturedFrames] = useState<{ [camera_id: string]: string }>({});

  const videoAreaRef = useRef<HTMLDivElement | null>(null);
  const [videoAreaHeight, setVideoAreaHeight] = useState<number>();

  const [focusedPerson, setFocusedPerson] = useState<FocusedPersonState | null>(null);

  // Mapping data hook - listens for 'websocket-mapping-message' events
  const { mappingData, getMappingForCamera } = useMappingData({ enabled: true, maxTrailLength: 3 });

  const {
    environmentCameras,
    isLoading: cameraConfigLoading,
    error: cameraConfigError,
    getDisplayName: getCameraDisplayNameById,
  } = useCameraConfig();

  // Get environment from URL parameters
  const getEnvironmentFromUrl = useCallback((): EnvironmentId => {
    const urlParams = new URLSearchParams(window.location.search);
    const environment = urlParams.get('environment');
    return environment === 'factory' ? 'factory' : 'campus';
  }, []);

  const environment = getEnvironmentFromUrl();
  const cameraIds: BackendCameraId[] = environmentCameras[environment] ?? [];

  const getTrackKey = useCallback((cameraId: BackendCameraId, track: Track) => {
    const globalId = track.global_id;
    if (globalId !== undefined && globalId !== null) {
      return `global:${String(globalId)} `;
    }
    return `camera:${cameraId}:${track.track_id} `;
  }, []);

  const areBboxesClose = useCallback((
    bboxA: [number, number, number, number],
    bboxB: [number, number, number, number],
    tolerance: number = BBOX_MATCH_TOLERANCE
  ) => {
    return (
      Math.abs(bboxA[0] - bboxB[0]) <= tolerance &&
      Math.abs(bboxA[1] - bboxB[1]) <= tolerance &&
      Math.abs(bboxA[2] - bboxB[2]) <= tolerance &&
      Math.abs(bboxA[3] - bboxB[3]) <= tolerance
    );
  }, []);

  const findTrackMatchingDetection = useCallback((cameraId: BackendCameraId, detection: DetectionListItem) => {
    const cameraTracks = currentFrameData?.cameras?.[cameraId]?.tracks ?? [];
    if (cameraTracks.length === 0) {
      return undefined;
    }

    if (typeof detection.track_id === 'number') {
      const directMatch = cameraTracks.find((track) => track.track_id === detection.track_id);
      if (directMatch) {
        return directMatch;
      }
    }

    if (detection.tracking_key) {
      const keyMatch = cameraTracks.find((track) => getTrackKey(cameraId, track) === detection.tracking_key);
      if (keyMatch) {
        return keyMatch;
      }
    }

    const detectionBbox: [number, number, number, number] = [
      detection.bbox.x1,
      detection.bbox.y1,
      detection.bbox.x2,
      detection.bbox.y2,
    ];

    let bestTrack: Track | undefined;
    let bestIoU = -1;
    let bestCenterDist = Number.POSITIVE_INFINITY;
    const [dx1, dy1, dx2, dy2] = detectionBbox;
    const detectionCenter: [number, number] = [(dx1 + dx2) / 2, (dy1 + dy2) / 2];
    const trackDiagnostics: Array<{
      trackKey: string;
      trackId: number | undefined;
      globalId: string | number | undefined | null;
      iou: number;
      centerDistance: number;
      bbox: [number, number, number, number];
    }> = [];

    for (const track of cameraTracks) {
      const iou = calculateIoU(track.bbox_xyxy, detectionBbox);
      const [tx1, ty1, tx2, ty2] = track.bbox_xyxy;
      const trackCenter: [number, number] = [(tx1 + tx2) / 2, (ty1 + ty2) / 2];
      const dist = Math.hypot(trackCenter[0] - detectionCenter[0], trackCenter[1] - detectionCenter[1]);

      if (cameraId === 'c12') {
        trackDiagnostics.push({
          trackKey: getTrackKey(cameraId, track),
          trackId: track.track_id,
          globalId: track.global_id,
          iou: Number.isFinite(iou) ? Number(iou.toFixed(4)) : iou,
          centerDistance: Number.isFinite(dist) ? Number(dist.toFixed(2)) : dist,
          bbox: [tx1, ty1, tx2, ty2],
        });
      }

      if (iou > bestIoU || (Math.abs(iou - bestIoU) < 1e-6 && dist < bestCenterDist)) {
        bestIoU = iou;
        bestCenterDist = dist;
        bestTrack = track;
      }
    }

    if (cameraId === 'c12') {
      const bestTrackKey = bestTrack ? getTrackKey(cameraId, bestTrack) : null;
      console.debug('🧪 c12 detection↔track matching', {
        detectionBbox,
        detectionCenter,
        bestTrackKey,
        bestIoU: Number.isFinite(bestIoU) ? Number(bestIoU.toFixed(4)) : bestIoU,
        bestCenterDist: Number.isFinite(bestCenterDist) ? Number(bestCenterDist.toFixed(2)) : bestCenterDist,
        trackDiagnostics,
      });
    }

    return bestTrack ?? cameraTracks[0];
  }, [currentFrameData, getTrackKey]);

  const findDetectionForTrack = useCallback((cameraId: BackendCameraId, track: Track) => {
    const cameraDetections = detectionData[cameraId];
    if (!cameraDetections?.detections) {
      return undefined;
    }

    const trackBbox = track.bbox_xyxy;
    const directMatch = cameraDetections.detections.find(
      (detection: DetectionListItem) => typeof detection.track_id === 'number' && detection.track_id === track.track_id
    );
    if (directMatch) {
      return directMatch;
    }

    const trackingKeyMatch = cameraDetections.detections.find(
      (detection: DetectionListItem) => detection.tracking_key && detection.tracking_key === getTrackKey(cameraId, track)
    );
    if (trackingKeyMatch) {
      return trackingKeyMatch;
    }

    let bestDetection: DetectionListItem | undefined;
    let bestIoU = -1;
    let bestCenterDist = Number.POSITIVE_INFINITY;
    const [tx1, ty1, tx2, ty2] = trackBbox;
    const trackCenter: [number, number] = [(tx1 + tx2) / 2, (ty1 + ty2) / 2];

    cameraDetections.detections.forEach((detection: DetectionListItem) => {
      const detectionBbox: [number, number, number, number] = [
        detection.bbox.x1,
        detection.bbox.y1,
        detection.bbox.x2,
        detection.bbox.y2,
      ];
      const iou = calculateIoU(trackBbox, detectionBbox);
      const detectionCenter: [number, number] = [
        (detectionBbox[0] + detectionBbox[2]) / 2,
        (detectionBbox[1] + detectionBbox[3]) / 2,
      ];
      const dist = Math.hypot(trackCenter[0] - detectionCenter[0], trackCenter[1] - detectionCenter[1]);

      if (iou > bestIoU || (Math.abs(iou - bestIoU) < 1e-6 && dist < bestCenterDist)) {
        bestIoU = iou;
        bestCenterDist = dist;
        bestDetection = detection;
      }
    });

    return bestDetection ?? cameraDetections.detections[0];
  }, [detectionData, getTrackKey]);

  const sendFocusMessage = useCallback((message: Record<string, unknown>) => {
    const socket = focusWsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('Focus WebSocket not ready; skipping focus message.', message);
      return;
    }

    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send focus message', error);
    }
  }, []);

  const handleFocusUpdate = useCallback((payload: any) => {
    console.log('🎯 Focus update received', payload);
    if (!payload || !payload.is_active) {
      setFocusedPerson((prev) => (prev ? null : prev));
      return;
    }

    const details = payload.person_details || {};
    const cameraIdValue = details.camera_id || details.current_camera;
    if (!cameraIdValue) {
      return;
    }

    const bboxDict = details.bbox;
    const nextBbox = bboxDict
      ? [bboxDict.x1, bboxDict.y1, bboxDict.x2, bboxDict.y2]
      : undefined;
    const trackIdValue = typeof details.track_id === 'number' ? details.track_id : undefined;
    const detectionIdValue = typeof details.detection_id === 'string' ? details.detection_id : undefined;

    setFocusedPerson(() => ({
      cameraId: cameraIdValue as BackendCameraId,
      trackKey: trackIdValue !== undefined ? `camera:${cameraIdValue}:${trackIdValue} ` : null,
      detectionKey: detectionIdValue ? `${cameraIdValue} -${detectionIdValue} ` : undefined,
      bbox: (nextBbox as [number, number, number, number]) || [0, 0, 0, 0],
      globalId: normalizeGlobalId(payload.focused_person_id),
    }));
  }, []);

  const disconnectFocusWebSocket = useCallback(() => {
    if (focusWsRef.current) {
      focusWsRef.current.onmessage = null;
      focusWsRef.current.onopen = null;
      focusWsRef.current.onclose = null;
      focusWsRef.current.onerror = null;
      focusWsRef.current.close();
      focusWsRef.current = null;
    }
  }, []);

  const connectFocusWebSocket = useCallback((taskId: string) => {
    try {
      disconnectFocusWebSocket();
      const url = `${DEFAULT_CONFIG.WS_BASE_URL}${WEBSOCKET_ENDPOINTS.FOCUS(taskId)} `;
      const socket = new WebSocket(url);
      focusWsRef.current = socket;

      socket.onopen = () => {
        console.log('🎯 Focus WebSocket connected:', url);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'focus_update') {
            handleFocusUpdate(message.payload);
          } else if (message?.type === 'pong') {
            console.debug('🎯 Focus pong received');
          }
        } catch (error) {
          console.error('Failed to parse focus WebSocket message', error);
        }
      };

      socket.onclose = () => {
        console.log('🎯 Focus WebSocket closed');
        focusWsRef.current = null;
      };

      socket.onerror = (error) => {
        console.error('Focus WebSocket error', error);
      };
    } catch (error) {
      console.error('Failed to connect focus WebSocket', error);
    }
  }, [disconnectFocusWebSocket, handleFocusUpdate]);

  const clearBackendFocus = useCallback(() => {
    console.log('🎯 Sending clear_focus');
    sendFocusMessage({ type: 'clear_focus' });
  }, [sendFocusMessage]);

  const focusOnBackend = useCallback((params: {
    personId: string;
    cameraId: BackendCameraId;
    trackId?: number;
    detectionId?: string;
    bbox: [number, number, number, number];
    confidence?: number;
  }) => {
    const { personId, cameraId, trackId, detectionId, bbox, confidence } = params;
    console.log('🎯 Sending set_focus', params);
    sendFocusMessage({
      type: 'set_focus',
      person_id: personId,
      person_details: {
        camera_id: cameraId,
        current_camera: cameraId,
        track_id: trackId,
        detection_id: detectionId,
        bbox: {
          x1: bbox[0],
          y1: bbox[1],
          x2: bbox[2],
          y2: bbox[3],
        },
        confidence,
        first_detected: new Date().toISOString(),
        position_history: [],
        movement_metrics: {},
      },
    });
  }, [sendFocusMessage]);

  useEffect(() => {
    if (activeTab !== "all" && !cameraIds.includes(activeTab)) {
      setActiveTab("all");
    }
  }, [activeTab, cameraIds]);

  useEffect(() => {
    return () => {
      disconnectFocusWebSocket();
    };
  }, [disconnectFocusWebSocket]);

  const fetchPlaybackStatusForTask = useCallback(async (targetTaskId: string): Promise<PlaybackStatusResponse> => {
    const response = await fetch(
      `${BACKEND_BASE_URL}${API_ENDPOINTS.PLAYBACK_STATUS(targetTaskId)} `
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Failed to fetch playback status(${response.status})`);
    }

    const payload = (await response.json()) as PlaybackStatusResponse;
    setPlaybackStatus(payload);
    return payload;
  }, []);

  const sendPlaybackCommand = useCallback(
    async (targetTaskId: string, action: 'pause' | 'resume'): Promise<PlaybackStatusResponse> => {
      const endpoint =
        action === 'pause'
          ? API_ENDPOINTS.PLAYBACK_PAUSE(targetTaskId)
          : API_ENDPOINTS.PLAYBACK_RESUME(targetTaskId);

      const response = await fetch(`${BACKEND_BASE_URL}${endpoint} `, { method: 'POST' });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to ${action} playback(${response.status})`);
      }

      const payload = (await response.json()) as PlaybackStatusResponse;
      setPlaybackStatus(payload);
      return payload;
    },
    []
  );

  const pausePlaybackCommand = useCallback(async (): Promise<PlaybackStatusResponse | null> => {
    if (!taskId) {
      return null;
    }
    return sendPlaybackCommand(taskId, 'pause');
  }, [taskId, sendPlaybackCommand]);

  const resumePlaybackCommand = useCallback(async (): Promise<PlaybackStatusResponse | null> => {
    if (!taskId) {
      return null;
    }
    return sendPlaybackCommand(taskId, 'resume');
  }, [taskId, sendPlaybackCommand]);

  const refreshPlaybackStatusCommand = useCallback(async (): Promise<PlaybackStatusResponse | null> => {
    if (!taskId) {
      setPlaybackStatus(null);
      return null;
    }
    return fetchPlaybackStatusForTask(taskId);
  }, [taskId, fetchPlaybackStatusForTask]);

  useEffect(() => {
    if (!taskId) {
      setPlaybackStatus(null);
      return;
    }

    fetchPlaybackStatusForTask(taskId).catch((err) => {
      console.error('Failed to fetch playback status', err);
    });
  }, [taskId, fetchPlaybackStatusForTask]);

  useEffect(() => {
    if (!focusedPerson) {
      return;
    }

    // If we have a globalId, search across ALL cameras for matching tracks
    if (focusedPerson.globalId && currentFrameData?.cameras) {
      let foundInAnyCamera = false;

      for (const [camId, camData] of Object.entries(currentFrameData.cameras)) {
        const cameraTracks = camData.tracks ?? [];
        for (const track of cameraTracks) {
          const globalId = track.global_id !== undefined && track.global_id !== null
            ? String(track.global_id)
            : undefined;

          if (globalId === focusedPerson.globalId) {
            foundInAnyCamera = true;

            // Update the focused person with the latest bbox from the first matching camera
            // This keeps the focus state valid but allows cross-camera highlighting
            const nextTrackKey = getTrackKey(camId as BackendCameraId, track);
            const nextBbox = track.bbox_xyxy;

            setFocusedPerson((prev) => {
              if (!prev) return prev;

              // Only update if something changed
              const bboxChanged = !areBboxesClose(prev.bbox, nextBbox, 2);
              const trackChanged = prev.trackKey !== nextTrackKey;

              if (!bboxChanged && !trackChanged && prev.cameraId === camId) {
                return prev;
              }

              return {
                ...prev,
                cameraId: camId as BackendCameraId,
                trackKey: nextTrackKey,
                bbox: nextBbox,
              };
            });
            break; // Found in at least one camera, that's enough
          }
        }
        if (foundInAnyCamera) break;
      }

      // If person with globalId not found in any camera, don't clear focus immediately
      // They might reappear in a subsequent frame - only clear after extended absence
      // For now, we just keep the last known state
      if (foundInAnyCamera) {
        return; // Successfully found and updated
      }
      // Fall through to original camera check as fallback
    }

    // Fallback: Check original camera for tracks without globalId
    const cameraId = focusedPerson.cameraId;
    const cameraTracks = currentFrameData?.cameras?.[cameraId]?.tracks ?? [];

    let matchedTrack: Track | undefined;
    for (const track of cameraTracks) {
      const trackKey = getTrackKey(cameraId, track);
      const globalId = track.global_id !== undefined && track.global_id !== null
        ? String(track.global_id)
        : undefined;

      const isMatch =
        (focusedPerson.trackKey && trackKey === focusedPerson.trackKey) ||
        (focusedPerson.globalId && globalId === focusedPerson.globalId) ||
        areBboxesClose(track.bbox_xyxy, focusedPerson.bbox);

      if (isMatch) {
        matchedTrack = track;
        break;
      }
    }

    if (matchedTrack) {
      const nextTrackKey = getTrackKey(cameraId, matchedTrack);
      const nextGlobalId =
        matchedTrack.global_id !== undefined && matchedTrack.global_id !== null
          ? String(matchedTrack.global_id)
          : undefined;
      const nextBbox = matchedTrack.bbox_xyxy;

      setFocusedPerson((prev) => {
        if (!prev) {
          return prev;
        }

        const trackChanged = prev.trackKey !== nextTrackKey;
        const globalChanged =
          nextGlobalId !== undefined && nextGlobalId !== prev.globalId;
        const bboxChanged = !areBboxesClose(prev.bbox, nextBbox, 2);

        if (!trackChanged && !globalChanged && !bboxChanged) {
          return prev;
        }

        return {
          ...prev,
          trackKey: nextTrackKey,
          bbox: nextBbox,
          globalId: nextGlobalId ?? prev.globalId,
        };
      });
      return;
    }

    const cameraDetections = (detectionData[cameraId]?.detections ?? []) as DetectionListItem[];
    const matchedDetection = cameraDetections.find((detection) => {
      const detectionKey = `${cameraId} -${detection.detection_id} `;
      if (focusedPerson.detectionKey && detectionKey === focusedPerson.detectionKey) {
        return true;
      }
      const detectionBbox: [number, number, number, number] = [
        detection.bbox.x1,
        detection.bbox.y1,
        detection.bbox.x2,
        detection.bbox.y2,
      ];
      return areBboxesClose(detectionBbox, focusedPerson.bbox);
    });

    if (matchedDetection) {
      const nextBbox: [number, number, number, number] = [
        matchedDetection.bbox.x1,
        matchedDetection.bbox.y1,
        matchedDetection.bbox.x2,
        matchedDetection.bbox.y2,
      ];
      const nextDetectionKey = `${cameraId} -${matchedDetection.detection_id} `;

      setFocusedPerson((prev) => {
        if (!prev) {
          return prev;
        }

        const bboxChanged = !areBboxesClose(prev.bbox, nextBbox, 2);
        const detectionKeyChanged = prev.detectionKey !== nextDetectionKey;

        if (!bboxChanged && !detectionKeyChanged) {
          return prev;
        }

        return {
          ...prev,
          detectionKey: nextDetectionKey,
          bbox: nextBbox,
        };
      });
      return;
    }

    // Only clear focus if no globalId (for tracks without global tracking)
    // If we have globalId, keep focus - person may reappear
    if (!focusedPerson.globalId) {
      setFocusedPerson(null);
      clearBackendFocus();
    }
  }, [areBboxesClose, clearBackendFocus, currentFrameData, detectionData, focusedPerson, getTrackKey]);

  // Get zone name based on environment
  const getZoneName = useCallback(() => {
    const env = getEnvironmentFromUrl();
    return env === 'factory' ? 'Factory' : 'Campus';
  }, [getEnvironmentFromUrl]);

  const handleDetectionSelection = useCallback(
    (detection: DetectionListItem, cameraId: BackendCameraId, isSelecting: boolean) => {
      if (!isSelecting) {
        setFocusedPerson(null);
        clearBackendFocus();
        return;
      }

      const bboxArray: [number, number, number, number] = [
        detection.bbox.x1,
        detection.bbox.y1,
        detection.bbox.x2,
        detection.bbox.y2,
      ];

      const matchedTrack = findTrackMatchingDetection(cameraId, detection);
      const cameraTracks = currentFrameData?.cameras?.[cameraId]?.tracks ?? [];
      if (cameraId === 'c12') {
        console.debug('🧭 c12 detection focus attempt', {
          detectionId: detection.detection_id,
          detectionTrackId: detection.track_id,
          bbox: bboxArray,
          matchedTrackSummary: matchedTrack
            ? {
              trackId: matchedTrack.track_id,
              globalId: matchedTrack.global_id,
              bbox: matchedTrack.bbox_xyxy,
            }
            : null,
          totalTracks: cameraTracks.length,
        });
      }

      if (!matchedTrack) {
        console.warn('⚠️ No matching track found for detection selection', {
          cameraId,
          detectionId: detection.detection_id,
          detectionTrackId: detection.track_id,
          detectionBbox: bboxArray,
          availableTrackSummaries: cameraTracks.slice(0, 5).map((track) => ({
            trackId: track.track_id,
            globalId: track.global_id,
            bbox: track.bbox_xyxy,
          })),
        });
      }
      if (matchedTrack) {
        const normalizedGlobalId = normalizeGlobalId(matchedTrack.global_id);
        setFocusedPerson({
          cameraId,
          trackKey: getTrackKey(cameraId, matchedTrack),
          detectionKey: `${cameraId} -${detection.detection_id} `,
          bbox: matchedTrack.bbox_xyxy,
          globalId: normalizedGlobalId,
        });
        focusOnBackend({
          personId: normalizedGlobalId ?? getTrackKey(cameraId, matchedTrack),
          cameraId,
          trackId: matchedTrack.track_id,
          detectionId: detection.detection_id,
          bbox: matchedTrack.bbox_xyxy,
          confidence: detection.confidence,
        });
      } else {
        if (cameraId === 'c12') {
          console.warn('🟠 c12 falling back to detection-based focus', {
            detectionId: detection.detection_id,
            bbox: bboxArray,
          });
        }
        setFocusedPerson({
          cameraId,
          trackKey: null,
          detectionKey: `${cameraId} -${detection.detection_id} `,
          bbox: bboxArray,
          globalId:
            detection.global_id !== undefined && detection.global_id !== null
              ? String(detection.global_id)
              : undefined,
        });
        focusOnBackend({
          personId:
            detection.tracking_key ??
            (typeof detection.track_id === 'number'
              ? `camera:${cameraId}:${detection.track_id} `
              : `${cameraId} -det - ${detection.detection_id} `),
          cameraId,
          detectionId: detection.detection_id,
          bbox: bboxArray,
          confidence: detection.confidence,
        });
      }
    },
    [clearBackendFocus, findTrackMatchingDetection, focusOnBackend, getTrackKey]
  );

  // Handle frame capture from CameraStreamView for person thumbnail cropping
  const handleFrameCapture = useCallback((cameraId: string, frameBase64: string) => {
    setCapturedFrames(prev => ({
      ...prev,
      [cameraId]: frameBase64
    }));
  }, []);

  const handleTrackFocus = useCallback(
    (cameraId: BackendCameraId, track: Track) => {
      console.log('🖱️ Track clicked', { cameraId, track });
      const trackKey = getTrackKey(cameraId, track);
      const alreadyFocused =
        focusedPerson &&
        focusedPerson.cameraId === cameraId &&
        focusedPerson.trackKey === trackKey;

      if (alreadyFocused) {
        setFocusedPerson(null);
        // Don't call clearBackendFocus - we're doing frontend-only highlighting
        return;
      }

      const matchingDetection = findDetectionForTrack(cameraId, track);
      console.log('🔍 Matched detection for track', { matchingDetection });
      const normalizedGlobalId = normalizeGlobalId(track.global_id);
      setFocusedPerson({
        cameraId,
        trackKey,
        detectionKey: matchingDetection ? `${cameraId} -${matchingDetection.detection_id} ` : undefined,
        bbox: track.bbox_xyxy,
        globalId: normalizedGlobalId,
      });

      // NOTE: Removed focusOnBackend call - it was causing backend to filter tracks
      // Now using purely frontend-based highlighting for cross-camera tracking
      // This keeps all tracks visible while highlighting the focused person
    },
    [findDetectionForTrack, focusedPerson, getTrackKey]
  );

  const clearFocus = useCallback(() => {
    setFocusedPerson(null);
    clearBackendFocus();
  }, [clearBackendFocus]);

  // Test base64 data validity - REMOVED


  // Check system health
  const checkSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/health`);
      const health = await response.json();
      setSystemHealth(health);
      return health.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      setError('Backend connection failed');
      return false;
    }
  }, []);

  // Check for existing detection tasks or create new one
  const checkExistingDetectionTask = useCallback(async () => {
    try {
      const environment = getEnvironmentFromUrl();
      console.log('Checking for existing detection task for environment:', environment);

      // First, check if there are existing active detection tasks for this environment
      const tasksResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/detection-processing-tasks`);
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const activeTasks = tasksData.data.tasks.filter((task: any) =>
          task.environment_id === environment && task.status === 'PROCESSING'
        );

        if (activeTasks.length > 0) {
          const activeTask = activeTasks[0]; // Use the first active task
          console.log('Found existing active detection task:', activeTask.task_id);
          setTaskId(activeTask.task_id);
          connectWebSocket(activeTask.task_id);
          return true;
        }
      }

      console.log('No existing active task found, creating new one...');

      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/detection-processing-tasks/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment_id: environment })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Response not OK:', response.status, errorText);

        if (response.status === 400 && errorText.includes('already has an active')) {
          // This shouldn't happen now since we check above, but keep as fallback
          setError('An active detection session already exists for this environment. Please refresh the page or wait for it to complete.');
          return false;
        } else {
          throw new Error(`Failed to start detection: ${response.status} - ${errorText}`);
        }
      } else {
        // New task created successfully
        const task: DetectionTask = await response.json();
        console.log('New task created:', task.task_id);
        setTaskId(task.task_id);

        // Monitor until PROCESSING
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max
        while (attempts < maxAttempts) {
          const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/detection-processing-tasks/${task.task_id}/status`);
          const status = await statusResponse.json();
          console.log('Task status:', status.status, 'attempts:', attempts);

          if (status.status === 'PROCESSING') {
            console.log('Task is processing, connecting WebSocket');
            connectWebSocket(task.task_id);
            return true;
          }
          if (status.status === 'FAILED') {
            throw new Error(status.details || 'Task failed');
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for detection processing to start');
        }
        return true;
      }
    } catch (error) {
      console.error('Error checking/starting streaming task:', error);
      setError(`Failed to start detection: ${(error as Error).message}`);
      return false;
    }
  }, [getEnvironmentFromUrl]);

  // Start detection processing task
  const startDetectionProcessing = useCallback(async () => {
    try {
      setError(null);

      // If already processing, don't start a new task
      if (isStreaming) {
        console.log('Already processing, skipping new task creation');
        return;
      }

      // If taskId exists but not processing, try to connect to existing task
      if (taskId) {
        console.log('Task ID exists, trying to connect to existing task:', taskId);
        connectWebSocket(taskId);
        return;
      }

      // Otherwise, check for existing tasks or create new one
      await checkExistingDetectionTask();

    } catch (error) {
      console.error('Error starting detection processing:', error);
      setError(`Failed to start detection: ${(error as Error).message}`);
    }
  }, [isStreaming, taskId, checkExistingDetectionTask]);

  // Connect to WebSocket for detection tracking frames
  const connectWebSocket = useCallback((taskId: string) => {
    console.log('🔌 Attempting to connect WebSocket for task:', taskId);

    if (wsRef.current) {
      console.log('🔌 Closing existing WebSocket connection');
      wsRef.current.close();
    }

    const wsUrl = `${BACKEND_WS_URL}/ws/tracking/${taskId}`;
    console.log('🔌 Connecting to WebSocket URL:', wsUrl);
    console.log('🔌 Using task ID:', taskId);
    console.log('🔌 Backend WS URL:', BACKEND_WS_URL);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    connectFocusWebSocket(taskId);

    // Helper function to process per-camera detection tracking updates
    const processDetectionMessage = (message: any) => {
      // Update current frame data structure for per-camera messages
      setCurrentFrameData((prevData: CurrentFrameAggregate | null) => {
        const updatedData: CurrentFrameAggregate = prevData ? { ...prevData } : {
          global_frame_index: message.global_frame_index,
          timestamp_processed_utc: message.timestamp_processed_utc,
          cameras: {}
        };

        // Update specific camera data
        (updatedData.cameras as Record<string, CameraData>)[message.camera_id as string] = message.camera_data as CameraData;
        return updatedData;
      });

      // Process single camera data from per-camera message
      const { camera_id, camera_data, detection_data } = message;

      if (camera_data && camera_data.frame_image_base64) {
        // Legacy check - we no longer use frame_image_base64
        // Just ignoring it to save memory
      }

      // Update detection data for PersonList component
      if (detection_data) {
        setDetectionData(prev => ({
          ...prev,
          [camera_id]: {
            camera_id,
            frame_image_base64: undefined, // No longer using this
            detections: (detection_data.detections || []) as DetectionListItem[],
            processing_time_ms: detection_data.processing_time_ms || 0
          }
        }));
      }

      // Emit mapping event for MiniMap components (per FRONTEND_INTEGRATION_GUIDE.md)
      // If backend didn't include future_pipeline_data.mapping_coordinates yet,
      // fall back to building minimal coordinates from track.map_coords
      let mappingPayload = message;
      const hasMapping = Array.isArray(message?.future_pipeline_data?.mapping_coordinates)
        && message.future_pipeline_data.mapping_coordinates.length > 0;

      if (!hasMapping && camera_data?.tracks && camera_data.tracks.length > 0) {
        const fallbackCoords = camera_data.tracks
          .filter((t: any) => Array.isArray(t.map_coords) && t.map_coords.length === 2)
          .map((t: any, idx: number) => ({
            detection_id: String(t.global_id ?? t.track_id ?? `det_${idx}`),
            map_x: t.map_coords[0],
            map_y: t.map_coords[1],
            projection_successful: true,
            coordinate_system: 'bev_map_meters',
            trail: [],
          }));

        if (fallbackCoords.length > 0) {
          mappingPayload = {
            ...message,
            future_pipeline_data: {
              ...(message.future_pipeline_data || {}),
              mapping_coordinates: fallbackCoords,
            },
          };
        }
      }

      if (Array.isArray(mappingPayload?.future_pipeline_data?.mapping_coordinates)
        && mappingPayload.future_pipeline_data.mapping_coordinates.length > 0) {
        const mappingEvent = new CustomEvent('websocket-mapping-message', {
          detail: mappingPayload,
        });
        window.dispatchEvent(mappingEvent);
        // Debug log for visibility
        console.log('🗺️ Emitted websocket-mapping-message:', {
          camera_id,
          count: mappingPayload.future_pipeline_data.mapping_coordinates.length,
        });
      }
    };

    ws.onopen = () => {
      console.log('✅ Detection WebSocket connected successfully');
      console.log('📤 Sending subscribe message');
      ws.send(JSON.stringify({ type: 'subscribe_tracking' }));
      setIsStreaming(true);
      setError(null);

      // Reset states for clean start
      // setImageLoadingStates({});
      // setImageDebugInfo({});
      // setCameraFrames({});
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message.type, message.mode);

        // Handle individual per-camera detection messages
        if (message.type === 'tracking_update' && message.mode === 'detection_streaming') {
          processDetectionMessage(message);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.error('❌ WebSocket error details:', {
        taskId,
        wsUrl,
        readyState: ws.readyState,
        error
      });
      setError(`WebSocket connection error for task ${taskId} (readyState=${ws.readyState})`);
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected. Details:', {
        taskId,
        wsUrl,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      disconnectFocusWebSocket();
      setIsStreaming(false);
    };
  }, [connectFocusWebSocket, disconnectFocusWebSocket]);

  // Initialize detection processing on component mount
  useEffect(() => {
    const initializeDetectionProcessing = async () => {
      console.log('Initializing detection processing, current taskId:', taskId, 'isStreaming:', isStreaming);

      const isHealthy = await checkSystemHealth();
      if (!isHealthy) {
        console.log('System not healthy, skipping initialization');
        return;
      }

      // If we already have a taskId but not processing, try to connect to existing WebSocket
      if (taskId && !isStreaming) {
        console.log('Found existing taskId, trying to connect to WebSocket:', taskId);
        // Check if task is still active
        try {
          const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/detection-processing-tasks/${taskId}/status`);
          const status = await statusResponse.json();
          console.log('Existing task status:', status);

          if (status.status === 'PROCESSING') {
            console.log('Existing task is processing, connecting WebSocket');
            connectWebSocket(taskId);
            return;
          } else {
            console.log('Existing task not processing, clearing taskId and checking for other active tasks');
            setTaskId(null);
          }
        } catch (error) {
          console.error('Error checking existing task:', error);
          setTaskId(null);
        }
      }

      // If no taskId or existing task not active, try to create/find new task
      if (!taskId) {
        console.log('No taskId, checking for existing detection task');
        await checkExistingDetectionTask();
      }
    };

    initializeDetectionProcessing();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [checkSystemHealth, checkExistingDetectionTask]);


  // --- Effect to measure Overall Map Container Size ---
  useEffect(() => {
    const mapElement = overallMapContainerRef.current;
    if (!mapElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setOverallMapDimensions({ width, height });
      }
    });
    resizeObserver.observe(mapElement);
    setOverallMapDimensions({ width: mapElement.offsetWidth, height: mapElement.offsetHeight });
    return () => resizeObserver.disconnect();
  }, []);

  // Effect to Calculate Scaled Map Points PER CAMERA for their quadrant
  useEffect(() => {
    if (!currentFrameData || !overallMapDimensions.width || !overallMapDimensions.height || MAP_SOURCE_WIDTH <= 0 || MAP_SOURCE_HEIGHT <= 0) {
      setPerCameraMapPoints({});
      return;
    }

    const newPerCameraPoints: { [jsonCameraId: string]: SingleCameraMapPoint[] } = {};

    // Calculate dimensions of each quadrant
    const quadrantWidth = overallMapDimensions.width / 2;
    const quadrantHeight = overallMapDimensions.height / 2;

    // Scaling factors are now based on quadrant size
    const scaleX = quadrantWidth / MAP_SOURCE_WIDTH;
    const scaleY = quadrantHeight / MAP_SOURCE_HEIGHT;

    Object.entries(currentFrameData.cameras).forEach(([jsonCameraId, cameraData]) => {
      newPerCameraPoints[jsonCameraId] = []; // Initialize array for this camera
      if (cameraData && cameraData.tracks) {
        cameraData.tracks.forEach(track => {
          if (track.map_coords && typeof track.global_id === 'number') {
            const [mapX, mapY] = track.map_coords;

            // Scale coordinates to fit within a quadrant
            const displayX = mapX * scaleX;
            const displayY = mapY * scaleY;

            newPerCameraPoints[jsonCameraId].push({
              x: displayX,
              y: displayY,
              globalId: track.global_id
            });
          }
        });
      }
    });

    setPerCameraMapPoints(newPerCameraPoints);

  }, [currentFrameData, overallMapDimensions]);

  useEffect(() => {
    const element = videoAreaRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (!Number.isNaN(newHeight)) {
          setVideoAreaHeight((prev) => (prev !== newHeight ? newHeight : prev));
        }
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Control handlers for detection processing
  const handleStartStreaming = () => {
    if (!isStreaming && systemHealth?.status === 'healthy') {
      startDetectionProcessing();
    }
  };

  const handleStopStreaming = async () => {
    try {
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      disconnectFocusWebSocket();

      // Clear local state immediately for responsive UI
      setIsStreaming(false);
      setTaskId(null);
      setPlaybackStatus(null);
      // setCameraFrames({});
      setCurrentFrameData(null);
      // setImageLoadingStates({});
      // setImageDebugInfo({});
      setDetectionData({});
      setFocusedPerson(null);
      clearBackendFocus();

      // Call backend to cleanup all detection tasks for this environment
      const environment = getEnvironmentFromUrl();
      console.log('🧹 Cleaning up all detection tasks for environment:', environment);

      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/detection-processing-tasks/environment/${environment}/cleanup`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Environment cleanup successful:', result.data?.message);
      } else {
        console.warn('⚠️ Environment cleanup failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      // Don't re-throw - we want the UI to still update even if cleanup fails
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-gray-200 p-4 sm:p-6" style={{ backgroundColor: '#101827' }}>
      {/* Header Section (Keep as before) */}
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <Link to="/" className="flex items-center text-lg hover:text-orange-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Back
        </Link>
        <h1 className="text-2xl font-semibold">{getZoneName()}</h1>
        <div></div>
      </header>

      {/* Info Bar & Global Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 bg-gray-800 p-3 rounded-md flex-shrink-0 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
          <div>Num cameras: <span className="font-semibold">{cameraIds.length}</span></div>
          <div className="flex space-x-4">
            <span className={`flex items-center ${isStreaming ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`h-2 w-2 ${isStreaming ? 'bg-green-400' : 'bg-red-400'} rounded-full mr-1`}></span>
              {isStreaming ? 'Streaming' : 'Disconnected'}
            </span>
            <span className="text-blue-400 flex items-center">
              <span className="h-2 w-2 bg-blue-400 rounded-full mr-1"></span>
              Backend: {systemHealth?.status || 'Unknown'}
            </span>
          </div>
          <div>Mode: <span className="font-semibold">Raw Video</span></div>
          {taskId && <div>Task: <span className="font-semibold text-xs">{taskId.slice(0, 8)}...</span></div>}
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <button
            onClick={handleStartStreaming}
            disabled={isStreaming || systemHealth?.status !== 'healthy' || (!!taskId && !isStreaming)}
            className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${isStreaming || systemHealth?.status !== 'healthy' || (!!taskId && !isStreaming)
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {!!taskId && !isStreaming ? 'Connecting...' : 'Start Stream'}
          </button>
          <button
            onClick={handleStopStreaming}
            disabled={!isStreaming && !error}
            className={`px-4 py-1.5 rounded text-white text-sm font-semibold ${!isStreaming && !error
              ? "bg-gray-600 cursor-not-allowed"
              : (error && !isStreaming)
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-red-600 hover:bg-red-700"
              }`}
          >
            {error && !isStreaming ? 'Clean Up' : 'Stop Stream'}
          </button>
          <button
            onClick={() => {
              console.log('🔍 DEBUG STATE:', {
                isStreaming,
                taskId,
                currentFrameData: !!currentFrameData
              });
            }}
            className="px-2 py-1.5 rounded text-white text-xs bg-blue-600 hover:bg-blue-700"
          >
            Debug
          </button>
        </div>
      </div>

      <div className="mb-4 flex-shrink-0">
        <TaskPlaybackControls
          taskId={taskId}
          playbackStatus={playbackStatus}
          onPause={pausePlaybackCommand}
          onResume={resumePlaybackCommand}
          onRefresh={refreshPlaybackStatusCommand}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-800 border border-red-600 text-red-200 p-3 rounded-md flex-shrink-0">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      {cameraConfigError && (
        <div className="mb-4 bg-yellow-900 border border-yellow-700 text-yellow-200 p-3 rounded-md flex-shrink-0">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zm-9-4a1 1 0 112 0v4a1 1 0 01-2 0V6zm1 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                clipRule="evenodd"
              />
            </svg>
            Unable to refresh camera configuration: {cameraConfigError}
          </div>
        </div>
      )}

      {/* Tab Bar (Keep as before) */}
      <div className="mb-4 border-b border-gray-700 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab("all")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "all" ? "border-orange-500 text-orange-500" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"}`}>View all</button>
          {cameraIds.map((cameraId) => (
            <button
              key={cameraId}
              onClick={() => setActiveTab(cameraId)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === cameraId
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
            >
              {getCameraDisplayNameById(cameraId)}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-grow gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Left Side (Video Player Area) */}
          <div
            className="bg-gray-800 rounded-md p-1 flex items-center justify-center min-h-[320px]"
            ref={videoAreaRef}
          >
            {cameraConfigLoading && cameraIds.length === 0 ? (
              <div className="text-gray-400 text-sm">Loading camera configuration...</div>
            ) : cameraIds.length === 0 ? (
              <div className="text-gray-400 text-sm">No cameras available for this environment.</div>
            ) : activeTab === "all" ? (
              <div
                className={`w-full h-full grid ${cameraIds.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'} ${cameraIds.length > 2 ? 'grid-rows-2' : ''} gap-1`}
              >
                {cameraIds.map((cameraId) => {
                  // const frameData = cameraFrames[cameraId]; // REMOVED
                  const tracks = currentFrameData?.cameras?.[cameraId]?.tracks || [];
                  const displayName = getCameraDisplayNameById(cameraId);
                  // const loadingState = imageLoadingStates[cameraId] ?? (frameData ? 'loading' : 'none'); // REMOVED

                  return (
                    <div
                      key={cameraId}
                      className="relative bg-black rounded overflow-hidden min-h-0 flex items-center justify-center border border-gray-800 hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => setActiveTab(cameraId)}
                    >
                      <CameraStreamView
                        taskId={taskId}
                        cameraId={cameraId}
                        isStreaming={isStreaming}
                        tracks={tracks}
                        focusedPerson={focusedPerson}
                        onTrackClick={(track) => handleTrackFocus(cameraId, track)}
                        onFrameCapture={handleFrameCapture}
                      />
                      <div className="absolute top-2 left-2 pointer-events-none bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {displayName} ({cameraId})
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                const cameraId = activeTab as BackendCameraId;
                const tracks = currentFrameData?.cameras?.[cameraId]?.tracks || [];
                const displayName = getCameraDisplayNameById(cameraId);

                return (
                  <div className="relative bg-black rounded overflow-hidden w-full h-full flex items-center justify-center min-h-[320px]">
                    <div className="relative w-full h-full">
                      <CameraStreamView
                        taskId={taskId}
                        cameraId={cameraId}
                        isStreaming={isStreaming}
                        tracks={tracks}
                        focusedPerson={focusedPerson}
                        onTrackClick={(track) => handleTrackFocus(cameraId, track)}
                        onFrameCapture={handleFrameCapture}
                      />
                      <div className="absolute top-2 left-2 pointer-events-none bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {displayName} ({cameraId})
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Right Side Panels */}
          <div
            className="flex flex-col gap-4 h-full"
            style={{ maxHeight: videoAreaHeight ? `${Math.floor(videoAreaHeight)}px` : undefined, overflowY: videoAreaHeight ? 'auto' : undefined }}
          >
            {/* === UPDATED: Live 2D Mapping Panel (MiniMapComponent per camera) === */}
            <div
              ref={overallMapContainerRef}
              className="bg-gray-700 rounded-md p-2 overflow-visible"
            >
              {(() => {
                const availableMappingCameras = Object.keys(mappingData.mappingByCamera) as BackendCameraId[];

                if (availableMappingCameras.length === 0) {
                  return (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                      🗺️ 2D mapping will display when person positions are detected
                    </div>
                  );
                }

                return (
                  <div className="grid gap-3 grid-cols-1">
                    {availableMappingCameras.map((backendCameraId) => {
                      const coords = getMappingForCamera(backendCameraId);
                      if (!coords || coords.length === 0) return null;
                      return (
                        <div key={`map-${backendCameraId}`} className="bg-gray-800 rounded p-2">
                          <CameraMapPair
                            cameraId={backendCameraId}
                            mappingCoordinates={coords}
                            mapVisible={true}
                            className="w-full"
                            mapWidth={Math.max(320, Math.floor((overallMapDimensions.width || 0) - 32))}
                            mapHeight={Math.max(220, Math.floor(((overallMapDimensions.width || 0) - 32) * 0.66))}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>



            {/* Upper Lower Panels - Tracks and Stream Info */}
            <div className="flex gap-4">
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col">
                <h3 className="text-sm font-semibold mb-3 text-gray-400">Tracks per camera</h3>
                <div className="space-y-2 text-xs flex-grow overflow-y-auto">
                  {(() => {
                    const maxDetections = Math.max(
                      1,
                      ...cameraIds.map((cameraId) => detectionData[cameraId]?.detections?.length || 0)
                    );

                    return cameraIds.map((cameraId) => {
                      const displayName = getCameraDisplayNameById(cameraId);
                      const detectionCount = detectionData[cameraId]?.detections?.length || 0;

                      return (
                        <div key={cameraId} className="flex items-center justify-between">
                          <span>{displayName}</span>
                          <div className="flex items-center">
                            <div className="w-16 h-2 bg-gray-700 rounded-full mr-2">
                              <div
                                className="h-2 bg-green-500 rounded-full"
                                style={{
                                  width: `${maxDetections ? (detectionCount / maxDetections) * 100 : 0}%`,
                                }}
                              ></div>
                            </div>
                            <span className="font-mono">{detectionCount}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="bg-gray-800 rounded-md p-4 w-1/2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-400">Stream Info</h3>
                    <span className={`text-xs font-semibold flex items-center ${isStreaming ? 'text-green-400' : 'text-red-400'}`}>
                      <span className={`h-1.5 w-1.5 ${isStreaming ? 'bg-green-400' : 'bg-red-400'} rounded-full mr-1`}></span>
                      {isStreaming ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  {isStreaming && currentFrameData ? (
                    <>
                      <p className="text-xs">Mode: <span className="font-bold">Raw Video</span></p>
                      <p className="text-xs mt-1">Frame: <span className="font-bold">{currentFrameData.global_frame_index}</span></p>
                      <p className="text-xs mt-1">Last update: <span className="font-bold">{new Date(currentFrameData.timestamp_processed_utc).toLocaleTimeString()}</span></p>
                      <p className="text-xs mt-1">Total tracks: <span className="font-bold">
                        {Object.values(currentFrameData.cameras).reduce((sum, cam) => sum + (cam.tracks?.length || 0), 0)}
                      </span></p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs">Status: <span className="font-bold">No stream</span></p>
                      <p className="text-xs mt-1">Backend: <span className="font-bold">{systemHealth?.status || 'Unknown'}</span></p>
                      <p className="text-xs mt-1">Click Start Stream to begin</p>
                    </>
                  )}
                </div>
                <button
                  onClick={isStreaming ? handleStopStreaming : error ? handleStopStreaming : handleStartStreaming}
                  className={`w-full py-1.5 text-white rounded text-sm font-semibold mt-3 ${isStreaming
                    ? "bg-red-600 hover:bg-red-700"
                    : error && !isStreaming
                      ? "bg-orange-600 hover:bg-orange-700"
                      : systemHealth?.status === 'healthy'
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-600 cursor-not-allowed"
                    }`}
                  disabled={!isStreaming && !error && systemHealth?.status !== 'healthy'}
                >
                  {isStreaming ? 'Stop Stream' : error ? 'Clean Up' : 'Start Stream'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Person List - full width beneath video & panels */}
      <div className="bg-gray-800 rounded-md p-3 mt-4">
        <DetectionPersonList
          cameraDetections={
            // Merge detection data with captured frames for person cropping
            Object.fromEntries(
              Object.entries(detectionData).map(([camera_id, data]) => [
                camera_id,
                {
                  ...data,
                  frame_image_base64: capturedFrames[camera_id] || undefined
                }
              ])
            )
          }
          className="h-full"
          selectedPersonKey={focusedPerson?.detectionKey ?? null}
          onPersonClick={(detection, camera_id, isSelecting) => {
            handleDetectionSelection(
              detection as DetectionListItem,
              camera_id as BackendCameraId,
              isSelecting
            );
          }}
        />
      </div>
    </div>
  );
};

export default GroupViewPage;
