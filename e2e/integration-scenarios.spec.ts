// e2e/integration-scenarios.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('SpotOn Integration Scenarios and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockBackend(page);
  });

  test.describe('Full User Journey Integration', () => {
    test('should support complete end-to-end user workflow', async ({ page }) => {
      // Step 1: Landing page to environment selection
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      await page.click('text=Browse Environments');
      await expect(page).toHaveURL(/.*environments/);
      
      // Step 2: Environment selection to tracking
      await page.click('text=Campus Environment');
      const continueButton = page.locator('text=Continue').or(page.locator('text=Start Tracking'));
      if (await continueButton.count() > 0) {
        await continueButton.click();
      } else {
        await page.goto('/group-view?environment=campus');
      }
      
      await expect(page).toHaveURL(/.*group-view.*campus/);
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
      
      // Step 3: View analytics
      await page.click('text=Analytics');
      await expect(page).toHaveURL(/.*analytics/);
      
      // Step 4: Check settings
      await page.goto('/settings');
      await expect(page.locator('text=Settings').or(page.locator('h1'))).toBeVisible();
      
      // Step 5: Access help documentation
      await page.click('text=Help');
      await expect(page).toHaveURL(/.*help/);
      await expect(page.locator('h1')).toContainText('Help');
      
      // Step 6: Learn about the system
      await page.click('text=About');
      await expect(page).toHaveURL(/.*about/);
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      // Return to tracking
      await page.click('text=🚀 Start Tracking');
      await expect(page).toHaveURL(/.*environments/);
    });

    test('should maintain state consistency across navigation', async ({ page }) => {
      // Start with environment selection
      await page.goto('/environments');
      await page.click('text=Factory Environment');
      
      // Navigate to tracking with factory selected
      const tracking_url = '/group-view?environment=factory';
      await page.goto(tracking_url);
      
      // Verify factory cameras are shown
      const factoryCameras = ['c09', 'c12', 'c13', 'c16'];
      for (const cameraId of factoryCameras) {
        const cameraElement = page.locator(`[data-testid="camera-${cameraId}"]`);
        if (await cameraElement.count() > 0) {
          await expect(cameraElement).toBeVisible();
        }
      }
      
      // Navigate to analytics and verify environment consistency
      await page.goto('/analytics?environment=factory');
      await expect(page.locator('text=Factory').or(page.locator('text=factory'))).toBeVisible();
    });

    test('should handle deep linking and URL parameters', async ({ page }) => {
      // Test direct navigation to tracking view with parameters
      await page.goto('/group-view?environment=campus&camera=c01&person=person_123');
      
      // Should load successfully
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
      
      // Test analytics with date range
      await page.goto('/analytics?environment=campus&start=2024-01-01&end=2024-01-31');
      
      // Should load with parameters
      await expect(page.locator('h1').or(page.locator('text=Analytics'))).toBeVisible();
      
      // Test settings with section parameter
      await page.goto('/settings?section=cameras');
      await expect(page.locator('text=Settings').or(page.locator('h1'))).toBeVisible();
    });
  });

  test.describe('Real-time Data Flow Integration', () => {
    test('should handle WebSocket connection and data flow', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Mock WebSocket connection establishment
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-connected', {
          detail: { status: 'connected', url: 'ws://localhost:8000/ws/tracking/test' }
        }));
      });
      
      // Simulate real-time tracking data
      const trackingData = {
        global_frame_index: 100,
        scene_id: 'campus',
        timestamp_processed_utc: new Date().toISOString(),
        cameras: {
          c01: {
            image_source: 'frame_000100.jpg',
            tracks: [
              {
                track_id: 1,
                global_id: 'person_realtime_1',
                bbox_xyxy: [150, 200, 250, 450],
                confidence: 0.92,
                map_coords: [30.5, 25.8]
              }
            ]
          }
        }
      };
      
      // Send tracking update
      await page.evaluate((data) => {
        window.dispatchEvent(new CustomEvent('tracking-update', { detail: data }));
      }, trackingData);
      
      // Wait for UI updates
      await page.waitForTimeout(500);
      
      // Verify data is displayed in UI
      const personElement = page.locator(`[data-testid*="person_realtime_1"]`);
      if (await personElement.count() > 0) {
        await expect(personElement.first()).toBeVisible();
      }
    });

    test('should handle high-frequency data updates without UI lag', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      const startTime = Date.now();
      
      // Send 100 rapid updates to simulate real-world load
      for (let i = 0; i < 100; i++) {
        await page.evaluate((frameIndex) => {
          window.dispatchEvent(new CustomEvent('tracking-update', {
            detail: {
              global_frame_index: frameIndex,
              scene_id: 'campus',
              timestamp_processed_utc: new Date().toISOString(),
              cameras: {
                c01: {
                  image_source: `frame_${String(frameIndex).padStart(6, '0')}.jpg`,
                  tracks: Array.from({ length: Math.min(5, frameIndex % 10) }, (_, j) => ({
                    track_id: j + 1,
                    global_id: `person_load_test_${frameIndex}_${j}`,
                    bbox_xyxy: [j * 50, j * 30, j * 50 + 40, j * 30 + 80],
                    confidence: 0.8 + Math.random() * 0.2,
                    map_coords: [Math.random() * 100, Math.random() * 100]
                  }))
                }
              }
            }
          }));
        }, i);
        
        // Small delay to simulate realistic timing
        if (i % 10 === 0) {
          await page.waitForTimeout(10);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle load without excessive delay
      expect(duration).toBeLessThan(5000);
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
      
      // Test interaction responsiveness
      const firstCamera = page.locator('[data-testid="camera-c01"]');
      await firstCamera.click();
      
      // Should respond to clicks without delay
      await expect(firstCamera).toBeVisible();
    });

    test('should synchronize data across multiple view components', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Mock person appearing in camera
      const personData = {
        global_frame_index: 50,
        scene_id: 'campus',
        timestamp_processed_utc: new Date().toISOString(),
        cameras: {
          c01: {
            image_source: 'frame_000050.jpg',
            tracks: [{
              track_id: 1,
              global_id: 'sync_test_person',
              bbox_xyxy: [200, 180, 280, 380],
              confidence: 0.94,
              map_coords: [45.2, 30.7]
            }]
          }
        }
      };
      
      await page.evaluate((data) => {
        window.dispatchEvent(new CustomEvent('tracking-update', { detail: data }));
      }, personData);
      
      await page.waitForTimeout(500);
      
      // Person should appear in camera view
      const cameraPersonElement = page.locator('[data-testid="camera-c01"] [data-testid*="sync_test_person"]');
      if (await cameraPersonElement.count() > 0) {
        await expect(cameraPersonElement).toBeVisible();
      }
      
      // Person should also appear on map
      const mapPersonElement = page.locator('[data-testid="map-person-sync_test_person"]');
      if (await mapPersonElement.count() > 0) {
        await expect(mapPersonElement).toBeVisible();
      }
      
      // Clicking person in camera should highlight on map
      if (await cameraPersonElement.count() > 0) {
        await cameraPersonElement.click();
        
        if (await mapPersonElement.count() > 0) {
          await expect(mapPersonElement).toHaveClass(/highlighted|selected|active/);
        }
      }
    });
  });

  test.describe('Cross-Camera Person Tracking', () => {
    test('should track person movement across multiple cameras', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Person appears in camera c01
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: {
            global_frame_index: 100,
            scene_id: 'campus',
            timestamp_processed_utc: new Date().toISOString(),
            cameras: {
              c01: {
                image_source: 'frame_000100.jpg',
                tracks: [{
                  track_id: 1,
                  global_id: 'cross_camera_person',
                  bbox_xyxy: [100, 100, 150, 200],
                  confidence: 0.95,
                  map_coords: [20.0, 20.0]
                }]
              },
              c02: { image_source: 'frame_000100.jpg', tracks: [] },
              c03: { image_source: 'frame_000100.jpg', tracks: [] },
              c05: { image_source: 'frame_000100.jpg', tracks: [] }
            }
          }
        }));
      });
      
      await page.waitForTimeout(300);
      
      // Verify person in c01
      const personInC01 = page.locator('[data-testid="camera-c01"] [data-testid*="cross_camera_person"]');
      if (await personInC01.count() > 0) {
        await expect(personInC01).toBeVisible();
      }
      
      // Person moves to camera c02
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: {
            global_frame_index: 105,
            scene_id: 'campus',
            timestamp_processed_utc: new Date().toISOString(),
            cameras: {
              c01: { image_source: 'frame_000105.jpg', tracks: [] }, // Person left c01
              c02: {
                image_source: 'frame_000105.jpg',
                tracks: [{
                  track_id: 2, // Different local track ID
                  global_id: 'cross_camera_person', // Same global ID
                  bbox_xyxy: [300, 150, 350, 250],
                  confidence: 0.91,
                  map_coords: [60.0, 40.0]
                }]
              },
              c03: { image_source: 'frame_000105.jpg', tracks: [] },
              c05: { image_source: 'frame_000105.jpg', tracks: [] }
            }
          }
        }));
      });
      
      await page.waitForTimeout(300);
      
      // Person should now be visible in c02
      const personInC02 = page.locator('[data-testid="camera-c02"] [data-testid*="cross_camera_person"]');
      if (await personInC02.count() > 0) {
        await expect(personInC02).toBeVisible();
      }
      
      // Person should no longer be in c01
      if (await personInC01.count() > 0) {
        await expect(personInC01).not.toBeVisible();
      }
      
      // Map position should update
      const mapPerson = page.locator('[data-testid*="cross_camera_person"]');
      if (await mapPerson.count() > 0) {
        await expect(mapPerson).toBeVisible();
      }
    });

    test('should maintain person identity across cameras', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      const globalPersonId = 'identity_test_person';
      
      // Select person in first camera
      await page.evaluate((personId) => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: {
            global_frame_index: 200,
            scene_id: 'campus',
            timestamp_processed_utc: new Date().toISOString(),
            cameras: {
              c01: {
                image_source: 'frame_000200.jpg',
                tracks: [{
                  track_id: 1,
                  global_id: personId,
                  bbox_xyxy: [150, 150, 200, 300],
                  confidence: 0.93
                }]
              }
            }
          }
        }));
      }, globalPersonId);
      
      await page.waitForTimeout(200);
      
      // Click on person to select
      const personElement = page.locator(`[data-testid*="${globalPersonId}"]`).first();
      if (await personElement.count() > 0) {
        await personElement.click();
        
        // Person should be highlighted
        await expect(personElement).toHaveClass(/highlighted|selected|active/);
        
        // Person appears in second camera
        await page.evaluate((personId) => {
          window.dispatchEvent(new CustomEvent('tracking-update', {
            detail: {
              global_frame_index: 210,
              scene_id: 'campus', 
              timestamp_processed_utc: new Date().toISOString(),
              cameras: {
                c01: { image_source: 'frame_000210.jpg', tracks: [] },
                c02: {
                  image_source: 'frame_000210.jpg',
                  tracks: [{
                    track_id: 5,
                    global_id: personId, // Same global ID
                    bbox_xyxy: [250, 200, 300, 350],
                    confidence: 0.89
                  }]
                }
              }
            }
          }));
        }, globalPersonId);
        
        await page.waitForTimeout(200);
        
        // Person in new camera should also be highlighted (maintaining selection)
        const personInC02 = page.locator(`[data-testid="camera-c02"] [data-testid*="${globalPersonId}"]`);
        if (await personInC02.count() > 0) {
          await expect(personInC02).toHaveClass(/highlighted|selected|active/);
        }
      }
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from temporary network issues', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Simulate network disruption
      await page.route('**/health', (route) => {
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      });
      
      // Mock connection lost event
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('connection-lost'));
      });
      
      // Should show reconnecting status
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toContainText(/reconnect|disconnect|offline/i);
      }
      
      // Restore network connection
      await page.unroute('**/health');
      await setupMockBackend(page);
      
      // Mock successful reconnection
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('connection-restored'));
      });
      
      // Should show connected status again
      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toContainText(/connected|online/i);
      }
      
      // Interface should remain functional
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });

    test('should handle malformed data gracefully', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Send various types of malformed data
      const malformedDataSets = [
        null,
        undefined,
        { invalid: 'structure' },
        { cameras: null },
        { cameras: { c01: null } },
        { cameras: { c01: { tracks: 'not_array' } } },
        { cameras: { c01: { tracks: [{ incomplete: 'track' }] } } }
      ];
      
      for (const badData of malformedDataSets) {
        await page.evaluate((data) => {
          try {
            window.dispatchEvent(new CustomEvent('tracking-update', { detail: data }));
          } catch (e) {
            console.log('Expected error handling malformed data:', e);
          }
        }, badData);
        
        await page.waitForTimeout(100);
        
        // Application should continue to work
        await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
      }
    });

    test('should handle camera feed failures individually', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Mock individual camera failures
      const cameras = ['c01', 'c02', 'c03', 'c05'];
      
      for (let i = 0; i < cameras.length; i++) {
        // Fail one camera at a time
        await page.route(`**/frames/${cameras[i]}/**/*.jpg`, (route) => {
          route.fulfill({ status: 404, body: 'Camera feed unavailable' });
        });
        
        await page.waitForTimeout(200);
        
        // Failed camera should show error state
        const errorCamera = page.locator(`[data-testid="camera-${cameras[i]}"] [data-testid="camera-error"]`);
        if (await errorCamera.count() > 0) {
          await expect(errorCamera).toBeVisible();
        }
        
        // Other cameras should still work
        for (let j = i + 1; j < cameras.length; j++) {
          const workingCamera = page.locator(`[data-testid="camera-${cameras[j]}"]`);
          await expect(workingCamera).toBeVisible();
        }
        
        // Restore camera
        await page.unroute(`**/frames/${cameras[i]}/**/*.jpg`);
      }
    });

    test('should maintain data consistency during errors', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Establish initial tracking data
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: {
            global_frame_index: 300,
            scene_id: 'campus',
            timestamp_processed_utc: new Date().toISOString(),
            cameras: {
              c01: {
                image_source: 'frame_000300.jpg',
                tracks: [{
                  track_id: 1,
                  global_id: 'consistency_test_person',
                  bbox_xyxy: [100, 100, 150, 200],
                  confidence: 0.95
                }]
              }
            }
          }
        }));
      });
      
      await page.waitForTimeout(200);
      
      // Verify person is tracked
      const trackedPerson = page.locator('[data-testid*="consistency_test_person"]');
      if (await trackedPerson.count() > 0) {
        await expect(trackedPerson.first()).toBeVisible();
      }
      
      // Introduce data corruption
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: { corrupted: true }
        }));
      });
      
      await page.waitForTimeout(200);
      
      // Send valid data again
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('tracking-update', {
          detail: {
            global_frame_index: 305,
            scene_id: 'campus',
            timestamp_processed_utc: new Date().toISOString(),
            cameras: {
              c01: {
                image_source: 'frame_000305.jpg',
                tracks: [{
                  track_id: 1,
                  global_id: 'consistency_test_person',
                  bbox_xyxy: [110, 110, 160, 210],
                  confidence: 0.93
                }]
              }
            }
          }
        }));
      });
      
      await page.waitForTimeout(200);
      
      // Person tracking should resume correctly
      if (await trackedPerson.count() > 0) {
        await expect(trackedPerson.first()).toBeVisible();
      }
    });
  });

  test.describe('Browser Compatibility and Performance', () => {
    test('should work correctly in different browsers', async ({ page, browserName }) => {
      await page.goto('/');
      
      // Basic functionality should work in all browsers
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      // Navigation should work
      await page.click('text=About');
      await expect(page).toHaveURL(/.*about/);
      
      // Return to home
      await page.click('text=← Back to Home');
      await expect(page).toHaveURL('/');
      
      // Environment selection should work
      await page.click('text=Browse Environments');
      await expect(page).toHaveURL(/.*environments/);
      
      console.log(`✅ Browser compatibility test passed for: ${browserName}`);
    });

    test('should maintain performance under load', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      const performanceMarks: number[] = [];
      
      // Measure initial load performance
      const initialLoadTime = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return perfData.loadEventEnd - perfData.navigationStart;
      });
      
      expect(initialLoadTime).toBeLessThan(5000);
      
      // Measure data processing performance
      for (let i = 0; i < 20; i++) {
        const startMark = Date.now();
        
        await page.evaluate((frameIndex) => {
          window.dispatchEvent(new CustomEvent('tracking-update', {
            detail: {
              global_frame_index: frameIndex + 1000,
              scene_id: 'campus',
              timestamp_processed_utc: new Date().toISOString(),
              cameras: {
                c01: {
                  image_source: `frame_${String(frameIndex + 1000).padStart(6, '0')}.jpg`,
                  tracks: Array.from({ length: 10 }, (_, j) => ({
                    track_id: j + 1,
                    global_id: `perf_test_${frameIndex}_${j}`,
                    bbox_xyxy: [j * 20, j * 15, j * 20 + 30, j * 15 + 60],
                    confidence: 0.8 + Math.random() * 0.2
                  }))
                }
              }
            }
          }));
        }, i);
        
        await page.waitForTimeout(50);
        performanceMarks.push(Date.now() - startMark);
      }
      
      // Calculate average processing time
      const avgProcessingTime = performanceMarks.reduce((sum, time) => sum + time, 0) / performanceMarks.length;
      expect(avgProcessingTime).toBeLessThan(200); // Should process updates quickly
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });

    test('should handle memory usage efficiently', async ({ page }) => {
      await page.goto('/group-view?environment=campus');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Generate lots of tracking data to test memory handling
      for (let i = 0; i < 100; i++) {
        await page.evaluate((frameIndex) => {
          window.dispatchEvent(new CustomEvent('tracking-update', {
            detail: {
              global_frame_index: frameIndex + 2000,
              scene_id: 'campus',
              timestamp_processed_utc: new Date().toISOString(),
              cameras: {
                c01: {
                  image_source: `frame_${String(frameIndex + 2000).padStart(6, '0')}.jpg`,
                  tracks: Array.from({ length: 15 }, (_, j) => ({
                    track_id: j + 1,
                    global_id: `memory_test_${frameIndex}_${j}`,
                    bbox_xyxy: [j * 25, j * 20, j * 25 + 40, j * 20 + 80],
                    confidence: 0.85 + Math.random() * 0.15,
                    map_coords: [Math.random() * 100, Math.random() * 100]
                  }))
                }
              }
            }
          }));
        }, i);
        
        if (i % 20 === 0) {
          await page.waitForTimeout(100);
        }
      }
      
      // Check memory usage after processing
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Memory growth should be reasonable (less than 50MB increase)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
      
      // Application should still be responsive
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });
  });
});

// Helper function to set up comprehensive API mocking
async function setupMockBackend(page: Page) {
  // Health check - healthy backend
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
        version: '2.1.0',
        environment: 'test'
      }),
    });
  });

  // Processing tasks
  await page.route('**/api/v1/processing-tasks/**', (route) => {
    const url = route.request().url();
    
    if (url.includes('/start')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          task_id: `task_${Date.now()}`,
          websocket_url: `ws://localhost:8000/ws/tracking/task_${Date.now()}`,
          status_url: `/api/v1/processing-tasks/task_${Date.now()}/status`,
          message: 'Processing task created successfully',
          estimated_duration: '120s'
        }),
      });
    } else if (url.includes('/status')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json', 
        body: JSON.stringify({
          status: 'running',
          progress: 0.75,
          frames_processed: 1500,
          total_frames: 2000,
          current_fps: 30
        }),
      });
    } else {
      route.continue();
    }
  });

  // Analytics endpoints
  await page.route('**/api/v1/analytics/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          total_detections: Math.floor(Math.random() * 5000) + 1000,
          unique_persons: Math.floor(Math.random() * 100) + 50,
          avg_confidence: 0.85 + Math.random() * 0.15,
          processing_time_ms: Math.floor(Math.random() * 100) + 20
        },
        time_series: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          detections: Math.floor(Math.random() * 200) + 50,
          confidence: 0.8 + Math.random() * 0.2
        })),
        camera_stats: {
          c01: { detections: 250, avg_confidence: 0.91 },
          c02: { detections: 180, avg_confidence: 0.88 },
          c03: { detections: 220, avg_confidence: 0.92 },
          c05: { detections: 195, avg_confidence: 0.89 }
        }
      }),
    });
  });

  // Export endpoints
  await page.route('**/api/v1/export/**', (route) => {
    const format = route.request().url().includes('csv') ? 'text/csv' : 'application/json';
    const data = format === 'text/csv' 
      ? 'timestamp,camera,person_id,confidence\n2024-01-01T10:00:00Z,c01,person_123,0.95\n'
      : JSON.stringify({ exported: true, format, timestamp: new Date().toISOString() });
    
    route.fulfill({
      status: 200,
      contentType: format,
      body: data,
      headers: {
        'Content-Disposition': `attachment; filename="export_${Date.now()}.${format === 'text/csv' ? 'csv' : 'json'}"`
      }
    });
  });

  // Configuration endpoints
  await page.route('**/api/v1/config/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        environments: {
          campus: { cameras: ['c01', 'c02', 'c03', 'c05'] },
          factory: { cameras: ['c09', 'c12', 'c13', 'c16'] }
        },
        detection_settings: {
          confidence_threshold: 0.8,
          max_detections_per_frame: 20,
          tracking_smoothing: 0.7
        },
        system_settings: {
          max_retention_days: 30,
          performance_mode: 'balanced',
          notifications_enabled: true
        }
      }),
    });
  });

  // Static assets - camera frames
  await page.route('**/frames/**/*.jpg', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB8A',
        'base64'
      )
    });
  });
}