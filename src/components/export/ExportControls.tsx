import React, { useState, useRef } from 'react';
import { exportService, ExportOptions, VideoExportOptions, DataExportOptions } from '../../services/exportService';
import { Detection, TrackingResult, Camera, AnalyticsData } from '../../services/types/api';
import { useDetectionStore } from '../../stores/detectionStore';
import { useTrackingStore } from '../../stores/trackingStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';

interface ExportControlsProps {
  className?: string;
  cameras?: Camera[];
  onExportComplete?: (filename: string) => void;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  className = '',
  cameras = [],
  onExportComplete
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'screenshot' | 'video' | 'data'>('screenshot');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'csv' | 'json'>('png');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store hooks
  const { detections, detectionHistory } = useDetectionStore();
  const { trackingHistory } = useTrackingStore();
  const { realtimeData } = useAnalyticsStore();

  // Screenshot export
  const handleScreenshotExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Capturing screenshots...');
      setExportProgress(0);

      const exportOptions: ExportOptions = {
        format: exportFormat as 'png' | 'jpg',
        quality: 0.9,
        includeOverlays: true,
        includeTimestamp: true,
        includeMetadata: true
      };

      // Get camera elements
      const cameraElements = document.querySelectorAll('video[data-camera-id], canvas[data-camera-id]');
      
      if (cameraElements.length === 0) {
        throw new Error('No camera elements found');
      }

      if (cameraElements.length === 1) {
        // Single camera screenshot
        const element = cameraElements[0] as HTMLVideoElement | HTMLCanvasElement;
        setExportProgress(50);
        
        const blob = await exportService.captureScreenshot(element, exportOptions);
        const filename = `camera-screenshot-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        
        exportService.downloadBlob(blob, filename);
        onExportComplete?.(filename);
      } else {
        // Multi-camera screenshot
        const cameraData = Array.from(cameraElements).map((element, index) => {
          const cameraId = element.getAttribute('data-camera-id') || `camera-${index + 1}`;
          const camera = cameras.find(c => c.id === cameraId);
          
          return {
            element: element as HTMLVideoElement | HTMLCanvasElement,
            id: cameraId,
            name: camera?.name || `Camera ${index + 1}`
          };
        });
        
        setExportProgress(50);
        
        const blob = await exportService.captureMultiCameraScreenshot(cameraData, exportOptions);
        const filename = `multi-camera-screenshot-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        
        exportService.downloadBlob(blob, filename);
        onExportComplete?.(filename);
      }
      
      setExportProgress(100);
      setExportStatus('Screenshot exported successfully!');
      
    } catch (error) {
      console.error('Screenshot export failed:', error);
      setExportStatus('Screenshot export failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setExportStatus('');
        setExportProgress(0);
      }, 3000);
    }
  };

  // Video export
  const handleVideoExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Generating video...');
      setExportProgress(0);

      const videoOptions: VideoExportOptions = {
        format: 'mp4',
        quality: 'medium',
        fps: 30,
        duration: 60, // 1 minute
        startTime: Date.now() - 60000, // 1 minute ago
        endTime: Date.now(),
        includeOverlays: true,
        includeAudio: false
      };

      // Try to find active camera video elements
      const cameraElements = document.querySelectorAll('video[data-camera-id]');
      
      setExportProgress(20);
      setExportStatus('Capturing video frames...');
      
      if (cameraElements.length > 0) {
        // Use real camera feed if available
        const primaryCamera = cameraElements[0] as HTMLVideoElement;
        
        if (primaryCamera.videoWidth > 0 && primaryCamera.videoHeight > 0) {
          // Generate video from live stream
          setExportProgress(40);
          setExportStatus('Recording from camera stream...');
          
          const blob = await exportService.generateVideoFromStream(primaryCamera, videoOptions);
          const filename = `video-export-${new Date().toISOString().split('T')[0]}.mp4`;
          
          exportService.downloadBlob(blob, filename);
          onExportComplete?.(filename);
        } else {
          // Fallback to frame capture method
          setExportProgress(30);
          setExportStatus('Capturing frames from video...');
          
          const frames = await exportService.captureFramesFromVideo(primaryCamera, 30, 1000);
          
          setExportProgress(60);
          setExportStatus('Encoding video...');
          
          const blob = await exportService.generateVideoClip(frames, videoOptions);
          const filename = `video-export-${new Date().toISOString().split('T')[0]}.mp4`;
          
          exportService.downloadBlob(blob, filename);
          onExportComplete?.(filename);
        }
      } else {
        // Mock frame generation for demonstration when no cameras available
        setExportProgress(30);
        setExportStatus('Generating demo video...');
        
        const mockFrames: ImageData[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 640;
        canvas.height = 480;
        
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = `hsl(${i * 12}, 50%, 50%)`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'white';
          ctx.font = '20px Arial';
          ctx.fillText(`Demo Frame ${i + 1}`, 20, 50);
          ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 20, 80);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          mockFrames.push(imageData);
        }
        
        setExportProgress(60);
        setExportStatus('Encoding video...');
        
        const blob = await exportService.generateVideoClip(mockFrames, videoOptions);
        const filename = `demo-video-export-${new Date().toISOString().split('T')[0]}.mp4`;
        
        exportService.downloadBlob(blob, filename);
        onExportComplete?.(filename);
      }
      
      setExportProgress(100);
      setExportStatus('Video exported successfully!');
      
    } catch (error) {
      console.error('Video export failed:', error);
      setExportStatus('Video export failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setExportStatus('');
        setExportProgress(0);
      }, 3000);
    }
  };

  // Data export
  const handleDataExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Exporting data...');
      setExportProgress(0);

      const dataOptions: DataExportOptions = {
        format: exportFormat as 'csv' | 'json',
        includeHeaders: true,
        timeRange: {
          startTime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
          endTime: Date.now()
        }
      };

      let blob: Blob;
      let filename: string;
      
      setExportProgress(30);
      
      if (exportType === 'data') {
        // Export detection data
        blob = await exportService.exportDetectionData(detections, dataOptions);
        filename = `detection-data-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      } else {
        // Export tracking data
        blob = await exportService.exportTrackingData(trackingHistory, dataOptions);
        filename = `tracking-data-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      }
      
      setExportProgress(70);
      setExportStatus('Preparing download...');
      
      exportService.downloadBlob(blob, filename);
      onExportComplete?.(filename);
      
      setExportProgress(100);
      setExportStatus('Data exported successfully!');
      
    } catch (error) {
      console.error('Data export failed:', error);
      setExportStatus('Data export failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setExportStatus('');
        setExportProgress(0);
      }, 3000);
    }
  };

  // Generate report
  const handleReportGeneration = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Generating report...');
      setExportProgress(0);

      const reportData = {
        detections,
        tracking: trackingHistory,
        analytics: realtimeData || {} as AnalyticsData,
        cameras
      };

      setExportProgress(30);
      setExportStatus('Collecting data...');
      
      const blob = await exportService.generateReport(reportData, {
        reportType: 'detailed',
        format: 'html',
        includeCoverPage: true,
        includeCharts: true,
        includeImages: true
      });
      
      setExportProgress(70);
      setExportStatus('Formatting report...');
      
      const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.html`;
      exportService.downloadBlob(blob, filename);
      onExportComplete?.(filename);
      
      setExportProgress(100);
      setExportStatus('Report generated successfully!');
      
    } catch (error) {
      console.error('Report generation failed:', error);
      setExportStatus('Report generation failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setExportStatus('');
        setExportProgress(0);
      }, 3000);
    }
  };

  const handleExport = () => {
    switch (exportType) {
      case 'screenshot':
        handleScreenshotExport();
        break;
      case 'video':
        handleVideoExport();
        break;
      case 'data':
        handleDataExport();
        break;
      default:
        console.error('Unknown export type:', exportType);
    }
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Export Controls</h3>
      
      {/* Export Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Export Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => setExportType('screenshot')}
            className={`px-3 py-2 rounded text-sm ${
              exportType === 'screenshot' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📸 Screenshot
          </button>
          <button
            onClick={() => setExportType('video')}
            className={`px-3 py-2 rounded text-sm ${
              exportType === 'video' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎬 Video
          </button>
          <button
            onClick={() => setExportType('data')}
            className={`px-3 py-2 rounded text-sm ${
              exportType === 'data' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📊 Data
          </button>
        </div>
      </div>

      {/* Format Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Format</label>
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as any)}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {exportType === 'screenshot' && (
            <>
              <option value="png">PNG</option>
              <option value="jpg">JPEG</option>
              <option value="webp">WebP</option>
            </>
          )}
          {exportType === 'video' && (
            <>
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="avi">AVI</option>
            </>
          )}
          {exportType === 'data' && (
            <>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
            </>
          )}
        </select>
      </div>

      {/* Export Options */}
      {exportType === 'screenshot' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Screenshot Options</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-2" />
              <span className="text-sm">Include overlays</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-2" />
              <span className="text-sm">Include timestamp</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-2" />
              <span className="text-sm">Include metadata</span>
            </label>
          </div>
        </div>
      )}

      {exportType === 'video' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Video Options</label>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Quality</label>
              <select className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm">
                <option value="low">Low (500 kbps)</option>
                <option value="medium" selected>Medium (1 Mbps)</option>
                <option value="high">High (2 Mbps)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Duration (seconds)</label>
              <input 
                type="number" 
                defaultValue="60" 
                min="1" 
                max="300"
                className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Frame Rate</label>
              <select className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm">
                <option value="15">15 FPS</option>
                <option value="30" selected>30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {exportType === 'data' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Data Options</label>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Type</label>
              <select className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm">
                <option value="detections">Detection Results</option>
                <option value="tracking">Tracking Results</option>
                <option value="analytics">Analytics Data</option>
                <option value="all">All Data</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time Range</label>
              <select className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm">
                <option value="1h">Last Hour</option>
                <option value="24h" selected>Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-2" />
              <span className="text-sm">Include headers</span>
            </label>
          </div>
        </div>
      )}

      {/* Export Progress */}
      {isExporting && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm">{exportProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            ></div>
          </div>
          {exportStatus && (
            <div className="text-sm text-gray-400 mt-2">{exportStatus}</div>
          )}
        </div>
      )}

      {/* Export Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          {isExporting ? 'Exporting...' : `Export ${exportType.charAt(0).toUpperCase() + exportType.slice(1)}`}
        </button>
        
        <button
          onClick={handleReportGeneration}
          disabled={isExporting}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          📋 Report
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Quick Actions</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setExportType('screenshot');
              setExportFormat('png');
              setTimeout(handleScreenshotExport, 100);
            }}
            disabled={isExporting}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded text-sm"
          >
            📸 Quick Screenshot
          </button>
          
          <button
            onClick={() => {
              setExportType('data');
              setExportFormat('csv');
              setTimeout(handleDataExport, 100);
            }}
            disabled={isExporting}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded text-sm"
          >
            📊 Quick Data
          </button>
        </div>
      </div>

      {/* Hidden file input for potential future use */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,.xml"
        className="hidden"
        onChange={() => {
          // Handle file import if needed
        }}
      />
    </div>
  );
};

export default ExportControls;