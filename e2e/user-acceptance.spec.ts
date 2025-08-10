// e2e/user-acceptance.spec.ts
import { test, expect, Page, Browser } from '@playwright/test';

// Test data for different scenarios
const TEST_ENVIRONMENTS = {
  campus: {
    id: 'campus',
    name: 'Campus Environment',
    cameras: ['c01', 'c02', 'c03', 'c05'],
  },
  factory: {
    id: 'factory',
    name: 'Factory Environment',
    cameras: ['c09', 'c12', 'c13', 'c16'],
  },
};

const TEST_TRACKING_DATA = {
  global_frame_index: 42,
  scene_id: 'campus',
  timestamp_processed_utc: '2024-01-20T10:00:00Z',
  cameras: {
    c01: {
      image_source: 'frame_000042.jpg',
      tracks: [
        {
          track_id: 1,
          global_id: 'person_123',
          bbox_xyxy: [100, 200, 150, 300],
          confidence: 0.95,
          map_coords: [12.5, 34.7],
        },
      ],
    },
  },
};

test.describe('SpotOn User Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend API responses
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

    // Navigate to the application
    await page.goto('http://localhost:5173');
  });

  test.describe('Landing Page User Journey', () => {
    test('should allow users to select environment and navigate to tracking view', async ({ page }) => {
      // Verify landing page loads
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      // Select campus environment
      await page.click('[data-testid="environment-campus"]');
      
      // Verify environment selection is highlighted
      await expect(page.locator('[data-testid="environment-campus"]')).toHaveClass(/selected|active/);
      
      // Select date/time range
      await page.click('[data-testid="date-picker"]');
      await page.click('[data-testid="date-today"]');
      
      // Navigate to group view
      await page.click('[data-testid="start-tracking-button"]');
      
      // Verify navigation to group view page
      await expect(page).toHaveURL(/.*group-view/);
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });

    test('should validate required fields before navigation', async ({ page }) => {
      // Try to navigate without selecting environment
      await page.click('[data-testid="start-tracking-button"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('environment');
    });

    test('should handle different environment selections', async ({ page }) => {
      // Test factory environment
      await page.click('[data-testid="environment-factory"]');
      await page.click('[data-testid="date-picker"]');
      await page.click('[data-testid="date-today"]');
      await page.click('[data-testid="start-tracking-button"]');
      
      await expect(page).toHaveURL(/.*group-view/);
      
      // Verify factory-specific cameras are shown
      for (const cameraId of TEST_ENVIRONMENTS.factory.cameras) {
        await expect(page.locator(`[data-testid="camera-${cameraId}"]`)).toBeVisible();
      }
    });
  });

  test.describe('Real-time Tracking Interface', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to group view
      await page.goto('http://localhost:5173/group-view?environment=campus');
      
      // Wait for camera grid to load
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });

    test('should display multi-camera grid layout', async ({ page }) => {
      // Verify all cameras are displayed
      for (const cameraId of TEST_ENVIRONMENTS.campus.cameras) {
        await expect(page.locator(`[data-testid="camera-${cameraId}"]`)).toBeVisible();
      }
      
      // Verify grid layout is 2x2 by default
      const cameraGrid = page.locator('[data-testid="camera-grid"]');
      await expect(cameraGrid).toHaveClass(/grid-cols-2/);
    });

    test('should handle camera feed errors gracefully', async ({ page }) => {
      // Mock camera feed error
      await page.route('**/frames/**/*.jpg', (route) => {
        route.fulfill({ status: 404 });
      });
      
      // Verify error state is shown
      await expect(page.locator('[data-testid="camera-error"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="camera-error"]').first()).toContainText('Frame not available');
    });

    test('should display person detection overlays', async ({ page }) => {
      // Mock tracking data update
      await page.evaluate((testData) => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', {
          detail: testData
        }));
      }, TEST_TRACKING_DATA);
      
      // Wait for bounding box to appear
      await expect(page.locator('[data-testid="bounding-box-person_123"]')).toBeVisible();
      
      // Verify person ID is displayed
      await expect(page.locator('[data-testid="person-id-person_123"]')).toContainText('person_123');
      
      // Verify confidence score if enabled
      if (await page.locator('[data-testid="show-confidence"]').isChecked()) {
        await expect(page.locator('[data-testid="confidence-person_123"]')).toContainText('95%');
      }
    });

    test('should allow camera focus functionality', async ({ page }) => {
      // Click on first camera to focus
      await page.click('[data-testid="camera-c01"]');
      
      // Verify focus mode is activated
      await expect(page.locator('[data-testid="focused-camera"]')).toBeVisible();
      await expect(page.locator('[data-testid="camera-c01"]')).toHaveClass(/focused/);
      
      // Verify other cameras are minimized
      await expect(page.locator('[data-testid="camera-c02"]')).toHaveClass(/minimized/);
      
      // Exit focus mode
      await page.click('[data-testid="exit-focus-button"]');
      await expect(page.locator('[data-testid="camera-grid"]')).toHaveClass(/grid-cols-2/);
    });
  });

  test.describe('Person Tracking and Highlighting', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
      
      // Mock person tracking data
      await page.evaluate((testData) => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', {
          detail: testData
        }));
      }, TEST_TRACKING_DATA);
    });

    test('should highlight person across cameras when clicked', async ({ page }) => {
      // Click on person bounding box
      await page.click('[data-testid="bounding-box-person_123"]');
      
      // Verify person is highlighted in current camera
      await expect(page.locator('[data-testid="bounding-box-person_123"]')).toHaveClass(/highlighted/);
      
      // Verify person appears highlighted on map
      await expect(page.locator('[data-testid="map-person-person_123"]')).toHaveClass(/highlighted/);
    });

    test('should show person details panel when person is selected', async ({ page }) => {
      await page.click('[data-testid="bounding-box-person_123"]');
      
      // Verify details panel opens
      await expect(page.locator('[data-testid="person-details-panel"]')).toBeVisible();
      
      // Verify person information is displayed
      await expect(page.locator('[data-testid="person-id-display"]')).toContainText('person_123');
      await expect(page.locator('[data-testid="confidence-display"]')).toContainText('95%');
      
      // Verify timeline/trajectory information
      await expect(page.locator('[data-testid="person-timeline"]')).toBeVisible();
    });

    test('should track person movement across cameras', async ({ page }) => {
      // Mock person moving from c01 to c02
      const movementData = {
        ...TEST_TRACKING_DATA,
        cameras: {
          c01: { ...TEST_TRACKING_DATA.cameras.c01, tracks: [] }, // Person left c01
          c02: {
            image_source: 'frame_000043.jpg',
            tracks: [{
              ...TEST_TRACKING_DATA.cameras.c01.tracks[0],
              track_id: 5, // Different local track ID
              // Same global_id: 'person_123'
            }],
          },
        },
      };
      
      await page.evaluate((data) => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', { detail: data }));
      }, movementData);
      
      // Verify person appears in new camera
      await expect(page.locator('[data-testid="camera-c02"] [data-testid="bounding-box-person_123"]')).toBeVisible();
      
      // Verify person no longer in original camera
      await expect(page.locator('[data-testid="camera-c01"] [data-testid="bounding-box-person_123"]')).not.toBeVisible();
    });
  });

  test.describe('Interactive Map Visualization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
      await expect(page.locator('[data-testid="tracking-map"]')).toBeVisible();
    });

    test('should display camera positions on map', async ({ page }) => {
      // Verify camera markers are visible
      for (const cameraId of TEST_ENVIRONMENTS.campus.cameras) {
        await expect(page.locator(`[data-testid="map-camera-${cameraId}"]`)).toBeVisible();
      }
    });

    test('should show person positions on map', async ({ page }) => {
      await page.evaluate((testData) => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', {
          detail: testData
        }));
      }, TEST_TRACKING_DATA);
      
      // Verify person marker appears on map
      await expect(page.locator('[data-testid="map-person-person_123"]')).toBeVisible();
      
      // Click on map person marker
      await page.click('[data-testid="map-person-person_123"]');
      
      // Verify person is highlighted in camera view
      await expect(page.locator('[data-testid="bounding-box-person_123"]')).toHaveClass(/highlighted/);
    });

    test('should allow map zoom and pan interactions', async ({ page }) => {
      const mapContainer = page.locator('[data-testid="tracking-map"]');
      
      // Test zoom in
      await mapContainer.hover();
      await page.mouse.wheel(0, -100);
      
      // Test pan
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      // Verify map interactions work without errors
      await expect(mapContainer).toBeVisible();
    });
  });

  test.describe('Control Panel and Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
    });

    test('should allow toggling display options', async ({ page }) => {
      // Toggle confidence display
      await page.click('[data-testid="toggle-confidence"]');
      
      // Mock tracking update to see confidence
      await page.evaluate((testData) => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', {
          detail: testData
        }));
      }, TEST_TRACKING_DATA);
      
      // Verify confidence is shown
      await expect(page.locator('[data-testid="confidence-person_123"]')).toBeVisible();
      
      // Toggle person IDs
      await page.click('[data-testid="toggle-person-ids"]');
      await expect(page.locator('[data-testid="person-id-person_123"]')).not.toBeVisible();
    });

    test('should allow changing grid layout', async ({ page }) => {
      // Change to 1x4 layout
      await page.click('[data-testid="layout-1x4"]');
      await expect(page.locator('[data-testid="camera-grid"]')).toHaveClass(/grid-cols-4/);
      
      // Change back to 2x2
      await page.click('[data-testid="layout-2x2"]');
      await expect(page.locator('[data-testid="camera-grid"]')).toHaveClass(/grid-cols-2/);
    });

    test('should handle playback controls', async ({ page }) => {
      // Test pause
      await page.click('[data-testid="pause-button"]');
      await expect(page.locator('[data-testid="pause-button"]')).toHaveClass(/paused/);
      
      // Test play
      await page.click('[data-testid="play-button"]');
      await expect(page.locator('[data-testid="play-button"]')).toHaveClass(/playing/);
      
      // Test speed control
      await page.click('[data-testid="speed-2x"]');
      await expect(page.locator('[data-testid="current-speed"]')).toContainText('2x');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should display error message when backend is unavailable', async ({ page }) => {
      // Mock backend error
      await page.route('**/health', (route) => {
        route.fulfill({ status: 500 });
      });
      
      await page.goto('http://localhost:5173');
      
      // Verify error message is shown
      await expect(page.locator('[data-testid="backend-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="backend-error"]')).toContainText('Unable to connect to backend');
    });

    test('should recover from WebSocket connection loss', async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
      
      // Mock WebSocket disconnection
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mockWebSocketDisconnect'));
      });
      
      // Verify reconnection indicator
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Reconnecting...');
      
      // Mock successful reconnection
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mockWebSocketReconnect'));
      });
      
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });

    test('should handle data processing errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
      
      // Mock malformed tracking data
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', {
          detail: { invalid: 'data' }
        }));
      });
      
      // Application should continue working despite bad data
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="tracking-map"]')).toBeVisible();
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain performance with high-frequency updates', async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
      
      const startTime = Date.now();
      
      // Send 100 rapid tracking updates
      for (let i = 0; i < 100; i++) {
        await page.evaluate((frameIndex) => {
          window.dispatchEvent(new CustomEvent('mockTrackingUpdate', {
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
                    bbox_xyxy: [100 + frameIndex % 50, 200, 150 + frameIndex % 50, 300],
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
      expect(duration).toBeLessThan(5000);
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });

    test('should handle large numbers of tracked persons', async ({ page }) => {
      await page.goto('http://localhost:5173/group-view?environment=campus');
      
      // Mock scenario with 50 people across all cameras
      const manyPeopleData = {
        global_frame_index: 100,
        scene_id: 'campus',
        timestamp_processed_utc: '2024-01-20T10:00:00Z',
        cameras: Object.fromEntries(
          TEST_ENVIRONMENTS.campus.cameras.map(cameraId => [
            cameraId,
            {
              image_source: 'frame_000100.jpg',
              tracks: Array.from({ length: 12 }, (_, i) => ({
                track_id: i + 1,
                global_id: `person_${cameraId}_${i}`,
                bbox_xyxy: [i * 30, i * 20, i * 30 + 50, i * 20 + 100],
                confidence: 0.8 + Math.random() * 0.2,
                map_coords: [Math.random() * 100, Math.random() * 100],
              })),
            },
          ])
        ),
      };
      
      await page.evaluate((data) => {
        window.dispatchEvent(new CustomEvent('mockTrackingUpdate', { detail: data }));
      }, manyPeopleData);
      
      // Verify all bounding boxes are rendered
      const boundingBoxes = page.locator('[data-testid^="bounding-box-"]');
      expect(await boundingBoxes.count()).toBeGreaterThan(40); // 12 per camera * 4 cameras
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
    });
  });
});

// Cross-browser compatibility tests
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
    test.describe(`${browserName} compatibility`, () => {
      test(`should work correctly in ${browserName}`, async ({ page }) => {
        await page.goto('http://localhost:5173');
        
        // Basic functionality tests
        await expect(page.locator('h1')).toContainText('SpotOn');
        await page.click('[data-testid="environment-campus"]');
        await page.click('[data-testid="date-picker"]');
        await page.click('[data-testid="date-today"]');
        await page.click('[data-testid="start-tracking-button"]');
        
        await expect(page).toHaveURL(/.*group-view/);
        await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="tracking-map"]')).toBeVisible();
      });
    });
  });
});

// Mobile responsiveness tests
test.describe('Mobile Responsiveness', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('http://localhost:5173');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Environment selection should be stacked
    const environmentCards = page.locator('[data-testid^="environment-"]');
    const firstCard = environmentCards.first();
    const secondCard = environmentCards.nth(1);
    
    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();
    
    // Cards should be stacked vertically on mobile
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height / 2);
  });

  test('should adapt camera grid for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/group-view?environment=campus');
    
    // Should show 1x1 grid on mobile
    await expect(page.locator('[data-testid="camera-grid"]')).toHaveClass(/grid-cols-1/);
    
    // Should be able to swipe between cameras
    const cameraGrid = page.locator('[data-testid="camera-grid"]');
    await cameraGrid.touchscreen.tap(187.5, 300); // Center of viewport
    
    // Swipe gesture
    await page.touchscreen.tap(100, 300);
    await page.touchscreen.tap(275, 300);
  });
});

// Accessibility tests
test.describe('Accessibility Compliance', () => {
  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-link"]');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      await expect(page.locator('#main-content')).toBeFocused();
    }
    
    // Test ARIA labels
    await expect(page.locator('[data-testid="environment-campus"]')).toHaveAttribute('aria-label');
    
    // Test alt text for images
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
  });

  test('should work with screen readers', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test live regions for announcements
    await expect(page.locator('[aria-live]')).toBePresent();
    
    // Test semantic HTML structure
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    
    // Test button accessibility
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      // Each button should have accessible name
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
  });
});