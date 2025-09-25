// Tracking payload adapter - normalizes Phase 4 WebSocket messages to legacy structure
// src/utils/trackingPayloadAdapter.ts

import {
  WebSocketTrackingMessagePayload,
  Phase4TrackingUpdateMessage,
  CameraFrame,
  BackendCameraId,
} from '../types/api';

const DEFAULT_SCENE_ID: 'factory' = 'factory';

/**
 * Normalize incoming tracking payloads so existing consumers can process them.
 * Supports both legacy multi-camera payloads and new Phase 4 per-camera messages.
 */
export function normalizeTrackingUpdatePayload(
  payload: WebSocketTrackingMessagePayload | Phase4TrackingUpdateMessage | any
): WebSocketTrackingMessagePayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // Already in the legacy/normalized format
  if (payload.cameras && typeof payload.cameras === 'object') {
    return payload as WebSocketTrackingMessagePayload;
  }

  // Phase 4 per-camera payload
  if ('camera_data' in payload && payload.camera_id) {
    const message = payload as Phase4TrackingUpdateMessage;
    const backendCameraId = message.camera_id as BackendCameraId;
    const cameraData = message.camera_data || {};
    const tracks = Array.isArray(cameraData.tracks) ? cameraData.tracks : [];

    const normalizedCamera: CameraFrame = {
      image_source:
        typeof cameraData.image_source === 'string' && cameraData.image_source.length > 0
          ? cameraData.image_source
          : `${backendCameraId}_${message.global_frame_index}`,
      frame_image_base64: normalizeBase64(cameraData.frame_image_base64),
      original_frame_base64: normalizeBase64(cameraData.original_frame_base64),
      tracks: tracks as any,
      frame_width: cameraData.frame_width,
      frame_height: cameraData.frame_height,
      timestamp: cameraData.timestamp || message.timestamp_processed_utc,
      metadata: cameraData.metadata,
      detection_data: message.detection_data,
      future_pipeline_data: message.future_pipeline_data,
      raw_camera_data: cameraData,
    };

    const personCount = Array.isArray(tracks)
      ? tracks.length
      : message.detection_data?.detection_count ?? 0;

    const sceneId = coerceSceneId(message.scene_id || message.environment_id);

    return {
      global_frame_index: message.global_frame_index,
      scene_id: sceneId,
      timestamp_processed_utc: message.timestamp_processed_utc,
      cameras: {
        [backendCameraId]: normalizedCamera,
      },
      person_count_per_camera: {
        [backendCameraId]: personCount,
      },
      focus_person_id: message.focus_person_id ?? null,
      task_id: message.task_id,
      camera_id: backendCameraId,
      detection_data_by_camera: message.detection_data
        ? { [backendCameraId]: message.detection_data }
        : undefined,
      future_pipeline_data_by_camera: message.future_pipeline_data
        ? { [backendCameraId]: message.future_pipeline_data }
        : undefined,
      raw_message: message,
    };
  }

  console.warn('Received unsupported tracking payload structure', payload);
  return null;
}

/**
 * Ensure base64 strings are usable by trimming and dropping blanks.
 */
function normalizeBase64(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function coerceSceneId(value?: string): 'campus' | 'factory' {
  if (value === 'campus' || value === 'factory') {
    return value;
  }
  return DEFAULT_SCENE_ID;
}

export default {
  normalizeTrackingUpdatePayload,
};
