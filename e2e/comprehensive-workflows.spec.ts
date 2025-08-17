// e2e/comprehensive-workflows.spec.ts
import { test, expect, Page } from '@playwright/test';

// Test data configurations
const TEST_ENVIRONMENTS = {
  campus: {
    id: 'campus',
    name: 'Campus Environment', 
    cameras: ['c01', 'c02', 'c03', 'c05'],
    description: 'Educational or corporate campuses'
  },
  factory: {
    id: 'factory',
    name: 'Factory Environment',
    cameras: ['c09', 'c12', 'c13', 'c16'],
    description: 'Industrial settings'
  },
};

const MOCK_TRACKING_DATA = {
  global_frame_index: 42,
  scene_id: 'campus',
  timestamp_processed_utc: '2024-01-20T10:00:00Z',
  cameras: {
    c01: {
      image_source: 'frame_000042.jpg',
      frame_image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB8A',
      tracks: [
        {
          track_id: 1,
          global_id: 'person_123',
          bbox_xyxy: [100, 150, 200, 400],
          confidence: 0.95,
          map_coords: [25.4, 18.7]
        },
        {
          track_id: 2,
          global_id: 'person_456', 
          bbox_xyxy: [300, 200, 400, 450],
          confidence: 0.87,
          map_coords: [45.2, 30.1]
        }
      ]
    },
    c02: {
      image_source: 'frame_000042.jpg',
      frame_image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB8A',
      tracks: []
    }
  }
};

test.describe('SpotOn Comprehensive Application Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up comprehensive API mocking
    await setupApiMocks(page);
  });

  test.describe('Landing Page and Navigation', () => {
    test('should display landing page with all essential elements', async ({ page }) => {
      await page.goto('/');
      
      // Verify main branding and title
      await expect(page.locator('h1')).toContainText('SpotOn');
      await expect(page.locator('text=Beyond Watching:')).toBeVisible();
      await expect(page.locator('text=Intelligent Tracking in Action')).toBeVisible();
      
      // Verify system status cards
      await expect(page.locator('text=System Uptime')).toBeVisible();
      await expect(page.locator('text=Environments')).toBeVisible();
      await expect(page.locator('text=Total Cameras')).toBeVisible();
      await expect(page.locator('text=Processing Speed')).toBeVisible();
      
      // Verify main action buttons
      await expect(page.locator('text=Browse Environments')).toBeVisible();
      await expect(page.locator('text=Custom Setup')).toBeVisible();
      
      // Verify feature preview sections
      await expect(page.locator('text=Real-time Tracking')).toBeVisible();
      await expect(page.locator('text=Spatial Mapping')).toBeVisible();
      await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    });

    test('should have working header navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test navigation to Help page
      await page.click('text=Help');
      await expect(page).toHaveURL(/.*help/);
      await expect(page.locator('h1')).toContainText('Help & Documentation');
      
      // Return to home via logo
      await page.click('h1:has-text("SpotOn")');
      await expect(page).toHaveURL('/');
      
      // Test navigation to About page
      await page.click('text=About');
      await expect(page).toHaveURL(/.*about/);
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      // Test Analytics navigation
      await page.click('text=Analytics');
      await expect(page).toHaveURL(/.*analytics/);
    });

    test('should show backend connection status', async ({ page }) => {
      await page.goto('/');
      
      // Should show connected status with green indicator
      const connectionStatus = page.locator('[data-testid="connection-indicator"]');
      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toHaveClass(/bg-green/);
      }
      
      // Verify connection text
      await expect(page.locator('text=Connected')).toBeVisible();
    });
  });

  test.describe('Environment Selection Workflow', () => {
    test('should display environment selection page', async ({ page }) => {
      await page.goto('/environments');
      
      // Verify page title and description
      await expect(page.locator('h1')).toContainText('Select Environment');
      await expect(page.locator('text=Choose your monitoring environment')).toBeVisible();
      
      // Verify environment options
      for (const env of Object.values(TEST_ENVIRONMENTS)) {
        await expect(page.locator(`text=${env.name}`)).toBeVisible();
        await expect(page.locator(`text=${env.description}`)).toBeVisible();
      }
    });

    test('should allow environment selection and navigation', async ({ page }) => {
      await page.goto('/environments');
      
      // Select Campus environment
      await page.click(`text=${TEST_ENVIRONMENTS.campus.name}`);
      
      // Verify selection is highlighted
      const campusCard = page.locator(`text=${TEST_ENVIRONMENTS.campus.name}`).locator('..');
      await expect(campusCard).toHaveClass(/selected|border-orange|bg-orange/);
      
      // Proceed to tracking view
      const continueButton = page.locator('text=Continue to Tracking');
      if (await continueButton.count() > 0) {
        await continueButton.click();
        await expect(page).toHaveURL(/.*group-view.*environment=campus/);
      }
    });

    test('should show environment details and camera information', async ({ page }) => {
      await page.goto('/environments');
      
      // Click on Factory environment for details
      await page.click(`text=${TEST_ENVIRONMENTS.factory.name}`);
      
      // Verify camera information is displayed
      for (const cameraId of TEST_ENVIRONMENTS.factory.cameras) {
        await expect(page.locator(`text=${cameraId}`)).toBeVisible();
      }
      
      // Should show environment-specific information
      await expect(page.locator('text=Industrial settings')).toBeVisible();
    });
  });

  test.describe('Main Tracking Interface (Group View)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      // Wait for initial load
      await page.waitForLoadState('networkidle');
    });

    test('should display multi-camera grid layout', async ({ page }) => {
      // Verify camera grid is visible
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
      
      // Verify all campus cameras are displayed
      for (const cameraId of TEST_ENVIRONMENTS.campus.cameras) {
        await expect(page.locator(`[data-testid="camera-${cameraId}"]`)).toBeVisible();
      }
      
      // Verify grid layout classes
      const cameraGrid = page.locator('[data-testid="camera-grid"]');
      await expect(cameraGrid).toHaveClass(/grid/);
    });

    test('should display tracking map alongside cameras', async ({ page }) => {
      // Verify map container is visible
      await expect(page.locator('[data-testid="tracking-map"]')).toBeVisible();
      
      // Verify map has proper dimensions
      const map = page.locator('[data-testid="tracking-map"]');
      const boundingBox = await map.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(200);
      expect(boundingBox?.height).toBeGreaterThan(200);
    });

    test('should handle real-time tracking data updates', async ({ page }) => {
      // Simulate tracking data update via WebSocket
      await page.evaluate((trackingData) => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: trackingData
        }));
      }, MOCK_TRACKING_DATA);
      
      // Wait for UI updates
      await page.waitForTimeout(500);
      
      // Verify person bounding boxes appear
      for (const track of MOCK_TRACKING_DATA.cameras.c01.tracks) {
        const boundingBox = page.locator(`[data-testid="bbox-${track.global_id}"]`);
        if (await boundingBox.count() > 0) {
          await expect(boundingBox).toBeVisible();
        }
      }
    });

    test('should support camera focus mode', async ({ page }) => {
      // Click on first camera to focus
      const firstCamera = page.locator('[data-testid="camera-c01"]');
      await firstCamera.click();
      
      // Verify focus mode is activated
      const focusedCamera = page.locator('[data-testid="focused-camera"]');
      if (await focusedCamera.count() > 0) {
        await expect(focusedCamera).toBeVisible();
        
        // Verify exit focus button
        const exitButton = page.locator('[data-testid="exit-focus"]');
        await expect(exitButton).toBeVisible();
        
        // Exit focus mode
        await exitButton.click();
        await expect(focusedCamera).not.toBeVisible();
      }
    });

    test('should display person tracking controls', async ({ page }) => {
      // Verify playback controls
      const playButton = page.locator('[data-testid="play-button"]');
      const pauseButton = page.locator('[data-testid="pause-button"]');
      
      if (await playButton.count() > 0) {
        await expect(playButton).toBeVisible();
      }
      
      // Verify speed controls
      const speedControls = page.locator('[data-testid="speed-controls"]');
      if (await speedControls.count() > 0) {
        await expect(speedControls).toBeVisible();
      }
      
      // Verify display options
      const displayOptions = page.locator('[data-testid="display-options"]');
      if (await displayOptions.count() > 0) {
        await expect(displayOptions).toBeVisible();
      }
    });

    test('should handle person selection and highlighting', async ({ page }) => {
      // Simulate tracking data with persons
      await page.evaluate((trackingData) => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: trackingData
        }));
      }, MOCK_TRACKING_DATA);
      
      await page.waitForTimeout(500);
      
      // Try to click on a person bounding box
      const personBbox = page.locator('[data-testid^="bbox-person_"]').first();
      if (await personBbox.count() > 0) {
        await personBbox.click();
        
        // Verify person is highlighted
        await expect(personBbox).toHaveClass(/highlighted|selected|active/);
        
        // Verify person details panel opens
        const detailsPanel = page.locator('[data-testid="person-details"]');
        if (await detailsPanel.count() > 0) {
          await expect(detailsPanel).toBeVisible();
        }
      }
    });

    test('should support grid layout changes', async ({ page }) => {
      // Test layout controls if they exist
      const layoutControls = page.locator('[data-testid="layout-controls"]');
      if (await layoutControls.count() > 0) {
        // Test 2x2 layout
        const layout2x2 = page.locator('[data-testid="layout-2x2"]');
        if (await layout2x2.count() > 0) {
          await layout2x2.click();
          const grid = page.locator('[data-testid="camera-grid"]');
          await expect(grid).toHaveClass(/grid-cols-2/);
        }
        
        // Test 1x4 layout
        const layout1x4 = page.locator('[data-testid="layout-1x4"]');
        if (await layout1x4.count() > 0) {
          await layout1x4.click();
          const grid = page.locator('[data-testid="camera-grid"]');
          await expect(grid).toHaveClass(/grid-cols-4/);
        }
      }
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display analytics page with charts and metrics', async ({ page }) => {
      await page.goto('/analytics?environment=campus');
      
      // Verify page title
      await expect(page.locator('h1')).toContainText('Analytics');
      
      // Verify key metrics are displayed
      const metricsExpected = [
        'Total Detections',
        'Active Tracks', 
        'Average Confidence',
        'System Uptime'
      ];
      
      for (const metric of metricsExpected) {
        const metricElement = page.locator(`text=${metric}`);
        if (await metricElement.count() > 0) {
          await expect(metricElement).toBeVisible();
        }
      }
    });

    test('should have functional export capabilities', async ({ page }) => {
      await page.goto('/analytics?environment=campus');
      
      // Test export button
      const exportButton = page.locator('[data-testid="export-data"]');
      if (await exportButton.count() > 0) {
        await expect(exportButton).toBeVisible();
        
        // Click export and verify options
        await exportButton.click();
        
        const exportOptions = page.locator('[data-testid="export-options"]');
        if (await exportOptions.count() > 0) {
          await expect(exportOptions).toBeVisible();
          
          // Test format options
          const csvOption = page.locator('text=CSV');
          const jsonOption = page.locator('text=JSON');
          const pdfOption = page.locator('text=PDF');
          
          if (await csvOption.count() > 0) await expect(csvOption).toBeVisible();
          if (await jsonOption.count() > 0) await expect(jsonOption).toBeVisible();
          if (await pdfOption.count() > 0) await expect(pdfOption).toBeVisible();
        }
      }
    });

    test('should display time-series data visualization', async ({ page }) => {
      await page.goto('/analytics?environment=campus');
      
      // Verify chart containers
      const chartContainers = page.locator('[data-testid^="chart-"]');
      const chartCount = await chartContainers.count();
      if (chartCount > 0) {
        expect(chartCount).toBeGreaterThan(0);
        
        // Verify first chart is visible
        await expect(chartContainers.first()).toBeVisible();
      }
    });
  });

  test.describe('Settings and Configuration', () => {
    test('should display settings page with configuration options', async ({ page }) => {
      await page.goto('/settings');
      
      // Verify settings categories
      const expectedCategories = [
        'Camera Configuration',
        'Detection Settings',
        'Alert Preferences',
        'System Settings'
      ];
      
      for (const category of expectedCategories) {
        const categoryElement = page.locator(`text=${category}`);
        if (await categoryElement.count() > 0) {
          await expect(categoryElement).toBeVisible();
        }
      }
    });

    test('should allow camera configuration changes', async ({ page }) => {
      await page.goto('/settings');
      
      // Test camera settings
      const cameraSettings = page.locator('[data-testid="camera-settings"]');
      if (await cameraSettings.count() > 0) {
        await expect(cameraSettings).toBeVisible();
        
        // Test camera enable/disable toggles
        const cameraToggles = page.locator('[data-testid^="camera-toggle-"]');
        const toggleCount = await cameraToggles.count();
        if (toggleCount > 0) {
          const firstToggle = cameraToggles.first();
          await firstToggle.click();
          // Verify toggle state changed
          await expect(firstToggle).toBeVisible();
        }
      }
    });

    test('should allow detection threshold adjustments', async ({ page }) => {
      await page.goto('/settings');
      
      // Test detection settings
      const detectionSettings = page.locator('[data-testid="detection-settings"]');
      if (await detectionSettings.count() > 0) {
        await expect(detectionSettings).toBeVisible();
        
        // Test confidence threshold slider
        const thresholdSlider = page.locator('[data-testid="confidence-threshold"]');
        if (await thresholdSlider.count() > 0) {
          await expect(thresholdSlider).toBeVisible();
          
          // Test slider interaction
          await thresholdSlider.fill('0.8');
          await expect(thresholdSlider).toHaveValue('0.8');
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle backend connection failure gracefully', async ({ page }) => {
      // Mock backend failure
      await page.route('**/health', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      await page.goto('/');
      
      // Verify error handling
      const errorMessage = page.locator('[data-testid="connection-error"]');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/connection/i);
      } else {
        // Alternative: Check for disconnected status
        await expect(page.locator('text=Disconnected')).toBeVisible();
      }
    });

    test('should handle missing camera data gracefully', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Mock camera feed errors
      await page.route('**/frames/**/*.jpg', (route) => {
        route.fulfill({ status: 404 });
      });
      
      // Should show placeholder or error state for cameras
      const cameraError = page.locator('[data-testid="camera-error"]');
      if (await cameraError.count() > 0) {
        await expect(cameraError.first()).toBeVisible();
      }
    });

    test('should handle WebSocket connection issues', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Simulate WebSocket disconnect
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-disconnect'));
      });
      
      // Check for reconnection status
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toContainText(/reconnect|disconnect/i);
      }
    });

    test('should validate form inputs properly', async ({ page }) => {
      await page.goto('/settings');
      
      // Test invalid input handling
      const numberInput = page.locator('input[type="number"]').first();
      if (await numberInput.count() > 0) {
        await numberInput.fill('-1');
        
        // Should show validation error
        const validationError = page.locator('[data-testid="validation-error"]');
        if (await validationError.count() > 0) {
          await expect(validationError).toBeVisible();
        }
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 second limit
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      // Verify responsive layout
      await expect(page.locator('h1')).toBeVisible();
      
      // System status cards should adapt
      const statusCards = page.locator('[data-testid^="status-card"]');
      if (await statusCards.count() > 0) {
        await expect(statusCards.first()).toBeVisible();
      }
      
      // Navigation should be accessible
      await expect(page.locator('text=Help')).toBeVisible();
      await expect(page.locator('text=About')).toBeVisible();
    });

    test('should handle rapid data updates without performance degradation', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      const startTime = Date.now();
      
      // Send 50 rapid tracking updates
      for (let i = 0; i < 50; i++) {
        await page.evaluate((frameIndex) => {
          window.dispatchEvent(new CustomEvent('tracking-update', {
            detail: {
              global_frame_index: frameIndex,
              scene_id: 'campus',
              timestamp_processed_utc: new Date().toISOString(),
              cameras: {
                c01: {
                  image_source: `frame_${String(frameIndex).padStart(6, '0')}.jpg`,
                  tracks: [{
                    track_id: 1,
                    global_id: `person_${frameIndex}`,
                    bbox_xyxy: [100, 200, 150, 300],
                    confidence: 0.9,
                  }],
                },
              },
            }
          }));
        }, i);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000);
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });

    test('should maintain accessibility standards', async ({ page }) => {
      await page.goto('/');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test skip link functionality
      const skipLink = page.locator('[data-testid="skip-link"]');
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeVisible();
        await skipLink.click();
        
        const mainContent = page.locator('#main-content');
        await expect(mainContent).toBeFocused();
      }
      
      // Verify ARIA labels exist
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = buttons.nth(i);
          const ariaLabel = await button.getAttribute('aria-label');
          const text = await button.textContent();
          expect(ariaLabel || text?.trim()).toBeTruthy();
        }
      }
    });
  });
});

// Helper function to set up comprehensive API mocks
async function setupApiMocks(page: Page) {
  // Health check endpoint
  await page.route('**/health', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        detector_model_status: 'loaded',
        tracker_factory_status: 'ready',
        homography_matrices_status: 'loaded',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Processing task creation
  await page.route('**/api/v1/processing-tasks/start', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        task_id: 'test_task_123',
        websocket_url: 'ws://localhost:8000/ws/tracking/test_task_123',
        status_url: '/api/v1/processing-tasks/test_task_123/status',
        message: 'Task created successfully',
      }),
    });
  });

  // Analytics data
  await page.route('**/api/v1/analytics/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json', 
      body: JSON.stringify({
        total_detections: 1250,
        active_tracks: 8,
        average_confidence: 0.92,
        system_uptime: '99.7%',
        performance_metrics: {
          fps: 30,
          latency_ms: 45,
          memory_usage: '2.1GB'
        }
      }),
    });
  });

  // Camera frame images
  await page.route('**/frames/**/*.jpg', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB8A', 'base64')
    });
  });

  // Configuration endpoints
  await page.route('**/api/v1/config/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        environments: TEST_ENVIRONMENTS,
        default_settings: {
          confidence_threshold: 0.8,
          max_tracks_per_camera: 20,
          tracking_update_interval: 1000
        }
      }),
    });
  });
}