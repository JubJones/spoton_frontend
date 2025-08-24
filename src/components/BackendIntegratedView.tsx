import React, { useState, useEffect } from 'react';
import { useSpotOnBackend } from '../hooks/useSpotOnBackend';
import {
  TrackingUpdatePayload,
  CameraID,
  EnvironmentID,
  CAMERA_MAPPING,
  ENVIRONMENT_CAMERAS,
} from '../types/trackingData';

const BackendIntegratedView: React.FC = () => {
  const [backendState, backendActions] = useSpotOnBackend();
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentID>('factory');
  const [isStarted, setIsStarted] = useState(false);

  // Auto-start processing task when healthy
  useEffect(() => {
    if (backendState.isHealthy && !isStarted && !backendState.currentTaskId) {
      handleStartTask();
    }
  }, [backendState.isHealthy, isStarted, backendState.currentTaskId]);

  // Auto-connect WebSocket when task is ready
  useEffect(() => {
    if (backendState.currentTaskId && !backendState.isConnected) {
      console.log('Auto-connecting to WebSocket...');
      backendActions.connectWebSocket(backendState.currentTaskId);
    }
  }, [backendState.currentTaskId, backendState.isConnected, backendActions]);

  const handleStartTask = async () => {
    console.log('Starting processing task for environment:', selectedEnvironment);
    setIsStarted(true);
    const result = await backendActions.startProcessingTask(selectedEnvironment);
    if (result) {
      console.log('Task started:', result);
    }
  };

  const handleEnvironmentChange = (env: EnvironmentID) => {
    setSelectedEnvironment(env);
    if (backendState.isConnected) {
      backendActions.disconnectWebSocket();
    }
    setIsStarted(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'PROCESSING':
      case 'STREAMING':
        return 'text-blue-600';
      case 'COMPLETED':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const renderCameraGrid = (trackingData: TrackingUpdatePayload) => {
    const cameras = ENVIRONMENT_CAMERAS[selectedEnvironment];

    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        {cameras.map((cameraId, index) => {
          const cameraData = trackingData.cameras[cameraId];
          const frontendCameraId = Object.entries(CAMERA_MAPPING).find(
            ([_, backend]) => backend === cameraId
          )?.[0];

          return (
            <div key={cameraId} className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                {frontendCameraId || cameraId} ({cameraData?.tracks.length || 0} detections)
              </h3>

              {/* Image display area */}
              <div className="w-full h-48 bg-gray-200 rounded mb-3 flex items-center justify-center">
                {cameraData?.frame_image_base64 ? (
                  <img
                    src={cameraData.frame_image_base64}
                    alt={`Camera ${cameraId}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-500">
                    <div>Camera {cameraId}</div>
                    <div className="text-sm">Frame: {cameraData?.image_source || 'N/A'}</div>
                  </div>
                )}
              </div>

              {/* Tracking data */}
              {cameraData && cameraData.tracks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Tracked Persons:</h4>
                  {cameraData.tracks.map((track, idx) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded">
                      <div>
                        ID: {track.track_id} | Global: {track.global_id}
                      </div>
                      <div>Confidence: {track.confidence.toFixed(2)}</div>
                      <div>Box: [{track.bbox_xyxy.map((n) => Math.round(n)).join(', ')}]</div>
                      {track.map_coords && (
                        <div>Map: [{track.map_coords.map((n) => n.toFixed(2)).join(', ')}]</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            SpotOn Real-time Tracking Dashboard
          </h1>

          {/* Environment Selection */}
          <div className="flex items-center gap-4 mb-4">
            <label className="font-medium">Environment:</label>
            <div className="flex gap-2">
              {(['campus', 'factory'] as EnvironmentID[]).map((env) => (
                <button
                  key={env}
                  onClick={() => handleEnvironmentChange(env)}
                  disabled={backendState.isConnected}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedEnvironment === env
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Backend Health</div>
              <div
                className={`font-semibold ${getStatusColor(backendState.isHealthy ? 'healthy' : 'unhealthy')}`}
              >
                {backendState.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">WebSocket</div>
              <div
                className={`font-semibold ${backendState.isConnected ? 'text-green-600' : 'text-red-600'}`}
              >
                {backendState.isConnected ? '🔗 Connected' : '❌ Disconnected'}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Task Status</div>
              <div
                className={`font-semibold ${getStatusColor(backendState.taskStatus?.status || '')}`}
              >
                {backendState.taskStatus?.status || 'No Task'}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="font-semibold">
                {backendState.taskStatus
                  ? `${Math.round(backendState.taskStatus.progress * 100)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Current Step */}
          {backendState.taskStatus && (
            <div className="mt-3 text-sm text-gray-600">
              Current Step: {backendState.taskStatus.current_step}
              {backendState.taskStatus.details && (
                <span className="text-gray-500"> - {backendState.taskStatus.details}</span>
              )}
            </div>
          )}

          {/* Error Display */}
          {backendState.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-red-800">Error</h4>
                  <p className="text-red-700">{backendState.error}</p>
                </div>
                <button
                  onClick={backendActions.clearError}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Tracking Data */}
        {backendState.latestTrackingData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">🔴 Live Tracking Data</h2>
              <div className="text-sm text-gray-600">
                Frame {backendState.latestTrackingData.global_frame_index} | Scene:{' '}
                {backendState.latestTrackingData.scene_id} |
                {new Date(
                  backendState.latestTrackingData.timestamp_processed_utc
                ).toLocaleTimeString()}
              </div>
            </div>

            {renderCameraGrid(backendState.latestTrackingData)}
          </div>
        )}

        {/* Instructions */}
        {!backendState.isHealthy && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Getting Started</h3>
            <div className="text-yellow-700 space-y-2">
              <p>1. Start the SpotOn backend server:</p>
              <code className="block bg-yellow-100 p-2 rounded text-sm">
                cd ../spoton_backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 3847
                --reload
              </code>
              <p>2. Ensure the backend health check passes</p>
              <p>3. Select your environment (campus or factory)</p>
              <p>4. The system will automatically start tracking and display real-time data</p>
            </div>
          </div>
        )}

        {/* Capabilities */}
        {backendState.connectionEstablished && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="font-semibold text-blue-800 mb-2">Connection Capabilities</h3>
            <div className="text-blue-700 space-y-1">
              <div>✅ Real-time tracking updates via WebSocket</div>
              <div>✅ Multi-camera person detection and tracking</div>
              <div>✅ Cross-camera re-identification</div>
              {backendState.binaryFramesEnabled && (
                <div>✅ Binary frame transmission supported</div>
              )}
              {backendState.compressionEnabled && <div>✅ Message compression enabled</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackendIntegratedView;
