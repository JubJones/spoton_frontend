// Backend Integration Example - Following the Integration Guide
// src/examples/backendIntegrationExample.ts

import { SpotOnWebSocketClient } from '../services/spotOnWebSocketClient';
import { APIService } from '../services/apiService';

/**
 * Complete backend integration example following the integration guide
 */
export class BackendIntegrationExample {
  private apiService: APIService;
  private wsClient: SpotOnWebSocketClient | null = null;
  private currentTask: any = null;

  constructor() {
    this.apiService = new APIService();
  }

  /**
   * Complete integration flow as described in the backend guide
   */
  async demonstrateCompleteFlow(): Promise<void> {
    try {
      // 1. Check system health
      console.log('🏥 Checking system health...');
      const health = await this.checkSystemHealth();
      if (!health.isHealthy) {
        throw new Error('System not ready for processing');
      }

      // 2. Get available environments
      console.log('🌍 Loading environments...');
      const environments = await this.getEnvironments();
      console.log('Available environments:', environments);

      // 3. Start processing for campus environment
      console.log('🚀 Starting processing task...');
      await this.startProcessing('campus');

      // 4. Monitor task until ready
      console.log('👀 Monitoring task status...');
      await this.monitorTaskStatus();

      // 5. Connect WebSocket when ready
      console.log('🔌 Connecting WebSocket...');
      await this.connectWebSocket();

      console.log('✅ Backend integration complete!');

    } catch (error) {
      console.error('❌ Integration failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Check system health
   */
  async checkSystemHealth(): Promise<{ isHealthy: boolean; details: any }> {
    try {
      const health = await this.apiService.getSystemHealth();

      const isHealthy = health.status === 'healthy' &&
        health.detector_model_status === 'loaded' &&
        health.tracker_factory_status === 'ready' &&
        health.homography_matrices_status === 'loaded';

      return {
        isHealthy,
        details: health
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return { isHealthy: false, details: null };
    }
  }

  /**
   * Step 2: Get available environments
   */
  async getEnvironments(): Promise<any[]> {
    try {
      const environments = await this.apiService.getEnvironments({
        active_only: true,
        include_data_check: true
      });

      return environments;
    } catch (error) {
      console.error('Failed to get environments:', error);
      return [];
    }
  }

  /**
   * Step 3: Start processing task
   */
  async startProcessing(environmentId: string): Promise<void> {
    try {
      const response = await this.apiService.startProcessingTask({
        environment_id: environmentId as any
      });

      if (response) {
        this.currentTask = response;
        console.log('Task started:', {
          taskId: response.task_id,
          websocketUrl: response.websocket_url,
          statusUrl: response.status_url,
          message: response.message
        });
      }
    } catch (error) {
      console.error('Failed to start processing:', error);
      throw error;
    }
  }

  /**
   * Step 4: Monitor task status until PROCESSING
   */
  async monitorTaskStatus(): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No active task to monitor');
    }

    const checkStatus = async (): Promise<void> => {
      try {
        const status = await this.apiService.getTaskStatus(this.currentTask.task_id);

        console.log(`Task ${status.task_id}: ${status.status} (${Math.round(status.progress * 100)}%)`);
        console.log(`Step: ${status.current_step}`);

        if (status.details) {
          console.log('Details:', status.details);
        }

        switch (status.status) {
          case 'PROCESSING':
            console.log('✅ Task ready for WebSocket connection');
            return; // Ready for WebSocket

          case 'COMPLETED':
            console.log('✅ Task completed successfully');
            return;

          case 'FAILED':
            throw new Error(`Task failed: ${status.details || 'Unknown error'}`);

          default:
            // Continue monitoring for other states (QUEUED, INITIALIZING, DOWNLOADING, EXTRACTING)
            console.log(`⏳ Task still ${status.status}, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await checkStatus();
        }
      } catch (error) {
        console.error('Status check failed:', error);
        throw error;
      }
    };

    await checkStatus();
  }

  /**
   * Step 5: Connect WebSocket for real-time updates
   */
  async connectWebSocket(): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No active task for WebSocket connection');
    }

    this.wsClient = new SpotOnWebSocketClient(this.currentTask.task_id);

    // Set up event handlers
    this.setupWebSocketHandlers();

    // Connect to WebSocket
    await this.wsClient.connect();
    console.log('🔌 WebSocket connected successfully');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.wsClient) return;

    // Connection established
    this.wsClient.onConnectionEstablished((payload) => {
      console.log('🎉 Connection established:', payload);
      console.log('Capabilities:', payload.capabilities);
      console.log('Features:', payload.supported_features);
    });

    // Tracking updates
    this.wsClient.onTrackingUpdate((payload) => {
      console.log('📊 Tracking update received:');
      console.log(`Frame ${payload.global_frame_index} processed at ${payload.timestamp_processed_utc}`);
      console.log(`Scene: ${payload.scene_id}`);

      // Process each camera
      Object.entries(payload.cameras).forEach(([cameraId, cameraData]) => {
        console.log(`📷 Camera ${cameraId}:`);
        console.log(`  - Tracks: ${cameraData.tracks?.length || 0}`);
        console.log(`  - Frame: ${cameraData.image_source}`);
        console.log(`  - Has image: ${!!cameraData.frame_image_base64}`);

        // Process person tracks
        cameraData.tracks?.forEach(track => {
          console.log(`  👤 Person ${track.global_id}:`);
          console.log(`    - Track ID: ${track.track_id}`);
          console.log(`    - Bbox: [${track.bbox_xyxy.join(', ')}]`);
          console.log(`    - Map coords: [${track.map_coords.join(', ')}]`);
          console.log(`    - Confidence: ${(track.confidence * 100).toFixed(1)}%`);
          console.log(`    - Focused: ${track.is_focused}`);
        });
      });

      // Show person counts per camera
      console.log('👥 Person counts:', payload.person_count_per_camera);

      if (payload.focus_person_id) {
        console.log(`🎯 Focused person: ${payload.focus_person_id}`);
      }
    });

    // Status updates
    this.wsClient.onStatusUpdate((payload) => {
      console.log('📈 Status update:');
      console.log(`  - Status: ${payload.status}`);
      console.log(`  - Progress: ${Math.round(payload.progress * 100)}%`);
      console.log(`  - Step: ${payload.current_step}`);
      console.log(`  - Frames processed: ${payload.frames_processed}`);
      console.log(`  - Processing FPS: ${payload.processing_fps.toFixed(1)}`);
      console.log(`  - ETA: ${payload.estimated_completion}`);
    });

    // Connection state changes
    this.wsClient.onConnectionStateChange((state) => {
      console.log(`🔗 Connection state changed: ${state}`);
    });

    // Errors
    this.wsClient.onError((error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  /**
   * Demonstrate focus tracking feature
   */
  async demonstrateFocusTracking(globalPersonId: string): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No active task for focus tracking');
    }

    try {
      console.log(`🎯 Setting focus on person ${globalPersonId}...`);

      /*
      const focusResponse = await this.apiService.setFocus(this.currentTask.task_id, {
        global_person_id: globalPersonId,
        cross_camera_sync: true,
        highlight_settings: {
          enabled: true,
          intensity: 0.8,
          border_thickness: 3,
          border_color: [255, 255, 0], // Yellow
          glow_effect: true
        }
      });
      console.log('✅ Focus set:', focusResponse);
      */

      // Get focus state
      // const focusState = await this.apiService.getFocusState(this.currentTask.task_id);
      // console.log('Focus state:', focusState);

      // Get person details
      // const personDetails = await this.apiService.getPersonDetails(globalPersonId, true, 10);
      // console.log('Person details:', personDetails);

    } catch (error) {
      console.error('Focus tracking failed:', error);
    }
  }

  /**
   * Demonstrate playback controls
   */
  async demonstratePlaybackControls(): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No active task for playback controls');
    }

    try {
      console.log('▶️ Starting playback...');
      // await this.apiService.startPlayback(this.currentTask.task_id, 1.0);

      // Get playback status
      const status = await this.apiService.getPlaybackStatus(this.currentTask.task_id);
      console.log('Playback status:', status);

      // Pause after 5 seconds
      setTimeout(async () => {
        console.log('⏸️ Pausing playback...');
        await this.apiService.pauseTaskPlayback(this.currentTask.task_id);
      }, 5000);

      /*
      // Seek to 50% after 8 seconds
      setTimeout(async () => {
        console.log('⏩ Seeking to 50%...');
        await this.apiService.seekPlayback(this.currentTask.task_id, { position: 0.5 });
      }, 8000);
      */

    } catch (error) {
      console.error('Playback control failed:', error);
    }
  }

  /**
   * Demonstrate analytics endpoints
   */
  async demonstrateAnalytics(): Promise<void> {
    try {
      console.log('📊 Getting analytics data...');

      const metrics = await this.apiService.getRealTimeMetrics();
      console.log('Real-time metrics:', metrics);

      const activePersons = await this.apiService.getActivePersons();
      console.log('Active persons:', activePersons);

      // const cameraLoads = await this.apiService.getCameraLoads();
      // console.log('Camera loads:', cameraLoads);

      const systemStats = await this.apiService.getSystemStatistics();
      console.log('System statistics:', systemStats);

    } catch (error) {
      console.error('Analytics demo failed:', error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }
    this.currentTask = null;
    console.log('🧹 Cleanup completed');
  }

  /**
   * Get current task info
   */
  getCurrentTask() {
    return this.currentTask;
  }

  /**
   * Get WebSocket client
   */
  getWebSocketClient(): SpotOnWebSocketClient | null {
    return this.wsClient;
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example usage - Complete flow
 */
export async function runCompleteIntegrationExample(): Promise<void> {
  const integration = new BackendIntegrationExample();

  try {
    // Run complete flow
    await integration.demonstrateCompleteFlow();

    // Wait a bit for tracking data
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Try focus tracking (replace with actual person ID from tracking data)
    // await integration.demonstrateFocusTracking('person_123');

    // Try playback controls
    // await integration.demonstratePlaybackControls();

    // Try analytics
    await integration.demonstrateAnalytics();

  } catch (error) {
    console.error('Integration example failed:', error);
  } finally {
    // Clean up
    integration.cleanup();
  }
}

/**
 * Example usage - Individual features
 */
export async function runIndividualFeatureExamples(): Promise<void> {
  const integration = new BackendIntegrationExample();

  try {
    // Test system health only
    const health = await integration.checkSystemHealth();
    console.log('System health check result:', health);

    // Test environments only
    const environments = await integration.getEnvironments();
    console.log('Environments result:', environments);

    // Test analytics only
    await integration.demonstrateAnalytics();

  } catch (error) {
    console.error('Feature examples failed:', error);
  }
}

// Export for easy testing
export default BackendIntegrationExample;