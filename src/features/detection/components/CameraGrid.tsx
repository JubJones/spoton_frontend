import React from 'react';
import CameraView from './CameraView';
import { useDetectionStore } from '../../../stores';

interface CameraGridProps {
  className?: string;
}

const CameraGrid: React.FC<CameraGridProps> = ({ className = '' }) => {
  const { cameraConfigs, activeCameras, currentFrameData, frameIndices } = useDetectionStore();

  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-1 w-full h-full ${className}`}>
      {activeCameras.map((cameraId) => {
        const config = cameraConfigs[cameraId];
        const frameIndex = frameIndices[cameraId] || 0;
        
        // Get tracking data for this camera from current frame data
        const jsonCameraId = getCameraJsonId(cameraId);
        const tracks = jsonCameraId ? currentFrameData?.cameras?.[jsonCameraId]?.tracks : null;
        
        return (
          <CameraView
            key={cameraId}
            cameraId={cameraId}
            config={config}
            currentFrameIndex={frameIndex}
            tracks={tracks || []}
            className="min-h-0"
          />
        );
      })}
    </div>
  );
};

// Helper function to map app camera IDs to JSON camera IDs
function getCameraJsonId(appCameraId: string): string | null {
  const mapping: Record<string, string> = {
    'camera1': 'c09',
    'camera2': 'c12',
    'camera3': 'c13',
    'camera4': 'c16',
  };
  return mapping[appCameraId] || null;
}

export default CameraGrid;