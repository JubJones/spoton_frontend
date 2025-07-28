import React from 'react';
import Button from '../../../components/atoms/Button';
import { useAppStore, useDetectionStore } from '../../../stores';

interface DetectionControlsProps {
  className?: string;
}

const DetectionControls: React.FC<DetectionControlsProps> = ({ className = '' }) => {
  const { isPlaying } = useAppStore();
  const { showBoundingBoxes, confidenceThreshold, detectionStats } = useDetectionStore();

  const handlePlayAll = () => {
    // TODO: Implement play all functionality
    console.log('Play all cameras');
  };

  const handleStopAll = () => {
    // TODO: Implement stop all functionality
    console.log('Stop all cameras');
  };

  const handleToggleBoundingBoxes = () => {
    // TODO: Implement toggle bounding boxes
    console.log('Toggle bounding boxes');
  };

  const handleConfidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseFloat(event.target.value);
    // TODO: Implement confidence threshold update
    console.log('Update confidence threshold:', newThreshold);
  };

  const handleExportData = () => {
    // TODO: Implement export functionality
    console.log('Export detection data');
  };

  const handleResetDetections = () => {
    // TODO: Implement reset functionality
    console.log('Reset detections');
  };

  return (
    <div className={`bg-gray-800 rounded-md p-4 ${className}`}>
      <div className="flex flex-col space-y-4">
        {/* Main Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex space-x-2">
            <Button
              onClick={handlePlayAll}
              disabled={isPlaying}
              variant="success"
              size="small"
            >
              Play All
            </Button>
            <Button
              onClick={handleStopAll}
              disabled={!isPlaying}
              variant="danger"
              size="small"
            >
              Stop All
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showBoundingBoxes}
                onChange={handleToggleBoundingBoxes}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Bounding Boxes</span>
            </label>
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <label className="text-sm text-gray-300 whitespace-nowrap">
              Confidence:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidenceThreshold}
              onChange={handleConfidenceChange}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-300 min-w-0 text-right">
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Detection Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-gray-400">Total</div>
            <div className="text-white font-semibold">
              {detectionStats.totalDetections}
            </div>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-gray-400">Avg Confidence</div>
            <div className="text-white font-semibold">
              {(detectionStats.averageConfidence * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-gray-400">Detection Rate</div>
            <div className="text-white font-semibold">
              {detectionStats.detectionRate.toFixed(1)}/s
            </div>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <div className="text-gray-400">Active Cameras</div>
            <div className="text-white font-semibold">
              {Object.values(detectionStats.detectionsPerCamera).length}
            </div>
          </div>
        </div>

        {/* Additional Controls */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            onClick={handleExportData}
            variant="secondary"
            size="small"
          >
            Export Data
          </Button>
          <Button
            onClick={handleResetDetections}
            variant="danger"
            size="small"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DetectionControls;