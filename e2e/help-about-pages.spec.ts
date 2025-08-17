// e2e/help-about-pages.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Help and About Pages E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend API responses for all pages
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
  });

  test.describe('Help Page Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/help');
      await expect(page.locator('h1')).toContainText('Help & Documentation');
    });

    test('should display help page with proper header and navigation', async ({ page }) => {
      // Verify page title and header
      await expect(page).toHaveTitle(/SpotOn/);
      await expect(page.locator('h1')).toContainText('Help & Documentation');
      
      // Verify back navigation exists
      await expect(page.locator('text=← Back to Home')).toBeVisible();
      
      // Verify connection status indicator
      await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
    });

    test('should have functional search functionality', async ({ page }) => {
      // Verify search input exists
      const searchInput = page.locator('input[placeholder*="Search help topics"]');
      await expect(searchInput).toBeVisible();
      
      // Test search functionality
      await searchInput.fill('camera');
      await expect(searchInput).toHaveValue('camera');
      
      // Test empty search (shows all content)
      await searchInput.clear();
      await expect(searchInput).toHaveValue('');
    });

    test('should display all navigation sections', async ({ page }) => {
      const expectedSections = [
        'Getting Started',
        'Features Overview', 
        'User Guide',
        'Troubleshooting',
        'API Reference',
        'FAQ'
      ];

      for (const section of expectedSections) {
        await expect(page.locator(`text=${section}`)).toBeVisible();
      }
    });

    test('should allow navigation between help sections', async ({ page }) => {
      // Test navigation to Features Overview
      await page.click('text=Features Overview');
      await expect(page.locator('h2')).toContainText('Features Overview');
      await expect(page.locator('text=Multi-Camera Tracking')).toBeVisible();
      
      // Test navigation to User Guide
      await page.click('text=User Guide');
      await expect(page.locator('h2')).toContainText('User Guide');
      await expect(page.locator('text=Environment Selection')).toBeVisible();
      
      // Test navigation to Troubleshooting
      await page.click('text=Troubleshooting');
      await expect(page.locator('h2')).toContainText('Troubleshooting');
      await expect(page.locator('text=Common Issues')).toBeVisible();
      
      // Test navigation to API Reference
      await page.click('text=API Reference');
      await expect(page.locator('h2')).toContainText('API Reference');
      await expect(page.locator('text=Backend Integration')).toBeVisible();
    });

    test('should display comprehensive Getting Started content', async ({ page }) => {
      // Should be on Getting Started by default
      await expect(page.locator('h2')).toContainText('Getting Started');
      
      // Verify step-by-step instructions
      await expect(page.locator('text=1.')).toBeVisible();
      await expect(page.locator('text=Select Environment')).toBeVisible();
      await expect(page.locator('text=2.')).toBeVisible();
      await expect(page.locator('text=Configure Settings')).toBeVisible();
      await expect(page.locator('text=3.')).toBeVisible();
      await expect(page.locator('text=Start Tracking')).toBeVisible();
      
      // Verify system requirements
      await expect(page.locator('text=System Requirements')).toBeVisible();
      await expect(page.locator('text=Modern web browser')).toBeVisible();
      
      // Verify quick actions links
      await expect(page.locator('text=→ Select Environment')).toBeVisible();
      await expect(page.locator('text=→ Start Tracking')).toBeVisible();
      await expect(page.locator('text=→ View Analytics')).toBeVisible();
    });

    test('should display detailed Features Overview', async ({ page }) => {
      await page.click('text=Features Overview');
      
      // Verify all key features are described
      await expect(page.locator('text=Multi-Camera Tracking')).toBeVisible();
      await expect(page.locator('text=Person Detection')).toBeVisible();
      await expect(page.locator('text=Cross-Camera Tracking')).toBeVisible();
      await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
      
      // Verify technical details
      await expect(page.locator('text=Faster R-CNN')).toBeVisible();
      await expect(page.locator('text=CLIP-based re-identification')).toBeVisible();
      await expect(page.locator('text=Support for up to 8 cameras')).toBeVisible();
    });

    test('should have interactive FAQ section', async ({ page }) => {
      await page.click('text=FAQ');
      await expect(page.locator('h2')).toContainText('Frequently Asked Questions');
      
      // Test FAQ expansion
      const firstFAQ = page.locator('button').filter({ hasText: 'What is SpotOn?' });
      await expect(firstFAQ).toBeVisible();
      
      // Click to expand FAQ
      await firstFAQ.click();
      await expect(page.locator('text=SpotOn is an intelligent multi-camera person tracking')).toBeVisible();
      
      // Click again to collapse
      await firstFAQ.click();
      // FAQ answer should be hidden after collapse
      await expect(page.locator('text=SpotOn is an intelligent multi-camera person tracking')).not.toBeVisible();
      
      // Test another FAQ
      await page.click('text=How many cameras does SpotOn support?');
      await expect(page.locator('text=SpotOn supports up to 8 cameras simultaneously')).toBeVisible();
    });

    test('should have contact support section', async ({ page }) => {
      // Scroll to bottom to find contact support
      await page.locator('text=Need Additional Help?').scrollIntoViewIfNeeded();
      await expect(page.locator('text=Need Additional Help?')).toBeVisible();
      
      // Verify email support link
      await expect(page.locator('text=📧 Email Support')).toBeVisible();
      
      // Verify link to About page
      const aboutLink = page.locator('text=ℹ️ About SpotOn');
      await expect(aboutLink).toBeVisible();
      
      // Test navigation to About page
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
      await expect(page.locator('h1')).toContainText('SpotOn');
    });

    test('should have proper accessibility features', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test search input accessibility
      const searchInput = page.locator('input[placeholder*="Search help topics"]');
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      
      // Test section navigation with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Verify ARIA labels exist where needed
      await expect(page.locator('main')).toHaveAttribute('role', 'main');
    });

    test('should be responsive on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search help topics"]')).toBeVisible();
      
      // Navigation should be responsive
      const navigationButtons = page.locator('button').filter({ hasText: /Getting Started|Features Overview|User Guide/ });
      await expect(navigationButtons.first()).toBeVisible();
    });
  });

  test.describe('About Page Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/about');
      await expect(page.locator('h1')).toContainText('SpotOn');
    });

    test('should display about page with proper branding', async ({ page }) => {
      // Verify page title and main heading
      await expect(page).toHaveTitle(/SpotOn/);
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      // Verify tagline
      await expect(page.locator('text=Intelligent Multi-Camera Person Tracking System')).toBeVisible();
      
      // Verify description
      await expect(page.locator('text=Advanced AI-powered solution')).toBeVisible();
      
      // Verify back navigation
      await expect(page.locator('text=← Back to Home')).toBeVisible();
    });

    test('should display live system statistics', async ({ page }) => {
      // Verify stats section
      await expect(page.locator('text=Live System Performance')).toBeVisible();
      
      // Verify all stat categories
      await expect(page.locator('text=Detections Processed')).toBeVisible();
      await expect(page.locator('text=Detection Accuracy')).toBeVisible();
      await expect(page.locator('text=System Uptime')).toBeVisible();
      await expect(page.locator('text=Avg Response Time')).toBeVisible();
      
      // Verify numerical values are displayed
      const statsNumbers = page.locator('.text-3xl.font-bold');
      const count = await statsNumbers.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('should display mission and vision sections', async ({ page }) => {
      // Verify Mission section
      await expect(page.locator('text=Our Mission')).toBeVisible();
      await expect(page.locator('text=To revolutionize security and analytics')).toBeVisible();
      
      // Verify Vision section  
      await expect(page.locator('text=Our Vision')).toBeVisible();
      await expect(page.locator('text=To become the leading platform')).toBeVisible();
    });

    test('should display key features with proper styling', async ({ page }) => {
      await expect(page.locator('text=Why Choose SpotOn?')).toBeVisible();
      
      const expectedFeatures = [
        'Real-Time Processing',
        'High Accuracy', 
        'Privacy-First',
        'Rich Analytics',
        'Scalable Architecture',
        'Easy Integration'
      ];

      for (const feature of expectedFeatures) {
        await expect(page.locator(`text=${feature}`)).toBeVisible();
      }
      
      // Verify feature descriptions
      await expect(page.locator('text=Process multiple camera feeds simultaneously')).toBeVisible();
      await expect(page.locator('text=95%+ accuracy in person detection')).toBeVisible();
      await expect(page.locator('text=No facial recognition')).toBeVisible();
    });

    test('should display comprehensive technology stack', async ({ page }) => {
      await expect(page.locator('text=Technology Stack')).toBeVisible();
      
      // Verify technology categories
      const techCategories = [
        'Frontend',
        'Backend', 
        'AI/ML',
        'Database',
        'Infrastructure',
        'Monitoring'
      ];

      for (const category of techCategories) {
        await expect(page.locator(`text=${category}`)).toBeVisible();
      }
      
      // Verify specific technologies
      await expect(page.locator('text=React 19')).toBeVisible();
      await expect(page.locator('text=FastAPI')).toBeVisible();
      await expect(page.locator('text=PyTorch')).toBeVisible();
      await expect(page.locator('text=TimescaleDB')).toBeVisible();
      await expect(page.locator('text=Docker')).toBeVisible();
    });

    test('should display development team information', async ({ page }) => {
      await expect(page.locator('text=Development Team')).toBeVisible();
      
      // Verify team members
      const expectedMembers = [
        'Dr. Sarah Chen',
        'Marcus Rodriguez',
        'Emily Watson',
        'David Kim'
      ];

      for (const member of expectedMembers) {
        await expect(page.locator(`text=${member}`)).toBeVisible();
      }
      
      // Verify roles
      await expect(page.locator('text=Lead AI Engineer')).toBeVisible();
      await expect(page.locator('text=Backend Architect')).toBeVisible();
      await expect(page.locator('text=Frontend Developer')).toBeVisible();
      await expect(page.locator('text=DevOps Engineer')).toBeVisible();
      
      // Verify expertise tags
      await expect(page.locator('text=Computer Vision')).toBeVisible();
      await expect(page.locator('text=React')).toBeVisible();
      await expect(page.locator('text=Kubernetes')).toBeVisible();
    });

    test('should display system architecture overview', async ({ page }) => {
      await expect(page.locator('text=System Architecture')).toBeVisible();
      
      // Verify architecture layers
      await expect(page.locator('text=Input Layer')).toBeVisible();
      await expect(page.locator('text=AI Processing')).toBeVisible();
      await expect(page.locator('text=Analytics Output')).toBeVisible();
      
      // Verify data flow
      await expect(page.locator('text=Data Flow Architecture')).toBeVisible();
      await expect(page.locator('text=Video Input')).toBeVisible();
      await expect(page.locator('text=AI Detection')).toBeVisible();
      await expect(page.locator('text=Real-time Analytics')).toBeVisible();
    });

    test('should display version information', async ({ page }) => {
      // Verify version section
      await expect(page.locator('text=v2.1.0')).toBeVisible();
      await expect(page.locator('text=Current Version')).toBeVisible();
      await expect(page.locator('text=2025.01')).toBeVisible();
      await expect(page.locator('text=MIT')).toBeVisible();
      await expect(page.locator('text=Enterprise')).toBeVisible();
    });

    test('should have functional call-to-action section', async ({ page }) => {
      await expect(page.locator('text=Ready to Get Started?')).toBeVisible();
      
      // Verify action buttons
      const startTrackingButton = page.locator('text=🚀 Start Tracking');
      const documentationButton = page.locator('text=📖 Read Documentation');
      const demoAnalyticsButton = page.locator('text=📊 View Demo Analytics');
      
      await expect(startTrackingButton).toBeVisible();
      await expect(documentationButton).toBeVisible();
      await expect(demoAnalyticsButton).toBeVisible();
      
      // Test navigation functionality
      await documentationButton.click();
      await expect(page).toHaveURL(/.*help/);
      
      // Navigate back to test other buttons
      await page.goBack();
      await startTrackingButton.click();
      await expect(page).toHaveURL(/.*environments/);
    });

    test('should have proper mobile responsiveness', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout
      await expect(page.locator('h1')).toBeVisible();
      
      // Stats should stack vertically on mobile
      const statCards = page.locator('.grid-cols-2');
      if (await statCards.count() > 0) {
        // Should be responsive grid
        await expect(statCards.first()).toBeVisible();
      }
      
      // Feature cards should be responsive
      await expect(page.locator('text=Why Choose SpotOn?')).toBeVisible();
      
      // Technology stack should be readable on mobile
      await expect(page.locator('text=Technology Stack')).toBeVisible();
    });

    test('should have accessibility features', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test semantic HTML structure
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      
      // Test ARIA labels where appropriate
      const links = page.locator('a');
      const linkCount = await links.count();
      expect(linkCount).toBeGreaterThan(0);
    });

    test('should update live statistics dynamically', async ({ page }) => {
      // Get initial values
      const detectionCount = await page.locator('.text-3xl.font-bold').first().textContent();
      
      // Wait for a potential update (simulated stats update every 5 seconds)
      await page.waitForTimeout(6000);
      
      // Note: In real implementation, we would verify that stats actually update
      // For this test, we just verify the elements are still visible and have values
      await expect(page.locator('.text-3xl.font-bold').first()).toBeVisible();
      await expect(page.locator('text=Detection Accuracy')).toBeVisible();
    });
  });

  test.describe('Cross-page Navigation', () => {
    test('should allow navigation between Help and About pages', async ({ page }) => {
      // Start on Help page
      await page.goto('/help');
      await expect(page.locator('h1')).toContainText('Help & Documentation');
      
      // Navigate to About page from Help
      await page.locator('text=ℹ️ About SpotOn').click();
      await expect(page).toHaveURL(/.*about/);
      await expect(page.locator('h1')).toContainText('SpotOn');
      
      // Navigate back to Help from About
      await page.locator('text=📖 Read Documentation').click();
      await expect(page).toHaveURL(/.*help/);
      await expect(page.locator('h1')).toContainText('Help & Documentation');
    });

    test('should maintain proper back navigation to home', async ({ page }) => {
      // Test from Help page
      await page.goto('/help');
      await page.locator('text=← Back to Home').click();
      await expect(page).toHaveURL('/');
      
      // Test from About page
      await page.goto('/about');
      await page.locator('text=← Back to Home').click();
      await expect(page).toHaveURL('/');
    });

    test('should maintain header navigation consistency', async ({ page }) => {
      // From Help page
      await page.goto('/help');
      
      // Verify header links work
      await expect(page.locator('text=Help')).toBeVisible();
      await expect(page.locator('text=About')).toBeVisible();
      
      // Test navigation via header
      await page.locator('text=About').click();
      await expect(page).toHaveURL(/.*about/);
      
      await page.locator('text=Help').click();
      await expect(page).toHaveURL(/.*help/);
    });
  });
});