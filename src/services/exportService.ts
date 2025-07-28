// Export Service - Handle screenshots, video generation, and data exports
import { Detection, TrackingResult, Camera, PersonJourney, AnalyticsData } from './types/api';
import { performanceMonitor } from './performanceMonitor';

export interface ExportOptions {
  format: 'png' | 'jpg' | 'webp' | 'pdf';
  quality?: number;
  includeOverlays?: boolean;
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
}

export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'avi';
  quality: 'low' | 'medium' | 'high';
  fps: number;
  duration: number;
  startTime: number;
  endTime: number;
  includeOverlays?: boolean;
  includeAudio?: boolean;
}

export interface DataExportOptions {
  format: 'csv' | 'json' | 'xml' | 'excel';
  fields?: string[];
  includeHeaders?: boolean;
  timeRange?: {
    startTime: number;
    endTime: number;
  };
  filters?: any;
}

export interface ReportOptions {
  reportType: 'summary' | 'detailed' | 'performance' | 'security';
  format: 'pdf' | 'html' | 'docx';
  includeCoverPage?: boolean;
  includeCharts?: boolean;
  includeImages?: boolean;
  timeRange?: {
    startTime: number;
    endTime: number;
  };
}

export class ExportService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Capture screenshot from camera view
   * @param cameraElement Camera video element or canvas
   * @param options Export options
   * @returns Screenshot blob
   */
  async captureScreenshot(
    cameraElement: HTMLVideoElement | HTMLCanvasElement,
    options: ExportOptions = { format: 'png' }
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      // Set canvas size to match camera element
      this.canvas.width = cameraElement.width || cameraElement.clientWidth;
      this.canvas.height = cameraElement.height || cameraElement.clientHeight;

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw camera content
      if (cameraElement instanceof HTMLVideoElement) {
        this.ctx.drawImage(cameraElement, 0, 0, this.canvas.width, this.canvas.height);
      } else {
        this.ctx.drawImage(cameraElement, 0, 0);
      }

      // Add timestamp if requested
      if (options.includeTimestamp) {
        this.addTimestamp();
      }

      // Add metadata if requested
      if (options.includeMetadata) {
        this.addMetadata(cameraElement);
      }

      // Convert to blob
      const blob = await this.canvasToBlob(options);
      
      const duration = performance.now() - startTime;
      console.log(`📸 Screenshot captured in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      throw new Error('Screenshot capture failed');
    }
  }

  /**
   * Capture screenshot of multiple cameras
   * @param cameras Array of camera elements
   * @param options Export options
   * @returns Combined screenshot blob
   */
  async captureMultiCameraScreenshot(
    cameras: { element: HTMLVideoElement | HTMLCanvasElement; id: string; name: string }[],
    options: ExportOptions = { format: 'png' }
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      // Calculate grid layout
      const gridSize = Math.ceil(Math.sqrt(cameras.length));
      const cameraWidth = 640;
      const cameraHeight = 480;
      const padding = 10;
      
      this.canvas.width = (cameraWidth * gridSize) + (padding * (gridSize + 1));
      this.canvas.height = (cameraHeight * gridSize) + (padding * (gridSize + 1));

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw background
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw each camera
      cameras.forEach((camera, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        const x = padding + (col * (cameraWidth + padding));
        const y = padding + (row * (cameraHeight + padding));

        // Draw camera content
        this.ctx.drawImage(camera.element, x, y, cameraWidth, cameraHeight);

        // Draw camera label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(camera.name, x + 5, y + 20);
      });

      // Add timestamp
      if (options.includeTimestamp) {
        this.addTimestamp();
      }

      const blob = await this.canvasToBlob(options);
      
      const duration = performance.now() - startTime;
      console.log(`📸 Multi-camera screenshot captured in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to capture multi-camera screenshot:', error);
      throw new Error('Multi-camera screenshot capture failed');
    }
  }

  /**
   * Generate video clip from frames
   * @param frames Array of video frames
   * @param options Video export options
   * @returns Video blob
   */
  async generateVideoClip(
    frames: ImageData[],
    options: VideoExportOptions
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      // Create video using MediaRecorder API
      const stream = this.canvas.captureStream(options.fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: `video/${options.format}`,
        videoBitsPerSecond: this.getVideoBitrate(options.quality)
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.start();

      // Process frames
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        // Set canvas size
        this.canvas.width = frame.width;
        this.canvas.height = frame.height;
        
        // Draw frame
        this.ctx.putImageData(frame, 0, 0);
        
        // Add overlays if requested
        if (options.includeOverlays) {
          this.addVideoOverlays(i, frames.length, options);
        }
        
        // Wait for frame duration
        await new Promise(resolve => setTimeout(resolve, 1000 / options.fps));
      }

      recorder.stop();

      // Wait for recording to finish
      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: `video/${options.format}` }));
        };
      });

      const duration = performance.now() - startTime;
      console.log(`🎬 Video clip generated in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to generate video clip:', error);
      throw new Error('Video generation failed');
    }
  }

  /**
   * Generate video clip from camera stream
   * @param cameraElement Camera video element
   * @param options Video export options
   * @returns Video blob
   */
  async generateVideoFromStream(
    cameraElement: HTMLVideoElement,
    options: VideoExportOptions
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      // Set canvas size to match camera
      this.canvas.width = cameraElement.videoWidth || 640;
      this.canvas.height = cameraElement.videoHeight || 480;

      // Create video stream
      const stream = this.canvas.captureStream(options.fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: `video/${options.format}`,
        videoBitsPerSecond: this.getVideoBitrate(options.quality)
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.start();

      // Record for specified duration
      const recordingDuration = options.duration * 1000; // Convert to milliseconds
      const frameInterval = 1000 / options.fps;
      const totalFrames = Math.floor(recordingDuration / frameInterval);

      for (let i = 0; i < totalFrames; i++) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw current video frame
        this.ctx.drawImage(cameraElement, 0, 0, this.canvas.width, this.canvas.height);
        
        // Add overlays if requested
        if (options.includeOverlays) {
          this.addVideoOverlays(i, totalFrames, options);
        }
        
        // Wait for next frame
        await new Promise(resolve => setTimeout(resolve, frameInterval));
      }

      recorder.stop();

      // Wait for recording to finish
      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: `video/${options.format}` }));
        };
      });

      const duration = performance.now() - startTime;
      console.log(`🎬 Video from stream generated in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to generate video from stream:', error);
      throw new Error('Video generation from stream failed');
    }
  }

  /**
   * Capture frames from video element for processing
   * @param videoElement Video element to capture from
   * @param frameCount Number of frames to capture
   * @param interval Interval between frames in milliseconds
   * @returns Array of captured frames
   */
  async captureFramesFromVideo(
    videoElement: HTMLVideoElement,
    frameCount: number = 30,
    interval: number = 1000
  ): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    
    // Set canvas size to match video
    this.canvas.width = videoElement.videoWidth || 640;
    this.canvas.height = videoElement.videoHeight || 480;

    for (let i = 0; i < frameCount; i++) {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw current video frame
      this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
      
      // Get image data
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      frames.push(imageData);
      
      // Wait for next frame
      if (i < frameCount - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return frames;
  }

  /**
   * Export detection data
   * @param detections Detection data
   * @param options Export options
   * @returns Export data blob
   */
  async exportDetectionData(
    detections: Detection[],
    options: DataExportOptions = { format: 'csv' }
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      let exportData: string;
      
      switch (options.format) {
        case 'csv':
          exportData = this.detectionsToCSV(detections, options);
          break;
        case 'json':
          exportData = this.detectionsToJSON(detections, options);
          break;
        case 'xml':
          exportData = this.detectionsToXML(detections, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const blob = new Blob([exportData], { 
        type: this.getMimeType(options.format) 
      });
      
      const duration = performance.now() - startTime;
      console.log(`📊 Detection data exported in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to export detection data:', error);
      throw new Error('Detection data export failed');
    }
  }

  /**
   * Export tracking data
   * @param trackingResults Tracking data
   * @param options Export options
   * @returns Export data blob
   */
  async exportTrackingData(
    trackingResults: TrackingResult[],
    options: DataExportOptions = { format: 'csv' }
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      let exportData: string;
      
      switch (options.format) {
        case 'csv':
          exportData = this.trackingToCSV(trackingResults, options);
          break;
        case 'json':
          exportData = this.trackingToJSON(trackingResults, options);
          break;
        case 'xml':
          exportData = this.trackingToXML(trackingResults, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const blob = new Blob([exportData], { 
        type: this.getMimeType(options.format) 
      });
      
      const duration = performance.now() - startTime;
      console.log(`📊 Tracking data exported in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to export tracking data:', error);
      throw new Error('Tracking data export failed');
    }
  }

  /**
   * Export analytics data
   * @param analytics Analytics data
   * @param options Export options
   * @returns Export data blob
   */
  async exportAnalyticsData(
    analytics: AnalyticsData,
    options: DataExportOptions = { format: 'csv' }
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      let exportData: string;
      
      switch (options.format) {
        case 'csv':
          exportData = this.analyticsToCSV(analytics, options);
          break;
        case 'json':
          exportData = this.analyticsToJSON(analytics, options);
          break;
        case 'xml':
          exportData = this.analyticsToXML(analytics, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const blob = new Blob([exportData], { 
        type: this.getMimeType(options.format) 
      });
      
      const duration = performance.now() - startTime;
      console.log(`📊 Analytics data exported in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw new Error('Analytics data export failed');
    }
  }

  /**
   * Generate comprehensive report
   * @param data Report data
   * @param options Report options
   * @returns Report blob
   */
  async generateReport(
    data: {
      detections: Detection[];
      tracking: TrackingResult[];
      analytics: AnalyticsData;
      cameras: Camera[];
    },
    options: ReportOptions
  ): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      let reportData: string;
      
      switch (options.format) {
        case 'html':
          reportData = this.generateHTMLReport(data, options);
          break;
        case 'pdf':
          // For PDF, we'll generate HTML first then convert
          const htmlReport = this.generateHTMLReport(data, options);
          return this.htmlToPDF(htmlReport);
        default:
          throw new Error(`Unsupported report format: ${options.format}`);
      }

      const blob = new Blob([reportData], { 
        type: this.getMimeType(options.format) 
      });
      
      const duration = performance.now() - startTime;
      console.log(`📋 Report generated in ${duration.toFixed(2)}ms`);
      
      return blob;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw new Error('Report generation failed');
    }
  }

  /**
   * Download blob as file
   * @param blob Data blob
   * @param filename File name
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Private helper methods
  private async canvasToBlob(options: ExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, `image/${options.format}`, options.quality || 0.9);
    });
  }

  private addTimestamp(): void {
    const timestamp = new Date().toLocaleString();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.fillText(timestamp, 10, this.canvas.height - 10);
  }

  private addMetadata(element: HTMLVideoElement | HTMLCanvasElement): void {
    const metadata = `${element.width}x${element.height}`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(metadata, 10, 25);
  }

  private addVideoOverlays(frameIndex: number, totalFrames: number, options: VideoExportOptions): void {
    // Add frame counter
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Frame ${frameIndex + 1}/${totalFrames}`, 10, 25);

    // Add timestamp
    const timestamp = new Date(options.startTime + (frameIndex * (1000 / options.fps))).toLocaleString();
    this.ctx.fillText(timestamp, 10, this.canvas.height - 10);
  }

  private getVideoBitrate(quality: string): number {
    switch (quality) {
      case 'low': return 500000; // 500 kbps
      case 'medium': return 1000000; // 1 Mbps
      case 'high': return 2000000; // 2 Mbps
      default: return 1000000;
    }
  }

  private detectionsToCSV(detections: Detection[], options: DataExportOptions): string {
    const headers = ['ID', 'Person ID', 'Camera ID', 'Timestamp', 'Confidence', 'X', 'Y', 'Width', 'Height'];
    let csv = options.includeHeaders ? headers.join(',') + '\n' : '';
    
    detections.forEach(detection => {
      const row = [
        detection.id,
        detection.personId,
        detection.cameraId,
        detection.timestamp,
        detection.confidence,
        detection.boundingBox.x,
        detection.boundingBox.y,
        detection.boundingBox.width,
        detection.boundingBox.height
      ];
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  private detectionsToJSON(detections: Detection[], options: DataExportOptions): string {
    return JSON.stringify(detections, null, 2);
  }

  private detectionsToXML(detections: Detection[], options: DataExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<detections>\n';
    
    detections.forEach(detection => {
      xml += `  <detection>\n`;
      xml += `    <id>${detection.id}</id>\n`;
      xml += `    <personId>${detection.personId}</personId>\n`;
      xml += `    <cameraId>${detection.cameraId}</cameraId>\n`;
      xml += `    <timestamp>${detection.timestamp}</timestamp>\n`;
      xml += `    <confidence>${detection.confidence}</confidence>\n`;
      xml += `    <boundingBox>\n`;
      xml += `      <x>${detection.boundingBox.x}</x>\n`;
      xml += `      <y>${detection.boundingBox.y}</y>\n`;
      xml += `      <width>${detection.boundingBox.width}</width>\n`;
      xml += `      <height>${detection.boundingBox.height}</height>\n`;
      xml += `    </boundingBox>\n`;
      xml += `  </detection>\n`;
    });
    
    xml += '</detections>';
    return xml;
  }

  private trackingToCSV(trackingResults: TrackingResult[], options: DataExportOptions): string {
    const headers = ['Person ID', 'Camera ID', 'Timestamp', 'Confidence', 'X', 'Y', 'Status'];
    let csv = options.includeHeaders ? headers.join(',') + '\n' : '';
    
    trackingResults.forEach(result => {
      const row = [
        result.personId,
        result.cameraId,
        result.timestamp,
        result.confidence,
        result.currentPosition.x,
        result.currentPosition.y,
        result.status
      ];
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  private trackingToJSON(trackingResults: TrackingResult[], options: DataExportOptions): string {
    return JSON.stringify(trackingResults, null, 2);
  }

  private trackingToXML(trackingResults: TrackingResult[], options: DataExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<tracking>\n';
    
    trackingResults.forEach(result => {
      xml += `  <result>\n`;
      xml += `    <personId>${result.personId}</personId>\n`;
      xml += `    <cameraId>${result.cameraId}</cameraId>\n`;
      xml += `    <timestamp>${result.timestamp}</timestamp>\n`;
      xml += `    <confidence>${result.confidence}</confidence>\n`;
      xml += `    <currentPosition>\n`;
      xml += `      <x>${result.currentPosition.x}</x>\n`;
      xml += `      <y>${result.currentPosition.y}</y>\n`;
      xml += `    </currentPosition>\n`;
      xml += `    <status>${result.status}</status>\n`;
      xml += `  </result>\n`;
    });
    
    xml += '</tracking>';
    return xml;
  }

  private analyticsToCSV(analytics: AnalyticsData, options: DataExportOptions): string {
    // This is a simplified version - in reality, analytics data is complex
    const headers = ['Metric', 'Value', 'Timestamp'];
    let csv = options.includeHeaders ? headers.join(',') + '\n' : '';
    
    // Add analytics metrics as rows
    Object.entries(analytics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        csv += `${key},${value},${new Date().toISOString()}\n`;
      }
    });
    
    return csv;
  }

  private analyticsToJSON(analytics: AnalyticsData, options: DataExportOptions): string {
    return JSON.stringify(analytics, null, 2);
  }

  private analyticsToXML(analytics: AnalyticsData, options: DataExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<analytics>\n';
    
    Object.entries(analytics).forEach(([key, value]) => {
      xml += `  <metric name="${key}">${value}</metric>\n`;
    });
    
    xml += '</analytics>';
    return xml;
  }

  private generateHTMLReport(data: any, options: ReportOptions): string {
    const timestamp = new Date().toLocaleString();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SpotOn Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SpotOn Analytics Report</h1>
        <p>Generated: ${timestamp}</p>
        <p>Report Type: ${options.reportType}</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Total Detections:</strong> ${data.detections.length}
        </div>
        <div class="metric">
            <strong>Active Tracking:</strong> ${data.tracking.length}
        </div>
        <div class="metric">
            <strong>Cameras:</strong> ${data.cameras.length}
        </div>
    </div>
    
    <div class="section">
        <h2>Detection Details</h2>
        <table>
            <tr>
                <th>ID</th>
                <th>Person ID</th>
                <th>Camera</th>
                <th>Timestamp</th>
                <th>Confidence</th>
            </tr>
            ${data.detections.slice(0, 20).map((d: Detection) => `
                <tr>
                    <td>${d.id}</td>
                    <td>${d.personId}</td>
                    <td>${d.cameraId}</td>
                    <td>${d.timestamp}</td>
                    <td>${(d.confidence * 100).toFixed(1)}%</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>
    `;
  }

  private async htmlToPDF(html: string): Promise<Blob> {
    // This is a simplified implementation
    // In a real application, you'd use a library like jsPDF or puppeteer
    const blob = new Blob([html], { type: 'text/html' });
    return blob;
  }

  private getMimeType(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/avi'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }
}

// Export singleton instance
export const exportService = new ExportService();