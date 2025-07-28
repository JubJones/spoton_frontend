import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/SpotOn/);
    
    // Check that the main navigation is present
    await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
    
    // Check that the app is ready
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to different pages
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    await page.click('[data-testid="nav-analytics"]');
    await expect(page).toHaveURL(/\/analytics/);
    
    await page.click('[data-testid="nav-settings"]');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should display camera feeds', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check that camera feeds are present
    await expect(page.locator('[data-testid="camera-feed"]')).toHaveCount(4);
    
    // Check that each camera feed has a title
    const cameras = page.locator('[data-testid="camera-feed"]');
    for (let i = 0; i < 4; i++) {
      await expect(cameras.nth(i).locator('[data-testid="camera-title"]')).toBeVisible();
    }
  });

  test('should handle person detection', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for detection data to load
    await page.waitForSelector('[data-testid="detection-count"]', { timeout: 10000 });
    
    // Check that detection statistics are displayed
    await expect(page.locator('[data-testid="detection-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
  });

  test('should display performance metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check that performance metrics are shown
    await expect(page.locator('[data-testid="fps-counter"]')).toBeVisible();
    await expect(page.locator('[data-testid="latency-display"]')).toBeVisible();
  });

  test('should handle map interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check that the map is present
    await expect(page.locator('[data-testid="spatial-map"]')).toBeVisible();
    
    // Test map zoom functionality
    await page.click('[data-testid="map-zoom-in"]');
    await page.click('[data-testid="map-zoom-out"]');
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');
    await expect(page.locator('[data-testid="error-page"]')).toBeVisible();
    
    // Test back to home functionality
    await page.click('[data-testid="back-to-home"]');
    await expect(page).toHaveURL('/');
  });

  test('should have proper accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Check that main landmarks are present
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // Check that images have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // Check that buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasTextContent = await button.textContent();
      
      expect(hasAriaLabel || hasTextContent).toBeTruthy();
    }
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check security headers
    const headers = response?.headers();
    expect(headers?.['x-frame-options']).toBeTruthy();
    expect(headers?.['x-content-type-options']).toBeTruthy();
    expect(headers?.['x-xss-protection']).toBeTruthy();
  });

  test('should handle offline scenarios', async ({ page, context }) => {
    await page.goto('/');
    
    // Simulate offline
    await context.setOffline(true);
    
    // Check that offline indicator is shown
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Check that offline indicator is hidden
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });
});